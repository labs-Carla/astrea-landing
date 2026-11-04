// Pruebas unitarias de la tienda (sin dependencias): node --test tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  validarDatos, cuerpoDeOrden, urlDeCheckout, crearOrden, huellaDeDatos, mensajeDeError,
  estadoAMostrar, pedidoVigente, pedidoParaGuardar, almacenSeguro, VIGENCIA_PEDIDO_MS,
  canalDe, referenciaDeOrden, rutaDeEstado, aniosDeRevolucion,
  validarRegalo, cuerpoDeRegalo, extraDeProducto, referenciaDePedido, pedidoDesdeApp, pedidoDeAppParaGuardar, cuponValido,
} from "../tienda-assets/compra.js";
import { REPORTES, estadoDe } from "../tienda-assets/catalogo.js";
import { CHECKOUTS, apiBase, ESTADO_PEDIDO_HABILITADO } from "../tienda-assets/config.js";
import { PAGINAS, APP_CARTA_EN } from "../scripts/generar-tienda.mjs";
const DISPONIBLES = REPORTES.filter((r) => estadoDe(r, CHECKOUTS) === "disponible");
import { validarSuscripcion, cuerpoSuscripcion, mensajeDeSuscripcion, suscribir, CONSENTIMIENTO } from "../tienda-assets/lista.js";
import { tokenDeBaja, darDeBaja } from "../tienda-assets/baja.js";
import { limpiarOrigen, origenDeVisita, origenVigente, origenDePagina, conOrigen, conOrigenApp, origenConocido, registrarVisita, CLAVE_ORIGEN } from "../tienda-assets/origen.js";

const leerRepo = (archivo) => readFileSync(new URL(`../${archivo}`, import.meta.url), "utf8");

const validos = { nombre: "Ana López", email: "ana@example.com", fecha: "1990-05-17", hora: "8", minuto: "5", ciudad: "Bogotá", pais: "Colombia" };

// ---------------------------------------------------------------- validación
test("datos válidos no tienen errores", () => {
  assert.deepEqual(validarDatos(validos), {});
});

test("valida cada campo con las mismas reglas que el backend", () => {
  const ahora = new Date("2026-10-10T12:00:00");
  const e = validarDatos({ nombre: "A", email: "sin-arroba", fecha: "1899-12-31", hora: "", minuto: "5", ciudad: "", pais: "x" }, ahora);
  assert.deepEqual(Object.keys(e).sort(), ["ciudad", "email", "fecha", "hora", "nombre", "pais"]);
  assert.match(validarDatos({ ...validos, fecha: "2027-01-01" }, ahora).fecha, /futuro/);
  assert.match(validarDatos({ ...validos, nombre: "x".repeat(151) }).nombre, /largo/);
  assert.ok(validarDatos({ ...validos, hora: "24" }).hora);
  assert.ok(validarDatos({ ...validos, minuto: "60" }).hora);
  assert.equal(validarDatos({ ...validos, hora: "0", minuto: "0" }).hora, undefined);   // medianoche es válida
});

test("el cuerpo de la orden coincide con DatosCompra del backend", () => {
  assert.deepEqual(cuerpoDeOrden({ ...validos, nombre: "  Ana López ", ciudad: " Bogotá " }), {
    nombre: "Ana López", email: "ana@example.com", fecha_hora_local: "1990-05-17T08:05:00", ciudad: "Bogotá", pais: "Colombia",
  });
});

// ---------------------------------------------------------------- checkout
test("el checkout lleva la orden en sck, con email y nombre precargados", () => {
  const u = new URL(urlDeCheckout(CHECKOUTS["carta-natal"].url, 42, { nombre: "Ana López", email: "ana@example.com" }));
  assert.equal(u.origin + u.pathname, "https://pay.hotmart.com/B106744064D");
  assert.equal(u.searchParams.get("sck"), "astrea-orden-42");
  assert.equal(u.searchParams.get("email"), "ana@example.com");
  assert.equal(u.searchParams.get("name"), "Ana López");
  assert.equal(u.searchParams.get("checkoutMode"), "10", "el checkout con el order bump");
  assert.throws(() => urlDeCheckout(CHECKOUTS["carta-natal"].url, undefined, {}));
});

test("el frontend no envía precio ni estado de pago", () => {
  const c = cuerpoDeOrden(validos);
  for (const prohibido of ["precio", "price", "pago_confirmado", "estado", "status"]) assert.ok(!(prohibido in c));
});

// ---------------------------------------------------------------- creación de la orden
function fetchFalso(respuestas) {
  const llamadas = [];
  const impl = async (url, opts) => {
    llamadas.push({ url, body: JSON.parse(opts.body), headers: opts.headers });
    const r = respuestas.shift();
    if (r instanceof Error) throw r;
    return { ok: r.status < 400, status: r.status, json: async () => r.body };
  };
  impl.llamadas = llamadas;
  return impl;
}

test("crea la orden contra /carta-natal/orden y la reutiliza en un reintento", async () => {
  const f = fetchFalso([{ status: 200, body: { status: "recibido", orden_id: 7, referencia: "r".repeat(22) } }]);
  const mem = new Map();
  const cuerpo = cuerpoDeOrden(validos);
  const a = await crearOrden({ apiBase: "http://api", cuerpo, fetchImpl: f, memoria: mem });
  const b = await crearOrden({ apiBase: "http://api", cuerpo, fetchImpl: f, memoria: mem });
  const referencia = "r".repeat(22);
  assert.deepEqual([a, b], [{ ordenId: 7, referencia, reutilizada: false }, { ordenId: 7, referencia, reutilizada: true }]);
  assert.equal(f.llamadas.length, 1);
  assert.equal(f.llamadas[0].url, "http://api/carta-natal/orden");
  assert.deepEqual(f.llamadas[0].body, cuerpo);
});

test("errores del backend: mensajes claros y no se guarda ninguna orden", async () => {
  const mem = new Map();
  const cuerpo = cuerpoDeOrden(validos);
  await assert.rejects(crearOrden({ apiBase: "x", cuerpo, memoria: mem, fetchImpl: fetchFalso([{ status: 400, body: { detail: "No se encontró la ubicación 'Bogta, Colombia'. Verifica que la ciudad y el país estén escritos correctamente." } }]) }), /No encontramos «Bogta, Colombia»/);
  await assert.rejects(crearOrden({ apiBase: "x", cuerpo, memoria: mem, fetchImpl: fetchFalso([{ status: 400, body: { detail: "No se pudo contactar el servicio de geocodificación para 'x': timeout" } }]) }), /en unos minutos/);
  await assert.rejects(crearOrden({ apiBase: "x", cuerpo, memoria: mem, fetchImpl: fetchFalso([{ status: 429, body: {} }]) }), (e) => e.reintentable && /un minuto/.test(e.message));
  await assert.rejects(crearOrden({ apiBase: "x", cuerpo, memoria: mem, fetchImpl: fetchFalso([new TypeError("network")]) }), (e) => e.reintentable);
  await assert.rejects(crearOrden({ apiBase: "x", cuerpo, memoria: mem, fetchImpl: fetchFalso([{ status: 200, body: { status: "recibido" } }]) }), /No pudimos/);
  assert.equal(mem.size, 0);
});

test("backend anterior sin referencia, y memoria en formato anterior", async () => {
  const cuerpo = cuerpoDeOrden(validos);
  const sinRef = await crearOrden({ apiBase: "x", cuerpo, fetchImpl: fetchFalso([{ status: 200, body: { status: "recibido", orden_id: 9 } }]) });
  assert.deepEqual(sinRef, { ordenId: 9, referencia: null, reutilizada: false });
  const vieja = await crearOrden({ apiBase: "x", cuerpo, memoria: new Map([[huellaDeDatos(cuerpo), 9]]), fetchImpl: fetchFalso([]) });
  assert.deepEqual(vieja, { ordenId: 9, referencia: null, reutilizada: true });
});

test("la huella ignora mayúsculas del correo y del lugar", () => {
  const a = huellaDeDatos(cuerpoDeOrden(validos));
  const b = huellaDeDatos(cuerpoDeOrden({ ...validos, email: "ANA@example.com", ciudad: "BOGOTÁ" }));
  assert.equal(a, b);
  assert.notEqual(a, huellaDeDatos(cuerpoDeOrden({ ...validos, minuto: "6" })));
  assert.match(mensajeDeError(500), /No pudimos/);
});

// ---------------------------------------------------------------- estados del pedido
test("volver del checkout NO marca el pedido como pagado", () => {
  const pedido = pedidoParaGuardar(7, "carta-natal");
  assert.equal(estadoAMostrar({ pedido, volvioDelCheckout: false }), "creado");
  assert.equal(estadoAMostrar({ pedido, volvioDelCheckout: true }), "pendiente");
  assert.equal(estadoAMostrar({ pedido, volvioDelCheckout: true, estadoBackend: "confirmado" }), "confirmado");
  assert.equal(estadoAMostrar({ pedido, volvioDelCheckout: false, estadoBackend: "enviado" }), "enviado");
  assert.equal(estadoAMostrar({ pedido, volvioDelCheckout: false, estadoBackend: "reembolsado" }), "reembolsado");
  assert.equal(estadoAMostrar({ pedido, volvioDelCheckout: true, estadoBackend: null }), "pendiente");
  assert.equal(estadoAMostrar({ pedido, volvioDelCheckout: true, estadoBackend: "inventado" }), "pendiente");
  assert.equal(estadoAMostrar({ pedido: null, volvioDelCheckout: true }), null);
  assert.equal(ESTADO_PEDIDO_HABILITADO, true);
});

test("el pedido guardado solo tiene la referencia y vence", () => {
  const p = pedidoParaGuardar(7, "carta-natal", 1000, "r".repeat(22));
  assert.deepEqual(Object.keys(p).sort(), ["creadoEn", "ordenId", "referencia", "reporte"]);
  assert.ok(pedidoVigente(p, 1000 + VIGENCIA_PEDIDO_MS));
  assert.equal(pedidoVigente(p, 1001 + VIGENCIA_PEDIDO_MS), null);
  assert.equal(pedidoVigente({ ordenId: "7", creadoEn: 1 }, 2), null);
});

test("el almacenamiento bloqueado no rompe la compra", () => {
  const roto = { getItem() { throw new Error("bloqueado"); }, setItem() { throw new Error("bloqueado"); }, removeItem() { throw new Error("bloqueado"); } };
  const a = almacenSeguro(roto);
  assert.equal(a.leer("x"), null);
  a.guardar("x", 1); a.borrar("x");
});

