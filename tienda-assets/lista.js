/**
 * Astrea · Lista de correos: «Tu Big 3 explicado» por correo desde la carta gratis.
 *
 * El correo es OPCIONAL: la carta gratis se genera igual. Si la persona deja su
 * correo, tiene que marcar el consentimiento; entonces, en paralelo a su carta,
 * se llama a POST {API}/lista/suscribir (astrea-API #117), que la suma a la
 * lista y le envía el PDF.
 *
 * Contrato: {nombre, email, fecha_hora_local, ciudad, pais, consentimiento: true, origen}
 *   200 {status:"recibido"} (igual si el correo ya estaba) · 400 lugar · 422 datos · 429 · 502 correo caído.
 *
 * Cabecera X-Idioma: es|en (idioma de la página). El texto del consentimiento que
 * ve la persona debe ser el mismo que guarda el backend para ese idioma
 * (app/domain/lista_correos: CONSENTIMIENTO_V1 en español, su versión en inglés).
 */
import { apiBase } from "./config.js";
import { origenActual } from "./origen.js";
import { idiomaDePagina } from "./idioma.js";

export const CONSENTIMIENTO =
  "Acepto recibir correos de Astrea con contenido astrológico, novedades y ofertas. " +
  "Puedo darme de baja cuando quiera desde cualquier correo.";

// Lo que aceptan las páginas en inglés. suscribir() manda X-Idioma, y el backend guarda el texto
// exacto del idioma de la página (este, en inglés) y envía el Big 3 en ese idioma.
export const CONSENTIMIENTO_EN =
  "I agree to receive emails from Astrea with astrology content, news and offers. " +
  "I can unsubscribe at any time from any email.";

const TEXTOS = {
  es: {
    email: "Revisa tu correo: ahí te enviaremos tu Big 3.",
    consentimiento: "Marca la casilla para recibir tu Big 3 por correo.",
    ok: (email) => `Te enviamos «Tu Big 3 explicado» a ${email}. Si te llega a Promociones, arrástralo a Principal para no perderte los próximos.`,
    429: "Hiciste varios pedidos seguidos. Espera un minuto y vuelve a pedir tu Big 3.",
    400: "No encontramos ese lugar, así que no pudimos enviarte tu Big 3.",
    502: "No pudimos enviarte el correo ahora. Inténtalo de nuevo en unos minutos.",
    otro: "No pudimos enviarte tu Big 3. Inténtalo de nuevo en unos minutos.",
    preparando: "Preparando tu Big 3 en PDF…",
  },
  en: {
    email: "Check your email address: that’s where we’ll send your Big 3.",
    consentimiento: "Tick the box to receive your Big 3 by email.",
    ok: (email) => `We sent “Your Big 3 explained” to ${email}. If it lands in Promotions, drag it to your inbox so you don’t miss the next ones.`,
    429: "You made several requests in a row. Wait a minute and ask for your Big 3 again.",
    400: "We couldn’t find that place, so we couldn’t send you your Big 3.",
    502: "We couldn’t send you the email right now. Please try again in a few minutes.",
    otro: "We couldn’t send you your Big 3. Please try again in a few minutes.",
    preparando: "Preparing your Big 3 PDF…",
  },
};
const textos = (idioma) => TEXTOS[idioma] || TEXTOS.es;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** null si se puede seguir (con o sin correo); si no, {campo, mensaje}. */
export function validarSuscripcion({ email, consentimiento }, idioma = "es") {
  const e = (email || "").trim();
  if (!e) return null;
  if (!EMAIL.test(e)) return { campo: "email", mensaje: textos(idioma).email };
  if (!consentimiento) return { campo: "consentimiento", mensaje: textos(idioma).consentimiento };
  return null;
}

export function cuerpoSuscripcion(datos, email, origen) {
  return { ...datos, email: email.trim(), consentimiento: true, origen: origen || null };
}

export function mensajeDeSuscripcion(status, email, idioma = "es") {
  const t = textos(idioma);
  if (status === 200) return { ok: true, texto: t.ok(email) };
  return { ok: false, texto: t[status] || t.otro };
}

export async function suscribir({ base = apiBase(), cuerpo, fetchImpl = fetch, idioma = "es" }) {
  try {
    const r = await fetchImpl(`${base}/lista/suscribir`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Idioma": idioma === "en" ? "en" : "es" },
      body: JSON.stringify(cuerpo),
    });
    return mensajeDeSuscripcion(r.status, cuerpo.email, idioma);
  } catch {
    return mensajeDeSuscripcion(0, cuerpo.email, idioma);
  }
}

/**
 * Conecta la lista a un formulario de carta gratis que ya tiene su propio envío.
 * - leer(): {nombre, fecha_hora_local, ciudad, pais} o null si los datos aún no son válidos
 *   (entonces el formulario de la página muestra sus propios errores).
 * - Valida correo y consentimiento ANTES que el envío de la página (fase de captura en document):
 *   si faltan, no se genera nada y se avisa junto al campo.
 */
export function conectarListaDeCorreos({ form, email, consentimiento, errorCampo, aviso, leer }) {
  const $ = (s) => document.querySelector(s);
  const formulario = $(form), campoEmail = $(email), casilla = $(consentimiento), error = $(errorCampo), avisoEl = $(aviso);
  if (!formulario || !campoEmail || !casilla) return;
  const idioma = idiomaDePagina();

  document.addEventListener("submit", (e) => {
    if (e.target !== formulario) return;
    error.textContent = "";
    const problema = validarSuscripcion({ email: campoEmail.value, consentimiento: casilla.checked }, idioma);
    if (problema) {
      e.preventDefault();
      e.stopImmediatePropagation();
      error.textContent = problema.mensaje;
      (problema.campo === "email" ? campoEmail : casilla).focus();
      return;
    }
    const correo = campoEmail.value.trim();
    const datos = correo ? leer() : null;
    if (!datos) return;
    if (avisoEl) { avisoEl.hidden = false; avisoEl.dataset.estado = "enviando"; avisoEl.textContent = textos(idioma).preparando; }
    suscribir({ cuerpo: cuerpoSuscripcion(datos, correo, origenActual()), idioma }).then(({ ok, texto }) => {
      if (!avisoEl) return;
      avisoEl.dataset.estado = ok ? "ok" : "error";
      avisoEl.textContent = texto;
    });
  }, true);
}
