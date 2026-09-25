/**
 * Astrea · Universo — comportamiento de /universo
 *
 * - Header que se vuelve sólido al hacer scroll.
 * - Revelado de bloques (.reveal) y parallax sutil ([data-parallax]),
 *   ambos desactivados con prefers-reduced-motion.
 * - Ruedas decorativas con una carta de muestra ficticia.
 * - Generador gratis: POST /carta-natal/resumen (mismo contrato que
 *   link-gratis.html) y render del resultado en 3 tabs.
 * - Carrusel de páginas de muestra.
 *
 * Depende de rueda-natal.js (generarRuedaSVG), cargado antes que este archivo.
 */
(function () {
  "use strict";

  const API_BASE = "https://astrea-api-production.up.railway.app/api/v1";
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------------------------------------------------------------- header
  const header = document.querySelector("[data-header]");
  const onScrollHeader = () => header.classList.toggle("is-scrolled", window.scrollY > 24);
  onScrollHeader();
  window.addEventListener("scroll", onScrollHeader, { passive: true });

  // ---------------------------------------------------------------- reveal
  const reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !reduceMotion) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        io.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add("is-visible"));
  }

  // -------------------------------------------------------------- parallax
  const parallaxEls = [...document.querySelectorAll("[data-parallax]")];
  if (parallaxEls.length && !reduceMotion) {
    let ticking = false;
    const update = () => {
      const vh = window.innerHeight;
      parallaxEls.forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.bottom < -100 || rect.top > vh + 100) return;
        const factor = parseFloat(el.dataset.parallax) || 0.05;
        const offset = (rect.top + rect.height / 2 - vh / 2) * -factor;
        el.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)`;
      });
      ticking = false;
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    update();
  }

  // ------------------------------------------------- ruedas decorativas
  // Carta ficticia (14-ago-1994 06:30, Atenas) calculada con el motor real
  // de astreaAPI. Solo se usa como ilustración; no es de ninguna clienta.
  const CARTA_MUESTRA = {"planetas":{"Sol":{"longitud_absoluta":141.13},"Luna":{"longitud_absoluta":229.79},"Mercurio":{"longitud_absoluta":142.31},"Venus":{"longitud_absoluta":186.8},"Marte":{"longitud_absoluta":88.26},"Jupiter":{"longitud_absoluta":217.39},"Saturno":{"longitud_absoluta":340.38},"Urano":{"longitud_absoluta":293.3},"Neptuno":{"longitud_absoluta":291.18},"Pluton":{"longitud_absoluta":235.3},"NodoNorte":{"longitud_absoluta":229.17},"Quiron":{"longitud_absoluta":161.3}},"casas":{"1":{"longitud_absoluta":138.46},"2":{"longitud_absoluta":160.99},"3":{"longitud_absoluta":188.38},"4":{"longitud_absoluta":220.99},"5":{"longitud_absoluta":256.11},"6":{"longitud_absoluta":289.27},"7":{"longitud_absoluta":318.46},"8":{"longitud_absoluta":340.99},"9":{"longitud_absoluta":8.38},"10":{"longitud_absoluta":40.99},"11":{"longitud_absoluta":76.11},"12":{"longitud_absoluta":109.27}},"puntos_angulares":{"Ascendente":{"longitud_absoluta":138.46},"MedioCielo":{"longitud_absoluta":40.99}},"aspectos":[{"punto_a":"Sol","punto_b":"Luna","aspecto":"Cuadratura"},{"punto_a":"Sol","punto_b":"Mercurio","aspecto":"Conjuncion"},{"punto_a":"Sol","punto_b":"Marte","aspecto":"Sextil"},{"punto_a":"Sol","punto_b":"Pluton","aspecto":"Cuadratura"},{"punto_a":"Luna","punto_b":"Urano","aspecto":"Sextil"},{"punto_a":"Luna","punto_b":"Neptuno","aspecto":"Sextil"},{"punto_a":"Luna","punto_b":"Pluton","aspecto":"Conjuncion"},{"punto_a":"Mercurio","punto_b":"Marte","aspecto":"Sextil"},{"punto_a":"Mercurio","punto_b":"Pluton","aspecto":"Cuadratura"}]};

  const pintarRueda = (id, calculo) => {
    const el = document.getElementById(id);
    if (!el || typeof generarRuedaSVG !== "function") return;
    try {
      el.innerHTML = generarRuedaSVG(calculo);
    } catch (err) {
      console.error("No se pudo dibujar la rueda", err);
    }
  };
  pintarRueda("rueda-deco", CARTA_MUESTRA);
  pintarRueda("rueda-preview", CARTA_MUESTRA);

  // ------------------------------------------------------------------ tabs
  const tablist = document.querySelector('[role="tablist"]');
  const tabs = tablist ? [...tablist.querySelectorAll('[role="tab"]')] : [];

  const activarTab = (tab, enfocar) => {
    tabs.forEach((t) => {
      const activa = t === tab;
      t.setAttribute("aria-selected", String(activa));
      t.tabIndex = activa ? 0 : -1;
      document.getElementById(t.getAttribute("aria-controls")).hidden = !activa;
    });
    if (enfocar) tab.focus();
  };

  tabs.forEach((tab, i) => {
    tab.addEventListener("click", () => activarTab(tab, false));
    tab.addEventListener("keydown", (e) => {
      const mapa = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 };
      if (!(e.key in mapa)) return;
      e.preventDefault();
      activarTab(tabs[(mapa[e.key] + tabs.length) % tabs.length], true);
    });
  });

  // ------------------------------------------------------------- generador
  const form = document.getElementById("natal-form");
  const submit = document.getElementById("f-submit");
  const submitLabel = submit.querySelector("[data-label]");
  const msg = document.getElementById("form-msg");
  const status = document.getElementById("form-status");
  const inputFecha = document.getElementById("f-fecha");

  inputFecha.max = new Date().toISOString().slice(0, 10);

  const MENSAJES_CARGA = [
    "Calculando posiciones planetarias…",
    "Trazando las casas de tu cielo…",
    "Buscando tus aspectos…",
    "Preparando tu primer vistazo…",
  ];

  const mostrarError = (texto, campo) => {
    msg.textContent = texto;
    msg.hidden = false;
    form.querySelectorAll("[aria-invalid]").forEach((el) => el.removeAttribute("aria-invalid"));
    if (campo) {
      campo.setAttribute("aria-invalid", "true");
      campo.focus();
    }
  };

  const limpiarError = () => {
    msg.hidden = true;
    msg.textContent = "";
    form.querySelectorAll("[aria-invalid]").forEach((el) => el.removeAttribute("aria-invalid"));
  };

  const estadoCargando = (cargando) => {
    submit.disabled = cargando;
    submitLabel.textContent = cargando ? "Calculando tu carta…" : "Generar mi carta";
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    limpiarError();

    const nombre = form.nombre.value.trim();
    const fecha = form.fecha.value;
    const hora = form.hora.value;
    const lugar = form.lugar.value.trim();

    if (nombre.length < 2) return mostrarError("Escribe tu nombre.", form.nombre);
    if (!fecha) return mostrarError("Indica tu fecha de nacimiento.", form.fecha);
    if (!hora) return mostrarError("Indica tu hora de nacimiento. Si no la sabes exacta, usa la más aproximada.", form.hora);

    // "Ciudad, País": el país es lo que va después de la última coma, así
    // "Medellín, Antioquia, Colombia" sigue funcionando.
    const corte = lugar.lastIndexOf(",");
    const ciudad = corte > 0 ? lugar.slice(0, corte).trim() : "";
    const pais = corte > 0 ? lugar.slice(corte + 1).trim() : "";
    if (ciudad.length < 2 || pais.length < 2) {
      return mostrarError("Escribe ciudad y país separados por coma. Ej.: Bogotá, Colombia", form.lugar);
    }

    const fecha_hora_local = `${fecha}T${hora.slice(0, 5)}:00`;

    estadoCargando(true);
    let i = 0;
    status.textContent = MENSAJES_CARGA[0];
    const intervalo = setInterval(() => {
      i = (i + 1) % MENSAJES_CARGA.length;
      status.textContent = MENSAJES_CARGA[i];
    }, 2600);

    try {
      const respuesta = await fetch(`${API_BASE}/carta-natal/resumen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, fecha_hora_local, ciudad, pais }),
      });

      if (respuesta.status === 429) {
        throw new Error("Hiciste varias consultas seguidas. Espera un minuto e inténtalo de nuevo.");
      }
      if (respuesta.status === 400) {
        throw new Error("No encontramos ese lugar. Revisa la ciudad y el país, y vuelve a intentarlo.");
      }
      if (!respuesta.ok) {
        throw new Error("Hubo un problema generando tu carta. Intenta de nuevo en unos segundos.");
      }

      const datos = await respuesta.json();
      renderizarResultado(datos);
      status.textContent = "Tu carta está lista.";
    } catch (err) {
      console.error(err);
      status.textContent = "";
      const texto = err instanceof TypeError
        ? "No pudimos conectar con el servidor. Revisa tu conexión e intenta de nuevo."
        : err.message;
      mostrarError(texto);
    } finally {
      clearInterval(intervalo);
      estadoCargando(false);
    }
  });

  // ------------------------------------------------------------- resultado
  // El backend devuelve los signos sin tildes ("Geminis", "Cancer").
  const SIGNO_LEGIBLE = { Geminis: "Géminis", Cancer: "Cáncer" };
  const signo = (s) => SIGNO_LEGIBLE[s] || s;
  const grados = (g) => `${Math.floor(g)}°${String(Math.round((g % 1) * 60)).padStart(2, "0")}′`;

  // Los textos de la API son contenido del backend (confiable), pero el
  // nombre viene del usuario: todo lo interpolado pasa por escapar().
  const escapar = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const itemBigThree = ({ icono, titulo, sign, meta, texto }) => `
    <li>
      <span class="bigthree__glyph" aria-hidden="true"><svg class="icon"><use href="#${icono}"/></svg></span>
      <div>
        <p class="bigthree__kicker">${titulo}</p>
        <p class="bigthree__sign">${escapar(sign)}</p>
        ${meta ? `<p class="bigthree__meta">${escapar(meta)}</p>` : ""}
        <p class="bigthree__text">${escapar(texto)}</p>
      </div>
    </li>`;

  function renderizarResultado({ calculo, resumen = {}, metadata = {} }) {
    const sol = calculo.planetas.Sol;
    const luna = calculo.planetas.Luna;
    const asc = calculo.puntos_angulares.Ascendente;

    const primerNombre = (metadata.nombre || form.nombre.value).trim().split(/\s+/)[0];
    document.getElementById("res-saludo").textContent = primerNombre ? `${primerNombre}, este es tu cielo.` : "";

    pintarRueda("res-rueda", calculo);

    const tres = [
      { icono: "i-sun", titulo: "Sol", sign: signo(sol.signo), meta: `${grados(sol.grado_en_signo)} · Casa ${sol.casa}`, corto: "Tu esencia, tu brillo, tu propósito.", largo: resumen.identidad?.texto },
      { icono: "i-moon", titulo: "Luna", sign: signo(luna.signo), meta: `${grados(luna.grado_en_signo)} · Casa ${luna.casa}`, corto: "Tu mundo emocional, tu intuición.", largo: resumen.emociones?.texto },
      { icono: "i-asc", titulo: "Ascendente", sign: signo(asc.signo), meta: grados(asc.grado_en_signo), corto: "Tu primera impresión, cómo te muestras al mundo.", largo: resumen.camino?.texto },
    ];

    document.getElementById("res-big3-mini").innerHTML =
      tres.map((t) => itemBigThree({ ...t, meta: "", texto: t.corto })).join("");
    document.getElementById("res-big3").innerHTML =
      tres.map((t) => itemBigThree({ ...t, texto: t.largo || t.corto })).join("");

    // Esencia: balance elemental + patrón destacado del Big Three (los
    // textos de Sol/Luna/Ascendente ya viven en la tab Big Three).
    let esencia = "";
    const em = resumen.elemento_modalidad;
    if (em) {
      const conteo = em.conteo_elementos || {};
      const max = Math.max(1, ...Object.values(conteo));
      const barras = Object.entries(conteo).map(([el, n]) => `
        <div class="element-row">
          <span>${escapar(el)}</span>
          <span class="element-row__track"><span style="width:${(n / max) * 100}%"></span></span>
          <span>${Number(n)}</span>
        </div>`).join("");
      esencia += `
        <article class="essence essence--wide">
          <h4 class="essence__title">${escapar(em.titulo || "Tu balance elemental")}</h4>
          <p class="essence__text">${escapar(em.texto)}</p>
          ${barras ? `<div class="element-bars">${barras}</div>` : ""}
        </article>`;
    }
    if (resumen.aspecto_destacado) {
      esencia += `
        <article class="essence essence--wide">
          <h4 class="essence__title">${escapar(resumen.aspecto_destacado.titulo)}</h4>
          <p class="essence__text">${escapar(resumen.aspecto_destacado.texto)}</p>
        </article>`;
    }
    document.getElementById("res-esencia").innerHTML =
      esencia || '<p class="lede">Tu esencia aparecerá aquí.</p>';

    activarTab(tabs[0], false);
    const resultado = document.getElementById("resultado");
    resultado.hidden = false;
    resultado.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    resultado.focus({ preventScroll: true });
  }

  // -------------------------------------------------------------- carrusel
  document.querySelectorAll("[data-carousel]").forEach((root) => {
    const track = root.querySelector("[data-track]");
    const prev = root.querySelector("[data-prev]");
    const next = root.querySelector("[data-next]");
    const dotsBox = root.querySelector("[data-dots]");
    const leaves = [...track.children];

    dotsBox.innerHTML = leaves.map(() => "<span></span>").join("");
    const dots = [...dotsBox.children];

    const indiceActual = () => {
      const centro = track.scrollLeft + track.clientWidth / 2;
      let mejor = 0, dist = Infinity;
      leaves.forEach((leaf, i) => {
        const d = Math.abs(leaf.offsetLeft + leaf.offsetWidth / 2 - centro);
        if (d < dist) { dist = d; mejor = i; }
      });
      return mejor;
    };

    const actualizar = () => {
      const i = indiceActual();
      dots.forEach((d, j) => d.classList.toggle("is-active", j === i));
      prev.disabled = i === 0;
      next.disabled = i === leaves.length - 1;
    };

    const irA = (i) => {
      const leaf = leaves[Math.max(0, Math.min(leaves.length - 1, i))];
      track.scrollTo({
        left: leaf.offsetLeft - (track.clientWidth - leaf.offsetWidth) / 2,
        behavior: reduceMotion ? "auto" : "smooth",
      });
    };

    prev.addEventListener("click", () => irA(indiceActual() - 1));
    next.addEventListener("click", () => irA(indiceActual() + 1));
    track.addEventListener("scroll", () => requestAnimationFrame(actualizar), { passive: true });
    window.addEventListener("resize", actualizar);

    // Arranca centrado en la segunda página para que se vea como libro abierto.
    requestAnimationFrame(() => {
      track.style.scrollBehavior = "auto";
      irA(1);
      track.style.scrollBehavior = "";
      actualizar();
    });
  });
})();
