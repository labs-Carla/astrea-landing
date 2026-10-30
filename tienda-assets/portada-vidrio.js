/**
 * Portada: Lenis (scroll suave) + Motion (entradas y hover) + liquidGL
 * (vidrio líquido WebGL en las tres islas del header y en el dock del recorrido).
 *
 * Orden importante: liquidGL refracta una CAPTURA de la página, así que la
 * captura se toma con todo visible y recién después (on.init) se ocultan los
 * bloques que entran con Motion al hacer scroll.
 */
import Lenis from "/tienda-assets/vendor/lenis.min.js";
import { animate, inView } from "/tienda-assets/vendor/motion.min.js";
import { animate as anime, svg, stagger, utils } from "/tienda-assets/vendor/anime.min.js";
import { iniciarPie } from "/tienda-assets/pie-gigante.js";

const quieto = matchMedia("(prefers-reduced-motion: reduce)").matches;
// Curvas de animations.dev (Emil Kowalski): salida rápida, llegada suave.
const ease = [0.23, 1, 0.32, 1];
const dock = document.querySelector("[data-embudo-dock]");

// ---------- Lenis ----------
// Sin autoRaf: el bucle lo lleva liquidGL.syncWith (o el nuestro si no hay WebGL).
export const lenis = quieto ? null : new Lenis({ autoRaf: false, lerp: 0.09, anchors: { offset: -96 } });
let bucleLenis = 0;
const bucle = (t) => { lenis.raf(t); bucleLenis = requestAnimationFrame(bucle); };
if (lenis) bucleLenis = requestAnimationFrame(bucle);

// ---------- Pantalla de carga: la carta natal gira y se abre (una vez por sesión) ----------
async function correrIntro() {
  // Quién la ve lo decide un script en línea junto a la pantalla; aquí solo se anima.
  const intro = document.querySelector("[data-intro]");
  if (!intro || intro.hidden) return;
  // Con la red lenta no se hace esperar a quien ya está mirando.
  if (quieto || performance.now() > 3000) { intro.hidden = true; return; }
  lenis?.stop();
  try {
    const carta = intro.querySelector(".intro__carta");
    await animate(carta, { opacity: [0, 1], transform: ["rotateY(-80deg) scale(.85)", "rotateY(0deg) scale(1)"] }, { duration: 0.55, ease }).finished;
    await animate(carta, { transform: ["rotateY(0deg)", "rotateY(360deg)"] }, { duration: 0.8, ease: [0.65, 0, 0.35, 1] }).finished;
    const r = carta.getBoundingClientRect();
    const escala = Math.max(innerWidth / r.width, innerHeight / r.height) * 1.08;
    await animate(carta, { transform: ["scale(1)", `scale(${escala.toFixed(2)})`], borderRadius: ["8px", "0px"] }, { duration: 0.6, ease: [0.76, 0, 0.24, 1] }).finished;
    await animate(intro, { opacity: [1, 0] }, { duration: 0.35, ease }).finished;
  } catch (e) {
    console.warn("La pantalla de carga no pudo animarse.", e);
  }
  intro.hidden = true;
  lenis?.start();
}

// ---------- Entrada del hero (después de la carga, antes de la captura) ----------
const heroCopia = [...document.querySelectorAll(".hero-atlas__copy > *")];
const heroListo = correrIntro().then(() => quieto
  ? undefined
  : Promise.all(heroCopia.map((el, i) =>
      animate(el, { opacity: [0, 1], transform: ["translateY(18px)", "none"] }, { duration: 0.9, delay: 0.08 * i, ease }).finished,
    )));

// ---------- Hover con resorte en los botones de metal ----------
if (!quieto) {
  for (const btn of document.querySelectorAll(".btn-metal")) {
    // Hover sutil y presión a 0,97: el botón responde sin exagerar.
    const resorte = { type: "spring", stiffness: 500, damping: 30 };
    btn.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") animate(btn, { scale: 1.02 }, resorte); });
    btn.addEventListener("pointerleave", () => animate(btn, { scale: 1 }, resorte));
    btn.addEventListener("pointerdown", () => animate(btn, { scale: 0.97 }, { duration: 0.1, ease }));
    btn.addEventListener("pointerup", () => animate(btn, { scale: 1 }, resorte));
  }
}

// ---------- Revelado al hacer scroll (después de la captura) ----------
const GRUPOS = [
  ".confianza__lista > li",
  "#recorrido .capitulo__cabecera", "#recorrido .paso",
  "#reportes .capitulo__cabecera",
  // Sin el carrusel de capítulos, las tarjetas también entran al bajar.
  ...(document.querySelector("[data-totems]") ? [] : ["#reportes .tarjeta-portada"]),
  "#como-funciona .capitulo__cabecera", "#como-funciona .paso",
  ".cielo-semana__texto", ".cielo-semana__rueda", ".cielo-semana__cabecera-signos", ".zodiaco > li",
  "#preguntas .capitulo__cabecera", "#preguntas .accordion > details",
  ".pie__gigante", ".pie__grid > *", ".pie__legal",
];
function prepararRevelado() {
  if (quieto) return;
  for (const selector of GRUPOS) {
    const els = [...document.querySelectorAll(selector)];
    els.forEach((el, i) => {
      // Lo que ya está en pantalla no se oculta (evita parpadeo).
      if (el.getBoundingClientRect().top < innerHeight * 0.92) return;
      el.style.opacity = "0";
      el.style.transform = "translateY(28px)";
      inView(el, () => {
        const a = animate(el, { opacity: [0, 1], transform: ["translateY(28px)", "none"] },
          { duration: 0.85, delay: Math.min(i % 4, 3) * 0.08, ease });
        // Devuelve el control al CSS (hover de las tarjetas usa transform).
        a.finished.then(() => { el.style.removeProperty("transform"); el.style.removeProperty("opacity"); });
      }, { margin: "0px 0px -8% 0px" });
    });
  }
}

