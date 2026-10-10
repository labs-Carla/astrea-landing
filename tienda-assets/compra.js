/**
 * Astrea · Tienda — lógica pura del flujo de compra (sin DOM, testeable con node --test).
 *
 * Contrato real del backend (astrea-API):
 *   POST {API}/carta-natal/orden  body DatosCompra {nombre, email, fecha_hora_local, ciudad, pais}
 *   -> 200 {status: "recibido", orden_id}   | 400/422 {detail}   | 429 rate limit (5/min)
 * La orden nace con pago_confirmado=false; el admin la confirma a mano en el
 * panel cruzando la venta de Hotmart por `sck=astrea-orden-<id>`. Reenviar los
 * mismos datos natales devuelve la MISMA orden (la carta se identifica por
 * fecha/hora y lugar) y nunca des-confirma un pago.
 */

export const LIMITES = { nombreMin: 2, textoMax: 150, anioMin: 1900 };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Valida los datos del formulario. Devuelve {campo: mensaje} (vacío = válido). */
export function validarDatos(d, ahora = new Date()) {
  const errores = {};
  const largo = (v) => (v || "").trim().length;

  if (largo(d.nombre) < LIMITES.nombreMin) errores.nombre = "Escribe el nombre que quieres en tu lectura.";
  else if (largo(d.nombre) > LIMITES.textoMax) errores.nombre = "El nombre es demasiado largo.";

  if (!EMAIL.test((d.email || "").trim())) errores.email = "Revisa tu correo: ahí te enviaremos tu lectura.";

  const fecha = d.fecha ? new Date(`${d.fecha}T00:00:00`) : null;
  if (!fecha || Number.isNaN(fecha.getTime())) errores.fecha = "Indica tu fecha de nacimiento.";
  else if (fecha.getFullYear() < LIMITES.anioMin) errores.fecha = "La fecha no puede ser anterior a 1900.";
  else if (fecha > ahora) errores.fecha = "La fecha no puede estar en el futuro.";

  const h = Number(d.hora), m = Number(d.minuto);
  if (d.hora === "" || d.hora == null || !Number.isInteger(h) || h < 0 || h > 23 ||
      d.minuto === "" || d.minuto == null || !Number.isInteger(m) || m < 0 || m > 59) {
    errores.hora = "Indica tu hora de nacimiento (la más aproximada que tengas).";
  }

  for (const campo of ["ciudad", "pais"]) {
    if (largo(d[campo]) < 2) errores[campo] = campo === "ciudad" ? "Indica tu ciudad de nacimiento." : "Indica tu país de nacimiento.";
    else if (largo(d[campo]) > LIMITES.textoMax) errores[campo] = "Es demasiado largo.";
  }
  return errores;
}

const dos = (n) => String(n).padStart(2, "0");

/** Cuerpo exacto de POST /carta-natal/orden (hora local de nacimiento, sin zona). */
export function cuerpoDeOrden(d) {
  return {
    nombre: d.nombre.trim(),
    email: d.email.trim(),
    fecha_hora_local: `${d.fecha}T${dos(Number(d.hora))}:${dos(Number(d.minuto))}:00`,
    ciudad: d.ciudad.trim(),
    pais: d.pais.trim(),
  };
}

/** Referencia que el panel usa para cruzar la venta de Hotmart con la orden. */
export const referenciaDeOrden = (ordenId) => `astrea-orden-${ordenId}`;

/** URL del checkout real: email y nombre precargados, y la orden en `sck`. */
export function urlDeCheckout(checkoutBase, ordenId, { nombre, email }) {
  if (!Number.isInteger(ordenId) || ordenId <= 0) throw new Error("orden inválida");
  const url = new URL(checkoutBase);
  url.searchParams.set("email", email);
  url.searchParams.set("name", nombre);
  url.searchParams.set("sck", referenciaDeOrden(ordenId));
  return url.toString();
}