test("API: Railway en producción, backend local en local", () => {
  assert.equal(apiBase({ hostname: "astrea-charts.site", search: "?api=http://malicioso" }), "https://astrea-api-production.up.railway.app/api/v1");
  assert.equal(apiBase({ hostname: "127.0.0.1", search: "" }), "http://127.0.0.1:8000/api/v1");
});

// ---------------------------------------------------------------- catálogo y páginas
test("catálogo: 7 reportes y el pack, todos con checkout real y sus precios", () => {
  assert.deepEqual(REPORTES.map((r) => r.slug), ["carta-natal", "pack", "amor", "vocacion", "dinero", "patrones", "revolucion-solar", "compatibilidad", "tu-2027"]);
  // «Tu 2027» queda «En preparación» hasta que exista su producto en Hotmart.
  assert.deepEqual(REPORTES.filter((r) => estadoDe(r, CHECKOUTS) !== "disponible").map((r) => r.slug), ["tu-2027"]);
  const precios = Object.fromEntries(Object.entries(CHECKOUTS).map(([k, v]) => [k, v.precioReferencia]));
  assert.deepEqual(precios, { "carta-natal": "USD 12", pack: "USD 24", amor: "USD 9", vocacion: "USD 9", dinero: "USD 9", patrones: "USD 9", "revolucion-solar": "USD 12", compatibilidad: "USD 15" });
  const ids = Object.values(CHECKOUTS).map((c) => new URL(c.url).pathname);
  assert.equal(new Set(ids).size, 8, "cada reporte tiene su propio producto de Hotmart");
  for (const r of REPORTES) {
    for (const k of ["nombre", "resumen", "descripcion", "explora", "incluye", "datos", "idealPara", "categoria"]) assert.ok(r[k]?.length, `${r.slug}.${k}`);
  }
  const temas = REPORTES.filter((r) => !r.principal);
  assert.equal(new Set(temas.map((r) => r.descripcion)).size, temas.length, "los temáticos no son copias");
  assert.deepEqual(REPORTES.filter((r) => r.extra).map((r) => [r.slug, r.extra]), [["pack", "pack"], ["revolucion-solar", "revolucion_solar"], ["compatibilidad", "segunda_persona"]]);
});

test("dos canales: carta natal por /carta-natal/orden, el resto por /pedidos", () => {
  assert.equal(canalDe("carta-natal"), "carta-natal");
  assert.equal(canalDe("amor"), "pedido");
  assert.equal(referenciaDeOrden(5), "astrea-orden-5");
  assert.equal(referenciaDeOrden(5, "dinero"), "astrea-pedido-5");
  assert.equal(rutaDeEstado({ reporte: "carta-natal", referencia: "r".repeat(22) }), `/carta-natal/orden/${"r".repeat(22)}/estado`);
  assert.equal(rutaDeEstado({ reporte: "patrones", referencia: "r".repeat(22) }), `/pedidos/${"r".repeat(22)}/estado`);
  assert.equal(rutaDeEstado({ reporte: "amor", referencia: null }), null);
  const u = new URL(urlDeCheckout(CHECKOUTS.amor.url, 3, { nombre: "Ana", email: "a@b.co" }, "amor"));
  assert.equal(u.pathname, "/P107968115R");
  assert.equal(u.searchParams.get("sck"), "astrea-pedido-3");
});

test("cuerpo de un pedido temático y validación de sus datos extra", async () => {
  const ahora = new Date("2026-10-10T12:00:00");
  assert.deepEqual(cuerpoDeOrden(validos, "amor"), { ...cuerpoDeOrden(validos), producto: "amor" });

  assert.deepEqual(aniosDeRevolucion(ahora), [2025, 2026, 2027]);
  const rs = { ...validos, rs_ciudad: " Lima ", rs_pais: "Perú", rs_anio: "2026" };
  assert.deepEqual(validarDatos(rs, ahora, "revolucion_solar"), {});
  assert.deepEqual(cuerpoDeOrden(rs, "revolucion-solar", "revolucion_solar").revolucion_solar, { ciudad: "Lima", pais: "Perú", anio: 2026 });
  assert.deepEqual(Object.keys(validarDatos({ ...validos, rs_anio: "2020" }, ahora, "revolucion_solar")).sort(), ["rs_anio", "rs_ciudad", "rs_pais"]);

  const p2 = { ...validos, p2_nombre: "Luis", p2_fecha: "1988-02-03", p2_hora: "", p2_minuto: "", p2_ciudad: "Quito", p2_pais: "Ecuador", p2_consentimiento: true };
  assert.deepEqual(validarDatos(p2, ahora, "segunda_persona"), {});
  assert.deepEqual(cuerpoDeOrden(p2, "compatibilidad", "segunda_persona").segunda_persona,
    { nombre: "Luis", fecha: "1988-02-03", hora: null, ciudad: "Quito", pais: "Ecuador", consentimiento: true });
  assert.equal(cuerpoDeOrden({ ...p2, p2_hora: "7", p2_minuto: "5" }, "compatibilidad", "segunda_persona").segunda_persona.hora, "07:05");
  assert.ok(validarDatos({ ...p2, p2_hora: "7", p2_minuto: "" }, ahora, "segunda_persona").p2_hora, "hora a medias");
  assert.ok(validarDatos({ ...p2, p2_consentimiento: false }, ahora, "segunda_persona").p2_consentimiento);
  assert.ok(validarDatos({ ...p2, p2_fecha: "2027-01-01" }, ahora, "segunda_persona").p2_fecha);
  assert.deepEqual(validarDatos(validos, ahora, null), {}, "sin extra no se exigen campos adicionales");

  const f = fetchFalso([{ status: 200, body: { status: "recibido", pedido_id: 4, referencia: "q".repeat(22) } }]);
  const r = await crearOrden({ apiBase: "http://api", cuerpo: cuerpoDeOrden(validos, "amor"), slug: "amor", fetchImpl: f });
  assert.deepEqual(r, { ordenId: 4, referencia: "q".repeat(22), reutilizada: false });
  assert.equal(f.llamadas[0].url, "http://api/pedidos");
  assert.equal(f.llamadas[0].body.producto, "amor");
  assert.notEqual(huellaDeDatos(cuerpoDeOrden(validos, "amor")), huellaDeDatos(cuerpoDeOrden(validos, "dinero")), "otro reporte, otro pedido");
});

test("existen todas las rutas del ecommerce", () => {
  for (const ruta of ["index.html", "reportes.html", "como-funciona.html", "sobre-astrea.html", "preguntas-frecuentes.html", "pedido.html",
    ...REPORTES.map((r) => `reportes/${r.slug}.html`), ...DISPONIBLES.map((r) => `comprar/${r.slug}.html`)]) {
    assert.ok(PAGINAS[ruta], ruta);
  }
});

test("cada página de reporte lleva a su compra y cada compra trae sus campos", () => {
  assert.equal(PAGINAS["comprar/tu-2027.html"], undefined, "sin checkout no hay página de compra");
  assert.ok(PAGINAS["reportes/tu-2027.html"].includes("Avísame cuando esté"), "la ficha avisa que está en preparación");
  for (const r of DISPONIBLES) {
    assert.match(PAGINAS[`reportes/${r.slug}.html`], new RegExp(`href="/comprar/${r.slug}"`), r.slug);
    assert.match(PAGINAS[`reportes/${r.slug}.html`], new RegExp(CHECKOUTS[r.slug].precioReferencia), r.slug);
    const compra = PAGINAS[`comprar/${r.slug}.html`];
    assert.match(compra, new RegExp(`data-reporte="${r.slug}"`));
    assert.equal(compra.includes('id="rs_ciudad"'), r.extra === "revolucion_solar", `${r.slug}: campos de revolución solar`);
    assert.equal(compra.includes('id="p2_consentimiento"'), r.extra === "segunda_persona", `${r.slug}: campos de la otra persona`);
  }
});

test("SEO básico y navegación en cada página", () => {
  for (const [ruta, html] of Object.entries(PAGINAS)) {
    if (!ruta.endsWith(".html")) continue;
    const en = ruta.startsWith("en/");
    assert.match(html, en ? /<html lang="en">/ : /<html lang="es">/, ruta);
    assert.match(html, /<title>[^<]{10,}<\/title>/, ruta);
    assert.match(html, /<meta name="description" content="[^"]{20,}">/, ruta);
    assert.equal((html.match(/<h1[ >]/g) || []).length, 1, `${ruta}: un solo h1`);
    for (const enlace of ["/reportes", "/como-funciona", "/sobre-astrea", "/preguntas-frecuentes"]) {
      assert.ok(html.includes(`href="${en ? "/en" : ""}${enlace}"`), `${ruta} enlaza ${enlace}`);
    }
  }
  assert.match(PAGINAS["pedido.html"], /noindex/);
  assert.match(PAGINAS["comprar/carta-natal.html"], /noindex/);
});

test("las páginas commiteadas están al día con el generador", () => {
  for (const [ruta, contenido] of Object.entries(PAGINAS)) {
    assert.equal(readFileSync(new URL(`../${ruta}`, import.meta.url), "utf8"), contenido, `${ruta} desactualizada: node scripts/generar-tienda.mjs`);
  }
});

test("no se rompen las rutas existentes", () => {
  const v = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));
  const rw = Object.fromEntries(v.rewrites.map((r) => [r.source, r.destination]));
  assert.equal(rw["/r/:token"], "https://astrea-informe-react.vercel.app/r/:token");
  assert.equal(rw["/admin"], "https://astrea-informe-react.vercel.app/admin");
  assert.ok(!v.redirects.some((r) => r.source === "/"), "/ sirve la nueva portada");
  assert.ok(v.redirects.some((r) => r.source === "/proximamente"));
  for (const f of ["universo.html", "gracias.html", "link.html", "link-gratis.html", "privacidad.html"]) readFileSync(new URL(`../${f}`, import.meta.url));
  const gracias = readFileSync(new URL("../gracias.html", import.meta.url), "utf8");
  assert.match(gracias, /carta-natal\/compra/, "gracias conserva el formulario post-pago");
});

