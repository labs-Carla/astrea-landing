/**
 * Astrea · /canjear: canjear una tarjeta de regalo (astrea-API /regalos/canje).
 * 1) La persona escribe su código → GET /regalos/canje/{codigo}: qué lectura le regalaron.
 * 2) Completa sus datos (y los extra de esa lectura) → POST /regalos/canje: su lectura
 *    queda pedida y pagada; le llega por correo en 24–48 h.
 */
import { apiBase } from "./config.js";
import { PACK_TEMATICOS } from "./catalogo.js";
import { cuerpoDeOrden, extraDeProducto, validarDatos } from "./compra.js";

const formCodigo = document.getElementById("form-codigo");
const form = document.getElementById("form-canje");
const info = document.querySelector("[data-regalo]");
const exito = document.querySelector("[data-exito]");
let regalo = null;

const BASE = ["nombre", "fecha", "hora", "minuto", "ciudad", "pais", "email"];
const EXTRA = {
  pack: PACK_TEMATICOS.map((t) => `pack_${t}`),
  revolucion_solar: ["rs_ciudad", "rs_pais", "rs_anio"],
  segunda_persona: ["p2_nombre", "p2_fecha", "p2_hora", "p2_minuto", "p2_ciudad", "p2_pais", "p2_consentimiento"],
};
const valor = (c) => (form.elements[c].type === "checkbox" ? form.elements[c].checked : form.elements[c].value);
const fechaLarga = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString("es", { day: "numeric", month: "long", year: "numeric" });

// Años de revolución solar calculados en el navegador (la página es estática).
const selectAnio = form.querySelector("[data-anios-revolucion]");
if (selectAnio) {
  const a = new Date().getFullYear();
  selectAnio.replaceChildren(new Option("Elige el año", ""), ...[a - 1, a, a + 1].map((x) => new Option(`Cumpleaños de ${x}`, String(x))));
}

const codigoEnUrl = new URLSearchParams(location.search).get("codigo");
if (codigoEnUrl) formCodigo.elements.codigo.value = codigoEnUrl;

formCodigo.addEventListener("submit", async (e) => {
  e.preventDefault();
  const estado = formCodigo.querySelector("[data-estado-codigo]");
  const codigo = formCodigo.elements.codigo.value.trim();
  if (!codigo) { estado.textContent = "Escribe el código de tu tarjeta."; return; }
  estado.textContent = "Buscando tu regalo…";
  try {
    const r = await fetch(`${apiBase()}/regalos/canje/${encodeURIComponent(codigo)}`);
    const datos = await r.json().catch(() => null);
    if (!r.ok) { estado.textContent = datos?.detail || "No encontramos ese código."; return; }
    regalo = { ...datos, codigo };
    estado.textContent = "";
    info.querySelector("[data-regalo-lectura]").textContent = datos.lectura;
    info.querySelector("[data-regalo-para]").textContent = datos.para_nombre;
    info.querySelector("[data-regalo-vence]").textContent = fechaLarga(datos.vence);
    info.hidden = false;
    const extra = extraDeProducto(datos.producto);
    form.querySelectorAll("[data-extra-de]").forEach((b) => { b.hidden = b.dataset.extraDe !== extra; });
    form.elements.nombre.value ||= datos.para_nombre;
    form.hidden = false;
    formCodigo.hidden = true;
    form.elements.nombre.focus();
  } catch {
    estado.textContent = "No pudimos conectar con el servidor. Inténtalo de nuevo en unos minutos.";
  }
});

// Al corregir un campo, su aviso de error desaparece (hora y minutos comparten aviso).
const limpiar = (e) => {
  const nombre = (e.target.name || "").replace(/^(p2_)?minuto$/, "$1hora").replace(/^pack_.*/, "pack");
  const span = document.getElementById(`e-${nombre}`);
  if (span) span.textContent = "";
};
form.addEventListener("input", limpiar);
form.addEventListener("change", limpiar);

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const extra = extraDeProducto(regalo.producto);
  const campos = [...BASE, ...(EXTRA[extra] || [])];
  const d = Object.fromEntries(campos.map((c) => [c, valor(c)]));
  const errores = validarDatos(d, new Date(), extra);
  if (!form.elements.acepto.checked) errores.acepto = "Necesitamos que aceptes los términos para continuar.";
  form.querySelectorAll(".error-campo").forEach((s) => { s.textContent = errores[s.id.slice(2)] || ""; });
  const primero = Object.keys(errores)[0];
  if (primero) { (form.elements[primero] || form.elements[`${primero}_amor`] || form.elements.acepto)?.focus?.(); return; }

  const boton = form.querySelector("[data-enviar]");
  const error = form.querySelector("[data-error-pedido]");
  boton.disabled = true;
  error.hidden = true;
  const cuerpo = { ...cuerpoDeOrden(d, regalo.producto, extra), codigo: regalo.codigo };
  try {
    const r = await fetch(`${apiBase()}/regalos/canje`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) });
    const datos = await r.json().catch(() => null);
    if (!r.ok) throw new Error(typeof datos?.detail === "string" ? datos.detail : "Revisa tus datos e inténtalo de nuevo.");
    form.hidden = true;
    info.hidden = true;
    exito.querySelector("[data-exito-lectura]").textContent = datos.lectura;
    exito.querySelector("[data-exito-email]").textContent = cuerpo.email;
    exito.hidden = false;
    exito.scrollIntoView({ behavior: "smooth", block: "center" });
  } catch (err) {
    error.textContent = err instanceof TypeError ? "No pudimos conectar con el servidor. Inténtalo de nuevo en unos minutos." : err.message;
    error.hidden = false;
    boton.disabled = false;
  }
});
