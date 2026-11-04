/**
 * Astrea · /canjear: canjear una tarjeta de regalo (astrea-API /regalos/canje).
 * 1) La persona escribe su código → GET /regalos/canje/{codigo}: qué lectura le regalaron.
 * 2) Completa sus datos (y los extra de esa lectura) → POST /regalos/canje: su lectura
 *    queda pedida y pagada; le llega por correo en 24–48 h.
 */
import { apiBase } from "./config.js";
import { PACK_TEMATICOS, reportePorSlug, reporteEnIdioma } from "./catalogo.js";
import { cuerpoDeOrden, extraDeProducto, validarDatos, mensajeAcepto } from "./compra.js";
import { idiomaDePagina, elegir, cabeceraIdioma } from "./idioma.js";

const idioma = idiomaDePagina();
const t = (es, en) => elegir(idioma, es, en);
// El backend da el nombre de la lectura en español; en inglés, el del catálogo.
const nombreLectura = (producto, delBackend) => (idioma === "en" && reporteEnIdioma(reportePorSlug(producto), "en")?.nombre) || delBackend;
const SIN_CONEXION = t("No pudimos conectar con el servidor. Inténtalo de nuevo en unos minutos.", "We couldn’t connect to the server. Please try again in a few minutes.");

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
const fechaLarga = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString(idioma === "en" ? "en-US" : "es", { day: "numeric", month: "long", year: "numeric" });

// Años de revolución solar calculados en el navegador (la página es estática).
const selectAnio = form.querySelector("[data-anios-revolucion]");
if (selectAnio) {
  const a = new Date().getFullYear();
  selectAnio.replaceChildren(new Option(t("Elige el año", "Choose the year"), ""), ...[a - 1, a, a + 1].map((x) => new Option(t(`Cumpleaños de ${x}`, `${x} birthday`), String(x))));
}

const codigoEnUrl = new URLSearchParams(location.search).get("codigo");
if (codigoEnUrl) formCodigo.elements.codigo.value = codigoEnUrl;

formCodigo.addEventListener("submit", async (e) => {
  e.preventDefault();
  const estado = formCodigo.querySelector("[data-estado-codigo]");
  const codigo = formCodigo.elements.codigo.value.trim();
  if (!codigo) { estado.textContent = t("Escribe el código de tu tarjeta.", "Enter the code on your card."); return; }
  estado.textContent = t("Buscando tu regalo…", "Looking for your gift…");
  try {
    const r = await fetch(`${apiBase()}/regalos/canje/${encodeURIComponent(codigo)}`, { headers: cabeceraIdioma(idioma) });
    const datos = await r.json().catch(() => null);
    // El backend responde en español: en inglés se muestra un mensaje propio.
    if (!r.ok) { estado.textContent = t(datos?.detail || "No encontramos ese código.", "We couldn’t find that code, or it can no longer be redeemed. Check it and try again."); return; }
    regalo = { ...datos, codigo };
    estado.textContent = "";
    info.querySelector("[data-regalo-lectura]").textContent = nombreLectura(datos.producto, datos.lectura);
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
    estado.textContent = SIN_CONEXION;
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
  const errores = validarDatos(d, new Date(), extra, idioma);
  if (!form.elements.acepto.checked) errores.acepto = mensajeAcepto(idioma);
  form.querySelectorAll(".error-campo").forEach((s) => { s.textContent = errores[s.id.slice(2)] || ""; });
  const primero = Object.keys(errores)[0];
  if (primero) { (form.elements[primero] || form.elements[`${primero}_amor`] || form.elements.acepto)?.focus?.(); return; }

  const boton = form.querySelector("[data-enviar]");
  const error = form.querySelector("[data-error-pedido]");
  boton.disabled = true;
  error.hidden = true;
  const cuerpo = { ...cuerpoDeOrden(d, regalo.producto, extra), codigo: regalo.codigo };
  try {
    const r = await fetch(`${apiBase()}/regalos/canje`, { method: "POST", headers: { "Content-Type": "application/json", ...cabeceraIdioma(idioma) }, body: JSON.stringify(cuerpo) });
    const datos = await r.json().catch(() => null);
    if (!r.ok) throw new Error(typeof datos?.detail === "string" && idioma === "es" ? datos.detail : t("Revisa tus datos e inténtalo de nuevo.", "Please check your details and try again."));
    form.hidden = true;
    info.hidden = true;
    exito.querySelector("[data-exito-lectura]").textContent = nombreLectura(regalo.producto, datos.lectura);
    exito.querySelector("[data-exito-email]").textContent = cuerpo.email;
    exito.hidden = false;
    exito.scrollIntoView({ behavior: "smooth", block: "center" });
  } catch (err) {
    error.textContent = err instanceof TypeError ? SIN_CONEXION : err.message;
    error.hidden = false;
    boton.disabled = false;
  }
});
