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
import { REPORTES, ENTREGA, estadoDe } from "../tienda-assets/catalogo.js";
import { CHECKOUTS, URL_ASTREA_AI, WHATSAPP } from "../tienda-assets/config.js";

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
  <symbol id="i-estrella" viewBox="0 0 24 24"><path d="M12 1.5l1.6 8.9 8.9 1.6-8.9 1.6L12 22.5l-1.6-8.9L1.5 12l8.9-1.6z"/></symbol>
</svg>`);

const NAV = [
  ["/", "Inicio"],
  ["/reportes", "Reportes"],
  ["/como-funciona", "Cómo funciona"],
  ["/sobre-astrea", "Sobre Astrea"],
  ["/preguntas-frecuentes", "Preguntas frecuentes"],
];

const disponibles = REPORTES.filter((r) => estadoDe(r, CHECKOUTS) === "disponible");
const proximos = REPORTES.filter((r) => estadoDe(r, CHECKOUTS) !== "disponible");
const principales = disponibles.filter((r) => r.principal);
const tematicos = disponibles.filter((r) => !r.principal);

const MARCA = `<svg class="marca__estrella" aria-hidden="true"><use href="#i-estrella"/></svg><span class="marca__texto">ASTREA<small>CHARTS</small></span>`;

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
<meta name="theme-color" content="#0B1220">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/universo-assets/universo.css">
<link rel="stylesheet" href="/tienda-assets/tienda.css">
${preload}
${jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>\n` : ""}</head>
<body>
<!-- Generado por scripts/generar-tienda.mjs a partir de tienda-assets/catalogo.js. No editar a mano. -->

${SPRITE}

<a class="skip-link" href="#contenido">Saltar al contenido</a>

<header class="site-header site-header--tienda">
  <div class="site-header__inner">
    <a class="wordmark" href="/" aria-label="Astrea, inicio">ASTREA</a>
    <nav class="site-nav" aria-label="Principal">
      ${enlaces}
    </nav>
    <div class="header-acciones">
      <a class="nav-secundaria" href="${URL_ASTREA_AI}">Astrea.ai ↗</a>
      <a class="btn btn--gold btn--sm" href="/reportes">Ver reportes</a>
      <details class="menu-movil">
        <summary aria-label="Abrir menú">${icono("i-menu")}</summary>
        <nav class="menu-movil__panel" aria-label="Menú">
          ${enlaces}
          <a href="${URL_ASTREA_AI}">Astrea.ai ↗</a>
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
      <a href="/como-funciona">Cómo funciona</a>
      <a href="/sobre-astrea">Sobre Astrea</a>
      <a href="/preguntas-frecuentes">Preguntas frecuentes</a>
      <a href="${URL_ASTREA_AI}">Astrea.ai</a>
    </nav>
    <div class="pie__columna">
      <h2 class="pie__titulo">Contacto</h2>
      <a href="https://www.tiktok.com/@astrea.charts">TikTok · @astrea.charts</a>
      <a href="${WHATSAPP}">WhatsApp</a>
    </div>
  </div>
  <div class="shell pie__legal">
    <p>Astrea Charts es una herramienta de autoconocimiento. No reemplaza asesoría médica, psicológica ni financiera.</p>
    <p><a href="/privacidad">Política de privacidad</a> · © ${new Date().getFullYear()} Astrea Charts</p>
  </div>
</footer>
${scripts.map((s) => `<script type="module" src="${s}"></script>`).join("\n")}
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

const BENEFICIO_AI = `<div class="beneficio-ai">
  <strong>Incluye 5 preguntas en Astrea.ai</strong>
  <span>Cuando te enviemos tu lectura, entra a <a href="${URL_ASTREA_AI}">Astrea.ai</a> con el mismo correo de tu compra y tendrás 5 preguntas para conversar sobre tu carta. No necesitas crear una cuenta para comprar, y tu lectura es tuya con o sin suscripción.</span>
</div>`;

// ---------------------------------------------------------------- páginas

const paginas = {};

// ---------------------------------------------------------------- portada (inicio)

