/**
 * Astrea · Visitas por canal (métricas, fase 1, 2026-11-03).
 *
 * Cada página del sitio (tienda, revista, blog) avisa una vista a POST /visitas del API:
 * la ruta, el origen de ESA visita (src, utm o el sitio que la refirió, de origen.js) y si
 * es una entrada (llegó desde fuera de astrea-charts.site, sin recargar ni volver atrás).
 * La llama origen.js, que ya cargan todas las páginas.
 *
 * Sin cookies ni datos personales: el servidor limpia la ruta, guarda solo el dominio del
 * referente y no guarda la IP. `?medir=no` apaga la medición en este navegador (para el
 * equipo); `?medir=si` la vuelve a encender. Medir jamás rompe ni demora la página.
 */
export const CLAVE_NO_MEDIR = "astrea-no-medir";
const DOMINIO = "astrea-charts.site";

function hostDe(url) {
  try { return new URL(url).hostname.toLowerCase(); } catch { return ""; }
}

/** Llegó desde fuera de Astrea (o sin referente), y no es una recarga ni un «atrás». */
export function esEntrada(referrer, hostPropio, tipoNavegacion) {
  if (tipoNavegacion === "reload" || tipoNavegacion === "back_forward") return false;
  const host = hostDe(referrer);
  return !(host && (host === hostPropio || host.endsWith(DOMINIO)));
}

/** Lee ?medir= y dice si este navegador pidió no ser medido. */
export function medicionApagada(search, storage) {
  try {
    const pedido = new URLSearchParams(search).get("medir");
    if (pedido === "no") storage.setItem(CLAVE_NO_MEDIR, "1");
    if (pedido === "si") storage.removeItem(CLAVE_NO_MEDIR);
    return storage.getItem(CLAVE_NO_MEDIR) === "1";
  } catch { return false; }
}

/** Cuerpo de la vista. `origen` solo cuenta si es una entrada. */
export function cuerpoDeVista({ pagina, origen, entrada, referrer }) {
  return {
    sitio: "web",
    pagina,
    origen: entrada ? origen ?? null : null,
    entrada,
    referente: entrada ? hostDe(referrer) || null : null,
  };
}

/** Manda la vista con sendBeacon (text/plain: sin preflight de CORS) o, si no hay, con fetch. */
export function enviarVista(url, cuerpo, nav = globalThis.navigator, fetchar = globalThis.fetch) {
  try {
    const datos = JSON.stringify(cuerpo);
    if (nav?.sendBeacon?.(url, new Blob([datos], { type: "text/plain;charset=UTF-8" }))) return true;
    fetchar?.(url, { method: "POST", body: datos, keepalive: true, headers: { "Content-Type": "text/plain;charset=UTF-8" } })
      ?.catch?.(() => {});
    return true;
  } catch { return false; }
}
