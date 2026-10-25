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
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CONSENTIMIENTO } from "../tienda-assets/lista.js";
import { REPORTES, ENTREGA, PACK_TEMATICOS, estadoDe, reportePorSlug } from "../tienda-assets/catalogo.js";
import { CHECKOUTS, WHATSAPP } from "../tienda-assets/config.js";
import { conIconosAstrea } from "../tienda-assets/iconos-astrea.mjs";

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

const TERMINOS_VIGENTES_DESDE = "18 de octubre de 2026";

const SPRITE_PORTADA = conIconosAstrea(SPRITE);

// Almanaque semanal (blog): los 12 signos y la rueda vacía que se ve hasta que llega la semana publicada.
// La rueda real la dibuja astrea-API (/blog/horoscopo-semanal/portada.json) con la misma geometría.
const SIGNOS_ALMANAQUE = [
  ["aries", "Aries"], ["tauro", "Tauro"], ["geminis", "Géminis"], ["cancer", "Cáncer"], ["leo", "Leo"], ["virgo", "Virgo"],
  ["libra", "Libra"], ["escorpio", "Escorpio"], ["sagitario", "Sagitario"], ["capricornio", "Capricornio"],
  ["acuario", "Acuario"], ["piscis", "Piscis"],
].map(([slug, nombre], i) => ({ slug, nombre, glifo: String.fromCodePoint(0x2648 + i) + "\uFE0E" }));

function ruedaVacia() {
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
  return `<svg class="rueda" viewBox="-6 -6 412 412" role="img" aria-label="La rueda del zodíaco">
  <circle class="rueda__fondo" cx="200" cy="200" r="196"/><circle class="rueda__aro" cx="200" cy="200" r="196"/>
  <circle class="rueda__aro rueda__aro--fino" cx="200" cy="200" r="191"/><circle class="rueda__aro" cx="200" cy="200" r="166"/>
  <circle class="rueda__aro rueda__aro--fino" cx="200" cy="200" r="112"/>${divisiones}${marcas}${signos}
  <path class="rueda__estrella" d="M200 192 L202 198 L208 200 L202 202 L200 208 L198 202 L192 200 L198 198 Z"/>
</svg>`;
}

const NAV = [
  ["/", "Inicio"],
  ["/reportes", "Reportes"],
  ["/blog/horoscopo-semanal", "Horóscopo semanal"],
  ["/como-funciona", "Cómo funciona"],
  ["/sobre-astrea", "Sobre Astrea"],
  ["/regalar", "Regalar"],
  ["/preguntas-frecuentes", "Preguntas frecuentes"],
];

const disponibles = REPORTES.filter((r) => estadoDe(r, CHECKOUTS) === "disponible");
const proximos = REPORTES.filter((r) => estadoDe(r, CHECKOUTS) !== "disponible");
const principales = disponibles.filter((r) => r.principal);
const tematicos = disponibles.filter((r) => !r.principal);

const MARCA = `<span class="marca__texto">ASTREA<small>CHARTS</small></span>`;

