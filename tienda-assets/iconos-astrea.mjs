// Dibujos propios del home. Los pictogramas editoriales usan una cuadrícula de
// 64 unidades; los controles conservan 24 para legibilidad a tamaños pequeños.
const ICONOS = {
  "i-armilar": [64, `
    <circle cx="32" cy="26" r="21"/>
    <circle cx="32" cy="26" r="18" stroke-width=".65"/>
    <ellipse cx="32" cy="26" rx="9" ry="21" transform="rotate(27 32 26)"/>
    <ellipse cx="32" cy="26" rx="22" ry="7" transform="rotate(-22 32 26)"/>
    <path d="m14 38 36-24M32 2v5M32 45v5M29 48h6l2 7H27zM24 55h16v4H24zM20 61h24"/>
    <circle cx="32" cy="26" r="4" fill="currentColor" fill-opacity=".1"/>
    <path d="m17 13 2 2m25-2-2 2M11 26h4m34 0h4M17 40l2-2m25 2-2-2M28 56v2m4-2v2m4-2v2" stroke-width=".65"/>
  `],
  "i-pluma": [64, `
    <path d="M8 54h38a5 5 0 0 0 0-10H15V16a5 5 0 0 0-10 0h10M5 16v3h7M15 15h20M12 22v27a5 5 0 0 0 5 5M44 44v5a5 5 0 0 0 5 5"/>
    <path d="M24 42 51 8c-13 0-24 9-22 23M51 8c4 13-2 27-15 29M31 30l1-11m3 7 9-3m-5-4 1-6M20 48l7-10"/>
    <path d="M20 21h7m-7 5h4m-4 7h5m-5 5h3m-5 10h17M9 17v26M18 51h18" stroke-width=".65"/>
    <path d="m43 37 5 5 10-12"/>
  `],
  "i-pergamino": [64, `
    <path d="M9 16h38c7 0 11 5 11 10s-4 10-11 10H15C8 36 4 31 4 26s2-10 5-10ZM15 16c-5 0-8 5-8 10s3 10 8 10m32-20c-5 0-8 5-8 10s3 10 8 10"/>
    <ellipse cx="15" cy="26" rx="5" ry="7"/>
    <path d="M15 22c-4 0-4 8 0 8 3 0 3-5 0-5M31 16v9m-8 11-4 20 10-5 5 8 4-21m3-4 4 16-7-3-3 7"/>
    <circle cx="32" cy="33" r="9" fill="var(--ivory, #FBF8F2)"/>
    <circle cx="32" cy="33" r="6.5" stroke-width=".65"/>
    <path d="m32 28 1.4 3.5 3.6 1.5-3.6 1.4-1.4 3.6-1.4-3.6-3.6-1.4 3.6-1.5zM22 19h5m-5 3h5m25-2 2 3m-3 5-1 3m-25 9-2 9m19-9 1 5" stroke-width=".65"/>
  `],
  "i-espejo": [64, `
    <ellipse cx="32" cy="25" rx="17" ry="21"/>
    <ellipse cx="32" cy="25" rx="13.5" ry="17.5" stroke-width=".65"/>
    <path d="M28 46v5h8v-5m-6 5-2 9h8l-2-9M26 61h12M35 14c-6-1-11 4-10 10l-3 5 4 1v5c3 3 7 3 10 0m-1-21c5 3 5 9 2 13-2 3-2 5-1 8M28 23h3m-4 9h3"/>
    <path d="M11 40C5 31 5 22 9 16m2 19c-6 0-8-4-8-7 5 0 8 2 8 7Zm-3-9c-5-2-6-6-4-9 4 2 6 5 4 9Zm45 14c6-9 6-18 2-24m-2 19c6 0 8-4 8-7-5 0-8 2-8 7Zm3-9c5-2 6-6 4-9-4 2-6 5-4 9Z" stroke-width=".8"/>
  `],
  "i-astrolabio": [64, `
    <circle cx="32" cy="5" r="3.5"/>
    <circle cx="32" cy="33" r="25"/>
    <circle cx="32" cy="33" r="21" stroke-width=".7"/>
    <circle cx="32" cy="33" r="16" stroke-width=".7"/>
    <path d="M32 8v5m0 40v5M7 33h5m40 0h5M14 15l4 4m28 28 4 4m0-36-4 4M18 47l-4 4M22 10l1 4m18-4-1 4M9 23l4 1m38 18 4 1M9 43l4-1m38-18 4-1M22 56l1-4m18 4-1-4" stroke-width=".7"/>
    <path d="M17 40c2-13 10-21 20-21 8 0 11 7 7 14-3 5-12 8-18 5M17 40l12-4 7-12M18 47l28-28m-31 29 4 3 30-31-4-3z"/>
    <circle cx="32" cy="33" r="2.5" fill="var(--ivory, #FBF8F2)"/>
    <circle cx="26" cy="26" r="1" fill="currentColor" stroke="none"/>
    <circle cx="40" cy="39" r="1" fill="currentColor" stroke="none"/>
  `],
  "i-libro": [64, `
    <path d="M32 18c-7-6-16-9-27-6v39c11-3 20 0 27 6 7-6 16-9 27-6V12c-11-3-20 0-27 6Zm0 0v39M9 13v33c8-1 15 1 20 5m26-38v33c-8-1-15 1-20 5M3 17v38c11-3 21 0 29 6 8-6 18-9 29-6V17"/>
    <circle cx="19" cy="29" r="7"/>
    <ellipse cx="19" cy="29" rx="3" ry="7" transform="rotate(25 19 29)" stroke-width=".65"/>
    <path d="m13 33 12-8M39 23c4-2 8-3 12-2m-12 8c4-2 8-3 12-2m-12 8c4-2 8-3 12-2M13 41c4 0 8 1 12 3M39 41c4-2 8-3 12-2" stroke-width=".7"/>
  `],
  "i-nacimiento": [64, `
    <path d="M12 7h32l9 9v41H12ZM44 7v10h9M8 12H5v49h43v-4"/>
    <path d="M19 15h16m-16 5h10M18 35h28" stroke-width=".7"/>
    <path d="M21 35a11 11 0 0 1 22 0M32 20v4m-13 2 3 3m23-3-3 3M32 35v-7m-4 21h15m-23-5h23m-23 5h3"/>
    <circle cx="32" cy="35" r="3" fill="currentColor" fill-opacity=".1"/>
    <path d="M15 10v42m33-31v30M14 59h17" stroke-width=".6"/>
  `],
  "i-arrow": [24, '<path d="M3 12h17m-5-5 5 5-5 5"/><path d="m18 10 2 2-2 2" stroke-width=".6"/>'],
  "i-menu": [24, '<path d="M4 7h16M4 12h12M4 17h16"/><circle cx="19.5" cy="12" r=".6" fill="currentColor" stroke="none"/>'],
  "i-plus": [24, '<path d="M12 5v14M5 12h14"/><path d="M10 3h4M10 21h4M3 10v4M21 10v4" stroke-width=".7"/>'],
};

export function conIconosAstrea(sprite) {
  const alias = { "i-wheel": "i-astrolabio", "i-pages": "i-libro", "i-mail": "i-pergamino", "i-compass": "i-espejo", "i-orbita": "i-armilar", "i-loto": "i-espejo", "i-eye": "i-pluma" };
  const familia = { ...ICONOS, ...Object.fromEntries(Object.entries(alias).map(([id, original]) => [id, ICONOS[original]])) };
  for (const [id, [lado, trazos]] of Object.entries(familia)) {
    const simbolo = `<symbol id="${id}" viewBox="0 0 ${lado} ${lado}">${trazos}</symbol>`;
    const anterior = new RegExp(`<symbol id="${id}"[^>]*>[\\s\\S]*?<\\/symbol>`);
    sprite = anterior.test(sprite) ? sprite.replace(anterior, simbolo) : sprite.replace("</svg>", `${simbolo}</svg>`);
  }
  return sprite;
}

export function emblemaAstrea() {
  return `<svg viewBox="0 0 64 64" width="32" height="36" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ICONOS["i-armilar"][1]}</svg>`;
}
