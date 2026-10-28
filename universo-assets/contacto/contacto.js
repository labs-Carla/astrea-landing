/* /contacto: cielo estrellado, revelado al bajar y botón de compartir. Sin dependencias. */
(function () {
  "use strict";
  document.documentElement.classList.add("js");
  var quieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Revelado de secciones
  var revelables = document.querySelectorAll(".revela");
  if (quieto || !("IntersectionObserver" in window)) {
    revelables.forEach(function (el) { el.classList.add("visible"); });
  } else {
    var obs = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("visible"); obs.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px" });
    revelables.forEach(function (el, i) {
      el.style.transitionDelay = (el.closest(".portada") ? i * 0.12 : 0) + "s";
      obs.observe(el);
    });
  }

  // Cielo: estrellas que titilan y alguna fugaz de vez en cuando
  var canvas = document.getElementById("estrellas");
  var ctx = canvas && canvas.getContext("2d");
  if (ctx) {
    var estrellas = [], fugaz = null, ancho = 0, alto = 0, dpr = 1;
    var medir = function () {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      ancho = window.innerWidth; alto = window.innerHeight;
      canvas.width = ancho * dpr; canvas.height = alto * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = Math.round((ancho * alto) / 5200);
      estrellas = [];
      for (var i = 0; i < n; i++) {
        estrellas.push({ x: Math.random() * ancho, y: Math.random() * alto, r: Math.random() * 1.1 + 0.2, f: Math.random() * Math.PI * 2, v: Math.random() * 0.8 + 0.3, oro: Math.random() < 0.12 });
      }
    };
    var dibujar = function (t) {
      ctx.clearRect(0, 0, ancho, alto);
      for (var i = 0; i < estrellas.length; i++) {
        var s = estrellas[i];
        var a = quieto ? 0.6 : 0.35 + 0.45 * (0.5 + 0.5 * Math.sin(s.f + t * 0.001 * s.v));
        ctx.globalAlpha = a;
        ctx.fillStyle = s.oro ? "#D4B172" : "#EDE5D6";
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
      }
      if (!quieto) {
        if (!fugaz && Math.random() < 0.0025) {
          fugaz = { x: Math.random() * ancho * 0.7, y: Math.random() * alto * 0.4, vida: 0 };
        }
        if (fugaz) {
          fugaz.vida += 1;
          var p = fugaz.vida / 60, x = fugaz.x + p * 260, y = fugaz.y + p * 110;
          var g = ctx.createLinearGradient(x - 90, y - 38, x, y);
          g.addColorStop(0, "rgba(241,221,176,0)"); g.addColorStop(1, "rgba(241,221,176,.9)");
          ctx.globalAlpha = 1 - p; ctx.strokeStyle = g; ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.moveTo(x - 90, y - 38); ctx.lineTo(x, y); ctx.stroke();
          if (fugaz.vida >= 60) fugaz = null;
        }
      }
      ctx.globalAlpha = 1;
      if (!quieto) requestAnimationFrame(dibujar);
    };
    medir();
    window.addEventListener("resize", function () { medir(); if (quieto) dibujar(0); });
    if (quieto) dibujar(0); else requestAnimationFrame(dibujar);
  }

  // Compartir (hoja nativa del celular; si no hay, copia el enlace)
  var URL_CONTACTO = "https://astrea-charts.site/contacto";
  var boton = document.getElementById("compartir");
  var aviso = document.getElementById("aviso");
  if (boton) {
    boton.addEventListener("click", function () {
      var datos = { title: "Astrea | AI for self discovery", text: "Algo se está alineando ✨ Mira lo que viene en Astrea:", url: URL_CONTACTO };
      if (navigator.share) {
        navigator.share(datos).catch(function () {});
        return;
      }
      var listo = function () { aviso.textContent = "Enlace copiado. Pégalo donde quieras."; };
      if (navigator.clipboard) {
        navigator.clipboard.writeText(URL_CONTACTO).then(listo, function () { aviso.textContent = URL_CONTACTO; });
      } else {
        aviso.textContent = URL_CONTACTO;
      }
    });
  }
})();