function layout({ ruta, titulo, descripcion, cuerpo, scripts = [], jsonLd = null, indexable = true, imagen = "/universo-assets/img/hero-escultura.webp", portada = false, preload = "" }) {
  const actual = (href) => (href === ruta || (href !== "/" && ruta.startsWith(href + "/")) ? ' aria-current="page"' : "");
  const enlaces = NAV.map(([href, texto]) => `<a href="${href}"${actual(href)}>${texto}</a>`).join("\n      ");
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>${esc(titulo)}</title>
<meta name="description" content="${esc(descripcion)}">
${indexable ? `<link rel="canonical" href="${SITIO}${ruta === "/" ? "/" : ruta}">` : '<meta name="robots" content="noindex">'}
<meta property="og:type" content="website">
<meta property="og:site_name" content="Astrea">
<meta property="og:title" content="${esc(titulo)}">
<meta property="og:description" content="${esc(descripcion)}">
<meta property="og:url" content="${SITIO}${ruta}">
<meta property="og:image" content="${SITIO}${imagen}">
<meta property="og:locale" content="es_LA">
<meta name="theme-color" content="${portada ? '#F7F3EA' : '#0B1220'}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&family=Noto+Sans+Symbols&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/universo-assets/universo.css">
<link rel="stylesheet" href="/tienda-assets/tienda.css">${portada ? '\n<link rel="stylesheet" href="/tienda-assets/observatorio.css">\n<link rel="stylesheet" href="/tienda-assets/almanaque.css">' : ''}
${preload}
${jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>\n` : ""}</head>
<body${portada ? ' class="portada-observatorio"' : ''}>
<!-- Generado por scripts/generar-tienda.mjs a partir de tienda-assets/catalogo.js. No editar a mano. -->

${portada ? SPRITE_PORTADA : SPRITE}

<a class="skip-link" href="#contenido">Saltar al contenido</a>

<header class="site-header site-header--tienda">
  <div class="site-header__inner">
    <a class="wordmark" href="/" aria-label="Astrea, inicio">ASTREA</a>
    <nav class="site-nav" aria-label="Principal">
      ${enlaces}
    </nav>
    <div class="header-acciones">
      <a class="btn btn--gold btn--sm" href="/reportes">Ver reportes</a>
      <details class="menu-movil">
        <summary aria-label="Abrir menú">${icono("i-menu")}</summary>
        <nav class="menu-movil__panel" aria-label="Menú">
          ${enlaces}
        </nav>
      </details>
    </div>
  </div>
</header>

<main id="contenido">
${cuerpo}
</main>

<footer class="pie">
  <div class="shell pie__grid">
    <div class="pie__marca">
      <a class="marca" href="/" aria-label="Astrea Charts, inicio">${MARCA}</a>
      <p>Astrología para conocerte, reflexionar y transformarte.</p>
    </div>
    <nav class="pie__columna" aria-label="Explora">
      <h2 class="pie__titulo">Explora</h2>
      <a href="/reportes">Reportes</a>
      <a href="/blog/horoscopo-semanal">Horóscopo semanal</a>
      <a href="/como-funciona">Cómo funciona</a>
      <a href="/sobre-astrea">Sobre Astrea</a>
      <a href="/preguntas-frecuentes">Preguntas frecuentes</a>
    </nav>
    <div class="pie__columna">
      <h2 class="pie__titulo">Contacto</h2>
      <a href="https://www.tiktok.com/@astrea.charts">TikTok · @astrea.charts</a>
      <a href="${WHATSAPP}">WhatsApp</a>
    </div>
  </div>
  <div class="shell pie__legal">
    <p>Astrea Charts es una herramienta de autoconocimiento. No reemplaza asesoría médica, psicológica ni financiera.</p>
    <p><a href="/terminos">Términos y reembolsos</a> · <a href="/privacidad">Política de privacidad</a> · © ${new Date().getFullYear()} Astrea Charts</p>
  </div>
</footer>
${["/tienda-assets/origen.js", ...scripts].map((s) => `<script type="module" src="${s}"></script>`).join("\n")}
</body>
</html>
`;
}

function cabecera({ eyebrow, titulo, lede, migas = [] }) {
  const m = migas.length
    ? `<nav class="migas" aria-label="Ruta">${migas.map(([href, t], i) => (i < migas.length - 1 ? `<a href="${href}">${esc(t)}</a><span aria-hidden="true">/</span>` : `<span aria-current="page">${esc(t)}</span>`)).join("")}</nav>`
    : "";
  return `<section class="pagina-cabecera">
  <div class="shell">
    ${m}
    <p class="eyebrow eyebrow--light">${esc(eyebrow)}</p>
    <h1 class="h-display">${esc(titulo)}</h1>
    ${lede ? `<p class="lede lede--light">${esc(lede)}</p>` : ""}
  </div>
</section>`;
}

function portada(r, { prioridad = false } = {}) {
  if (r.portada) {
    return `<div class="portada portada--libro"><img src="${r.portada}-480.webp" srcset="${r.portada}-480.webp 480w, ${r.portada}-960.webp 960w" sizes="(min-width: 860px) 360px, 80vw" alt="Portada del reporte ${esc(r.nombre)} de Astrea" width="480" height="720" ${prioridad ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async"></div>`;
  }
  return `<div class="portada portada--atenuada" role="img" aria-label="Emblema de ${esc(r.nombre)}"><div class="portada__emblema">${icono(r.icono)}<span class="portada__titulo">${esc(r.nombre)}</span></div></div>`;
}

function insignia(r, oscura = false) {
  const disp = estadoDe(r, CHECKOUTS) === "disponible";
  return `<span class="insignia insignia--${disp ? "disponible" : "proximamente"}${oscura ? " insignia--oscura" : ""}">${disp ? "Disponible" : "Próximamente"}</span>`;
}

function precioHtml(r) {
  const c = CHECKOUTS[r.slug];
  return c ? `<p class="precio">${esc(c.precioReferencia)}<small>Pagas en tu moneda local con Hotmart</small></p>` : `<p class="precio"><small>Aún no a la venta</small></p>`;
}

function tarjeta(r) {
  const disp = estadoDe(r, CHECKOUTS) === "disponible";
  return `<article class="tarjeta-reporte" aria-labelledby="t-${r.slug}">
  <a href="/reportes/${r.slug}" tabindex="-1" aria-hidden="true">${portada(r)}</a>
  <div class="tarjeta-reporte__cuerpo">
    ${insignia(r)}
    <h3 class="tarjeta-reporte__titulo" id="t-${r.slug}"><a href="/reportes/${r.slug}">${esc(r.nombre)}</a></h3>
    <p class="tarjeta-reporte__texto">${esc(r.resumen)}</p>
    <div class="tarjeta-reporte__pie">
      ${precioHtml(r)}
      <a class="btn ${disp ? "btn--night" : "btn--ghost"} btn--sm" href="/reportes/${r.slug}">${disp ? "Conocer y comprar" : "Conocer"}</a>
    </div>
  </div>
</article>`;
}

const lista = (items, clase = "checklist") => `<ul class="${clase}">${items.map((i) => `<li>${icono("i-check")}${esc(i)}</li>`).join("")}</ul>`;

// ---------------------------------------------------------------- páginas

const paginas = {};

// ---------------------------------------------------------------- portada (inicio)

// Testimonios reales y autorizados: { texto, nombre, detalle? }. Vacío = la sección no se muestra.
const TESTIMONIOS = [];

const FAQ_PORTADA = [
  ["¿Qué información necesito para hacer mi reporte?", "Tu fecha, hora y lugar de nacimiento, y el correo donde quieres recibirlo. Para la revolución solar, también la ciudad donde pasarás tu cumpleaños; para la compatibilidad de pareja, los datos de la otra persona (su hora de nacimiento es opcional) y su consentimiento."],
  ["¿Cuánto tiempo tarda en llegar?", "Entre 24 y 48 horas después de que confirmamos tu pago en Hotmart."],
  ["¿En qué formato recibiré mi informe?", "En PDF, por correo electrónico, con un diseño editorial pensado para leerse con calma en el celular, en la computadora o impreso."],
  ["¿Los reportes son personalizados?", "Sí. Cada reporte parte de tu carta, calculada con Swiss Ephemeris para tu fecha, hora y lugar exactos de nacimiento. La interpretación se redacta con apoyo de IA y la revisamos antes de enviarla."],
  ["¿Puedo pedir un reembolso?", "Sí. Tienes 7 días desde la compra para pedir el reembolso total, aunque ya hayas recibido tu lectura. Lo pides desde el correo de compra de Hotmart o por WhatsApp con la referencia de tu pedido. Los detalles están en Términos y reembolsos."],
];


const RECORRIDO = [
  ["i-astrolabio", "Descubre tu carta", "Genera gratis tu carta natal: tu Sol, tu Luna y tu Ascendente, con la rueda de tu cielo. Es la base de todo lo demás.", "/universo#generador", "Generar mi carta gratis"],
  ["i-libro", "Profundiza con una lectura", "La carta natal completa o un reporte temático, en PDF y escrito para ti. La compras una vez y es tuya.", "/reportes", "Ver reportes"],
];

const tarjetaPortada = (r) => `<article class="tarjeta-portada" aria-labelledby="tp-${r.slug}">
  <a class="tarjeta-portada__imagen" href="/reportes/${r.slug}" tabindex="-1" aria-hidden="true">
    <img src="${r.portada}-480.webp" srcset="${r.portada}-480.webp 480w, ${r.portada}-960.webp 960w" sizes="(min-width: 1100px) 260px, (min-width: 600px) 45vw, 88vw" alt="" width="480" height="720" loading="lazy" decoding="async">
  </a>
  <div class="tarjeta-portada__cuerpo">
    <p class="tarjeta-portada__categoria">${esc(r.categoria)}</p>
    <h3 class="tarjeta-portada__titulo" id="tp-${r.slug}"><a href="/reportes/${r.slug}">${esc(r.nombre)}</a></h3>
    <p class="tarjeta-portada__texto">${esc(r.tarjeta)}</p>
    <div class="tarjeta-portada__pie">
      <span class="tarjeta-portada__precio">${esc(CHECKOUTS[r.slug].precioReferencia)}</span>
      <a class="btn btn--night btn--sm" href="/comprar/${r.slug}" aria-label="Comprar ${esc(r.nombre)}">Comprar ${icono("i-arrow")}</a>
    </div>
  </div>
</article>`;

paginas["index.html"] = layout({
  ruta: "/",
  portada: true,
  scripts: ["/tienda-assets/cielo-semana.js"],
  imagen: "/universo-assets/img/observatorio/astrea-grabado-hero-v2-1122.webp",
  preload: '<link rel="preload" as="image" href="/universo-assets/img/observatorio/astrea-grabado-hero-v2-960.webp" imagesrcset="/universo-assets/img/observatorio/astrea-grabado-hero-v2-640.webp 640w, /universo-assets/img/observatorio/astrea-grabado-hero-v2-960.webp 960w, /universo-assets/img/observatorio/astrea-grabado-hero-v2-1122.webp 1122w" imagesizes="(min-width: 860px) 440px, (min-width: 520px) 360px, 88vw">',
  titulo: "Astrea · Tu cielo. Tu forma de ser.",
  descripcion: "Un espacio para conocerte a través de tu carta natal. Astronomía precisa, astrología cercana y lecturas para volver a ti. Descubre tu carta gratis.",
  cuerpo: `<section class="hero hero--tienda hero--editorial" aria-labelledby="hero-titulo">
  <div class="hero__grid shell">
    <div class="hero__copy">
      <p class="eyebrow">Astrología para conocerte</p>
      <h1 class="h-display" id="hero-titulo">Tu cielo.<br><em>Tu forma de ser.</em></h1>
      <p class="lede">Un espacio para conocerte a través de tu carta natal. Astronomía precisa, astrología cercana y lecturas para volver a ti.</p>
      <div class="hero__actions">
        <a class="btn btn--gold" href="/universo#generador">Descubrir mi carta gratis ${icono("i-arrow")}</a>
        <a class="link-quiet" href="/reportes">Explorar lecturas <span aria-hidden="true">↗</span></a>
      </div>
    </div>
    <figure class="hero__figure">
      <img src="/universo-assets/img/observatorio/astrea-grabado-hero-v2-960.webp" srcset="/universo-assets/img/observatorio/astrea-grabado-hero-v2-640.webp 640w, /universo-assets/img/observatorio/astrea-grabado-hero-v2-960.webp 960w, /universo-assets/img/observatorio/astrea-grabado-hero-v2-1122.webp 1122w" sizes="(min-width: 860px) 440px, (min-width: 520px) 360px, 88vw" alt="Grabado de Astrea con un astrolabio, una esfera armilar sobre una columna griega y un mapa de estrellas" width="1122" height="1402" fetchpriority="high">
    </figure>
  </div>
</section>

<section class="confianza" aria-label="Por qué confiar en Astrea">
  <ul class="shell confianza__lista">
    <li>${icono("i-armilar", "icon confianza__icono")}<div><strong>Astronomía real</strong><span>Cálculos con Swiss Ephemeris y datos astronómicos precisos.</span></div></li>
    <li>${icono("i-pluma", "icon confianza__icono")}<div><strong>Revisión humana</strong><span>Interpretaciones asistidas por IA y revisadas por una astróloga.</span></div></li>
    <li>${icono("i-pergamino", "icon confianza__icono")}<div><strong>Directo a tu correo</strong><span>Recibe tu informe en 24–48 horas después de la confirmación del pago.</span></div></li>
    <li>${icono("i-espejo", "icon confianza__icono")}<div><strong>Autoconocimiento</strong><span>Herramientas para comprenderte y tomar decisiones más alineadas.</span></div></li>
  </ul>
</section>

<section class="cielo-semana" id="cielo-semana" aria-labelledby="cielo-semana-titulo" data-cielo-semana>
  <div class="shell cielo-semana__grid">
    <div class="cielo-semana__texto">
      <p class="alm-eyebrow" data-cs="eyebrow">Horóscopo semanal · cada lunes</p>
      <h2 class="alm-h2" id="cielo-semana-titulo">Tu semana,<br>a la luz del cielo</h2>
      <p class="alm-rango" data-cs="rango"></p>
      <p class="cielo-semana__titulo" data-cs="titulo"></p>
      <p class="alm-lede" data-cs="resumen">Una pausa para mirar hacia arriba y volver a ti. Cada lunes, los movimientos del cielo y una lectura para acompañar tu semana.</p>
      <a class="btn btn--gold" href="/blog/horoscopo-semanal" data-cs="url">Leer mi horóscopo <span aria-hidden="true">↗</span></a>
    </div>
    <figure class="cielo-semana__rueda">
      <p class="cielo-semana__mapa">El cielo, en movimiento</p>
      <div class="cielo-semana__escena">
        <span class="cielo-semana__orbita" aria-hidden="true"></span>
        <span class="cielo-semana__orbita cielo-semana__orbita--inclinada" aria-hidden="true"></span>
        <div data-cs="rueda">${ruedaVacia()}</div>
      </div>
      <figcaption>Un cielo compartido. Doce formas de vivirlo.</figcaption>
    </figure>
  </div>
  <div class="shell cielo-semana__signos">
    <div class="cielo-semana__cabecera-signos"><h3 class="cielo-semana__elige">Un cielo, doce miradas</h3><p>Empieza por tu signo solar. Explora también tu Ascendente.</p></div>
    <ul class="zodiaco zodiaco--ilustrado">
        ${SIGNOS_ALMANAQUE.map((s) => `<li><a href="/blog/horoscopo-semanal/${s.slug}" data-signo="${s.slug}"><span class="alm-medallon" aria-hidden="true"><img src="/universo-assets/img/almanaque/${s.slug}-320.webp" width="80" height="80" alt="" loading="lazy" decoding="async"></span>${s.nombre}</a></li>`).join("\n        ")}
    </ul>
  </div>
</section>

<section class="capitulo capitulo--marmol" id="recorrido" aria-labelledby="recorrido-titulo">
  <div class="shell">
    <header class="capitulo__cabecera">
      <div>
        <p class="eyebrow">Tu recorrido con Astrea</p>
        <h2 class="capitulo__titulo" id="recorrido-titulo">Una experiencia que crece contigo.</h2>
      </div>
      <p class="capitulo__intro">Tu carta natal es el punto de partida. A partir de ella, cada lectura se escribe para ti, y puedes volver en distintos momentos para explorar nuevos temas de tu vida.</p>
    </header>
    <ol class="pasos pasos--dos">
      ${RECORRIDO.map(([ic, t, d, href, accion], i) => `<li class="paso"><span class="paso__numero">${["I", "II"][i]}</span>${icono(ic, "icon paso__icono")}<h3 class="paso__titulo">${esc(t)}</h3><p>${esc(d)}</p><a class="link-quiet paso__enlace" href="${href}">${esc(accion)}</a></li>`).join("\n      ")}
    </ol>
  </div>
</section>

<section class="capitulo capitulo--claro" id="reportes" aria-labelledby="reportes-titulo">
  <div class="shell">
    <header class="capitulo__cabecera">
      <div>
        <p class="eyebrow">Nuestros reportes</p>
        <h2 class="capitulo__titulo" id="reportes-titulo">Tu historia tiene muchas capas.</h2>
      </div>
      <p class="capitulo__intro">Lecturas en PDF, escritas a partir de tu carta natal y revisadas antes de llegar a ti.</p>
    </header>
    <div class="catalogo-portada">
      ${disponibles.map(tarjetaPortada).join("\n      ")}
    </div>
  </div>
</section>

<section class="capitulo capitulo--marmol" id="como-funciona" aria-labelledby="pasos-titulo">
  <div class="shell">
    <header class="capitulo__cabecera capitulo__cabecera--centro">
      <p class="eyebrow">Cómo funciona</p>
      <h2 class="capitulo__titulo" id="pasos-titulo">Tres pasos para recibir tu reporte</h2>
    </header>
    <ol class="pasos">
      <li class="paso"><span class="paso__numero">01</span>${icono("i-nacimiento", "icon paso__icono")}<h3 class="paso__titulo">Comparte tus datos de nacimiento</h3><p>Completa tu fecha, hora y lugar de nacimiento, y los datos de tu pareja si aplica.</p></li>
      <li class="paso"><span class="paso__numero">02</span>${icono("i-astrolabio", "icon paso__icono")}<h3 class="paso__titulo">Calculamos tu carta</h3><p>Usamos Swiss Ephemeris y una interpretación asistida por IA, revisada por una astróloga.</p></li>
      <li class="paso"><span class="paso__numero">03</span>${icono("i-pergamino", "icon paso__icono")}<h3 class="paso__titulo">Recibes tu informe personalizado</h3><p>Te lo enviamos a tu correo en 24–48 horas, contadas desde la confirmación del pago.</p></li>
    </ol>
  </div>
</section>

${TESTIMONIOS.length ? `
<section class="capitulo capitulo--claro" aria-labelledby="testimonios-titulo">
  <div class="shell">
    <header class="capitulo__cabecera capitulo__cabecera--centro">
      <p class="eyebrow">Lo que dicen</p>
      <h2 class="capitulo__titulo" id="testimonios-titulo">Historias reales</h2>
    </header>
    <div class="testimonios">
      ${TESTIMONIOS.map((t) => `<figure class="testimonio"><blockquote>${esc(t.texto)}</blockquote><figcaption>${esc(t.nombre)}${t.detalle ? ` · ${esc(t.detalle)}` : ""}</figcaption></figure>`).join("\n      ")}
    </div>
  </div>
</section>` : ""}
<section class="capitulo capitulo--claro" id="preguntas" aria-labelledby="faq-titulo">
  <div class="shell faq-portada">
    <header class="capitulo__cabecera capitulo__cabecera--apilada">
      <p class="eyebrow">Preguntas frecuentes</p>
      <h2 class="capitulo__titulo" id="faq-titulo">Antes de empezar</h2>
      <p class="capitulo__intro">¿Otra duda? <a class="link-quiet" href="/preguntas-frecuentes">Todas las preguntas</a> o <a class="link-quiet" href="${WHATSAPP}">escríbenos por WhatsApp</a>.</p>
    </header>
    <div class="accordion">
      ${FAQ_PORTADA.map(([q, a]) => `<details><summary>${esc(q)}${icono("i-plus")}</summary><p>${esc(a)}</p></details>`).join("\n      ")}
    </div>
  </div>
</section>`,
  jsonLd: { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: FAQ_PORTADA.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) },
});

