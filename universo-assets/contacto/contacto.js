/* /contacto: idioma, enlaces de WhatsApp, cielo estático, revelado, QR grande y compartir. Sin dependencias. */
(function () {
  "use strict";
  document.documentElement.classList.add("js");
  var quieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var WHATSAPP = "573132137456";
  // Enlace de agenda (Calendly, Google Calendar…). Vacío: «Agendar reunión» abre WhatsApp con ese pedido.
  var AGENDA_URL = "";

  var MENSAJES = {
    es: {
      hola: "Hola Carla ✨ nos conocimos en el evento. Te escribo para seguir en contacto.",
      reunion: "Hola Carla ✨ nos conocimos en el evento. Me gustaría agendar una reunión contigo.",
      inversion: "Hola Carla ✨ nos conocimos en el evento. Me interesa conversar sobre inversión o alianzas con Astrea.",
      producto: "Hola Carla ✨ nos conocimos en el evento. Tengo una idea de producto con AI y me gustaría contártela.",
      compartir: "Te comparto la tarjeta de Carla Valderrama, Founder & AI builder de Astrea:",
      copiado: "Enlace copiado. Pégalo donde quieras."
    },
    en: {
      hola: "Hi Carla ✨ we met at the event. Writing to stay in touch.",
      reunion: "Hi Carla ✨ we met at the event. I'd like to book a meeting with you.",
      inversion: "Hi Carla ✨ we met at the event. I'd like to talk about investing in or partnering with Astrea.",
      producto: "Hi Carla ✨ we met at the event. I have an AI product idea I'd love to tell you about.",
      compartir: "Here's the card of Carla Valderrama, Founder & AI builder at Astrea:",
      copiado: "Link copied. Paste it anywhere."
    }
  };

  // Idioma
  var idioma = function () { return document.documentElement.lang === "en" ? "en" : "es"; };
  var aplicarIdioma = function (l) {
    document.documentElement.lang = l;
    document.querySelectorAll("[data-idioma]").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-idioma") === l));
    });
    document.querySelectorAll("[data-wa]").forEach(function (a) {
      var clave = a.getAttribute("data-wa");
      if (clave === "reunion" && AGENDA_URL) { a.href = AGENDA_URL; return; }
      a.href = "https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(MENSAJES[l][clave]);
    });
  };
  document.querySelectorAll("[data-idioma]").forEach(function (b) {
    b.addEventListener("click", function () {
      var l = b.getAttribute("data-idioma");
      try { localStorage.setItem("astrea-idioma", l); } catch (e) {}
      aplicarIdioma(l);
    });
  });
  aplicarIdioma(idioma());

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

  // Cielo estático: conserva la identidad sin un bucle continuo en el celular.
  var canvas = document.getElementById("estrellas");
  var ctx = canvas && canvas.getContext("2d");
  if (ctx) {
    var dibujar = function () {
      var ancho = canvas.clientWidth, alto = canvas.clientHeight;
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = ancho * dpr; canvas.height = alto * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = Math.round(ancho * alto / 6500);
      for (var i = 0; i < n; i++) {
        ctx.globalAlpha = Math.random() * 0.4 + 0.35;
        ctx.fillStyle = i % 8 === 0 ? "#D7BC87" : "#EDE5D6";
        ctx.beginPath();
        ctx.arc(Math.random() * ancho, Math.random() * alto, Math.random() * 0.8 + 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };
    dibujar();
    window.addEventListener("resize", dibujar);
  }

  // QR a pantalla completa (para mostrarlo desde el celular)
  var dialogo = document.getElementById("qr-grande");
  if (dialogo && dialogo.showModal) {
    document.querySelectorAll("[data-abrir-qr]").forEach(function (b) {
      b.addEventListener("click", function () { dialogo.showModal(); });
    });
    dialogo.querySelector("[data-cerrar-qr]").addEventListener("click", function () { dialogo.close(); });
    dialogo.addEventListener("click", function (e) { if (e.target === dialogo) dialogo.close(); });
  }

  // Compartir (hoja nativa del celular; si no hay, copia el enlace)
  var URL_CONTACTO = "https://astrea-charts.site/contacto";
  var boton = document.getElementById("compartir");
  var aviso = document.getElementById("aviso");
  if (boton) {
    boton.addEventListener("click", function () {
      var m = MENSAJES[idioma()];
      var copiar = function () {
        if (navigator.clipboard) {
          navigator.clipboard.writeText(URL_CONTACTO).then(function () {
            aviso.textContent = m.copiado;
          }, function () { aviso.textContent = URL_CONTACTO; });
        } else {
          aviso.textContent = URL_CONTACTO;
        }
      };
      aviso.textContent = "";
      if (navigator.share) {
        navigator.share({ title: "Carla Valderrama · Astrea", text: m.compartir, url: URL_CONTACTO }).catch(function (e) {
          if (e.name !== "AbortError") copiar();
        });
      } else {
        copiar();
      }
    });
  }
})();
