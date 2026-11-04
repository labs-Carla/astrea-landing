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

// Selector ES | EN: sin JS es un enlace a la página equivalente del otro idioma. Con JS,
// además guarda la elección (astrea_idioma, la misma clave de la app) y conserva la
// búsqueda y el fragmento (?cupon=, #generador…).
for (const enlace of document.querySelectorAll(".selector-idioma a[data-idioma]")) {
  enlace.addEventListener("click", (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    try { localStorage.setItem("astrea_idioma", enlace.dataset.idioma); } catch { /* sin almacenamiento */ }
    if (enlace.getAttribute("aria-current")) { e.preventDefault(); return; }
    const destino = new URL(enlace.href, location.href);
    if (destino.origin === location.origin && !destino.search && !destino.hash) {
      e.preventDefault();
      location.assign(destino.pathname + location.search + location.hash);
    }
  });
}