paginas["reportes.html"] = layout({
  ruta: "/reportes",
  titulo: "Reportes astrológicos · Astrea",
  descripcion: "Carta natal completa, revolución solar, compatibilidad de pareja y reportes de amor, vocación, dinero y patrones. Precios y qué incluye cada uno.",
  cuerpo: `${cabecera({ eyebrow: "Catálogo", titulo: "Reportes de Astrea", lede: "Cada reporte mira tu carta desde una pregunta distinta. Todos llegan en PDF a tu correo.", migas: [["/", "Inicio"], ["/reportes", "Reportes"]] })}
<section class="sheet sheet--light sheet--lift seccion">
  <div class="shell">
    ${principales.length ? `<div class="grupo-catalogo">
      <h2 class="grupo-catalogo__titulo">La lectura de base</h2>
      <p class="grupo-catalogo__texto">Tu carta natal completa: el mapa entero, para empezar a conocerte. Sola o en pack con dos lecturas temáticas.</p>
      <div class="catalogo">${principales.map(tarjeta).join("\n")}</div>
    </div>` : ""}
    ${tematicos.length ? `<div class="grupo-catalogo">
      <h2 class="grupo-catalogo__titulo">Reportes temáticos</h2>
      <p class="grupo-catalogo__texto">Una lectura enfocada en un área de tu vida, un ciclo o un vínculo.</p>
      <div class="catalogo">${tematicos.map(tarjeta).join("\n")}</div>
    </div>` : ""}
    ${proximos.length ? `<div class="grupo-catalogo">
      <h2 class="grupo-catalogo__titulo">En preparación</h2>
      <p class="grupo-catalogo__texto">Todavía no se pueden comprar. Si te interesa alguno, <a class="link-quiet" href="${WHATSAPP}">escríbenos</a> y te avisamos.</p>
      <div class="catalogo">${proximos.map(tarjeta).join("\n")}</div>
    </div>` : ""}
  </div>
</section>`,
});


