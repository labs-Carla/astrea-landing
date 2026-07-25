const API_BASE = 'https://astrea-api-production.up.railway.app/api/v1'

const SIMBOLOS = {
  Sol: '☉', Luna: '☽', Mercurio: '☿', Venus: '♀', Marte: '♂',
  Jupiter: '♃', Saturno: '♄', Urano: '♅', Neptuno: '♆', Pluton: '♇',
  NodoNorte: '☊', Quiron: '⚷',
}

const SIGNOS = [
  'Aries', 'Tauro', 'Geminis', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Escorpio', 'Sagitario', 'Capricornio', 'Acuario', 'Piscis',
]

const ROMANOS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV']

function obtenerParametrosURL() {
  const params = new URLSearchParams(window.location.search)
  return {
    nombre: params.get('nombre') || '',
    fecha_hora_local: params.get('fecha_hora_local') || '',
    ciudad: params.get('ciudad') || '',
    pais: params.get('pais') || '',
  }
}

/**
 * Deriva signo y grado-en-signo a partir de una longitud absoluta (0-360),
 * usado para calcular IC/Descendente (opuestos a MC/Ascendente) sin
 * necesitar tocar el backend.
 */
function derivarSignoDesdeLongitud(longitudAbsoluta) {
  const normalizado = ((longitudAbsoluta % 360) + 360) % 360
  const indiceSigno = Math.floor(normalizado / 30)
  const gradoEnSigno = normalizado - indiceSigno * 30
  return { signo: SIGNOS[indiceSigno], grado_en_signo: gradoEnSigno }
}

function capituloWrapper(numero, titulo, contenidoHtml) {
  return `
    <details class="capitulo" open>
      <summary>
        <div class="capitulo-encabezado-texto">
          <div class="capitulo-numero">Capítulo ${ROMANOS[numero - 1]}</div>
          <h2 class="capitulo-titulo">${titulo}</h2>
        </div>
      </summary>
      <div class="capitulo-contenido">${contenidoHtml}</div>
    </details>
  `
}

function proximamente() {
  return `<p class="proximamente">Esta sección está en desarrollo y se agregará próximamente.</p>`
}

function renderPortada(metadata) {
  const [fecha, hora] = metadata.fecha_hora_local.split('T')
  return `
    <div class="portada">
      <div class="logo-mini">ASTREA<span class="sub">— CHARTS —</span></div>
      <h1 class="portada-titulo">Carta Natal</h1>
      <div class="portada-divisor"></div>
      <p class="portada-nombre">${metadata.nombre}</p>
      <p class="portada-meta">${fecha} · ${hora}</p>
      <p class="portada-meta">${metadata.ciudad}, ${metadata.pais}</p>
    </div>
  `
}

function renderRuedaNatal(calculo) {
  return `<div class="rueda-natal-wrap">${generarRuedaSVG(calculo)}</div>`
}

// ===== Capítulo 1: Carta en una mirada =====
function contenidoCap1(mirada) {
  if (!mirada) return proximamente()
  return `
    <div class="mirada-esencia">${mirada.esencia}</div>
    <div class="mirada-grid">
      <div class="mirada-card">
        <div class="mirada-card-titulo">Tus mayores talentos</div>
        <ul class="mirada-lista talentos">${mirada.talentos.map(t => `<li>${t}</li>`).join('')}</ul>
      </div>
      <div class="mirada-card">
        <div class="mirada-card-titulo">Tus mayores desafíos</div>
        <ul class="mirada-lista desafios">${mirada.desafios.map(d => `<li>${d}</li>`).join('')}</ul>
      </div>
    </div>
    <div class="mirada-mision">
      <span class="mirada-mision-label">Tu misión</span>
      ${mirada.mision}
    </div>
  `
}

// ===== Capítulo 2: Visión general =====
function contenidoCap2(overview) {
  if (!overview) return proximamente()
  return `<div class="overview">${overview}</div>`
}