// ---------- Dock del embudo ----------
const pasos = dock ? [...dock.querySelectorAll("[data-paso]")] : [];
let dockVisible = false;
function mostrarDock(visible) {
  if (!dock || visible === dockVisible) return;
  dockVisible = visible;
  const fuera = "translateY(calc(100% + 40px))";
  animate(dock, { transform: visible ? [fuera, "translateY(0px)"] : ["translateY(0px)", fuera] },
    quieto ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 30 });
}
function pasoActivo(n) {
  pasos.forEach((a) => {
    const activo = a.dataset.paso === String(n);
    a.classList.toggle("is-activo", activo);
    if (activo) a.setAttribute("aria-current", "step"); else a.removeAttribute("aria-current");
  });
}
pasoActivo(1);
const hero = document.querySelector(".hero");
const reportes = document.querySelector("#reportes");
const pie = document.querySelector(".pie");
function alHacerScroll() {
  const y = scrollY;
  const finHero = hero ? hero.offsetTop + hero.offsetHeight * 0.6 : 400;
  const enPie = pie ? pie.getBoundingClientRect().top < innerHeight * 0.85 : false;
  mostrarDock(y > finHero && !enPie);
  if (reportes) pasoActivo(reportes.getBoundingClientRect().top < innerHeight * 0.6 ? 2 : 1);
}
if (lenis) lenis.on("scroll", alHacerScroll); else addEventListener("scroll", alHacerScroll, { passive: true });
alHacerScroll();

// ---------- anime.js: la rueda del zodíaco se dibuja al entrar ----------
function dibujarRueda() {
  const rueda = document.querySelector(".cielo-semana .rueda");
  if (!rueda || quieto || rueda.getBoundingClientRect().top < innerHeight) return;
  const trazos = svg.createDrawable(rueda.querySelectorAll(".rueda__aro, .rueda__division, .rueda__marca"));
  const signos = rueda.querySelectorAll(".rueda__signo, .rueda__estrella");
  utils.set(trazos, { draw: "0 0" });
  utils.set(signos, { opacity: 0 });
  inView(rueda, () => {
    anime(trazos, { draw: ["0 0", "0 1"], duration: 1400, delay: stagger(6), ease: "outExpo" });
    anime(signos, { opacity: [0, 1], scale: [0.6, 1], duration: 600, delay: stagger(60, { start: 500 }), ease: "outBack(1.4)" });
  }, { margin: "0px 0px -15% 0px" });
}

// ---------- liquidGL ----------
// Vidrio de Dock de macOS: esmerilado, centro limpio y canto que refracta.
const VIDRIO = {
  header: { refraction: 0.006, bevelDepth: 0.07, bevelWidth: 0.18, frost: 12, aberration: 0, tint: null },
  dock: { refraction: 0.01, bevelDepth: 0.09, bevelWidth: 0.2, frost: 10, aberration: 0, tint: null },
};

// liquidGL captura la página entera: en teléfonos, o sin GPU real, puede congelarla (medido a 4x
// de CPU: dejó de responder). Ahí se queda el vidrio CSS, y la librería ni se descarga.
function puedeVidrioWebGL() {
  if (!matchMedia("(hover: hover) and (pointer: fine) and (min-width: 1100px)").matches) return false;
  const gl = document.createElement("canvas").getContext("webgl2");
  if (!gl) return false;
  const info = gl.getExtension("WEBGL_debug_renderer_info");
  return !/swiftshader|llvmpipe|software|basic render/i.test(info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : "");
}

async function iniciarVidrio() {
  await Promise.all([heroListo, document.fonts.ready, new Promise((r) => (document.readyState === "complete" ? r() : addEventListener("load", r, { once: true })))]);
  let listo = false;
  const terminar = () => { if (listo) return; listo = true; prepararRevelado(); dibujarRueda(); iniciarPie(); };
  // Si la captura no llega (sin WebGL, error), la página sigue funcionando.
  setTimeout(terminar, 4000);
  if (!puedeVidrioWebGL()) { terminar(); return; }
  try {
    const { default: liquidGL } = await import("/tienda-assets/vendor/liquidgl.min.js");
    const comun = { engine: "webgl2", snapshot: "body", resolution: Math.min(devicePixelRatio || 1, 1.5), zIndex: 50, shadow: true, specular: true, reveal: "fade" };
    // Todas las lentes con el mismo zIndex comparten el lienzo de liquidGL.
    liquidGL({ ...comun, ...VIDRIO.dock, target: ".embudo-dock" });
    liquidGL({
      ...comun, ...VIDRIO.header, target: ".site-header .isla-nav",
      on: {
        init() {
          document.body.classList.add("lgl-listo");
          terminar();
        },
      },
    });
    // Las hojas de capítulo se mueven (sticky): liquidGL las dibuja en su posición real.
    if (document.querySelector("[data-hoja]")) liquidGL.registerDynamic([...document.querySelectorAll("[data-hoja]")]);
    if (lenis) {
      cancelAnimationFrame(bucleLenis);
      liquidGL.syncWith({ lenis });
    }
  } catch (e) {
    console.warn("liquidGL no pudo iniciar; queda el vidrio CSS.", e);
    terminar();
  }
}
iniciarVidrio();
