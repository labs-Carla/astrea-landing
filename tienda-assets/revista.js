// Revista: flechas del carrusel de apertura y «Cargar más». Sin JS se ve todo:
// el carrusel se desliza a mano y los artículos ocultos solo se esconden desde aquí.
const carrusel = document.querySelector("[data-carrusel]");
if (carrusel) {
  const mover = (lado) => {
    const paso = carrusel.firstElementChild?.getBoundingClientRect().width || carrusel.clientWidth;
    const fin = carrusel.scrollLeft + carrusel.clientWidth >= carrusel.scrollWidth - 8;
    if (lado > 0 && fin) carrusel.scrollTo({ left: 0, behavior: "smooth" });
    else carrusel.scrollBy({ left: lado * paso, behavior: "smooth" });
  };
  document.querySelector("[data-carrusel-prev]")?.addEventListener("click", () => mover(-1));
  document.querySelector("[data-carrusel-next]")?.addEventListener("click", () => mover(1));
}

const lista = document.querySelector("[data-articulos]");
const boton = document.querySelector("[data-cargar-mas]");
if (lista && boton) {
  const VISIBLES = 6;
  const tarjetas = [...lista.children];
  if (tarjetas.length > VISIBLES) {
    tarjetas.slice(VISIBLES).forEach((t) => { t.hidden = true; });
    boton.hidden = false;
    boton.addEventListener("click", () => {
      tarjetas.forEach((t) => { t.hidden = false; });
      boton.hidden = true;
    });
  }
}
