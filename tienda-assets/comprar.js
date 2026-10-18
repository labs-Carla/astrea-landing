/**
 * Astrea · Tienda — formulario de compra en 3 pasos (/comprar/<reporte>).
 *
 * 1) datos natales (+ datos extra del reporte)  2) correo  3) revisión
 *   -> carta natal: POST /carta-natal/orden -> Hotmart (sck=astrea-orden-<id>)
 *   -> otros reportes: POST /pedidos -> Hotmart (sck=astrea-pedido-<id>)
 *
 * - Borrador en sessionStorage (se pierde al cerrar la pestaña y se borra al
 *   crear el pedido): evita perder lo escrito al recargar o volver atrás.
 * - Un mismo envío reutiliza el pedido ya creado (doble clic, reintento, volver
 *   desde Hotmart): no se crean pedidos duplicados.
 * - Nunca se registran datos personales en la consola.
 */
import { apiBase, CHECKOUTS } from "./config.js";
import { conOrigen, origenActual } from "./origen.js";
import { PACK_TEMATICOS, reportePorSlug } from "./catalogo.js";
import {
  validarDatos, cuerpoDeOrden, crearOrden, urlDeCheckout, referenciaDeOrden,
  pedidoParaGuardar, almacenSeguro, aniosDeRevolucion,
} from "./compra.js";

const CLAVE_BORRADOR = "astrea-tienda-borrador";
const CLAVE_ORDENES = "astrea-tienda-ordenes";      // huella -> {ordenId, referencia} (solo esta pestaña)
export const CLAVE_PEDIDO = "astrea-tienda-pedido";  // último pedido, para la página de retorno

const form = document.getElementById("form-compra");
const reporte = reportePorSlug(form.dataset.reporte);
const extra = reporte?.extra || null;
const checkout = CHECKOUTS[reporte?.slug];
const sesion = almacenSeguro(window.sessionStorage);
const local = almacenSeguro(window.localStorage);

const CAMPOS_EXTRA = {
  revolucion_solar: ["rs_ciudad", "rs_pais", "rs_anio"],
  segunda_persona: ["p2_nombre", "p2_fecha", "p2_hora", "p2_minuto", "p2_ciudad", "p2_pais", "p2_consentimiento"],
  pack: PACK_TEMATICOS.map((t) => `pack_${t}`),
};
const CAMPOS = ["nombre", "fecha", "hora", "minuto", "ciudad", "pais", "email", "acepta_correos", ...(CAMPOS_EXTRA[extra] || [])];
// Campos con mensaje de error y el paso donde se corrigen (hora/p2_hora agrupan hora + minutos).
const PASO_DE_CAMPO = {
  nombre: 1, fecha: 1, hora: 1, ciudad: 1, pais: 1, email: 2,
  rs_ciudad: 1, rs_pais: 1, rs_anio: 1,
  p2_nombre: 1, p2_fecha: 1, p2_hora: 1, p2_ciudad: 1, p2_pais: 1, p2_consentimiento: 1,
  pack: 1,
};
const INPUTS_DE = { hora: ["hora", "minuto"], p2_hora: ["p2_hora", "p2_minuto"], pack: PACK_TEMATICOS.map((t) => `pack_${t}`) };

const valor = (c) => (form.elements[c].type === "checkbox" ? form.elements[c].checked : form.elements[c].value);
const leer = () => Object.fromEntries(CAMPOS.map((c) => [c, valor(c)]));

// Años de revolución solar calculados en el navegador (la página es estática).
const selectAnio = form.querySelector("[data-anios-revolucion]");
if (selectAnio) {
  const elegido = selectAnio.value;
  selectAnio.replaceChildren(new Option("Elige el año", ""), ...aniosDeRevolucion().map((a) => new Option(`Cumpleaños de ${a}`, String(a))));
  selectAnio.value = elegido;
}

// ---------------------------------------------------------------- borrador
const borrador = sesion.leer(CLAVE_BORRADOR);
if (borrador && borrador.reporte === reporte.slug) {
  for (const c of CAMPOS) {
    if (borrador[c] == null) continue;
    if (form.elements[c].type === "checkbox") form.elements[c].checked = Boolean(borrador[c]);
    else form.elements[c].value = borrador[c];
  }
}
form.addEventListener("input", () => sesion.guardar(CLAVE_BORRADOR, { ...leer(), reporte: reporte.slug }));

// ---------------------------------------------------------------- pasos
let pasoActual = 1;
function irAPaso(n, { enfocar = true } = {}) {
  pasoActual = n;
  form.querySelectorAll("[data-paso]").forEach((f) => { f.hidden = Number(f.dataset.paso) !== n; });
  document.querySelectorAll("[data-paso-indicador]").forEach((li) => {
    const i = Number(li.dataset.pasoIndicador);
    li.toggleAttribute("aria-current", i === n);
    if (i === n) li.setAttribute("aria-current", "step");
    li.classList.toggle("hecho", i < n);
  });
  if (n === 3) pintarResumen();
  const titulo = form.querySelector(`[data-paso="${n}"] h2`);
  if (enfocar && titulo) { titulo.setAttribute("tabindex", "-1"); titulo.focus(); }
}

function mostrarErrores(errores, paso) {
  let primero = null;
  for (const [campo, p] of Object.entries(PASO_DE_CAMPO)) {
    if (p !== paso) continue;
    const el = document.getElementById(`e-${campo}`);
    if (!el) continue;                                   // campo de otro reporte
    const msg = errores[campo] || "";
    el.textContent = msg;
    const inputs = (INPUTS_DE[campo] || [campo]).map((c) => form.elements[c]);
    inputs.forEach((i) => i.setAttribute("aria-invalid", msg ? "true" : "false"));
    if (msg && !primero) primero = inputs[0];
  }
  primero?.focus();
  return !primero;
}

