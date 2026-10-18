/**
 * Astrea · Tienda — catálogo de reportes. Fuente única para el generador de
 * páginas (scripts/generar-tienda.mjs), el formulario de compra y los tests.
 * Textos y precios: definidos por Astrea el 2026-10-10.
 *
 * `disponible` NO se declara aquí: un reporte se puede comprar solo si tiene
 * checkout en config.js (CHECKOUTS).
 *
 * `extra` debe coincidir con astrea-API app/domain/productos_tienda.py:
 * - "revolucion_solar": ciudad y país donde la persona pasa su cumpleaños, y el año del ciclo.
 * - "segunda_persona": datos de nacimiento de la otra persona (hora opcional) y su consentimiento.
 * - "pack": carta natal + 2 temáticos a elección (PACK_TEMATICOS; POST /pedidos/pack, 2026-10-18).
 *
 * `tarjeta`: texto corto de la tarjeta en la portada del sitio.
 * `portada`: base de las imágenes en tienda-assets/img (<slug>-480.webp y <slug>-960.webp,
 * portadas verticales 2:3 de Astrea, 2026-10-10).
 *
 * Entrega de todos: PDF por correo en 24–48 h tras confirmar el pago. La carta
 * natal se genera con el flujo de siempre; los otros 6 se preparan a mano.
 */

const INCLUYE_COMUN = [
  "Reporte personalizado en PDF",
  "Entrega por correo en 24–48 h",
];

export const ENTREGA = "Lo preparamos a partir de tu carta, calculada con astronomía real (Swiss Ephemeris), y lo revisamos antes de enviarlo. Te llega por correo, en PDF, entre 24 y 48 horas después de confirmar tu pago.";

