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
const largo = (v) => (v || "").trim().length;
const horaValida = (h, m) => {
  const H = Number(h), M = Number(m);
  return h !== "" && h != null && m !== "" && m != null && Number.isInteger(H) && H >= 0 && H <= 23 && Number.isInteger(M) && M >= 0 && M <= 59;
};

function validarFecha(valor, ahora) {
  const fecha = valor ? new Date(`${valor}T00:00:00`) : null;
  if (!fecha || Number.isNaN(fecha.getTime())) return "Indica la fecha de nacimiento.";
  if (fecha.getFullYear() < LIMITES.anioMin) return "La fecha no puede ser anterior a 1900.";
  if (fecha > ahora) return "La fecha no puede estar en el futuro.";
  return null;
}

function validarLugar(errores, d, campoCiudad, campoPais, textoCiudad, textoPais) {
  for (const [campo, texto] of [[campoCiudad, textoCiudad], [campoPais, textoPais]]) {
    if (largo(d[campo]) < 2) errores[campo] = texto;
    else if (largo(d[campo]) > LIMITES.textoMax) errores[campo] = "Es demasiado largo.";
  }
}

/** Años de revolución solar que acepta el backend: el actual, el anterior y el siguiente. */
export function aniosDeRevolucion(ahora = new Date()) {
  const a = ahora.getFullYear();
  return [a - 1, a, a + 1];
}

/**
 * Valida los datos del formulario. `extra`: null | "revolucion_solar" | "segunda_persona"
 * (catalogo.js). Devuelve {campo: mensaje} (vacío = válido).
 */
