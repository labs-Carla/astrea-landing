/**
 * Astrea · Tienda — lógica pura del flujo de compra (sin DOM, testeable con node --test).
 *
 * Dos canales reales en el backend (astrea-API):
 *
 * - Carta natal → POST {API}/carta-natal/orden  {nombre, email, fecha_hora_local, ciudad, pais}
 *     -> {status, orden_id, referencia}; Hotmart sck=astrea-orden-<id>
 *     estado: GET {API}/carta-natal/orden/{referencia}/estado
 *   Reenviar los mismos datos natales devuelve la MISMA orden y nunca des-confirma un pago.
 *
 * - Los otros 6 reportes → POST {API}/pedidos  {..., producto, revolucion_solar?, segunda_persona?}
 *     -> {status, pedido_id, referencia}; Hotmart sck=astrea-pedido-<id>
 *     estado: GET {API}/pedidos/{referencia}/estado
 *   Reenviar el mismo pedido antes de confirmar el pago devuelve el MISMO pedido.
 *
 * - Pack (carta natal + 2 temáticos) → POST {API}/pedidos/pack  {nombre, email, fecha_hora_local, ciudad, pais, tematicos}
 *     -> {status, orden_id, referencia}: es una orden de carta natal (sck=astrea-orden-<id>, mismo estado)
 *     con los 2 temáticos colgados; se confirman con ella.
 *
 * En todos: nace sin pago confirmado (el admin lo confirma a mano en el panel),
 * 400/422 {detail}, 429 (5/min). `referencia` es aleatoria: es lo único que se
 * usa para consultar el estado. El frontend nunca envía precio ni estado de pago.
 */

import { PACK_TEMATICOS } from "./catalogo.js";
import { cabeceraIdioma } from "./idioma.js";

export const LIMITES = { nombreMin: 2, textoMax: 150, anioMin: 1900 };

export const CANALES = {
  "carta-natal": { crear: "/carta-natal/orden", campoId: "orden_id", sck: "astrea-orden", estado: (ref) => `/carta-natal/orden/${encodeURIComponent(ref)}/estado` },
  pedido: { crear: "/pedidos", campoId: "pedido_id", sck: "astrea-pedido", estado: (ref) => `/pedidos/${encodeURIComponent(ref)}/estado` },
  pack: { crear: "/pedidos/pack", campoId: "orden_id", sck: "astrea-orden", estado: (ref) => `/carta-natal/orden/${encodeURIComponent(ref)}/estado` },
  // Tarjeta de regalo (astrea-API /regalos): se paga con el checkout de la lectura regalada.
  regalo: { crear: "/regalos", campoId: "regalo_id", sck: "astrea-regalo", estado: (ref) => `/regalos/${encodeURIComponent(ref)}/estado` },
};

/** La carta natal tiene su flujo de siempre; los demás reportes son pedidos. */
export const canalDe = (slug) => (slug === "carta-natal" || slug === "pack" ? slug : "pedido");

