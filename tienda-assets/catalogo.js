/**
 * Astrea · Tienda — catálogo de reportes. Fuente única para el generador de
 * páginas (scripts/generar-tienda.mjs) y para los tests.
 *
 * `disponible` NO se declara aquí: un reporte se puede comprar solo si tiene
 * checkout en config.js (CHECKOUTS) y un flujo real de generación y entrega.
 * Hoy eso existe únicamente para la carta natal (ver docs/TIENDA.md).
 *
 * Por qué cada uno de los demás no se vende todavía (auditoría 2026-10-10):
 * - revolucion-solar, compatibilidad: el backend no tiene cómo generarlos.
 * - amor, vocacion, dinero, patrones: existe el motor genérico de productos
 *   (producto_configs), pero no hay orden pública, producto en Hotmart ni
 *   página de entrega para ellos.
 */

export const REPORTES = [
  {
    slug: "carta-natal",
    nombre: "Carta natal completa",
    eyebrow: "La lectura de base",
    icono: "i-wheel",
    portada: "/universo-assets/img/libro-tapa.webp",
    resumen: "Un viaje de más de 20 páginas por tu esencia, tu mundo emocional, tus talentos y tus desafíos.",
    descripcion: "Tu carta natal es un mapa del cielo calculado para la fecha, hora y lugar exactos de tu nacimiento. Esta lectura lo recorre completo, en un lenguaje claro y profundo, para ayudarte a comprender tu historia y tu potencial.",
    explora: [
      "Tu esencia y propósito: Sol, Luna y Ascendente",
      "Tu mundo emocional y lo que necesitas para sentirte en casa",
      "Talentos, potencial, desafíos y aprendizajes",
      "Vocación, dinero, amor y tu herida a sanar (Quirón)",
      "El cielo de hoy y de los próximos meses sobre tu carta",
    ],
    incluye: [
      "Más de 20 páginas",
      "Rueda natal, planetas, casas y aspectos",
      "Plan de acción y reflexiones para tu día a día",
      "Revisión humana antes del envío",
      "Entrega por correo en 24–48 h",
    ],
    datos: ["Nombre para la lectura", "Fecha de nacimiento", "Hora de nacimiento (la más aproximada que tengas)", "Ciudad y país de nacimiento", "Correo de entrega"],
    entrega: "Calculamos tu carta con astronomía real (Swiss Ephemeris), la interpretación se redacta con apoyo de IA y la revisamos una por una. Te enviamos tu lectura por correo entre 24 y 48 horas después de confirmar tu pago.",
    beneficioAstreaAi: true,
  },
  {
    slug: "revolucion-solar",
    nombre: "Revolución solar",
    eyebrow: "Tu año, de cumpleaños a cumpleaños",
    icono: "i-sun",
    resumen: "El cielo de tu próximo año personal: los temas que se activan y dónde poner tu energía.",
    descripcion: "Cada año, el Sol vuelve al punto exacto en que estaba cuando naciste. La carta de ese instante describe el tono de tu año personal, de cumpleaños a cumpleaños.",
    explora: [
      "Los temas centrales de tu año personal",
      "Las áreas de vida que piden más atención",
      "Ritmos, oportunidades y momentos de pausa",
    ],
    incluye: ["Carta de tu revolución solar", "Lectura de los temas del año", "Comparación con tu carta natal"],
    datos: ["Tus datos de nacimiento", "La ciudad donde pasarás tu cumpleaños", "El año que quieres leer"],
    motivo: "Estamos preparando el cálculo de la revolución solar.",
  },
  {
    slug: "compatibilidad",
    nombre: "Compatibilidad de pareja",
    eyebrow: "Dos cartas, un vínculo",
    icono: "i-heart",
    resumen: "Cómo se encuentran dos cartas: afinidades, tensiones y lo que cada quien aporta al vínculo.",
    descripcion: "La sinastría compara dos cartas natales para mirar el vínculo como un tercer espacio: lo que fluye, lo que roza y lo que cada persona despierta en la otra.",
    explora: [
      "Afinidades emocionales y formas de querer",
      "Puntos de fricción y cómo conversarlos",
      "Lo que el vínculo despierta en cada persona",
    ],
    incluye: ["Las dos cartas natales", "Aspectos entre ambas cartas", "Lectura del vínculo"],
    datos: ["Datos de nacimiento de ambas personas", "Consentimiento de la otra persona para usar sus datos"],
    motivo: "Estamos preparando la lectura de dos cartas a la vez.",
  },
  {
    slug: "amor",
    nombre: "Amor y vínculos",
    eyebrow: "Cómo amas y cómo te vinculas",
    icono: "i-heart",
    resumen: "Tus necesidades afectivas, tu manera de vincularte y los patrones que se repiten en tus relaciones.",
    descripcion: "Una lectura enfocada en Venus, la Luna, Marte y tu casa VII para comprender qué buscas en un vínculo, qué te da seguridad afectiva y qué patrones relacionales quieres transformar.",
    explora: [
      "Tus necesidades afectivas y tu lenguaje de cuidado",
      "Lo que te atrae y lo que te da seguridad",
      "Patrones relacionales que se repiten",
    ],
    incluye: ["Lectura de Venus, la Luna y Marte", "Tu casa VII de las relaciones", "Preguntas de reflexión"],
    datos: ["Tus datos de nacimiento"],
    motivo: "Este reporte está en preparación.",
  },
  {
    slug: "vocacion",
    nombre: "Vocación y propósito",
    eyebrow: "Tus talentos, tu dirección",
    icono: "i-compass",
    resumen: "Tus talentos, lo que te motiva y las direcciones profesionales que resuenan con tu carta.",
    descripcion: "Una lectura de tu Medio Cielo, tus casas II, VI y X y sus regentes para explorar tus talentos naturales, tus motivaciones y el tipo de trabajo en el que te sientes en tu lugar.",
    explora: [
      "Talentos naturales y formas de aportar",
      "Lo que te motiva y lo que te desgasta",
      "Direcciones profesionales para explorar",
    ],
    incluye: ["Lectura del Medio Cielo", "Casas del trabajo y sus regentes", "Preguntas para tu próxima decisión"],
    datos: ["Tus datos de nacimiento"],
    motivo: "Este reporte está en preparación.",
    nota: "Es una herramienta de reflexión, no una orientación vocacional profesional.",
  },
  {
    slug: "dinero",
    nombre: "Dinero y abundancia",
    eyebrow: "Tu relación con los recursos",
    icono: "i-gem",
    resumen: "Tu relación con los recursos, la seguridad material y el valor que te das.",
    descripcion: "Una lectura de tus casas II y VIII, Venus y Júpiter para mirar cómo te relacionas con el dinero, qué te da seguridad y cómo se conecta tu valor propio con lo que recibes.",
    explora: [
      "Tu relación con el dinero y la seguridad",
      "Valor propio y merecimiento",
      "Recursos compartidos y límites",
    ],
    incluye: ["Lectura de las casas II y VIII", "Venus y Júpiter en tu carta", "Preguntas de reflexión"],
    datos: ["Tus datos de nacimiento"],
    motivo: "Este reporte está en preparación.",
    nota: "No es asesoría financiera ni promete resultados económicos.",
  },
  {
    slug: "patrones",
    nombre: "Patrones y transformación",
    eyebrow: "Lo que se repite y lo que puede cambiar",
    icono: "i-mountain",
    resumen: "Tus reacciones recurrentes, tus conflictos internos y las posibilidades de transformación.",
    descripcion: "Una lectura de Saturno, Plutón, Quirón y los aspectos tensos de tu carta para reconocer reacciones que se repiten, comprender de dónde vienen y abrir caminos de transformación.",
    explora: [
      "Reacciones y conflictos que se repiten",
      "Heridas, límites y aprendizajes (Saturno, Plutón, Quirón)",
      "Posibilidades concretas de transformación",
    ],
    incluye: ["Lectura de Saturno, Plutón y Quirón", "Tus aspectos de tensión", "Prácticas de reflexión"],
    datos: ["Tus datos de nacimiento"],
    motivo: "Este reporte está en preparación.",
    nota: "No reemplaza un acompañamiento psicológico.",
  },
];

/** Un reporte se puede comprar solo si tiene checkout real configurado. */
export function estadoDe(reporte, checkouts) {
  return checkouts[reporte.slug] ? "disponible" : "proximamente";
}

export function reportePorSlug(slug) {
  return REPORTES.find((r) => r.slug === slug) || null;
}
