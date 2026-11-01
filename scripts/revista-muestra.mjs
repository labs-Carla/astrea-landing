/**
 * Astrea · Revista — contenido de MUESTRA para ver la estructura en local.
 * Son artículos de ejemplo, sin aprobar: antes de publicar se reemplazan por textos revisados.
 */

// La entrada de la app. Solo funciona para todas cuando ASTREA_AI_ABIERTA=true en Railway.
export const URL_CARTA_GRATIS = "https://app.astrea-charts.site/entrar?modo=crear";

const SIGNO = (s) => `/universo-assets/img/almanaque/${s}-960.webp`;
const OBS = (n) => `/universo-assets/img/observatorio/${n}`;

export const CATEGORIAS = [
  { slug: "cosmos", nombre: "Cosmos", lema: "Lo que se mueve arriba, explicado sin miedo: tránsitos, signos y el cielo de cada semana." },
  { slug: "autoconocimiento", nombre: "Autoconocimiento", lema: "Tu carta como espejo: emociones, patrones y las historias que te cuentas." },
  { slug: "vinculos", nombre: "Vínculos", lema: "Amor, familia y amistad, leídos desde lo que cada persona necesita." },
  { slug: "proposito", nombre: "Propósito", lema: "Vocación, trabajo y dinero: qué quieres construir y para qué." },
  { slug: "cultura", nombre: "Cultura", lema: "Mitos, historia y arte: de dónde viene todo lo que miramos en el cielo." },
];