/** Temáticos marcados en el formulario del pack (casillas pack_<slug>). */
export const tematicosElegidos = (d) => PACK_TEMATICOS.filter((t) => d[`pack_${t}`]);

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Mensajes para la persona, en el idioma de la página (idioma.js). El español es el de siempre.
const MENSAJES = {
  es: {
    fecha: "Indica la fecha de nacimiento.", fecha1900: "La fecha no puede ser anterior a 1900.", fechaFutura: "La fecha no puede estar en el futuro.",
    largo: "Es demasiado largo.", nombre: "Escribe el nombre que quieres en tu lectura.", nombreLargo: "El nombre es demasiado largo.",
    email: "Revisa tu correo: ahí te enviaremos tu lectura.", hora: "Indica tu hora de nacimiento (la más aproximada que tengas).",
    ciudad: "Indica tu ciudad de nacimiento.", pais: "Indica tu país de nacimiento.",
    rsCiudad: "Indica la ciudad donde pasarás tu cumpleaños.", rsPais: "Indica el país donde pasarás tu cumpleaños.", rsAnio: "Elige el ciclo que quieres leer.",
    pack: "Elige 2 lecturas temáticas.", p2Nombre: "Escribe el nombre de la otra persona.",
    p2Hora: "Completa hora y minutos, o deja ambos vacíos si no la sabes.",
    p2Ciudad: "Indica la ciudad de nacimiento de la otra persona.", p2Pais: "Indica su país de nacimiento.",
    p2Consentimiento: "Necesitamos que confirmes que la otra persona aceptó compartir sus datos.",
    e429: "Hiciste varios intentos seguidos. Espera un minuto y vuelve a intentarlo.",
    lugar: (l) => `No encontramos «${l}». Revisa cómo está escrita o prueba con una ciudad cercana.`,
    geo: "No pudimos verificar la ciudad en este momento. Inténtalo de nuevo en unos minutos.",
    e400: null,
    e422: "Algún dato no es válido. Revisa el formulario.",
    otro: "No pudimos registrar tu pedido. Inténtalo de nuevo en unos minutos o escríbenos por WhatsApp.",
    producto: "Elige la lectura que quieres regalar.", compradorNombre: "Escribe tu nombre.",
    compradorEmail: "Revisa tu correo: ahí te enviaremos la tarjeta.", paraNombre: "Escribe el nombre de quien recibe el regalo.",
    dedicatoria: (n) => `La dedicatoria puede tener hasta ${n} caracteres.`, acepto: "Necesitamos que aceptes los términos para continuar.",
  },
  en: {
    fecha: "Enter the date of birth.", fecha1900: "The date can’t be earlier than 1900.", fechaFutura: "The date can’t be in the future.",
    largo: "It’s too long.", nombre: "Write the name you want on your reading.", nombreLargo: "The name is too long.",
    email: "Check your email address: that’s where we’ll send your reading.", hora: "Enter your time of birth (the closest you have).",
    ciudad: "Enter your city of birth.", pais: "Enter your country of birth.",
    rsCiudad: "Enter the city where you will spend your birthday.", rsPais: "Enter the country where you will spend your birthday.", rsAnio: "Choose the cycle you want to read.",
    pack: "Choose 2 themed readings.", p2Nombre: "Write the other person’s name.",
    p2Hora: "Fill in both hour and minutes, or leave both empty if you don’t know it.",
    p2Ciudad: "Enter the other person’s city of birth.", p2Pais: "Enter their country of birth.",
    p2Consentimiento: "Please confirm that the other person agreed to share their details.",
    e429: "You made several attempts in a row. Wait a minute and try again.",
    lugar: (l) => `We couldn’t find “${l}”. Check how it’s spelled or try a nearby city.`,
    geo: "We couldn’t verify the city right now. Please try again in a few minutes.",
    e400: "We couldn’t register your order with these details. Please check them and try again.",
    e422: "Some of the details aren’t valid. Please check the form.",
    otro: "We couldn’t register your order. Please try again in a few minutes or write to us on WhatsApp.",
    producto: "Choose the reading you want to give.", compradorNombre: "Write your name.",
    compradorEmail: "Check your email address: that’s where we’ll send the gift card.", paraNombre: "Write the name of the person receiving the gift.",
    dedicatoria: (n) => `The dedication can be up to ${n} characters long.`, acepto: "Please accept the terms to continue.",
  },
};
const mensajes = (idioma) => MENSAJES[idioma] || MENSAJES.es;
const largo = (v) => (v || "").trim().length;
const horaValida = (h, m) => {
  const H = Number(h), M = Number(m);
  return h !== "" && h != null && m !== "" && m != null && Number.isInteger(H) && H >= 0 && H <= 23 && Number.isInteger(M) && M >= 0 && M <= 59;
};

function validarFecha(valor, ahora, m) {
  const fecha = valor ? new Date(`${valor}T00:00:00`) : null;
  if (!fecha || Number.isNaN(fecha.getTime())) return m.fecha;
  if (fecha.getFullYear() < LIMITES.anioMin) return m.fecha1900;
  if (fecha > ahora) return m.fechaFutura;
  return null;
}

function validarLugar(errores, d, campoCiudad, campoPais, textoCiudad, textoPais, m) {
  for (const [campo, texto] of [[campoCiudad, textoCiudad], [campoPais, textoPais]]) {
    if (largo(d[campo]) < 2) errores[campo] = texto;
    else if (largo(d[campo]) > LIMITES.textoMax) errores[campo] = m.largo;
  }
}

/** Años de revolución solar que acepta el backend: el actual, el anterior y el siguiente. */
export function aniosDeRevolucion(ahora = new Date()) {
  const a = ahora.getFullYear();
  return [a - 1, a, a + 1];
}

