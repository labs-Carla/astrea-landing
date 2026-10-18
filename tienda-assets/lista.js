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
 * El texto del consentimiento que ve la persona debe ser el mismo que guarda el
 * backend (app/domain/lista_correos.CONSENTIMIENTO_V1).
 */
import { apiBase } from "./config.js";
import { origenActual } from "./origen.js";

export const CONSENTIMIENTO =
  "Acepto recibir correos de Astrea con contenido astrológico, novedades y ofertas. " +
  "Puedo darme de baja cuando quiera desde cualquier correo.";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** null si se puede seguir (con o sin correo); si no, {campo, mensaje}. */
export function validarSuscripcion({ email, consentimiento }) {
  const e = (email || "").trim();
  if (!e) return null;
  if (!EMAIL.test(e)) return { campo: "email", mensaje: "Revisa tu correo: ahí te enviaremos tu Big 3." };
  if (!consentimiento) return { campo: "consentimiento", mensaje: "Marca la casilla para recibir tu Big 3 por correo." };
  return null;
}

export function cuerpoSuscripcion(datos, email, origen) {
  return { ...datos, email: email.trim(), consentimiento: true, origen: origen || null };
}

export function mensajeDeSuscripcion(status, email) {
  if (status === 200) {
    return { ok: true, texto: `Te enviamos «Tu Big 3 explicado» a ${email}. Si te llega a Promociones, arrástralo a Principal para no perderte los próximos.` };
  }
  if (status === 429) return { ok: false, texto: "Hiciste varios pedidos seguidos. Espera un minuto y vuelve a pedir tu Big 3." };
  if (status === 400) return { ok: false, texto: "No encontramos ese lugar, así que no pudimos enviarte tu Big 3." };
  if (status === 502) return { ok: false, texto: "No pudimos enviarte el correo ahora. Inténtalo de nuevo en unos minutos." };
  return { ok: false, texto: "No pudimos enviarte tu Big 3. Inténtalo de nuevo en unos minutos." };
}

export async function suscribir({ base = apiBase(), cuerpo, fetchImpl = fetch }) {
  try {
    const r = await fetchImpl(`${base}/lista/suscribir`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo),
    });
    return mensajeDeSuscripcion(r.status, cuerpo.email);
  } catch {
    return mensajeDeSuscripcion(0, cuerpo.email);
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

  document.addEventListener("submit", (e) => {
    if (e.target !== formulario) return;
    error.textContent = "";
    const problema = validarSuscripcion({ email: campoEmail.value, consentimiento: casilla.checked });
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
    if (avisoEl) { avisoEl.hidden = false; avisoEl.dataset.estado = "enviando"; avisoEl.textContent = "Preparando tu Big 3 en PDF…"; }
    suscribir({ cuerpo: cuerpoSuscripcion(datos, correo, origenActual()) }).then(({ ok, texto }) => {
      if (!avisoEl) return;
      avisoEl.dataset.estado = ok ? "ok" : "error";
      avisoEl.textContent = texto;
    });
  }, true);
}
