/**
 * Astrea · Planes de Astrea.ai en la portada.
 *
 * La propuesta de cada plan vive aquí y repite la de la app
 * (astrea-API web/src/lib/planes.js): si cambia allá, cambia aquí. Precio y
 * condiciones de uso salen de GET /ai/planes, la misma fuente que la página de
 * planes de la app; el HTML generado trae el precio de referencia y un enlace
 * a las condiciones por si la API no responde.
 *
 * Solo se anuncia lo que existe: Pro se distingue de Plus por sus límites, no
 * por informes, soporte prioritario ni funciones exclusivas.
 */
import { apiBase } from "./config.js";

export const PLANES_AI = [
  {
    codigo: "free", nombre: "Free", lema: "Una primera experiencia", precioReferencia: "Gratis",
    descripcion: "Descubre tu carta natal y conoce cómo Astrea conversa contigo.",
  },
  {
    codigo: "plus", nombre: "Astrea Plus", lema: "Tu espacio personal", precioReferencia: "USD 9,99/mes",
    descripcion: "Para volver a tu carta cuando lo necesites y explorar tus patrones, tus relaciones, tus emociones y tu vocación.",
  },
  {
    codigo: "pro", nombre: "Astrea Pro", lema: "Exploración más profunda", precioReferencia: "USD 19,99/mes",
    descripcion: "Todo lo de Plus, con más espacio para conversaciones largas y frecuentes, cuando quieres ir más hondo en un tema o seguir varios a la vez.",
  },
];

export function precioDe(plan) {
  if (!plan.precio_usd) return "Gratis";
  return `USD ${plan.precio_usd.toLocaleString("es", { minimumFractionDigits: 2 })}/mes`;
}

/** Límites reales, como condición secundaria (mismo texto que la app). */
export function condicionesDe(plan) {
  if (plan.limite_total !== null && plan.limite_total !== undefined) return `Incluye ${plan.limite_total} preguntas, una sola vez.`;
  const partes = [];
  if (plan.limite_diario) partes.push(`${plan.limite_diario} en 24 horas`);
  if (plan.limite_mensual) partes.push(`${plan.limite_mensual} en 30 días`);
  return `${partes.length ? `Hasta ${partes.join(" y ")}. ` : ""}Pago mensual en Hotmart; lo cancelas cuando quieras.`;
}

/** Rellena precio y condiciones de cada plan con lo que dice el servidor. Sin respuesta, queda el HTML generado. */
export async function mostrarPlanes({ raiz = document, fetchImpl = globalThis.fetch, base = apiBase() } = {}) {
  const tarjetas = raiz.querySelectorAll("[data-plan]");
  if (!tarjetas.length) return false;
  try {
    const r = await fetchImpl(`${base}/ai/planes`);
    if (!r.ok) return false;
    const { planes } = await r.json();
    for (const t of tarjetas) {
      const plan = (planes || []).find((p) => p.codigo === t.dataset.plan);
      if (!plan) continue;
      const precio = t.querySelector("[data-plan-precio]");
      const condiciones = t.querySelector("[data-plan-condiciones]");
      if (precio) precio.textContent = precioDe(plan);
      if (condiciones) condiciones.textContent = condicionesDe(plan);
    }
    return true;
  } catch {
    return false;
  }
}

if (typeof document !== "undefined") mostrarPlanes();
