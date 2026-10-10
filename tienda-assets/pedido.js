/**
 * Astrea · Tienda — página de pedido (/pedido).
 *
 * Muestra el último pedido creado en este navegador. Solo afirma lo que se
 * sabe: "creado" o "pendiente de confirmación" (volver de Hotmart no prueba el
 * pago). "confirmado"/"rechazado" requieren el endpoint de estado del backend,
 * que todavía no existe (ESTADO_PEDIDO_HABILITADO = false; ver docs/TIENDA.md).
 * Nunca arma enlaces de entrega: el enlace /r/<token> lo envía el equipo.
 */
import { apiBase, CHECKOUTS, ESTADO_PEDIDO_HABILITADO, URL_ASTREA_AI, WHATSAPP } from "./config.js";
import { reportePorSlug } from "./catalogo.js";
import { ESTADOS_PEDIDO, estadoAMostrar, pedidoVigente, referenciaDeOrden, almacenSeguro } from "./compra.js";

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

async function estadoDelBackend(ordenId) {
  if (!ESTADO_PEDIDO_HABILITADO) return null;
  try {
    const r = await fetch(`${apiBase()}/carta-natal/orden/${ordenId}/estado`);
    if (!r.ok) return "error";
    return (await r.json()).estado || null;
  } catch { return "error"; }
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
    estadoBackend: await estadoDelBackend(pedido.ordenId),
  });
  const info = ESTADOS_PEDIDO[estado];
  const iconos = { creado: "i-pages", pendiente: "i-clock", confirmado: "i-check", rechazado: "i-alert", error: "i-alert" };
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
    el("p", {}, `${reporte ? reporte.nombre : "Pedido"} · referencia `, el("span", { class: "estado-pedido__ref" }, referenciaDeOrden(pedido.ordenId))),
  ];
  if ((estado === "creado" || estado === "rechazado") && reporte && CHECKOUTS[reporte.slug]) {
    const url = new URL(CHECKOUTS[reporte.slug].url);
    url.searchParams.set("sck", referenciaDeOrden(pedido.ordenId));
    hijos.push(el("p", {}, el("a", { class: "btn btn--gold", href: url.toString() }, "Ir al pago en Hotmart")));
  }
  if (estado !== "rechazado" && estado !== "error") hijos.push(el("h3", { class: "bloque__titulo" }, "Qué sigue"), pasos);
  if (reporte?.beneficioAstreaAi && estado !== "rechazado") {
    hijos.push(el("div", { class: "beneficio-ai" },
      el("strong", {}, "Tus 5 preguntas en Astrea.ai"),
      el("span", {}, "Cuando recibas tu lectura, entra a Astrea.ai con el mismo correo de tu compra: tendrás 5 preguntas para conversar sobre tu carta. Es opcional y no necesitas una suscripción."),
      el("a", { class: "link-quiet", href: URL_ASTREA_AI }, "Conocer Astrea.ai"),
    ));
  }
  hijos.push(el("p", { class: "detalle__aviso" }, "¿Dudas con tu pedido? ", el("a", { class: "link-quiet", href: `${WHATSAPP}?text=${encodeURIComponent(`Hola, tengo una pregunta sobre mi pedido ${referenciaDeOrden(pedido.ordenId)}`)}` }, "Escríbenos por WhatsApp"), " con tu referencia."));
  caja.replaceChildren(...hijos);
}

pintar();
