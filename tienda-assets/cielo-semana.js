/**
 * Portada: banda «El cielo de esta semana». Trae la semana publicada del blog
 * (astrea-API, servida en /blog por el rewrite de Vercel) y completa título,
 * fechas, resumen, la rueda con el cielo real y el enlace de cada signo.
 * Si falla o todavía no hay semana publicada, queda la versión estática.
 */
const raiz = document.querySelector("[data-cielo-semana]");

async function cargar() {
  const respuesta = await fetch("/blog/horoscopo-semanal/portada.json", { headers: { Accept: "application/json" } });
  if (!respuesta.ok) return;
  const semana = await respuesta.json();
  const campo = (nombre) => raiz.querySelector(`[data-cs="${nombre}"]`);
  campo("eyebrow").textContent = `Almanaque semanal · Semana ${semana.numero}`;
  campo("rango").textContent = semana.rango;
  campo("titulo").textContent = semana.titulo;
  campo("resumen").textContent = semana.resumen;
  campo("url").href = semana.url;
  // SVG generado por astrea-API solo a partir de números y glifos fijos.
  campo("rueda").innerHTML = semana.rueda_svg;
  campo("rueda").querySelector(".rueda")?.classList.remove("rueda--noche");
  for (const s of semana.signos) {
    const enlace = raiz.querySelector(`[data-signo="${s.url.split("/").pop()}"]`);
    if (enlace) {
      enlace.href = s.url;
      enlace.title = s.titulo;
    }
  }
}

if (raiz) cargar().catch(() => {});