for (const r of REPORTES) {
  const disp = estadoDe(r, CHECKOUTS) === "disponible";
  const compra = disp
    ? `<a class="btn btn--gold btn--block" href="/comprar/${r.slug}">Pedir mi ${esc(r.nombre.toLowerCase())} ${icono("i-arrow")}</a>
      <p class="detalle__aviso">${icono("i-lock")} Primero registras tus datos; después pagas en Hotmart, en tu moneda local. No guardamos datos de tarjetas.</p>`
    : `<p class="detalle__aviso">Aún no se puede comprar.</p>
      <a class="btn btn--ghost btn--block" href="${WHATSAPP}?text=${encodeURIComponent(`Hola, quiero saber cuándo estará el reporte de ${r.nombre}`)}">Avísame cuando esté</a>
      <a class="link-quiet" href="/reportes/carta-natal">Mientras tanto, conoce la carta natal completa</a>`;
  const despues = disp
    ? [r.extra === "segunda_persona" ? "Completas tus datos, los de la otra persona y tu correo." : r.extra === "revolucion_solar" ? "Completas tus datos de nacimiento, dónde pasarás tu cumpleaños y tu correo." : r.extra === "pack" ? "Completas tus datos de nacimiento, eliges tus 2 lecturas temáticas y dejas tu correo." : "Completas tus datos de nacimiento y tu correo.", "Pagas en Hotmart con tu pedido ya registrado.", "Confirmamos tu pago y preparamos tu lectura.", "La revisamos y te la enviamos por correo en 24–48 h."]
    : ["Cuando esté disponible, lo anunciaremos en esta página.", "Podrás pedirlo con tus datos de nacimiento.", "Lo recibirás por correo, revisado como todas nuestras lecturas."];
  const jsonLd = {
    "@context": "https://schema.org", "@type": "Product", name: `${r.nombre} · Astrea`, description: r.resumen,
    brand: { "@type": "Brand", name: "Astrea" },
    ...(disp ? { offers: { "@type": "Offer", price: CHECKOUTS[r.slug].precioReferencia.replace(/[^\d.]/g, ""), priceCurrency: "USD", availability: "https://schema.org/InStock", url: `${SITIO}/reportes/${r.slug}` } } : {}),
  };
  paginas[`reportes/${r.slug}.html`] = layout({
    ruta: `/reportes/${r.slug}`,
    titulo: `${r.nombre} · Reportes Astrea`,
    descripcion: `${r.resumen}${disp ? "" : " Próximamente."}`,
    jsonLd: { ...jsonLd, image: `${SITIO}${r.portada}-960.webp` },
    imagen: `${r.portada}-960.webp`,
    cuerpo: `${cabecera({ eyebrow: r.eyebrow, titulo: r.nombre, lede: r.resumen, migas: [["/", "Inicio"], ["/reportes", "Reportes"], [`/reportes/${r.slug}`, r.nombre]] })}
<section class="sheet sheet--light sheet--lift seccion">
  <div class="shell detalle">
    <aside class="detalle__lateral">
      <div class="detalle__portada">${portada(r, { prioridad: true })}</div>
      <div class="detalle__compra" aria-label="Compra">
        ${insignia(r)}
        ${precioHtml(r)}
        ${compra}
      </div>
    </aside>
    <div class="bloques">
      <div class="prosa"><p>${esc(r.descripcion)}</p>${r.nota ? `<p class="nota-reflexion">${esc(r.nota)}</p>` : ""}</div>
      <div class="bloque"><h2 class="bloque__titulo">Qué puedes explorar</h2>${lista(r.explora)}</div>
      ${r.idealPara ? `<div class="bloque"><h2 class="bloque__titulo">Ideal para</h2><p class="prosa">${esc(r.idealPara)}</p></div>` : ""}
      <div class="bloque"><h2 class="bloque__titulo">Qué incluye</h2>${lista(r.incluye)}</div>
      <div class="bloque"><h2 class="bloque__titulo">Qué datos necesitamos</h2>${lista(r.datos)}</div>
      <div class="bloque"><h2 class="bloque__titulo">Cómo se entrega</h2><p class="prosa">${esc(r.entrega || ENTREGA)}</p></div>
      <div class="bloque"><h2 class="bloque__titulo">${disp ? "Qué pasa después de comprar" : "Qué sigue"}</h2><ol class="pasos-entrega">${despues.map((p) => `<li>${esc(p)}</li>`).join("")}</ol></div>
      <p class="nota-reflexion">Las lecturas de Astrea son herramientas de reflexión y autoconocimiento, no predicciones ni asesoría médica, psicológica, financiera o profesional.</p>
    </div>
  </div>
</section>`,
  });
}

const campo = (id, etiqueta, attrs = "", ayuda = "") =>
  `<div class="field"><label for="${id}">${etiqueta}</label><input id="${id}" name="${id}" maxlength="150" ${attrs}>${ayuda ? `<small>${ayuda}</small>` : ""}<span class="error-campo" id="e-${id}" aria-live="polite"></span></div>`;