test("cada reporte tiene su portada en los dos tamaños, y la usa su ficha", () => {
  for (const r of REPORTES) {
    assert.match(r.portada, new RegExp(`^/tienda-assets/img/${r.slug}$`));
    for (const ancho of [480, 960]) {
      const archivo = new URL(`..${r.portada}-${ancho}.webp`, import.meta.url);
      assert.ok(readFileSync(archivo).length > 10_000, `${r.slug}-${ancho}.webp`);
    }
    const ficha = PAGINAS[`reportes/${r.slug}.html`];
    assert.ok(ficha.includes(`${r.portada}-480.webp`) && ficha.includes(`og:image" content="https://astrea-charts.site${r.portada}-960.webp`), r.slug);
  }
});

test("portada: hero, confianza, recorrido, 7 reportes comprables, pasos y preguntas", () => {
  const html = PAGINAS["index.html"];
  assert.match(html, /<h1 class="h-display" id="hero-titulo">El universo<br>empieza<br><em>contigo\.<\/em><\/h1>/);
  assert.ok(html.includes("Astrología para conocerte, explorar tus ciclos"), "propuesta de valor en el hero");
  assert.match(html, /observatorio\/astrea-editorial-hero\.webp/, "grabado editorial de Astrea");
  assert.ok(html.includes('class="portada-observatorio astrea-publica capitulos'), "tema editorial del sitio público");
  assert.match(html, /astrea-editorial-hero\.webp/, "imagen adaptable para móvil");
  assert.match(html, /tienda-assets\/observatorio\.css/, "estilos del observatorio");
  for (const [ruta, pagina] of Object.entries(PAGINAS)) {
    if (ruta.endsWith(".html")) assert.ok(pagina.includes("sitio-publico.css"), `identidad común en ${ruta}`);
  }
  assert.match(html, /<a class="wordmark alm-marca" href="\/"/, "header de producción");
  assert.match(html, /<a href="\/" aria-current="page">Inicio<\/a>/);
  assert.match(html, /href="\/reportes">Explorar lecturas/);
  assert.match(html, /href="\/universo#generador">Descubrir mi carta gratis/);
  for (const t of ["Astronomía real", "Revisión humana", "Directo a tu correo", "Autoconocimiento"]) assert.ok(html.includes(`<strong>${t}</strong>`), t);
  assert.match(html, /24–48 horas después de la confirmación del pago/);
  for (const r of DISPONIBLES) {
    assert.ok(html.includes(`href="/comprar/${r.slug}"`), `compra ${r.slug}`);
    assert.ok(html.includes(`href="/reportes/${r.slug}"`), `ficha ${r.slug}`);
    assert.ok(html.includes(`${r.portada}-480.webp`), `portada ${r.slug}`);
    assert.ok(html.includes(r.tarjeta), `texto ${r.slug}`);
  }
  for (const precio of ["USD 12", "USD 9", "USD 15"]) assert.ok(html.includes(precio));
  assert.equal((html.match(/<details>/g) || []).length, 5, "5 preguntas frecuentes");
  assert.match(html, /id="recorrido"[\s\S]*href="\/universo#generador">Generar mi carta gratis[\s\S]*href="\/reportes">Ver reportes/);
  assert.match(html, /¿Puedo pedir un reembolso\?/);
  assert.ok(!/Testimonio pendiente|Nombre pendiente|★/.test(html), "sin testimonios inventados");
  assert.ok(!/Historias reales/.test(html), "la sección de testimonios no se muestra sin testimonios reales");
  assert.match(html, /tiktok\.com\/@astrea\.charts/);
  assert.match(html, /fetchpriority="high"/, "el hero carga con prioridad");
  assert.ok(!html.includes('class="arch arch--framed"'), "la ilustración del hero no está encerrada en un arco");
});

