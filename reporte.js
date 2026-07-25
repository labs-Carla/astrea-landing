const API_BASE = "https://astrea-api-production.up.railway.app/api/v1";

const SIMBOLOS = {
  Sol: "☉", Luna: "☽", Mercurio: "☿", Venus: "♀", Marte: "♂",
  Jupiter: "♃", Saturno: "♄", Urano: "♅", Neptuno: "♆", Pluton: "♇",
  NodoNorte: "☊", Quiron: "⚷"
};

function obtenerParametrosURL() {
  const params = new URLSearchParams(window.location.search);
  return {
    nombre: params.get("nombre") || "",
    fecha_hora_local: params.get("fecha_hora_local") || "",
    ciudad: params.get("ciudad") || "",
    pais: params.get("pais") || "",
  };
}

function renderPortada(metadata) {
  const [fecha, hora] = metadata.fecha_hora_local.split("T");
  return `
    <div class="portada">
      <div class="logo-mini">ASTREA<span class="sub">— CHARTS —</span></div>
      <h1 class="portada-titulo">Carta Natal</h1>
      <div class="portada-divisor"></div>
      <p class="portada-nombre">${metadata.nombre}</p>
      <p class="portada-meta">${fecha} · ${hora}</p>
      <p class="portada-meta">${metadata.ciudad}, ${metadata.pais}</p>
    </div>
  `;
}

function renderRuedaNatal(calculo) {
  return `
    <div class="capitulo" style="border-bottom: none; padding-bottom: 20px;">
      <div class="rueda-natal-wrap">${generarRuedaSVG(calculo)}</div>
    </div>
  `;
}

function renderCartaEnUnaMirada(mirada) {
  if (!mirada) return "";
  return `
    <div class="capitulo">
      <h2 class="capitulo-titulo">Tu carta en una mirada</h2>
      <div class="mirada-esencia">${mirada.esencia}</div>
      <div class="mirada-grid">
        <div class="mirada-card">
          <div class="mirada-card-titulo">Tus mayores talentos</div>
          <ul class="mirada-lista talentos">${mirada.talentos.map(t => `<li>${t}</li>`).join("")}</ul>
        </div>
        <div class="mirada-card">
          <div class="mirada-card-titulo">Tus mayores desafíos</div>
          <ul class="mirada-lista desafios">${mirada.desafios.map(d => `<li>${d}</li>`).join("")}</ul>
        </div>
      </div>
      <div class="mirada-mision">
        <span class="mirada-mision-label">Tu misión</span>
        ${mirada.mision}
      </div>
    </div>
  `;
}

function renderComoLeer() {
  return `
    <div class="capitulo">
      <h2 class="capitulo-titulo">Cómo leer este reporte</h2>
      <p class="como-leer-texto">Este no es un documento para terminar en una sola tarde.</p>
      <p class="como-leer-texto">Una carta natal revela diferentes significados según el momento de la vida en el que te encuentres. Es posible que algunas páginas resuenen profundamente hoy y que otras cobren sentido meses o incluso años después.</p>
      <p class="como-leer-texto">Te invito a leer este reporte con curiosidad, no buscando respuestas absolutas, sino nuevas formas de comprenderte. Mientras lo recorres, recuerda:</p>
      <ul class="como-leer-bullets">
        <li>No es necesario leerlo todo en una sola sesión.</li>
        <li>Vuelve a él cuando estés viviendo cambios, decisiones importantes o momentos de crecimiento.</li>
        <li>Subraya las frases que más resuenen contigo y anota tus propias reflexiones.</li>
        <li>Si alguna interpretación no encaja hoy, déjala reposar. Con el tiempo podrías descubrir un significado diferente.</li>
      </ul>
      <p class="como-leer-texto">Este reporte no pretende decirte quién eres, sino ofrecerte un mapa simbólico para explorar tu propio camino.</p>
      <div class="como-leer-cita">
        "La carta natal no cambia. Quien cambia eres tú. Por eso, cada nueva lectura puede revelar una perspectiva diferente."
      </div>
    </div>
  `;
}

function renderOverview(overview) {
  if (!overview) return "";
  return `
    <div class="capitulo">
      <div class="capitulo-numero">Capítulo I</div>
      <h2 class="capitulo-titulo">Visión General</h2>
      <div class="overview">${overview}</div>
    </div>
  `;
}

