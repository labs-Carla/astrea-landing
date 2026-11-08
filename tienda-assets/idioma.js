/**
 * Astrea · Idioma del sitio (español / inglés, 2026-11-03).
 *
 * - Cada página está en un idioma: el español en su ruta de siempre y el inglés bajo
 *   /en/ con el mismo slug (/reportes/amor → /en/reportes/amor). El idioma de la página
 *   es el de <html lang>, y los módulos de la tienda muestran sus textos en ese idioma.
 * - La elección (selector ES | EN) se guarda en `astrea_idioma`, la misma clave que usa
 *   la app (app.astrea-charts.site), que además acepta ?lang=en.
 * - La detección al entrar (idioma del navegador) vive en idioma-inicio.js, que corre
 *   en el <head> antes de pintar.
 *
 * Sin dependencias; se puede usar en el navegador y en node --test.
 */
export const IDIOMAS = ["es", "en"];
export const CLAVE_IDIOMA = "astrea_idioma";
const APP = "app.astrea-charts.site";

/** Idioma de la página: "en" si <html lang> empieza por en; si no, "es". */
export function idiomaDePagina(doc = globalThis.document) {
  return String(doc?.documentElement?.lang || "").toLowerCase().startsWith("en") ? "en" : "es";
}

/** El texto en el idioma pedido: elegir("en", "Hola", "Hello") → "Hello". */
export const elegir = (idioma, es, en) => (idioma === "en" ? en : es);

/** Ruta del sitio en un idioma: rutaEnIdioma("/pedido", "en") → "/en/pedido"; rutaEnIdioma("/en/pedido", "es") → "/pedido". */
export function rutaEnIdioma(ruta, idioma) {
  const [camino, ...resto] = String(ruta || "/").split(/(?=[?#])/);
  const base = camino === "/en" || camino === "/en/" ? "/" : camino.startsWith("/en/") ? camino.slice(3) : camino;
  const final = idioma === "en" ? (base === "/" ? "/en/" : `/en${base}`) : base;
  return final + resto.join("");
}

/** Los enlaces a la app llevan ?lang=en desde las páginas en inglés, sin perder sus parámetros. */
export function conIdiomaApp(url, idioma) {
  if (idioma !== "en") return url;
  let u;
  try { u = new URL(url); } catch { return url; }
  if (u.hostname !== APP) return url;
  u.searchParams.set("lang", "en");
  return u.toString();
}

/** Guarda la elección de idioma (selector). En modo privado solo vale para esta visita. */
export function guardarIdioma(idioma, storage = globalThis.localStorage) {
  if (!IDIOMAS.includes(idioma)) return;
  try { storage?.setItem(CLAVE_IDIOMA, idioma); } catch { /* sin almacenamiento */ }
}

/**
 * Cabecera X-Idioma para todas las llamadas a la API desde la tienda: el backend guarda
 * en ese idioma lo que la persona aceptó (p. ej. el consentimiento de acepta_correos).
 */
export const cabeceraIdioma = (idioma) => ({ "X-Idioma": idioma === "en" ? "en" : "es" });

/** Marca de idioma para un pedido guardado: solo los pedidos en inglés la llevan. */
export const marcaDeIdioma = (idioma) => (idioma === "en" ? { idioma: "en" } : {});
