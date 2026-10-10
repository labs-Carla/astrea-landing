/**
 * Astrea · Portada — video de la escena del hero (atardecer que cae en noche).
 *
 * Mejora progresiva: la panorámica ya está en pantalla y es lo que ve quien
 * no tiene JavaScript, usa un celular, pidió reducir el movimiento o ahorrar
 * datos (ahí el video ni se descarga). En escritorio el video se reproduce
 * una vez, sin sonido, se funde sobre la imagen al empezar y se queda en su
 * último cuadro. Si el navegador no puede reproducirlo, queda la imagen.
 */
const escena = document.querySelector("[data-video]");
const escritorio = window.matchMedia("(min-width: 860px)").matches;
const menosMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const ahorroDeDatos = Boolean(navigator.connection && navigator.connection.saveData);

if (escena && escritorio && !menosMovimiento && !ahorroDeDatos) {
  const video = document.createElement("video");
  video.className = "escena__video";
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  for (const atributo of ["muted", "playsinline", "autoplay"]) video.setAttribute(atributo, "");
  video.setAttribute("aria-hidden", "true");
  video.setAttribute("tabindex", "-1");
  video.src = escena.dataset.video;
  video.addEventListener("playing", () => video.classList.add("is-visible"), { once: true });
  video.addEventListener("error", () => video.remove(), { once: true });
  escena.querySelector(".escena__fondo").append(video);
  const intento = video.play();
  if (intento && typeof intento.catch === "function") intento.catch(() => video.remove());
}