/** Campos adicionales del paso 1 según el reporte (catalogo.js `extra`, mismo contrato que el backend). */
function camposExtra(r) {
  const horas = Array.from({ length: 24 }, (_, h) => `<option value="${h}">${String(h).padStart(2, "0")} h</option>`).join("");
  const minutos = Array.from({ length: 60 }, (_, m) => `<option value="${m}">${String(m).padStart(2, "0")} min</option>`).join("");
  if (r.extra === "revolucion_solar") {
    const anio = new Date().getFullYear();
    return `<fieldset class="field field--full grupo-extra">
              <legend class="grupo-extra__titulo">Tu próximo cumpleaños</legend>
              <p class="grupo-extra__texto">La revolución solar se calcula para el lugar donde pasas tu cumpleaños.</p>
              <div class="natal-form natal-form--anidado">
                ${campo("rs_ciudad", "Ciudad donde pasarás tu cumpleaños", 'placeholder="Ej: Lima" required')}
                ${campo("rs_pais", "País", 'placeholder="Ej: Perú" required')}
                <div class="field field--full"><label for="rs_anio">Ciclo que quieres leer</label><select id="rs_anio" name="rs_anio" required data-anios-revolucion><option value="">Elige el año</option>${[anio - 1, anio, anio + 1].map((a) => `<option value="${a}">Cumpleaños de ${a}</option>`).join("")}</select><span class="error-campo" id="e-rs_anio" aria-live="polite"></span></div>
              </div>
            </fieldset>`;
  }
  if (r.extra === "pack") {
    return `<fieldset class="field field--full grupo-extra">
              <legend class="grupo-extra__titulo">Tus 2 lecturas temáticas</legend>
              <p class="grupo-extra__texto">Además de tu carta natal, elige las dos áreas que quieres leer a fondo.</p>
              <div class="natal-form natal-form--anidado">
                ${PACK_TEMATICOS.map((t) => `<label class="check"><input type="checkbox" id="pack_${t}" name="pack_${t}"><span>${esc(reportePorSlug(t).nombre)}</span></label>`).join("\n                ")}
                <span class="error-campo" id="e-pack" aria-live="polite" style="grid-column:1/-1"></span>
              </div>
            </fieldset>`;
  }
  if (r.extra === "segunda_persona") {
    return `<fieldset class="field field--full grupo-extra">
              <legend class="grupo-extra__titulo">La otra persona</legend>
              <div class="natal-form natal-form--anidado">
                <div class="field field--full"><label for="p2_nombre">Nombre</label><input id="p2_nombre" name="p2_nombre" maxlength="150" required><span class="error-campo" id="e-p2_nombre" aria-live="polite"></span></div>
                <div class="field field--full"><label for="p2_fecha">Fecha de nacimiento</label><input id="p2_fecha" name="p2_fecha" type="date" min="1900-01-01" required><span class="error-campo" id="e-p2_fecha" aria-live="polite"></span></div>
                <fieldset class="field field--hora">
                  <legend class="leyenda-campo">Hora de nacimiento (opcional)</legend>
                  <div class="hora-selects">
                    <select id="p2_hora" name="p2_hora" aria-label="Hora de la otra persona"><option value="">Hora</option>${horas}</select>
                    <select id="p2_minuto" name="p2_minuto" aria-label="Minutos de la otra persona"><option value="">Minutos</option>${minutos}</select>
                  </div>
                  <small>Si no la sabes, déjala vacía: el análisis se adapta.</small>
                  <span class="error-campo" id="e-p2_hora" aria-live="polite"></span>
                </fieldset>
                ${campo("p2_ciudad", "Ciudad de nacimiento", 'placeholder="Ej: Quito" required')}
                ${campo("p2_pais", "País", 'placeholder="Ej: Ecuador" required')}
                <label class="check"><input type="checkbox" id="p2_consentimiento" name="p2_consentimiento" required><span>Confirmo que esta persona aceptó compartir sus datos de nacimiento para este análisis.</span></label>
                <span class="error-campo" id="e-p2_consentimiento" aria-live="polite" style="grid-column:1/-1"></span>
              </div>
            </fieldset>`;
  }
  return "";
}

// Compra: solo para reportes con checkout real.
for (const r of disponibles) {
  const horas = Array.from({ length: 24 }, (_, h) => `<option value="${h}">${String(h).padStart(2, "0")} h</option>`).join("");
  const minutos = Array.from({ length: 60 }, (_, m) => `<option value="${m}">${String(m).padStart(2, "0")} min</option>`).join("");
  paginas[`comprar/${r.slug}.html`] = layout({
    ruta: `/comprar/${r.slug}`,
    titulo: `Pedir ${r.nombre} · Astrea`,
    descripcion: `Registra tus datos de nacimiento para pedir tu ${r.nombre.toLowerCase()}.`,
    indexable: false,
    scripts: ["/tienda-assets/comprar.js"],
    cuerpo: `${cabecera({ eyebrow: "Tu pedido", titulo: r.nombre, lede: "Tres pasos: tus datos de nacimiento, tu correo y la revisión del pedido. Después pagas en Hotmart.", migas: [["/", "Inicio"], ["/reportes", "Reportes"], [`/reportes/${r.slug}`, r.nombre], [`/comprar/${r.slug}`, "Pedido"]] })}
<section class="sheet sheet--light sheet--lift seccion">
  <div class="shell compra">
    <div class="compra__panel">
      <noscript><p class="aviso aviso--info">Para registrar tu pedido necesitas activar JavaScript. También puedes <a href="${esc(CHECKOUTS[r.slug].url)}">pagar directamente en Hotmart</a> y completar tus datos después.</p></noscript>
      <ol class="progreso" aria-label="Pasos del pedido" data-progreso>
        <li data-paso-indicador="1" aria-current="step">1. Tus datos</li>
        <li data-paso-indicador="2">2. Correo</li>
        <li data-paso-indicador="3">3. Revisión</li>
      </ol>
      <form id="form-compra" novalidate data-reporte="${r.slug}"${r.extra ? ` data-extra="${r.extra}"` : ""}>
        <fieldset data-paso="1">
          <legend><h2>Tus datos de nacimiento</h2></legend>
          <div class="natal-form">
            <div class="field field--full"><label for="nombre">Nombre para tu lectura</label><input id="nombre" name="nombre" autocomplete="name" maxlength="150" required><span class="error-campo" id="e-nombre" aria-live="polite"></span></div>
            <div class="field field--full"><label for="fecha">Fecha de nacimiento</label><input id="fecha" name="fecha" type="date" min="1900-01-01" required aria-describedby="e-fecha"><span class="error-campo" id="e-fecha" aria-live="polite"></span></div>
            <fieldset class="field field--hora">
              <legend class="leyenda-campo">Hora de nacimiento</legend>
              <div class="hora-selects">
                <select id="hora" name="hora" aria-label="Hora" required><option value="">Hora</option>${horas}</select>
                <select id="minuto" name="minuto" aria-label="Minutos" required><option value="">Minutos</option>${minutos}</select>
              </div>
              <small>Formato de 24 horas. Si no la sabes con exactitud, usa la más aproximada que tengas.</small>
              <span class="error-campo" id="e-hora" aria-live="polite"></span>
            </fieldset>
            <div class="field"><label for="ciudad">Ciudad de nacimiento</label><input id="ciudad" name="ciudad" autocomplete="address-level2" maxlength="150" placeholder="Ej: Guadalajara" required><span class="error-campo" id="e-ciudad" aria-live="polite"></span></div>
            <div class="field"><label for="pais">País</label><input id="pais" name="pais" autocomplete="country-name" maxlength="150" placeholder="Ej: México" required><span class="error-campo" id="e-pais" aria-live="polite"></span></div>
            ${camposExtra(r)}
            <div class="acciones-paso"><button class="btn btn--night" type="button" data-siguiente="2">Continuar ${icono("i-arrow")}</button></div>
          </div>
        </fieldset>
        <fieldset data-paso="2" hidden>
          <legend><h2>Tu correo de entrega</h2></legend>
          <div class="natal-form">
            <div class="field field--full"><label for="email">Correo electrónico</label><input id="email" name="email" type="email" autocomplete="email" inputmode="email" required><small>Ahí te enviaremos tu lectura.</small><span class="error-campo" id="e-email" aria-live="polite"></span></div>
            <div class="acciones-paso"><button class="btn btn--ghost" type="button" data-anterior="1">Volver</button><button class="btn btn--night" type="button" data-siguiente="3">Revisar pedido ${icono("i-arrow")}</button></div>
          </div>
        </fieldset>
        <fieldset data-paso="3" hidden>
          <legend><h2>Revisa tu pedido</h2></legend>
          <dl class="resumen" data-resumen></dl>
          <div class="natal-form">
            <label class="check"><input type="checkbox" id="acepto" name="acepto" required><span>Entiendo que la lectura es una herramienta de autoconocimiento y acepto los <a href="/terminos" target="_blank" rel="noopener">términos y la garantía de 7 días</a> y la <a href="/privacidad" target="_blank" rel="noopener">política de privacidad</a>.</span></label>
            <span class="error-campo" id="e-acepto" aria-live="polite" style="grid-column:1/-1"></span>
            <label class="check"><input type="checkbox" id="acepta_correos" name="acepta_correos"><span>Opcional: ${esc(CONSENTIMIENTO)}</span></label>
            <div class="aviso aviso--error" data-error-pedido role="alert" hidden style="grid-column:1/-1"></div>
            <div class="acciones-paso"><button class="btn btn--ghost" type="button" data-anterior="2">Corregir datos</button><button class="btn btn--gold" type="submit" data-enviar>Crear pedido e ir al pago ${icono("i-lock")}</button></div>
            <p class="form-status" data-estado-envio aria-live="polite"></p>
          </div>
        </fieldset>
      </form>
    </div>
    <aside class="detalle__compra">
      ${portada(r)}
      <p class="eyebrow">Tu pedido</p>
      <p class="tarjeta-reporte__titulo">${esc(r.nombre)}</p>
      ${precioHtml(r)}
      ${lista(r.incluye.slice(0, 3))}
    </aside>
  </div>
</section>`,
  });
}

