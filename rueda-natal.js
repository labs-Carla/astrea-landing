/**
 * Componente: Rueda Natal (SVG)
 * Genera el SVG de la rueda astrológica: anillo de signos, anillo de casas
 * (cúspides reales), planetas posicionados por grado exacto, y líneas de
 * aspectos entre ellos. Estilo minimalista dorado/oscuro, coherente con
 * el resto de la landing (usa las mismas CSS custom properties: --gold,
 * --hairline, --ink, --cream).
 *
 * Uso: generarRuedaSVG(calculo) → retorna un string con el <svg> completo,
 * listo para insertar con innerHTML.
 * `calculo` es el objeto tal como lo devuelve /carta-natal/resumen o /pdf:
 * { planetas, casas, puntos_angulares, aspectos }
 */

// El sufijo \uFE0E (selector de variación de texto) fuerza que estos
// caracteres se rendericen como glifo de texto plano, no como emoji a color
// con caja de fondo — varios navegadores (sobre todo en Windows) aplican
// presentación emoji por defecto a varios de estos símbolos astrológicos
// aunque se pida una tipografía de texto en CSS.
const RUEDA_SIGNOS_SIMBOLOS = ["♈","♉","♊","♋","♌","♍","♎","♏","♐","♑","♒","♓"].map(s => s + "\uFE0E");

const RUEDA_PLANETAS_SIMBOLOS = {
  Sol: "☉\uFE0E", Luna: "☽\uFE0E", Mercurio: "☿\uFE0E", Venus: "♀\uFE0E", Marte: "♂\uFE0E",
  Jupiter: "♃\uFE0E", Saturno: "♄\uFE0E", Urano: "♅\uFE0E", Neptuno: "♆\uFE0E", Pluton: "♇\uFE0E",
  NodoNorte: "☊\uFE0E", Quiron: "⚷\uFE0E"
};

const RUEDA_ASPECTO_ESTILOS = {
  Conjuncion:  { color: "#D4B172", dash: "none" },
  Trigono:     { color: "#8FBFA0", dash: "none" },
  Sextil:      { color: "#8FBFA0", dash: "3,3" },
  Cuadratura:  { color: "#C97064", dash: "none" },
  Oposicion:   { color: "#C97064", dash: "3,3" },
};

/**
 * Convierte un grado absoluto (0-360, sistema tropical estándar) en el
 * ángulo (radianes) donde debe dibujarse dentro del SVG, usando el
 * Ascendente como referencia fija a la izquierda (180°) — convención
 * estándar de cartas natales (el Ascendente siempre queda a las 9 en punto).
 */
function ruedaAnguloRad(gradoAbsoluto, ascendenteAbsoluto) {
  const relativo = (ascendenteAbsoluto - gradoAbsoluto + 360) % 360;
  const gradosFinal = 180 - relativo;
  return gradosFinal * Math.PI / 180;
}

function ruedaPunto(radio, rad, cx = 200, cy = 200) {
  return { x: cx + radio * Math.cos(rad), y: cy - radio * Math.sin(rad) };
}

function ruedaObtenerLongitud(nombre, calculo) {
  if (calculo.planetas[nombre]) return calculo.planetas[nombre].longitud_absoluta;
  if (calculo.puntos_angulares[nombre]) return calculo.puntos_angulares[nombre].longitud_absoluta;
  return null;
}

