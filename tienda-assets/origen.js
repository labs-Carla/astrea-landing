/**
 * Astrea · Origen de la venta (`src` de Hotmart).
 *
 * Hotmart guarda el parámetro `src` del checkout en la columna "Origen venta / SRC"
 * de su historial de ventas. Así sabemos qué canal vende sin pedirle nada a la persona:
 *
 * - Se toma de `?src=` (o `?utm_source=` + `?utm_campaign=`) del enlace por el que entró:
 *   bio de TikTok → `astrea-charts.site/link?src=tiktok-bio`.
 * - Sin parámetro, del sitio que la refirió (tiktok, instagram, google…).
 * - Se guarda 30 días en este navegador (gana el último origen conocido) y se agrega a
 *   cada enlace de pago de la página y al checkout de la tienda.
 * - Sin origen conocido, la página por la que pasó: `tienda`, `link`, `universo`…
 *
 * No guarda datos personales: solo el nombre del canal y la fecha.
 */
import { almacenSeguro } from "./compra.js";
import { referidoActual } from "./referido.js";

export const CLAVE_ORIGEN = "astrea-origen";
const VIGENCIA_MS = 30 * 24 * 60 * 60 * 1000;
const HOTMART = "https://pay.hotmart.com/";

const REFERENTES = [
  [/(^|\.)tiktok\.com$/, "tiktok"],
  [/(^|\.)instagram\.com$/, "instagram"],
  [/(^|\.)(facebook\.com|fb\.com|messenger\.com)$/, "facebook"],
  [/(^|\.)(whatsapp\.com|wa\.me)$/, "whatsapp"],
  [/(^|\.)(youtube\.com|youtu\.be)$/, "youtube"],
  [/(^|\.)(t\.co|twitter\.com|x\.com)$/, "x"],
  [/(^|\.)pinterest\./, "pinterest"],
  [/(^|\.)google\./, "google"],
  [/(^|\.)bing\.com$/, "bing"],
];

/** Normaliza un origen a minúsculas, letras, números, guiones y guiones bajos (máx. 40). */
export function limpiarOrigen(valor) {
  const s = String(valor ?? "")
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/, "");
  return s || null;
}

/** Origen de esta visita, o null si la URL y el referente no dicen nada. */
export function origenDeVisita(search, referrer, hostPropio) {
  const q = new URLSearchParams(search);
  const src = limpiarOrigen(q.get("src"));
  if (src) return src;
  const fuente = limpiarOrigen(q.get("utm_source"));
  if (fuente) {
    const campana = limpiarOrigen(q.get("utm_campaign"));
    return campana ? limpiarOrigen(`${fuente}-${campana}`) : fuente;
  }
  let host;
  try { host = new URL(referrer).hostname.toLowerCase(); } catch { return null; }
  if (!host || host === hostPropio || host.endsWith("astrea-charts.site")) return null;
  for (const [patron, nombre] of REFERENTES) if (patron.test(host)) return nombre;
  return "otro-sitio";
}

/** El origen guardado, si sigue vigente. */
export function origenVigente(guardado, ahora) {
  return guardado && typeof guardado.src === "string" && Number.isFinite(guardado.t) && ahora - guardado.t < VIGENCIA_MS
    ? limpiarOrigen(guardado.src)
    : null;
}

/** Página por la que pasó, para cuando no hay otro origen: `/` y la tienda → `tienda`. */
export function origenDePagina(pathname) {
  const primera = String(pathname ?? "").split("/").filter(Boolean)[0] ?? "";
  const pagina = limpiarOrigen(primera.replace(/\.html$/, ""));
  return ["link", "link-gratis", "universo", "carta", "gracias"].includes(pagina) ? pagina : "tienda";
}

/** Agrega `src` a un enlace de Hotmart sin pisar uno que ya traiga. */
export function conOrigen(url, src) {
  if (!src || !String(url).startsWith(HOTMART)) return url;
  const u = new URL(url);
  if (!u.searchParams.get("src")) u.searchParams.set("src", src);
  return u.toString();
}

/** Registra la visita y devuelve el origen a usar en el checkout. */
export function registrarVisita({ location, referrer, storage, ahora = Date.now() }) {
  const almacen = almacenSeguro(storage);
  const nuevo = origenDeVisita(location.search, referrer, location.hostname);
  if (nuevo) {
    almacen.guardar(CLAVE_ORIGEN, { src: nuevo, t: ahora });
    return nuevo;
  }
  return origenVigente(almacen.leer(CLAVE_ORIGEN), ahora) ?? origenDePagina(location.pathname);
}

let actual = null;

/** Origen de esta página (se calcula una vez). */
export function origenActual() {
  if (actual) return actual;
  if (typeof window === "undefined") return null;
  let storage = null;
  try { storage = window.localStorage; } catch { /* sin almacenamiento */ }
  actual = registrarVisita({ location: window.location, referrer: document.referrer, storage: storage ?? { getItem: () => null, setItem() {}, removeItem() {} } });
  return actual;
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  referidoActual();   // guarda el ?ref= de un enlace para invitar, en cualquier página de la tienda
  const src = origenActual();
  for (const a of document.querySelectorAll(`a[href^="${HOTMART}"]`)) a.href = conOrigen(a.href, src);
}