paginas["pedido.html"] = layout({
  ruta: "/pedido",
  titulo: "Tu pedido · Astrea",
  descripcion: "Estado de tu pedido de Astrea.",
  indexable: false,
  scripts: ["/tienda-assets/pedido.js"],
  cuerpo: `${cabecera({ eyebrow: "Tu pedido", titulo: "Gracias por elegir Astrea", lede: "" })}
<section class="sheet sheet--light sheet--lift seccion">
  <div class="shell prosa">
    <div class="estado-pedido" data-estado-pedido aria-live="polite">
      <p>Buscando tu pedido…</p>
    </div>
    <noscript><p class="aviso aviso--info">Activa JavaScript para ver tu pedido, o escríbenos por <a href="${WHATSAPP}">WhatsApp</a>.</p></noscript>
  </div>
</section>`,
});

const PASOS = [
  ["i-pages", "Elige tu reporte", "La carta natal completa o un reporte temático: amor, vocación, dinero, patrones, revolución solar o compatibilidad. Revisa qué incluye y qué datos necesitas."],
  ["i-wheel", "Registra tus datos", "Fecha, hora y lugar de nacimiento, y el correo donde quieres recibir tu lectura. Los revisas antes de continuar."],
  ["i-lock", "Paga en Hotmart", "Te llevamos al pago seguro de Hotmart con tu pedido ya registrado. Pagas en tu moneda local; nosotros no vemos ni guardamos datos de tarjetas."],
  ["i-check", "Confirmamos tu pago", "Revisamos la venta en Hotmart y confirmamos tu pedido. Volver de la página de pago no basta: el pedido se confirma cuando verificamos la venta."],
  ["i-eye", "Preparamos y revisamos", "Calculamos tu carta con Swiss Ephemeris, redactamos la interpretación con apoyo de IA y la revisamos una por una."],
  ["i-mail", "Te la enviamos", "Recibes tu lectura por correo entre 24 y 48 horas después de confirmar el pago."],
];

paginas["como-funciona.html"] = layout({
  ruta: "/como-funciona",
  titulo: "Cómo funciona · Astrea",
  descripcion: "Del pedido a tu correo: cómo calculamos, revisamos y enviamos tu lectura astrológica, y cómo se confirma tu pago en Hotmart.",
  cuerpo: `${cabecera({ eyebrow: "Del pedido a tu correo", titulo: "Cómo funciona", lede: "Así llega tu lectura, paso a paso.", migas: [["/", "Inicio"], ["/como-funciona", "Cómo funciona"]] })}
<section class="sheet sheet--light sheet--lift seccion">
  <div class="shell prosa">
    <ol class="pasos-entrega">
      ${PASOS.map(([ic, t, d]) => `<li><div><strong class="bloque__titulo" style="display:block;margin-bottom:4px">${esc(t)}</strong>${esc(d)}</div></li>`).join("\n      ")}
    </ol>
    <p style="margin-top:var(--s-7)"><a class="btn btn--night" href="/reportes">Ver reportes ${icono("i-arrow")}</a></p>
  </div>
</section>`,
});

paginas["sobre-astrea.html"] = layout({
  ruta: "/sobre-astrea",
  titulo: "Sobre Astrea",
  descripcion: "Astrea crea lecturas astrológicas para el autoconocimiento: astronomía real, interpretación cuidada y revisión humana.",
  cuerpo: `${cabecera({ eyebrow: "Astrea Charts", titulo: "Sobre Astrea", lede: "Astrología para una vida más consciente.", migas: [["/", "Inicio"], ["/sobre-astrea", "Sobre Astrea"]] })}
<section class="sheet sheet--light sheet--lift seccion">
  <div class="shell prosa">
    <p>Astrea nace de una idea sencilla: tu carta natal es un mapa único del cielo en el momento en que naciste, y leerla con calma puede ayudarte a comprenderte, reconocer tus patrones y tomar decisiones más alineadas contigo.</p>
    <h2>Cómo hacemos cada lectura</h2>
    <p>Calculamos las posiciones de los planetas, las casas y los aspectos con Swiss Ephemeris, a partir de tu fecha, hora y lugar de nacimiento. La interpretación se redacta con apoyo de asistentes de IA y después la revisamos una por una antes de enviarla.</p>
    <h2>Lo que una lectura es, y lo que no</h2>
    <p>Nuestras lecturas son herramientas de reflexión y autoconocimiento. No son predicciones ni reemplazan asesoría médica, psicológica, financiera o profesional.</p>
    <h2>Contacto</h2>
    <p>Escríbenos por <a class="link-quiet" href="${WHATSAPP}">WhatsApp</a> o síguenos en <a class="link-quiet" href="https://www.tiktok.com/@astrea.charts">TikTok</a>.</p>
  </div>
</section>`,
});

paginas["terminos.html"] = layout({
  ruta: "/terminos",
  titulo: "Términos y reembolsos · Astrea",
  descripcion: "Qué compras, cómo se entrega, la garantía de 7 días y cómo pedir un reembolso de tu lectura Astrea.",
  cuerpo: `${cabecera({ eyebrow: "Astrea Charts", titulo: "Términos y reembolsos", lede: "Lo que necesitas saber antes de comprar, en palabras simples.", migas: [["/", "Inicio"], ["/terminos", "Términos y reembolsos"]] })}
<section class="sheet sheet--light sheet--lift seccion">
  <div class="shell prosa">
    <p><em>Última actualización: ${TERMINOS_VIGENTES_DESDE}.</em></p>
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
    <p>Si cambiamos estos términos, publicamos la nueva versión aquí con su fecha. Tu compra se rige por los términos vigentes el día en que la hiciste.</p>
  </div>
</section>`,
});