export const REPORTES = [
  {
    slug: "carta-natal",
    tarjeta: "Un retrato profundo de tu esencia, tus talentos astrológicos y tu propósito de vida.",
    portada: "/tienda-assets/img/carta-natal",
    nombre: "Carta natal completa",
    categoria: "Autoconocimiento",
    principal: true,
    eyebrow: "Producto principal",
    icono: "i-wheel",
    resumen: "Tu mapa, tu esencia, tu camino. Descubre qué revela tu carta natal sobre tu personalidad, tus emociones, tus talentos y tu manera de vivir.",
    descripcion: "Tu carta natal es un mapa del cielo calculado para la fecha, hora y lugar exactos de tu nacimiento. Esta lectura la recorre completa, en un lenguaje claro y profundo, para ayudarte a comprender tu historia y tu potencial.",
    explora: [
      "Tu Sol, Luna y Ascendente",
      "Tus fortalezas y recursos personales",
      "Tu mundo emocional y tus vínculos",
      "Tu vocación, motivaciones y desafíos",
      "Los principales patrones de tu carta natal",
    ],
    idealPara: "Quienes quieren comprender su carta natal más allá de su signo solar.",
    incluye: ["Más de 20 páginas", "Rueda natal, planetas, casas y aspectos", "Revisión humana antes del envío", ...INCLUYE_COMUN],
    datos: ["Nombre para la lectura", "Fecha de nacimiento", "Hora de nacimiento (la más aproximada que tengas)", "Ciudad y país de nacimiento", "Correo de entrega"],
  },
  {
    slug: "pack",
    tarjeta: "Tu carta natal completa y dos lecturas temáticas a tu elección, en un solo pedido.",
    portada: "/tienda-assets/img/pack",
    nombre: "Pack carta natal + 2 lecturas",
    categoria: "Pack",
    principal: true,
    extra: "pack",
    eyebrow: "Pack con descuento",
    icono: "i-wheel",
    resumen: "Tu carta natal completa y dos lecturas temáticas a tu elección: amor, vocación, dinero o patrones. Pagas menos que por separado.",
    descripcion: "Empieza por el mapa completo de tu carta natal y profundiza en las dos áreas de tu vida que más te importan hoy. Las tres lecturas se preparan a partir de tus mismos datos de nacimiento y te llegan por correo, en PDF.",
    explora: [
      "Tu carta natal completa: Sol, Luna, Ascendente, planetas, casas y aspectos",
      "Dos lecturas temáticas a tu elección",
      "Amor y vínculos, vocación y propósito, dinero y abundancia o patrones y transformación",
    ],
    idealPara: "Quienes quieren su carta natal y, además, mirar a fondo dos áreas concretas de su vida.",
    incluye: ["Carta natal completa (más de 20 páginas)", "2 reportes temáticos a elección", "Revisión humana antes del envío", "Tres PDF por correo en 24–48 h"],
    datos: ["Nombre para la lectura", "Fecha, hora y lugar de nacimiento", "Las 2 lecturas temáticas que eliges", "Correo de entrega"],
  },
  {
    slug: "amor",
    tarjeta: "Comprende tu forma de amar, relacionarte y construir vínculos más conscientes.",
    portada: "/tienda-assets/img/amor",
    nombre: "Amor y vínculos",
    categoria: "Relaciones",
    eyebrow: "Relaciones",
    icono: "i-heart",
    resumen: "Comprende cómo amas, qué necesitas emocionalmente y qué dinámicas puedes explorar para construir relaciones más conscientes.",
    descripcion: "Una lectura enfocada en Venus, la Luna, Marte y tu casa VII para comprender cómo expresas el afecto, qué te da seguridad emocional y qué patrones se repiten en tus vínculos.",
    explora: [
      "Tu forma de expresar afecto",
      "Tus necesidades emocionales",
      "Qué despierta tu atracción y deseo",
      "Patrones que pueden repetirse en tus vínculos",
      "Recursos para comunicarte y relacionarte mejor",
    ],
    idealPara: "Quienes quieren explorar su manera de amar, vincularse y establecer límites.",
    incluye: INCLUYE_COMUN,
    datos: ["Nombre para la lectura", "Fecha, hora y lugar de nacimiento", "Correo de entrega"],
  },
  {
    slug: "vocacion",
    tarjeta: "Descubre tus talentos, tu dirección profesional y cómo alinear tu camino con tu propósito.",
    portada: "/tienda-assets/img/vocacion",
    nombre: "Vocación y propósito",
    categoria: "Carrera y propósito",
    eyebrow: "Carrera y propósito",
    icono: "i-compass",
    resumen: "Explora tus talentos, motivaciones y ambiciones para comprender qué caminos profesionales conectan con tu manera de ser.",
    descripcion: "Una lectura de tu Medio Cielo, tus casas II, VI y X y sus regentes para explorar tus capacidades, lo que te motiva y la dirección profesional que resuena contigo.",
    explora: [
      "Tus fortalezas y capacidades",
      "Qué puede motivarte profesionalmente",
      "Tu relación con el reconocimiento y los logros",
      "Tensiones entre seguridad, ambición y libertad",
      "Preguntas para orientar tu próximo capítulo profesional",
    ],
    idealPara: "Personas que están explorando su carrera, un cambio profesional o una nueva dirección.",
    incluye: INCLUYE_COMUN,
    datos: ["Nombre para la lectura", "Fecha, hora y lugar de nacimiento", "Correo de entrega"],
    nota: "Es una herramienta de reflexión, no una orientación vocacional profesional.",
  },
  {
    slug: "dinero",
    tarjeta: "Explora tu relación con el dinero, tus recursos y tu potencial de prosperidad.",
    portada: "/tienda-assets/img/dinero",
    nombre: "Dinero y abundancia",
    categoria: "Recursos y valor propio",
    eyebrow: "Recursos y valor propio",
    icono: "i-gem",
    resumen: "Explora tu relación con el dinero, la seguridad y el valor propio a través del simbolismo de tu carta natal.",
    descripcion: "Una lectura de tus casas II y VIII, Venus y Júpiter para mirar cómo te relacionas con los recursos, qué te da seguridad y cómo se conecta tu valor propio con lo que recibes.",
    explora: [
      "Cómo interpretas la seguridad material",
      "Tu relación simbólica con los recursos",
      "Tensiones entre estabilidad y expansión",
      "Creencias personales sobre merecimiento y valor",
      "Preguntas para reflexionar sobre tus decisiones económicas",
    ],
    idealPara: "Quienes quieren comprender sus actitudes hacia los recursos y la abundancia desde el autoconocimiento.",
    incluye: INCLUYE_COMUN,
    datos: ["Nombre para la lectura", "Fecha, hora y lugar de nacimiento", "Correo de entrega"],
    nota: "No es asesoría financiera ni promete resultados económicos.",
  },
  {
    slug: "patrones",
    tarjeta: "Identifica tus patrones, sana tu historia y activa tu potencial de transformación.",
    portada: "/tienda-assets/img/patrones",
    nombre: "Patrones y transformación",
    categoria: "Autoconocimiento profundo",
    eyebrow: "Autoconocimiento profundo",
    icono: "i-mountain",
    resumen: "Mira de frente aquello que tiendes a repetir. Explora tus reacciones, tus mecanismos de defensa y las posibilidades de transformar patrones personales.",
    descripcion: "Una lectura de Saturno, Plutón, Quirón y los aspectos tensos de tu carta para reconocer reacciones que se repiten, comprender de dónde vienen y abrir caminos de transformación.",
    explora: [
      "Cómo reaccionas ante el conflicto",
      "Qué puede activar tus defensas",
      "Tu relación con el control y los límites",
      "Patrones de comportamiento que merecen atención",
      "Recursos para responder con mayor conciencia",
    ],
    idealPara: "Quienes buscan reconocer sus patrones y explorar nuevas formas de actuar.",
    incluye: INCLUYE_COMUN,
    datos: ["Nombre para la lectura", "Fecha, hora y lugar de nacimiento", "Correo de entrega"],
    nota: "No reemplaza un acompañamiento psicológico.",
  },
  {
    slug: "revolucion-solar",
    tarjeta: "Una mirada al año que viene: temas clave, oportunidades y ciclos importantes.",
    portada: "/tienda-assets/img/revolucion-solar",
    nombre: "Revolución solar",
    categoria: "Ciclos y crecimiento",
    eyebrow: "Ciclos y crecimiento",
    icono: "i-sun",
    extra: "revolucion_solar",
    resumen: "Explora el simbolismo astrológico de tu nuevo ciclo solar y los temas que puedes utilizar como guía de reflexión durante tu año personal.",
    descripcion: "Cada año, el Sol vuelve al punto exacto en que estaba cuando naciste. La carta de ese instante, calculada para el lugar donde pasas tu cumpleaños, describe el tono de tu año personal.",
    explora: [
      "Los temas destacados de tu revolución solar",
      "Áreas de vida que invitan a prestar atención",
      "Oportunidades de crecimiento y aprendizaje",
      "Tensiones que puedes abordar conscientemente",
      "Preguntas para establecer intenciones para tu nuevo ciclo",
    ],
    idealPara: "Quienes quieren comenzar su nuevo año personal con una lectura astrológica enfocada.",
    incluye: INCLUYE_COMUN,
    datos: ["Nombre para la lectura", "Fecha, hora y lugar de nacimiento", "Ciudad y país donde pasarás tu cumpleaños", "El año del ciclo que quieres leer", "Correo de entrega"],
  },
  {
    slug: "compatibilidad",
    tarjeta: "Analiza la conexión entre dos cartas natales y descubre su potencial.",
    portada: "/tienda-assets/img/compatibilidad",
    nombre: "Compatibilidad de pareja",
    categoria: "Relaciones",
    eyebrow: "Relaciones",
    icono: "i-heart",
    extra: "segunda_persona",
    resumen: "Dos cartas, un mismo universo. Explora las dinámicas entre dos personas, sus afinidades, diferencias y posibilidades de aprendizaje mutuo.",
    descripcion: "La sinastría compara dos cartas natales para mirar el vínculo como un tercer espacio: lo que fluye, lo que roza y lo que cada persona despierta en la otra.",
    explora: [
      "Afinidades y puntos de conexión",
      "Diferencias en las necesidades emocionales",
      "Dinámicas de comunicación y atracción",
      "Fortalezas y posibles tensiones",
      "Oportunidades para construir vínculos más conscientes",
    ],
    idealPara: "Parejas o personas que quieren explorar la dinámica astrológica de un vínculo.",
    incluye: ["Análisis comparativo en PDF", "Entrega por correo en 24–48 h"],
    datos: ["Tus datos de nacimiento", "Fecha, hora (si la sabes) y lugar de nacimiento de la otra persona", "La confirmación de que la otra persona acepta compartir sus datos", "Correo de entrega"],
  },
  {
    slug: "tu-2027",
    tarjeta: "Tu año 2027 mes a mes: los tránsitos y eclipses que activan tu carta, y cómo aprovecharlos.",
    portada: "/tienda-assets/img/tu-2027",
    nombre: "Tu 2027",
    categoria: "Ciclos",
    eyebrow: "Nuevo",
    icono: "i-sun",
    resumen: "Tu año 2027 en el cielo, mes a mes: los tránsitos de los planetas lentos sobre tu carta, los eclipses y las temporadas que marcan tu año.",
    descripcion: "Una lectura del año completo a partir de los tránsitos de Júpiter, Saturno, Urano, Neptuno y Plutón sobre tu carta natal, las áreas de tu vida que recorren y los eclipses de 2027. Te muestra qué se mueve en cada temporada y cómo acompañarlo, sin predicciones de eventos.",
    explora: [
      "El tono general de tu 2027",
      "De enero a junio y de julio a diciembre, mes a mes",
      "Dónde se expande tu vida y qué te pide madurar",
      "Los eclipses de 2027 en tu carta",
      "Tus temporadas clave del año",
    ],
    idealPara: "Quienes quieren empezar el año con un mapa claro de sus ciclos y temporadas.",
    incluye: ["Más de 15 páginas", "Tránsitos y eclipses calculados para tu carta", ...INCLUYE_COMUN],
    datos: ["Nombre para la lectura", "Fecha, hora y lugar de nacimiento", "Correo de entrega"],
  },
];

/** Un reporte se puede comprar solo si tiene checkout real configurado. */
export function estadoDe(reporte, checkouts) {
  return checkouts[reporte.slug] ? "disponible" : "proximamente";
}

export function reportePorSlug(slug) {
  return REPORTES.find((r) => r.slug === slug) || null;
}

/** Temáticos que se pueden elegir en el pack (mismo contrato que astrea-API PACK_TEMATICOS). */
export const PACK_TEMATICOS = ["amor", "vocacion", "dinero", "patrones"];
