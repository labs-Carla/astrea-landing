#!/usr/bin/env node
/**
 * Genera las páginas estáticas de la tienda a partir de tienda-assets/catalogo.js.
 *
 *   node scripts/generar-tienda.mjs            escribe los .html en el repo
 *   node scripts/generar-tienda.mjs --check    falla si algún .html quedó desactualizado
 *
 * El sitio sigue sin build en Vercel: los .html generados se commitean. El
 * generador solo evita copiar a mano header, footer, SEO y las 7 páginas de
 * detalle. Sin dependencias (Node ≥ 20).
 *
 * Idiomas (2026-11-03): cada página sale en español (su ruta de siempre) y en inglés
 * (/en/ + la misma ruta: /en/reportes/amor). `construir(idioma)` arma todas las páginas
 * de un idioma; los textos van como t("español", "English") y las rutas internas pasan
 * por R(). Las dos versiones se enlazan con hreflang y comparten el selector ES | EN.
 * Las lecturas se escriben en español: el inglés lo dice cerca del precio y en la compra.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CONSENTIMIENTO, CONSENTIMIENTO_EN } from "../tienda-assets/lista.js";
import { REPORTES, PACK_TEMATICOS, estadoDe, reportePorSlug, reporteEnIdioma, entregaEnIdioma } from "../tienda-assets/catalogo.js";
import { AVISO_IDIOMA } from "../tienda-assets/catalogo-en.js";
import { CHECKOUTS, WHATSAPP } from "../tienda-assets/config.js";
import { rutaEnIdioma } from "../tienda-assets/idioma.js";
import { conIconosAstrea, emblemaAstrea } from "../tienda-assets/iconos-astrea.mjs";
import { LETRAS } from "./pie-letras.mjs";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const SITIO = "https://astrea-charts.site";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const icono = (id, clase = "icon") => `<svg class="${clase}" aria-hidden="true"><use href="#${id}"/></svg>`;

// Sprite de iconos: el mismo de /universo (fuente única) más los que usa la tienda.
const SPRITE_UNIVERSO = readFileSync(join(RAIZ, "universo.html"), "utf8").match(/<svg class="sprite"[\s\S]*?<\/svg>/)[0];
const SPRITE = SPRITE_UNIVERSO.replace("</svg>", `  <symbol id="i-menu" viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></symbol>
  <symbol id="i-clock" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></symbol>
  <symbol id="i-alert" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.5v.01"/></symbol>
  <symbol id="i-orbita" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5.2"/><ellipse cx="12" cy="12" rx="10.5" ry="3.6" transform="rotate(-24 12 12)"/></symbol>
  <symbol id="i-loto" viewBox="0 0 24 24"><path d="M12 19c-2.4-2-3.6-4.6-3.6-7.6S9.6 5.6 12 4c2.4 1.6 3.6 4.4 3.6 7.4S14.4 17 12 19z"/><path d="M12 19c-3.8.2-6.8-1.6-8.4-5.2 2.2-.8 4.4-.6 6.2.6M12 19c3.8.2 6.8-1.6 8.4-5.2-2.2-.8-4.4-.6-6.2.6"/></symbol>
</svg>`);

const TERMINOS_VIGENTES_DESDE = { es: "18 de octubre de 2026", en: "October 18, 2026" };

const SPRITE_PORTADA = conIconosAstrea(SPRITE);

// Almanaque semanal (blog): los 12 signos y la rueda vacía que se ve hasta que llega la semana publicada.
// La rueda real la dibuja astrea-API (/blog/horoscopo-semanal/portada.json) con la misma geometría.
const SIGNOS_ALMANAQUE = [
  ["aries", "Aries", "Aries"], ["tauro", "Tauro", "Taurus"], ["geminis", "Géminis", "Gemini"], ["cancer", "Cáncer", "Cancer"],
  ["leo", "Leo", "Leo"], ["virgo", "Virgo", "Virgo"], ["libra", "Libra", "Libra"], ["escorpio", "Escorpio", "Scorpio"],
  ["sagitario", "Sagitario", "Sagittarius"], ["capricornio", "Capricornio", "Capricorn"],
  ["acuario", "Acuario", "Aquarius"], ["piscis", "Piscis", "Pisces"],
].map(([slug, nombre, nombreEn], i) => ({ slug, nombre, nombreEn, glifo: String.fromCodePoint(0x2648 + i) + "︎" }));

function ruedaVacia(etiqueta) {
  const punto = (lon, r) => {
    const a = (lon * Math.PI) / 180;
    return [+(200 - r * Math.cos(a)).toFixed(2), +(200 + r * Math.sin(a)).toFixed(2)];
  };
  const linea = (clase, [x1, y1], [x2, y2]) => `<line class="${clase}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
  const divisiones = Array.from({ length: 12 }, (_, i) => linea("rueda__division", punto(i * 30, 166), punto(i * 30, 196))).join("");
  const marcas = Array.from({ length: 72 }, (_, i) => i * 5).filter((g) => g % 30)
    .map((g) => linea("rueda__marca", punto(g, 166), punto(g, 166 - (g % 10 ? 3 : 5)))).join("");
  const signos = SIGNOS_ALMANAQUE.map((s, i) => {
    const [x, y] = punto(i * 30 + 15, 181);
    return `<text class="rueda__signo" x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central">${s.glifo}</text>`;
  }).join("");
  return `<svg class="rueda" viewBox="-6 -6 412 412" role="img" aria-label="${etiqueta}">
  <circle class="rueda__fondo" cx="200" cy="200" r="196"/><circle class="rueda__aro" cx="200" cy="200" r="196"/>
  <circle class="rueda__aro rueda__aro--fino" cx="200" cy="200" r="191"/><circle class="rueda__aro" cx="200" cy="200" r="166"/>
  <circle class="rueda__aro rueda__aro--fino" cx="200" cy="200" r="112"/>${divisiones}${marcas}${signos}
  <path class="rueda__estrella" d="M200 192 L202 198 L208 200 L202 202 L200 208 L198 202 L192 200 L198 198 Z"/>
</svg>`;
}

const MARCA = `<span class="marca__texto">ASTREA<small>CHARTS</small></span>`;

// Footer: la marca en grande, en contorno, de lado a lado. La anima tienda-assets/pie-gigante.js.
const PIE_GIGANTE = `
  <div class="pie__gigante" aria-hidden="true" data-pie-gigante>
    <svg viewBox="0 0 1200 232" preserveAspectRatio="xMidYMid meet" focusable="false">
      <defs>
        <linearGradient id="pie-trazo" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="232">
          <stop offset="0" stop-color="#C9A869"/><stop offset="1" stop-color="#8A6A36"/>
        </linearGradient>
        <linearGradient id="pie-metal" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="210" y2="96" spreadMethod="reflect">
          <stop offset="0" stop-color="#8F6A2B"/><stop offset=".42" stop-color="#C39A48"/><stop offset=".72" stop-color="#F4E4B4"/><stop offset="1" stop-color="#B98F3E"/>
        </linearGradient>
        <radialGradient id="pie-luz-grad"><stop offset="0" stop-color="#fff"/><stop offset=".5" stop-color="#fff" stop-opacity=".92"/><stop offset=".8" stop-color="#fff" stop-opacity=".3"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
        <mask id="pie-luz" maskUnits="userSpaceOnUse" x="-20" y="-20" width="1240" height="272">
          <circle data-pie-luz cx="-400" cy="116" r="300" fill="url(#pie-luz-grad)"/>
        </mask>
      </defs>
      <g class="pie__gigante-trazo">${LETRAS.map((d) => `<path d="${d}"/>`).join("")}</g>
      <path class="pie__gigante-luz" d="${LETRAS.join("")}" mask="url(#pie-luz)"/>
    </svg>
  </div>`;

// Pantalla de carga de la portada: oculta por defecto. El script en línea la muestra solo en la
// primera visita de la sesión, así un fallo de los módulos no la deja tapando la tienda.
const INTRO_PORTADA = `<div class="intro" data-intro data-liquid-ignore aria-hidden="true" hidden><div class="intro__carta"><img src="/tienda-assets/img/carta-natal-480.webp" alt="" width="480" height="720"></div></div>
<script>try{if(!sessionStorage.getItem("astrea-intro")&&!matchMedia("(prefers-reduced-motion: reduce)").matches){sessionStorage.setItem("astrea-intro","1");document.querySelector("[data-intro]").hidden=false}}catch(e){}</script>
`;

const lista = (items, clase = "checklist") => `<ul class="${clase}">${items.map((i) => `<li>${icono("i-check")}${esc(i)}</li>`).join("")}</ul>`;

// Testimonios reales y autorizados: { texto, nombre, detalle? }. Vacío = la sección no se muestra.
const TESTIMONIOS = [];

// Páginas con versión en inglés. /ejemplo queda solo en español.
const SOLO_ESPANOL = new Set(["/ejemplo"]);

/** Todas las páginas de un idioma ("es" | "en"): { "ruta/del/archivo.html": html }. */
function construir(L) {
  const t = (es, en) => (L === "en" ? en : es);
  const R = (ruta) => (L === "en" ? rutaEnIdioma(ruta, "en") : ruta);
  const archivo = (nombre) => (L === "en" ? `en/${nombre}` : nombre);
  const BLOG = L === "en" ? ' hreflang="es"' : "";                    // el blog está en español
  const AVISO = L === "en" ? AVISO_IDIOMA : "";

  const REP = REPORTES.map((r) => reporteEnIdioma(r, L));
  const porSlug = (slug) => reporteEnIdioma(reportePorSlug(slug), L);
  const disponibles = REP.filter((r) => estadoDe(r, CHECKOUTS) === "disponible");
  const proximos = REP.filter((r) => estadoDe(r, CHECKOUTS) !== "disponible");
  const principales = disponibles.filter((r) => r.principal);
  const tematicos = disponibles.filter((r) => !r.principal);

  const NAV = [
    ["/", t("Inicio", "Home")],
    ["/reportes", t("Reportes", "Readings")],
    ["/blog/horoscopo-semanal", t("Horóscopo semanal", "Weekly horoscope (in Spanish)")],
    ["/como-funciona", t("Cómo funciona", "How it works")],
    ["/sobre-astrea", t("Sobre Astrea", "About Astrea")],
    ["/regalar", t("Regalar", "Gift a reading")],
    ["/preguntas-frecuentes", t("Preguntas frecuentes", "FAQ")],
  ].map(([href, texto]) => (href.startsWith("/blog") ? [href, texto, BLOG] : [R(href), texto, ""]));

  // Dock del recorrido en la portada: mismos textos y destinos que ya existen en ella.
  const DOCK_PORTADA = `
<nav class="embudo-dock" data-embudo-dock aria-label="${t("Tu recorrido con Astrea", "Your journey with Astrea")}">
  <ol class="embudo-dock__pasos">
    <li><a href="#recorrido" data-paso="1"><span class="embudo-dock__num">I</span>${t("Descubre tu carta", "Discover your chart")}</a></li>
    <li aria-hidden="true" class="embudo-dock__linea"></li>
    <li><a href="#reportes" data-paso="2"><span class="embudo-dock__num">II</span>${t("Profundiza con una lectura", "Go deeper with a reading")}</a></li>
  </ol>
  <div class="embudo-dock__acciones">
    <a class="btn btn-metal btn--gold btn--sm metal-marmol" href="${R("/universo")}#generador">${t("Descubrir mi carta gratis", "Discover my free chart")} ${icono("i-arrow")}</a>
    <a class="btn btn-metal btn--ghost btn--sm" href="#reportes">${t("Ver reportes", "See readings")}</a>
  </div>
</nav>`;

  /** Selector ES | EN: enlaces a la misma página en cada idioma (sin JS también funciona). */
  function selectorIdioma(rutaEs, conIngles) {
    const enlaces = [["es", "ES", rutaEs], ["en", "EN", conIngles ? rutaEnIdioma(rutaEs, "en") : "/en/"]];
    return `<nav class="selector-idioma" aria-label="${t("Idioma", "Language")}">${enlaces.map(([codigo, texto, href]) =>
      `<a href="${href}" hreflang="${codigo}" lang="${codigo}" data-idioma="${codigo}"${codigo === L ? ' aria-current="true"' : ""}>${texto}</a>`).join('<span aria-hidden="true">|</span>')}</nav>`;
  }

  function layout({ ruta, titulo, descripcion, cuerpo, scripts = [], jsonLd = null, indexable = true, imagen = "/universo-assets/img/hero-escultura.webp", portada = false, preload = "" }) {
    const conIngles = !SOLO_ESPANOL.has(ruta);
    const propia = R(ruta);
    const actual = (href) => (href === propia || (href !== "/" && href !== "/en/" && propia.startsWith(href + "/")) ? ' aria-current="page"' : "");
    const enlaces = NAV.map(([href, texto, extra]) => `<a href="${href}"${extra}${actual(href)}>${texto}</a>`).join("\n      ");
    const navPrincipal = `<nav class="site-nav" aria-label="${t("Principal", "Main")}">
      ${enlaces}
    </nav>`;
    const alternos = conIngles
      ? `<link rel="alternate" hreflang="es" href="${SITIO}${ruta}">
<link rel="alternate" hreflang="en" href="${SITIO}${rutaEnIdioma(ruta, "en")}">
<link rel="alternate" hreflang="x-default" href="${SITIO}${ruta}">
<script src="/tienda-assets/idioma-inicio.js"></script>
`
      : "";
    return `<!DOCTYPE html>
<html lang="${L}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>${esc(titulo)}</title>
<meta name="description" content="${esc(descripcion)}">
${indexable ? `<link rel="canonical" href="${SITIO}${propia}">` : '<meta name="robots" content="noindex">'}
${alternos}<meta property="og:type" content="website">
<meta property="og:site_name" content="Astrea">
<meta property="og:title" content="${esc(titulo)}">
<meta property="og:description" content="${esc(descripcion)}">
<meta property="og:url" content="${SITIO}${propia}">
<meta property="og:image" content="${SITIO}${imagen}">
<meta property="og:locale" content="${t("es_LA", "en_US")}">
${conIngles ? `<meta property="og:locale:alternate" content="${t("en_US", "es_LA")}">\n` : ""}<meta name="theme-color" content="#F7F3EA">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&family=Noto+Sans+Symbols&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/universo-assets/universo.css">
<link rel="stylesheet" href="/tienda-assets/tienda.css">
<link rel="stylesheet" href="/tienda-assets/observatorio.css">
<link rel="stylesheet" href="/tienda-assets/almanaque.css">
<link rel="stylesheet" href="/tienda-assets/sitio-publico.css">
<link rel="stylesheet" href="/tienda-assets/nav-flotante.css">
${portada ? '<link rel="stylesheet" href="/tienda-assets/portada-vidrio.css">\n<link rel="stylesheet" href="/tienda-assets/portada-capitulos.css">\n' : ""}${preload}
${jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>\n` : ""}</head>
<body class="portada-observatorio astrea-publica${portada ? " capitulos glass glass--oro glass--mixta" : " glass glass--oro"}">
<!-- Generado por scripts/generar-tienda.mjs a partir de tienda-assets/catalogo.js. No editar a mano. -->

${SPRITE_PORTADA}

${portada ? INTRO_PORTADA : ""}<a class="skip-link" href="#contenido">${t("Saltar al contenido", "Skip to content")}</a>

<header class="site-header site-header--tienda">
  <div class="site-header__inner">
    <a class="wordmark alm-marca" href="${R("/")}" aria-label="${t("Astrea, inicio", "Astrea, home")}"><span class="alm-marca__texto">ASTREA<small>${t("Astrología para conocerte", "Astrology to know yourself")}</small></span></a>
    <div class="isla-nav">
    ${navPrincipal}
    <a class="btn btn-metal btn--gold btn--sm" href="${R("/reportes")}">${t("Ver reportes", "See readings")}</a>
    </div>
    <div class="header-acciones">
      ${selectorIdioma(ruta, conIngles)}
      <details class="menu-movil">
        <summary aria-label="${t("Abrir menú", "Open menu")}">${icono("i-menu")}</summary>
        <nav class="menu-movil__panel" aria-label="${t("Menú", "Menu")}">
          ${enlaces}
        </nav>
      </details>
    </div>
  </div>
</header>

<main id="contenido" tabindex="-1">
${cuerpo}
</main>

<footer class="pie">${PIE_GIGANTE}
  <div class="shell pie__grid">
    <div class="pie__marca">
      <a class="marca" href="${R("/")}" aria-label="${t("Astrea Charts, inicio", "Astrea Charts, home")}">${MARCA}</a>
      <p>${t("Astrología para conocerte, reflexionar y transformarte.", "Astrology to know yourself, reflect and transform.")}</p>
    </div>
    <nav class="pie__columna" aria-label="${t("Explora", "Explore")}">
      <h2 class="pie__titulo">${t("Explora", "Explore")}</h2>
      <a href="${R("/reportes")}">${t("Reportes", "Readings")}</a>
      <a href="/blog/horoscopo-semanal"${BLOG}>${t("Horóscopo semanal", "Weekly horoscope (in Spanish)")}</a>
      <a href="${R("/como-funciona")}">${t("Cómo funciona", "How it works")}</a>
      <a href="${R("/sobre-astrea")}">${t("Sobre Astrea", "About Astrea")}</a>
      <a href="${R("/preguntas-frecuentes")}">${t("Preguntas frecuentes", "FAQ")}</a>
    </nav>
    <div class="pie__columna">
      <h2 class="pie__titulo">${t("Contacto", "Contact")}</h2>
      <a href="https://www.tiktok.com/@astrea.charts">TikTok · @astrea.charts</a>
      <a href="${WHATSAPP}">WhatsApp</a>
    </div>
  </div>
  <div class="shell pie__legal">
    <p>${t("Astrea Charts es una herramienta de autoconocimiento. No reemplaza asesoría médica, psicológica ni financiera.", "Astrea Charts is a self-discovery tool. It does not replace medical, psychological or financial advice.")}</p>
    <p><a href="${R("/terminos")}">${t("Términos y reembolsos", "Terms and refunds")}</a> · <a href="${R("/privacidad")}">${t("Política de privacidad", "Privacy policy")}</a> · © ${new Date().getFullYear()} Astrea Charts</p>
  </div>
</footer>${portada ? DOCK_PORTADA : ""}
${["/tienda-assets/origen.js", "/tienda-assets/sitio-publico.js", "/tienda-assets/nav-flotante.js", "/tienda-assets/pie-gigante.js", ...scripts].map((s) => `<script type="module" src="${s}"></script>`).join("\n")}
</body>
</html>
`;
  }

  function cabecera({ eyebrow, titulo, lede, migas = [] }) {
    const m = migas.length
      ? `<nav class="migas" aria-label="${t("Ruta", "Breadcrumb")}">${migas.map(([href, tx], i) => (i < migas.length - 1 ? `<a href="${R(href)}">${esc(tx)}</a><span aria-hidden="true">/</span>` : `<span aria-current="page">${esc(tx)}</span>`)).join("")}</nav>`
      : "";
    return `<section class="pagina-cabecera">
  <div class="shell">
    ${m}
    <p class="eyebrow eyebrow--light">${esc(eyebrow)}</p>
    <h1 class="h-display">${esc(titulo)}</h1>
${lede ? `    <p class="lede lede--light">${esc(lede)}</p>` : ""}
  </div>
</section>`;
  }
  const INICIO = ["/", t("Inicio", "Home")];
  const REPORTES_MIGA = ["/reportes", t("Reportes", "Readings")];

  function portada(r, { prioridad = false } = {}) {
    if (r.portada) {
      return `<div class="portada portada--libro"><img src="${r.portada}-480.webp" srcset="${r.portada}-480.webp 480w, ${r.portada}-960.webp 960w" sizes="(min-width: 860px) 360px, 80vw" alt="${t(`Portada del reporte ${esc(r.nombre)} de Astrea`, `Cover of the Astrea reading ${esc(r.nombre)}`)}" width="480" height="720" ${prioridad ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async"></div>`;
    }
    return `<div class="portada portada--atenuada" role="img" aria-label="${t("Emblema de", "Emblem of")} ${esc(r.nombre)}"><div class="portada__emblema">${icono(r.icono)}<span class="portada__titulo">${esc(r.nombre)}</span></div></div>`;
  }

  function insignia(r, oscura = false) {
    const disp = estadoDe(r, CHECKOUTS) === "disponible";
    return `<span class="insignia insignia--${disp ? "disponible" : "proximamente"}${oscura ? " insignia--oscura" : ""}">${disp ? t("Disponible", "Available") : t("Próximamente", "Not on sale yet")}</span>`;
  }

  function precioHtml(r) {
    const c = CHECKOUTS[r.slug];
    return c
      ? `<p class="precio">${esc(c.precioReferencia)}<small>${t("Pagas en tu moneda local con Hotmart", "You pay in your local currency with Hotmart")}</small>${AVISO ? `<small class="precio__idioma">${AVISO}</small>` : ""}</p>`
      : `<p class="precio"><small>${t("Aún no a la venta", "Not on sale yet")}</small></p>`;
  }

  function tarjeta(r) {
    const disp = estadoDe(r, CHECKOUTS) === "disponible";
    return `<article class="tarjeta-reporte" aria-labelledby="t-${r.slug}">
  <a href="${R(`/reportes/${r.slug}`)}" tabindex="-1" aria-hidden="true">${portada(r)}</a>
  <div class="tarjeta-reporte__cuerpo">
    ${insignia(r)}
    <h3 class="tarjeta-reporte__titulo" id="t-${r.slug}"><a href="${R(`/reportes/${r.slug}`)}">${esc(r.nombre)}</a></h3>
    <p class="tarjeta-reporte__texto">${esc(r.resumen)}</p>
    <div class="tarjeta-reporte__pie">
      ${precioHtml(r)}
      <a class="btn ${disp ? "btn--night" : "btn--ghost"} btn--sm" href="${R(`/reportes/${r.slug}`)}">${disp ? t("Conocer y comprar", "Learn more and buy") : t("Conocer", "Learn more")}</a>
    </div>
  </div>
</article>`;
  }

  const paginas = {};

  // ---------------------------------------------------------------- portada (inicio)

  const FAQ_PORTADA = L === "en" ? [
    ["What information do I need for my reading?", "Your date, time and place of birth, and the email where you want to receive it. For the solar return, also the city where you will spend your birthday; for couple compatibility, the other person’s details (their time of birth is optional) and their consent."],
    ["How long does it take to arrive?", "Between 24 and 48 hours after we confirm your payment on Hotmart."],
    ["In what format will I receive my reading?", "As a PDF, by email, with an editorial design made to be read slowly on your phone, on your computer or printed."],
    ["What language is my reading written in?", "Your reading is written in Spanish. The shop, your order and the payment are in English; the PDF you receive is in Spanish."],
    ["Are the readings personalized?", "Yes. Each reading starts from your chart, calculated with Swiss Ephemeris for your exact date, time and place of birth. The interpretation is written with the help of AI and we review it before sending it."],
    ["Can I ask for a refund?", "Yes. You have 7 days from purchase to ask for a full refund, even if you have already received your reading. Request it from Hotmart’s purchase email or on WhatsApp with your order reference. The details are in Terms and refunds."],
  ] : [
    ["¿Qué información necesito para hacer mi reporte?", "Tu fecha, hora y lugar de nacimiento, y el correo donde quieres recibirlo. Para la revolución solar, también la ciudad donde pasarás tu cumpleaños; para la compatibilidad de pareja, los datos de la otra persona (su hora de nacimiento es opcional) y su consentimiento."],
    ["¿Cuánto tiempo tarda en llegar?", "Entre 24 y 48 horas después de que confirmamos tu pago en Hotmart."],
    ["¿En qué formato recibiré mi informe?", "En PDF, por correo electrónico, con un diseño editorial pensado para leerse con calma en el celular, en la computadora o impreso."],
    ["¿Los reportes son personalizados?", "Sí. Cada reporte parte de tu carta, calculada con Swiss Ephemeris para tu fecha, hora y lugar exactos de nacimiento. La interpretación se redacta con apoyo de IA y la revisamos antes de enviarla."],
    ["¿Puedo pedir un reembolso?", "Sí. Tienes 7 días desde la compra para pedir el reembolso total, aunque ya hayas recibido tu lectura. Lo pides desde el correo de compra de Hotmart o por WhatsApp con la referencia de tu pedido. Los detalles están en Términos y reembolsos."],
  ];

  const GENERADOR = `${R("/universo")}#generador`;
  const RECORRIDO = [
    ["i-astrolabio", t("Descubre tu carta", "Discover your chart"), t("Genera gratis tu carta natal: tu Sol, tu Luna y tu Ascendente, con la rueda de tu cielo. Es la base de todo lo demás.", "Generate your birth chart for free: your Sun, your Moon and your Ascendant, with the wheel of your sky. It’s the foundation for everything else."), GENERADOR, t("Generar mi carta gratis", "Generate my free chart")],
    ["i-libro", t("Profundiza con una lectura", "Go deeper with a reading"), t("La carta natal completa o un reporte temático, en PDF y escrito para ti. La compras una vez y es tuya.", `The complete birth chart or a themed reading, in PDF and written for you. You buy it once and it’s yours. ${AVISO}`), R("/reportes"), t("Ver reportes", "See readings")],
  ];

  const tarjetaPortada = (r) => `<article class="tarjeta-portada" aria-labelledby="tp-${r.slug}">
  <a class="tarjeta-portada__imagen" href="${R(`/reportes/${r.slug}`)}" tabindex="-1" aria-hidden="true">
    <img src="${r.portada}-480.webp" srcset="${r.portada}-480.webp 480w, ${r.portada}-960.webp 960w" sizes="(min-width: 1100px) 260px, (min-width: 600px) 45vw, 88vw" alt="" width="480" height="720" loading="lazy" decoding="async">
  </a>
  <div class="tarjeta-portada__cuerpo">
    <p class="tarjeta-portada__categoria">${esc(r.categoria)}</p>
    <h3 class="tarjeta-portada__titulo" id="tp-${r.slug}"><a href="${R(`/reportes/${r.slug}`)}">${esc(r.nombre)}</a></h3>
    <p class="tarjeta-portada__texto">${esc(r.tarjeta)}${AVISO ? ` <span class="tarjeta-portada__idioma">${AVISO}</span>` : ""}</p>
    <div class="tarjeta-portada__pie">
      <span class="tarjeta-portada__precio">${esc(CHECKOUTS[r.slug].precioReferencia)}</span>
      <a class="btn btn-metal btn--gold btn--sm" href="${R(`/comprar/${r.slug}`)}" aria-label="${t("Comprar", "Buy")} ${esc(r.nombre)}">${t("Comprar", "Buy")} ${icono("i-arrow")}</a>
    </div>
  </div>
</article>`;

  // Cada sección va en una «hoja» que se apila al hacer scroll, en el orden del embudo:
  // atención, confianza, los dos pasos, oferta, cómo se recibe, contenido para volver y objeciones.
  const hojaPortada = ([tema, seccion], i) => `<div class="hoja hoja--${tema}" data-hoja>${i ? `<p class="hoja__capitulo" aria-hidden="true">${t("Capítulo", "Chapter")} ${String(i).padStart(2, "0")}</p>` : ""}
${seccion}
<div class="hoja__tapa" aria-hidden="true"></div></div>`;

  const HOJAS_PORTADA = [
    ["hero", `<section class="hero hero--tienda hero--editorial hero--astrea-atlas" aria-labelledby="hero-titulo">
  <div class="hero-atlas__art" aria-hidden="true"></div>
  <div class="hero-atlas__veil" aria-hidden="true"></div>
  <div class="hero-atlas__inner shell">
    <div class="hero-atlas__copy">
      <p class="eyebrow">${t("Un atlas de tu universo personal", "An atlas of your personal universe")}</p>
      <h1 class="h-display" id="hero-titulo">${t("El universo<br>empieza<br><em>contigo.</em>", "The universe<br>begins<br><em>with you.</em>")}</h1>
      <p class="lede">${t("Astrología para conocerte, explorar tus ciclos y descubrir nuevas formas de ser tú.", "Astrology to know yourself, explore your cycles and discover new ways of being you.")}</p>
      <div class="hero__actions">
        <a class="btn btn-metal btn--gold metal-marmol" href="${GENERADOR}">${t("Descubrir mi carta gratis", "Discover my free chart")} ${icono("i-arrow")}</a>
        <a class="link-quiet" href="${R("/reportes")}">${t("Explorar lecturas", "Explore readings")} <span aria-hidden="true">↗</span></a>
      </div>
      <p class="hero-atlas__footnote">✳ ${t("Tu carta natal es solo el comienzo.", "Your birth chart is only the beginning.")}</p>
    </div>
  </div>
</section>`],
    ["confianza", `<section class="confianza" aria-label="${t("Por qué confiar en Astrea", "Why trust Astrea")}">
  <ul class="shell confianza__lista">
    <li>${icono("i-armilar", "icon confianza__icono")}<div><strong>${t("Astronomía real", "Real astronomy")}</strong><span>${t("Cálculos con Swiss Ephemeris y datos astronómicos precisos.", "Calculations with Swiss Ephemeris and precise astronomical data.")}</span></div></li>
    <li>${icono("i-pluma", "icon confianza__icono")}<div><strong>${t("Revisión humana", "Human review")}</strong><span>${t("Interpretaciones asistidas por IA y revisadas por una astróloga.", "Interpretations assisted by AI and reviewed by an astrologer.")}</span></div></li>
    <li>${icono("i-pergamino", "icon confianza__icono")}<div><strong>${t("Directo a tu correo", "Straight to your inbox")}</strong><span>${t("Recibe tu informe en 24–48 horas después de la confirmación del pago.", "Receive your reading 24–48 hours after your payment is confirmed.")}</span></div></li>
    <li>${icono("i-espejo", "icon confianza__icono")}<div><strong>${t("Autoconocimiento", "Self-discovery")}</strong><span>${t("Herramientas para comprenderte y tomar decisiones más alineadas.", "Tools to understand yourself and make decisions more aligned with you.")}</span></div></li>
  </ul>
</section>`],
    ["arena", `<section class="capitulo capitulo--marmol" id="recorrido" aria-labelledby="recorrido-titulo">
  <div class="shell">
    <header class="capitulo__cabecera">
      <div>
        <p class="eyebrow">${t("Tu recorrido con Astrea", "Your journey with Astrea")}</p>
        <h2 class="capitulo__titulo" id="recorrido-titulo">${t("Una experiencia que crece contigo.", "An experience that grows with you.")}</h2>
      </div>
      <p class="capitulo__intro">${t("Tu carta natal es el punto de partida. A partir de ella, cada lectura se escribe para ti, y puedes volver en distintos momentos para explorar nuevos temas de tu vida.", "Your birth chart is the starting point. From there, each reading is written for you, and you can come back at different moments to explore new themes in your life.")}</p>
    </header>
    <ol class="pasos pasos--dos">
      ${RECORRIDO.map(([ic, tit, d, href, accion], i) => `<li class="paso"><span class="paso__numero">${["I", "II"][i]}</span>${icono(ic, "icon paso__icono")}<h3 class="paso__titulo">${esc(tit)}</h3><p>${esc(d)}</p><a class="btn btn-metal btn--gold btn--sm paso__enlace${href === GENERADOR ? " metal-marmol" : ""}" href="${href}">${esc(accion)}</a></li>`).join(`
      <li class="recorrido__visual" aria-hidden="true"><div class="telefono"><img src="/tienda-assets/img/carta-natal-480.webp" alt="" width="480" height="720" loading="lazy" decoding="async"></div></li>
      `)}
    </ol>
  </div>
</section>`],
    ["noche", `<section class="capitulo capitulo--claro" id="reportes" aria-labelledby="reportes-titulo">
  <div class="shell">
    <header class="capitulo__cabecera">
      <div>
        <p class="eyebrow">${t("Nuestros reportes", "Our readings")}</p>
        <h2 class="capitulo__titulo" id="reportes-titulo">${t("Tu historia tiene muchas capas.", "Your story has many layers.")}</h2>
      </div>
      <p class="capitulo__intro">${t("Lecturas en PDF, escritas a partir de tu carta natal y revisadas antes de llegar a ti.", `PDF readings, written from your birth chart and reviewed before they reach you. ${AVISO}`)}</p>
    </header>
    <div class="catalogo-portada" data-totems>
      ${disponibles.map(tarjetaPortada).join("\n      ")}
    </div>
    <div class="totems__control" data-totems-control>
      <div class="totems__navegar">
        <p class="totems__contador" aria-live="polite">(<span data-totems-n>1</span>)</p>
        <button type="button" class="totems__flecha" data-totems-paso="-1" aria-label="${t("Reporte anterior", "Previous reading")}">${icono("i-prev")}</button>
        <button type="button" class="totems__flecha" data-totems-paso="1" aria-label="${t("Reporte siguiente", "Next reading")}">${icono("i-next")}</button>
      </div>
      <div class="totems__pastillas" aria-label="${t("Elegir reporte", "Choose a reading")}">${disponibles.map((r, i) => `<button type="button" class="totems__pastilla" data-totem="${i}" aria-controls="tp-${r.slug}">${esc(r.nombre)}</button>`).join("")}</div>
    </div>
  </div>
</section>`],
    ["marfil", `<section class="capitulo capitulo--marmol" id="como-funciona" aria-labelledby="pasos-titulo">
  <div class="shell">
    <header class="capitulo__cabecera capitulo__cabecera--centro">
      <p class="eyebrow">${t("Cómo funciona", "How it works")}</p>
      <h2 class="capitulo__titulo" id="pasos-titulo">${t("Tres pasos para recibir tu reporte", "Three steps to receive your reading")}</h2>
    </header>
    <ol class="pasos">
      <li class="paso"><span class="paso__numero">01</span>${icono("i-nacimiento", "icon paso__icono")}<h3 class="paso__titulo">${t("Comparte tus datos de nacimiento", "Share your birth details")}</h3><p>${t("Completa tu fecha, hora y lugar de nacimiento, y los datos de tu pareja si aplica.", "Fill in your date, time and place of birth, and your partner’s details if needed.")}</p></li>
      <li class="paso"><span class="paso__numero">02</span>${icono("i-astrolabio", "icon paso__icono")}<h3 class="paso__titulo">${t("Calculamos tu carta", "We calculate your chart")}</h3><p>${t("Usamos Swiss Ephemeris y una interpretación asistida por IA, revisada por una astróloga.", "We use Swiss Ephemeris and an AI-assisted interpretation, reviewed by an astrologer.")}</p></li>
      <li class="paso"><span class="paso__numero">03</span>${icono("i-pergamino", "icon paso__icono")}<h3 class="paso__titulo">${t("Recibes tu informe personalizado", "You receive your personalized reading")}</h3><p>${t("Te lo enviamos a tu correo en 24–48 horas, contadas desde la confirmación del pago.", `We send it to your email within 24–48 hours of your payment being confirmed. ${AVISO}`)}</p></li>
    </ol>
  </div>
</section>`],
    ...(TESTIMONIOS.length ? [["marfil", `<section class="capitulo capitulo--claro" aria-labelledby="testimonios-titulo">
  <div class="shell">
    <header class="capitulo__cabecera capitulo__cabecera--centro">
      <p class="eyebrow">${t("Lo que dicen", "What they say")}</p>
      <h2 class="capitulo__titulo" id="testimonios-titulo">${t("Historias reales", "Real stories")}</h2>
    </header>
    <div class="testimonios">
      ${TESTIMONIOS.map((x) => `<figure class="testimonio"><blockquote>${esc(x.texto)}</blockquote><figcaption>${esc(x.nombre)}${x.detalle ? ` · ${esc(x.detalle)}` : ""}</figcaption></figure>`).join("\n      ")}
    </div>
  </div>
</section>`]] : []),
    ["azul", `<section class="cielo-semana" id="cielo-semana" aria-labelledby="cielo-semana-titulo" data-cielo-semana>
  <div class="shell cielo-semana__grid">
    <div class="cielo-semana__texto">
      <p class="alm-eyebrow" data-cs="eyebrow">${t("Horóscopo semanal · cada lunes", "Weekly horoscope · every Monday · in Spanish")}</p>
      <h2 class="alm-h2" id="cielo-semana-titulo">${t("Tu semana,<br>a la luz del cielo", "Your week,<br>in the light of the sky")}</h2>
      <p class="alm-rango" data-cs="rango"></p>
      <p class="cielo-semana__titulo" data-cs="titulo"></p>
      <p class="alm-lede" data-cs="resumen">${t("Una pausa para mirar hacia arriba y volver a ti. Cada lunes, los movimientos del cielo y una lectura para acompañar tu semana.", "A pause to look up and come back to yourself. Every Monday, the movements of the sky and a reading to accompany your week, written in Spanish.")}</p>
      <div class="cielo-semana__acciones">
        <a class="btn btn-metal btn--gold" href="/blog/horoscopo-semanal"${BLOG} data-cs="url">${t("Leer mi horóscopo", "Read my horoscope (in Spanish)")} <span aria-hidden="true">↗</span></a>
        <a class="link-quiet" href="/blog"${BLOG}>${t("Ver semanas anteriores", "See previous weeks (in Spanish)")} <span aria-hidden="true">→</span></a>
      </div>
    </div>
    <figure class="cielo-semana__rueda">
      <p class="cielo-semana__mapa">${t("El cielo, en movimiento", "The sky, in motion")}</p>
      <div class="cielo-semana__escena">
        <span class="cielo-semana__orbita" aria-hidden="true"></span>
        <span class="cielo-semana__orbita cielo-semana__orbita--inclinada" aria-hidden="true"></span>
        <div data-cs="rueda">${ruedaVacia(t("La rueda del zodíaco", "The zodiac wheel"))}</div>
      </div>
      <figcaption>${t("Un cielo compartido. Doce formas de vivirlo.", "One shared sky. Twelve ways to live it.")}</figcaption>
    </figure>
  </div>
  <div class="shell cielo-semana__signos">
    <div class="cielo-semana__cabecera-signos"><h3 class="cielo-semana__elige">${t("Un cielo, doce miradas", "One sky, twelve perspectives")}</h3><p>${t("Empieza por tu signo solar. Explora también tu Ascendente.", "Start with your Sun sign. Explore your Ascendant too.")}</p></div>
    <ul class="zodiaco zodiaco--ilustrado">
        ${SIGNOS_ALMANAQUE.map((s) => `<li><a href="/blog/horoscopo-semanal/${s.slug}"${BLOG} data-signo="${s.slug}"><span class="alm-medallon" aria-hidden="true"><img src="/universo-assets/img/almanaque/${s.slug}-320.webp" width="80" height="80" alt="" loading="lazy" decoding="async"></span>${t(s.nombre, s.nombreEn)}</a></li>`).join("\n        ")}
    </ul>
  </div>
</section>`],
    ["marfil", `<section class="capitulo capitulo--claro" id="preguntas" aria-labelledby="faq-titulo">
  <div class="shell faq-portada">
    <header class="capitulo__cabecera capitulo__cabecera--apilada">
      <p class="eyebrow">${t("Preguntas frecuentes", "Frequently asked questions")}</p>
      <h2 class="capitulo__titulo" id="faq-titulo">${t("Antes de empezar", "Before you begin")}</h2>
      <p class="capitulo__intro">${t(`¿Otra duda? <a class="link-quiet" href="/preguntas-frecuentes">Todas las preguntas</a> o <a class="link-quiet" href="${WHATSAPP}">escríbenos por WhatsApp</a>.`, `Another question? <a class="link-quiet" href="/en/preguntas-frecuentes">All the questions</a> or <a class="link-quiet" href="${WHATSAPP}">write to us on WhatsApp</a>.`)}</p>
    </header>
    <div class="accordion">
      ${FAQ_PORTADA.map(([q, a]) => `<details><summary>${esc(q)}${icono("i-plus")}</summary><p>${esc(a)}</p></details>`).join("\n      ")}
    </div>
  </div>
</section>`],
  ];

  paginas[archivo("index.html")] = layout({
    ruta: "/",
    portada: true,
    scripts: ["/tienda-assets/cielo-semana.js", "/tienda-assets/portada-vidrio.js", "/tienda-assets/portada-capitulos.js"],
    imagen: "/universo-assets/img/observatorio/astrea-editorial-hero.webp",
    preload: ['<link rel="preload" as="image" href="/universo-assets/img/observatorio/astrea-editorial-hero.webp" fetchpriority="high">',
      ...["lenis", "motion", "anime"].map((l) => `<link rel="modulepreload" href="/tienda-assets/vendor/${l}.min.js">`)].join("\n"),
    titulo: t("Astrea · Tu cielo. Tu forma de ser.", "Astrea · Your sky. Your way of being."),
    descripcion: t("Un espacio para conocerte a través de tu carta natal. Astronomía precisa, astrología cercana y lecturas para volver a ti. Descubre tu carta gratis.", "A space to know yourself through your birth chart. Precise astronomy, warm astrology and readings to come back to yourself. Discover your free chart."),
    cuerpo: HOJAS_PORTADA.map(hojaPortada).join("\n\n"),
    jsonLd: { "@context": "https://schema.org", "@type": "FAQPage", ...(L === "en" ? { inLanguage: "en" } : {}), mainEntity: FAQ_PORTADA.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) },
  });

  paginas[archivo("reportes.html")] = layout({
    ruta: "/reportes",
    titulo: t("Reportes astrológicos · Astrea", "Astrology readings · Astrea"),
    descripcion: t("Carta natal completa, revolución solar, compatibilidad de pareja y reportes de amor, vocación, dinero y patrones. Precios y qué incluye cada uno.", "Complete birth chart, solar return, couple compatibility and readings on love, vocation, money and patterns. Prices and what each one includes."),
    cuerpo: `${cabecera({ eyebrow: t("Catálogo", "Catalog"), titulo: t("Reportes de Astrea", "Astrea readings"), lede: t("Cada reporte mira tu carta desde una pregunta distinta. Todos llegan en PDF a tu correo.", `Each reading looks at your chart from a different question. They all reach your inbox as PDFs. ${AVISO}`), migas: [INICIO, REPORTES_MIGA] })}
<section class="sheet sheet--light sheet--lift seccion">
  <div class="shell">
    ${principales.length ? `<div class="grupo-catalogo">
      <h2 class="grupo-catalogo__titulo">${t("La lectura de base", "The foundation reading")}</h2>
      <p class="grupo-catalogo__texto">${t("Tu carta natal completa: el mapa entero, para empezar a conocerte. Sola o en pack con dos lecturas temáticas.", "Your complete birth chart: the whole map, to begin knowing yourself. On its own or in a pack with two themed readings.")}</p>
      <div class="catalogo">${principales.map(tarjeta).join("\n")}</div>
    </div>` : ""}
    ${tematicos.length ? `<div class="grupo-catalogo">
      <h2 class="grupo-catalogo__titulo">${t("Reportes temáticos", "Themed readings")}</h2>
      <p class="grupo-catalogo__texto">${t("Una lectura enfocada en un área de tu vida, un ciclo o un vínculo.", "A reading focused on one area of your life, a cycle or a bond.")}</p>
      <div class="catalogo">${tematicos.map(tarjeta).join("\n")}</div>
    </div>` : ""}
    ${proximos.length ? `<div class="grupo-catalogo">
      <h2 class="grupo-catalogo__titulo">${t("En preparación", "Not on sale yet")}</h2>
      <p class="grupo-catalogo__texto">${t(`Todavía no se pueden comprar. Si te interesa alguno, <a class="link-quiet" href="${WHATSAPP}">escríbenos</a> y te avisamos.`, `These can’t be bought yet. If one interests you, <a class="link-quiet" href="${WHATSAPP}">write to us</a>.`)}</p>
      <div class="catalogo">${proximos.map(tarjeta).join("\n")}</div>
    </div>` : ""}
  </div>
</section>`,
  });

  for (const r of REP) {
    const disp = estadoDe(r, CHECKOUTS) === "disponible";
    const compra = disp
      ? `<a class="btn btn--gold btn--block" href="${R(`/comprar/${r.slug}`)}">${t(`Pedir mi ${esc(r.nombre.toLowerCase())}`, r.extra === "pack" ? "Order this pack" : "Order this reading")} ${icono("i-arrow")}</a>
      <p class="detalle__aviso">${icono("i-lock")} ${t("Primero registras tus datos; después pagas con Hotmart aquí mismo, sin salir de Astrea, en tu moneda local. No guardamos datos de tarjetas.", "First you enter your details; then you pay with Hotmart right here, without leaving Astrea, in your local currency. We don’t store card details.")}</p>`
      : `<p class="detalle__aviso">${t("Aún no se puede comprar.", "It can’t be bought yet.")}</p>
      <a class="btn btn--ghost btn--block" href="${WHATSAPP}?text=${encodeURIComponent(t(`Hola, quiero saber cuándo estará el reporte de ${r.nombre}`, `Hi, I’d like to know about the reading ${r.nombre}`))}">${t("Avísame cuando esté", "Ask us on WhatsApp")}</a>
      <a class="link-quiet" href="${R("/reportes/carta-natal")}">${t("Mientras tanto, conoce la carta natal completa", "Meanwhile, explore the complete birth chart")}</a>`;
    const despues = disp
      ? (L === "en"
        ? [r.extra === "segunda_persona" ? "You fill in your details, the other person’s and your email." : r.extra === "revolucion_solar" ? "You fill in your birth details, where you will spend your birthday and your email." : r.extra === "pack" ? "You fill in your birth details, choose your 2 themed readings and leave your email." : "You fill in your birth details and your email.", "You pay with Hotmart without leaving Astrea, with your order already registered.", "We confirm your payment and prepare your reading.", "We review it and email it to you within 24–48 h."]
        : [r.extra === "segunda_persona" ? "Completas tus datos, los de la otra persona y tu correo." : r.extra === "revolucion_solar" ? "Completas tus datos de nacimiento, dónde pasarás tu cumpleaños y tu correo." : r.extra === "pack" ? "Completas tus datos de nacimiento, eliges tus 2 lecturas temáticas y dejas tu correo." : "Completas tus datos de nacimiento y tu correo.", "Pagas con Hotmart sin salir de Astrea, con tu pedido ya registrado.", "Confirmamos tu pago y preparamos tu lectura.", "La revisamos y te la enviamos por correo en 24–48 h."])
      : t(["Cuando esté disponible, lo anunciaremos en esta página.", "Podrás pedirlo con tus datos de nacimiento.", "Lo recibirás por correo, revisado como todas nuestras lecturas."],
        ["It isn’t on sale yet.", "If you’d like it, write to us on WhatsApp."]);
    const jsonLd = {
      "@context": "https://schema.org", "@type": "Product", name: `${r.nombre} · Astrea`, description: r.resumen,
      brand: { "@type": "Brand", name: "Astrea" },
      ...(disp ? { offers: { "@type": "Offer", price: CHECKOUTS[r.slug].precioReferencia.replace(/[^\d.]/g, ""), priceCurrency: "USD", availability: "https://schema.org/InStock", url: `${SITIO}${R(`/reportes/${r.slug}`)}` } } : {}),
    };
    paginas[archivo(`reportes/${r.slug}.html`)] = layout({
      ruta: `/reportes/${r.slug}`,
      titulo: t(`${r.nombre} · Reportes Astrea`, `${r.nombre} · Astrea readings`),
      descripcion: t(`${r.resumen}${disp ? "" : " Próximamente."}`, r.resumen),
      jsonLd: { ...jsonLd, image: `${SITIO}${r.portada}-960.webp` },
      imagen: `${r.portada}-960.webp`,
      cuerpo: `${cabecera({ eyebrow: r.eyebrow, titulo: r.nombre, lede: r.resumen, migas: [INICIO, REPORTES_MIGA, [`/reportes/${r.slug}`, r.nombre]] })}
<section class="sheet sheet--light sheet--lift seccion">
  <div class="shell detalle">
    <aside class="detalle__lateral">
      <div class="detalle__portada">${portada(r, { prioridad: true })}</div>
      <div class="detalle__compra" aria-label="${t("Compra", "Purchase")}">
        ${insignia(r)}
        ${precioHtml(r)}
        ${compra}
      </div>
    </aside>
    <div class="bloques">
      <div class="prosa"><p>${esc(r.descripcion)}</p>${r.nota ? `<p class="nota-reflexion">${esc(r.nota)}</p>` : ""}</div>
      <div class="bloque"><h2 class="bloque__titulo">${t("Qué puedes explorar", "What you can explore")}</h2>${lista(r.explora)}</div>
      ${r.idealPara ? `<div class="bloque"><h2 class="bloque__titulo">${t("Ideal para", "Ideal for")}</h2><p class="prosa">${esc(r.idealPara)}</p></div>` : ""}
      <div class="bloque"><h2 class="bloque__titulo">${t("Qué incluye", "What’s included")}</h2>${lista(r.incluye)}</div>
      <div class="bloque"><h2 class="bloque__titulo">${t("Qué datos necesitamos", "What details we need")}</h2>${lista(r.datos)}</div>
      <div class="bloque"><h2 class="bloque__titulo">${t("Cómo se entrega", "How it’s delivered")}</h2><p class="prosa">${esc(r.entrega || entregaEnIdioma(L))}${AVISO ? ` ${AVISO}` : ""}</p></div>
      <div class="bloque"><h2 class="bloque__titulo">${disp ? t("Qué pasa después de comprar", "What happens after you buy") : t("Qué sigue", "What comes next")}</h2><ol class="pasos-entrega">${despues.map((p) => `<li>${esc(p)}</li>`).join("")}</ol></div>
      <p class="nota-reflexion">${t("Las lecturas de Astrea son herramientas de reflexión y autoconocimiento, no predicciones ni asesoría médica, psicológica, financiera o profesional.", "Astrea readings are tools for reflection and self-discovery, not predictions or medical, psychological, financial or professional advice.")}</p>
    </div>
  </div>
</section>`,
    });
  }

  const campo = (id, etiqueta, attrs = "", ayuda = "") =>
    `<div class="field"><label for="${id}">${etiqueta}</label><input id="${id}" name="${id}" maxlength="150" ${attrs}>${ayuda ? `<small>${ayuda}</small>` : ""}<span class="error-campo" id="e-${id}" aria-live="polite"></span></div>`;
  const horasOpciones = () => Array.from({ length: 24 }, (_, h) => `<option value="${h}">${String(h).padStart(2, "0")} h</option>`).join("");
  const minutosOpciones = () => Array.from({ length: 60 }, (_, m) => `<option value="${m}">${String(m).padStart(2, "0")} min</option>`).join("");
  const HORA = t("Hora", "Hour"), MINUTOS = t("Minutos", "Minutes");
  const EJ = t("Ej:", "E.g.:");

  /** Campos adicionales del paso 1 según el reporte (catalogo.js `extra`, mismo contrato que el backend). */
  function camposExtra(r) {
    const horas = horasOpciones();
    const minutos = minutosOpciones();
    if (r.extra === "revolucion_solar") {
      const anio = new Date().getFullYear();
      return `<fieldset class="field field--full grupo-extra">
              <legend class="grupo-extra__titulo">${t("Tu próximo cumpleaños", "Your next birthday")}</legend>
              <p class="grupo-extra__texto">${t("La revolución solar se calcula para el lugar donde pasas tu cumpleaños.", "The solar return is calculated for the place where you spend your birthday.")}</p>
              <div class="natal-form natal-form--anidado">
                ${campo("rs_ciudad", t("Ciudad donde pasarás tu cumpleaños", "City where you will spend your birthday"), `placeholder="${EJ} Lima" required`)}
                ${campo("rs_pais", t("País", "Country"), `placeholder="${EJ} ${t("Perú", "Peru")}" required`)}
                <div class="field field--full"><label for="rs_anio">${t("Ciclo que quieres leer", "Cycle you want to read")}</label><select id="rs_anio" name="rs_anio" required data-anios-revolucion><option value="">${t("Elige el año", "Choose the year")}</option>${[anio - 1, anio, anio + 1].map((a) => `<option value="${a}">${t(`Cumpleaños de ${a}`, `${a} birthday`)}</option>`).join("")}</select><span class="error-campo" id="e-rs_anio" aria-live="polite"></span></div>
              </div>
            </fieldset>`;
    }
    if (r.extra === "pack") {
      return `<fieldset class="field field--full grupo-extra">
              <legend class="grupo-extra__titulo">${t("Tus 2 lecturas temáticas", "Your 2 themed readings")}</legend>
              <p class="grupo-extra__texto">${t("Además de tu carta natal, elige las dos áreas que quieres leer a fondo.", "Besides your birth chart, choose the two areas you want to read in depth.")}</p>
              <div class="natal-form natal-form--anidado">
                ${PACK_TEMATICOS.map((x) => `<label class="check"><input type="checkbox" id="pack_${x}" name="pack_${x}"><span>${esc(porSlug(x).nombre)}</span></label>`).join("\n                ")}
                <span class="error-campo" id="e-pack" aria-live="polite" style="grid-column:1/-1"></span>
              </div>
            </fieldset>`;
    }
    if (r.extra === "segunda_persona") {
      return `<fieldset class="field field--full grupo-extra">
              <legend class="grupo-extra__titulo">${t("La otra persona", "The other person")}</legend>
              <div class="natal-form natal-form--anidado">
                <div class="field field--full"><label for="p2_nombre">${t("Nombre", "Name")}</label><input id="p2_nombre" name="p2_nombre" maxlength="150" required><span class="error-campo" id="e-p2_nombre" aria-live="polite"></span></div>
                <div class="field field--full"><label for="p2_fecha">${t("Fecha de nacimiento", "Date of birth")}</label><input id="p2_fecha" name="p2_fecha" type="date" min="1900-01-01" required><span class="error-campo" id="e-p2_fecha" aria-live="polite"></span></div>
                <fieldset class="field field--hora">
                  <legend class="leyenda-campo">${t("Hora de nacimiento (opcional)", "Time of birth (optional)")}</legend>
                  <div class="hora-selects">
                    <select id="p2_hora" name="p2_hora" aria-label="${t("Hora de la otra persona", "The other person’s hour")}"><option value="">${HORA}</option>${horas}</select>
                    <select id="p2_minuto" name="p2_minuto" aria-label="${t("Minutos de la otra persona", "The other person’s minutes")}"><option value="">${MINUTOS}</option>${minutos}</select>
                  </div>
                  <small>${t("Si no la sabes, déjala vacía: el análisis se adapta.", "If you don’t know it, leave it empty: the analysis adapts.")}</small>
                  <span class="error-campo" id="e-p2_hora" aria-live="polite"></span>
                </fieldset>
                ${campo("p2_ciudad", t("Ciudad de nacimiento", "City of birth"), `placeholder="${EJ} Quito" required`)}
                ${campo("p2_pais", t("País", "Country"), `placeholder="${EJ} Ecuador" required`)}
                <label class="check"><input type="checkbox" id="p2_consentimiento" name="p2_consentimiento" required><span>${t("Confirmo que esta persona aceptó compartir sus datos de nacimiento para este análisis.", "I confirm that this person agreed to share their birth details for this analysis.")}</span></label>
                <span class="error-campo" id="e-p2_consentimiento" aria-live="polite" style="grid-column:1/-1"></span>
              </div>
            </fieldset>`;
    }
    return "";
  }

  const ACEPTO_TERMINOS = t(
    `Entiendo que la lectura es una herramienta de autoconocimiento y acepto los <a href="/terminos" target="_blank" rel="noopener">términos y la garantía de 7 días</a> y la <a href="/privacidad" target="_blank" rel="noopener">política de privacidad</a>.`,
    `I understand that the reading is a self-discovery tool, written in Spanish, and I accept the <a href="/en/terminos" target="_blank" rel="noopener">terms and the 7-day guarantee</a> and the <a href="/en/privacidad" target="_blank" rel="noopener">privacy policy</a>.`);
  const OPCIONAL_CORREOS = `${t("Opcional", "Optional")}: ${esc(t(CONSENTIMIENTO, CONSENTIMIENTO_EN))}`;

  // Compra: solo para reportes con checkout real.
  for (const r of disponibles) {
    const horas = horasOpciones();
    const minutos = minutosOpciones();
    paginas[archivo(`comprar/${r.slug}.html`)] = layout({
      ruta: `/comprar/${r.slug}`,
      titulo: t(`Pedir ${r.nombre} · Astrea`, `Order ${r.nombre} · Astrea`),
      descripcion: t(`Registra tus datos de nacimiento para pedir tu ${r.nombre.toLowerCase()}.`, `Enter your birth details to order ${r.nombre}. ${AVISO}`),
      indexable: false,
      scripts: ["/tienda-assets/comprar.js"],
      cuerpo: `${cabecera({ eyebrow: t("Tu pedido", "Your order"), titulo: r.nombre, lede: t("Tres pasos: tus datos de nacimiento, tu correo y la revisión del pedido. Después pagas aquí mismo, con Hotmart.", "Three steps: your birth details, your email and the order review. Then you pay right here, with Hotmart."), migas: [INICIO, REPORTES_MIGA, [`/reportes/${r.slug}`, r.nombre], [`/comprar/${r.slug}`, t("Pedido", "Order")]] })}
<section class="sheet sheet--light sheet--lift seccion">
  <div class="shell compra">
    <div class="compra__panel">
      <noscript><p class="aviso aviso--info">${t(`Para registrar tu pedido necesitas activar JavaScript. También puedes <a href="${esc(CHECKOUTS[r.slug].url)}">pagar directamente en Hotmart</a> y completar tus datos después.`, `To register your order you need to enable JavaScript. You can also <a href="${esc(CHECKOUTS[r.slug].url)}">pay directly on Hotmart</a> and complete your details afterwards.`)}</p></noscript>
      <ol class="progreso" aria-label="${t("Pasos del pedido", "Order steps")}" data-progreso>
        <li data-paso-indicador="1" aria-current="step">${t("1. Tus datos", "1. Your details")}</li>
        <li data-paso-indicador="2">${t("2. Correo", "2. Email")}</li>
        <li data-paso-indicador="3">${t("3. Revisión", "3. Review")}</li>
      </ol>
      <form id="form-compra" novalidate data-reporte="${r.slug}"${r.extra ? ` data-extra="${r.extra}"` : ""}>
        <fieldset data-paso="1">
          <legend><h2>${t("Tus datos de nacimiento", "Your birth details")}</h2></legend>
          <div class="natal-form">
            <div class="field field--full"><label for="nombre">${t("Nombre para tu lectura", "Name for your reading")}</label><input id="nombre" name="nombre" autocomplete="name" maxlength="150" required><span class="error-campo" id="e-nombre" aria-live="polite"></span></div>
            <div class="field field--full"><label for="fecha">${t("Fecha de nacimiento", "Date of birth")}</label><input id="fecha" name="fecha" type="date" min="1900-01-01" required aria-describedby="e-fecha"><span class="error-campo" id="e-fecha" aria-live="polite"></span></div>
            <fieldset class="field field--hora">
              <legend class="leyenda-campo">${t("Hora de nacimiento", "Time of birth")}</legend>
              <div class="hora-selects">
                <select id="hora" name="hora" aria-label="${HORA}" required><option value="">${HORA}</option>${horas}</select>
                <select id="minuto" name="minuto" aria-label="${MINUTOS}" required><option value="">${MINUTOS}</option>${minutos}</select>
              </div>
              <small>${t("Formato de 24 horas. Si no la sabes con exactitud, usa la más aproximada que tengas.", "24-hour format. If you don’t know it exactly, use the closest time you have.")}</small>
              <span class="error-campo" id="e-hora" aria-live="polite"></span>
            </fieldset>
            <div class="field"><label for="ciudad">${t("Ciudad de nacimiento", "City of birth")}</label><input id="ciudad" name="ciudad" autocomplete="address-level2" maxlength="150" placeholder="${EJ} Guadalajara" required><span class="error-campo" id="e-ciudad" aria-live="polite"></span></div>
            <div class="field"><label for="pais">${t("País", "Country")}</label><input id="pais" name="pais" autocomplete="country-name" maxlength="150" placeholder="${EJ} ${t("México", "Mexico")}" required><span class="error-campo" id="e-pais" aria-live="polite"></span></div>
            ${camposExtra(r)}
            <div class="acciones-paso"><button class="btn btn--night" type="button" data-siguiente="2">${t("Continuar", "Continue")} ${icono("i-arrow")}</button></div>
          </div>
        </fieldset>
        <fieldset data-paso="2" hidden>
          <legend><h2>${t("Tu correo de entrega", "Your delivery email")}</h2></legend>
          <div class="natal-form">
            <div class="field field--full"><label for="email">${t("Correo electrónico", "Email")}</label><input id="email" name="email" type="email" autocomplete="email" inputmode="email" required><small>${t("Ahí te enviaremos tu lectura.", "That’s where we’ll send your reading.")}</small><span class="error-campo" id="e-email" aria-live="polite"></span></div>
            <div class="acciones-paso"><button class="btn btn--ghost" type="button" data-anterior="1">${t("Volver", "Back")}</button><button class="btn btn--night" type="button" data-siguiente="3">${t("Revisar pedido", "Review order")} ${icono("i-arrow")}</button></div>
          </div>
        </fieldset>
        <fieldset data-paso="3" hidden>
          <legend><h2>${t("Revisa tu pedido", "Review your order")}</h2></legend>
          <dl class="resumen" data-resumen></dl>
          <div class="natal-form">
            <label class="check"><input type="checkbox" id="acepto" name="acepto" required><span>${ACEPTO_TERMINOS}</span></label>
            <span class="error-campo" id="e-acepto" aria-live="polite" style="grid-column:1/-1"></span>
            <label class="check"><input type="checkbox" id="acepta_correos" name="acepta_correos"><span>${OPCIONAL_CORREOS}</span></label>
            <div class="aviso aviso--error" data-error-pedido role="alert" hidden style="grid-column:1/-1"></div>
            <div class="acciones-paso"><button class="btn btn--ghost" type="button" data-anterior="2">${t("Corregir datos", "Fix my details")}</button><button class="btn btn--gold" type="submit" data-enviar>${t("Crear pedido e ir al pago", "Create order and go to payment")} ${icono("i-lock")}</button></div>
            <p class="form-status" data-estado-envio aria-live="polite"></p>
          </div>
        </fieldset>
      </form>
    </div>
    <aside class="detalle__compra">
      ${portada(r)}
      <p class="eyebrow">${t("Tu pedido", "Your order")}</p>
      <p class="tarjeta-reporte__titulo">${esc(r.nombre)}</p>
      ${precioHtml(r)}
      ${lista(r.incluye.slice(0, 3))}
    </aside>
  </div>
</section>`,
    });
  }

  paginas[archivo("pedido.html")] = layout({
    ruta: "/pedido",
    titulo: t("Tu pedido · Astrea", "Your order · Astrea"),
    descripcion: t("Estado de tu pedido de Astrea.", "The status of your Astrea order."),
    indexable: false,
    scripts: ["/tienda-assets/pedido.js"],
    cuerpo: `${cabecera({ eyebrow: t("Tu pedido", "Your order"), titulo: t("Gracias por elegir Astrea", "Thank you for choosing Astrea"), lede: "" })}
<section class="sheet sheet--light sheet--lift seccion">
  <div class="shell prosa">
    <div class="estado-pedido" data-estado-pedido aria-live="polite">
      <p>${t("Buscando tu pedido…", "Looking for your order…")}</p>
    </div>
    <noscript><p class="aviso aviso--info">${t(`Activa JavaScript para ver tu pedido, o escríbenos por <a href="${WHATSAPP}">WhatsApp</a>.`, `Enable JavaScript to see your order, or write to us on <a href="${WHATSAPP}">WhatsApp</a>.`)}</p></noscript>
  </div>
</section>`,
  });

  const PASOS = L === "en" ? [
    ["i-pages", "Choose your reading", `The complete birth chart or a themed reading: love, vocation, money, patterns, solar return or compatibility. Check what it includes and which details you need. ${AVISO}`],
    ["i-wheel", "Enter your details", "Date, time and place of birth, and the email where you want to receive your reading. You review them before continuing."],
    ["i-lock", "Pay without leaving Astrea", "Hotmart’s secure payment opens right here, with your order already registered. You pay in your local currency; we never see or store card details."],
    ["i-check", "We confirm your payment", "We check the sale on Hotmart and confirm your order. Coming back from the payment page isn’t enough: the order is confirmed when we verify the sale."],
    ["i-eye", "We prepare and review", "We calculate your chart with Swiss Ephemeris, write the interpretation with the help of AI and review each reading one by one."],
    ["i-mail", "We send it to you", "You receive your reading by email between 24 and 48 hours after the payment is confirmed."],
  ] : [
    ["i-pages", "Elige tu reporte", "La carta natal completa o un reporte temático: amor, vocación, dinero, patrones, revolución solar o compatibilidad. Revisa qué incluye y qué datos necesitas."],
    ["i-wheel", "Registra tus datos", "Fecha, hora y lugar de nacimiento, y el correo donde quieres recibir tu lectura. Los revisas antes de continuar."],
    ["i-lock", "Paga sin salir de Astrea", "El pago seguro de Hotmart se abre aquí mismo, con tu pedido ya registrado. Pagas en tu moneda local; nosotros no vemos ni guardamos datos de tarjetas."],
    ["i-check", "Confirmamos tu pago", "Revisamos la venta en Hotmart y confirmamos tu pedido. Volver de la página de pago no basta: el pedido se confirma cuando verificamos la venta."],
    ["i-eye", "Preparamos y revisamos", "Calculamos tu carta con Swiss Ephemeris, redactamos la interpretación con apoyo de IA y la revisamos una por una."],
    ["i-mail", "Te la enviamos", "Recibes tu lectura por correo entre 24 y 48 horas después de confirmar el pago."],
  ];

  paginas[archivo("como-funciona.html")] = layout({
    ruta: "/como-funciona",
    titulo: t("Cómo funciona · Astrea", "How it works · Astrea"),
    descripcion: t("Del pedido a tu correo: cómo calculamos, revisamos y enviamos tu lectura astrológica, y cómo se confirma tu pago en Hotmart.", "From your order to your inbox: how we calculate, review and send your astrology reading, and how your payment on Hotmart is confirmed."),
    cuerpo: `${cabecera({ eyebrow: t("Del pedido a tu correo", "From your order to your inbox"), titulo: t("Cómo funciona", "How it works"), lede: t("Así llega tu lectura, paso a paso.", "This is how your reading reaches you, step by step."), migas: [INICIO, ["/como-funciona", t("Cómo funciona", "How it works")]] })}
<section class="sheet sheet--light sheet--lift seccion">
  <div class="shell prosa">
    <ol class="pasos-entrega">
      ${PASOS.map(([ic, tit, d]) => `<li><div><strong class="bloque__titulo" style="display:block;margin-bottom:4px">${esc(tit)}</strong>${esc(d)}</div></li>`).join("\n      ")}
    </ol>
    <p style="margin-top:var(--s-7)"><a class="btn btn--night" href="${R("/reportes")}">${t("Ver reportes", "See readings")} ${icono("i-arrow")}</a></p>
  </div>
</section>`,
  });

  paginas[archivo("sobre-astrea.html")] = layout({
    ruta: "/sobre-astrea",
    titulo: t("Sobre Astrea", "About Astrea"),
    descripcion: t("Astrea crea lecturas astrológicas para el autoconocimiento: astronomía real, interpretación cuidada y revisión humana.", "Astrea creates astrology readings for self-discovery: real astronomy, careful interpretation and human review."),
    cuerpo: `${cabecera({ eyebrow: "Astrea Charts", titulo: t("Sobre Astrea", "About Astrea"), lede: t("Astrología para una vida más consciente.", "Astrology for a more conscious life."), migas: [INICIO, ["/sobre-astrea", t("Sobre Astrea", "About Astrea")]] })}
<section class="sheet sheet--light sheet--lift seccion">
  <div class="shell prosa">
${L === "en" ? `    <p>Astrea was born from a simple idea: your birth chart is a unique map of the sky at the moment you were born, and reading it slowly can help you understand yourself, recognize your patterns and make decisions more aligned with you.</p>
    <h2>How we create each reading</h2>
    <p>We calculate the positions of the planets, the houses and the aspects with Swiss Ephemeris, from your date, time and place of birth. The interpretation is written with the help of AI assistants, and then we review each one before sending it. Our readings are written in Spanish.</p>
    <h2>What a reading is, and what it isn’t</h2>
    <p>Our readings are tools for reflection and self-discovery. They are not predictions and do not replace medical, psychological, financial or professional advice.</p>
    <h2>Contact</h2>
    <p>Write to us on <a class="link-quiet" href="${WHATSAPP}">WhatsApp</a> or follow us on <a class="link-quiet" href="https://www.tiktok.com/@astrea.charts">TikTok</a>.</p>` : `    <p>Astrea nace de una idea sencilla: tu carta natal es un mapa único del cielo en el momento en que naciste, y leerla con calma puede ayudarte a comprenderte, reconocer tus patrones y tomar decisiones más alineadas contigo.</p>
    <h2>Cómo hacemos cada lectura</h2>
    <p>Calculamos las posiciones de los planetas, las casas y los aspectos con Swiss Ephemeris, a partir de tu fecha, hora y lugar de nacimiento. La interpretación se redacta con apoyo de asistentes de IA y después la revisamos una por una antes de enviarla.</p>
    <h2>Lo que una lectura es, y lo que no</h2>
    <p>Nuestras lecturas son herramientas de reflexión y autoconocimiento. No son predicciones ni reemplazan asesoría médica, psicológica, financiera o profesional.</p>
    <h2>Contacto</h2>
    <p>Escríbenos por <a class="link-quiet" href="${WHATSAPP}">WhatsApp</a> o síguenos en <a class="link-quiet" href="https://www.tiktok.com/@astrea.charts">TikTok</a>.</p>`}
  </div>
</section>`,
  });

  // Términos en inglés: traducción fiel del español, PENDIENTE de revisión legal de la dueña.
  paginas[archivo("terminos.html")] = layout({
    ruta: "/terminos",
    titulo: t("Términos y reembolsos · Astrea", "Terms and refunds · Astrea"),
    descripcion: t("Qué compras, cómo se entrega, la garantía de 7 días y cómo pedir un reembolso de tu lectura Astrea.", "What you buy, how it’s delivered, the 7-day guarantee and how to ask for a refund of your Astrea reading."),
    cuerpo: `${cabecera({ eyebrow: "Astrea Charts", titulo: t("Términos y reembolsos", "Terms and refunds"), lede: t("Lo que necesitas saber antes de comprar, en palabras simples.", "What you need to know before you buy, in plain words."), migas: [INICIO, ["/terminos", t("Términos y reembolsos", "Terms and refunds")]] })}
<section class="sheet sheet--light sheet--lift seccion">
  <div class="shell prosa">
${L === "en" ? `    <!-- PENDIENTE: traducción fiel de /terminos; la dueña debe revisarla (revisión legal) antes de darla por definitiva. -->
    <p><em>Last updated: ${TERMINOS_VIGENTES_DESDE.en}.</em></p>
    <p><em>This is a translation of our terms in Spanish. If the two versions differ, the Spanish version prevails.</em></p>
    <h2>Who sells</h2>
    <p>Astrea Charts is a project of Guías Astrológicas (Colombia). Payments are processed by <a class="link-quiet" href="https://hotmart.com" rel="noopener">Hotmart</a>, which acts as the payment platform. For any question, write to us on <a class="link-quiet" href="${WHATSAPP}">WhatsApp</a>.</p>
    <h2>What you buy</h2>
    <p>A personalized astrology reading in PDF, prepared from the birth details you give us. We calculate the positions with Swiss Ephemeris, the interpretation is written with the help of AI assistants and we review it before sending it. The reading is written in Spanish.</p>
    <p>Readings are tools for reflection and self-discovery. They are not predictions and do not replace medical, psychological, legal, financial or professional advice.</p>
    <h2>Price and payment</h2>
    <ul>
      <li>The price you see in the shop is a reference in US dollars. Hotmart charges the final amount in your local currency and may add your country’s taxes.</li>
      <li>Astrea never sees or stores your card details.</li>
      <li>We confirm each payment by verifying the sale on Hotmart.</li>
    </ul>
    <h2>Delivery</h2>
    <ul>
      <li>We send the reading as a PDF to the email you gave us, between 24 and 48 hours after we confirm your payment.</li>
      <li>If you don’t see it, check your spam or promotions folder and write to us with your order reference.</li>
    </ul>
    <h2>Your birth details</h2>
    <ul>
      <li>The reading depends on the date, time and place you give us. Check them before paying.</li>
      <li>If you notice a mistake before delivery, let us know and we’ll fix it at no cost.</li>
      <li>If the reading has a calculation error on our side, we’ll redo it at no cost, even after the 7-day guarantee.</li>
      <li>If you buy for someone else, or buy the couple compatibility, you confirm that the person agreed to share their details.</li>
    </ul>
    <h2 id="reembolsos">7-day guarantee and refunds</h2>
    <ul>
      <li>You have 7 calendar days from purchase to ask for a full refund, even if you have already received your reading. You don’t need to explain why.</li>
      <li>You can request it from Hotmart’s purchase email (the refund request option) or by writing to us on <a class="link-quiet" href="${WHATSAPP}">WhatsApp</a> with your order reference.</li>
      <li>Hotmart returns the money through the same payment method. How long it takes to show depends on your bank or card.</li>
      <li>After the 7 days there are no refunds, except for a calculation error on our side that we can’t fix.</li>
    </ul>
    <h2>Use of the reading</h2>
    <p>The reading is for your personal use or for the person you give it to. You can save it, print it and share it with whoever you like, but not resell it or publish it as your own.</p>
    <h2>Privacy</h2>
    <p>We use your details only to prepare and send your reading. The details are in the <a class="link-quiet" href="/en/privacidad">privacy policy</a>.</p>
    <h2>Changes</h2>
    <p>If we change these terms, we publish the new version here with its date. Your purchase is governed by the terms in force on the day you made it.</p>` : `    <p><em>Última actualización: ${TERMINOS_VIGENTES_DESDE.es}.</em></p>
    <h2>Quién vende</h2>
    <p>Astrea Charts es un proyecto de Guías Astrológicas (Colombia). Los pagos los procesa <a class="link-quiet" href="https://hotmart.com" rel="noopener">Hotmart</a>, que actúa como plataforma de pago. Para cualquier duda, escríbenos por <a class="link-quiet" href="${WHATSAPP}">WhatsApp</a>.</p>
    <h2>Qué compras</h2>
    <p>Una lectura astrológica personalizada en PDF, preparada a partir de los datos de nacimiento que nos das. Calculamos las posiciones con Swiss Ephemeris, la interpretación se redacta con apoyo de asistentes de IA y la revisamos antes de enviarla.</p>
    <p>Las lecturas son herramientas de reflexión y autoconocimiento. No son predicciones ni reemplazan asesoría médica, psicológica, legal, financiera o profesional.</p>
    <h2>Precio y pago</h2>
    <ul>
      <li>El precio que ves en la tienda es una referencia en dólares. Hotmart cobra el monto final en tu moneda local y puede sumar impuestos de tu país.</li>
      <li>Astrea no ve ni guarda los datos de tu tarjeta.</li>
      <li>Confirmamos cada pago verificando la venta en Hotmart.</li>
    </ul>
    <h2>Entrega</h2>
    <ul>
      <li>Enviamos la lectura en PDF al correo que nos diste, entre 24 y 48 horas después de confirmar tu pago.</li>
      <li>Si no la ves, revisa la carpeta de spam o promociones y escríbenos con la referencia de tu pedido.</li>
    </ul>
    <h2>Tus datos de nacimiento</h2>
    <ul>
      <li>La lectura depende de la fecha, la hora y el lugar que nos das. Revísalos antes de pagar.</li>
      <li>Si notas un error antes de la entrega, avísanos y lo corregimos sin costo.</li>
      <li>Si la lectura tiene un error de cálculo nuestro, la rehacemos sin costo, aunque hayan pasado los 7 días de garantía.</li>
      <li>Si compras para otra persona, o la compatibilidad de pareja, confirmas que esa persona aceptó compartir sus datos.</li>
    </ul>
    <h2 id="reembolsos">Garantía de 7 días y reembolsos</h2>
    <ul>
      <li>Tienes 7 días corridos desde la compra para pedir el reembolso total, aunque ya hayas recibido tu lectura. No necesitas explicar el motivo.</li>
      <li>Puedes pedirlo desde el correo de compra de Hotmart (opción «Solicitar reembolso») o escribiéndonos por <a class="link-quiet" href="${WHATSAPP}">WhatsApp</a> con la referencia de tu pedido.</li>
      <li>Hotmart devuelve el dinero por el mismo medio de pago. El tiempo que tarda en verse depende de tu banco o tarjeta.</li>
      <li>Pasados los 7 días no hay reembolsos, salvo un error de cálculo nuestro que no podamos corregir.</li>
    </ul>
    <h2>Uso de la lectura</h2>
    <p>La lectura es para tu uso personal o el de la persona a quien se la regalas. Puedes guardarla, imprimirla y compartirla con quien quieras, pero no revenderla ni publicarla como propia.</p>
    <h2>Privacidad</h2>
    <p>Usamos tus datos solo para preparar y enviar tu lectura. Los detalles están en la <a class="link-quiet" href="/privacidad">política de privacidad</a>.</p>
    <h2>Cambios</h2>
    <p>Si cambiamos estos términos, publicamos la nueva versión aquí con su fecha. Tu compra se rige por los términos vigentes el día en que la hiciste.</p>`}
  </div>
</section>`,
  });

  paginas[archivo("baja.html")] = layout({
    ruta: "/baja",
    titulo: t("Darte de baja · Astrea", "Unsubscribe · Astrea"),
    descripcion: t("Deja de recibir los correos de Astrea.", "Stop receiving emails from Astrea."),
    indexable: false,
    scripts: ["/tienda-assets/baja.js"],
    cuerpo: `${cabecera({ eyebrow: t("Lista de correos", "Mailing list"), titulo: t("Darte de baja", "Unsubscribe"), lede: t("Confirma y dejarás de recibir nuestros correos.", "Confirm and you’ll stop receiving our emails."), migas: [INICIO, ["/baja", t("Darte de baja", "Unsubscribe")]] })}
<section class="sheet sheet--light sheet--lift seccion">
  <div class="shell prosa" data-baja>
    <p>${t("Si te das de baja, no te enviaremos más correos con contenido astrológico, novedades ni ofertas. Tus lecturas compradas no cambian.", "If you unsubscribe, we won’t send you any more emails with astrology content, news or offers. The readings you bought don’t change.")}</p>
    <p><button class="btn btn--gold" type="button">${t("Darme de baja", "Unsubscribe me")}</button></p>
    <p class="form-status" data-estado-baja aria-live="polite"></p>
  </div>
</section>`,
  });

  // ---------------------------------------------------------------- tarjetas de regalo (astrea-API /regalos)
  const REGALABLES = disponibles;
  const camposNatales = (horas, minutos) => `
            <div class="field field--full"><label for="nombre">${t("Nombre para la lectura", "Name for the reading")}</label><input id="nombre" name="nombre" autocomplete="name" maxlength="150"><span class="error-campo" id="e-nombre" aria-live="polite"></span></div>
            <div class="field field--full"><label for="fecha">${t("Fecha de nacimiento", "Date of birth")}</label><input id="fecha" name="fecha" type="date" min="1900-01-01"><span class="error-campo" id="e-fecha" aria-live="polite"></span></div>
            <fieldset class="field field--hora">
              <legend class="leyenda-campo">${t("Hora de nacimiento", "Time of birth")}</legend>
              <div class="hora-selects">
                <select id="hora" name="hora" aria-label="${HORA}"><option value="">${HORA}</option>${horas}</select>
                <select id="minuto" name="minuto" aria-label="${MINUTOS}"><option value="">${MINUTOS}</option>${minutos}</select>
              </div>
              <small>${t("Formato de 24 horas. Si no la sabes con exactitud, usa la más aproximada que tengas.", "24-hour format. If you don’t know it exactly, use the closest time you have.")}</small>
              <span class="error-campo" id="e-hora" aria-live="polite"></span>
            </fieldset>
            <div class="field"><label for="ciudad">${t("Ciudad de nacimiento", "City of birth")}</label><input id="ciudad" name="ciudad" autocomplete="address-level2" maxlength="150" placeholder="${EJ} Guadalajara"><span class="error-campo" id="e-ciudad" aria-live="polite"></span></div>
            <div class="field"><label for="pais">${t("País", "Country")}</label><input id="pais" name="pais" autocomplete="country-name" maxlength="150" placeholder="${EJ} ${t("México", "Mexico")}"><span class="error-campo" id="e-pais" aria-live="polite"></span></div>`;
  {
    const horas = horasOpciones();
    const minutos = minutosOpciones();

    paginas[archivo("regalar.html")] = layout({
      ruta: "/regalar",
      titulo: t("Regala una lectura · Astrea", "Give a reading · Astrea"),
      descripcion: t("Regala una lectura de Astrea con una tarjeta de regalo: quien la recibe la canjea con sus propios datos de nacimiento.", "Give an Astrea reading with a gift card: the person who receives it redeems it with their own birth details."),
      scripts: ["/tienda-assets/regalar.js"],
      cuerpo: `${cabecera({ eyebrow: t("Tarjeta de regalo", "Gift card"), titulo: t("Regala una lectura", "Give a reading"), lede: t("No necesitas saber su hora de nacimiento: le das una tarjeta con un código y la persona la canjea con sus propios datos.", "You don’t need to know their time of birth: you give them a card with a code and they redeem it with their own details."), migas: [INICIO, ["/regalar", t("Regalar", "Gift a reading")]] })}
<section class="sheet sheet--light sheet--lift seccion">
  <div class="shell compra">
    <div class="compra__panel">
      <ol class="pasos-entrega">
        <li>${t("Eliges la lectura, escribes para quién es y una dedicatoria, y pagas con Hotmart sin salir de Astrea.", "You choose the reading, write who it’s for and a dedication, and pay with Hotmart without leaving Astrea.")}</li>
        <li>${t("Te enviamos la tarjeta de regalo en PDF, con su código, para imprimirla o reenviarla.", "We send you the gift card as a PDF, with its code, to print or forward.")}</li>
        <li>${t("La persona entra a astrea-charts.site/canjear, escribe el código y sus datos, y recibe su lectura en 24 a 48 horas.", "The person goes to astrea-charts.site/en/canjear, enters the code and their details, and receives their reading in 24 to 48 hours. The reading is written in Spanish.")}</li>
      </ol>
      <form id="form-regalo" novalidate>
        <div class="natal-form">
          <div class="field field--full"><label for="producto">${t("Lectura que regalas", "The reading you’re giving")}</label><select id="producto" name="producto"><option value="">${t("Elige una lectura", "Choose a reading")}</option>${REGALABLES.map((r) => `<option value="${r.slug}">${esc(r.nombre)} · ${esc(CHECKOUTS[r.slug].precioReferencia)}</option>`).join("")}</select><span class="error-campo" id="e-producto" aria-live="polite"></span></div>
          <div class="field field--full"><label for="para_nombre">${t("¿Para quién es?", "Who is it for?")}</label><input id="para_nombre" name="para_nombre" maxlength="80" placeholder="${t("Así aparecerá en la tarjeta", "This is how it will appear on the card")}"><span class="error-campo" id="e-para_nombre" aria-live="polite"></span></div>
          <div class="field field--full"><label for="dedicatoria">${t("Dedicatoria (opcional)", "Dedication (optional)")}</label><textarea id="dedicatoria" name="dedicatoria" maxlength="${300}" rows="3" placeholder="${t("Para que te conozcas tan bien como yo te conozco.", "So you can know yourself as well as I know you.")}"></textarea><small data-contador-dedicatoria></small><span class="error-campo" id="e-dedicatoria" aria-live="polite"></span></div>
          <div class="field"><label for="comprador_nombre">${t("Tu nombre", "Your name")}</label><input id="comprador_nombre" name="comprador_nombre" autocomplete="name" maxlength="150"><span class="error-campo" id="e-comprador_nombre" aria-live="polite"></span></div>
          <div class="field"><label for="comprador_email">${t("Tu correo", "Your email")}</label><input id="comprador_email" name="comprador_email" type="email" autocomplete="email" maxlength="150"><small>${t("Ahí te llega la tarjeta.", "That’s where the card arrives.")}</small><span class="error-campo" id="e-comprador_email" aria-live="polite"></span></div>
          <label class="check"><input type="checkbox" id="acepto" name="acepto"><span>${t(`Acepto los <a href="/terminos" target="_blank" rel="noopener">términos y la garantía de 7 días</a> y la <a href="/privacidad" target="_blank" rel="noopener">política de privacidad</a>. La tarjeta vale 12 meses.`, `I accept the <a href="/en/terminos" target="_blank" rel="noopener">terms and the 7-day guarantee</a> and the <a href="/en/privacidad" target="_blank" rel="noopener">privacy policy</a>. The card is valid for 12 months, and the reading is written in Spanish.`)}</span></label>
          <span class="error-campo" id="e-acepto" aria-live="polite" style="grid-column:1/-1"></span>
          <label class="check"><input type="checkbox" id="acepta_correos" name="acepta_correos"><span>${OPCIONAL_CORREOS}</span></label>
          <div class="aviso aviso--error" data-error-pedido role="alert" hidden style="grid-column:1/-1"></div>
          <div class="acciones-paso"><button class="btn btn--gold" type="submit" data-enviar>${t("Ir al pago", "Go to payment")} ${icono("i-lock")}</button></div>
        </div>
      </form>
      <p class="detalle__aviso">${t(`¿Te regalaron una lectura? <a class="link-quiet" href="/canjear">Canjea tu tarjeta</a>.`, `Were you given a reading? <a class="link-quiet" href="/en/canjear">Redeem your card</a>.`)}</p>
    </div>
  </div>
</section>`,
    });

    paginas[archivo("canjear.html")] = layout({
      ruta: "/canjear",
      titulo: t("Canjea tu tarjeta de regalo · Astrea", "Redeem your gift card · Astrea"),
      descripcion: t("Canjea tu tarjeta de regalo de Astrea: escribe tu código y tus datos de nacimiento.", "Redeem your Astrea gift card: enter your code and your birth details."),
      indexable: false,
      scripts: ["/tienda-assets/canjear.js"],
      cuerpo: `${cabecera({ eyebrow: t("Tarjeta de regalo", "Gift card"), titulo: t("Canjea tu regalo", "Redeem your gift"), lede: t("Escribe el código de tu tarjeta y tus datos de nacimiento. Tu lectura te llega en PDF a tu correo.", `Enter the code on your card and your birth details. Your reading reaches your inbox as a PDF. ${AVISO}`), migas: [INICIO, ["/canjear", t("Canjear", "Redeem")]] })}
<section class="sheet sheet--light sheet--lift seccion">
  <div class="shell compra">
    <div class="compra__panel">
      <form id="form-codigo" novalidate>
        <div class="natal-form">
          <div class="field field--full"><label for="codigo">${t("Código de tu tarjeta", "Your card code")}</label><input id="codigo" name="codigo" autocomplete="off" autocapitalize="characters" maxlength="20" placeholder="ASTR-XXXX-XXXX"></div>
          <div class="acciones-paso"><button class="btn btn--night" type="submit">${t("Ver mi regalo", "See my gift")} ${icono("i-arrow")}</button></div>
          <p class="form-status" data-estado-codigo aria-live="polite"></p>
        </div>
      </form>
      <div class="aviso aviso--info" data-regalo hidden>
        <strong>${t("Te regalaron", "You’ve been given")}: <span data-regalo-lectura></span></strong><br>
        ${t("Para", "For")} <span data-regalo-para></span> · ${t("válida hasta el", "valid until")} <span data-regalo-vence></span>
      </div>
      <form id="form-canje" novalidate hidden>
        <fieldset>
          <legend><h2>${t("Tus datos de nacimiento", "Your birth details")}</h2></legend>
          <div class="natal-form">
            ${camposNatales(horas, minutos)}
            <div data-extra-de="pack" hidden style="grid-column:1/-1">${camposExtra({ extra: "pack" })}</div>
            <div data-extra-de="revolucion_solar" hidden style="grid-column:1/-1">${camposExtra({ extra: "revolucion_solar" })}</div>
            <div data-extra-de="segunda_persona" hidden style="grid-column:1/-1">${camposExtra({ extra: "segunda_persona" })}</div>
            <div class="field field--full"><label for="email">${t("Correo electrónico", "Email")}</label><input id="email" name="email" type="email" autocomplete="email" inputmode="email"><small>${t("Ahí te enviaremos tu lectura.", "That’s where we’ll send your reading.")}</small><span class="error-campo" id="e-email" aria-live="polite"></span></div>
            <label class="check"><input type="checkbox" id="acepto" name="acepto"><span>${t(`Entiendo que la lectura es una herramienta de autoconocimiento y acepto los <a href="/terminos" target="_blank" rel="noopener">términos</a> y la <a href="/privacidad" target="_blank" rel="noopener">política de privacidad</a>.`, `I understand that the reading is a self-discovery tool, written in Spanish, and I accept the <a href="/en/terminos" target="_blank" rel="noopener">terms</a> and the <a href="/en/privacidad" target="_blank" rel="noopener">privacy policy</a>.`)}</span></label>
            <span class="error-campo" id="e-acepto" aria-live="polite" style="grid-column:1/-1"></span>
            <div class="aviso aviso--error" data-error-pedido role="alert" hidden style="grid-column:1/-1"></div>
            <div class="acciones-paso"><button class="btn btn--gold" type="submit" data-enviar>${t("Canjear mi regalo", "Redeem my gift")} ${icono("i-arrow")}</button></div>
          </div>
        </fieldset>
      </form>
      <div class="aviso aviso--info" data-exito hidden>
        <strong>${t("¡Listo! Tu regalo quedó canjeado.", "Done! Your gift has been redeemed.")}</strong><br>
        ${t("Preparamos tu lectura «<span data-exito-lectura></span>» y te la enviamos a <span data-exito-email></span> en 24 a 48 horas.", "We’re preparing your reading “<span data-exito-lectura></span>” and will send it to <span data-exito-email></span> within 24 to 48 hours.")}
      </div>
    </div>
  </div>
</section>`,
    });
  }

  const FAQ = L === "en" ? [
    ["What is a birth chart?", "It’s a map of the sky calculated for the exact date, time and place of your birth. It shows where the Sun, the Moon and the planets were, and how they relate to each other and to the areas of your life."],
    ["Which readings can I buy?", "The complete birth chart and six themed readings: love and relationships, vocation and purpose, money and abundance, patterns and transformation, solar return and couple compatibility. They all reach your inbox as PDFs between 24 and 48 hours after we confirm your payment."],
    ["What language are the readings written in?", "In Spanish. The shop, your order and the payment are in English, but every reading, the birth chart and the themed ones, is written in Spanish."],
    ["What do I need for the solar return?", "Your birth details, the city where you will spend your birthday and the year of the cycle you want to read: your year’s chart is calculated for that place."],
    ["What do I need for couple compatibility?", "Your birth details and the other person’s. If you don’t know their time of birth, you can leave it empty. We ask you to confirm that the person agreed to share their details."],
    ["How do I pay?", "First you enter your birth details and your email. Then Hotmart’s secure payment opens right here, in your local currency, without leaving Astrea. Astrea never sees or stores card details."],
    ["I already paid, why does my order show as pending?", "We confirm each payment by verifying the sale on Hotmart. Coming back from the payment page isn’t enough to confirm it. Once we confirm it, we prepare your reading; you don’t need to send your details again."],
    ["How long does it take to arrive?", "Between 24 and 48 hours after we confirm your payment, straight to your inbox."],
    ["How accurate is the reading?", "The positions are calculated with real astronomy (Swiss Ephemeris), not generic tables. The interpretation is written with the help of AI assistants, and then we review each reading one by one before sending it. It’s a tool for self-discovery, not a prediction."],
    ["Do I need to know my time of birth?", "It’s ideal, because your Ascendant and houses depend on it. If you don’t know it exactly, use the closest time you have: most sections are still useful."],
    ["Do I need to create an account to buy my reading?", "No. You buy your reading once and it’s yours: you only need your birth details and the email where you want to receive it."],
    ["In what format will I receive my reading?", "As a PDF, by email, with an editorial design made to be read slowly on your phone, on your computer or printed."],
    ["Can I ask for a refund?", "Yes. You have 7 days from purchase to ask for a full refund, even if you have already received your reading. Request it from Hotmart’s purchase email or on WhatsApp with your order reference. The details are in Terms and refunds."],
    ["Can I order a reading for someone else?", "Yes. Use that person’s birth details and the email where you want to receive the reading."],
  ] : [
    ["¿Qué es una carta natal?", "Es un mapa del cielo calculado para la fecha, hora y lugar exactos de tu nacimiento. Muestra dónde estaban el Sol, la Luna y los planetas, y cómo se relacionan entre sí y con las áreas de tu vida."],
    ["¿Qué reportes puedo comprar?", "La carta natal completa y seis reportes temáticos: amor y vínculos, vocación y propósito, dinero y abundancia, patrones y transformación, revolución solar y compatibilidad de pareja. Todos llegan en PDF a tu correo entre 24 y 48 horas después de confirmar tu pago."],
    ["¿Qué necesito para la revolución solar?", "Tus datos de nacimiento, la ciudad donde pasarás tu cumpleaños y el año del ciclo que quieres leer: la carta de tu año se calcula para ese lugar."],
    ["¿Qué necesito para la compatibilidad de pareja?", "Tus datos de nacimiento y los de la otra persona. Si no sabes su hora de nacimiento, puedes dejarla vacía. Te pedimos confirmar que esa persona aceptó compartir sus datos."],
    ["¿Cómo pago?", "Primero registras tus datos de nacimiento y tu correo. Después se abre aquí mismo el pago seguro de Hotmart, en tu moneda local, sin salir de Astrea. Astrea no ve ni guarda datos de tarjetas."],
    ["Ya pagué, ¿por qué mi pedido aparece como pendiente?", "Confirmamos cada pago verificando la venta en Hotmart. Volver de la página de pago no basta para confirmarlo. Cuando lo confirmamos, preparamos tu lectura; no necesitas volver a enviar tus datos."],
    ["¿Cuánto tiempo tarda en llegar?", "Entre 24 y 48 horas después de confirmar tu pago, directo a tu correo."],
    ["¿Qué tan precisa es la lectura?", "Las posiciones se calculan con astronomía real (Swiss Ephemeris), no con tablas genéricas. La interpretación se redacta con apoyo de asistentes de IA y después la revisamos una por una antes de enviarla. Es una herramienta de autoconocimiento, no una predicción."],
    ["¿Necesito saber mi hora de nacimiento?", "Es lo ideal, porque de ella dependen el Ascendente y las casas. Si no la sabes con exactitud, usa la más aproximada que tengas: la mayoría de las secciones siguen siendo útiles."],
    ["¿Necesito crear una cuenta para comprar mi lectura?", "No. Tu lectura se compra una sola vez y es tuya: solo necesitas tus datos de nacimiento y el correo donde quieres recibirla."],
    ["¿En qué formato recibiré mi informe?", "En PDF, por correo electrónico, con un diseño editorial pensado para leerse con calma en el celular, en la computadora o impreso."],
    ["¿Puedo pedir un reembolso?", "Sí. Tienes 7 días desde la compra para pedir el reembolso total, aunque ya hayas recibido tu lectura. Lo pides desde el correo de compra de Hotmart o por WhatsApp con la referencia de tu pedido. Los detalles están en Términos y reembolsos."],
    ["¿Puedo pedir una lectura para otra persona?", "Sí. Usa los datos de nacimiento de esa persona y el correo donde quieres recibir la lectura."],
  ];

  paginas[archivo("preguntas-frecuentes.html")] = layout({
    ruta: "/preguntas-frecuentes",
    titulo: t("Preguntas frecuentes · Astrea", "Frequently asked questions · Astrea"),
    descripcion: t("Pagos, entregas, datos de nacimiento, y precisión de las lecturas: respuestas a las preguntas más frecuentes.", "Payments, delivery, birth details, the language and the accuracy of the readings: answers to the most common questions."),
    jsonLd: { "@context": "https://schema.org", "@type": "FAQPage", ...(L === "en" ? { inLanguage: "en" } : {}), mainEntity: FAQ.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) },
    cuerpo: `${cabecera({ eyebrow: t("¿Tienes dudas?", "Questions?"), titulo: t("Preguntas frecuentes", "Frequently asked questions"), migas: [INICIO, ["/preguntas-frecuentes", t("Preguntas frecuentes", "FAQ")]] })}
<section class="sheet sheet--light sheet--lift seccion">
  <div class="shell prosa">
    <div class="accordion">
      ${FAQ.map(([q, a]) => `<details><summary>${esc(q)}${icono("i-plus")}</summary><p>${esc(a)}</p></details>`).join("\n      ")}
    </div>
    <p style="margin-top:var(--s-7)">${t(`¿No encuentras tu respuesta? <a class="link-quiet" href="${WHATSAPP}">Escríbenos por WhatsApp</a>.`, `Can’t find your answer? <a class="link-quiet" href="${WHATSAPP}">Write to us on WhatsApp</a>.`)}</p>
  </div>
</section>`,
  });

  // Privacidad en inglés: traducción fiel (tienda-assets/contenido-privacidad-en.html), PENDIENTE de revisión legal.
  paginas[archivo("privacidad.html")] = layout({
    ruta: "/privacidad", titulo: t("Política de privacidad · Astrea", "Privacy policy · Astrea"), descripcion: t("Cómo tratamos tus datos y cómo ejercer tus derechos en Astrea.", "How we handle your data and how to exercise your rights at Astrea."),
    cuerpo: `${cabecera({ eyebrow: t("Tus datos, con cuidado", "Your data, with care"), titulo: t("Política de privacidad", "Privacy policy"), migas: [INICIO, ["/privacidad", t("Privacidad", "Privacy")]] })}
<section class="sheet sheet--light seccion"><div class="shell prosa documento-legal">${readFileSync(join(RAIZ, t("tienda-assets/contenido-privacidad.html", "tienda-assets/contenido-privacidad-en.html")), "utf8")}</div></section>`,
  });

  if (L === "es") {
    paginas["ejemplo.html"] = layout({
      ruta: "/ejemplo", titulo: "Así se ve una lectura de Astrea", descripcion: "Una muestra del estilo editorial de nuestras lecturas de carta natal.",
      cuerpo: `${cabecera({ eyebrow: "Antes de elegir tu lectura", titulo: "Así se lee tu cielo", lede: "Una muestra del diseño y del tono de nuestras lecturas: imágenes cuidadas, espacio para reflexionar y un lenguaje cercano.", migas: [["/", "Inicio"], ["/ejemplo", "Muestra de lectura"]] })}
<section class="sheet sheet--light seccion"><div class="shell muestra-editorial">
  <img class="muestra-editorial__arte" src="/universo-assets/img/observatorio/astrea-grabado-hero-v2-640.webp" alt="Grabado de Astrea junto a una esfera armilar" width="640" height="800">
  <article class="muestra-editorial__hoja">
    <p class="eyebrow">Fragmento ilustrativo · Tu mundo emocional</p>
    <h2>Lo que te hace sentir en casa</h2>
    <p>Tu Luna habla de lo que necesitas para sentirte en casa, de cómo sientes y de lo que te da calma.</p>
    <p>Una lectura de tu carta es una oportunidad para detenerte en esas preguntas: qué cuidas, qué necesitas y qué lugar quieres dar a tu mundo emocional.</p>
    <p class="nota-reflexion">Este fragmento muestra el tono editorial. Tu informe se prepara a partir de tus propios datos de nacimiento.</p>
    <a class="btn btn--gold" href="/reportes/carta-natal">Conocer la carta natal completa ${icono("i-arrow")}</a>
  </article>
</div></section>`,
    });
  }

  return paginas;
}