paginas["baja.html"] = layout({
  ruta: "/baja",
  titulo: "Darte de baja · Astrea",
  descripcion: "Deja de recibir los correos de Astrea.",
  indexable: false,
  scripts: ["/tienda-assets/baja.js"],
  cuerpo: `${cabecera({ eyebrow: "Lista de correos", titulo: "Darte de baja", lede: "Confirma y dejarás de recibir nuestros correos.", migas: [["/", "Inicio"], ["/baja", "Darte de baja"]] })}
<section class="sheet sheet--light sheet--lift seccion">
  <div class="shell prosa" data-baja>
    <p>Si te das de baja, no te enviaremos más correos con contenido astrológico, novedades ni ofertas. Tus lecturas compradas no cambian.</p>
    <p><button class="btn btn--gold" type="button">Darme de baja</button></p>
    <p class="form-status" data-estado-baja aria-live="polite"></p>
  </div>
</section>`,
});

// ---------------------------------------------------------------- tarjetas de regalo (astrea-API /regalos)
const REGALABLES = disponibles;
const camposNatales = (horas, minutos) => `
            <div class="field field--full"><label for="nombre">Nombre para la lectura</label><input id="nombre" name="nombre" autocomplete="name" maxlength="150"><span class="error-campo" id="e-nombre" aria-live="polite"></span></div>
            <div class="field field--full"><label for="fecha">Fecha de nacimiento</label><input id="fecha" name="fecha" type="date" min="1900-01-01"><span class="error-campo" id="e-fecha" aria-live="polite"></span></div>
            <fieldset class="field field--hora">
              <legend class="leyenda-campo">Hora de nacimiento</legend>
              <div class="hora-selects">
                <select id="hora" name="hora" aria-label="Hora"><option value="">Hora</option>${horas}</select>
                <select id="minuto" name="minuto" aria-label="Minutos"><option value="">Minutos</option>${minutos}</select>
              </div>
              <small>Formato de 24 horas. Si no la sabes con exactitud, usa la más aproximada que tengas.</small>
              <span class="error-campo" id="e-hora" aria-live="polite"></span>
            </fieldset>
            <div class="field"><label for="ciudad">Ciudad de nacimiento</label><input id="ciudad" name="ciudad" autocomplete="address-level2" maxlength="150" placeholder="Ej: Guadalajara"><span class="error-campo" id="e-ciudad" aria-live="polite"></span></div>
            <div class="field"><label for="pais">País</label><input id="pais" name="pais" autocomplete="country-name" maxlength="150" placeholder="Ej: México"><span class="error-campo" id="e-pais" aria-live="polite"></span></div>`;
{
  const horas = Array.from({ length: 24 }, (_, h) => `<option value="${h}">${String(h).padStart(2, "0")} h</option>`).join("");
  const minutos = Array.from({ length: 60 }, (_, m) => `<option value="${m}">${String(m).padStart(2, "0")} min</option>`).join("");

  paginas["regalar.html"] = layout({
    ruta: "/regalar",
    titulo: "Regala una lectura · Astrea",
    descripcion: "Regala una lectura de Astrea con una tarjeta de regalo: quien la recibe la canjea con sus propios datos de nacimiento.",
    scripts: ["/tienda-assets/regalar.js"],
    cuerpo: `${cabecera({ eyebrow: "Tarjeta de regalo", titulo: "Regala una lectura", lede: "No necesitas saber su hora de nacimiento: le das una tarjeta con un código y la persona la canjea con sus propios datos.", migas: [["/", "Inicio"], ["/regalar", "Regalar"]] })}
<section class="sheet sheet--light sheet--lift seccion">
  <div class="shell compra">
    <div class="compra__panel">
      <ol class="pasos-entrega">
        <li>Eliges la lectura, escribes para quién es y una dedicatoria, y pagas en Hotmart.</li>
        <li>Te enviamos la tarjeta de regalo en PDF, con su código, para imprimirla o reenviarla.</li>
        <li>La persona entra a astrea-charts.site/canjear, escribe el código y sus datos, y recibe su lectura en 24 a 48 horas.</li>
      </ol>
      <form id="form-regalo" novalidate>
        <div class="natal-form">
          <div class="field field--full"><label for="producto">Lectura que regalas</label><select id="producto" name="producto"><option value="">Elige una lectura</option>${REGALABLES.map((r) => `<option value="${r.slug}">${esc(r.nombre)} · ${esc(CHECKOUTS[r.slug].precioReferencia)}</option>`).join("")}</select><span class="error-campo" id="e-producto" aria-live="polite"></span></div>
          <div class="field field--full"><label for="para_nombre">¿Para quién es?</label><input id="para_nombre" name="para_nombre" maxlength="80" placeholder="Así aparecerá en la tarjeta"><span class="error-campo" id="e-para_nombre" aria-live="polite"></span></div>
          <div class="field field--full"><label for="dedicatoria">Dedicatoria (opcional)</label><textarea id="dedicatoria" name="dedicatoria" maxlength="${300}" rows="3" placeholder="Para que te conozcas tan bien como yo te conozco."></textarea><small data-contador-dedicatoria></small><span class="error-campo" id="e-dedicatoria" aria-live="polite"></span></div>
          <div class="field"><label for="comprador_nombre">Tu nombre</label><input id="comprador_nombre" name="comprador_nombre" autocomplete="name" maxlength="150"><span class="error-campo" id="e-comprador_nombre" aria-live="polite"></span></div>
          <div class="field"><label for="comprador_email">Tu correo</label><input id="comprador_email" name="comprador_email" type="email" autocomplete="email" maxlength="150"><small>Ahí te llega la tarjeta.</small><span class="error-campo" id="e-comprador_email" aria-live="polite"></span></div>
          <label class="check"><input type="checkbox" id="acepto" name="acepto"><span>Acepto los <a href="/terminos" target="_blank" rel="noopener">términos y la garantía de 7 días</a> y la <a href="/privacidad" target="_blank" rel="noopener">política de privacidad</a>. La tarjeta vale 12 meses.</span></label>
          <span class="error-campo" id="e-acepto" aria-live="polite" style="grid-column:1/-1"></span>
          <label class="check"><input type="checkbox" id="acepta_correos" name="acepta_correos"><span>Opcional: ${esc(CONSENTIMIENTO)}</span></label>
          <div class="aviso aviso--error" data-error-pedido role="alert" hidden style="grid-column:1/-1"></div>
          <div class="acciones-paso"><button class="btn btn--gold" type="submit" data-enviar>Ir al pago ${icono("i-lock")}</button></div>
        </div>
      </form>
      <p class="detalle__aviso">¿Te regalaron una lectura? <a class="link-quiet" href="/canjear">Canjea tu tarjeta</a>.</p>
    </div>
  </div>
</section>`,
  });

  paginas["canjear.html"] = layout({
    ruta: "/canjear",
    titulo: "Canjea tu tarjeta de regalo · Astrea",
    descripcion: "Canjea tu tarjeta de regalo de Astrea: escribe tu código y tus datos de nacimiento.",
    indexable: false,
    scripts: ["/tienda-assets/canjear.js"],
    cuerpo: `${cabecera({ eyebrow: "Tarjeta de regalo", titulo: "Canjea tu regalo", lede: "Escribe el código de tu tarjeta y tus datos de nacimiento. Tu lectura te llega en PDF a tu correo.", migas: [["/", "Inicio"], ["/canjear", "Canjear"]] })}
<section class="sheet sheet--light sheet--lift seccion">
  <div class="shell compra">
    <div class="compra__panel">
      <form id="form-codigo" novalidate>
        <div class="natal-form">
          <div class="field field--full"><label for="codigo">Código de tu tarjeta</label><input id="codigo" name="codigo" autocomplete="off" autocapitalize="characters" maxlength="20" placeholder="ASTR-XXXX-XXXX"></div>
          <div class="acciones-paso"><button class="btn btn--night" type="submit">Ver mi regalo ${icono("i-arrow")}</button></div>
          <p class="form-status" data-estado-codigo aria-live="polite"></p>
        </div>
      </form>
      <div class="aviso aviso--info" data-regalo hidden>
        <strong>Te regalaron: <span data-regalo-lectura></span></strong><br>
        Para <span data-regalo-para></span> · válida hasta el <span data-regalo-vence></span>
      </div>
      <form id="form-canje" novalidate hidden>
        <fieldset>
          <legend><h2>Tus datos de nacimiento</h2></legend>
          <div class="natal-form">
            ${camposNatales(horas, minutos)}
            <div data-extra-de="pack" hidden style="grid-column:1/-1">${camposExtra({ extra: "pack" })}</div>
            <div data-extra-de="revolucion_solar" hidden style="grid-column:1/-1">${camposExtra({ extra: "revolucion_solar" })}</div>
            <div data-extra-de="segunda_persona" hidden style="grid-column:1/-1">${camposExtra({ extra: "segunda_persona" })}</div>
            <div class="field field--full"><label for="email">Correo electrónico</label><input id="email" name="email" type="email" autocomplete="email" inputmode="email"><small>Ahí te enviaremos tu lectura.</small><span class="error-campo" id="e-email" aria-live="polite"></span></div>
            <label class="check"><input type="checkbox" id="acepto" name="acepto"><span>Entiendo que la lectura es una herramienta de autoconocimiento y acepto los <a href="/terminos" target="_blank" rel="noopener">términos</a> y la <a href="/privacidad" target="_blank" rel="noopener">política de privacidad</a>.</span></label>
            <span class="error-campo" id="e-acepto" aria-live="polite" style="grid-column:1/-1"></span>
            <div class="aviso aviso--error" data-error-pedido role="alert" hidden style="grid-column:1/-1"></div>
            <div class="acciones-paso"><button class="btn btn--gold" type="submit" data-enviar>Canjear mi regalo ${icono("i-arrow")}</button></div>
          </div>
        </fieldset>
      </form>
      <div class="aviso aviso--info" data-exito hidden>
        <strong>¡Listo! Tu regalo quedó canjeado.</strong><br>
        Preparamos tu lectura «<span data-exito-lectura></span>» y te la enviamos a <span data-exito-email></span> en 24 a 48 horas.
      </div>
    </div>
  </div>
</section>`,
  });
}

