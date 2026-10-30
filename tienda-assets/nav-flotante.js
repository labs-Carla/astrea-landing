// Menú flotante: el logo se esconde al bajar y vuelve arriba del todo.
const header = document.querySelector(".site-header");
const logo = header?.querySelector(".alm-marca");
if (logo) {
  let oculto = false;
  const actualizar = () => {
    const abajo = scrollY >= 80;
    if (abajo === oculto) return;
    oculto = abajo;
    header.classList.toggle("logo-oculto", abajo);
    logo.setAttribute("aria-hidden", String(abajo));
    logo.tabIndex = abajo ? -1 : 0;
  };
  addEventListener("scroll", actualizar, { passive: true });
  actualizar();
}