/** Clave estable de los datos: el mismo envío (doble clic, reintento) reutiliza la orden ya creada. */
export function huellaDeDatos(cuerpo) {
  return [cuerpo.email.toLowerCase(), cuerpo.fecha_hora_local, cuerpo.ciudad.toLowerCase(), cuerpo.pais.toLowerCase()].join("|");
}

/** Traduce la respuesta de error del backend a un mensaje para la persona. */
export function mensajeDeError(status, detalle) {
  if (status === 429) return "Hiciste varios intentos seguidos. Espera un minuto y vuelve a intentarlo.";
  if (status === 400 && typeof detalle === "string") {
    return /ciudad|ubicaci|encontr/i.test(detalle)
      ? "No encontramos esa ciudad. Revisa cómo está escrita o prueba con una ciudad cercana."
      : detalle;
  }
  if (status === 422) return "Algún dato no es válido. Revisa el formulario.";
  return "No pudimos registrar tu pedido. Inténtalo de nuevo en unos minutos o escríbenos por WhatsApp.";
}

/**
 * Crea la orden real una sola vez por envío: si ya hay una orden para la misma
 * huella (guardada en `memoria`), la reutiliza sin volver a llamar al backend.
 * `fetchImpl` y `memoria` ({get,set}) se inyectan para poder testear.
 */
export async function crearOrden({ apiBase, cuerpo, fetchImpl = fetch, memoria }) {
  const huella = huellaDeDatos(cuerpo);
  const previa = memoria?.get(huella);
  if (previa) return { ordenId: previa, reutilizada: true };

  let respuesta;
  try {
    respuesta = await fetchImpl(`${apiBase}/carta-natal/orden`, {
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
  const ordenId = datos?.orden_id;
  if (!Number.isInteger(ordenId) || ordenId <= 0) throw new ErrorDePedido(mensajeDeError(500), { reintentable: true });
  memoria?.set(huella, ordenId);
  return { ordenId, reutilizada: false };
}

export class ErrorDePedido extends Error {
  constructor(mensaje, { reintentable }) { super(mensaje); this.reintentable = reintentable; }
}

/**
 * Estados que la tienda sabe mostrar. Hoy el frontend solo puede AFIRMAR
 * "creado" (el backend respondió con una orden) y "pendiente" (volvió del
 * checkout): que la persona regrese de Hotmart NO prueba el pago. "confirmado"
 * y "rechazado" solo se muestran si los informa el backend (ver config).
 */
export const ESTADOS_PEDIDO = {
  creado: { titulo: "Pedido creado", texto: "Guardamos tus datos. Falta completar el pago en Hotmart." },
  pendiente: { titulo: "Pago pendiente de confirmación", texto: "Si ya pagaste en Hotmart, revisamos la venta y confirmamos tu pedido. No necesitas volver a enviar tus datos." },
  confirmado: { titulo: "Pago confirmado", texto: "Tu lectura está en preparación. Te la enviaremos por correo." },
  rechazado: { titulo: "El pago no se completó", texto: "Hotmart no registró el pago. Puedes intentarlo de nuevo con el mismo pedido." },
  error: { titulo: "No pudimos consultar tu pedido", texto: "Tu pedido sigue guardado. Si tienes dudas, escríbenos por WhatsApp." },
};

/** Estado a mostrar a partir de lo que se sabe. Nunca deduce "confirmado" sin el backend. */
export function estadoAMostrar({ pedido, volvioDelCheckout, estadoBackend }) {
  if (!pedido) return null;
  if (estadoBackend && ESTADOS_PEDIDO[estadoBackend]) return estadoBackend;
  return volvioDelCheckout ? "pendiente" : "creado";
}

// ---------------------------------------------------------------- persistencia local

/** Pedido guardado en el navegador para la página de retorno: solo la referencia, nunca datos natales. */
export function pedidoParaGuardar(ordenId, reporte, ahora = Date.now()) {
  return { ordenId, reporte, creadoEn: ahora };
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
