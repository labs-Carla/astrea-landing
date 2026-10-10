/**
 * Astrea · Navegación de vidrio: gana opacidad al hacer scroll (.is-scrolled)
 * para leerse sobre las secciones claras. Sin JavaScript queda la versión base.
 */
const header = document.querySelector(".site-header--tienda");
if (header) {
  const actualizar = () => header.classList.toggle("is-scrolled", window.scrollY > 24);
  actualizar();
  window.addEventListener("scroll", actualizar, { passive: true });
}
