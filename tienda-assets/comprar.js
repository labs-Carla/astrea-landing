/**
 * Astrea · Tienda — formulario de compra en 3 pasos (/comprar/<reporte>).
 *
 * 1) datos natales  2) correo  3) revisión -> POST /carta-natal/orden -> Hotmart (sck=astrea-orden-<id>)
 *
 * - Borrador en sessionStorage (se pierde al cerrar la pestaña y se borra al
 *   crear el pedido): evita perder lo escrito al recargar o volver atrás.
 * - Un mismo envío reutiliza la orden ya creada (doble clic, reintento, volver
 *   desde Hotmart): no se crean órdenes duplicadas.
 * - Nunca se registran datos personales en la consola.
 */
import { apiBase, CHECKOUTS } from "./config.js";
import { reportePorSlug } from "./catalogo.js";
import {
  validarDatos, cuerpoDeOrden, crearOrden, urlDeCheckout, referenciaDeOrden,
  pedidoParaGuardar, almacenSeguro,
} from "./compra.js";

const CLAVE_BORRADOR = "astrea-tienda-borrador";
const CLAVE_ORDENES = "astrea-tienda-ordenes";      // huella -> orden_id (solo esta pestaña)
export const CLAVE_PEDIDO = "astrea-tienda-pedido";  // última orden, para la página de retorno

const form = document.getElementById("form-compra");
const reporte = reportePorSlug(form.dataset.reporte);
const checkout = CHECKOUTS[reporte?.slug];
const sesion = almacenSeguro(window.sessionStorage);
const local = almacenSeguro(window.localStorage);

const CAMPOS = ["nombre", "fecha", "hora", "minuto", "ciudad", "pais", "email"];
const PASO_DE_CAMPO = { nombre: 1, fecha: 1, hora: 1, ciudad: 1, pais: 1, email: 2 };
const leer = () => Object.fromEntries(CAMPOS.map((c) => [c, form.elements[c].value]));

// ---------------------------------------------------------------- borrador
const borrador = sesion.leer(CLAVE_BORRADOR);
if (borrador) for (const c of CAMPOS) if (borrador[c] != null) form.elements[c].value = borrador[c];
form.addEventListener("input", () => sesion.guardar(CLAVE_BORRADOR, leer()));

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
  if (enfocar) form.querySelector(`[data-paso="${n}"] h2`)?.setAttribute("tabindex", "-1");
  if (enfocar) form.querySelector(`[data-paso="${n}"] h2`)?.focus();
}

function mostrarErrores(errores, paso) {
  let primero = null;
  for (const [campo, p] of Object.entries(PASO_DE_CAMPO)) {
    if (p !== paso) continue;
    const msg = errores[campo] || "";
    const el = document.getElementById(`e-${campo}`);
    if (el) el.textContent = msg;
    const inputs = campo === "hora" ? [form.elements.hora, form.elements.minuto] : [form.elements[campo]];
    inputs.forEach((i) => i.setAttribute("aria-invalid", msg ? "true" : "false"));
    if (msg && !primero) primero = inputs[0];
  }
  primero?.focus();
  return !primero;
}

function erroresDelPaso(paso) {
  const errores = validarDatos(leer());
  return Object.fromEntries(Object.entries(errores).filter(([c]) => PASO_DE_CAMPO[c] === paso));
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
  if (e.key === "Enter" && pasoActual < 3 && e.target.tagName === "INPUT") {
    e.preventDefault();
    form.querySelector(`[data-paso="${pasoActual}"] [data-siguiente]`)?.click();
  }
});

// ---------------------------------------------------------------- resumen
function pintarResumen() {
  const d = leer();
  const c = cuerpoDeOrden(d);
  const [fecha, hora] = c.fecha_hora_local.split("T");
  const filas = [
    ["Reporte", reporte.nombre],
    ["Nombre", c.nombre],
    ["Nacimiento", `${fecha.split("-").reverse().join("/")} · ${hora.slice(0, 5)} h`],
    ["Lugar", `${c.ciudad}, ${c.pais}`],
    ["Correo de entrega", c.email],
    ["Total", checkout.precioReferencia],
  ];
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
  const errores = validarDatos(leer());
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
  const cuerpo = cuerpoDeOrden(leer());
  const ordenes = sesion.leer(CLAVE_ORDENES) || {};
  try {
    const { ordenId } = await crearOrden({
      apiBase: apiBase(),
      cuerpo,
      memoria: { get: (k) => ordenes[k], set: (k, v) => { ordenes[k] = v; sesion.guardar(CLAVE_ORDENES, ordenes); } },
    });
    local.guardar(CLAVE_PEDIDO, pedidoParaGuardar(ordenId, reporte.slug));
    sesion.borrar(CLAVE_BORRADOR);
    estadoEnvio.textContent = `Pedido ${referenciaDeOrden(ordenId)} creado. Te llevamos al pago en Hotmart…`;
    window.location.assign(urlDeCheckout(checkout.url, ordenId, cuerpo));
  } catch (err) {
    cajaError.textContent = err.message;
    cajaError.hidden = false;
    estadoEnvio.textContent = "";
    btnEnviar.disabled = false;
    enviando = false;
  }
});

irAPaso(1, { enfocar: false });