// ---------------------------------------------------------------- páginas de los dos idiomas

const paginas = { ...construir("es"), ...construir("en") };

paginas["tienda-assets/astrea-emblema.svg"] = emblemaAstrea().replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" style="color:#8B6F47" ');

// Sitemap con las dos versiones de cada página, enlazadas entre sí (hreflang).
const indexables = ["/", "/reportes", ...REPORTES.map((r) => `/reportes/${r.slug}`), "/como-funciona", "/sobre-astrea", "/preguntas-frecuentes", "/terminos", "/privacidad", "/ejemplo", "/regalar", "/universo"];
const urlSitemap = (u, loc) => SOLO_ESPANOL.has(u)
  ? `  <url><loc>${SITIO}${loc}</loc></url>`
  : `  <url><loc>${SITIO}${loc}</loc>${["es", "en"].map((i) => `<xhtml:link rel="alternate" hreflang="${i}" href="${SITIO}${rutaEnIdioma(u, i)}"/>`).join("")}<xhtml:link rel="alternate" hreflang="x-default" href="${SITIO}${u}"/></url>`;
paginas["sitemap.xml"] = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${indexables.map((u) => urlSitemap(u, u)).join("\n")}
${indexables.filter((u) => !SOLO_ESPANOL.has(u)).map((u) => urlSitemap(u, rutaEnIdioma(u, "en"))).join("\n")}
</urlset>
`;
paginas["robots.txt"] = `User-agent: *
Disallow: /admin
Disallow: /r/
Disallow: /comprar/
Disallow: /pedido
Disallow: /en/comprar/
Disallow: /en/pedido
Sitemap: ${SITIO}/sitemap.xml
Sitemap: ${SITIO}/blog/sitemap.xml
`;

// ---------------------------------------------------------------- escritura / verificación

export const PAGINAS = paginas;

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const check = process.argv.includes("--check");
  const desactualizadas = [];
  for (const [ruta, contenido] of Object.entries(paginas)) {
    const destino = join(RAIZ, ruta);
    if (check) {
      let actual = null;
      try { actual = readFileSync(destino, "utf8"); } catch { /* falta */ }
      if (actual !== contenido) desactualizadas.push(ruta);
    } else {
      mkdirSync(dirname(destino), { recursive: true });
      writeFileSync(destino, contenido);
    }
  }
  if (check && desactualizadas.length) {
    console.error(`Páginas desactualizadas (corre node scripts/generar-tienda.mjs): ${desactualizadas.join(", ")}`);
    process.exit(1);
  }
  console.log(check ? "Páginas de la tienda al día." : `Generadas ${Object.keys(paginas).length} páginas.`);
}