/**
 * Valida los datos del formulario. `extra`: null | "revolucion_solar" | "segunda_persona"
 * (catalogo.js). `idioma`: "es" | "en", el de los mensajes. Devuelve {campo: mensaje} (vacío = válido).
 */
export function validarDatos(d, ahora = new Date(), extra = null, idioma = "es") {
  const errores = {};
  const m = mensajes(idioma);

  if (largo(d.nombre) < LIMITES.nombreMin) errores.nombre = m.nombre;
  else if (largo(d.nombre) > LIMITES.textoMax) errores.nombre = m.nombreLargo;

  if (!EMAIL.test((d.email || "").trim())) errores.email = m.email;

  const fecha = validarFecha(d.fecha, ahora, m);
  if (fecha) errores.fecha = fecha;
  if (!horaValida(d.hora, d.minuto)) errores.hora = m.hora;
  validarLugar(errores, d, "ciudad", "pais", m.ciudad, m.pais, m);

  if (extra === "revolucion_solar") {
    validarLugar(errores, d, "rs_ciudad", "rs_pais", m.rsCiudad, m.rsPais, m);
    if (!aniosDeRevolucion(ahora).includes(Number(d.rs_anio))) errores.rs_anio = m.rsAnio;
  }

  if (extra === "pack" && tematicosElegidos(d).length !== 2) errores.pack = m.pack;

  if (extra === "segunda_persona") {
    if (largo(d.p2_nombre) < LIMITES.nombreMin) errores.p2_nombre = m.p2Nombre;
    else if (largo(d.p2_nombre) > LIMITES.textoMax) errores.p2_nombre = m.nombreLargo;
    const f2 = validarFecha(d.p2_fecha, ahora, m);
    if (f2) errores.p2_fecha = f2;
    // Hora opcional: vacía = desconocida; si se da, completa.
    const algunaHora = (d.p2_hora ?? "") !== "" || (d.p2_minuto ?? "") !== "";
    if (algunaHora && !horaValida(d.p2_hora, d.p2_minuto)) errores.p2_hora = m.p2Hora;
    validarLugar(errores, d, "p2_ciudad", "p2_pais", m.p2Ciudad, m.p2Pais, m);
    if (!d.p2_consentimiento) errores.p2_consentimiento = m.p2Consentimiento;
  }
  return errores;
}

const dos = (n) => String(n).padStart(2, "0");

/** Cuerpo exacto para el backend según el reporte (hora local de nacimiento, sin zona). */
export function cuerpoDeOrden(d, slug = "carta-natal", extra = null) {
  const base = {
    nombre: d.nombre.trim(),
    email: d.email.trim(),
    fecha_hora_local: `${d.fecha}T${dos(Number(d.hora))}:${dos(Number(d.minuto))}:00`,
    ciudad: d.ciudad.trim(),
    pais: d.pais.trim(),
  };
  // Casilla opcional «Quiero recibir correos de Astrea»: solo viaja si se marcó (POST … acepta_correos).
  if (d.acepta_correos) base.acepta_correos = true;
  if (canalDe(slug) === "carta-natal") return base;
  if (canalDe(slug) === "pack") return { ...base, tematicos: tematicosElegidos(d) };
  const cuerpo = { ...base, producto: slug };
  if (extra === "revolucion_solar") {
    cuerpo.revolucion_solar = { ciudad: d.rs_ciudad.trim(), pais: d.rs_pais.trim(), anio: Number(d.rs_anio) };
  }
  if (extra === "segunda_persona") {
    const conHora = (d.p2_hora ?? "") !== "";
    cuerpo.segunda_persona = {
      nombre: d.p2_nombre.trim(), fecha: d.p2_fecha,
      hora: conHora ? `${dos(Number(d.p2_hora))}:${dos(Number(d.p2_minuto))}` : null,
      ciudad: d.p2_ciudad.trim(), pais: d.p2_pais.trim(), consentimiento: Boolean(d.p2_consentimiento),
    };
  }
  return cuerpo;
}

/** Referencia que el panel usa para cruzar la venta de Hotmart con el pedido. */
export const referenciaDeOrden = (ordenId, slug = "carta-natal") => `${CANALES[canalDe(slug)].sck}-${ordenId}`;

