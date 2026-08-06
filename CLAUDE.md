# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Astrea Charts — a static marketing/landing site for an astrology (natal chart) product. No build step, no
package manager, no framework: plain HTML/CSS/JS files deployed directly to Vercel. There is no local dev
server config beyond Vercel's static hosting; open the HTML files directly or serve the directory with any
static file server to preview changes.

## Deployment

Deployed on Vercel. `vercel.json` redirects the root (`/`) to `/link` (307, temporary — this is a
transitional funnel setup, see below) and defines proxy rewrites to a separate backend/admin app
(`astrea-informe-react.vercel.app`):
- `/r/:token` and `/admin` → proxied to the React admin/report app
- `/assets/:path*` → proxied so that app's CSS/JS assets load correctly

There's no CI/test/lint tooling in this repo — changes are verified by opening the HTML in a browser and
pushing to trigger a Vercel deploy.

## Backend

All dynamic behavior calls a separate FastAPI-style backend directly from client-side JS:

```
const API_BASE = "https://astrea-api-production.up.railway.app/api/v1";
```

Key endpoints used across the site:
- `POST /carta-natal/resumen` — free/teaser natal chart summary (used on `link-gratis.html`, `carta.html`)
- `POST /carta-natal/compra` — submits full purchase/report request data (used on `gracias.html`, replaces a
  previous Google Sheets integration — keep it calling the API directly, don't reintroduce a Sheets webhook)
- `POST /carta-natal/data` — full report payload consumed by the web report renderers (`reporte.js`,
  `reporte-impresion.js`)

Every page that talks to the API duplicates its own `API_BASE` constant and its own fetch/error-handling
logic — there's no shared JS module or build pipeline, so when changing an endpoint contract, grep for
`API_BASE` and update every page that embeds it (`link-gratis.html`, `carta.html`, `gracias.html`, `reporte.js`,
`reporte-impresion.js`).

## Funnel / page map

The pages form a marketing → free-teaser → purchase → report funnel. They are independent HTML documents,
each with inline `<style>` and inline `<script>` (except the two report pages, which pull in external `.js`
files):

- `link.html` (served at `/link`, the site root redirects here) — Linktree-style entry page (light/gold
  theme), stage 2 of the "Astrea funnel": logo, tagline, three link cards (premium product on Hotmart,
  free chart at `/link-gratis`, and a `/proximamente` placeholder for the not-yet-built full site), plus a
  TikTok/WhatsApp icon row. No FAQ here — it lives on `/link-gratis`.
- `link-gratis.html` (served at `/link-gratis`, formerly `home.html`) — longer landing page variant with
  its own CSS custom properties (`--gold`, `--cream`, etc., now a light/gold palette instead of the
  original dark theme), the free-summary form (`#form-gratis` / `#natalFormGratis` → `/carta-natal/resumen`),
  the FAQ section (merged from the old `index.html` + `home.html` FAQs), and a "share your Big Three" card
  generated client-side with `html2canvas` and downloaded as a PNG — that card intentionally keeps its own
  hardcoded dark navy/gold colors (`#0B1220`/`#F4EEDF`/`#D4B172`), independent of the page's light theme,
  since the JS captures it with a hardcoded dark `backgroundColor`.
- `proximamente.html` (served at `/proximamente`) — placeholder for the future redesigned main site (stage
  3 of the funnel, not built yet); links back to `/link` and `/link-gratis`.
- `carta.html` — standalone "generate your free chart" page; duplicates the `#natalFormGratis` flow and
  html2canvas share-card logic from `link-gratis.html`. Still on the original dark theme (not reskinned).
- `gracias.html` — post-purchase data-collection form (name, birth date/time, city, country) that POSTs to
  `/carta-natal/compra`.
- `reporte.html` + `reporte.js` — web view of the paid report, reads chart params from the URL query string
  (`nombre`, `fecha_hora_local`, `ciudad`, `pais`), POSTs to `/carta-natal/data`, and renders the report as a
  sequence of `render*()` section functions (portada, rueda natal, elementos/dignidades, planetas, aspectos,
  casas, conclusión, etc.).
- `reporte-impresion.html` + `reporte-impresion.js` — print-oriented ("paper theme") version of the same
  report, intended for admin use via Ctrl+P. Structured as 15 collapsible chapters (`<details>/<summary>`,
  built with `capituloWrapper()`) rather than the flowing sections in `reporte.js`. Has its own parallel copy
  of rendering logic — the two report renderers are **not** shared code, so a fix in one (e.g. wording,
  symbol table, aspect calculation) usually needs to be ported to the other by hand.
- `rueda-natal.js` — shared SVG natal-wheel generator (`generarRuedaSVG(calculo)`), used by both report
  renderers. Takes the same `calculo` shape returned by `/carta-natal/resumen` or `/pdf`
  (`{ planetas, casas, puntos_angulares, aspectos }`).
- `ejemplo.html`, `privacidad.html` — example/sample page and privacy policy, static content only.

## Conventions worth knowing

- Two visual themes currently coexist in the repo: the original dark navy/gold theme (`carta.html`,
  `gracias.html`, `reporte.html`, `reporte-impresion.html`) and a newer light cream/gold theme (`link.html`,
  `link-gratis.html`, `proximamente.html`), part of an in-progress funnel redesign. Don't assume one global
  palette — check which theme a given page uses before reusing colors/CSS across files.
- Astrological symbol tables (`SIMBOLOS`, sign lists, Roman numeral house labels) are duplicated across
  `reporte.js`, `reporte-impresion.js`, and `rueda-natal.js` — keep them in sync if adding/renaming a body or
  changing a glyph.
- Astrological glyphs are suffixed with `︎` (text variation selector) to force text-style rendering
  instead of color-emoji rendering, which some browsers (notably on Windows) apply by default. Preserve this
  suffix when touching symbol strings.
- Copy is in Spanish (Latin American Spanish, informal "tú"); keep new user-facing text consistent with the
  existing tone.
- Report renderers build large HTML strings via template literals and inject with `innerHTML` — there is no
  templating engine or sanitization layer, so any new field coming from the API response should be treated
  as trusted backend output, not user input, when interpolated raw.
