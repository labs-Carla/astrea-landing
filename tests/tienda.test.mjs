// Pruebas unitarias de la tienda (sin dependencias): node --test tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  validarDatos, cuerpoDeOrden, urlDeCheckout, crearOrden, huellaDeDatos, mensajeDeError,
  estadoAMostrar, pedidoVigente, pedidoParaGuardar, almacenSeguro, VIGENCIA_PEDIDO_MS,
  canalDe, referenciaDeOrden, rutaDeEstado, aniosDeRevolucion,
} from "../tienda-assets/compra.js";
import { REPORTES, estadoDe } from "../tienda-assets/catalogo.js";
import { CHECKOUTS, apiBase, ESTADO_PEDIDO_HABILITADO } from "../tienda-assets/config.js";
import { PAGINAS } from "../scripts/generar-tienda.mjs";

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
  assert.equal(u.searchParams.get("bid"), "1784070968525");
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
test("catálogo: 7 reportes, todos con checkout real y sus precios", () => {
  assert.deepEqual(REPORTES.map((r) => r.slug), ["carta-natal", "amor", "vocacion", "dinero", "patrones", "revolucion-solar", "compatibilidad"]);
  assert.ok(REPORTES.every((r) => estadoDe(r, CHECKOUTS) === "disponible"));
  const precios = Object.fromEntries(Object.entries(CHECKOUTS).map(([k, v]) => [k, v.precioReferencia]));
  assert.deepEqual(precios, { "carta-natal": "USD 12", amor: "USD 9", vocacion: "USD 9", dinero: "USD 9", patrones: "USD 9", "revolucion-solar": "USD 12", compatibilidad: "USD 15" });
  const ids = Object.values(CHECKOUTS).map((c) => new URL(c.url).pathname);
  assert.equal(new Set(ids).size, 7, "cada reporte tiene su propio producto de Hotmart");
  for (const r of REPORTES) {
    for (const k of ["nombre", "resumen", "descripcion", "explora", "incluye", "datos", "idealPara", "categoria"]) assert.ok(r[k]?.length, `${r.slug}.${k}`);
  }
  const temas = REPORTES.filter((r) => !r.principal);
  assert.equal(new Set(temas.map((r) => r.descripcion)).size, temas.length, "los temáticos no son copias");
  assert.deepEqual(REPORTES.filter((r) => r.extra).map((r) => [r.slug, r.extra]), [["revolucion-solar", "revolucion_solar"], ["compatibilidad", "segunda_persona"]]);
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
    ...REPORTES.map((r) => `reportes/${r.slug}.html`), ...REPORTES.map((r) => `comprar/${r.slug}.html`)]) {
    assert.ok(PAGINAS[ruta], ruta);
  }
});

test("cada página de reporte lleva a su compra y cada compra trae sus campos", () => {
  for (const r of REPORTES) {
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
  assert.match(html, /<h1 class="h-display" id="hero-titulo">Tu carta natal, un lugar al que volver\.<\/h1>/);
  assert.ok(html.includes("Astrea es tu espacio personal para comprender tu carta natal, explorar tus patrones y encontrar nuevas perspectivas a lo largo del tiempo."), "propuesta de valor en el hero");
  assert.match(html, /hero-escultura\.webp/, "hero de producción");
  assert.ok(!html.includes("hero__sky"), "hero sin el fondo de cielo: solo la ventana con la escultura");
  assert.match(html, /<a class="wordmark" href="\/"/, "header de producción");
  assert.match(html, /<a href="\/" aria-current="page">Inicio<\/a>/);
  assert.match(html, /href="\/reportes">Explorar reportes/);
  assert.match(html, /href="\/universo#generador">Genera tu carta gratis/);
  for (const t of ["Astronomía real", "Revisión humana", "Directo a tu correo", "Autoconocimiento"]) assert.ok(html.includes(`<strong>${t}</strong>`), t);
  assert.match(html, /24–48 horas después de la confirmación del pago/);
  for (const r of REPORTES) {
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
  assert.ok(!/escena|backdrop/.test(html), "sin la escena ni el vidrio del rediseño");
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