test("portada en capítulos: orden del embudo, sin CDN y funciona si falla el JS", () => {
  const html = PAGINAS["index.html"];
  const orden = ["hero-titulo", 'class="confianza"', 'id="recorrido"', 'id="reportes"', 'id="como-funciona"', 'id="cielo-semana"', 'id="preguntas"'].map((m) => html.indexOf(m));
  assert.ok(orden.every((p, i) => p > 0 && (i === 0 || p > orden[i - 1])), "secciones en el orden del embudo");
  assert.equal((html.match(/data-hoja>/g) || []).length, 7, "una hoja por sección");
  assert.match(html, /<link rel="canonical" href="https:\/\/astrea-charts\.site\/">/, "la portada sigue indexable");
  assert.ok(!/noindex|experimento/.test(html), "sin restos de la vista previa");
  assert.ok(!/cdn\.jsdelivr|unpkg/.test(html), "las librerías se sirven desde el sitio");
  for (const f of ["portada-vidrio.js", "portada-capitulos.js", "pie-gigante.js"]) {
    const js = readFileSync(new URL(`../tienda-assets/${f}`, import.meta.url), "utf8");
    assert.ok(!/https?:\/\//.test(js) && !js.includes("experimento"), `${f} no depende de otros dominios`);
    assert.ok(html.includes(`/tienda-assets/${f}`), f);
  }
  for (const l of ["lenis", "motion", "anime", "liquidgl"]) assert.ok(readFileSync(new URL(`../tienda-assets/vendor/${l}.min.js`, import.meta.url)).length > 10_000, l);
  const vidrio = readFileSync(new URL("../tienda-assets/portada-vidrio.js", import.meta.url), "utf8");
  assert.ok(!/^import .*liquidgl/m.test(vidrio) && !/modulepreload[^>]*liquidgl/.test(html), "liquidGL no se descarga en teléfonos");
  assert.match(html, /<div class="intro" data-intro[^>]* hidden>/, "la pantalla de carga nace oculta");
  const css = readFileSync(new URL("../tienda-assets/portada-capitulos.css", import.meta.url), "utf8");
  assert.ok(!/body\.capitulos #reportes/.test(css), "el carrusel solo oculta reportes cuando su JS corre");
  assert.match(css, /animation: intro-salida/, "la pantalla de carga se quita sola");
  assert.equal((html.match(/class="totems__pastilla"/g) || []).length, DISPONIBLES.length, "una pastilla por reporte");
});

test("menú flotante: el mismo en todas las páginas con header, también /universo", () => {
  const enlaces = (html) => [...html.match(/<nav class="site-nav"[\s\S]*?<\/nav>/)[0].matchAll(/<a href="([^"]+)"/g)].map((m) => m[1]);
  const base = { es: enlaces(PAGINAS["index.html"]), en: enlaces(PAGINAS["en/index.html"]) };
  assert.equal(base.es.length, 7, "los 7 enlaces del menú");
  assert.deepEqual(base.en, base.es.map((h) => (h.startsWith("/blog") ? h : h === "/" ? "/en/" : `/en${h}`)), "el menú en inglés lleva a /en/, salvo el blog");
  const universo = leerRepo("universo.html");
  for (const [ruta, html] of [...Object.entries(PAGINAS).filter(([r]) => r.endsWith(".html")), ["universo.html", universo], ["en/universo.html", leerRepo("en/universo.html")]]) {
    const en = ruta.startsWith("en/");
    assert.deepEqual(enlaces(html), base[en ? "en" : "es"], ruta);
    for (const marca of ['class="isla-nav"', `btn btn-metal btn--gold btn--sm" href="${en ? "/en" : ""}/reportes"`, "/tienda-assets/nav-flotante.css", "/tienda-assets/nav-flotante.js"]) assert.ok(html.includes(marca), `${ruta}: ${marca}`);
    assert.match(html, /<body class="[^"]*\bglass glass--oro\b/, ruta);
  }
});

test("footer: la marca gigante va en todas las páginas de la tienda", () => {
  for (const [ruta, html] of Object.entries(PAGINAS)) {
    if (!ruta.endsWith(".html")) continue;
    assert.equal((html.match(/data-pie-gigante/g) || []).length, 1, ruta);
    assert.ok(html.includes("/tienda-assets/pie-gigante.js"), ruta);
  }
});

test("Astrea.ai en pausa: la tienda vende lecturas y no menciona Astrea.ai ni su app", () => {
  const html = PAGINAS["index.html"];
  assert.ok(!html.includes('id="planes"'), "la portada ya no tiene la sección de planes");
  assert.ok(!/USD 9,99\/mes|USD 19,99\/mes|Astrea Plus|Astrea Pro|Elegir Plus|Elegir Pro/.test(html), "sin precios ni llamados a Plus/Pro en la portada");
  assert.ok(!html.includes("tienda-assets/planes.js"));
  assert.ok(!html.includes('id="astrea-ai"'), "sin la sección de Astrea.ai");
  for (const [ruta, pagina] of Object.entries(PAGINAS)) {
    // Única excepción: en inglés, la carta gratis es la de la app (APP_CARTA_EN).
    const sinCartaGratis = ruta.startsWith("en/") ? pagina.split(APP_CARTA_EN).join("") : pagina;
    assert.ok(!/Astrea\.ai|Astrea AI|app\.astrea-charts\.site|5 preguntas/i.test(sinCartaGratis), ruta);
  }
  for (const r of REPORTES) assert.ok(!r.incluye.some((i) => /Astrea\.ai|preguntas/.test(i)), r.slug);
  // Nada de promesas que no existen, en todo el sitio generado.
  for (const [ruta, pagina] of Object.entries(PAGINAS)) {
    assert.ok(!/ilimitad|sin límite|soporte prioritario|tras confirmar tu compra/i.test(pagina), ruta);
  }
  // Las compras no cambian: mismos checkouts de Hotmart en cada página de compra.
  for (const [slug, c] of Object.entries(CHECKOUTS)) assert.ok(PAGINAS[`comprar/${slug}.html`] !== undefined && c.url.startsWith("https://pay.hotmart.com/"), slug);
});


test("link: 'Conoce Astrea' lleva a la portada de la tienda (no a /universo)", () => {
  const html = readFileSync(new URL("../link.html", import.meta.url), "utf8");
  const tarjeta = html.slice(html.lastIndexOf("<a ", html.indexOf("Conoce Astrea")), html.indexOf("Conoce Astrea"));
  assert.match(tarjeta, /<a href="\/" class="link-card">/);
});

test("términos: página con la garantía de 7 días, enlazada en el pie y al aceptar el pedido", () => {
  const t = PAGINAS["terminos.html"];
  assert.ok(t.includes('id="reembolsos"') && t.includes("7 días corridos"), "garantía visible");
  assert.ok(PAGINAS["index.html"].includes('href="/terminos"'), "pie enlaza términos");
  assert.ok(PAGINAS["comprar/carta-natal.html"].match(/id="acepto"[^]*?href="\/terminos"/), "el paso de revisión enlaza términos");
  assert.ok(PAGINAS["sitemap.xml"].includes("/terminos"));
  assert.ok(!PAGINAS["preguntas-frecuentes.html"].includes("lo revisamos contigo"), "la FAQ ya no deja el reembolso en el aire");
});

// ---------------------------------------------------------------- origen de la venta (src de Hotmart)

test("origen: ?src= gana, y se normaliza", () => {
  assert.equal(origenDeVisita("?src=TikTok Bio", "", "astrea-charts.site"), "tiktok-bio");
  assert.equal(origenDeVisita("?src=afiliado-Lucía&utm_source=ig", "", "astrea-charts.site"), "afiliado-lucia");
  assert.equal(limpiarOrigen("<script>"), "script");
  assert.equal(limpiarOrigen("  "), null);
  assert.equal(limpiarOrigen("a".repeat(60)).length, 40);
});

test("origen: utm_source + utm_campaign y referentes conocidos", () => {
  assert.equal(origenDeVisita("?utm_source=instagram&utm_campaign=black friday", "", "x"), "instagram-black-friday");
  assert.equal(origenDeVisita("", "https://www.tiktok.com/@astrea", "astrea-charts.site"), "tiktok");
  assert.equal(origenDeVisita("", "https://l.instagram.com/?u=x", "astrea-charts.site"), "instagram");
  assert.equal(origenDeVisita("", "https://www.google.com.mx/", "astrea-charts.site"), "google");
  assert.equal(origenDeVisita("", "https://blog.ejemplo.com/", "astrea-charts.site"), "otro-sitio");
  assert.equal(origenDeVisita("", "https://astrea-charts.site/reportes", "astrea-charts.site"), null, "navegar dentro del sitio no cambia el origen");
  assert.equal(origenDeVisita("", "", "astrea-charts.site"), null);
});

test("origen: se guarda 30 días; sin origen, la página", () => {
  const datos = {};
  const storage = { getItem: (k) => datos[k] ?? null, setItem: (k, v) => { datos[k] = v; }, removeItem: (k) => { delete datos[k]; } };
  const loc = (search, pathname = "/") => ({ search, pathname, hostname: "astrea-charts.site" });
  assert.equal(registrarVisita({ location: loc("?src=tiktok-bio", "/link"), referrer: "", storage, ahora: 1000 }), "tiktok-bio");
  assert.equal(registrarVisita({ location: loc("", "/comprar/carta-natal"), referrer: "", storage, ahora: 2000 }), "tiktok-bio");
  assert.equal(origenVigente(JSON.parse(datos[CLAVE_ORIGEN]), 1000 + 31 * 864e5), null);
  assert.equal(registrarVisita({ location: loc("", "/link"), referrer: "", storage, ahora: 1000 + 31 * 864e5 }), "link");
  assert.equal(origenDePagina("/comprar/amor"), "tienda");
  assert.equal(origenDePagina("/universo"), "universo");
  const roto = { getItem() { throw new Error("bloqueado"); }, setItem() { throw new Error("bloqueado"); }, removeItem() {} };
  assert.equal(registrarVisita({ location: loc("?src=ig-bio"), referrer: "", storage: roto }), "ig-bio", "sin almacenamiento igual funciona");
});

test("origen: el checkout lleva src sin pisar sck ni un src previo", () => {
  const u = new URL(conOrigen(urlDeCheckout(CHECKOUTS["carta-natal"].url, 42, { nombre: "Ana", email: "ana@example.com" }), "tiktok-bio"));
  assert.equal(u.searchParams.get("src"), "tiktok-bio");
  assert.equal(u.searchParams.get("sck"), "astrea-orden-42");
  assert.equal(u.searchParams.get("checkoutMode"), "10", "el checkout con el order bump");
  assert.equal(new URL(conOrigen("https://pay.hotmart.com/X?src=afiliado", "tienda")).searchParams.get("src"), "afiliado");
  assert.equal(conOrigen("https://otro.com/pago", "tienda"), "https://otro.com/pago");
  assert.equal(conOrigen("https://pay.hotmart.com/X", null), "https://pay.hotmart.com/X");
});

test("todas las páginas con pago en Hotmart cargan el origen", () => {
  for (const archivo of ["link.html", "link-gratis.html", "universo.html", "comprar/carta-natal.html", "pedido.html", "index.html"]) {
    assert.ok(readFileSync(new URL(`../${archivo}`, import.meta.url), "utf8").includes('src="/tienda-assets/origen.js"'), archivo);
  }
});

test("carta natal: todos los enlaces de pago usan el checkout con el order bump", () => {
  for (const archivo of ["link.html", "link-gratis.html", "universo.html", "comprar/carta-natal.html", "tienda-assets/config.js"]) {
    const html = readFileSync(new URL(`../${archivo}`, import.meta.url), "utf8");
    assert.ok(!html.includes("B106744064D?bid="), `${archivo}: checkout sin order bump`);
  }
});

// ---------------------------------------------------------------- pack (carta natal + 2 temáticos)
test("pack: es una orden de carta natal con los 2 temáticos elegidos", () => {
  assert.equal(canalDe("pack"), "pack");
  assert.equal(referenciaDeOrden(42, "pack"), "astrea-orden-42", "se cruza con la venta como la carta natal");
  assert.equal(rutaDeEstado({ reporte: "pack", referencia: "r".repeat(22) }), `/carta-natal/orden/${"r".repeat(22)}/estado`);
  const d = { ...validos, pack_amor: true, pack_dinero: true, pack_vocacion: false, pack_patrones: false };
  assert.deepEqual(validarDatos(d, new Date("2026-10-18"), "pack"), {});
  assert.deepEqual(cuerpoDeOrden(d, "pack", "pack"), {
    nombre: "Ana López", email: "ana@example.com", fecha_hora_local: "1990-05-17T08:05:00", ciudad: "Bogotá", pais: "Colombia", tematicos: ["amor", "dinero"],
  });
  for (const marcados of [[], ["amor"], ["amor", "dinero", "patrones"]]) {
    const e = validarDatos({ ...validos, ...Object.fromEntries(marcados.map((t) => [`pack_${t}`, true])) }, new Date("2026-10-18"), "pack");
    assert.equal(e.pack, "Elige 2 lecturas temáticas.", marcados.join(","));
  }
  const u = new URL(urlDeCheckout(CHECKOUTS.pack.url, 42, { nombre: "Ana", email: "ana@example.com" }, "pack"));
  assert.equal(u.pathname, "/X108078579R");
  assert.equal(u.searchParams.get("sck"), "astrea-orden-42");
});

test("pack: el formulario ofrece los 4 temáticos para elegir 2", () => {
  const html = PAGINAS["comprar/pack.html"];
  assert.ok(html.includes('data-extra="pack"'));
  for (const t of ["amor", "vocacion", "dinero", "patrones"]) assert.ok(html.includes(`id="pack_${t}"`), t);
  assert.ok(html.includes('id="e-pack"'));
});

// ---------------------------------------------------------------- lista de correos (Big 3 por correo)

test("lista: el correo es opcional, pero si se da necesita consentimiento", () => {
  assert.equal(validarSuscripcion({ email: "", consentimiento: false }), null, "sin correo: la carta gratis sigue igual");
  assert.equal(validarSuscripcion({ email: "no-es-correo", consentimiento: true }).campo, "email");
  assert.equal(validarSuscripcion({ email: "ana@example.com", consentimiento: false }).campo, "consentimiento");
  assert.equal(validarSuscripcion({ email: " ana@example.com ", consentimiento: true }), null);
  assert.deepEqual(cuerpoSuscripcion({ nombre: "Ana", fecha_hora_local: "1990-05-15T14:30:00", ciudad: "Bogotá", pais: "Colombia" }, " ana@example.com ", "tiktok-bio"),
    { nombre: "Ana", fecha_hora_local: "1990-05-15T14:30:00", ciudad: "Bogotá", pais: "Colombia", email: "ana@example.com", consentimiento: true, origen: "tiktok-bio" });
});

test("lista: mensajes según la respuesta del backend", async () => {
  assert.ok(mensajeDeSuscripcion(200, "ana@example.com").texto.includes("ana@example.com"));
  for (const s of [400, 422, 429, 502, 0]) assert.equal(mensajeDeSuscripcion(s, "x").ok, false, String(s));
  const llamadas = [];
  const r = await suscribir({ base: "http://api", cuerpo: { email: "ana@example.com" }, fetchImpl: async (url, op) => { llamadas.push([url, JSON.parse(op.body)]); return { status: 200 }; } });
  assert.ok(r.ok && llamadas[0][0] === "http://api/lista/suscribir");
  assert.equal((await suscribir({ base: "x", cuerpo: { email: "a" }, fetchImpl: async () => { throw new TypeError("red"); } })).ok, false);
});

test("lista: el consentimiento que se muestra es el que guarda el backend, en las dos páginas", () => {
  for (const archivo of ["link-gratis.html", "universo.html"]) {
    const html = readFileSync(new URL(`../${archivo}`, import.meta.url), "utf8");
    assert.ok(html.includes(CONSENTIMIENTO), archivo);
    assert.ok(html.includes('type="email"') && html.includes("conectarListaDeCorreos"), archivo);
  }
});

test("baja: pide confirmación y valida el token", async () => {
  assert.equal(tokenDeBaja("?t=abc"), null);
  assert.equal(tokenDeBaja("?t=" + "a".repeat(32)), "a".repeat(32));
  const html = PAGINAS["baja.html"];
  assert.ok(html.includes("data-baja") && html.includes("Darme de baja") && html.includes("noindex"));
  let llamada;
  const r = await darDeBaja({ token: "t".repeat(32), base: "http://api", fetchImpl: async (url, op) => { llamada = [url, op.method]; return { ok: true, status: 200 }; } });
  assert.ok(r.ok);
  assert.deepEqual(llamada, [`http://api/lista/baja/${"t".repeat(32)}`, "POST"]);
  assert.equal((await darDeBaja({ token: "x", base: "y", fetchImpl: async () => ({ ok: false, status: 404 }) })).ok, false);
});

test("compra: la casilla de correos es opcional y solo viaja si se marca", () => {
  assert.equal("acepta_correos" in cuerpoDeOrden(validos), false, "sin marcar no se envía");
  assert.equal(cuerpoDeOrden({ ...validos, acepta_correos: true }).acepta_correos, true);
  assert.equal(cuerpoDeOrden({ ...validos, acepta_correos: true }, "amor").acepta_correos, true);
  const html = PAGINAS["comprar/carta-natal.html"];
  assert.ok(html.includes('id="acepta_correos"') && html.includes(CONSENTIMIENTO.slice(0, 40)));
  assert.ok(!/id="acepta_correos"[^>]*required/.test(html), "no es obligatoria");
});

// ---------------------------------------------------------------- tarjetas de regalo
test("regalo: validación, cuerpo, referencia y estado del pedido", () => {
  const ok = { producto: "carta-natal", comprador_nombre: "Carla", comprador_email: "carla@example.com", para_nombre: "Vale", dedicatoria: "", acepto: true };
  assert.deepEqual(validarRegalo(ok, ["carta-natal"]), {});
  assert.deepEqual(Object.keys(validarRegalo({ ...ok, producto: "x", para_nombre: "", acepto: false, dedicatoria: "a".repeat(301) }, ["carta-natal"])).sort(),
    ["acepto", "dedicatoria", "para_nombre", "producto"]);
  assert.deepEqual(cuerpoDeRegalo({ ...ok, comprador_nombre: " Carla ", dedicatoria: "  " }),
    { producto: "carta-natal", comprador_nombre: "Carla", comprador_email: "carla@example.com", para_nombre: "Vale", dedicatoria: null });
  const guardado = pedidoParaGuardar(7, "carta-natal", 1, "r".repeat(22), true);
  assert.equal(referenciaDePedido(guardado), "astrea-regalo-7");
  assert.equal(rutaDeEstado(guardado), `/regalos/${"r".repeat(22)}/estado`);
  assert.equal(referenciaDePedido(pedidoParaGuardar(7, "carta-natal", 1, null)), "astrea-orden-7", "un pedido normal no cambia");
  assert.deepEqual(["pack", "revolucion-solar", "compatibilidad", "amor"].map(extraDeProducto), ["pack", "revolucion_solar", "segunda_persona", null]);
});

test("regalo: /regalar ofrece todas las lecturas y /canjear trae los datos extra de cada una", () => {
  const regalar = PAGINAS["regalar.html"];
  for (const r of DISPONIBLES) assert.ok(regalar.includes(`<option value="${r.slug}">`), r.slug);
  assert.ok(!regalar.includes('<option value="tu-2027">'), "no se regala lo que todavía no se vende");
  assert.ok(PAGINAS["index.html"].includes('href="/regalar"'), "en el menú");
  const canjear = PAGINAS["canjear.html"];
  for (const extra of ["pack", "revolucion_solar", "segunda_persona"]) assert.ok(canjear.includes(`data-extra-de="${extra}"`), extra);
  assert.ok(canjear.includes('id="pack_amor"') && canjear.includes('id="rs_ciudad"') && canjear.includes('id="p2_nombre"') && canjear.includes("noindex"));
});

// ---------------------------------------------------------------- referidos (?ref=)

test("referido: ?ref= válido se guarda 30 días; uno con otra forma se ignora", async () => {
  const { limpiarReferido, referidoVigente, registrarReferido, CLAVE_REFERIDO } = await import("../tienda-assets/referido.js");
  const datos = {};
  const storage = { getItem: (k) => datos[k] ?? null, setItem: (k, v) => { datos[k] = v; }, removeItem: (k) => { delete datos[k]; } };
  assert.equal(limpiarReferido(" abcd2345 "), "ABCD2345");
  assert.equal(limpiarReferido("ABCD234O"), null);          // O no existe en los códigos
  assert.equal(limpiarReferido("<script>"), null);
  assert.equal(registrarReferido({ search: "?ref=abcd2345", storage, ahora: 1000 }), "ABCD2345");
  assert.equal(registrarReferido({ search: "?ref=malo", storage, ahora: 2000 }), "ABCD2345");   // no pisa uno válido
  assert.equal(registrarReferido({ search: "", storage, ahora: 2000 }), "ABCD2345");
  assert.equal(referidoVigente(JSON.parse(datos[CLAVE_REFERIDO]), 1000 + 31 * 864e5), null);
  assert.equal(registrarReferido({ search: "", storage, ahora: 1000 + 31 * 864e5 }), null);
});

// ── /pagar: la lectura pedida desde la app de Astrea ─────────────────────────
const FRAGMENTO = "#" + new URLSearchParams({ orden: "7", ref: "REF_ficticia-12345678", nombre: " Ana López ", email: "ana@example.com" });

test("/pagar lee el pedido de la app desde el fragmento", () => {
  assert.deepEqual(pedidoDesdeApp(FRAGMENTO), { ordenId: 7, referencia: "REF_ficticia-12345678", nombre: "Ana López", email: "ana@example.com", cupon: null });
});

test("/pagar rechaza un pedido incompleto o inválido", () => {
  const con = (cambios) => "#" + new URLSearchParams({ ...Object.fromEntries(new URLSearchParams(FRAGMENTO.slice(1))), ...cambios });
  for (const malo of [{ orden: "0" }, { orden: "7.5" }, { orden: "x" }, { ref: "corta" }, { ref: "REF con espacios 12345" },
    { nombre: "A" }, { email: "ana" }]) assert.equal(pedidoDesdeApp(con(malo)), null, JSON.stringify(malo));
  assert.equal(pedidoDesdeApp(""), null);
  assert.equal(pedidoDesdeApp(undefined), null);
});

test("/pagar guarda un pedido de carta natal que /gracias y /pedido reconocen, y paga con la orden en sck", () => {
  const pedido = pedidoDesdeApp(FRAGMENTO);
  const guardado = pedidoDeAppParaGuardar(pedido, 1000);
  assert.deepEqual(guardado, { ordenId: 7, reporte: "carta-natal", creadoEn: 1000, referencia: "REF_ficticia-12345678", desde: "app" });
  assert.ok(pedidoVigente(guardado, 2000));
  assert.equal(referenciaDePedido(guardado), "astrea-orden-7");
  const url = new URL(urlDeCheckout(CHECKOUTS["carta-natal"].url, pedido.ordenId, pedido, "carta-natal"));
  assert.equal(url.searchParams.get("sck"), "astrea-orden-7");
  assert.equal(url.searchParams.get("email"), "ana@example.com");
  const html = readFileSync(new URL("../pagar.html", import.meta.url), "utf8");
  assert.match(html, /noindex/);
  assert.match(html, /\/tienda-assets\/pagar\.js/);
});

// ── Cupón del descuento de Astrea Plus ────────────────────────────────────────
test("el cupón de Plus llega a Hotmart como offDiscount, y uno inválido se ignora", () => {
  assert.equal(cuponValido(" PLUS-25 "), "PLUS-25");
  for (const malo of [null, "", "ab", "con espacio", "<script>", "x".repeat(41)]) assert.equal(cuponValido(malo), null);
  const con = new URL(urlDeCheckout(CHECKOUTS.amor.url, 3, { nombre: "Ana", email: "ana@example.com" }, "amor", "PLUSAMOR25"));
  assert.equal(con.searchParams.get("offDiscount"), "PLUSAMOR25");
  assert.equal(con.searchParams.get("sck"), "astrea-pedido-3");
  const sin = new URL(urlDeCheckout(CHECKOUTS.amor.url, 3, { nombre: "Ana", email: "ana@example.com" }, "amor", "no válido"));
  assert.equal(sin.searchParams.get("offDiscount"), null);
});

test("/pagar lleva el cupón de la app hasta el checkout y lo guarda para reintentar", () => {
  const pedido = pedidoDesdeApp(FRAGMENTO + "&cupon=PLUSCARTA25");
  assert.equal(pedido.cupon, "PLUSCARTA25");
  assert.equal(pedidoDeAppParaGuardar(pedido, 1).cupon, "PLUSCARTA25");
  const url = new URL(urlDeCheckout(CHECKOUTS["carta-natal"].url, pedido.ordenId, pedido, "carta-natal", pedido.cupon));
  assert.equal(url.searchParams.get("offDiscount"), "PLUSCARTA25");
  assert.equal(pedidoDesdeApp(FRAGMENTO + "&cupon=<x>").cupon, null);
});

// ── Pago dentro de Astrea ──────────────────────────────────────────────────────
test("/gracias dentro del panel de pago de la app avisa a Astrea y no muestra la tienda", () => {
  const gracias = readFileSync(new URL("../gracias.html", import.meta.url), "utf8");
  assert.match(gracias, /window\.self !== window\.top/);
  assert.match(gracias, /postMessage\(\{ tipo: "astrea-pago-recibido" \}, origen\)/);   // sin datos, solo al origen de la app
  assert.match(gracias, /"https:\/\/app\.astrea-charts\.site"/);
  assert.doesNotMatch(gracias, /postMessage\([^)]*"\*"\)/);
  assert.ok(gracias.indexOf("__astreaEnPanel = true") < gracias.indexOf('location.replace("/pedido?retorno=hotmart")'));
});