// Testimonios reales y autorizados: { texto, nombre, detalle? }. Vacío = la sección no se muestra.
const TESTIMONIOS = [];

const FAQ_PORTADA = [
  ["¿Qué información necesito para hacer mi reporte?", "Tu fecha, hora y lugar de nacimiento, y el correo donde quieres recibirlo. Para la revolución solar, también la ciudad donde pasarás tu cumpleaños; para la compatibilidad de pareja, los datos de la otra persona (su hora de nacimiento es opcional) y su consentimiento."],
  ["¿Cuánto tiempo tarda en llegar?", "Entre 24 y 48 horas después de que confirmamos tu pago en Hotmart."],
  ["¿En qué formato recibiré mi informe?", "En PDF, por correo electrónico, con un diseño editorial pensado para leerse con calma en el celular, en la computadora o impreso."],
  ["¿Qué incluye el acceso a Astrea.ai?", "Cada reporte incluye 5 preguntas en Astrea.ai. Cuando te enviamos tu reporte, entra con el mismo correo de tu compra y úsalas para conversar sobre tu carta. No necesitas una suscripción."],
  ["¿Los reportes son personalizados?", "Sí. Cada reporte parte de tu carta, calculada con Swiss Ephemeris para tu fecha, hora y lugar exactos de nacimiento. La interpretación se redacta con apoyo de IA y la revisamos antes de enviarla."],
  ["¿Puedo pedir un reembolso?", "El pago se procesa en Hotmart. Si necesitas un reembolso, escríbenos por WhatsApp con la referencia de tu pedido y lo revisamos contigo."],
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
  titulo: "Astrea Charts · Astrología para una vida más consciente",
  descripcion: "Reportes astrológicos personalizados: carta natal, amor, vocación, dinero, patrones, revolución solar y compatibilidad. Astronomía real, revisión humana y 5 preguntas en Astrea.ai.",
  cuerpo: `<section class="hero hero--tienda" aria-labelledby="hero-titulo">
  <div class="hero__grid shell">
    <div class="hero__copy">
      <p class="eyebrow eyebrow--light">Astrea · Reportes astrológicos</p>
      <h1 class="h-display" id="hero-titulo">Un mapa del cielo para comprender tu historia.</h1>
      <p class="lede lede--light">Lecturas personalizadas a partir de tu fecha, hora y lugar de nacimiento. Calculadas con astronomía real, escritas con cuidado y revisadas una por una antes de llegar a ti.</p>
      <div class="hero__actions">
        <a class="btn btn--gold" href="/reportes">Explorar reportes ${icono("i-arrow")}</a>
        <a class="link-quiet link-quiet--light" href="/universo#generador">Genera tu carta gratis</a>
      </div>
    </div>
    <figure class="hero__figure">
      <div class="arch arch--framed"><div class="media-slot media-slot--hero"><img src="/universo-assets/img/hero-escultura.webp" alt="Escultura griega de mármol bajo un cielo nocturno" width="800" height="1000" fetchpriority="high"></div></div>
    </figure>
  </div>
</section>

<section class="confianza" aria-label="Por qué confiar en Astrea">
  <ul class="shell confianza__lista">
    <li>${icono("i-orbita", "icon confianza__icono")}<div><strong>Astronomía real</strong><span>Cálculos con Swiss Ephemeris y datos astronómicos precisos.</span></div></li>
    <li>${icono("i-sun", "icon confianza__icono")}<div><strong>Revisión humana</strong><span>Interpretaciones asistidas por IA y revisadas por una astróloga.</span></div></li>
    <li>${icono("i-mail", "icon confianza__icono")}<div><strong>Directo a tu correo</strong><span>Recibe tu informe en 24–48 horas después de la confirmación del pago.</span></div></li>
    <li>${icono("i-loto", "icon confianza__icono")}<div><strong>Autoconocimiento</strong><span>Herramientas para comprenderte y tomar decisiones más alineadas.</span></div></li>
  </ul>
</section>

<section class="capitulo capitulo--claro" id="reportes" aria-labelledby="reportes-titulo">
  <div class="shell">
    <header class="capitulo__cabecera">
      <div>
        <p class="eyebrow">Nuestros reportes</p>
        <h2 class="capitulo__titulo" id="reportes-titulo">Tu historia tiene muchas capas.</h2>
      </div>
      <p class="capitulo__intro">Explora los diferentes aspectos de tu carta natal con reportes diseñados para acompañarte en tu proceso de autoconocimiento.</p>
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
      <li class="paso"><span class="paso__numero">01</span>${icono("i-pages", "icon paso__icono")}<h3 class="paso__titulo">Comparte tus datos de nacimiento</h3><p>Completa tu fecha, hora y lugar de nacimiento, y los datos de tu pareja si aplica.</p></li>
      <li class="paso"><span class="paso__numero">02</span>${icono("i-wheel", "icon paso__icono")}<h3 class="paso__titulo">Calculamos tu carta</h3><p>Usamos Swiss Ephemeris y una interpretación asistida por IA, revisada por una astróloga.</p></li>
      <li class="paso"><span class="paso__numero">03</span>${icono("i-mail", "icon paso__icono")}<h3 class="paso__titulo">Recibes tu informe personalizado</h3><p>Te lo enviamos a tu correo en 24–48 horas, contadas desde la confirmación del pago.</p></li>
    </ol>
  </div>
</section>

<section class="capitulo capitulo--noche astrea-ai" aria-labelledby="ai-titulo">
  <div class="shell astrea-ai__grid">
    <div class="astrea-ai__texto">
      <p class="eyebrow eyebrow--light">Astrea.ai</p>
      <h2 class="capitulo__titulo capitulo__titulo--claro" id="ai-titulo">Conversa con tu carta.</h2>
      <p class="lede lede--light">Cada reporte incluye 5 preguntas para Astrea.ai, nuestra asistente de astrología, para que puedas explorar tu lectura, hacer preguntas y profundizar en lo que más te interese.</p>
      <a class="btn btn--gold" href="${URL_ASTREA_AI}">Conocer Astrea.ai ${icono("i-arrow")}</a>
    </div>
    <figure class="chat-muestra" aria-label="Ejemplo de la conversación en Astrea.ai">
      <div class="chat-muestra__marco">
        <p class="chat-muestra__cabecera"><span>Habla con Astrea</span><span>Ejemplo</span></p>
        <ul class="chat-muestra__sugerencias" aria-label="Preguntas de ejemplo">
          <li>¿Cuáles son mis talentos principales según mi carta?</li>
          <li>¿Cómo puedo trabajar mejor mi Saturno en la carta?</li>
          <li>¿Qué viene para mí este año?</li>
        </ul>
        <ol class="chat-muestra__mensajes">
          <li class="chat-muestra__tu"><span>Tú</span><p>¿Cuáles son mis talentos principales según mi carta?</p></li>
          <li class="chat-muestra__astrea" role="presentation"><p>Astrea está leyendo tu carta…</p></li>
        </ol>
        <div class="chat-muestra__campo" aria-hidden="true"><span>Escribe tu pregunta…</span><span class="chat-muestra__enviar">Enviar</span></div>
      </div>
      <figcaption>Así se ve la conversación en Astrea.ai: Astrea responde a partir de tu carta natal.</figcaption>
    </figure>
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
      <h2 class="capitulo__titulo" id="faq-titulo">Antes de elegir tu reporte</h2>
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
  cuerpo: `${cabecera({ eyebrow: "Catálogo", titulo: "Reportes de Astrea", lede: "Cada reporte mira tu carta desde una pregunta distinta. Todos llegan en PDF a tu correo e incluyen 5 preguntas en Astrea.ai.", migas: [["/", "Inicio"], ["/reportes", "Reportes"]] })}
<section class="sheet sheet--light sheet--lift seccion">
  <div class="shell">
    ${principales.length ? `<div class="grupo-catalogo">
      <h2 class="grupo-catalogo__titulo">La lectura de base</h2>
      <p class="grupo-catalogo__texto">Tu carta natal completa: el mapa entero, para empezar a conocerte.</p>
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
    ? [r.extra === "segunda_persona" ? "Completas tus datos, los de la otra persona y tu correo." : r.extra === "revolucion_solar" ? "Completas tus datos de nacimiento, dónde pasarás tu cumpleaños y tu correo." : "Completas tus datos de nacimiento y tu correo.", "Pagas en Hotmart con tu pedido ya registrado.", "Confirmamos tu pago y preparamos tu lectura.", "La revisamos y te la enviamos por correo en 24–48 h.", "Si quieres, sigues explorando con 5 preguntas en Astrea.ai."]
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
      ${BENEFICIO_AI}
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
            <div class="field field--full"><label for="email">Correo electrónico</label><input id="email" name="email" type="email" autocomplete="email" inputmode="email" required><small>Ahí te enviaremos tu lectura. Usa el mismo correo si después quieres tus 5 preguntas en Astrea.ai.</small><span class="error-campo" id="e-email" aria-live="polite"></span></div>
            <div class="acciones-paso"><button class="btn btn--ghost" type="button" data-anterior="1">Volver</button><button class="btn btn--night" type="button" data-siguiente="3">Revisar pedido ${icono("i-arrow")}</button></div>
          </div>
        </fieldset>
        <fieldset data-paso="3" hidden>
          <legend><h2>Revisa tu pedido</h2></legend>
          <dl class="resumen" data-resumen></dl>
          <div class="natal-form">
            <label class="check"><input type="checkbox" id="acepto" name="acepto" required><span>Entiendo que la lectura es una herramienta de autoconocimiento y acepto la <a href="/privacidad" target="_blank" rel="noopener">política de privacidad</a>.</span></label>
            <span class="error-campo" id="e-acepto" aria-live="polite" style="grid-column:1/-1"></span>
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
      ${BENEFICIO_AI}
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
  ["i-spark", "Sigue explorando", "Con el mismo correo, entra a Astrea.ai y usa tus 5 preguntas para conversar sobre tu carta. Es opcional."],
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
    <h2>Astrea.ai</h2>
    <p>Astrea.ai es nuestra app para conversar con tu carta natal. Es independiente de los reportes: puedes comprar una lectura sin crear una cuenta, y tu lectura es tuya con o sin suscripción.</p>
    <h2>Contacto</h2>
    <p>Escríbenos por <a class="link-quiet" href="${WHATSAPP}">WhatsApp</a> o síguenos en <a class="link-quiet" href="https://www.tiktok.com/@astrea.charts">TikTok</a>.</p>
  </div>
</section>`,
});

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
  ["¿Qué son las 5 preguntas de Astrea.ai?", "Cada reporte incluye 5 preguntas en Astrea.ai. Cuando te enviamos tu reporte, entra a Astrea.ai con el mismo correo de tu compra y podrás usarlas para conversar sobre tu carta. No necesitas crear una cuenta para comprar, y tu reporte es tuyo con o sin suscripción."],
  ["¿En qué formato recibiré mi informe?", "En PDF, por correo electrónico, con un diseño editorial pensado para leerse con calma en el celular, en la computadora o impreso."],
  ["¿Puedo pedir un reembolso?", "El pago se procesa en Hotmart. Si necesitas un reembolso, escríbenos por WhatsApp con la referencia de tu pedido y lo revisamos contigo."],
  ["¿Puedo pedir una lectura para otra persona?", "Sí. Usa los datos de nacimiento de esa persona y el correo donde quieres recibir la lectura. Las 5 preguntas de Astrea.ai quedan asociadas a ese correo."],
];

paginas["preguntas-frecuentes.html"] = layout({
  ruta: "/preguntas-frecuentes",
  titulo: "Preguntas frecuentes · Astrea",
  descripcion: "Pagos, entregas, datos de nacimiento, precisión de las lecturas y Astrea.ai: respuestas a las preguntas más frecuentes.",
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

const indexables = ["/", "/reportes", ...REPORTES.map((r) => `/reportes/${r.slug}`), "/como-funciona", "/sobre-astrea", "/preguntas-frecuentes", "/universo"];
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