function generarRuedaSVG(calculo) {
  const asc = calculo.puntos_angulares.Ascendente.longitud_absoluta;
  const cx = 200, cy = 200;
  // rExterior: borde exterior de la rueda.
  // rSignos/rCasas: límite interior del anillo de signos = donde terminan
  //   las líneas de cúspides de casa (ambos anillos comparten ese borde).
  // rPlanetas: anillo donde se dibujan los planetas — deliberadamente
  //   separado de rNumerosCasas para que no se solapen visualmente.
  // rNumerosCasas: radio pequeño, cerca del centro, solo para los números 1-12.
  const rExterior = 185, rSignos = 150, rCasas = 150, rPlanetas = 112, rNumerosCasas = 45;

  let svg = `<svg viewBox="-15 -15 430 430" xmlns="http://www.w3.org/2000/svg">`;
  // Disco de fondo: mismo tono oscuro semi-sólido que .card, para que el
  // gráfico contraste contra el fondo estrellado de la página en vez de
  // mezclarse con él.
  svg += `<circle cx="${cx}" cy="${cy}" r="${rExterior}" fill="rgba(11, 18, 32, 0.82)"/>`;

  // Círculos base
  svg += `<circle cx="${cx}" cy="${cy}" r="${rExterior}" fill="none" stroke="var(--hairline)" stroke-width="1"/>`;
  svg += `<circle cx="${cx}" cy="${cy}" r="${rSignos}" fill="none" stroke="var(--hairline)" stroke-width="1"/>`;

  // Anillo de signos: 12 divisiones cada 30°, empezando en 0° Aries absoluto
  for (let i = 0; i < 12; i++) {
    const gradoInicio = i * 30;
    const radInicio = ruedaAnguloRad(gradoInicio, asc);
    const pExt = ruedaPunto(rExterior, radInicio, cx, cy);
    const pInt = ruedaPunto(rSignos, radInicio, cx, cy);
    svg += `<line x1="${pInt.x}" y1="${pInt.y}" x2="${pExt.x}" y2="${pExt.y}" stroke="var(--hairline)" stroke-width="1"/>`;

    const radMedio = ruedaAnguloRad(gradoInicio + 15, asc);
    const pSimbolo = ruedaPunto((rExterior + rSignos) / 2, radMedio, cx, cy);
    svg += `<text x="${pSimbolo.x}" y="${pSimbolo.y}" class="rueda-signo-simbolo">${RUEDA_SIGNOS_SIMBOLOS[i]}</text>`;
  }

  // Anillo de casas: 12 cúspides reales (no genéricas de 30° cada una)
  const cuspides = [];
  for (let n = 1; n <= 12; n++) {
    cuspides.push(calculo.casas[n].longitud_absoluta);
  }
  cuspides.forEach((grado, idx) => {
    const rad = ruedaAnguloRad(grado, asc);
    const pExt = ruedaPunto(rCasas, rad, cx, cy);
    const esEje = idx === 0 || idx === 9; // Casa 1 (Ascendente) y Casa 10 (Medio Cielo)
    svg += `<line x1="${cx}" y1="${cy}" x2="${pExt.x}" y2="${pExt.y}" stroke="${esEje ? 'var(--gold)' : 'var(--hairline)'}" stroke-width="${esEje ? 1.5 : 0.75}"/>`;

    const gradoSiguiente = cuspides[(idx + 1) % 12];
    let diff = gradoSiguiente - grado;
    if (diff < 0) diff += 360;
    const radMedio = ruedaAnguloRad(grado + diff / 2, asc);
    const pNum = ruedaPunto(rNumerosCasas, radMedio, cx, cy);
    svg += `<text x="${pNum.x}" y="${pNum.y}" class="rueda-casa-numero">${idx + 1}</text>`;
  });

  // Etiquetas AC / MC
  const pAsc = ruedaPunto(rExterior + 12, ruedaAnguloRad(asc, asc), cx, cy);
  svg += `<text x="${pAsc.x}" y="${pAsc.y}" class="rueda-eje-label">AC</text>`;
  const mc = calculo.puntos_angulares.MedioCielo.longitud_absoluta;
  const pMc = ruedaPunto(rExterior + 12, ruedaAnguloRad(mc, asc), cx, cy);
  svg += `<text x="${pMc.x}" y="${pMc.y}" class="rueda-eje-label">MC</text>`;

  // Aspectos: líneas entre planetas, coloreadas y punteadas según tipo
  calculo.aspectos.forEach(asp => {
    const gA = ruedaObtenerLongitud(asp.punto_a, calculo);
    const gB = ruedaObtenerLongitud(asp.punto_b, calculo);
    if (gA === null || gB === null) return;
    const pA = ruedaPunto(rPlanetas - 10, ruedaAnguloRad(gA, asc), cx, cy);
    const pB = ruedaPunto(rPlanetas - 10, ruedaAnguloRad(gB, asc), cx, cy);
    const estilo = RUEDA_ASPECTO_ESTILOS[asp.aspecto] || { color: "var(--ink-soft)", dash: "none" };
    svg += `<line x1="${pA.x}" y1="${pA.y}" x2="${pB.x}" y2="${pB.y}" stroke="${estilo.color}" stroke-width="1" stroke-dasharray="${estilo.dash}" opacity="0.55"/>`;
  });

  // Planetas: círculo de fondo + símbolo, posicionados por grado exacto
  for (const [nombre, datos] of Object.entries(calculo.planetas)) {
    const rad = ruedaAnguloRad(datos.longitud_absoluta, asc);
    const p = ruedaPunto(rPlanetas, rad, cx, cy);
    svg += `<circle cx="${p.x}" cy="${p.y}" r="11" fill="var(--cream)" stroke="var(--hairline)" stroke-width="1"/>`;
    svg += `<text x="${p.x}" y="${p.y}" class="rueda-planeta-simbolo">${RUEDA_PLANETAS_SIMBOLOS[nombre] || nombre[0]}</text>`;
  }

  svg += `</svg>`;
  return svg;
}