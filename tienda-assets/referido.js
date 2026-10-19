/**
 * Astrea · Referidos (2026-10-19).
 *
 * Cada persona de Astrea tiene un enlace para invitar: `astrea-charts.site/?ref=ABCD2345`.
 * Si quien entra por ese enlace compra su carta natal, cuando se la entregamos las dos
 * reciben 1 mes de Astrea Plus gratis (lo decide y lo aplica el backend).
 *
 * - El código se toma de `?ref=` en cualquier página de la tienda y se guarda 30 días
 *   en este navegador (gana el último enlace).
 * - Viaja solo en la orden de la carta natal (`POST /carta-natal/orden` → `ref`).
 * - Un código con otra forma se ignora; el backend vuelve a validarlo (y descarta el
 *   propio de quien compra).
 *
 * No guarda datos personales: solo el código y la fecha.
 */
import { almacenSeguro } from "./compra.js";

export const CLAVE_REFERIDO = "astrea-ref";
const VIGENCIA_MS = 30 * 24 * 60 * 60 * 1000;
const PATRON = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/;

/** El código si tiene la forma válida (8 caracteres, sin 0/O ni 1/I); si no, null. */
export function limpiarReferido(valor) {
  const codigo = String(valor ?? "").trim().toUpperCase();
  return PATRON.test(codigo) ? codigo : null;
}

/** El código guardado, si sigue vigente. */
export function referidoVigente(guardado, ahora) {
  return guardado && typeof guardado.ref === "string" && Number.isFinite(guardado.t) && ahora - guardado.t < VIGENCIA_MS
    ? limpiarReferido(guardado.ref)
    : null;
}

/** Registra el `?ref=` de esta visita (si trae uno válido) y devuelve el código a usar en la orden. */
export function registrarReferido({ search, storage, ahora = Date.now() }) {
  const almacen = almacenSeguro(storage);
  const nuevo = limpiarReferido(new URLSearchParams(search).get("ref"));
  if (nuevo) {
    almacen.guardar(CLAVE_REFERIDO, { ref: nuevo, t: ahora });
    return nuevo;
  }
  return referidoVigente(almacen.leer(CLAVE_REFERIDO), ahora);
}

let actual;

/** Código de referido de esta visita (se calcula una vez), o null. */
export function referidoActual() {
  if (actual !== undefined) return actual;
  if (typeof window === "undefined") return null;
  let storage = null;
  try { storage = window.localStorage; } catch { /* sin almacenamiento */ }
  actual = registrarReferido({ search: window.location.search, storage: storage ?? { getItem: () => null, setItem() {}, removeItem() {} } });
  return actual;
}