/**
 * Cupón del descuento de Astrea Plus (2026-11-02): la app lo agrega al enlace solo para
 * quien tiene Plus (?cupon= en /comprar, #cupon= en /pagar). null si no viene o no es válido.
 */
export function cuponValido(valor) {
  const c = String(valor ?? "").trim();
  return /^[A-Za-z0-9_-]{3,40}$/.test(c) ? c : null;
}

/** URL del checkout real: email y nombre precargados, el pedido en `sck` y, si hay, el cupón de Plus. */
export function urlDeCheckout(checkoutBase, ordenId, { nombre, email }, slug = "carta-natal", cupon = null) {
  if (!Number.isInteger(ordenId) || ordenId <= 0) throw new Error("orden inválida");
  const url = new URL(checkoutBase);
  url.searchParams.set("email", email);
  url.searchParams.set("name", nombre);
  url.searchParams.set("sck", referenciaDeOrden(ordenId, slug));
  if (cuponValido(cupon)) url.searchParams.set("offDiscount", cuponValido(cupon));   // Hotmart aplica el cupón
  return url.toString();
}

/** Clave estable de los datos: el mismo envío (doble clic, reintento) reutiliza el pedido ya creado. */
export function huellaDeDatos(cuerpo) {
  const { email, ciudad, pais, ...resto } = cuerpo;
  return JSON.stringify([email.toLowerCase(), ciudad.toLowerCase(), pais.toLowerCase(), { ...resto, nombre: undefined }]);
}

/**
 * Traduce la respuesta de error del backend a un mensaje para la persona. El backend
 * responde en español: en inglés, un detalle que no reconocemos se cambia por uno genérico.
 */
export function mensajeDeError(status, detalle, idioma = "es") {
  const m = mensajes(idioma);
  if (status === 429) return m.e429;
  if (status === 400 && typeof detalle === "string") {
    const lugar = detalle.match(/No se encontr\S* la ubicaci\S* '([^']+)'/i);
    if (lugar) return m.lugar(lugar[1]);
    if (/geocodificaci/i.test(detalle)) return m.geo;
    return m.e400 ?? detalle;
  }
  if (status === 422) return m.e422;
  return m.otro;
}

/**
 * Crea el pedido real una sola vez por envío: si ya hay uno para la misma
 * huella (guardado en `memoria`), lo reutiliza sin volver a llamar al backend.
 * `fetchImpl` y `memoria` ({get,set}) se inyectan para poder testear.
 */
