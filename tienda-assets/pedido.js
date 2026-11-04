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
import { reportePorSlug, reporteEnIdioma } from "./catalogo.js";
import { idiomaDePagina, elegir, rutaEnIdioma, conIdiomaApp, cabeceraIdioma } from "./idioma.js";
import { conOrigen, origenActual } from "./origen.js";
import { abrirPagoEnPanel } from "./pago-panel.js";
import { estadosPedido, URL_APP_CARTA, cuponValido, estadoAMostrar, pedidoVigente, referenciaDePedido, rutaDeEstado, almacenSeguro } from "./compra.js";

const CLAVE_PEDIDO = "astrea-tienda-pedido";
const idioma = idiomaDePagina();                     // /pedido o /en/pedido
const t = (es, en) => elegir(idioma, es, en);
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
    const r = await fetch(`${apiBase()}${ruta}`, { headers: cabeceraIdioma(idioma) });
    if (!r.ok) return null;
    return (await r.json()).estado || null;
  } catch { return null; }
}

async function pintar() {
  if (!pedido) {
    caja.replaceChildren(
      el("h2", { class: "h-section h-section--sm" }, t("No encontramos un pedido en este navegador", "We couldn’t find an order in this browser")),
      el("p", {}, t("Si pagaste directamente en Hotmart, completa los datos de tu lectura en el formulario de compra. Si ya registraste tu pedido desde otro dispositivo, no necesitas hacer nada más: lo confirmaremos y te escribiremos.",
        "If you paid directly on Hotmart, fill in the details for your reading in the purchase form. If you already registered your order on another device, there’s nothing else to do: we’ll confirm it and write to you.")),
      el("p", {}, el("a", { class: "btn btn--night", href: rutaEnIdioma("/gracias?formulario=1", idioma) }, t("Completar los datos de mi compra", "Complete my purchase details"))),
      el("p", {}, el("a", { class: "link-quiet", href: WHATSAPP }, t("¿Dudas? Escríbenos por WhatsApp", "Questions? Write to us on WhatsApp"))),
    );
    return;
  }
  const reporte = reporteEnIdioma(reportePorSlug(pedido.reporte), idioma);
  const estado = estadoAMostrar({
    pedido,
    volvioDelCheckout: params.has("retorno"),
    estadoBackend: await estadoDelBackend(pedido),
  });
  // Los regalos se entregan como tarjeta (PDF con código) a quien compró, no como lectura.
  const info = pedido.regalo && estado === "enviado"
    ? { titulo: t("Tarjeta de regalo enviada", "Gift card sent"), texto: t("Te enviamos la tarjeta en PDF a tu correo, con el código para canjearla.", "We sent the gift card as a PDF to your email, with the code to redeem it.") }
    : estadosPedido(idioma)[estado];
  const iconos = { creado: "i-pages", pendiente: "i-clock", confirmado: "i-check", enviado: "i-mail", reembolsado: "i-alert", rechazado: "i-alert", error: "i-alert" };
  caja.dataset.estado = estado;

  const pasos = pedido.regalo ? el("ol", { class: "pasos-entrega" },
    el("li", {}, t("Verificamos tu pago en Hotmart.", "We verify your payment on Hotmart.")),
    el("li", {}, t("Te enviamos la tarjeta de regalo en PDF, con un código, para imprimirla o reenviarla.", "We send you the gift card as a PDF, with a code, to print or forward.")),
    el("li", {}, t("Quien la recibe la canjea en astrea-charts.site/canjear con sus datos, y su lectura le llega en 24 a 48 horas.",
      "The person who receives it redeems it at astrea-charts.site/en/canjear with their details, and their reading arrives in 24 to 48 hours. The reading is written in Spanish.")),
  ) : el("ol", { class: "pasos-entrega" },
    el("li", {}, t("Verificamos tu pago en Hotmart y confirmamos tu pedido.", "We verify your payment on Hotmart and confirm your order.")),
    el("li", {}, t("Calculamos y redactamos tu lectura, y la revisamos una por una.", "We calculate and write your reading, and review each one.")),
    el("li", {}, pedido.desde === "app"
      ? t("Entre 24 y 48 horas después de confirmar el pago, la encuentras en tu Biblioteca de Astrea y en tu correo.", "Between 24 and 48 hours after we confirm your payment, you’ll find it in your Astrea Library and in your email.")
      : t("Te la enviamos por correo entre 24 y 48 horas después de confirmar el pago.", "We email it to you between 24 and 48 hours after we confirm your payment.")),
    ...(idioma === "en" ? [el("li", {}, "Your reading is written in Spanish.")] : []),
  );

  const hijos = [
    el("div", { class: "estado-pedido__sello" }, icono(iconos[estado])),
    el("h2", { class: "h-section h-section--sm" }, info.titulo),
    el("p", {}, info.texto),
    el("p", {}, `${pedido.regalo ? t("Regalo: ", "Gift: ") : ""}${reporte ? reporte.nombre : t("Pedido", "Order")} · ${t("referencia", "reference")} `, el("span", { class: "estado-pedido__ref" }, referenciaDePedido(pedido))),
  ];
  if ((estado === "creado" || estado === "rechazado") && reporte && CHECKOUTS[reporte.slug]) {
    const url = new URL(CHECKOUTS[reporte.slug].url);
    url.searchParams.set("sck", referenciaDePedido(pedido));
    if (cuponValido(pedido.cupon)) url.searchParams.set("offDiscount", pedido.cupon);   // el descuento de Plus sigue al reintentar
    const destino = conOrigen(url.toString(), origenActual());
    const ir = el("a", { class: "btn btn--gold", href: destino }, t("Pagar sin salir de Astrea", "Pay without leaving Astrea"));
    ir.addEventListener("click", (e) => {
      e.preventDefault();     // sin JS (o si algo falla antes), el enlace lleva a Hotmart como siempre
      abrirPagoEnPanel({ url: destino, nombre: `${pedido.regalo ? t("Regalo: ", "Gift: ") : ""}${reporte.nombre}`,
                         precio: CHECKOUTS[reporte.slug].precioReferencia, alPagar: () => window.location.reload() });
    });
    hijos.push(el("p", {}, ir));
  }
  if (["creado", "pendiente", "confirmado"].includes(estado)) hijos.push(el("h3", { class: "bloque__titulo" }, t("Qué sigue", "What comes next")), pasos);
  // Pedida desde la app: vuelve a su carta en Astrea.
  if (pedido.desde === "app") hijos.push(el("p", {}, el("a", { class: "btn btn--night", href: conIdiomaApp(URL_APP_CARTA, idioma) }, t("Volver a Astrea", "Back to Astrea"))));
  hijos.push(el("p", { class: "detalle__aviso" }, t("¿Dudas con tu pedido? ", "Questions about your order? "),
    el("a", { class: "link-quiet", href: `${WHATSAPP}?text=${encodeURIComponent(t(`Hola, tengo una pregunta sobre mi pedido ${referenciaDePedido(pedido)}`, `Hi, I have a question about my order ${referenciaDePedido(pedido)}`))}` }, t("Escríbenos por WhatsApp", "Write to us on WhatsApp")),
    t(" con tu referencia.", " with your reference.")));
  caja.replaceChildren(...hijos);
}

pintar();
