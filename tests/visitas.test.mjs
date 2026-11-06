// Visitas por canal (métricas, fase 1): node --test tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { esEntrada, medicionApagada, cuerpoDeVista, enviarVista, CLAVE_NO_MEDIR } from "../tienda-assets/visita.js";
import { avisarVista } from "../tienda-assets/origen.js";

const memoria = () => {
  const datos = {};
  return { datos, getItem: (k) => datos[k] ?? null, setItem: (k, v) => { datos[k] = String(v); }, removeItem: (k) => { delete datos[k]; } };
};
const loc = (search = "", pathname = "/", hostname = "astrea-charts.site") => ({ search, pathname, hostname });

test("visitas: es entrada si llega de fuera, sin recargar ni volver atrás", () => {
  assert.equal(esEntrada("", "astrea-charts.site", "navigate"), true, "sin referente (app, correo, enlace directo)");
  assert.equal(esEntrada("https://www.tiktok.com/", "astrea-charts.site", "navigate"), true);
  assert.equal(esEntrada("https://astrea-charts.site/reportes", "astrea-charts.site", "navigate"), false);
  assert.equal(esEntrada("https://app.astrea-charts.site/chat", "astrea-charts.site", "navigate"), false);
  assert.equal(esEntrada("http://localhost:5500/", "localhost", "navigate"), false);
  assert.equal(esEntrada("https://www.tiktok.com/", "astrea-charts.site", "reload"), false);
  assert.equal(esEntrada("https://www.tiktok.com/", "astrea-charts.site", "back_forward"), false);
});

test("visitas: el origen y el referente solo viajan en una entrada", () => {
  assert.deepEqual(cuerpoDeVista({ pagina: "/link", origen: "tiktok-bio", entrada: true, referrer: "https://www.tiktok.com/x" }),
    { sitio: "web", pagina: "/link", origen: "tiktok-bio", entrada: true, referente: "www.tiktok.com" });
  assert.deepEqual(cuerpoDeVista({ pagina: "/reportes", origen: "tiktok-bio", entrada: false, referrer: "https://astrea-charts.site/" }),
    { sitio: "web", pagina: "/reportes", origen: null, entrada: false, referente: null });
});

test("visitas: ?medir=no apaga y ?medir=si enciende; sin almacenamiento mide igual", () => {
  const s = memoria();
  assert.equal(medicionApagada("", s), false);
  assert.equal(medicionApagada("?medir=no", s), true);
  assert.equal(s.datos[CLAVE_NO_MEDIR], "1");
  assert.equal(medicionApagada("", s), true);
  assert.equal(medicionApagada("?medir=si", s), false);
  assert.equal(medicionApagada("", { getItem() { throw new Error("bloqueado"); } }), false);
});

test("visitas: avisarVista arma la URL del API y el cuerpo con el origen de la visita", () => {
  const envios = [];
  const enviar = (url, cuerpo) => { envios.push({ url, cuerpo }); return true; };
  assert.equal(avisarVista({ location: loc("?src=tiktok-bio", "/link"), referrer: "", storage: memoria(), nav: {}, tipoNavegacion: "navigate", enviar }), true);
  assert.equal(envios[0].url, "https://astrea-api-production.up.railway.app/api/v1/visitas");
  assert.deepEqual(envios[0].cuerpo, { sitio: "web", pagina: "/link", origen: "tiktok-bio", entrada: true, referente: null });
  avisarVista({ location: loc("", "/reportes"), referrer: "https://astrea-charts.site/link", storage: memoria(), nav: {}, tipoNavegacion: "navigate", enviar });
  assert.deepEqual(envios[1].cuerpo, { sitio: "web", pagina: "/reportes", origen: null, entrada: false, referente: null });
  avisarVista({ location: loc("", "/", "localhost"), referrer: "", storage: memoria(), nav: {}, enviar });
  assert.equal(envios[2].url, "http://127.0.0.1:8000/api/v1/visitas", "en local, al backend local");
});

test("visitas: ni navegadores automatizados ni quien pidió no ser medido", () => {
  const envios = [];
  const enviar = (url, cuerpo) => { envios.push(cuerpo); return true; };
  assert.equal(avisarVista({ location: loc(), referrer: "", storage: memoria(), nav: { webdriver: true }, enviar }), false);
  assert.equal(avisarVista({ location: loc("?medir=no"), referrer: "", storage: memoria(), nav: {}, enviar }), false);
  assert.equal(envios.length, 0);
});

test("visitas: sendBeacon con text/plain; sin sendBeacon, fetch con keepalive", async () => {
  const beacons = [];
  assert.equal(enviarVista("u", { a: 1 }, { sendBeacon: (url, blob) => { beacons.push({ url, blob }); return true; } }), true);
  assert.equal(beacons[0].blob.type, "text/plain;charset=utf-8");
  assert.equal(await beacons[0].blob.text(), '{"a":1}');
  const fetches = [];
  enviarVista("u", { a: 1 }, {}, (url, op) => { fetches.push(op); return Promise.reject(new Error("sin red")); });
  assert.equal(fetches[0].keepalive, true);
  assert.equal(enviarVista("u", { a: 1 }, {}, () => { throw new Error("roto"); }), false, "un error no sale de aquí");
});

test("visitas: las páginas que cargan origen.js también cuentan visitas", () => {
  const origen = readFileSync(new URL("../tienda-assets/origen.js", import.meta.url), "utf8");
  assert.match(origen, /avisarVista\(\{\s*location: window\.location/);
});
