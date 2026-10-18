// E2E de la tienda en un navegador real contra el backend LOCAL (nunca producción).
//
// Requisitos: tienda en :5500 (node scripts/servidor-local.mjs) y backend local
// en :8000 con DATABASE_URL de SQLite local. No sale a Hotmart: la navegación a
// pay.hotmart.com se intercepta y se aborta; solo se inspecciona su URL.
//
// Uso: PW=<ruta a playwright/index.mjs> [CHROME=<ejecutable>] DB=/tmp/astrea_ai_local.db \
//        [ADMIN=<X-Admin-Secret del backend LOCAL>] node tests/e2e/tienda.e2e.mjs
// Con ADMIN, además confirma el pago en el backend local y verifica que /pedido lo muestre.
import { DatabaseSync } from "node:sqlite";

const { chromium } = await import(process.env.PW || "playwright");
const TIENDA = process.env.TIENDA || "http://127.0.0.1:5500";
const db = new DatabaseSync(process.env.DB || "/tmp/astrea_ai_local.db", { readOnly: true });
let fallos = 0;
const ok = (c, m) => { console.log(`${c ? "OK   " : "FALLO"} ${m}`); if (!c) fallos++; };

const navegador = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});

async function nuevaPagina(viewport) {
  const p = await navegador.newPage({ viewport });
  const hotmart = [];
  await p.route("https://pay.hotmart.com/**", (r) => { hotmart.push(r.request().url()); r.abort(); });
  const consola = [];
  p.on("console", (m) => consola.push(m.text()));
  return { p, hotmart, consola };
}

// ---------------------------------------------------------------- navegación
{
  const { p } = await nuevaPagina({ width: 390, height: 844 });
  await p.goto(`${TIENDA}/`);
  ok(await p.locator("h1").innerText() !== "", "inicio carga con su h1");
  await p.locator(".menu-movil summary").click();
  await p.locator(".menu-movil__panel a", { hasText: "Reportes" }).click();
  await p.waitForURL(`${TIENDA}/reportes`);
  ok((await p.locator(".tarjeta-reporte").count()) === 8, "catálogo móvil: 7 reportes y el pack");
  ok((await p.locator(".insignia--disponible").count()) === 8, "los 7 reportes y el pack están disponibles");
  for (const slug of ["carta-natal", "pack", "revolucion-solar", "compatibilidad", "amor", "vocacion", "dinero", "patrones"]) {
    const r = await p.goto(`${TIENDA}/reportes/${slug}`);
    await p.locator(`a[href="/comprar/${slug}"]`).click();
    await p.waitForURL(`${TIENDA}/comprar/${slug}`);
    ok(r.status() === 200 && (await p.locator("#form-compra").count()) === 1, `/reportes/${slug} → su formulario de compra`);
  }
  for (const ruta of ["/como-funciona", "/sobre-astrea", "/preguntas-frecuentes", "/universo", "/gracias", "/link"]) {
    ok((await p.goto(`${TIENDA}${ruta}`)).status() === 200, `${ruta} sigue respondiendo`);
  }
  await p.close();
}

// ---------------------------------------------------------------- compra
const minuto = Math.floor(Math.random() * 60);
const dia = 1 + Math.floor(Math.random() * 27);
const email = `e2e.tienda.${Date.now().toString(36)}@example.com`;
const fecha = `1987-03-${String(dia).padStart(2, "0")}`;
const fechaHora = `${fecha} 14:${String(minuto).padStart(2, "0")}:00`;
const ordenesDeEsteCorreo = () => db.prepare("select id, pago_confirmado, nombre_reporte, referencia_pedido from cartas_natales where email = ?").all(email);
const API = process.env.API || "http://127.0.0.1:8000/api/v1";

