/**
 * Astrea · Tienda — el pago DENTRO de Astrea (pedido de Carla, 2026-11-02: «que no se salga
 * de Astrea, que toda la experiencia de checkout pueda sentirse en Astrea»).
 *
 * El checkout de Hotmart se abre en un panel encima de la página (iframe): a pantalla
 * completa en el teléfono y como hoja en el computador. Hotmart permite incrustarlo (sin
 * X-Frame-Options ni frame-ancestors). Su «widget» oficial no sirve: en el teléfono manda
 * a la persona a Hotmart. Es el mismo panel de la app (astrea-API PagoHotmart.jsx).
 *
 * Al aprobarse el pago, Hotmart lleva el panel a /gracias, que avisa con un postMessage
 * sin datos. Solo se le cree si viene de este mismo sitio y de ESTE panel; entonces
 * `alPagar()` (por defecto, el estado del pedido en /pedido).
 * Si el panel no carga, el pago se abre en una pestaña nueva y la tienda sigue abierta.
 *
 * Sin dependencias; los textos van con textContent (nada se interpreta como HTML).
 */
import { idiomaDePagina, rutaEnIdioma } from "./idioma.js";

const AVISO_PAGO = "astrea-pago-recibido";

// Textos del panel en el idioma de la página.
const TEXTOS = {
  es: { eyebrow: "Astrea · pago seguro", precio: (p) => `${p} · lo procesa Hotmart, sin salir de Astrea`, cerrar: "Cerrar el pago",
        cargando: "Abriendo el pago seguro…", marco: (n) => `Pago de «${n}» con Hotmart`, noCarga: "¿No carga el pago? ",
        pestana: "Ábrelo en una pestaña nueva", volver: " y vuelve aquí cuando termines.", gracias: "¡Gracias! Recibimos tu pago. Te llevamos a tu pedido…" },
  en: { eyebrow: "Astrea · secure payment", precio: (p) => `${p} · processed by Hotmart, without leaving Astrea`, cerrar: "Close the payment",
        cargando: "Opening the secure payment…", marco: (n) => `Payment for “${n}” with Hotmart`, noCarga: "Payment not loading? ",
        pestana: "Open it in a new tab", volver: " and come back here when you’re done.", gracias: "Thank you! We received your payment. Taking you to your order…" },
};

function crear(tag, clase, texto) {
  const n = document.createElement(tag);
  if (clase) n.className = clase;
  if (texto) n.textContent = texto;
  return n;
}

/**
 * Abre el panel. `alCerrar(pagado)` se llama al cerrarlo sin que llegara el aviso de pago.
 * Devuelve una función que lo cierra.
 */
export function abrirPagoEnPanel({ url, nombre, precio = "", alPagar = irAlPedido, alCerrar = () => {} }) {
  const tx = TEXTOS[idiomaDePagina()];
  const anteriorFoco = document.activeElement;
  const fondo = crear("div", "pago-panel");
  const hoja = crear("div", "pago-panel__hoja");
  hoja.setAttribute("role", "dialog");
  hoja.setAttribute("aria-modal", "true");
  hoja.setAttribute("aria-labelledby", "pago-panel-titulo");

  const cabecera = crear("header", "pago-panel__cabecera");
  const textos = crear("div", "pago-panel__textos");
  textos.append(crear("p", "pago-panel__eyebrow", tx.eyebrow));
  const titulo = crear("h2", "pago-panel__titulo", nombre);
  titulo.id = "pago-panel-titulo";
  textos.append(titulo);
  if (precio) textos.append(crear("p", "pago-panel__precio", tx.precio(precio)));
  const cerrar = crear("button", "pago-panel__cerrar", "✕");
  cerrar.type = "button";
  cerrar.setAttribute("aria-label", tx.cerrar);
  cabecera.append(textos, cerrar);

  const cuerpo = crear("div", "pago-panel__cuerpo");
  const cargando = crear("p", "pago-panel__cargando", tx.cargando);
  cargando.setAttribute("role", "status");
  const marco = crear("iframe", "pago-panel__marco");
  marco.title = tx.marco(nombre);
  marco.allow = "payment";
  marco.src = url;
  marco.addEventListener("load", () => cargando.remove(), { once: true });
  cuerpo.append(cargando, marco);

  const pie = crear("p", "pago-panel__pie", tx.noCarga);
  const enlace = crear("a", "", tx.pestana);
  enlace.href = url;
  enlace.target = "_blank";
  enlace.rel = "noopener noreferrer";
  pie.append(enlace, tx.volver);

  hoja.append(cabecera, cuerpo, pie);
  fondo.append(hoja);

  let pagado = false;
  function alRecibir(e) {
    if (e.origin !== window.location.origin || e.source !== marco.contentWindow || e.data?.tipo !== AVISO_PAGO) return;
    pagado = true;
    cuerpo.replaceChildren(crear("p", "pago-panel__cargando", tx.gracias));
    pie.remove();
    alPagar();
  }
  function alTeclear(e) { if (e.key === "Escape") quitar(); }
  const overflow = document.body.style.overflow;
  function quitar() {
    window.removeEventListener("message", alRecibir);
    document.removeEventListener("keydown", alTeclear);
    document.body.style.overflow = overflow;
    fondo.remove();
    anteriorFoco?.focus?.();
    if (!pagado) alCerrar(false);
  }
  cerrar.addEventListener("click", quitar);
  window.addEventListener("message", alRecibir);
  document.addEventListener("keydown", alTeclear);
  document.body.style.overflow = "hidden";
  document.body.append(fondo);
  cerrar.focus();
  return quitar;
}

export function irAlPedido() {
  window.location.assign(rutaEnIdioma("/pedido?retorno=hotmart", idiomaDePagina()));
}
