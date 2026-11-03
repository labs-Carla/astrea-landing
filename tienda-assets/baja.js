/**
 * Astrea · /baja?t=<token>: darse de baja de la lista de correos.
 * El enlace llega en cada correo. No da de baja al abrir la página (los filtros
 * de correo abren los enlaces solos): la persona confirma con el botón.
 * POST {API}/lista/baja/{token} → 200 {status:"baja"} (idempotente) · 404 enlace no válido.
 */
import { apiBase } from "./config.js";
import { idiomaDePagina } from "./idioma.js";

const TEXTOS = {
  es: {
    ok: "Listo: ya no recibirás más correos de Astrea. Si fue un error, puedes volver a suscribirte cuando generes tu carta gratis.",
    404: "Este enlace no es válido. Si sigues recibiendo correos, respóndenos a cualquiera de ellos y te damos de baja.",
    otro: "No pudimos procesar tu baja. Inténtalo de nuevo en unos minutos.",
    red: "No pudimos conectar con el servidor. Inténtalo de nuevo en unos minutos.",
    invalido: "Este enlace no es válido. Abre el enlace «Darte de baja» de cualquiera de nuestros correos.",
  },
  en: {
    ok: "Done: you won’t receive any more emails from Astrea. If it was a mistake, you can subscribe again when you generate your free chart.",
    404: "This link isn’t valid. If you keep receiving emails, reply to any of them and we’ll unsubscribe you.",
    otro: "We couldn’t process your request. Please try again in a few minutes.",
    red: "We couldn’t connect to the server. Please try again in a few minutes.",
    invalido: "This link isn’t valid. Open the unsubscribe link in any of our emails.",
  },
};

export const tokenDeBaja = (search) => {
  const t = new URLSearchParams(search).get("t") || "";
  return /^[A-Za-z0-9_-]{16,64}$/.test(t) ? t : null;
};

export async function darDeBaja({ token, base = apiBase(), fetchImpl = fetch, idioma = "es" }) {
  const t = TEXTOS[idioma] || TEXTOS.es;
  try {
    const r = await fetchImpl(`${base}/lista/baja/${encodeURIComponent(token)}`, { method: "POST" });
    if (r.ok) return { ok: true, texto: t.ok };
    if (r.status === 404) return { ok: false, texto: t[404] };
    return { ok: false, texto: t.otro };
  } catch {
    return { ok: false, texto: t.red };
  }
}

if (typeof document !== "undefined") {
  const caja = document.querySelector("[data-baja]");
  const boton = caja?.querySelector("button");
  const estado = caja?.querySelector("[data-estado-baja]");
  const token = tokenDeBaja(location.search);
  const idioma = idiomaDePagina();
  if (caja && !token) {
    boton.hidden = true;
    estado.textContent = TEXTOS[idioma].invalido;
  }
  boton?.addEventListener("click", async () => {
    boton.disabled = true;
    const { ok, texto } = await darDeBaja({ token, idioma });
    estado.textContent = texto;
    boton.hidden = ok;
    boton.disabled = false;
  });
}
