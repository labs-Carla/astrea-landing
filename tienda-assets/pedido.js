/**
 * Astrea · Tienda — página de pedido (/pedido).
 *
 * Muestra el último pedido creado en este navegador. El estado real lo da el
 * backend (carta natal: GET /carta-natal/orden/{referencia}/estado; otros
 * reportes: GET /pedidos/{referencia}/estado). Sin respuesta del
 * backend, solo afirma "creado" o "pendiente de confirmación": volver de
 * Hotmart no prueba el pago.
 * Nunca arma enlaces de entrega: el enlace /r/<token> lo envía el equipo.
 */
import { apiBase, CHECKOUTS, ESTADO_PEDIDO_HABILITADO, WHATSAPP } from "./config.js";
import { reportePorSlug } from "./catalogo.js";
import { conOrigen, origenActual } from "./origen.js";
import { ESTADOS_PEDIDO, estadoAMostrar, pedidoVigente, referenciaDeOrden, rutaDeEstado, almacenSeguro } from "./compra.js";

const CLAVE_PEDIDO = "astrea-tienda-pedido";
const caja = document.querySelector("[data-estado-pedido]");
const params = new URLSearchParams(location.search);
const pedido = pedidoVigente(almacenSeguro(window.localStorage).leer(CLAVE_PEDIDO));

function el(tag, attrs = {}, ...hijos) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  n.append(...hijos);
  return n;
}
const icono = (id) => {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "icon"); svg.setAttribute("aria-hidden", "true");
  const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
  use.setAttribute("href", `#${id}`); svg.append(use);
  return svg;
};

// null = no se pudo saber (sin referencia, sin red, backend anterior): se muestra
// el estado local. No se muestra "error" por una consulta fallida: el pedido existe.
async function estadoDelBackend(pedido) {
  const ruta = rutaDeEstado(pedido);
  if (!ESTADO_PEDIDO_HABILITADO || !ruta) return null;
  try {
    const r = await fetch(`${apiBase()}${ruta}`);
    if (!r.ok) return null;
    return (await r.json()).estado || null;
  } catch { return null; }
}

async function pintar() {
  if (!pedido) {
    caja.replaceChildren(
      el("h2", { class: "h-section h-section--sm" }, "No encontramos un pedido en este navegador"),
      el("p", {}, "Si pagaste directamente en Hotmart, completa los datos de tu lectura en el formulario de compra. Si ya registraste tu pedido desde otro dispositivo, no necesitas hacer nada más: lo confirmaremos y te escribiremos."),
      el("p", {}, el("a", { class: "btn btn--night", href: "/gracias?formulario=1" }, "Completar los datos de mi compra")),
      el("p", {}, el("a", { class: "link-quiet", href: WHATSAPP }, "¿Dudas? Escríbenos por WhatsApp")),
    );
    return;
  }
  const reporte = reportePorSlug(pedido.reporte);
  const estado = estadoAMostrar({
    pedido,
    volvioDelCheckout: params.has("retorno"),
    estadoBackend: await estadoDelBackend(pedido),
  });
  const info = ESTADOS_PEDIDO[estado];
  const iconos = { creado: "i-pages", pendiente: "i-clock", confirmado: "i-check", enviado: "i-mail", reembolsado: "i-alert", rechazado: "i-alert", error: "i-alert" };
  caja.dataset.estado = estado;

  const pasos = el("ol", { class: "pasos-entrega" },
    el("li", {}, "Verificamos tu pago en Hotmart y confirmamos tu pedido."),
    el("li", {}, "Calculamos y redactamos tu lectura, y la revisamos una por una."),
    el("li", {}, "Te la enviamos por correo entre 24 y 48 horas después de confirmar el pago."),
  );

  const hijos = [
    el("div", { class: "estado-pedido__sello" }, icono(iconos[estado])),
    el("h2", { class: "h-section h-section--sm" }, info.titulo),
    el("p", {}, info.texto),
    el("p", {}, `${reporte ? reporte.nombre : "Pedido"} · referencia `, el("span", { class: "estado-pedido__ref" }, referenciaDeOrden(pedido.ordenId, pedido.reporte))),
  ];
  if ((estado === "creado" || estado === "rechazado") && reporte && CHECKOUTS[reporte.slug]) {
    const url = new URL(CHECKOUTS[reporte.slug].url);
    url.searchParams.set("sck", referenciaDeOrden(pedido.ordenId, pedido.reporte));
    hijos.push(el("p", {}, el("a", { class: "btn btn--gold", href: conOrigen(url.toString(), origenActual()) }, "Ir al pago en Hotmart")));
  }
  if (["creado", "pendiente", "confirmado"].includes(estado)) hijos.push(el("h3", { class: "bloque__titulo" }, "Qué sigue"), pasos);
  hijos.push(el("p", { class: "detalle__aviso" }, "¿Dudas con tu pedido? ", el("a", { class: "link-quiet", href: `${WHATSAPP}?text=${encodeURIComponent(`Hola, tengo una pregunta sobre mi pedido ${referenciaDeOrden(pedido.ordenId, pedido.reporte)}`)}` }, "Escríbenos por WhatsApp"), " con tu referencia."));
  caja.replaceChildren(...hijos);
}

pintar();