export async function crearOrden({ apiBase, cuerpo, slug = "carta-natal", fetchImpl = fetch, memoria, idioma = "es" }) {
  const canal = CANALES[canalDe(slug)];
  const huella = huellaDeDatos(cuerpo);
  const previa = memoria?.get(huella);
  if (previa) {
    // Formato anterior: solo el número de orden.
    const p = typeof previa === "number" ? { ordenId: previa, referencia: null } : previa;
    return { ...p, reutilizada: true };
  }

  let respuesta;
  try {
    respuesta = await fetchImpl(`${apiBase}${canal.crear}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...cabeceraIdioma(idioma) },
      body: JSON.stringify(cuerpo),
    });
  } catch {
    throw new ErrorDePedido(mensajeDeError(0, null, idioma), { reintentable: true });
  }
  let datos = null;
  try { datos = await respuesta.json(); } catch { /* cuerpo vacío o no JSON */ }
  if (!respuesta.ok) {
    throw new ErrorDePedido(mensajeDeError(respuesta.status, datos?.detail, idioma), { reintentable: respuesta.status >= 500 || respuesta.status === 429 });
  }
  const ordenId = datos?.[canal.campoId];
  if (!Number.isInteger(ordenId) || ordenId <= 0) throw new ErrorDePedido(mensajeDeError(500, null, idioma), { reintentable: true });
  // Un backend anterior a astrea-API #92 no devuelve referencia: la compra sigue igual, sin consulta de estado.
  const referencia = typeof datos.referencia === "string" && datos.referencia.length >= 16 ? datos.referencia : null;
  memoria?.set(huella, { ordenId, referencia });
  return { ordenId, referencia, reutilizada: false };
}

export class ErrorDePedido extends Error {
  constructor(mensaje, { reintentable }) { super(mensaje); this.reintentable = reintentable; }
}

/**
 * Estados que la tienda sabe mostrar. Por sí solo, el frontend solo puede
 * afirmar "creado" (el backend respondió con un pedido) y "pendiente" (volvió
 * del checkout): que la persona regrese de Hotmart NO prueba el pago.
 * "confirmado", "enviado" y "reembolsado" solo los informa el backend.
 * "rechazado" queda listo para cuando Hotmart informe las ventas (webhook).
 */
export const ESTADOS_PEDIDO = {
  creado: { titulo: "Pedido creado", texto: "Guardamos tus datos. Falta completar el pago en Hotmart." },
  pendiente: { titulo: "Pago pendiente de confirmación", texto: "Si ya pagaste en Hotmart, revisamos la venta y confirmamos tu pedido. No necesitas volver a enviar tus datos." },
  confirmado: { titulo: "Pago confirmado", texto: "Tu lectura está en preparación. Te la enviaremos por correo." },
  enviado: { titulo: "Tu lectura ya fue enviada", texto: "Te la enviamos al correo de tu pedido. Si no la encuentras, revisa la carpeta de spam o promociones." },
  reembolsado: { titulo: "Pedido reembolsado", texto: "El pago de este pedido fue reembolsado." },
  rechazado: { titulo: "El pago no se completó", texto: "Hotmart no registró el pago. Puedes intentarlo de nuevo con el mismo pedido." },
  error: { titulo: "No pudimos consultar tu pedido", texto: "Tu pedido sigue guardado. Si tienes dudas, escríbenos por WhatsApp." },
};

export const ESTADOS_PEDIDO_EN = {
  creado: { titulo: "Order created", texto: "We saved your details. The payment on Hotmart is still pending." },
  pendiente: { titulo: "Payment awaiting confirmation", texto: "If you already paid on Hotmart, we’ll check the sale and confirm your order. You don’t need to send your details again." },
  confirmado: { titulo: "Payment confirmed", texto: "Your reading is being prepared. We’ll send it to you by email." },
  enviado: { titulo: "Your reading has been sent", texto: "We sent it to the email on your order. If you can’t find it, check your spam or promotions folder." },
  reembolsado: { titulo: "Order refunded", texto: "The payment for this order was refunded." },
  rechazado: { titulo: "The payment didn’t go through", texto: "Hotmart didn’t register the payment. You can try again with the same order." },
  error: { titulo: "We couldn’t check your order", texto: "Your order is still saved. If you have questions, write to us on WhatsApp." },
};

/** Textos de los estados en el idioma de la página. */
export const estadosPedido = (idioma = "es") => (idioma === "en" ? ESTADOS_PEDIDO_EN : ESTADOS_PEDIDO);

/** Estado a mostrar a partir de lo que se sabe. Nunca deduce "confirmado" sin el backend. */
export function estadoAMostrar({ pedido, volvioDelCheckout, estadoBackend }) {
  if (!pedido) return null;
  if (estadoBackend && ESTADOS_PEDIDO[estadoBackend]) return estadoBackend;
  return volvioDelCheckout ? "pendiente" : "creado";
}

/** Ruta del estado público del pedido según su reporte (null sin referencia). */
/** Canal de un pedido guardado: los regalos llevan `regalo: true`. */
export const canalDePedido = (pedido) => (pedido?.regalo ? "regalo" : canalDe(pedido?.reporte));

/** Referencia de Hotmart (`sck`) de un pedido guardado. */
export const referenciaDePedido = (pedido) => `${CANALES[canalDePedido(pedido)].sck}-${pedido.ordenId}`;

export function rutaDeEstado(pedido) {
  return pedido?.referencia ? CANALES[canalDePedido(pedido)].estado(pedido.referencia) : null;
}

// ---------------------------------------------------------------- persistencia local

/** Pedido guardado en el navegador para la página de retorno: solo la referencia, nunca datos natales. */
export function pedidoParaGuardar(ordenId, reporte, ahora = Date.now(), referencia = null, regalo = false) {
  return { ordenId, reporte, creadoEn: ahora, referencia, ...(regalo ? { regalo: true } : {}) };
}

export const VIGENCIA_PEDIDO_MS = 14 * 24 * 60 * 60 * 1000;

export function pedidoVigente(guardado, ahora = Date.now()) {
  if (!guardado || !Number.isInteger(guardado.ordenId) || typeof guardado.creadoEn !== "number") return null;
  return ahora - guardado.creadoEn <= VIGENCIA_PEDIDO_MS ? guardado : null;
}

/** Envuelve un Storage con try/catch: en modo privado o con almacenamiento bloqueado, la compra sigue funcionando. */
export function almacenSeguro(storage) {
  return {
    leer(clave) { try { return JSON.parse(storage.getItem(clave)); } catch { return null; } },
    guardar(clave, valor) { try { storage.setItem(clave, JSON.stringify(valor)); } catch { /* sin persistencia */ } },
    borrar(clave) { try { storage.removeItem(clave); } catch { /* nada */ } },
  };
}

// ---------------------------------------------------------------- tarjetas de regalo

export const LIMITE_DEDICATORIA = 300;

/** Errores del formulario de /regalar ({campo: mensaje}). `productos`: los slugs regalables. */
export function validarRegalo(d, productos, idioma = "es") {
  const e = {};
  const m = mensajes(idioma);
  if (!productos.includes(d.producto)) e.producto = m.producto;
  if (largo(d.comprador_nombre) < LIMITES.nombreMin) e.comprador_nombre = m.compradorNombre;
  if (!EMAIL.test((d.comprador_email || "").trim())) e.comprador_email = m.compradorEmail;
  if (largo(d.para_nombre) < LIMITES.nombreMin) e.para_nombre = m.paraNombre;
  else if (largo(d.para_nombre) > 80) e.para_nombre = m.nombreLargo;
  if (largo(d.dedicatoria) > LIMITE_DEDICATORIA) e.dedicatoria = m.dedicatoria(LIMITE_DEDICATORIA);
  if (!d.acepto) e.acepto = m.acepto;
  return e;
}

/** Mensaje de «necesitamos que aceptes los términos», en el idioma de la página. */
export const mensajeAcepto = (idioma = "es") => mensajes(idioma).acepto;

export function cuerpoDeRegalo(d) {
  const cuerpo = {
    producto: d.producto, comprador_nombre: d.comprador_nombre.trim(), comprador_email: d.comprador_email.trim(),
    para_nombre: d.para_nombre.trim(), dedicatoria: (d.dedicatoria || "").trim() || null,
  };
  if (d.acepta_correos) cuerpo.acepta_correos = true;
  return cuerpo;
}

/** Qué datos extra pide cada lectura al canjearla (mismo contrato que /comprar). */
export const extraDeProducto = (producto) =>
  ({ pack: "pack", "revolucion-solar": "revolucion_solar", compatibilidad: "segunda_persona" })[producto] || null;

// ── Lectura pedida desde la app de Astrea (2026-11-02) ─────────────────────────
// La app ya creó la orden (POST /ai/perfiles/{id}/lectura/pedido, la misma orden que
// /carta-natal/orden) y manda a /pagar#orden=<id>&ref=<referencia>&nombre=…&email=…
// Los datos van en el fragmento: no llegan a ningún servidor. /pagar guarda el pedido en
// este dominio (para que /gracias lleve a /pedido al volver de Hotmart) y manda a pagar.
export const URL_APP_CARTA = "https://app.astrea-charts.site/conversacion?ver=carta";

/** El pedido que trae la app en el fragmento, o null si falta algo o no es válido. */
export function pedidoDesdeApp(fragmento) {
  const p = new URLSearchParams(String(fragmento ?? "").replace(/^#/, ""));
  const ordenId = Number(p.get("orden"));
  const referencia = p.get("ref") ?? "";
  const nombre = (p.get("nombre") ?? "").trim();
  const email = (p.get("email") ?? "").trim();
  if (!Number.isInteger(ordenId) || ordenId <= 0) return null;
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(referencia)) return null;
  if (nombre.length < LIMITES.nombreMin || nombre.length > LIMITES.textoMax) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return { ordenId, referencia, nombre, email, cupon: cuponValido(p.get("cupon")) };   // un cupón inválido se ignora
}

/** Lo que /pagar guarda para /gracias y /pedido: un pedido de carta natal, marcado como de la app. */
export const pedidoDeAppParaGuardar = (pedido, ahora = Date.now()) =>
  ({ ...pedidoParaGuardar(pedido.ordenId, "carta-natal", ahora, pedido.referencia), desde: "app",
     ...(pedido.cupon ? { cupon: pedido.cupon } : {}) });
