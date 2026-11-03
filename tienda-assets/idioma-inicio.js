/*
 * Astrea · Idioma al entrar (script clásico en el <head>, después de los
 * <link rel="alternate" hreflang>; corre antes de pintar la página).
 *
 * Solo actúa en páginas en español que tienen versión en inglés:
 * - Si la persona eligió inglés con el selector (localStorage astrea_idioma = "en"),
 *   la lleva a la versión en inglés.
 * - Si no eligió nada y su navegador está en inglés, la lleva UNA vez por sesión.
 * - Nunca redirige a bots ni a navegadores automatizados, ni desde una página en
 *   inglés al español. Sin JS no pasa nada: la página en español se ve completa.
 * Conserva la búsqueda y el fragmento (?cupon=, #orden=… de /pagar).
 */
(function (global) {
  "use strict";
  var CLAVE = "astrea_idioma";
  var AUTO = "astrea_idioma_auto";
  var BOT = /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|embedly|quora link|whatsapp|telegram|discord|lighthouse|headless|preview/i;

  /** Ruta a la que ir, o null. Lógica pura para las pruebas. */
  function destinoIdioma(o) {
    if (o.lang !== "es" || !o.alterno || o.bot) return null;
    if (o.guardado === "en") return o.alterno;
    if (o.guardado) return null;                       // eligió español (o algo que no reconocemos)
    if (o.auto) return null;                           // ya la llevamos una vez en esta sesión
    return /^en\b/i.test(String(o.navegador || "")) ? o.alterno : null;
  }
  global.astreaDestinoIdioma = destinoIdioma;

  try {
    var doc = global.document, nav = global.navigator || {};
    // /gracias dentro del panel de pago, o ya llevando a /pedido: no navega.
    if (!doc || !doc.querySelector || global.__astreaEnPanel || global.__astreaRedirigiendo) return;
    var lang = String(doc.documentElement.lang || "").slice(0, 2).toLowerCase();
    var enlace = doc.querySelector('link[rel="alternate"][hreflang="en"]');
    var alterno = enlace ? new URL(enlace.getAttribute("href"), global.location.href).pathname : null;
    var guardado = null, auto = false;
    try { guardado = global.localStorage.getItem(CLAVE); } catch (e) { /* sin almacenamiento */ }
    try { auto = global.sessionStorage.getItem(AUTO) === "1"; } catch (e) { /* idem */ }
    var destino = destinoIdioma({
      lang: lang, alterno: alterno, guardado: guardado, auto: auto,
      navegador: (nav.languages && nav.languages[0]) || nav.language,
      bot: Boolean(nav.webdriver) || BOT.test(nav.userAgent || ""),
    });
    if (!destino || destino === global.location.pathname) return;
    if (!guardado) { try { global.sessionStorage.setItem(AUTO, "1"); } catch (e) { /* idem */ } }
    global.location.replace(destino + global.location.search + global.location.hash);
  } catch (e) { /* ante cualquier error, la página en español sigue igual */ }
})(typeof window !== "undefined" ? window : globalThis);