export const ARTICULOS = [
  {
    slug: "venus-retrograda-lo-que-vuelve",
    categoria: "cosmos",
    titulo: "Venus retrógrada: lo que vuelve no siempre viene a quedarse",
    entradilla: "Hasta el 14 de noviembre, el cielo nos invita a revisar lo que amamos, lo que valoramos y lo que ya no nos queda.",
    imagen: SIGNO("libra"),
    minutos: 5,
    lectura: "amor",
    enTuCarta: "Mira en qué signo y casa está tu Venus",
    cuerpo: [
      ["", "Cada año y medio, más o menos, Venus parece detenerse y caminar hacia atrás. No retrocede de verdad: es un efecto de la perspectiva desde la Tierra. Pero la astrología lleva siglos usando ese momento como una pausa para mirar lo que damos por sentado."],
      ["Una revisión, no una condena", "Venus habla de lo que nos atrae y de lo que consideramos valioso. Durante su retrogradación no hace falta cancelar planes ni temer a cada mensaje de una expareja. Sirve más preguntarte qué estás sosteniendo por costumbre y qué sigue vivo de verdad."],
      ["Qué mirar en estos días", "Si alguien o algo reaparece, no lo tomes como una señal automática. Tómalo como una pregunta: ¿qué sabes hoy que no sabías antes? A veces la respuesta es volver. A veces es cerrar mejor."],
    ],
  },
  {
    slug: "como-leer-un-transito",
    categoria: "cosmos",
    titulo: "Cómo leer un tránsito sin asustarte",
    entradilla: "Un tránsito no es una sentencia. Es un tema que se activa durante un tiempo, y tú decides qué haces con él.",
    imagen: OBS("astrea-guia-960.webp"),
    minutos: 4,
    lectura: "carta-natal",
    enTuCarta: "Conoce los planetas de tu carta",
    cuerpo: [
      ["", "Un tránsito es la relación entre un planeta de hoy y un punto de tu carta natal. Suena técnico, pero la idea es sencilla: el cielo de ahora conversa con el cielo de tu nacimiento."],
      ["Tres preguntas antes de interpretar", "¿Qué planeta se mueve? Eso dice qué energía entra en juego. ¿Qué toca en tu carta? Eso dice qué parte de ti se activa. ¿Cuánto dura? La Luna pasa en horas; Saturno se queda meses."],
      ["Menos predicción, más atención", "Un buen tránsito no garantiza nada y uno difícil no te condena. Lo útil es notar qué tema aparece en tu vida y darle espacio antes de que te lo exija."],
    ],
  },
  {
    slug: "tu-luna-no-es-tu-humor",
    categoria: "autoconocimiento",
    titulo: "Tu Luna no es tu humor: es lo que necesitas para sentirte a salvo",
    entradilla: "Conocemos nuestro signo solar de memoria. La Luna, en cambio, cuenta lo que casi nunca decimos en voz alta.",
    imagen: SIGNO("cancer"),
    minutos: 6,
    lectura: "patrones",
    enTuCarta: "Descubre en qué signo está tu Luna",
    cuerpo: [
      ["", "Si el Sol describe hacia dónde vas, la Luna describe de dónde vienes: tus reflejos emocionales, lo que aprendiste a necesitar y lo que te calma cuando todo se mueve."],
      ["Lo que te devuelve a ti", "Una Luna en Tauro puede calmarse con rutina y cuerpo. Una Luna en Géminis, hablándolo. Una Luna en Escorpio necesita verdad antes que tranquilidad. Ninguna es mejor; cada una pide algo distinto."],
      ["Una pregunta para esta semana", "La próxima vez que te sientas fuera de lugar, pregúntate qué te faltó hoy. A menudo la respuesta está más cerca de tu Luna que de tu lista de pendientes."],
    ],
  },
  {
    slug: "dejar-de-repetir-la-misma-historia",
    categoria: "autoconocimiento",
    titulo: "Cómo dejar de repetir la misma historia",
    entradilla: "Cuando una situación se repite con otras caras, quizá no sea mala suerte. Quizá sea un patrón pidiendo que lo mires.",
    imagen: SIGNO("escorpio"),
    minutos: 7,
    lectura: "patrones",
    enTuCarta: "Empieza por conocer tu carta",
    cuerpo: [
      ["", "Todos tenemos escenas que vuelven: el mismo tipo de jefe, la misma discusión, la misma forma de desaparecer cuando algo se pone serio."],
      ["Nombrar antes de cambiar", "Tu carta no explica tu vida por ti, pero te da palabras. Ver un patrón escrito ayuda a separarlo de tu identidad: no eres así, aprendiste a responder así."],
      ["El primer paso es pequeño", "No hace falta transformarlo todo. Basta con notar el momento en que la historia empieza y hacer una sola cosa distinta."],
    ],
  },
  {
    slug: "casa-7-a-quien-eliges",
    categoria: "vinculos",
    titulo: "Lo que tu casa 7 dice de a quién eliges",
    entradilla: "La casa de las relaciones no predice con quién terminarás. Muestra qué buscas en otra persona, y por qué.",
    imagen: "/universo-assets/img/arco-luna.webp",
    minutos: 5,
    lectura: "amor",
    enTuCarta: "Mira qué signo tienes en tu casa 7",
    cuerpo: [
      ["", "La casa 7 comienza en el Descendente, el punto opuesto a tu Ascendente. Si el Ascendente es cómo te presentas, el Descendente es aquello que sueles buscar afuera."],
      ["Lo que proyectamos", "Con frecuencia nos atrae en otros lo que no hemos desarrollado en nosotros. Por eso la casa 7 habla tanto de pareja como de aprendizaje."],
      ["Cómo usarla", "Mira el signo que la ocupa y pregúntate si reconoces esas cualidades en las personas que eliges. Luego pregúntate cuáles podrías cultivar tú."],
    ],
  },
  {
    slug: "compatibilidad-no-es-destino",
    categoria: "vinculos",
    titulo: "Compatibilidad no es destino: qué mirar de verdad en una sinastría",
    entradilla: "Dos signos no deciden una relación. Dos cartas completas, en cambio, cuentan una conversación mucho más interesante.",
    imagen: SIGNO("geminis"),
    minutos: 6,
    lectura: "compatibilidad",
    enTuCarta: "Compara tu carta con la de otra persona",
    cuerpo: [
      ["", "La sinastría compara dos cartas natales para ver dónde se encuentran dos personas: qué fluye, qué roza y qué las hace crecer."],
      ["Lo fácil no siempre es lo mejor", "Las zonas de fricción no son una mala señal. Muchas veces son el lugar donde la relación pide conversación. Y una química sin retos también puede estancarse."],
      ["Por dónde empezar", "Mira cómo se relacionan las Lunas, Venus y Marte. Más que un puntaje, busca comprender qué necesita cada persona para sentirse querida."],
    ],
  },
  {
    slug: "medio-cielo-que-quieres-hacer",
    categoria: "proposito",
    titulo: "Medio Cielo: la pregunta de qué quieres hacer con tu vida",
    entradilla: "Es el punto más alto de tu carta. No describe un empleo: describe aquello por lo que quieres ser reconocida.",
    imagen: SIGNO("capricornio"),
    minutos: 5,
    lectura: "vocacion",
    enTuCarta: "Encuentra tu Medio Cielo",
    cuerpo: [
      ["", "El Medio Cielo marca la parte de tu carta más visible: tu dirección pública, tu vocación y el tipo de huella que quieres dejar."],
      ["Más verbo que profesión", "Un Medio Cielo en Géminis no significa ser periodista. Significa conectar, traducir, poner ideas en circulación. Eso puede vivir en muchos oficios."],
      ["Para pensar", "Si nadie te estuviera mirando, ¿qué seguirías construyendo? Empieza por ahí."],
    ],
  },
  {
    slug: "dinero-y-casa-2",
    categoria: "proposito",
    titulo: "Dinero y casa 2: la relación que nadie te enseñó a mirar",
    entradilla: "Lo que crees que vales y lo que te permites recibir están más cerca de lo que parece.",
    imagen: SIGNO("tauro"),
    minutos: 4,
    lectura: "dinero",
    enTuCarta: "Mira qué signo tienes en tu casa 2",
    cuerpo: [
      ["", "La casa 2 habla de recursos: dinero, sí, pero también tiempo, talentos y aquello que sientes que te sostiene."],
      ["No es una promesa de riqueza", "Tu carta no dice cuánto vas a ganar. Sí puede mostrarte cómo te relacionas con la seguridad y qué te hace sentir que tienes suficiente."],
      ["Un ejercicio simple", "Escribe tres cosas que valoras y mira a dónde fue tu dinero este mes. La distancia entre esas dos listas suele decir mucho."],
    ],
  },
  {
    slug: "quien-fue-astrea",
    categoria: "cultura",
    titulo: "Quién fue Astrea, la diosa que se fue de la Tierra",
    entradilla: "La última inmortal en abandonarnos subió al cielo y, según el mito, sigue ahí arriba.",
    imagen: OBS("astrea-estatua-960.webp"),
    minutos: 4,
    lectura: "carta-natal",
    enTuCarta: "Mira tu cielo de nacimiento",
    cuerpo: [
      ["", "En la mitología griega, Astrea era la doncella de la justicia y la pureza, una de las inmortales que convivían con los humanos en la Edad de Oro."],
      ["La última en irse", "Cuando las edades se fueron oscureciendo, los dioses dejaron la Tierra. Ovidio cuenta en las Metamorfosis que Astrea fue la última en marcharse, cansada de la violencia."],
      ["Una estrella que espera", "El mito la lleva al cielo, donde se la asocia con la constelación de Virgo. Su historia también es una promesa: en muchos relatos, su regreso anuncia una nueva Edad de Oro."],
    ],
  },
  {
    slug: "como-babilonia-dividio-el-cielo",
    categoria: "cultura",
    titulo: "Antes del horóscopo: cómo Babilonia dividió el cielo en doce",
    entradilla: "El zodíaco que hoy cabe en un celular empezó como una herramienta de astrónomos, hace unos 2.500 años.",
    imagen: "/universo-assets/img/arco-columnas.webp",
    minutos: 6,
    lectura: "carta-natal",
    enTuCarta: "Calcula tu carta con astronomía real",
    cuerpo: [
      ["", "Los astrónomos de Babilonia observaron el cielo durante siglos y anotaron con paciencia los movimientos de la Luna y los planetas."],
      ["Doce partes iguales", "Hacia el siglo V antes de nuestra era dividieron en doce secciones iguales la franja por la que se mueven el Sol, la Luna y los planetas. Así podían ubicar con precisión cada posición."],
      ["Un viaje de ideas", "Esa división pasó a los griegos, que le sumaron sus mitos y su filosofía. Lo que hoy llamamos astrología es el resultado de ese largo viaje."],
    ],
  },
];