{
  const { p, hotmart, consola } = await nuevaPagina({ width: 390, height: 844 });
  await p.goto(`${TIENDA}/comprar/carta-natal`);

  // Paso 1: validación antes de avanzar
  await p.click("[data-siguiente='2']");
  ok(await p.locator("#e-nombre").innerText() !== "" && await p.locator("#nombre").getAttribute("aria-invalid") === "true", "paso 1 vacío: muestra errores y no avanza");
  ok(await p.locator("[data-paso='2']").isHidden(), "sigue en el paso 1");

  await p.fill("#nombre", "Prueba Tienda");
  await p.fill("#fecha", fecha);
  await p.selectOption("#hora", "14");
  await p.selectOption("#minuto", String(minuto));
  await p.fill("#ciudad", "Bogotá");
  await p.fill("#pais", "Colombia");

  // Borrador: recargar no pierde lo escrito
  await p.reload();
  ok(await p.inputValue("#nombre") === "Prueba Tienda" && await p.inputValue("#ciudad") === "Bogotá", "el borrador sobrevive a una recarga");

  await p.click("[data-siguiente='2']");
  ok(await p.locator("[data-paso='2']").isVisible(), "paso 2: correo");
  await p.fill("#email", "no-es-correo");
  await p.click("[data-siguiente='3']");
  ok(await p.locator("#e-email").innerText() !== "", "correo inválido: error");
  await p.fill("#email", email);
  await p.click("[data-siguiente='3']");
  ok(await p.locator("[data-paso='3']").isVisible(), "paso 3: revisión");
  const resumen = await p.locator("[data-resumen]").innerText();
  ok(resumen.includes(email) && resumen.includes("Bogotá, Colombia") && resumen.includes("USD 12") && resumen.includes(`14:${String(minuto).padStart(2, "0")}`), "el resumen muestra producto, datos, correo y precio");

  // Sin aceptar condiciones no se crea nada
  await p.click("[data-enviar]");
  ok(await p.locator("#e-acepto").innerText() !== "" && ordenesDeEsteCorreo().length === 0, "sin aceptar: no crea la orden");

  // Doble clic: una sola orden
  await p.check("#acepto");
  const salida = p.waitForRequest((r) => r.url().startsWith("https://pay.hotmart.com/"), { timeout: 30000 });
  await p.locator("[data-enviar]").dblclick();
  await salida;
  await p.waitForTimeout(500);

  const ordenes = ordenesDeEsteCorreo();
  ok(ordenes.length === 1, `doble clic: una sola orden real (${ordenes.length})`);
  const orden = ordenes[0];
  ok(orden && orden.pago_confirmado === 0, "la orden nace SIN pago confirmado");
  const destino = new URL(hotmart[0] || "https://x");
  ok(hotmart.length >= 1 && destino.pathname === "/B106744064D", "redirige al producto real de Hotmart");
  ok(destino.searchParams.get("sck") === `astrea-orden-${orden?.id}`, `sck = astrea-orden-${orden?.id}`);
  ok(destino.searchParams.get("email") === email, "email precargado en Hotmart");
  ok(!/precio|price|amount/i.test(destino.search), "no envía precio a Hotmart");
  ok(!consola.some((l) => l.includes(email) || l.includes(fecha)), "sin datos personales en la consola");

  await p.goto(`${TIENDA}/reportes`);                   // la salida abortada deja la pestaña en chrome-error://
  const guardado = await p.evaluate(() => ({ local: localStorage.getItem("astrea-tienda-pedido"), borrador: sessionStorage.getItem("astrea-tienda-borrador") }));
  const pedido = JSON.parse(guardado.local);
  ok(pedido.ordenId === orden?.id && !guardado.local.includes(email), "guarda solo la referencia del pedido");
  ok(typeof pedido.referencia === "string" && pedido.referencia.length >= 16 && pedido.referencia === orden?.referencia_pedido, "guarda la referencia aleatoria que dio el backend");
  ok(guardado.borrador === null, "el borrador se borra al crear el pedido");

  // Reintento desde la misma pestaña (volver atrás desde Hotmart): misma orden
  await p.goto(`${TIENDA}/comprar/carta-natal`);
  await p.fill("#nombre", "Prueba Tienda"); await p.fill("#fecha", fecha);
  await p.selectOption("#hora", "14"); await p.selectOption("#minuto", String(minuto));
  await p.fill("#ciudad", "Bogotá"); await p.fill("#pais", "Colombia");
  await p.click("[data-siguiente='2']"); await p.fill("#email", email); await p.click("[data-siguiente='3']");
  await p.check("#acepto");
  const salida2 = p.waitForRequest((r) => r.url().startsWith("https://pay.hotmart.com/"), { timeout: 30000 });
  await p.click("[data-enviar]");
  await salida2;
  ok(ordenesDeEsteCorreo().length === 1 && new URL(hotmart.at(-1)).searchParams.get("sck") === `astrea-orden-${orden?.id}`, "reintento: reutiliza la misma orden");

  // Retorno desde Hotmart (llega a /gracias): estado pendiente, sin pedir datos otra vez
  await p.goto(`${TIENDA}/gracias`);
  await p.waitForURL(`${TIENDA}/pedido?retorno=hotmart`);
  await p.waitForSelector("[data-estado-pedido][data-estado]");
  const estado = await p.locator("[data-estado-pedido]").getAttribute("data-estado");
  const texto = await p.locator("[data-estado-pedido]").innerText();
  ok(estado === "pendiente" && /pendiente de confirmación/i.test(texto), "retorno: 'pago pendiente de confirmación'");
  const consultas = [];
  p.on("request", (r) => { if (r.url().includes("/estado")) consultas.push(r.url()); });
  await p.reload(); await p.waitForSelector("[data-estado-pedido][data-estado]");
  ok(consultas.some((u) => u.endsWith(`/carta-natal/orden/${pedido.referencia}/estado`)), "consulta el estado por la referencia (no por el id)");
  ok(!/pago confirmado/i.test(texto), "no declara el pago confirmado");
  ok(texto.includes(`astrea-orden-${orden?.id}`) && !/Astrea\.ai|5 preguntas/.test(texto), "muestra la referencia, sin mencionar Astrea.ai");
  ok((await p.locator('a[href*="/r/"]').count()) === 0, "no muestra ningún enlace de entrega");

  if (process.env.ADMIN) {
    const r = await fetch(`${API}/admin/confirmar-pago/${orden.id}`, { method: "POST", headers: { "X-Admin-Secret": process.env.ADMIN } });
    ok(r.ok, "el panel (backend local) confirma el pago");
    await p.goto(`${TIENDA}/pedido?retorno=hotmart`);
    await p.waitForSelector("[data-estado-pedido][data-estado='confirmado']", { timeout: 15000 }).catch(() => {});
    const t = await p.locator("[data-estado-pedido]").innerText();
    ok(await p.locator("[data-estado-pedido]").getAttribute("data-estado") === "confirmado" && /Pago confirmado/.test(t), "tras la confirmación: /pedido muestra 'Pago confirmado'");
    ok((await p.locator('a[href^="https://pay.hotmart.com/"]').count()) === 0, "confirmado: ya no ofrece pagar");
  }

  // Backend caído: /pedido vuelve al estado local, nunca a "confirmado"
  await p.route("**/carta-natal/orden/*/estado", (r) => r.abort());
  await p.goto(`${TIENDA}/pedido?retorno=hotmart`);
  await p.waitForSelector("[data-estado-pedido][data-estado]");
  ok(await p.locator("[data-estado-pedido]").getAttribute("data-estado") === "pendiente", "sin respuesta del backend: 'pendiente', no 'confirmado'");
  await p.unroute("**/carta-natal/orden/*/estado");

  // Pedido recién creado (sin retorno): "creado" con enlace para pagar
  await p.route("**/carta-natal/orden/*/estado", (r) => r.abort());   // aísla el estado local "creado"
  await p.goto(`${TIENDA}/pedido`);
  await p.waitForSelector("[data-estado-pedido][data-estado]");
  ok(await p.locator("[data-estado-pedido]").getAttribute("data-estado") === "creado" &&
     (await p.locator('a[href^="https://pay.hotmart.com/"]').getAttribute("href")).includes(`sck=astrea-orden-${orden?.id}`), "pedido creado: ofrece ir al pago con la misma orden");

  await p.unroute("**/carta-natal/orden/*/estado");
  // El formulario post-pago de siempre sigue disponible
  await p.goto(`${TIENDA}/gracias?formulario=1`);
  ok(p.url().endsWith("/gracias?formulario=1") && (await p.locator("#natalForm").count()) === 1, "gracias?formulario=1 conserva el formulario post-pago");
  await p.close();
}