test("la tienda abre Hotmart en el panel de Astrea, sin salir del sitio", () => {
  const leer = (f) => readFileSync(new URL(`../tienda-assets/${f}`, import.meta.url), "utf8");
  for (const f of ["comprar.js", "regalar.js", "pedido.js"]) {
    const js = leer(f);
    assert.match(js, /abrirPagoEnPanel\(/, `${f} usa el panel`);
    assert.doesNotMatch(js, /location\.assign\(conOrigen/, `${f} ya no sale a Hotmart`);
  }
  const panel = leer("pago-panel.js");
  assert.match(panel, /e\.origin !== window\.location\.origin \|\| e\.source !== marco\.contentWindow/, "solo cree el aviso de /gracias de ESTE panel");
  assert.match(panel, /target = "_blank"/, "respaldo: el pago en una pestaña nueva");
  assert.doesNotMatch(panel, /innerHTML/);
  const gracias = readFileSync(new URL("../gracias.html", import.meta.url), "utf8");
  assert.match(gracias, /\.concat\(location\.origin\)/, "/gracias también avisa al panel de la tienda");
});

// ---------------------------------------------------------------- canal de la venta (métricas, fase 2)

function memoriaOrigen() {
  const datos = new Map();
  return { getItem: (k) => datos.get(k) ?? null, setItem: (k, v) => datos.set(k, String(v)), removeItem: (k) => datos.delete(k) };
}

test("los enlaces a la app llevan el canal conocido, sin pisar uno propio ni tocar otros sitios", () => {
  const app = "https://app.astrea-charts.site/conversacion?ver=carta";
  assert.equal(new URL(conOrigenApp(app, "tiktok-bio")).searchParams.get("src"), "tiktok-bio");
  assert.equal(new URL(conOrigenApp(`${app}&src=correo`, "tiktok-bio")).searchParams.get("src"), "correo");
  assert.equal(conOrigenApp(app, null), app);
  assert.equal(conOrigenApp("https://otro.com/x", "tiktok-bio"), "https://otro.com/x");
});

test("el canal conocido nunca es la página de respaldo", () => {
  const storage = memoriaOrigen();
  const sin = { location: { search: "", hostname: "astrea-charts.site", pathname: "/tienda" }, referrer: "", storage };
  assert.equal(origenConocido(sin), null);                       // registrarVisita diría «tienda»
  registrarVisita({ ...sin, location: { ...sin.location, search: "?src=tiktok-bio" }, ahora: Date.now() });
  assert.equal(origenConocido(sin), "tiktok-bio");               // el guardado, mientras siga vigente
});

test("la orden y el regalo mandan su canal aunque no acepten correos", () => {
  for (const archivo of ["tienda-assets/comprar.js", "tienda-assets/regalar.js"]) {
    const codigo = readFileSync(new URL(`../${archivo}`, import.meta.url), "utf8");
    assert.match(codigo, /^\s*cuerpo\.origen = origenActual\(\);/m, archivo);
    assert.doesNotMatch(codigo, /if \(cuerpo\.acepta_correos\) cuerpo\.origen/, archivo);
  }
});

// ── Idiomas: español en su ruta, inglés bajo /en/ (2026-11-03) ─────────────────
import vm from "node:vm";
import { rutaEnIdioma, conIdiomaApp, idiomaDePagina, marcaDeIdioma, CLAVE_IDIOMA, cabeceraIdioma } from "../tienda-assets/idioma.js";
import { REPORTES_EN, AVISO_IDIOMA } from "../tienda-assets/catalogo-en.js";
import { reporteEnIdioma } from "../tienda-assets/catalogo.js";
import { estadosPedido, ESTADOS_PEDIDO } from "../tienda-assets/compra.js";
import { CONSENTIMIENTO_EN } from "../tienda-assets/lista.js";

// Páginas a mano con versión en inglés (las demás bilingües salen del generador).
// /carta no tiene copia: /en/carta lleva a la carta gratis de la app en inglés (vercel.json).
const A_MANO = ["universo.html", "gracias.html", "pagar.html"];
// Páginas sin versión en inglés, a propósito.
const SOLO_ES = ["ejemplo.html", "contacto.html", "link.html", "link-gratis.html", "reporte.html", "reporte-impresion.html", "proximamente.html"];
const ruta = (archivo) => "/" + archivo.replace(/^en\//, "").replace(/(^|\/)index\.html$/, "").replace(/\.html$/, "");
const paresBilingues = () => [
  ...Object.keys(PAGINAS).filter((a) => a.endsWith(".html") && !a.startsWith("en/") && !SOLO_ES.includes(a)),
  ...A_MANO,
].map((es) => [es, `en/${es}`]);
const html = (archivo) => PAGINAS[archivo] ?? leerRepo(archivo);
const hreflang = (h, idioma) => h.match(new RegExp(`<link rel="alternate" hreflang="${idioma}" href="([^"]+)">`))?.[1];

/** Texto que ve la persona: sin scripts, estilos, comentarios ni SVG, más los atributos que se leen (alt, aria-label…). */
function textoVisible(h) {
  let s = h.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<style[\s\S]*?<\/style>/g, " ").replace(/<!--[\s\S]*?-->/g, " ").replace(/<svg[\s\S]*?<\/svg>/g, " ");
  const atributos = [...s.matchAll(/\s(?:alt|aria-label|placeholder|title)="([^"]*)"/g)].map((m) => m[1]);
  return `${s.replace(/<[^>]+>/g, " ")} ${atributos.join(" ")}`.replace(/\s+/g, " ");
}

test("idioma: rutas /en/ con el mismo slug, y la vuelta al español", () => {
  assert.equal(rutaEnIdioma("/", "en"), "/en/");
  assert.equal(rutaEnIdioma("/reportes/carta-natal", "en"), "/en/reportes/carta-natal");
  assert.equal(rutaEnIdioma("/pedido?retorno=hotmart", "en"), "/en/pedido?retorno=hotmart");
  assert.equal(rutaEnIdioma("/universo#generador", "en"), "/en/universo#generador");
  assert.equal(rutaEnIdioma("/en/", "es"), "/");
  assert.equal(rutaEnIdioma("/en/comprar/amor?cupon=X", "es"), "/comprar/amor?cupon=X");
  assert.equal(rutaEnIdioma("/reportes", "es"), "/reportes");
  assert.equal(idiomaDePagina({ documentElement: { lang: "en" } }), "en");
  assert.equal(idiomaDePagina({ documentElement: { lang: "es" } }), "es");
  assert.equal(idiomaDePagina(undefined), "es");
  assert.deepEqual(marcaDeIdioma("en"), { idioma: "en" });
  assert.deepEqual(marcaDeIdioma("es"), {}, "los pedidos en español no cambian de forma");
  assert.equal(CLAVE_IDIOMA, "astrea_idioma", "la misma clave que la app");
});

test("idioma: cada página bilingüe tiene su /en/ con lang=en y hreflang recíproco", () => {
  for (const [es, en] of paresBilingues()) {
    const hes = html(es), hen = html(en);
    assert.match(hes, /<html lang="es">/, es);
    assert.match(hen, /<html lang="en">/, en);
    for (const h of [hes, hen]) {
      assert.equal(hreflang(h, "es"), `https://astrea-charts.site${ruta(es)}`, `${es}: hreflang es`);
      assert.equal(hreflang(h, "en"), `https://astrea-charts.site${ruta(es) === "/" ? "/en/" : `/en${ruta(es)}`}`, `${en}: hreflang en`);
      assert.equal(hreflang(h, "x-default"), hreflang(h, "es"), "x-default = español");
      assert.ok(h.indexOf('hreflang="en"') < h.indexOf("/tienda-assets/idioma-inicio.js"), `${es}: la detección corre después de los hreflang`);
    }
  }
  for (const solo of ["ejemplo.html"]) assert.equal(hreflang(PAGINAS[solo], "en"), undefined, `${solo} no tiene versión en inglés`);
  assert.equal(PAGINAS["en/ejemplo.html"], undefined);
});

test("idioma: el sitemap lista las dos versiones y robots cubre /en/", () => {
  const mapa = PAGINAS["sitemap.xml"];
  for (const u of ["/", "/reportes", "/reportes/amor", "/universo", "/terminos", "/privacidad"]) {
    const en = u === "/" ? "/en/" : `/en${u}`;
    assert.ok(mapa.includes(`<loc>https://astrea-charts.site${u}</loc>`), u);
    assert.ok(mapa.includes(`<loc>https://astrea-charts.site${en}</loc>`), en);
    assert.ok(mapa.includes(`hreflang="en" href="https://astrea-charts.site${en}"`), `${en} alterno`);
  }
  assert.ok(!mapa.includes("/en/ejemplo") && !mapa.includes("/en/comprar"));
  for (const d of ["Disallow: /en/comprar/", "Disallow: /en/pedido"]) assert.ok(PAGINAS["robots.txt"].includes(d), d);
});

test("idioma: las páginas en inglés no dejan textos en español a la vista", () => {
  const PALABRAS = /\b(tu|tus|lectura|lecturas|carta natal|correo|nacimiento|fecha|hora|reportes?|pedido|ciudad|país|inicio|cómo|qué|datos|pago|comprar|regalar|regalo|canjear|también|aquí|gratis|elige|ver|volver|cumpleaños|pareja|términos|privacidad|próximamente|muy pronto)\b/i;
  for (const [, en] of paresBilingues()) {
    const texto = textoVisible(html(en)).replace(/astrea-charts\.site\/\S*/g, "").replace(/Guías Astrológicas/g, "");
    assert.doesNotMatch(texto, /[áéíóúñ¿¡]/i, `${en}: tildes o signos del español`);
    assert.doesNotMatch(texto, PALABRAS, `${en}: ${texto.match(PALABRAS)?.[0]}`);
    assert.doesNotMatch(texto, /coming soon|available soon|launching soon/i, `${en}: sin promesas`);
  }
});

test("idioma: el inglés vende las mismas lecturas y dice que están escritas en español", () => {
  assert.equal(AVISO_IDIOMA, "Your reading is written in Spanish.");
  for (const r of DISPONIBLES) {
    const ficha = PAGINAS[`en/reportes/${r.slug}.html`], compra = PAGINAS[`en/comprar/${r.slug}.html`];
    assert.ok(ficha.includes(`${CHECKOUTS[r.slug].precioReferencia}<small>You pay in your local currency with Hotmart</small><small class="precio__idioma">${AVISO_IDIOMA}</small>`), `${r.slug}: aviso junto al precio`);
    assert.ok(compra.includes(AVISO_IDIOMA) && compra.includes("written in Spanish, and I accept"), `${r.slug}: aviso en la compra`);
    assert.match(compra, new RegExp(`data-reporte="${r.slug}"`), "el mismo formulario y el mismo reporte");
    assert.ok(compra.includes('src="/tienda-assets/comprar.js"'), "el mismo flujo de compra (mismo endpoint y sck)");
    assert.ok(PAGINAS["en/index.html"].includes(`href="/en/comprar/${r.slug}"`), `portada en inglés compra ${r.slug}`);
  }
  for (const f of ["en/index.html", "en/reportes.html", "en/regalar.html", "en/canjear.html", "en/preguntas-frecuentes.html", "en/universo.html", "en/gracias.html"]) {
    assert.ok(html(f).includes("written in Spanish"), `${f} avisa el idioma de la lectura`);
  }
  assert.ok(!PAGINAS["en/reportes/tu-2027.html"].includes('href="/en/comprar/tu-2027"'), "lo que no se vende tampoco en inglés");
  assert.ok(leerRepo("tienda-assets/comprar.js").includes("AVISO_IDIOMA"), "el resumen del pedido lo repite");
});

test("idioma: catálogo en inglés completo, con los mismos slugs y precios", () => {
  const CAMPOS = ["tarjeta", "nombre", "categoria", "eyebrow", "resumen", "descripcion", "explora", "idealPara", "incluye", "datos", "nota"];
  assert.deepEqual(Object.keys(REPORTES_EN).sort(), REPORTES.map((r) => r.slug).sort());
  for (const r of REPORTES) {
    const en = reporteEnIdioma(r, "en");
    assert.equal(en.slug, r.slug); assert.equal(en.portada, r.portada); assert.equal(en.extra, r.extra);
    for (const c of CAMPOS) {
      if (r[c] === undefined) continue;
      assert.ok(REPORTES_EN[r.slug][c] !== undefined, `${r.slug}.${c} sin traducir`);
      if (Array.isArray(r[c])) assert.equal(en[c].length, r[c].length, `${r.slug}.${c}: mismos ítems`);
    }
    assert.equal(reporteEnIdioma(r, "es"), r, "en español, el de siempre");
  }
  for (const r of DISPONIBLES) assert.ok(PAGINAS[`en/reportes/${r.slug}.html`].includes(CHECKOUTS[r.slug].precioReferencia), `${r.slug}: mismo precio`);
});

test("idioma: los enlaces a la app llevan lang=en desde las páginas en inglés", () => {
  assert.equal(conIdiomaApp("https://app.astrea-charts.site/entrar?modo=crear", "en"), "https://app.astrea-charts.site/entrar?modo=crear&lang=en");
  assert.equal(conIdiomaApp("https://app.astrea-charts.site/carta", "en"), "https://app.astrea-charts.site/carta?lang=en");
  assert.equal(conIdiomaApp("https://app.astrea-charts.site/carta", "es"), "https://app.astrea-charts.site/carta");
  assert.equal(conIdiomaApp("https://pay.hotmart.com/X", "en"), "https://pay.hotmart.com/X", "solo la app");
  for (const [, en] of paresBilingues()) {
    for (const [, href] of html(en).matchAll(/href="(https:\/\/app\.astrea-charts\.site[^"]*)"/g)) {
      assert.match(href.replace(/&amp;/g, "&"), /[?&]lang=en(&|$)/, `${en}: ${href}`);
    }
  }
  assert.match(leerRepo("tienda-assets/pedido.js"), /conIdiomaApp\(URL_APP_CARTA, idioma\)/, "«Back to Astrea» del pedido");
});

test("idioma: el blog (en español) se enlaza desde inglés diciendo que está en español", () => {
  for (const [, en] of paresBilingues()) {
    for (const [a] of html(en).matchAll(/<a [^>]*href="\/blog[^"]*"[^>]*>/g)) assert.match(a, /hreflang="es"/, `${en}: ${a}`);
  }
  assert.ok(PAGINAS["en/index.html"].includes("Weekly horoscope (in Spanish)"));
});

test("idioma: selector ES | EN siempre visible, con la página equivalente", () => {
  for (const [es, en] of paresBilingues()) {
    if (es === "pagar.html") continue;                     // de paso hacia Hotmart, sin header
    for (const [archivo, propio] of [[es, "es"], [en, "en"]]) {
      const sel = html(archivo).match(/<nav class="selector-idioma"[\s\S]*?<\/nav>/)?.[0];
      assert.ok(sel, `${archivo}: selector`);
      const enlaces = Object.fromEntries([...sel.matchAll(/<a href="([^"]+)"[^>]*data-idioma="(es|en)"/g)].map((m) => [m[2], m[1]]));
      assert.deepEqual(enlaces, { es: ruta(es), en: ruta(es) === "/" ? "/en/" : `/en${ruta(es)}` }, archivo);
      assert.match(sel, new RegExp(`data-idioma="${propio}" aria-current="true"`), `${archivo}: marca el idioma actual`);
    }
  }
  assert.ok(PAGINAS["ejemplo.html"].includes('<a href="/en/" hreflang="en"'), "sin versión en inglés, EN lleva a la portada en inglés");
  const js = leerRepo("tienda-assets/nav-flotante.js");
  assert.match(js, /localStorage\.setItem\("astrea_idioma", enlace\.dataset\.idioma\)/, "guarda la elección");
  assert.match(leerRepo("tienda-assets/nav-flotante.css"), /\.selector-idioma/);
});

// La detección (idioma-inicio.js) corre en un contexto falso, como en el navegador.
function detectar({ lang = "es", alterno = "/en/reportes", guardado = null, auto = null, navegador = "en-US", ua = "Mozilla/5.0", webdriver = false, pathname = "/reportes", search = "", hash = "" } = {}) {
  const sesion = { ...(auto ? { astrea_idioma_auto: auto } : {}) };
  let destino = null;
  const contexto = {
    document: { documentElement: { lang }, querySelector: (sel) => (alterno && sel.includes('hreflang="en"') ? { getAttribute: () => `https://astrea-charts.site${alterno}` } : null) },
    navigator: { languages: [navegador], language: navegador, userAgent: ua, webdriver },
    localStorage: { getItem: (k) => (k === "astrea_idioma" ? guardado : null) },
    sessionStorage: { getItem: (k) => sesion[k] ?? null, setItem: (k, v) => { sesion[k] = v; } },
    location: { href: `https://astrea-charts.site${pathname}${search}${hash}`, pathname, search, hash, replace: (u) => { destino = u; } },
    URL,
  };
  contexto.window = contexto;
  vm.runInNewContext(leerRepo("tienda-assets/idioma-inicio.js"), contexto);
  return { destino, sesion };
}

test("idioma: al entrar, un navegador en inglés va UNA vez a /en/; la elección guardada manda", () => {
  assert.equal(detectar().destino, "/en/reportes", "navegador en inglés, sin elección");
  assert.equal(detectar().sesion.astrea_idioma_auto, "1", "queda marcado: no se repite en la sesión");
  assert.equal(detectar({ auto: "1" }).destino, null, "solo una vez por sesión");
  assert.equal(detectar({ navegador: "es-CO" }).destino, null, "navegador en español");
  assert.equal(detectar({ navegador: "pt-BR" }).destino, null, "otro idioma: español");
  assert.equal(detectar({ guardado: "es" }).destino, null, "eligió español con el selector");
  assert.equal(detectar({ guardado: "en", navegador: "es-CO", auto: "1" }).destino, "/en/reportes", "eligió inglés: siempre en inglés");
  assert.equal(detectar({ lang: "en", pathname: "/en/reportes" }).destino, null, "una página en inglés nunca lleva al español");
  assert.equal(detectar({ alterno: null }).destino, null, "sin versión en inglés no hay a dónde ir");
  for (const ua of ["Googlebot/2.1", "Mozilla/5.0 (compatible; bingbot/2.0)", "facebookexternalhit/1.1", "WhatsApp/2.23", "HeadlessChrome/120"]) {
    assert.equal(detectar({ ua }).destino, null, ua);
  }
  assert.equal(detectar({ webdriver: true }).destino, null, "navegador automatizado (E2E)");
  assert.equal(detectar({ pathname: "/pagar", alterno: "/en/pagar", hash: "#orden=7&ref=x" }).destino, "/en/pagar#orden=7&ref=x", "conserva el fragmento de /pagar");
  assert.equal(detectar({ search: "?cupon=PLUS25", pathname: "/comprar/amor", alterno: "/en/comprar/amor" }).destino, "/en/comprar/amor?cupon=PLUS25");
});

test("idioma: la compra en inglés vuelve en inglés a /pedido, también desde /gracias", () => {
  const gracias = leerRepo("gracias.html");
  assert.match(gracias, /p\.idioma === "en"\) location\.replace\("\/en\/pedido\?retorno=hotmart"\)/, "/gracias lleva a /en/pedido");
  assert.ok(gracias.indexOf("__astreaRedirigiendo = true") < gracias.indexOf('location.replace("/en/pedido'), "la detección no pisa esa redirección");
  assert.ok(gracias.indexOf("location.replace(\"/pedido?retorno=hotmart\")") < gracias.indexOf("/tienda-assets/idioma-inicio.js"), "la redirección del pedido corre antes que la detección");
  assert.match(leerRepo("tienda-assets/idioma-inicio.js"), /__astreaEnPanel \|\| global\.__astreaRedirigiendo/);
  assert.match(leerRepo("en/gracias.html"), /location\.replace\("\/en\/pedido\?retorno=hotmart"\)/);
  assert.match(leerRepo("en/gracias.html"), /carta-natal\/compra/, "el mismo formulario post-pago");
  for (const f of ["comprar.js", "regalar.js", "pagar.js"]) assert.match(leerRepo(`tienda-assets/${f}`), /marcaDeIdioma\(/, `${f} guarda el idioma del pedido`);
  assert.match(leerRepo("tienda-assets/pago-panel.js"), /rutaEnIdioma\("\/pedido\?retorno=hotmart", idiomaDePagina\(\)\)/);
  assert.equal(origenDePagina("/en/universo"), "universo", "el origen no cambia por el idioma");
  assert.equal(origenDePagina("/en/comprar/amor"), "tienda");
});

test("idioma: mensajes de error y estados en inglés", async () => {
  const e = validarDatos({ nombre: "A", email: "x", fecha: "", hora: "", minuto: "", ciudad: "", pais: "" }, new Date(), null, "en");
  for (const m of Object.values(e)) assert.doesNotMatch(m, /[áéíóúñ¿¡]|\b(tu|la|el|de)\b/, m);
  assert.equal(validarDatos({ ...validos, pack_amor: true }, new Date(), "pack", "en").pack, "Choose 2 themed readings.");
  assert.match(mensajeDeError(400, "No se encontró la ubicación 'Bogta'", "en"), /We couldn’t find “Bogta”/);
  assert.doesNotMatch(mensajeDeError(400, "Detalle del backend en español", "en"), /español/, "un detalle del backend no se muestra en inglés");
  assert.equal(mensajeDeError(400, "Detalle del backend", "es"), "Detalle del backend", "en español, como siempre");
  assert.match(mensajeDeError(429, null, "en"), /Wait a minute/);
  const f = fetchFalso([{ status: 422, body: {} }]);
  await assert.rejects(crearOrden({ apiBase: "http://api", cuerpo: cuerpoDeOrden(validos), fetchImpl: f, memoria: new Map(), idioma: "en" }), /Some of the details/);
  assert.deepEqual(Object.keys(estadosPedido("en")), Object.keys(ESTADOS_PEDIDO));
  assert.equal(estadosPedido("es"), ESTADOS_PEDIDO);
  assert.ok(Object.keys(validarRegalo({}, ["amor"], "en")).length && Object.values(validarRegalo({}, ["amor"], "en")).every((m) => !/[áéíóú]/.test(m)));
  assert.match(mensajeDeSuscripcion(200, "ana@example.com", "en").texto, /^We sent “Your Big 3 explained” to ana@example\.com\./);
  assert.doesNotMatch(mensajeDeSuscripcion(200, "ana@example.com", "en").texto, /Spanish/, "el Big 3 llega en inglés");
  assert.match(mensajeDeSuscripcion(429, "x", "en").texto, /^You made/);
  assert.match((await darDeBaja({ token: "t".repeat(32), base: "x", idioma: "en", fetchImpl: async () => ({ ok: true, status: 200 }) })).texto, /^Done/);
  for (const f of ["pago-panel.js", "pedido.js", "comprar.js", "regalar.js", "canjear.js", "baja.js", "lista.js"]) {
    assert.match(leerRepo(`tienda-assets/${f}`), /idiomaDePagina\(\)/, `${f} usa el idioma de la página`);
  }
});

test("idioma: consentimiento de correos en inglés en /en/ (el backend guarda el del idioma de la página)", () => {
  assert.ok(PAGINAS["en/comprar/carta-natal.html"].includes(CONSENTIMIENTO_EN));
  assert.ok(!PAGINAS["en/comprar/carta-natal.html"].includes(CONSENTIMIENTO), "sin el texto en español");
  assert.ok(PAGINAS["comprar/carta-natal.html"].includes(CONSENTIMIENTO), "el español no cambia");
});

test("idioma: términos y privacidad en inglés son traducción marcada para revisión legal", () => {
  for (const f of ["en/terminos.html", "en/privacidad.html"]) {
    assert.match(PAGINAS[f], /PENDIENTE: traducción fiel[^>]*revisión legal/, f);
    assert.match(PAGINAS[f], /the Spanish version prevails/, f);
  }
  assert.ok(PAGINAS["en/terminos.html"].includes('id="reembolsos"') && PAGINAS["en/terminos.html"].includes("7 calendar days"));
  assert.ok(!PAGINAS["terminos.html"].includes("PENDIENTE"), "el español no lleva la marca");
});

test("lista: manda X-Idioma para que el backend guarde el consentimiento y envíe el Big 3 en ese idioma", async () => {
  const cabeceras = [];
  const fetchImpl = async (_url, op) => { cabeceras.push(op.headers); return { status: 200 }; };
  await suscribir({ base: "http://api", cuerpo: { email: "ana@example.com" }, fetchImpl, idioma: "en" });
  await suscribir({ base: "http://api", cuerpo: { email: "ana@example.com" }, fetchImpl });
  assert.equal(cabeceras[0]["X-Idioma"], "en");
  assert.equal(cabeceras[1]["X-Idioma"], "es");
  assert.equal(cabeceras[0]["Content-Type"], "application/json");
  assert.doesNotMatch(leerRepo("tienda-assets/lista.js"), /backend guarda CONSENTIMIENTO_V1 \(español\)/);
  assert.doesNotMatch(leerRepo("en/universo.html"), /PDF, written in Spanish/, "el Big 3 ya no se anuncia en español");
});

test("/en/carta lleva a la carta gratis de la app en inglés; /carta sigue en español", () => {
  const vercel = JSON.parse(leerRepo("vercel.json"));
  const r = vercel.redirects.find((x) => x.source === "/en/carta");
  assert.equal(r?.destination, "https://app.astrea-charts.site/carta?lang=en");
  assert.throws(() => leerRepo("en/carta.html"), "sin copia en inglés de /carta");
  const carta = leerRepo("carta.html");
  assert.match(carta, /<html lang="es">/);
  assert.ok(!carta.includes('hreflang="en" href="https://astrea-charts.site/en/carta"'), "sin hreflang hacia una redirección");
  assert.ok(!carta.includes("/tienda-assets/idioma-inicio.js"), "sin alterno, sin detección");
  assert.match(carta, /data-idioma="es" aria-current="true"/);
  assert.ok(carta.includes('<a href="https://app.astrea-charts.site/carta?lang=en" hreflang="en" lang="en" data-idioma="en">EN</a>'), "EN lleva a la app");
  assert.match(leerRepo("scripts/servidor-local.mjs"), /vercel\.redirects/, "el servidor local aplica los redirects");
  assert.match(leerRepo("tienda-assets/nav-flotante.js"), /destino\.origin === location\.origin/, "el selector no reescribe enlaces a la app");
  for (const [, en] of paresBilingues()) assert.ok(!/href="\/en\/carta"/.test(html(en)), `${en} no enlaza /en/carta`);
});

test("correcciones del español: privacidad, /universo y /carta", () => {
  for (const f of ["privacidad.html", "en/privacidad.html"]) {
    assert.ok(PAGINAS[f].includes('href="mailto:guiasastrologicas@gmail.com"'), f);
    assert.ok(!PAGINAS[f].includes("guiasastrologica@"), `${f}: sin el correo mal escrito`);
  }
  for (const f of ["universo.html", "en/universo.html"]) {
    const h = leerRepo(f);
    assert.ok(!/Testimonio pendiente|Nombre pendiente|data-placeholder|id="testimonios"/.test(h), `${f}: sin testimonios de relleno`);
    assert.ok(!/llegar[aá]n pronto|coming soon/i.test(h), `${f}: sin promesas`);
    assert.ok(!/despu[eé]s de tu compra|after your purchase/i.test(h), `${f}: el plazo se cuenta desde el pago`);
  }
  assert.ok(leerRepo("universo.html").includes("Entre 24 y 48 horas después de confirmar tu pago"));
  assert.ok(leerRepo("universo.html").includes('href="/reportes/revolucion-solar">Revolución solar</a>'), "la revolución solar se vende y se enlaza");
  assert.ok(leerRepo("en/universo.html").includes('href="/en/reportes/revolucion-solar">Solar return</a>'));
  for (const f of ["carta.html", "link-gratis.html"]) {
    const h = leerRepo(f);
    assert.ok(!/max="\d{4}-\d{2}-\d{2}"/.test(h.match(/<input type="date" id="fg_fecha"[^>]*>/)[0]), `${f}: sin fecha máxima fija`);
    assert.match(h, /getElementById\("fg_fecha"\)\.max=/, `${f}: la máxima es hoy`);
  }
});

test("/en/universo: sin generador ni lista; la carta gratis en inglés es la de la app", () => {
  assert.equal(APP_CARTA_EN, "https://app.astrea-charts.site/carta?lang=en");
  const en = leerRepo("en/universo.html");
  for (const marca of ['id="natal-form"', 'id="resultado"', "/tienda-assets/lista.js", "conectarListaDeCorreos", 'type="email"', "f-consentimiento"]) {
    assert.ok(!en.includes(marca), `sin ${marca}`);
  }
  assert.ok(!en.includes("The interpretation of your free chart is written in Spanish."), "ya no hay interpretación en español que avisar");
  assert.match(en, /<section class="sheet sheet--light sheet--lift" id="generador"[\s\S]*?class="shell gen"[\s\S]*?class="gen__form-col"[\s\S]*?class="gen__figure"/, "la sección conserva su diseño de dos columnas");
  const aApp = [...en.matchAll(/<a [^>]*href="([^"]+)"[^>]*>([^<]*)/g)].filter(([, , txt]) => /free chart|Create for free/i.test(txt));
  assert.ok(aApp.length >= 3, "hero, sección y precio");
  for (const [, href, txt] of aApp) assert.equal(href, APP_CARTA_EN, txt);
  for (const f of ["en/index.html"]) {
    const h = PAGINAS[f];
    assert.ok(!h.includes("/en/universo#generador"), `${f}: no lleva al generador`);
    assert.ok([...h.matchAll(/href="([^"]+)">(Discover my free chart|Generate my free chart)/g)].every(([, href]) => href === APP_CARTA_EN), f);
    assert.ok(h.includes(`href="${APP_CARTA_EN}">Discover my free chart`), f);
  }
  // El español no cambia.
  const es = leerRepo("universo.html");
  assert.ok(es.includes('id="natal-form"') && es.includes("conectarListaDeCorreos"));
  assert.ok(PAGINAS["index.html"].includes('href="/universo#generador">Descubrir mi carta gratis'));
  // universo.js no se rompe sin formulario (el carrusel y lo demás siguen).
  assert.match(leerRepo("universo-assets/universo.js"), /if \(form\) iniciarGenerador\(\);/);
});

test("idioma: todas las llamadas a la API de la tienda mandan X-Idioma según la página", async () => {
  assert.deepEqual(cabeceraIdioma("en"), { "X-Idioma": "en" });
  assert.deepEqual(cabeceraIdioma("es"), { "X-Idioma": "es" });
  assert.deepEqual(cabeceraIdioma(undefined), { "X-Idioma": "es" });
  for (const idioma of ["en", "es"]) {
    const f = fetchFalso([{ status: 200, body: { orden_id: 7, referencia: "r".repeat(22) } }]);
    await crearOrden({ apiBase: "http://api", cuerpo: cuerpoDeOrden({ ...validos, acepta_correos: true }), fetchImpl: f, memoria: new Map(), idioma });
    assert.equal(f.llamadas[0].headers["X-Idioma"], idioma, `crearOrden ${idioma}`);
    assert.equal(f.llamadas[0].headers["Content-Type"], "application/json");
  }
  let cab = null;
  await darDeBaja({ token: "t".repeat(32), base: "x", idioma: "en", fetchImpl: async (_u, op) => { cab = op.headers; return { ok: true, status: 200 }; } });
  assert.equal(cab["X-Idioma"], "en", "baja");
  for (const f of ["regalar.js", "canjear.js", "pedido.js", "lista.js"]) {
    const js = leerRepo(`tienda-assets/${f}`);
    const llamadas = js.match(/fetch(Impl)?\(`\$\{(apiBase\(\)|base)\}[^;]*;/g) || [];
    assert.ok(llamadas.length, f);
    for (const l of llamadas) assert.match(l, /cabeceraIdioma\(idioma\)/, `${f}: ${l.slice(0, 60)}`);
  }
  assert.match(leerRepo("gracias.html"), /'X-Idioma': 'es'/);
  assert.match(leerRepo("en/gracias.html"), /'X-Idioma': 'en'/);
  assert.match(leerRepo("universo-assets/universo.js"), /"X-Idioma": EN \? "en" : "es"/);
});
