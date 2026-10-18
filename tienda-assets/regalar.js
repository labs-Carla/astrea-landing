/**
 * Astrea · /regalar: comprar una tarjeta de regalo (astrea-API POST /regalos).
 * Se paga con el checkout de Hotmart de la lectura regalada, con sck=astrea-regalo-<id>.
 * Al confirmar el pago, a quien compra le llega la tarjeta en PDF con el código.
 */
import { apiBase, CHECKOUTS } from "./config.js";
import { REPORTES } from "./catalogo.js";
import { conOrigen, origenActual } from "./origen.js";
import { almacenSeguro, cuerpoDeRegalo, mensajeDeError, pedidoParaGuardar, validarRegalo, LIMITE_DEDICATORIA } from "./compra.js";

const CLAVE_PEDIDO = "astrea-tienda-pedido";
const REGALABLES = REPORTES.map((r) => r.slug).filter((s) => CHECKOUTS[s]);
const form = document.getElementById("form-regalo");
const CAMPOS = ["producto", "comprador_nombre", "comprador_email", "para_nombre", "dedicatoria", "acepto", "acepta_correos"];
const valor = (c) => (form.elements[c].type === "checkbox" ? form.elements[c].checked : form.elements[c].value);
const leer = () => Object.fromEntries(CAMPOS.map((c) => [c, valor(c)]));

// ?lectura=<slug> preselecciona la lectura (enlaces "Regálala" de cada ficha).
const pedida = new URLSearchParams(location.search).get("lectura");
if (REGALABLES.includes(pedida)) form.elements.producto.value = pedida;

// Al corregir un campo, su aviso de error desaparece.
form.addEventListener("input", (e) => { const span = document.getElementById(`e-${e.target.name}`); if (span) span.textContent = ""; });
form.addEventListener("change", (e) => { const span = document.getElementById(`e-${e.target.name}`); if (span) span.textContent = ""; });

const contador = document.querySelector("[data-contador-dedicatoria]");
const contar = () => { contador.textContent = `${form.elements.dedicatoria.value.length}/${LIMITE_DEDICATORIA}`; };
form.elements.dedicatoria.addEventListener("input", contar);
contar();

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const d = leer();
  const errores = validarRegalo(d, REGALABLES);
  for (const c of CAMPOS) {
    const span = document.getElementById(`e-${c}`);
    if (span) span.textContent = errores[c] || "";
  }
  const primero = CAMPOS.find((c) => errores[c]);
  if (primero) { form.elements[primero].focus(); return; }

  const boton = form.querySelector("[data-enviar]");
  const error = form.querySelector("[data-error-pedido]");
  boton.disabled = true;
  error.hidden = true;
  const cuerpo = cuerpoDeRegalo(d);
  if (cuerpo.acepta_correos) cuerpo.origen = origenActual();
  try {
    const r = await fetch(`${apiBase()}/regalos`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) });
    const datos = await r.json().catch(() => null);
    if (!r.ok || !Number.isInteger(datos?.regalo_id)) throw new Error(mensajeDeError(r.status, datos?.detail));
    almacenSeguro(window.localStorage).guardar(CLAVE_PEDIDO, pedidoParaGuardar(datos.regalo_id, d.producto, Date.now(), datos.referencia, true));
    const url = new URL(CHECKOUTS[d.producto].url);
    url.searchParams.set("email", cuerpo.comprador_email);
    url.searchParams.set("name", cuerpo.comprador_nombre);
    url.searchParams.set("sck", `astrea-regalo-${datos.regalo_id}`);
    window.location.assign(conOrigen(url.toString(), origenActual()));
  } catch (err) {
    error.textContent = err instanceof TypeError ? mensajeDeError(0) : err.message;
    error.hidden = false;
    boton.disabled = false;
  }
});