// ---------------------------------------------------------------- reportes temáticos (POST /pedidos)
const pedidosDeEsteCorreo = (correo) => db.prepare("select id, producto, pago_confirmado, datos_extra_json, referencia from pedidos_producto where email = ?").all(correo);

async function comprarTematico(slug, completarExtra) {
  const { p, hotmart } = await nuevaPagina({ width: 390, height: 844 });
  const correo = `e2e.${slug}.${Date.now().toString(36)}@example.com`;
  await p.goto(`${TIENDA}/comprar/${slug}`);
  await p.fill("#nombre", "Prueba Temática"); await p.fill("#fecha", "1990-11-20");
  await p.selectOption("#hora", "6"); await p.selectOption("#minuto", "30");
  await p.fill("#ciudad", "Bogotá"); await p.fill("#pais", "Colombia");
  if (completarExtra) await completarExtra(p);
  await p.click("[data-siguiente='2']");
  ok(await p.locator("[data-paso='2']").isVisible(), `${slug}: paso 1 completo`);
  await p.fill("#email", correo); await p.click("[data-siguiente='3']");
  const resumen = await p.locator("[data-resumen]").innerText();
  await p.check("#acepto");
  const salida = p.waitForRequest((r) => r.url().startsWith("https://pay.hotmart.com/"), { timeout: 60000 });
  await p.locator("[data-enviar]").dblclick();
  await salida; await p.waitForTimeout(500);
  const pedidos = pedidosDeEsteCorreo(correo);
  ok(pedidos.length === 1 && pedidos[0].producto === slug && pedidos[0].pago_confirmado === 0, `${slug}: un solo pedido real, sin pago confirmado`);
  const destino = new URL(hotmart[0] || "https://x");
  ok(destino.pathname === new URL((await import("../../tienda-assets/config.js")).CHECKOUTS[slug].url).pathname, `${slug}: va a SU producto de Hotmart`);
  ok(destino.searchParams.get("sck") === `astrea-pedido-${pedidos[0]?.id}`, `${slug}: sck = astrea-pedido-${pedidos[0]?.id}`);
  ok(db.prepare("select count(*) n from cartas_natales where email = ?").get(correo).n === 0, `${slug}: no se crea una orden de carta natal`);
  await p.goto(`${TIENDA}/gracias`);
  await p.waitForURL(`${TIENDA}/pedido?retorno=hotmart`);
  await p.waitForSelector("[data-estado-pedido][data-estado]");
  const texto = await p.locator("[data-estado-pedido]").innerText();
  ok(await p.locator("[data-estado-pedido]").getAttribute("data-estado") === "pendiente" && texto.includes(`astrea-pedido-${pedidos[0]?.id}`), `${slug}: retorno 'pendiente' con su referencia`);
  if (process.env.ADMIN) {
    await fetch(`${API}/admin/pedidos/${pedidos[0].id}/confirmar-pago`, { method: "POST", headers: { "X-Admin-Secret": process.env.ADMIN } });
    await p.reload(); await p.waitForSelector("[data-estado-pedido][data-estado='confirmado']", { timeout: 15000 }).catch(() => {});
    ok(await p.locator("[data-estado-pedido]").getAttribute("data-estado") === "confirmado", `${slug}: tras confirmar en el panel, /pedido muestra 'Pago confirmado'`);
  }
  await p.close();
  return { pedido: pedidos[0], resumen };
}