function renderElementosDignidades(elementos, dignidades, lectura) {
  if (!elementos && !dignidades) return "";

  let htmlElementos = "";
  if (elementos) {
    const filasElementos = Object.entries(elementos.conteo_elementos)
      .map(([e, c]) => `
        <div class="panorama-fila">
          <span class="panorama-etiqueta">${e}</span>
          <span class="panorama-barra"><span class="panorama-relleno" style="width:${c * 20}px;"></span></span>
          <span class="panorama-valor">${c}</span>
        </div>`).join("");
    const filasModalidades = Object.entries(elementos.conteo_modalidades)
      .map(([m, c]) => `
        <div class="panorama-fila">
          <span class="panorama-etiqueta">${m}</span>
          <span class="panorama-barra"><span class="panorama-relleno" style="width:${c * 20}px;"></span></span>
          <span class="panorama-valor">${c}</span>
        </div>`).join("");

    htmlElementos = `
      <div class="panorama-grid">
        <div class="panorama-card">
          <div class="panorama-titulo">Elementos</div>
          ${filasElementos}
          <div class="panorama-dominante">Dominante: ${elementos.elemento_dominante}</div>
        </div>
        <div class="panorama-card">
          <div class="panorama-titulo">Modalidades</div>
          ${filasModalidades}
          <div class="panorama-dominante">Dominante: ${elementos.modalidad_dominante}</div>
        </div>
      </div>
    `;
  }

  let htmlDignidades = "";
  if (dignidades && Object.keys(dignidades).length) {
    const filas = Object.entries(dignidades)
      .map(([nombre, info]) => `<tr><td>${nombre}</td><td>${info.signo}</td><td>${info.dignidad}</td></tr>`)
      .join("");
    htmlDignidades = `
      <div style="margin-top:18px;">
        <div class="panorama-titulo">Dignidades Esenciales</div>
        <table><tr><th>Planeta</th><th>Signo</th><th>Dignidad</th></tr>${filas}</table>
      </div>
    `;
  }

  const htmlLectura = lectura ? `
    <div class="lectura-patron">
      <div class="lectura-patron-label">Lectura del Patrón</div>
      <p class="lectura-patron-texto">${lectura}</p>
    </div>
  ` : "";

  return `
    <div class="capitulo">
      <div class="capitulo-numero">Capítulo II</div>
      <h2 class="capitulo-titulo">Elementos y Dignidades</h2>
      ${htmlElementos}
      ${htmlDignidades}
      ${htmlLectura}
    </div>
  `;
}

function renderPuntosAngulares(puntos, ascendente, medioCielo) {
  const filas = Object.entries(puntos)
    .map(([nombre, d]) => `<tr><td>${nombre}</td><td>${d.signo}</td><td>${d.grado_en_signo.toFixed(2)}°</td></tr>`)
    .join("");

  const htmlAsc = ascendente ? `
    <div class="planeta-bloque" style="margin-top:22px;">
      <div class="planeta-encabezado"><span class="planeta-simbolo">Asc</span><h3 class="planeta-nombre">Ascendente</h3></div>
      <p class="interpretacion-texto">${ascendente}</p>
    </div>` : "";

  const htmlMC = medioCielo ? `
    <div class="planeta-bloque">
      <div class="planeta-encabezado"><span class="planeta-simbolo">MC</span><h3 class="planeta-nombre">Medio Cielo</h3></div>
      <p class="interpretacion-texto">${medioCielo}</p>
    </div>` : "";

  return `
    <div class="capitulo">
      <div class="capitulo-numero">Capítulo III</div>
      <h2 class="capitulo-titulo">Puntos Angulares</h2>
      <table><tr><th>Punto</th><th>Signo</th><th>Grado</th></tr>${filas}</table>
      ${htmlAsc}
      ${htmlMC}
    </div>
  `;
}

function renderPlanetas(planetas) {
  const bloques = Object.entries(planetas).map(([nombre, d]) => `
    <div class="planeta-bloque">
      <div class="planeta-encabezado">
        <span class="planeta-simbolo">${SIMBOLOS[nombre] || "•"}</span>
        <h3 class="planeta-nombre">${nombre}</h3>
      </div>
      <div class="planeta-datos">
        ${d.signo} ${d.grado_en_signo.toFixed(2)}° · Casa ${d.casa}
        ${d.retrogrado ? '<span class="retrogrado">· Retrógrado</span>' : ""}
      </div>
      ${d.interpretacion ? `<p class="interpretacion-texto">${d.interpretacion}</p>` : ""}
    </div>
  `).join("");

  return `
    <div class="capitulo">
      <div class="capitulo-numero">Capítulo IV</div>
      <h2 class="capitulo-titulo">Planetas</h2>
      ${bloques}
    </div>
  `;
}

