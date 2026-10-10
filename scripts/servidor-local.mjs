#!/usr/bin/env node
/**
 * Servidor estático local que imita a Vercel en lo que importa para probar la
 * tienda: cleanUrls (/reportes -> reportes.html), los redirects de vercel.json
 * y la página por defecto (/ -> index.html). Las rewrites a astrea-informe-react
 * (/r/:token, /admin) no se sirven en local.
 *
 *   node scripts/servidor-local.mjs [puerto=5500]
 *
 * 5500 está en los CORS por defecto del backend, así que la tienda local puede
 * crear órdenes reales contra el backend local (http://127.0.0.1:8000).
 */
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname, normalize, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const PUERTO = Number(process.argv[2] || 5500);
const TIPOS = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".webp": "image/webp", ".png": "image/png", ".svg": "image/svg+xml", ".xml": "application/xml", ".txt": "text/plain; charset=utf-8", ".json": "application/json" };
const vercel = JSON.parse(await readFile(join(RAIZ, "vercel.json"), "utf8"));

async function existe(ruta) { try { return (await stat(ruta)).isFile(); } catch { return false; } }

createServer(async (req, res) => {
  const url = new URL(req.url, "http://local");
  const redir = (vercel.redirects || []).find((r) => r.source === url.pathname);
  if (redir) { res.writeHead(redir.permanent ? 308 : 307, { Location: redir.destination }); return res.end(); }

  const limpia = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, "");
  const candidatos = limpia.endsWith("/") ? [join(limpia, "index.html")] : [limpia, `${limpia}.html`];
  for (const c of candidatos) {
    const archivo = join(RAIZ, c);
    if (!archivo.startsWith(RAIZ)) break;
    if (await existe(archivo)) {
      res.writeHead(200, { "Content-Type": TIPOS[extname(archivo)] || "application/octet-stream", "Cache-Control": "no-store" });
      return res.end(await readFile(archivo));
    }
  }
  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("404");
}).listen(PUERTO, "127.0.0.1", () => console.log(`Tienda local en http://127.0.0.1:${PUERTO}`));