await comprarTematico("amor");

const compat = await comprarTematico("compatibilidad", async (p) => {
  await p.click("[data-siguiente='2']");
  ok(await p.locator("#e-p2_nombre").innerText() !== "" && await p.locator("#e-p2_consentimiento").innerText() !== "", "compatibilidad: exige los datos y el consentimiento de la otra persona");
  await p.fill("#p2_nombre", "Luis"); await p.fill("#p2_fecha", "1988-02-03");
  await p.fill("#p2_ciudad", "Quito"); await p.fill("#p2_pais", "Ecuador");
  await p.check("#p2_consentimiento");
});
const sp = JSON.parse(compat.pedido?.datos_extra_json || "{}").segunda_persona || {};
ok(sp.nombre === "Luis" && sp.hora === null && sp.consentimiento === true && typeof sp.latitud === "number", "compatibilidad: guarda a la otra persona (sin hora) geocodificada");
ok(/Luis · 03\/02\/1988 · hora desconocida · Quito, Ecuador/.test(compat.resumen) && /USD 15/.test(compat.resumen), "compatibilidad: el resumen muestra a la otra persona y USD 15");

const anio = new Date().getFullYear();
const rev = await comprarTematico("revolucion-solar", async (p) => {
  ok((await p.locator("#rs_anio option").allTextContents()).includes(`Cumpleaños de ${anio}`), "revolución solar: ofrece el ciclo de este año");
  await p.fill("#rs_ciudad", "Lima"); await p.fill("#rs_pais", "Perú"); await p.selectOption("#rs_anio", String(anio));
});
const rs = JSON.parse(rev.pedido?.datos_extra_json || "{}").revolucion_solar || {};
ok(rs.ciudad === "Lima" && rs.anio === anio && typeof rs.latitud === "number", "revolución solar: guarda lugar y ciclo geocodificados");

// Navegador sin pedido de la tienda: gracias.html funciona como siempre
{
  const { p } = await nuevaPagina({ width: 1366, height: 900 });
  await p.goto(`${TIENDA}/gracias`);
  ok(p.url() === `${TIENDA}/gracias` && (await p.locator("#natalForm").count()) === 1, "sin pedido previo: /gracias muestra el formulario post-pago");
  await p.goto(`${TIENDA}/pedido`);
  await p.waitForSelector("text=No encontramos un pedido");
  ok(true, "/pedido sin pedido: lo explica y ofrece completar los datos");

  // Teclado: el skip-link y la navegación son alcanzables
  await p.goto(`${TIENDA}/reportes`);
  await p.keyboard.press("Tab");
  ok(await p.evaluate(() => document.activeElement?.classList.contains("skip-link")), "teclado: primer Tab = saltar al contenido");
  await p.close();
}

await navegador.close();
console.log(fallos ? `\n${fallos} FALLO(S)` : "\nTienda E2E: todo OK");
process.exit(fallos ? 1 : 0);
