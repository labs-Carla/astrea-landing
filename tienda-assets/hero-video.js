// Video del hero de la portada (la escultura de Astrea canta).
// - Arranca sin sonido (los navegadores no permiten sonido automático); el botón
//   «Escuchar» lo activa desde el inicio y «Silenciar» lo vuelve a apagar.
// - Con «reducir movimiento» queda quieto en su primer fotograma, salvo que la
//   persona pida escucharlo.
// - Fuera de pantalla se pausa (y deja de sonar), para no gastar batería ni CPU.
const video = document.querySelector("[data-hero-video]");
const boton = document.querySelector("[data-hero-sonido]");

if (video) {
  const quieto = window.matchMedia("(prefers-reduced-motion: reduce)");
  let visible = true;
  const conSonido = () => !video.muted;
  const debeReproducir = () => visible && (!quieto.matches || conSonido());

  const actualizar = () => {
    if (debeReproducir()) video.play().catch(() => {});   // si el navegador lo impide, se ve el poster
    else video.pause();
  };

  if (quieto.matches) { video.removeAttribute("autoplay"); video.pause(); video.currentTime = 0; }
  actualizar();
  quieto.addEventListener?.("change", actualizar);

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([entrada]) => { visible = entrada.isIntersecting; actualizar(); }, { threshold: 0.1 }).observe(video);
  }

  if (boton) {
    const texto = boton.querySelector("[data-hero-sonido-texto]");
    const pintar = () => {
      boton.setAttribute("aria-pressed", String(conSonido()));
      texto.textContent = conSonido() ? "Silenciar" : "Escuchar";
      boton.setAttribute("aria-label", conSonido() ? "Silenciar la voz de Astrea" : "Escuchar la voz de Astrea");
    };
    boton.addEventListener("click", () => {
      if (video.muted) {
        video.muted = false;
        video.currentTime = 0;                              // la canción, desde el principio
      } else {
        video.muted = true;
      }
      pintar();
      actualizar();
    });
    pintar();
    boton.hidden = false;                                   // sin JavaScript no hay botón que no funcione
  }
}