const validar = () => validarDatos(leer(), new Date(), extra);

function erroresDelPaso(paso) {
  return Object.fromEntries(Object.entries(validar()).filter(([c]) => PASO_DE_CAMPO[c] === paso));
}

form.addEventListener("click", (e) => {
  const sig = e.target.closest("[data-siguiente]");
  const ant = e.target.closest("[data-anterior]");
  if (sig) {
    if (mostrarErrores(erroresDelPaso(pasoActual), pasoActual)) irAPaso(Number(sig.dataset.siguiente));
  } else if (ant) {
    irAPaso(Number(ant.dataset.anterior));
  }
});

// Enter en un paso intermedio avanza en vez de enviar.
form.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && pasoActual < 3 && e.target.tagName === "INPUT" && e.target.type !== "checkbox") {
    e.preventDefault();
    form.querySelector(`[data-paso="${pasoActual}"] [data-siguiente]`)?.click();
  }
});

// ---------------------------------------------------------------- resumen
const fechaLegible = (iso) => iso.split("-").reverse().join("/");

function pintarResumen() {
  const c = cuerpoDeOrden(leer(), reporte.slug, extra);
  const [fecha, hora] = c.fecha_hora_local.split("T");
  const filas = [
    ["Reporte", reporte.nombre],
    ["Nombre", c.nombre],
    ["Nacimiento", `${fechaLegible(fecha)} · ${hora.slice(0, 5)} h`],
    ["Lugar", `${c.ciudad}, ${c.pais}`],
  ];
  if (c.revolucion_solar) {
    filas.push(["Cumpleaños", `${c.revolucion_solar.anio} · ${c.revolucion_solar.ciudad}, ${c.revolucion_solar.pais}`]);
  }
  if (c.segunda_persona) {
    const sp = c.segunda_persona;
    filas.push(["Otra persona", `${sp.nombre} · ${fechaLegible(sp.fecha)} · ${sp.hora ? `${sp.hora} h` : "hora desconocida"} · ${sp.ciudad}, ${sp.pais}`]);
  }
  if (c.tematicos) filas.push(["Lecturas temáticas", c.tematicos.map((t) => reportePorSlug(t).nombre).join(" y ")]);
  filas.push(["Correo de entrega", c.email], ["Total", checkout.precioReferencia]);

  const dl = form.querySelector("[data-resumen]");
  dl.replaceChildren(...filas.map(([k, v]) => {
    const fila = document.createElement("div");
    fila.className = `resumen__fila${k === "Total" ? " resumen__total" : ""}`;
    const dt = document.createElement("dt"); dt.textContent = k;
    const dd = document.createElement("dd"); dd.textContent = v;   // textContent: nada del usuario se interpreta como HTML
    fila.append(dt, dd);
    return fila;
  }));
  const nota = document.createElement("p");
  nota.className = "detalle__aviso";
  nota.textContent = "El monto final lo muestra Hotmart en tu moneda local.";
  dl.append(nota);
}

// ---------------------------------------------------------------- envío
const btnEnviar = form.querySelector("[data-enviar]");
const cajaError = form.querySelector("[data-error-pedido]");
const estadoEnvio = form.querySelector("[data-estado-envio]");
let enviando = false;

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (enviando) return;                                   // doble clic / doble Enter
  const errores = validar();
  if (Object.keys(errores).length) {
    const paso = Math.min(...Object.keys(errores).map((c) => PASO_DE_CAMPO[c]));
    irAPaso(paso);
    mostrarErrores(errores, paso);
    return;
  }
  const acepto = form.elements.acepto;
  document.getElementById("e-acepto").textContent = acepto.checked ? "" : "Necesitamos tu confirmación para continuar.";
  if (!acepto.checked) { acepto.focus(); return; }

  enviando = true;
  btnEnviar.disabled = true;
  cajaError.hidden = true;
  estadoEnvio.textContent = "Registrando tu pedido…";
  const cuerpo = cuerpoDeOrden(leer(), reporte.slug, extra);
  if (cuerpo.acepta_correos) cuerpo.origen = origenActual();
  const ordenes = sesion.leer(CLAVE_ORDENES) || {};
  try {
    const { ordenId, referencia } = await crearOrden({
      apiBase: apiBase(),
      cuerpo,
      slug: reporte.slug,
      memoria: { get: (k) => ordenes[k], set: (k, v) => { ordenes[k] = v; sesion.guardar(CLAVE_ORDENES, ordenes); } },
    });
    local.guardar(CLAVE_PEDIDO, pedidoParaGuardar(ordenId, reporte.slug, Date.now(), referencia));
    sesion.borrar(CLAVE_BORRADOR);
    estadoEnvio.textContent = `Pedido ${referenciaDeOrden(ordenId, reporte.slug)} creado. Te llevamos al pago en Hotmart…`;
    window.location.assign(conOrigen(urlDeCheckout(checkout.url, ordenId, cuerpo, reporte.slug), origenActual()));
  } catch (err) {
    cajaError.textContent = err.message;
    cajaError.hidden = false;
    estadoEnvio.textContent = "";
    btnEnviar.disabled = false;
    enviando = false;
  }
});

irAPaso(1, { enfocar: false });
