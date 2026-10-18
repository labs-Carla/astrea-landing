/**
 * Astrea · /baja?t=<token>: darse de baja de la lista de correos.
 * El enlace llega en cada correo. No da de baja al abrir la página (los filtros
 * de correo abren los enlaces solos): la persona confirma con el botón.
 * POST {API}/lista/baja/{token} → 200 {status:"baja"} (idempotente) · 404 enlace no válido.
 */
import { apiBase } from "./config.js";

export const tokenDeBaja = (search) => {
  const t = new URLSearchParams(search).get("t") || "";
  return /^[A-Za-z0-9_-]{16,64}$/.test(t) ? t : null;
};

export async function darDeBaja({ token, base = apiBase(), fetchImpl = fetch }) {
  try {
    const r = await fetchImpl(`${base}/lista/baja/${encodeURIComponent(token)}`, { method: "POST" });
    if (r.ok) return { ok: true, texto: "Listo: ya no recibirás más correos de Astrea. Si fue un error, puedes volver a suscribirte cuando generes tu carta gratis." };
    if (r.status === 404) return { ok: false, texto: "Este enlace no es válido. Si sigues recibiendo correos, respóndenos a cualquiera de ellos y te damos de baja." };
    return { ok: false, texto: "No pudimos procesar tu baja. Inténtalo de nuevo en unos minutos." };
  } catch {
    return { ok: false, texto: "No pudimos conectar con el servidor. Inténtalo de nuevo en unos minutos." };
  }
}

if (typeof document !== "undefined") {
  const caja = document.querySelector("[data-baja]");
  const boton = caja?.querySelector("button");
  const estado = caja?.querySelector("[data-estado-baja]");
  const token = tokenDeBaja(location.search);
  if (caja && !token) {
    boton.hidden = true;
    estado.textContent = "Este enlace no es válido. Abre el enlace «Darte de baja» de cualquiera de nuestros correos.";
  }
  boton?.addEventListener("click", async () => {
    boton.disabled = true;
    const { ok, texto } = await darDeBaja({ token });
    estado.textContent = texto;
    boton.hidden = ok;
    boton.disabled = false;
  });
}