// ===== Capítulo 3: Energía base (elementos + modalidades + dignidades) =====
function contenidoCap3(elementos, dignidades, lectura) {
  if (!elementos && !dignidades) return proximamente()

  let htmlElementos = ''
  if (elementos) {
    const filasElementos = Object.entries(elementos.conteo_elementos)
      .map(([e, c]) => `
        <div class="panorama-fila">
          <span class="panorama-etiqueta">${e}</span>
          <span class="panorama-barra"><span class="panorama-relleno" style="width:${c * 20}px;"></span></span>
          <span class="panorama-valor">${c}</span>
        </div>`).join('')
    const filasModalidades = Object.entries(elementos.conteo_modalidades)
      .map(([m, c]) => `
        <div class="panorama-fila">
          <span class="panorama-etiqueta">${m}</span>
          <span class="panorama-barra"><span class="panorama-relleno" style="width:${c * 20}px;"></span></span>
          <span class="panorama-valor">${c}</span>
        </div>`).join('')

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
    `
  }

  let htmlDignidades = ''
  if (dignidades && Object.keys(dignidades).length) {
    const filas = Object.entries(dignidades)
      .map(([nombre, info]) => `<tr><td>${nombre}</td><td>${info.signo}</td><td>${info.dignidad}</td></tr>`)
      .join('')
    htmlDignidades = `
      <div style="margin-top:18px;">
        <div class="panorama-titulo">Dignidades Esenciales</div>
        <table><tr><th>Planeta</th><th>Signo</th><th>Dignidad</th></tr>${filas}</table>
      </div>
    `
  }

  const htmlLectura = lectura ? `
    <div class="lectura-patron">
      <div class="lectura-patron-label">Lectura del Patrón</div>
      <p class="lectura-patron-texto">${lectura}</p>
    </div>
  ` : ''

  return htmlElementos + htmlDignidades + htmlLectura
}

// ===== Capítulo 4: Pilares de tu vida (Asc, MC, IC, Desc) =====
function contenidoCap4(puntos, interpretacion) {
  if (!puntos) return proximamente()

  const asc = puntos.Ascendente
  const mc = puntos.MedioCielo
  const ic = derivarSignoDesdeLongitud(mc.longitud_absoluta + 180)
  const desc = derivarSignoDesdeLongitud(asc.longitud_absoluta + 180)

  const filas = `
    <tr><td>Ascendente</td><td>${asc.signo}</td><td>${asc.grado_en_signo.toFixed(2)}°</td></tr>
    <tr><td>Medio Cielo</td><td>${mc.signo}</td><td>${mc.grado_en_signo.toFixed(2)}°</td></tr>
    <tr><td>Fondo del Cielo</td><td>${ic.signo}</td><td>${ic.grado_en_signo.toFixed(2)}°</td></tr>
    <tr><td>Descendente</td><td>${desc.signo}</td><td>${desc.grado_en_signo.toFixed(2)}°</td></tr>
  `

  const tabla = `<table><tr><th>Punto</th><th>Signo</th><th>Grado</th></tr>${filas}</table>`

  const htmlAsc = interpretacion?.ascendente ? `
    <div class="planeta-bloque" style="margin-top:22px;">
      <div class="planeta-encabezado"><span class="planeta-simbolo">Asc</span><h3 class="planeta-nombre">Ascendente</h3></div>
      <p class="interpretacion-texto">${interpretacion.ascendente}</p>
    </div>` : ''

  const htmlMC = interpretacion?.medio_cielo ? `
    <div class="planeta-bloque">
      <div class="planeta-encabezado"><span class="planeta-simbolo">MC</span><h3 class="planeta-nombre">Medio Cielo</h3></div>
      <p class="interpretacion-texto">${interpretacion.medio_cielo}</p>
    </div>` : ''

  return tabla + htmlAsc + htmlMC + proximamente()
}

// ===== Capítulo 5: Planetas personales (Sol, Luna, Mercurio, Venus, Marte) =====
function contenidoCap5(planetas) {
  const personales = ['Sol', 'Luna', 'Mercurio', 'Venus', 'Marte']
  const bloques = personales
    .filter(nombre => planetas[nombre])
    .map(nombre => {
      const d = planetas[nombre]
      return `
        <div class="planeta-bloque">
          <div class="planeta-encabezado">
            <span class="planeta-simbolo">${SIMBOLOS[nombre] || '•'}</span>
            <h3 class="planeta-nombre">${nombre}</h3>
          </div>
          <div class="planeta-datos">
            ${d.signo} ${d.grado_en_signo.toFixed(2)}° · Casa ${d.casa}
            ${d.retrogrado ? '<span class="retrogrado">· Retrógrado</span>' : ''}
          </div>
          ${d.interpretacion ? `<p class="interpretacion-texto">${d.interpretacion}</p>` : ''}
        </div>
      `
    }).join('')
  return bloques
}

// ===== Capítulo 6: Fuerzas invisibles (Jupiter, Saturno, Urano, Neptuno, Pluton, NodoNorte) =====
function contenidoCap6(planetas) {
  const invisibles = ['Jupiter', 'Saturno', 'Urano', 'Neptuno', 'Pluton', 'NodoNorte']
  const bloques = invisibles
    .filter(nombre => planetas[nombre])
    .map(nombre => {
      const d = planetas[nombre]
      return `
        <div class="planeta-bloque">
          <div class="planeta-encabezado">
            <span class="planeta-simbolo">${SIMBOLOS[nombre] || '•'}</span>
            <h3 class="planeta-nombre">${nombre}</h3>
          </div>
          <div class="planeta-datos">
            ${d.signo} ${d.grado_en_signo.toFixed(2)}° · Casa ${d.casa}
            ${d.retrogrado ? '<span class="retrogrado">· Retrógrado</span>' : ''}
          </div>
          ${d.interpretacion ? `<p class="interpretacion-texto">${d.interpretacion}</p>` : ''}
        </div>
      `
    }).join('')
  return bloques
}

// ===== Capítulo 10: Herida y don (Quirón) — usa el texto ya existente, sin reescritura de prompt todavia =====
function contenidoCap10(planetas) {
  const quiron = planetas.Quiron
  if (!quiron || !quiron.interpretacion) return proximamente()
  return `
    <div class="planeta-bloque">
      <div class="planeta-encabezado">
        <span class="planeta-simbolo">${SIMBOLOS.Quiron}</span>
        <h3 class="planeta-nombre">Quirón</h3>
      </div>
      <div class="planeta-datos">${quiron.signo} ${quiron.grado_en_signo.toFixed(2)}° · Casa ${quiron.casa}</div>
      <p class="interpretacion-texto">${quiron.interpretacion}</p>
    </div>
    <p class="proximamente" style="margin-top:14px;">Interpretación enfocada en herida/sanación/don próximamente — por ahora se muestra el texto general de Quirón.</p>
  `
}

// ===== Capítulo 11: Aspectos más importantes (top 10 por orbe, sin interpretacion individual aun) =====
function contenidoCap11(aspectos) {
  if (!aspectos || !aspectos.length) return proximamente()

  const top10 = [...aspectos].sort((a, b) => a.orbe_usado - b.orbe_usado).slice(0, 10)

  const filas = top10.map(a => `
    <tr><td>${a.punto_a}</td><td>${a.aspecto}</td><td>${a.punto_b}</td><td>${a.orbe_usado}°</td></tr>
  `).join('')

  return `
    <p class="como-leer-texto">Los ${top10.length} aspectos más exactos de tu carta (menor orbe = más influyente):</p>
    <table><tr><th>Punto A</th><th>Aspecto</th><th>Punto B</th><th>Orbe</th></tr>${filas}</table>
    <p class="proximamente" style="margin-top:14px;">Interpretación individual de cada aspecto próximamente.</p>
  `
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
        Esta interpretación fue generada con asistencia de inteligencia artificial como guía simbólica<br>
        de autoconocimiento. No constituye consejo profesional, médico, legal ni financiero.<br>
        Para decisiones importantes de vida, consulta siempre con un profesional cualificado.
      </div>
    </div>
  `
}

function renderReporte(datos) {
  const { metadata, planetas, casas, puntos_angulares, aspectos, dignidades, elementos_y_modalidades, interpretacion } = datos
  const calculoParaRueda = { planetas, casas, puntos_angulares, aspectos }

  const html = `
    ${renderPortada(metadata)}
    <div class="wrap">
      ${renderRuedaNatal(calculoParaRueda)}
      ${capituloWrapper(1, 'Tu carta en una mirada', contenidoCap1(interpretacion.carta_en_una_mirada))}
      ${capituloWrapper(2, 'Visión general', contenidoCap2(interpretacion.overview))}
      ${capituloWrapper(3, 'Tu energía base', contenidoCap3(elementos_y_modalidades, dignidades, interpretacion.lectura_elementos_dignidades))}
      ${capituloWrapper(4, 'Los pilares de tu vida', contenidoCap4(puntos_angulares, interpretacion))}
      ${capituloWrapper(5, 'Tus planetas personales', contenidoCap5(planetas))}
      ${capituloWrapper(6, 'Tus fuerzas invisibles', contenidoCap6(planetas))}
      ${capituloWrapper(7, 'Vocación y carrera', proximamente())}
      ${capituloWrapper(8, 'Dinero y abundancia', proximamente())}
      ${capituloWrapper(9, 'Amor y relaciones', proximamente())}
      ${capituloWrapper(10, 'Tu herida y tu don', contenidoCap10(planetas))}
      ${capituloWrapper(11, 'Tus aspectos más importantes', contenidoCap11(aspectos))}
      ${capituloWrapper(12, 'Tu cielo de hoy', proximamente())}
      ${capituloWrapper(13, 'Los próximos meses', proximamente())}
      ${capituloWrapper(14, 'Tu plan de acción', proximamente())}
      ${capituloWrapper(15, 'Tu brújula personal', proximamente())}
      ${renderConclusion(interpretacion.conclusion, interpretacion.frase_de_cierre)}
    </div>
  `

  document.getElementById('contenido-reporte').innerHTML = html
  document.getElementById('cargando').style.display = 'none'
  document.getElementById('contenido-reporte').style.display = 'block'
}

async function cargarReporte() {
  const { nombre, fecha_hora_local, ciudad, pais } = obtenerParametrosURL()

  if (!fecha_hora_local || !ciudad || !pais) {
    document.getElementById('cargando').innerHTML =
      '<div class="error-box">Falta información para mostrar tu lectura. Verifica el enlace recibido.</div>'
    return
  }

  try {
    const respuesta = await fetch(`${API_BASE}/carta-natal/data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, fecha_hora_local, ciudad, pais }),
    })

    if (!respuesta.ok) {
      const error = await respuesta.json()
      document.getElementById('cargando').innerHTML =
        `<div class="error-box">${error.detail || 'No se pudo cargar tu lectura.'}</div>`
      return
    }

    const datos = await respuesta.json()
    renderReporte(datos)

  } catch (error) {
    console.error(error)
    document.getElementById('cargando').innerHTML =
      '<div class="error-box">Hubo un problema cargando tu lectura. Intenta de nuevo.</div>'
  }
}

cargarReporte()