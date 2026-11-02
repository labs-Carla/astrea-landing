/**
 * Astrea · Tienda — /pagar: la lectura de la carta natal pedida DESDE la app de Astrea.
 * La orden ya existe (la creó la app con la carta de la persona): aquí solo se guarda el
 * pedido en este navegador y se va a Hotmart. Ver pedidoDesdeApp en compra.js.
 */
import { CHECKOUTS } from "./config.js";
import { almacenSeguro, pedidoDeAppParaGuardar, pedidoDesdeApp, urlDeCheckout } from "./compra.js";
import { conOrigen } from "./origen.js";

const CLAVE_PEDIDO = "astrea-tienda-pedido";   // la misma que leen /gracias y /pedido
const ORIGEN = "app";

const pedido = pedidoDesdeApp(window.location.hash);
history.replaceState(null, "", window.location.pathname);   // nombre y correo no quedan en el historial
const checkout = CHECKOUTS["carta-natal"];

if (pedido && checkout) {
  almacenSeguro(window.localStorage).guardar(CLAVE_PEDIDO, pedidoDeAppParaGuardar(pedido));
  window.location.replace(conOrigen(urlDeCheckout(checkout.url, pedido.ordenId, pedido, "carta-natal", pedido.cupon), ORIGEN));
} else {
  document.querySelector("[data-pagar-cargando]").hidden = true;
  document.querySelector("[data-pagar-error]").hidden = false;
}
