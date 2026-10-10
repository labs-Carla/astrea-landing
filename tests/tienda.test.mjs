// Pruebas unitarias de la tienda (sin dependencias): node --test tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  validarDatos, cuerpoDeOrden, urlDeCheckout, crearOrden, huellaDeDatos, mensajeDeError,
  estadoAMostrar, pedidoVigente, pedidoParaGuardar, almacenSeguro, VIGENCIA_PEDIDO_MS,
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
  const f = fetchFalso([{ status: 200, body: { status: "recibido", orden_id: 7 } }]);
  const mem = new Map();
  const cuerpo = cuerpoDeOrden(validos);
  const a = await crearOrden({ apiBase: "http://api", cuerpo, fetchImpl: f, memoria: mem });
  const b = await crearOrden({ apiBase: "http://api", cuerpo, fetchImpl: f, memoria: mem });
  assert.deepEqual([a, b], [{ ordenId: 7, reutilizada: false }, { ordenId: 7, reutilizada: true }]);
  assert.equal(f.llamadas.length, 1);
  assert.equal(f.llamadas[0].url, "http://api/carta-natal/orden");
  assert.deepEqual(f.llamadas[0].body, cuerpo);
});

test("errores del backend: mensajes claros y no se guarda ninguna orden", async () => {
  const mem = new Map();
  const cuerpo = cuerpoDeOrden(validos);
  await assert.rejects(crearOrden({ apiBase: "x", cuerpo, memoria: mem, fetchImpl: fetchFalso([{ status: 400, body: { detail: "No se encontró la ciudad 'Bogta'" } }]) }), /No encontramos esa ciudad/);
  await assert.rejects(crearOrden({ apiBase: "x", cuerpo, memoria: mem, fetchImpl: fetchFalso([{ status: 429, body: {} }]) }), (e) => e.reintentable && /un minuto/.test(e.message));
  await assert.rejects(crearOrden({ apiBase: "x", cuerpo, memoria: mem, fetchImpl: fetchFalso([new TypeError("network")]) }), (e) => e.reintentable);
  await assert.rejects(crearOrden({ apiBase: "x", cuerpo, memoria: mem, fetchImpl: fetchFalso([{ status: 200, body: { status: "recibido" } }]) }), /No pudimos/);
  assert.equal(mem.size, 0);
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
  assert.equal(estadoAMostrar({ pedido, volvioDelCheckout: true, estadoBackend: "inventado" }), "pendiente");
  assert.equal(estadoAMostrar({ pedido: null, volvioDelCheckout: true }), null);
  assert.equal(ESTADO_PEDIDO_HABILITADO, false, "no hay endpoint de estado: no se consulta");
});

test("el pedido guardado solo tiene la referencia y vence", () => {
  const p = pedidoParaGuardar(7, "carta-natal", 1000);
  assert.deepEqual(Object.keys(p).sort(), ["creadoEn", "ordenId", "reporte"]);
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
test("catálogo: 7 reportes y solo se vende lo que tiene checkout real", () => {
  assert.deepEqual(REPORTES.map((r) => r.slug), ["carta-natal", "revolucion-solar", "compatibilidad", "amor", "vocacion", "dinero", "patrones"]);
  assert.deepEqual(REPORTES.filter((r) => estadoDe(r, CHECKOUTS) === "disponible").map((r) => r.slug), ["carta-natal"]);
  for (const r of REPORTES) {
    for (const k of ["nombre", "resumen", "descripcion", "explora", "incluye", "datos"]) assert.ok(r[k]?.length, `${r.slug}.${k}`);
    if (estadoDe(r, CHECKOUTS) !== "disponible") assert.ok(r.motivo, `${r.slug} explica por qué no está a la venta`);
  }
  const temas = ["amor", "vocacion", "dinero", "patrones"].map((s) => REPORTES.find((r) => r.slug === s));
  assert.equal(new Set(temas.map((r) => r.descripcion)).size, 4, "los temáticos no son copias");
  assert.equal(new Set(temas.map((r) => r.explora.join())).size, 4);
});

test("existen todas las rutas del ecommerce", () => {
  for (const ruta of ["index.html", "reportes.html", "como-funciona.html", "sobre-astrea.html", "preguntas-frecuentes.html", "pedido.html", "comprar/carta-natal.html", ...REPORTES.map((r) => `reportes/${r.slug}.html`)]) {
    assert.ok(PAGINAS[ruta], ruta);
  }
  assert.ok(!PAGINAS["comprar/amor.html"], "sin página de compra para reportes no disponibles");
});

test("las páginas de reportes no disponibles no tienen ningún enlace de pago", () => {
  for (const r of REPORTES.filter((r) => estadoDe(r, CHECKOUTS) !== "disponible")) {
    const html = PAGINAS[`reportes/${r.slug}.html`];
    assert.ok(!html.includes("pay.hotmart.com"), r.slug);
    assert.ok(!html.includes("/comprar/"), r.slug);
    assert.match(html, /Próximamente/);
  }
  assert.match(PAGINAS["reportes/carta-natal.html"], /href="\/comprar\/carta-natal"/);
});

test("SEO básico y navegación en cada página", () => {
  for (const [ruta, html] of Object.entries(PAGINAS)) {
    if (!ruta.endsWith(".html")) continue;
    assert.match(html, /<html lang="es">/, ruta);
    assert.match(html, /<title>[^<]{10,}<\/title>/, ruta);
    assert.match(html, /<meta name="description" content="[^"]{20,}">/, ruta);
    assert.equal((html.match(/<h1[ >]/g) || []).length, 1, `${ruta}: un solo h1`);
    for (const enlace of ['href="/reportes"', 'href="/como-funciona"', 'href="/sobre-astrea"', 'href="/preguntas-frecuentes"', 'href="https://app.astrea-charts.site"']) {
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