function renderAspectos(aspectos) {
  if (!aspectos || !aspectos.length) return "";
  const filas = aspectos.map(a => `
    <tr><td>${a.punto_a}</td><td>${a.aspecto}</td><td>${a.punto_b}</td><td>${a.orbe_usado}°</td></tr>
  `).join("");

  return `
    <div class="capitulo">
      <div class="capitulo-numero">Capítulo V</div>
      <h2 class="capitulo-titulo">Aspectos</h2>
      <table><tr><th>Punto A</th><th>Aspecto</th><th>Punto B</th><th>Orbe</th></tr>${filas}</table>
    </div>
  `;
}

function renderCasas(casas) {
  const filas = Object.entries(casas)
    .map(([num, d]) => `<tr><td>${num}</td><td>${d.signo}</td><td>${d.grado_en_signo.toFixed(2)}°</td></tr>`)
    .join("");

  return `
    <div class="capitulo">
      <div class="capitulo-numero">Capítulo VI</div>
      <h2 class="capitulo-titulo">Casas</h2>
      <table><tr><th>Casa</th><th>Signo</th><th>Grado</th></tr>${filas}</table>
    </div>
  `;
}

function renderConclusion(conclusion, frase) {
  if (!conclusion && !frase) return ''
  return `
    <div class="capitulo">
      <div class="capitulo-numero">Cierre</div>
      <h2 class="capitulo-titulo">Síntesis</h2>
      ${conclusion ? `<div class="conclusion">${conclusion}</div>` : ''}
      ${frase ? `<div class="pagina-cierre"><p class="frase-cierre">${frase}</p></div>` : ''}
      <div class="disclaimer">
        Este reporte combina cálculos astrológicos de precisión, inteligencia artificial y revisión humana<br>
        para ofrecer una interpretación personalizada orientada al autoconocimiento y al desarrollo personal.<br><br>
        La astrología es una herramienta de reflexión que aporta perspectivas sobre tus talentos, desafíos y<br>
        ciclos de vida, pero no determina tu destino ni reemplaza tu capacidad de decidir. Las interpretaciones<br>
        contenidas en este reporte tienen un carácter simbólico y no sustituyen el consejo de profesionales<br>
        en áreas como la salud, el derecho o las finanzas.
      </div>
    </div>
  `
}

function renderFraseCierre(frase) {
  if (!frase) return "";
  return `
    <div class="capitulo">
      <div class="pagina-cierre">
        <p class="frase-cierre">${frase}</p>
      </div>
    </div>
  `;
}

function renderReporte(datos) {
  const { metadata, planetas, casas, puntos_angulares, aspectos, dignidades, elementos_y_modalidades, interpretacion } = datos;

  const calculoParaRueda = { planetas, casas, puntos_angulares, aspectos };

  const html = `
    ${renderPortada(metadata)}
    <div class="wrap">
      ${renderRuedaNatal(calculoParaRueda)}
      ${renderCartaEnUnaMirada(interpretacion.carta_en_una_mirada)}
      ${renderComoLeer()}
      ${renderOverview(interpretacion.overview)}
      ${renderElementosDignidades(elementos_y_modalidades, dignidades, interpretacion.lectura_elementos_dignidades)}
      ${renderPuntosAngulares(puntos_angulares, interpretacion.ascendente, interpretacion.medio_cielo)}
      ${renderPlanetas(planetas)}
      ${renderAspectos(aspectos)}
      ${renderCasas(casas)}
      ${renderConclusion(interpretacion.conclusion)}
      ${renderFraseCierre(interpretacion.frase_de_cierre)}
    </div>
  `;

  document.getElementById("contenido-reporte").innerHTML = html;
  document.getElementById("cargando").style.display = "none";
  document.getElementById("contenido-reporte").style.display = "block";
}

async function cargarReporte() {
  const { nombre, fecha_hora_local, ciudad, pais } = obtenerParametrosURL();

  if (!fecha_hora_local || !ciudad || !pais) {
    document.getElementById("cargando").innerHTML =
      '<div class="error-box">Falta información para mostrar tu lectura. Verifica el enlace recibido.</div>';
    return;
  }

  try {
    const respuesta = await fetch(`${API_BASE}/carta-natal/data`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, fecha_hora_local, ciudad, pais }),
    });

    if (!respuesta.ok) {
      const error = await respuesta.json();
      document.getElementById("cargando").innerHTML =
        `<div class="error-box">${error.detail || "No se pudo cargar tu lectura."}</div>`;
      return;
    }

    const datos = await respuesta.json();
    renderReporte(datos);

  } catch (error) {
    console.error(error);
    document.getElementById("cargando").innerHTML =
      '<div class="error-box">Hubo un problema cargando tu lectura. Intenta de nuevo.</div>';
  }
}

cargarReporte();