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

// Variante de colores de aspecto para el tema claro — los tonos pastel del
// modo oscuro pierden contraste sobre un disco crema, así que se oscurecen.
const RUEDA_ASPECTO_ESTILOS_CLARO = {
  Conjuncion:  { color: "#8C5F24", dash: "none" },
  Trigono:     { color: "#5B8A66", dash: "none" },
  Sextil:      { color: "#5B8A66", dash: "3,3" },
  Cuadratura:  { color: "#B0503F", dash: "none" },
  Oposicion:   { color: "#B0503F", dash: "3,3" },
};

// Elemento de cada signo, en el mismo orden que RUEDA_SIGNOS_SIMBOLOS
// (Aries..Piscis) — se repite Fuego/Tierra/Aire/Agua cada 4 signos.
const RUEDA_ELEMENTOS_POR_SIGNO = ["Fuego","Tierra","Aire","Agua","Fuego","Tierra","Aire","Agua","Fuego","Tierra","Aire","Agua"];

// Lavados pastel muy sutiles para las cuñas del anillo de signos en tema
// claro — dan una lectura elemental "de un vistazo" sin competir con los
// símbolos ni el dorado de marca.
const RUEDA_ELEMENTOS_COLOR_CLARO = {
  Fuego: "rgba(196, 106, 84, 0.16)",
  Tierra: "rgba(140, 130, 70, 0.16)",
  Aire: "rgba(122, 92, 166, 0.14)",
  Agua: "rgba(90, 140, 158, 0.14)",
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

// Construye una cuña (sector anular) como polígono aproximado, entre dos
// radios y dos grados absolutos — se usa para el lavado de color elemental
// detrás del anillo de signos en tema claro. Se aproxima con segmentos en
// vez de arcos SVG reales porque ruedaAnguloRad/ruedaPunto ya resuelven la
// rotación respecto al Ascendente y la reflexión de eje Y de forma no
// lineal; con 8 pasos por cuña de 30° la curva se ve perfectamente lisa.
function ruedaCunaPath(rInt, rExt, gradoInicio, gradoFin, asc, cx, cy, pasos = 8) {
  const puntos = [];
  for (let k = 0; k <= pasos; k++) {
    const g = gradoInicio + (gradoFin - gradoInicio) * (k / pasos);
    puntos.push(ruedaPunto(rExt, ruedaAnguloRad(g, asc), cx, cy));
  }
  for (let k = pasos; k >= 0; k--) {
    const g = gradoInicio + (gradoFin - gradoInicio) * (k / pasos);
    puntos.push(ruedaPunto(rInt, ruedaAnguloRad(g, asc), cx, cy));
  }
  return "M" + puntos.map(p => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join("L") + "Z";
}

/**
 * `opciones.tema`: "oscuro" (default, sin cambios de comportamiento) o
 * "claro" — activa el disco crema, la textura de estrellas sutil, el
 * lavado elemental del anillo de signos, colores de aspecto con más
 * contraste, y resalta Sol/Luna (el "Big Three") con un marcador dorado
 * sólido en vez del círculo outline que usan el resto de los planetas.
 */
function generarRuedaSVG(calculo, opciones = {}) {
  const claro = opciones.tema === "claro";
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
  // Disco de fondo. En tema oscuro, un navy semi-sólido para que el gráfico
  // contraste contra el fondo estrellado en vez de mezclarse con él. En
  // tema claro, un crema casi blanco — coherente con el resto de las cards
  // de vidrio de la página.
  svg += `<circle cx="${cx}" cy="${cy}" r="${rExterior}" fill="${claro ? 'rgba(255, 252, 246, 0.92)' : 'rgba(11, 18, 32, 0.82)'}"/>`;

  if (claro) {
    // Textura de estrellas sutil, eco del motivo de constelaciones del
    // fondo de la página — puntos dorados fijos y casi imperceptibles.
    const estrellas = [[-118,-92],[128,-108],[-148,42],[142,68],[-58,148],[68,-148],[2,-168],[-168,-6],[100,130]];
    estrellas.forEach(([dx, dy]) => {
      svg += `<circle cx="${cx + dx}" cy="${cy + dy}" r="1.3" fill="var(--gold-soft)" opacity="0.4"/>`;
    });
  }

  // Círculos base
  svg += `<circle cx="${cx}" cy="${cy}" r="${rExterior}" fill="none" stroke="var(--hairline)" stroke-width="1"/>`;
  svg += `<circle cx="${cx}" cy="${cy}" r="${rSignos}" fill="none" stroke="var(--hairline)" stroke-width="1"/>`;

  // Anillo de signos: 12 divisiones cada 30°, empezando en 0° Aries absoluto
  for (let i = 0; i < 12; i++) {
    const gradoInicio = i * 30;

    if (claro) {
      // Lavado elemental (Fuego/Tierra/Aire/Agua) detrás de cada signo —
      // permite leer el balance de elementos de un vistazo, directo en la
      // rueda, sin agregar más texto.
      const elemento = RUEDA_ELEMENTOS_POR_SIGNO[i];
      const cuna = ruedaCunaPath(rSignos, rExterior, gradoInicio, gradoInicio + 30, asc, cx, cy);
      svg += `<path d="${cuna}" fill="${RUEDA_ELEMENTOS_COLOR_CLARO[elemento]}"/>`;
    }

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
  const estilosAspecto = claro ? RUEDA_ASPECTO_ESTILOS_CLARO : RUEDA_ASPECTO_ESTILOS;
  calculo.aspectos.forEach(asp => {
    const gA = ruedaObtenerLongitud(asp.punto_a, calculo);
    const gB = ruedaObtenerLongitud(asp.punto_b, calculo);
    if (gA === null || gB === null) return;
    const pA = ruedaPunto(rPlanetas - 10, ruedaAnguloRad(gA, asc), cx, cy);
    const pB = ruedaPunto(rPlanetas - 10, ruedaAnguloRad(gB, asc), cx, cy);
    const estilo = estilosAspecto[asp.aspecto] || { color: "var(--ink-soft)", dash: "none" };
    svg += `<line x1="${pA.x}" y1="${pA.y}" x2="${pB.x}" y2="${pB.y}" stroke="${estilo.color}" stroke-width="1" stroke-dasharray="${estilo.dash}" opacity="0.55"/>`;
  });

  // Planetas: círculo de fondo + símbolo, posicionados por grado exacto.
  // En tema claro, Sol y Luna (el "Big Three" junto al Ascendente) llevan
  // un marcador dorado sólido en vez del outline plano de los demás
  // planetas, para que salten a la vista igual que en la sección de
  // resultado justo debajo del gráfico.
  for (const [nombre, datos] of Object.entries(calculo.planetas)) {
    const rad = ruedaAnguloRad(datos.longitud_absoluta, asc);
    const p = ruedaPunto(rPlanetas, rad, cx, cy);
    const destacado = claro && (nombre === "Sol" || nombre === "Luna");
    if (destacado) {
      svg += `<circle cx="${p.x}" cy="${p.y}" r="12.5" fill="var(--gold)" stroke="var(--gold)" stroke-width="1"/>`;
      svg += `<text x="${p.x}" y="${p.y}" class="rueda-planeta-simbolo" style="fill:#FFFCF6;">${RUEDA_PLANETAS_SIMBOLOS[nombre] || nombre[0]}</text>`;
    } else {
      svg += `<circle cx="${p.x}" cy="${p.y}" r="11" fill="var(--cream)" stroke="var(--hairline)" stroke-width="1"/>`;
      svg += `<text x="${p.x}" y="${p.y}" class="rueda-planeta-simbolo">${RUEDA_PLANETAS_SIMBOLOS[nombre] || nombre[0]}</text>`;
    }
  }

  svg += `</svg>`;
  return svg;
}