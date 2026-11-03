/**
 * Astrea · Tienda — catálogo en inglés (2026-11-03). Mismas lecturas, mismos slugs y
 * precios que catalogo.js; aquí solo están los textos. Las lecturas se escriben en
 * español: la tienda en inglés lo dice cerca del precio y en la compra (AVISO_IDIOMA).
 *
 * Si cambias un texto en catalogo.js, cambia también su traducción aquí. Un campo que
 * falte aquí se muestra en español (las pruebas exigen que estén todos).
 */

/** El aviso, idéntico en todo el sitio en inglés. */
export const AVISO_IDIOMA = "Your reading is written in Spanish.";

const INCLUYE_COMUN = [
  "Personalized reading in PDF",
  "Delivered by email in 24–48 h",
];

export const ENTREGA_EN = "We prepare it from your chart, calculated with real astronomy (Swiss Ephemeris), and review it before sending it. It reaches your inbox as a PDF between 24 and 48 hours after we confirm your payment.";

export const REPORTES_EN = {
  "carta-natal": {
    tarjeta: "A deep portrait of your essence, your astrological gifts and your life purpose.",
    nombre: "Complete birth chart",
    categoria: "Self-discovery",
    eyebrow: "Our main reading",
    resumen: "Your map, your essence, your path. Discover what your birth chart reveals about your personality, your emotions, your gifts and the way you live.",
    descripcion: "Your birth chart is a map of the sky calculated for the exact date, time and place you were born. This reading walks through all of it, in clear and deep language, to help you understand your story and your potential.",
    explora: [
      "Your Sun, Moon and Ascendant",
      "Your strengths and personal resources",
      "Your emotional world and your bonds",
      "Your vocation, motivations and challenges",
      "The main patterns in your birth chart",
    ],
    idealPara: "Anyone who wants to understand their birth chart beyond their Sun sign.",
    incluye: ["More than 20 pages", "Natal wheel, planets, houses and aspects", "Human review before it is sent", ...INCLUYE_COMUN],
    datos: ["Name for the reading", "Date of birth", "Time of birth (the closest you have)", "City and country of birth", "Delivery email"],
  },
  pack: {
    tarjeta: "Your complete birth chart and two themed readings of your choice, in a single order.",
    nombre: "Birth chart + 2 readings pack",
    categoria: "Pack",
    eyebrow: "Discounted pack",
    resumen: "Your complete birth chart and two themed readings of your choice: love, vocation, money or patterns. You pay less than buying them separately.",
    descripcion: "Start with the complete map of your birth chart and go deeper into the two areas of your life that matter most to you today. The three readings are prepared from the same birth details and reach your inbox as PDFs.",
    explora: [
      "Your complete birth chart: Sun, Moon, Ascendant, planets, houses and aspects",
      "Two themed readings of your choice",
      "Love and relationships, vocation and purpose, money and abundance, or patterns and transformation",
    ],
    idealPara: "Anyone who wants their birth chart and, on top of it, a deep look at two specific areas of their life.",
    incluye: ["Complete birth chart (more than 20 pages)", "2 themed readings of your choice", "Human review before it is sent", "Three PDFs by email in 24–48 h"],
    datos: ["Name for the reading", "Date, time and place of birth", "The 2 themed readings you choose", "Delivery email"],
  },
  amor: {
    tarjeta: "Understand the way you love, relate and build more conscious bonds.",
    nombre: "Love and relationships",
    categoria: "Relationships",
    eyebrow: "Relationships",
    resumen: "Understand how you love, what you need emotionally and which dynamics you can explore to build more conscious relationships.",
    descripcion: "A reading focused on Venus, the Moon, Mars and your 7th house to understand how you express affection, what makes you feel emotionally safe and which patterns repeat in your bonds.",
    explora: [
      "The way you express affection",
      "Your emotional needs",
      "What awakens your attraction and desire",
      "Patterns that may repeat in your bonds",
      "Resources to communicate and relate better",
    ],
    idealPara: "Anyone who wants to explore the way they love, connect and set boundaries.",
    incluye: INCLUYE_COMUN,
    datos: ["Name for the reading", "Date, time and place of birth", "Delivery email"],
  },
  vocacion: {
    tarjeta: "Discover your talents, your professional direction and how to align your path with your purpose.",
    nombre: "Vocation and purpose",
    categoria: "Career and purpose",
    eyebrow: "Career and purpose",
    resumen: "Explore your talents, motivations and ambitions to understand which professional paths connect with who you are.",
    descripcion: "A reading of your Midheaven, your 2nd, 6th and 10th houses and their rulers to explore your abilities, what drives you and the professional direction that resonates with you.",
    explora: [
      "Your strengths and abilities",
      "What may motivate you professionally",
      "Your relationship with recognition and achievement",
      "Tensions between security, ambition and freedom",
      "Questions to guide your next professional chapter",
    ],
    idealPara: "People exploring their career, a professional change or a new direction.",
    incluye: INCLUYE_COMUN,
    datos: ["Name for the reading", "Date, time and place of birth", "Delivery email"],
    nota: "It is a tool for reflection, not professional career guidance.",
  },
  dinero: {
    tarjeta: "Explore your relationship with money, your resources and your potential for prosperity.",
    nombre: "Money and abundance",
    categoria: "Resources and self-worth",
    eyebrow: "Resources and self-worth",
    resumen: "Explore your relationship with money, security and self-worth through the symbolism of your birth chart.",
    descripcion: "A reading of your 2nd and 8th houses, Venus and Jupiter to look at how you relate to resources, what gives you security and how your self-worth connects with what you receive.",
    explora: [
      "How you understand material security",
      "Your symbolic relationship with resources",
      "Tensions between stability and expansion",
      "Personal beliefs about deserving and worth",
      "Questions to reflect on your financial decisions",
    ],
    idealPara: "Anyone who wants to understand their attitudes toward resources and abundance through self-discovery.",
    incluye: INCLUYE_COMUN,
    datos: ["Name for the reading", "Date, time and place of birth", "Delivery email"],
    nota: "It is not financial advice and does not promise financial results.",
  },
  patrones: {
    tarjeta: "Recognize your patterns, heal your story and awaken your potential for transformation.",
    nombre: "Patterns and transformation",
    categoria: "Deep self-discovery",
    eyebrow: "Deep self-discovery",
    resumen: "Look directly at what you tend to repeat. Explore your reactions, your defense mechanisms and the possibilities of transforming personal patterns.",
    descripcion: "A reading of Saturn, Pluto, Chiron and the tense aspects in your chart to recognize reactions that repeat, understand where they come from and open paths of transformation.",
    explora: [
      "How you react to conflict",
      "What may trigger your defenses",
      "Your relationship with control and boundaries",
      "Behavior patterns that deserve attention",
      "Resources to respond with more awareness",
    ],
    idealPara: "Anyone looking to recognize their patterns and explore new ways of acting.",
    incluye: INCLUYE_COMUN,
    datos: ["Name for the reading", "Date, time and place of birth", "Delivery email"],
    nota: "It does not replace psychological support.",
  },
  "revolucion-solar": {
    tarjeta: "A look at the year ahead: key themes, opportunities and important cycles.",
    nombre: "Solar return",
    categoria: "Cycles and growth",
    eyebrow: "Cycles and growth",
    resumen: "Explore the astrological symbolism of your new solar cycle and the themes you can use as a guide for reflection throughout your personal year.",
    descripcion: "Every year, the Sun returns to the exact point where it was when you were born. The chart for that moment, calculated for the place where you spend your birthday, describes the tone of your personal year.",
    explora: [
      "The highlighted themes of your solar return",
      "Areas of life that invite your attention",
      "Opportunities for growth and learning",
      "Tensions you can approach consciously",
      "Questions to set intentions for your new cycle",
    ],
    idealPara: "Anyone who wants to begin their new personal year with a focused astrological reading.",
    incluye: INCLUYE_COMUN,
    datos: ["Name for the reading", "Date, time and place of birth", "City and country where you will spend your birthday", "The year of the cycle you want to read", "Delivery email"],
  },
  compatibilidad: {
    tarjeta: "Explore the connection between two birth charts and discover its potential.",
    nombre: "Couple compatibility",
    categoria: "Relationships",
    eyebrow: "Relationships",
    resumen: "Two charts, one universe. Explore the dynamics between two people, their affinities, their differences and what they can learn from each other.",
    descripcion: "Synastry compares two birth charts to look at the bond as a third space: what flows, what rubs and what each person awakens in the other.",
    explora: [
      "Affinities and points of connection",
      "Differences in emotional needs",
      "Dynamics of communication and attraction",
      "Strengths and possible tensions",
      "Opportunities to build more conscious bonds",
    ],
    idealPara: "Couples or people who want to explore the astrological dynamics of a bond.",
    incluye: ["Comparative analysis in PDF", "Delivered by email in 24–48 h"],
    datos: ["Your birth details", "The other person’s date, time (if you know it) and place of birth", "Confirmation that the other person agrees to share their details", "Delivery email"],
  },
  "tu-2027": {
    tarjeta: "Your 2027 month by month: the transits and eclipses that activate your chart, and how to make the most of them.",
    nombre: "Your 2027",
    categoria: "Cycles",
    eyebrow: "New",
    resumen: "Your year 2027 in the sky, month by month: the transits of the slow planets over your chart, the eclipses and the seasons that shape your year.",
    descripcion: "A reading of the whole year based on the transits of Jupiter, Saturn, Uranus, Neptune and Pluto over your birth chart, the areas of your life they move through and the eclipses of 2027. It shows you what moves in each season and how to accompany it, without predicting events.",
    explora: [
      "The overall tone of your 2027",
      "January to June and July to December, month by month",
      "Where your life expands and what asks you to mature",
      "The 2027 eclipses in your chart",
      "Your key seasons of the year",
    ],
    idealPara: "Anyone who wants to start the year with a clear map of their cycles and seasons.",
    incluye: ["More than 15 pages", "Transits and eclipses calculated for your chart", ...INCLUYE_COMUN],
    datos: ["Name for the reading", "Date, time and place of birth", "Delivery email"],
  },
};
