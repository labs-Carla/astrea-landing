/**
 * Astrea · Tienda — configuración pública (sin secretos: todo lo de aquí lo ve el navegador).
 *
 * El sitio es estático (sin build ni variables de entorno de Vercel), así que
 * este archivo cumple el papel de las variables de entorno del frontend:
 *
 * - API_BASE: en producción sigue siendo la URL directa de Railway, igual que
 *   el resto de las páginas. En local (localhost / 127.0.0.1) apunta al backend
 *   local en :8000. Para probar contra otro backend: ?api=<url> en cualquier
 *   página (se ignora fuera de local).
 * - CHECKOUTS: producto de Hotmart por reporte. Un reporte SIN checkout aquí
 *   no se puede comprar, aunque el catálogo lo describa. La carta natal va por
 *   /carta-natal/orden; los demás, por /pedidos (se preparan a mano tras cada compra).
 * - ESTADO_PEDIDO_HABILITADO: /pedido consulta GET /carta-natal/orden/{referencia}/estado
 *   (astrea-API #92). Con false, solo muestra "creado" o "pendiente de confirmación".
 */
const PRODUCCION = {
  API_BASE: "https://astrea-api-production.up.railway.app/api/v1",
};

const esLocal = (host) => host === "localhost" || host === "127.0.0.1";

export function apiBase(loc = globalThis.location) {
  if (loc && esLocal(loc.hostname)) {
    const forzada = new URLSearchParams(loc.search).get("api");
    return forzada || "http://127.0.0.1:8000/api/v1";
  }
  return PRODUCCION.API_BASE;
}

// Productos reales de Hotmart (2026-10-10). `precioReferencia` es lo que
// muestra la tienda; el monto que se cobra lo define Hotmart (en la moneda
// local de quien compra) y el frontend nunca lo envía ni lo decide.
export const CHECKOUTS = {
  "carta-natal": { url: "https://pay.hotmart.com/B106744064D?bid=1784070968525", precioReferencia: "USD 12" },
  amor: { url: "https://pay.hotmart.com/P107968115R", precioReferencia: "USD 9" },
  vocacion: { url: "https://pay.hotmart.com/N107968156X", precioReferencia: "USD 9" },
  dinero: { url: "https://pay.hotmart.com/W107968171W", precioReferencia: "USD 9" },
  patrones: { url: "https://pay.hotmart.com/U107968183Y", precioReferencia: "USD 9" },
  "revolucion-solar": { url: "https://pay.hotmart.com/X107968195X", precioReferencia: "USD 12" },
  compatibilidad: { url: "https://pay.hotmart.com/L107968202K", precioReferencia: "USD 15" },
};

export const ESTADO_PEDIDO_HABILITADO = true;

export const URL_ASTREA_AI = "https://app.astrea-charts.site";
export const WHATSAPP = "https://wa.me/573132137456";
