// Pruebas unitarias de la tienda (sin dependencias): node --test tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  validarDatos, cuerpoDeOrden, urlDeCheckout, crearOrden, huellaDeDatos, mensajeDeError,
  estadoAMostrar, pedidoVigente, pedidoParaGuardar, almacenSeguro, VIGENCIA_PEDIDO_MS,
  canalDe, referenciaDeOrden, rutaDeEstado, aniosDeRevolucion,
  validarRegalo, cuerpoDeRegalo, extraDeProducto, referenciaDePedido,
} from "../tienda-assets/compra.js";
import { REPORTES, estadoDe } from "../tienda-assets/catalogo.js";
import { CHECKOUTS, apiBase, ESTADO_PEDIDO_HABILITADO } from "../tienda-assets/config.js";
import { PAGINAS } from "../scripts/generar-tienda.mjs";
const DISPONIBLES = REPORTES.filter((r) => estadoDe(r, CHECKOUTS) === "disponible");
import { validarSuscripcion, cuerpoSuscripcion, mensajeDeSuscripcion, suscribir, CONSENTIMIENTO } from "../tienda-assets/lista.js";
import { tokenDeBaja, darDeBaja } from "../tienda-assets/baja.js";
import { limpiarOrigen, origenDeVisita, origenVigente, origenDePagina, conOrigen, registrarVisita, CLAVE_ORIGEN } from "../tienda-assets/origen.js";

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
    llamadas.push({ url, body: JSON.parse(opts.body) });
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
    assert.match(html, /<html lang="es">/, ruta);
    assert.match(html, /<title>[^<]{10,}<\/title>/, ruta);
    assert.match(html, /<meta name="description" content="[^"]{20,}">/, ruta);
    assert.equal((html.match(/<h1[ >]/g) || []).length, 1, `${ruta}: un solo h1`);
    for (const enlace of ['href="/reportes"', 'href="/como-funciona"', 'href="/sobre-astrea"', 'href="/preguntas-frecuentes"']) {
      assert.ok(html.includes(enlace), `${ruta} enlaza ${enlace}`);
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
  assert.match(html, /<h1 class="h-display" id="hero-titulo">Tu cielo\.<br><em>Tu forma de ser\.<\/em><\/h1>/);
  assert.ok(html.includes("Un espacio para conocerte a través de tu carta natal."), "propuesta de valor en el hero");
  assert.match(html, /observatorio\/astrea-grabado-hero-v2-1122\.webp/, "grabado editorial de Astrea");
  assert.ok(html.includes('class="portada-observatorio"'), "tema editorial de la portada");
  assert.match(html, /astrea-grabado-hero-v2-640\.webp 640w/, "imagen adaptable para móvil");
  assert.match(html, /tienda-assets\/observatorio\.css/, "estilos del observatorio");
  for (const [ruta, pagina] of Object.entries(PAGINAS)) {
    if (ruta !== "index.html") assert.ok(!pagina.includes("observatorio.css"), `estilos aislados de ${ruta}`);
  }
  assert.match(html, /<a class="wordmark" href="\/"/, "header de producción");
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

test("Astrea.ai en pausa: la tienda vende lecturas y no menciona Astrea.ai ni su app", () => {
  const html = PAGINAS["index.html"];
  assert.ok(!html.includes('id="planes"'), "la portada ya no tiene la sección de planes");
  assert.ok(!/USD 9,99\/mes|USD 19,99\/mes|Astrea Plus|Astrea Pro|Elegir Plus|Elegir Pro/.test(html), "sin precios ni llamados a Plus/Pro en la portada");
  assert.ok(!html.includes("tienda-assets/planes.js"));
  assert.ok(!html.includes('id="astrea-ai"'), "sin la sección de Astrea.ai");
  for (const [ruta, pagina] of Object.entries(PAGINAS)) {
    assert.ok(!/Astrea\.ai|Astrea AI|app\.astrea-charts\.site|5 preguntas/i.test(pagina), ruta);
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
