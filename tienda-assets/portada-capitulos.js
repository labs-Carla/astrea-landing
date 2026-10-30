/**
 * Capítulos: hojas que se apilan al hacer scroll (la que entra llega inclinada
 * y la de abajo se oscurece) y el carrusel de reportes con el título enorme.
 */
import { animate } from "/tienda-assets/vendor/motion.min.js";
import { lenis } from "/tienda-assets/portada-vidrio.js";

// Sin esta clase la portada queda en secciones normales y los reportes en grilla.
document.body.classList.add("capitulos-vivos");

const quieto = matchMedia("(prefers-reduced-motion: reduce)").matches;
const ease = [0.23, 1, 0.32, 1];

// ---------- Hojas apiladas ----------
const hojas = [...document.querySelectorAll("[data-hoja]")];
let inicios = [];
function medir() {
  // Una hoja más alta que la pantalla se fija cuando su final llega abajo.
  for (const h of hojas) h.style.top = `${Math.min(0, innerHeight - h.offsetHeight - 10)}px`;
  // Posición natural de cada hoja (sin sticky): suma de las anteriores.
  let y = hojas[0] ? hojas[0].parentElement.offsetTop + 10 : 0;
  inicios = hojas.map((h) => { const top = y; y += h.offsetHeight + 10; return top; });
  apilar();
}
function apilar() {
  if (quieto) return;
  const y = scrollY;
  hojas.forEach((h, i) => {
    if (i === 0) return;
    // 0 = la hoja asoma por abajo; 1 = ya cubre la pantalla.
    const p = Math.min(1, Math.max(0, (y + innerHeight - inicios[i]) / innerHeight));
    h.style.transform = p >= 1 || p <= 0 ? "" : `translateY(${((1 - p) * 6).toFixed(2)}vh) rotate(${(-(1 - p) * 2.4).toFixed(2)}deg)`;
    const tapa = hojas[i - 1].querySelector(".hoja__tapa");
    // Arriba del todo la hoja siguiente ya asoma: la portada no se oscurece hasta que se baja.
    if (tapa) tapa.style.opacity = (p * 0.55 * Math.min(1, y / 240)).toFixed(3);
  });
}
medir();
addEventListener("resize", medir);
document.fonts?.ready.then(medir);
addEventListener("load", medir);
new ResizeObserver(() => requestAnimationFrame(medir)).observe(document.querySelector("main"));
if (lenis) lenis.on("scroll", apilar); else addEventListener("scroll", apilar, { passive: true });

// ---------- Carrusel de reportes ----------
const escena = document.querySelector("[data-totems]");
if (escena) {
  const tarjetas = [...escena.querySelectorAll(".tarjeta-portada")];
  const pastillas = [...document.querySelectorAll(".totems__pastilla")];
  const contador = document.querySelector("[data-totems-n]");
  const cajaPastillas = document.querySelector(".totems__pastillas");
  let actual = -1;

  function ir(i, dir = 1) {
    i = (i + tarjetas.length) % tarjetas.length;
    if (i === actual) return;
    if (actual >= 0) { tarjetas[actual].classList.remove("is-activa"); tarjetas[actual].inert = true; }
    const t = tarjetas[i];
    t.classList.add("is-activa");
    t.inert = false;
    const primera = actual < 0;
    actual = i;
    pastillas.forEach((p, k) => p.setAttribute("aria-pressed", String(k === i)));
    contador.textContent = String(i + 1);
    const p = pastillas[i];
    if (p && cajaPastillas.scrollWidth > cajaPastillas.clientWidth) {
      cajaPastillas.scrollTo({ left: p.offsetLeft - cajaPastillas.clientWidth / 2 + p.offsetWidth / 2, behavior: "smooth" });
    }
    if (quieto || primera) return;
    const img = t.querySelector(".tarjeta-portada__imagen");
    const titulo = t.querySelector(".tarjeta-portada__titulo");
    const resto = t.querySelectorAll(".tarjeta-portada__categoria, .tarjeta-portada__texto, .tarjeta-portada__pie");
    animate(img, {
      opacity: [0, 1],
      transform: [`perspective(1000px) translateX(${dir * 70}px) rotateY(${dir * -26}deg) scale(.92)`, "perspective(1000px) translateX(0px) rotateY(0deg) scale(1)"],
    }, { duration: 0.75, ease });
    animate(titulo, { opacity: [0, 1], clipPath: ["inset(0 0 100% 0)", "inset(0 0 0% 0)"] }, { duration: 0.7, delay: 0.08, ease });
    animate(resto, { opacity: [0, 1] }, { duration: 0.5, delay: 0.2, ease });
  }

  tarjetas.forEach((t) => { t.inert = true; });
  ir(0);
  pastillas.forEach((p, k) => p.addEventListener("click", () => ir(k, k >= actual ? 1 : -1)));
  document.querySelectorAll("[data-totems-paso]").forEach((b) =>
    b.addEventListener("click", () => { const d = Number(b.dataset.totemsPaso); ir(actual + d, d); }));
  document.querySelector("[data-totems-control]")?.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") { e.preventDefault(); ir(actual + 1, 1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); ir(actual - 1, -1); }
  });
  // Deslizar con el dedo o el mouse.
  let x0 = null;
  escena.addEventListener("pointerdown", (e) => { x0 = e.clientX; });
  escena.addEventListener("pointerup", (e) => {
    if (x0 === null) return;
    const dx = e.clientX - x0; x0 = null;
    if (Math.abs(dx) > 45) ir(actual + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
  });
}
