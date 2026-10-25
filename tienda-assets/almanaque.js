// El contenido y la navegación siguen disponibles sin JavaScript.
const menu = document.querySelector(".alm-header .menu-movil");
if (menu) {
  const cerrar = () => { menu.open = false; };
  menu.addEventListener("click", (evento) => {
    if (evento.target.closest("a")) cerrar();
  });
  document.addEventListener("click", (evento) => {
    if (!menu.contains(evento.target)) cerrar();
  });
  document.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape" && menu.open) {
      cerrar();
      menu.querySelector("summary").focus();
    }
  });
}

// En móvil, el signo de la página queda visible sin desplazar el documento.
const lista = document.querySelector("[data-signo-actual]");
const actual = lista?.querySelector('[aria-current="page"]');
if (actual && lista.scrollWidth > lista.clientWidth) {
  lista.scrollLeft = actual.offsetLeft - lista.offsetLeft - (lista.clientWidth - actual.offsetWidth) / 2;
}