const FAQ = [
  ["¿Qué es una carta natal?", "Es un mapa del cielo calculado para la fecha, hora y lugar exactos de tu nacimiento. Muestra dónde estaban el Sol, la Luna y los planetas, y cómo se relacionan entre sí y con las áreas de tu vida."],
  ["¿Qué reportes puedo comprar?", "La carta natal completa y seis reportes temáticos: amor y vínculos, vocación y propósito, dinero y abundancia, patrones y transformación, revolución solar y compatibilidad de pareja. Todos llegan en PDF a tu correo entre 24 y 48 horas después de confirmar tu pago."],
  ["¿Qué necesito para la revolución solar?", "Tus datos de nacimiento, la ciudad donde pasarás tu cumpleaños y el año del ciclo que quieres leer: la carta de tu año se calcula para ese lugar."],
  ["¿Qué necesito para la compatibilidad de pareja?", "Tus datos de nacimiento y los de la otra persona. Si no sabes su hora de nacimiento, puedes dejarla vacía. Te pedimos confirmar que esa persona aceptó compartir sus datos."],
  ["¿Cómo pago?", "Primero registras tus datos de nacimiento y tu correo. Después te llevamos al pago seguro de Hotmart, en tu moneda local. Astrea no ve ni guarda datos de tarjetas."],
  ["Ya pagué, ¿por qué mi pedido aparece como pendiente?", "Confirmamos cada pago verificando la venta en Hotmart. Volver de la página de pago no basta para confirmarlo. Cuando lo confirmamos, preparamos tu lectura; no necesitas volver a enviar tus datos."],
  ["¿Cuánto tiempo tarda en llegar?", "Entre 24 y 48 horas después de confirmar tu pago, directo a tu correo."],
  ["¿Qué tan precisa es la lectura?", "Las posiciones se calculan con astronomía real (Swiss Ephemeris), no con tablas genéricas. La interpretación se redacta con apoyo de asistentes de IA y después la revisamos una por una antes de enviarla. Es una herramienta de autoconocimiento, no una predicción."],
  ["¿Necesito saber mi hora de nacimiento?", "Es lo ideal, porque de ella dependen el Ascendente y las casas. Si no la sabes con exactitud, usa la más aproximada que tengas: la mayoría de las secciones siguen siendo útiles."],
  ["¿Necesito crear una cuenta para comprar mi lectura?", "No. Tu lectura se compra una sola vez y es tuya: solo necesitas tus datos de nacimiento y el correo donde quieres recibirla."],
  ["¿En qué formato recibiré mi informe?", "En PDF, por correo electrónico, con un diseño editorial pensado para leerse con calma en el celular, en la computadora o impreso."],
  ["¿Puedo pedir un reembolso?", "Sí. Tienes 7 días desde la compra para pedir el reembolso total, aunque ya hayas recibido tu lectura. Lo pides desde el correo de compra de Hotmart o por WhatsApp con la referencia de tu pedido. Los detalles están en Términos y reembolsos."],
  ["¿Puedo pedir una lectura para otra persona?", "Sí. Usa los datos de nacimiento de esa persona y el correo donde quieres recibir la lectura."],
];

paginas["preguntas-frecuentes.html"] = layout({
  ruta: "/preguntas-frecuentes",
  titulo: "Preguntas frecuentes · Astrea",
  descripcion: "Pagos, entregas, datos de nacimiento, y precisión de las lecturas: respuestas a las preguntas más frecuentes.",
  jsonLd: { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: FAQ.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) },
  cuerpo: `${cabecera({ eyebrow: "¿Tienes dudas?", titulo: "Preguntas frecuentes", migas: [["/", "Inicio"], ["/preguntas-frecuentes", "Preguntas frecuentes"]] })}
<section class="sheet sheet--light sheet--lift seccion">
  <div class="shell prosa">
    <div class="accordion">
      ${FAQ.map(([q, a]) => `<details><summary>${esc(q)}${icono("i-plus")}</summary><p>${esc(a)}</p></details>`).join("\n      ")}
    </div>
    <p style="margin-top:var(--s-7)">¿No encuentras tu respuesta? <a class="link-quiet" href="${WHATSAPP}">Escríbenos por WhatsApp</a>.</p>
  </div>
</section>`,
});

const indexables = ["/", "/reportes", ...REPORTES.map((r) => `/reportes/${r.slug}`), "/como-funciona", "/sobre-astrea", "/preguntas-frecuentes", "/terminos", "/regalar", "/universo"];
paginas["sitemap.xml"] = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${indexables.map((u) => `  <url><loc>${SITIO}${u}</loc></url>`).join("\n")}
</urlset>
`;
paginas["robots.txt"] = `User-agent: *
Disallow: /admin
Disallow: /r/
Disallow: /comprar/
Disallow: /pedido
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
