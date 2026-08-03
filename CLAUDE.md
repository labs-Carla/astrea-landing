# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Astrea Charts — a static marketing/product site (Spanish) for a paid natal-chart astrology reading. There is no build system, no bundler, no package manager, and no test suite: it's plain HTML/CSS/JS files deployed as-is to Vercel. Open files directly in a browser, or serve the directory with any static file server, to preview changes.

Config: `vercel.json` sets `cleanUrls: true` and rewrites `/r/:token`, `/admin`, and `/assets/:path*` to a separate app, `astrea-informe-react` (a different repo — not present here).

## Backend

All dynamic behavior talks to an external API at `https://astrea-api-production.up.railway.app/api/v1` (hardcoded as `API_BASE` at the top of every script that needs it — there is no shared config file, so if the API base ever changes it must be updated in each file individually: `home.html`, `carta.html`, `gracias.html`, `reporte.js`, `reporte-impresion.js`).

Key endpoints used:
- `POST /carta-natal/resumen` — free/teaser chart summary (used by `home.html`'s free-chart form and `carta.html`)
- `POST /carta-natal/data` — full chart data for the premium report (used by `reporte.js` and `reporte-impresion.js`)
- `POST /carta-natal/compra` — submits buyer's birth data after a Hotmart purchase (used by `gracias.html`, called directly — no longer goes through Google Sheets)

Payment is handled by Hotmart (external checkout links, e.g. `index.html`/`home.html` CTAs); there is no in-repo payment/checkout code.

## Page flow

- `index.html` → short landing page linking to `home.html` (free chart generator) and the Hotmart checkout for the paid reading.
- `home.html` → main landing page; includes a free-chart form that POSTs to `/carta-natal/resumen` and renders a teaser (big three, element balance) inline via `rueda-natal.js`.
- `carta.html` → similar free-chart result page, also calls `/carta-natal/resumen`.
- `gracias.html` → post-purchase "thank you" page (linked from Hotmart after payment); collects birth data and POSTs to `/carta-natal/compra`.
- `reporte.html` + `reporte.js` → renders the full paid report in-browser from URL query params (`nombre`, `fecha_hora_local`, `ciudad`, `pais`), fetched via `/carta-natal/data`.
- `reporte-impresion.html` + `reporte-impresion.js` → a print-optimized near-duplicate of `reporte.html`, used to generate the PDF version of the report (e.g. via headless browser/print-to-PDF). When changing report rendering/content, **check whether the same change is needed in both `reporte.js` and `reporte-impresion.js`** — they are two independent implementations that must be kept in sync manually.
- `privacidad.html` → static privacy policy page.
- `ejemplo.html` → standalone example/demo page (Tailwind via CDN, unlike the rest of the site).
- `libro-muestra.html` + `componentes/libro-muestra.js` → standalone prototype of a 3D interactive "book" (Three.js, loaded from `unpkg.com`) used as a visual teaser of the report on the landing. Not wired into the real report delivery, which is still PDF-based. This is the current work-in-progress area (`feature/libro` branch).

## Shared rendering logic

- `rueda-natal.js` — generates the astrological wheel as an inline SVG string (`generarRuedaSVG(calculo)`), given a `calculo` object shaped like the API's `/carta-natal/resumen` or `/carta-natal/data` response (`{ planetas, casas, puntos_angulares, aspectos }`). Included via `<script>` tag (not a module) by `home.html`, `reporte.js`/`reporte-impresion.js`.
- Planet/sign symbol maps (`SIMBOLOS`, `SIGNOS`) are duplicated across `reporte.js`, `reporte-impresion.js`, `home.html`, and `rueda-natal.js` rather than shared — expect to update all copies when astrological symbol sets change.
- Astrological calculations (Swiss Ephemeris) happen entirely server-side; nothing in this repo computes chart positions.

## Styling conventions

- No CSS framework (except `ejemplo.html`, which uses Tailwind CDN as an outlier). Styling is a mix of inline `style` attributes and `<style>` blocks per page.
- Brand palette: dark navy background (`#0B1220`), cream text (`#F4EEDF`), gold accent (`#D4B172` / gradient `#E6CB98`→`#D4B172`), serif display font `Cormorant Garamond` for headings, `DM Sans` for body text — loaded from Google Fonts per-page.
- Background texture image: `assets/fondo.png`.