export function validarDatos(d, ahora = new Date(), extra = null) {
  const errores = {};

  if (largo(d.nombre) < LIMITES.nombreMin) errores.nombre = "Escribe el nombre que quieres en tu lectura.";
  else if (largo(d.nombre) > LIMITES.textoMax) errores.nombre = "El nombre es demasiado largo.";

  if (!EMAIL.test((d.email || "").trim())) errores.email = "Revisa tu correo: ahí te enviaremos tu lectura.";

  const fecha = validarFecha(d.fecha, ahora);
  if (fecha) errores.fecha = fecha;
  if (!horaValida(d.hora, d.minuto)) errores.hora = "Indica tu hora de nacimiento (la más aproximada que tengas).";
  validarLugar(errores, d, "ciudad", "pais", "Indica tu ciudad de nacimiento.", "Indica tu país de nacimiento.");

  if (extra === "revolucion_solar") {
    validarLugar(errores, d, "rs_ciudad", "rs_pais", "Indica la ciudad donde pasarás tu cumpleaños.", "Indica el país donde pasarás tu cumpleaños.");
    if (!aniosDeRevolucion(ahora).includes(Number(d.rs_anio))) errores.rs_anio = "Elige el ciclo que quieres leer.";
  }

  if (extra === "pack" && tematicosElegidos(d).length !== 2) errores.pack = "Elige 2 lecturas temáticas.";

  if (extra === "segunda_persona") {
    if (largo(d.p2_nombre) < LIMITES.nombreMin) errores.p2_nombre = "Escribe el nombre de la otra persona.";
    else if (largo(d.p2_nombre) > LIMITES.textoMax) errores.p2_nombre = "El nombre es demasiado largo.";
    const f2 = validarFecha(d.p2_fecha, ahora);
    if (f2) errores.p2_fecha = f2;
    // Hora opcional: vacía = desconocida; si se da, completa.
    const algunaHora = (d.p2_hora ?? "") !== "" || (d.p2_minuto ?? "") !== "";
    if (algunaHora && !horaValida(d.p2_hora, d.p2_minuto)) errores.p2_hora = "Completa hora y minutos, o deja ambos vacíos si no la sabes.";
    validarLugar(errores, d, "p2_ciudad", "p2_pais", "Indica la ciudad de nacimiento de la otra persona.", "Indica su país de nacimiento.");
    if (!d.p2_consentimiento) errores.p2_consentimiento = "Necesitamos que confirmes que la otra persona aceptó compartir sus datos.";
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

/** URL del checkout real: email y nombre precargados, y el pedido en `sck`. */
export function urlDeCheckout(checkoutBase, ordenId, { nombre, email }, slug = "carta-natal") {
  if (!Number.isInteger(ordenId) || ordenId <= 0) throw new Error("orden inválida");
  const url = new URL(checkoutBase);
  url.searchParams.set("email", email);
  url.searchParams.set("name", nombre);
  url.searchParams.set("sck", referenciaDeOrden(ordenId, slug));
  return url.toString();
}

/** Clave estable de los datos: el mismo envío (doble clic, reintento) reutiliza el pedido ya creado. */
export function huellaDeDatos(cuerpo) {
  const { email, ciudad, pais, ...resto } = cuerpo;
  return JSON.stringify([email.toLowerCase(), ciudad.toLowerCase(), pais.toLowerCase(), { ...resto, nombre: undefined }]);
}

/** Traduce la respuesta de error del backend a un mensaje para la persona. */
export function mensajeDeError(status, detalle) {
  if (status === 429) return "Hiciste varios intentos seguidos. Espera un minuto y vuelve a intentarlo.";
  if (status === 400 && typeof detalle === "string") {
    const lugar = detalle.match(/No se encontr\S* la ubicaci\S* '([^']+)'/i);
    if (lugar) return `No encontramos «${lugar[1]}». Revisa cómo está escrita o prueba con una ciudad cercana.`;
    if (/geocodificaci/i.test(detalle)) return "No pudimos verificar la ciudad en este momento. Inténtalo de nuevo en unos minutos.";
    return detalle;
  }
  if (status === 422) return "Algún dato no es válido. Revisa el formulario.";
  return "No pudimos registrar tu pedido. Inténtalo de nuevo en unos minutos o escríbenos por WhatsApp.";
}

/**
 * Crea el pedido real una sola vez por envío: si ya hay uno para la misma
 * huella (guardado en `memoria`), lo reutiliza sin volver a llamar al backend.
 * `fetchImpl` y `memoria` ({get,set}) se inyectan para poder testear.
 */
export async function crearOrden({ apiBase, cuerpo, slug = "carta-natal", fetchImpl = fetch, memoria }) {
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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cuerpo),
    });
  } catch {
    throw new ErrorDePedido(mensajeDeError(0), { reintentable: true });
  }
  let datos = null;
  try { datos = await respuesta.json(); } catch { /* cuerpo vacío o no JSON */ }
  if (!respuesta.ok) {
    throw new ErrorDePedido(mensajeDeError(respuesta.status, datos?.detail), { reintentable: respuesta.status >= 500 || respuesta.status === 429 });
  }
  const ordenId = datos?.[canal.campoId];
  if (!Number.isInteger(ordenId) || ordenId <= 0) throw new ErrorDePedido(mensajeDeError(500), { reintentable: true });
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
export function validarRegalo(d, productos) {
  const e = {};
  if (!productos.includes(d.producto)) e.producto = "Elige la lectura que quieres regalar.";
  if (largo(d.comprador_nombre) < LIMITES.nombreMin) e.comprador_nombre = "Escribe tu nombre.";
  if (!EMAIL.test((d.comprador_email || "").trim())) e.comprador_email = "Revisa tu correo: ahí te enviaremos la tarjeta.";
  if (largo(d.para_nombre) < LIMITES.nombreMin) e.para_nombre = "Escribe el nombre de quien recibe el regalo.";
  else if (largo(d.para_nombre) > 80) e.para_nombre = "El nombre es demasiado largo.";
  if (largo(d.dedicatoria) > LIMITE_DEDICATORIA) e.dedicatoria = `La dedicatoria puede tener hasta ${LIMITE_DEDICATORIA} caracteres.`;
  if (!d.acepto) e.acepto = "Necesitamos que aceptes los términos para continuar.";
  return e;
}

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
