/**
 * Footer: «ASTREA» se dibuja letra por letra al entrar y una luz de oro lo rellena.
 * Con mouse la luz sigue al puntero; en pantallas táctiles la recorre sola mientras
 * se ve. Sin dependencias: este módulo carga en todas las páginas de la tienda.
 */
const caja = document.querySelector("[data-pie-gigante]");
const luz = caja?.querySelector("[data-pie-luz]");
const quieto = matchMedia("(prefers-reduced-motion: reduce)").matches;
const tactil = !matchMedia("(hover: hover)").matches;
const ANCHO = 1200, ALTO = 232, DESDE = -400, HASTA = 1600;

let barrido = 0;
function pararLuz() { cancelAnimationFrame(barrido); barrido = 0; }
function pasarLuz(delay = 0) {
  pararLuz();
  const inicio = performance.now() + delay;
  const duracion = tactil ? 5200 : 2400;
  const paso = (t) => {
    let p = Math.max(0, t - inicio) / duracion;
    // En táctil va y vuelve; con mouse cruza una sola vez.
    if (tactil) { p %= 2; if (p > 1) p = 2 - p; } else p = Math.min(1, p);
    luz.setAttribute("cx", (DESDE + (HASTA - DESDE) * (1 - Math.cos(Math.PI * p)) / 2).toFixed(1));
    barrido = tactil || p < 1 ? requestAnimationFrame(paso) : 0;
  };
  barrido = requestAnimationFrame(paso);
}

function seguirCursor() {
  let x = DESDE, y = ALTO / 2, ax = x, ay = y, raf = 0;
  const seguir = () => {
    x += (ax - x) * 0.14; y += (ay - y) * 0.14;
    luz.setAttribute("cx", x.toFixed(1)); luz.setAttribute("cy", y.toFixed(1));
    raf = Math.abs(ax - x) + Math.abs(ay - y) > 0.5 ? requestAnimationFrame(seguir) : 0;
  };
  const arrancar = () => {
    if (raf) return;
    // Sigue desde donde esté la luz, aunque venga del barrido de entrada.
    pararLuz();
    x = Number(luz.getAttribute("cx")); y = Number(luz.getAttribute("cy"));
    raf = requestAnimationFrame(seguir);
  };
  caja.addEventListener("pointermove", (e) => {
    const r = caja.querySelector("svg").getBoundingClientRect();
    ax = ((e.clientX - r.left) / r.width) * ANCHO;
    ay = ((e.clientY - r.top) / r.height) * ALTO;
    arrancar();
  });
  caja.addEventListener("pointerleave", () => { ax = ax < ANCHO / 2 ? DESDE : HASTA; arrancar(); });
}

// El trazo no escala con el SVG (non-scaling-stroke), así que el guion va en píxeles de pantalla.
function prepararTrazos() {
  const escala = caja.querySelector("svg").getBoundingClientRect().width / ANCHO;
  const trazos = [...caja.querySelectorAll(".pie__gigante-trazo path")].map((path) => ({ path, largo: path.getTotalLength() * escala }));
  for (const { path, largo } of trazos) {
    path.style.strokeDasharray = `${largo} ${largo}`;
    path.style.strokeDashoffset = String(largo);
  }
  return () => trazos.forEach(({ path, largo }, i) => {
    const a = path.animate([{ strokeDashoffset: largo }, { strokeDashoffset: 0 }], { duration: 1500, delay: i * 110, easing: "ease-in-out", fill: "both" });
    a.finished.then(() => { a.cancel(); path.style.removeProperty("stroke-dasharray"); path.style.removeProperty("stroke-dashoffset"); });
  });
}

export function iniciarPie() {
  if (!luz || quieto) return;
  const dibujar = caja.getBoundingClientRect().top >= innerHeight ? prepararTrazos() : null;
  let entro = false;
  const obs = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) { if (tactil) pararLuz(); return; }
    if (entro) { if (tactil) pasarLuz(); return; }
    entro = true;
    dibujar?.();
    pasarLuz(dibujar ? 1100 : 0);
    if (!tactil) obs.disconnect();
  }, { rootMargin: "0px 0px -8% 0px" });
  obs.observe(caja);
}

if (luz) {
  // Sin movimiento, la palabra queda en oro y quieta.
  if (quieto) { luz.setAttribute("cx", String(ANCHO / 2)); luz.setAttribute("r", "900"); }
  else if (!tactil) seguirCursor();
  // En la portada lo arranca portada-vidrio.js, después de la captura de liquidGL.
  if (!document.body.classList.contains("capitulos")) iniciarPie();
}
