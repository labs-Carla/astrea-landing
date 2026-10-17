# Tienda de reportes (astrea-charts.site)

Frontend comercial de Astrea Reports: portada, catálogo, detalle de cada
reporte, compra en 3 pasos, estado del pedido y páginas informativas. Es HTML
estático, igual que el resto del sitio, y reutiliza el sistema de diseño de
`/universo`.

## Rutas

| Ruta | Archivo | Notas |
|---|---|---|
| `/` | `index.html` | Nueva portada. Antes redirigía a `/universo`, que sigue igual. |
| `/reportes` | `reportes.html` | Catálogo: disponibles y en preparación |
| `/reportes/<slug>` | `reportes/<slug>.html` | 7 páginas de detalle |
| `/comprar/<slug>` | `comprar/<slug>.html` | Una por reporte con checkout real (hoy los 7). `noindex` |
| `/pedido` | `pedido.html` | Estado del último pedido de este navegador. `noindex` |
| `/como-funciona`, `/sobre-astrea`, `/preguntas-frecuentes` | | Informativas |
| `/gracias` | `gracias.html` | **Sin cambios para quien paga directo en Hotmart.** Si el navegador tiene un pedido de la tienda, lleva a `/pedido?retorno=hotmart`. `?formulario=1` fuerza el formulario |

No cambia: `/universo`, `/link`, `/link-gratis`, `/carta`, `/r/:token`,
`/admin` ni `/proximamente`.

## Archivos

- `tienda-assets/catalogo.js`: los 7 reportes. Fuente única de contenido.
- `tienda-assets/config.js`: URL de la API, checkouts de Hotmart y
  WhatsApp. Cumple el papel de variables de entorno, porque el sitio no tiene
  build. **No guarda secretos.**
- `tienda-assets/compra.js`: lógica pura (validación, orden, checkout y
  estados), testeada con `node --test`.
- `tienda-assets/comprar.js`, `pedido.js`: comportamiento en el navegador.
- `tienda-assets/tienda.css`: componentes nuevos sobre `universo.css`.
- `scripts/generar-tienda.mjs`: genera los `.html` de la tienda. **Los `.html`
  generados no se editan a mano.**

```bash
node scripts/generar-tienda.mjs           # regenerar después de cambiar el catálogo, la config o las plantillas
node --test tests/tienda.test.mjs          # unitarias; incluye "páginas al día con el generador"
node scripts/servidor-local.mjs            # http://127.0.0.1:5500, URLs limpias como en Vercel
PW=<playwright/index.mjs> node tests/e2e/tienda.e2e.mjs   # navegador real contra el backend LOCAL
```

## Flujo de compra y contrato con el backend

1. La persona elige la carta natal y completa sus datos natales y su correo. Revisa el resumen y acepta las condiciones.
2. `POST {API}/carta-natal/orden` con `{nombre, email, fecha_hora_local, ciudad, pais}` responde `{status, orden_id}`.
   - Es el endpoint existente. La orden nace con `pago_confirmado=false`.
   - Reenviar los mismos datos natales devuelve **la misma orden** y nunca des-confirma un pago.
   - El frontend además reutiliza la orden en un doble clic o un reintento.
3. Redirige al checkout real de Hotmart con `email`, `name` y `sck=astrea-orden-<id>`.
4. En el panel (pestaña "Esperando pago"), la administradora cruza la venta de Hotmart por `astrea-orden-<id>` y la confirma a mano.
5. Aprobación y entrega por `/r/<token>`: **sin cambios.**

El frontend **nunca**:
- envía precio ni estado de pago;
- declara un pago confirmado porque la persona volvió de Hotmart;
- arma enlaces de entrega;
- guarda datos de tarjeta;
- escribe datos personales en la consola.

En el navegador solo guarda la referencia del pedido (14 días) y un borrador
del formulario en `sessionStorage`, que se borra al crear el pedido.

### Estado del pedido (astrea-API #92)

`POST /carta-natal/orden` también devuelve `referencia`: un token aleatorio de
128 bits, el mismo si se reintenta la orden. La tienda lo guarda con el pedido,
y `/pedido` consulta:

```
GET /api/v1/carta-natal/orden/{referencia}/estado
→ 200 {"estado": "pendiente" | "confirmado" | "enviado" | "reembolsado"}   404 si no existe
```

- **Solo devuelve el estado:** ni datos personales ni el token de entrega. El
  `id` numérico no sirve como referencia.
- **Si la consulta falla** (sin red, sin referencia o backend anterior),
  `/pedido` muestra el estado local: "creado" o "pendiente de confirmación".
  Nunca muestra "confirmado" por su cuenta.
- **"rechazado":** está listo en el frontend, pero el backend no lo informa
  hasta que exista el webhook de Hotmart.
- **Órdenes sin referencia:** las del formulario post-pago de `/gracias` no
  tienen referencia y no se pueden consultar.

## Qué se puede comprar (desde 2026-10-10)

| Reporte | Precio mostrado | Hotmart | Canal | `sck` |
|---|---|---|---|---|
| Carta natal completa | USD 12 | `B106744064D` | `POST /carta-natal/orden` | `astrea-orden-<id>` |
| Amor y vínculos | USD 9 | `P107968115R` | `POST /pedidos` | `astrea-pedido-<id>` |
| Vocación y propósito | USD 9 | `N107968156X` | `POST /pedidos` | `astrea-pedido-<id>` |
| Dinero y abundancia | USD 9 | `W107968171W` | `POST /pedidos` | `astrea-pedido-<id>` |
| Patrones y transformación | USD 9 | `U107968183Y` | `POST /pedidos` | `astrea-pedido-<id>` |
| Revolución solar | USD 12 | `X107968195X` | `POST /pedidos` + lugar del cumpleaños y año | `astrea-pedido-<id>` |
| Compatibilidad de pareja | USD 15 | `L107968202K` | `POST /pedidos` + datos y consentimiento de la otra persona | `astrea-pedido-<id>` |

- **Precio.** Es una referencia para la tienda; el monto real lo cobra Hotmart.
- **Los 6 temáticos se preparan a mano** después de cada compra (decisión comercial: entrega en PDF por correo en 24–48 h). En el panel están en la pestaña **Otros reportes**, con las acciones confirmar pago, marcar enviado y reembolso.
- **Astrea.ai está en pausa** (2026-10-11): la tienda no la menciona ni enlaza la app; la app solo admite superadmins.
- **Backend:** astrea-API #93 (`pedidos_producto`). **Panel:** astrea-informe-react #5.

## Pendiente antes de publicar

- **Decisión de flujo.** La landing revirtió "datos antes del pago" (#14)
  mientras se preparaba el checkout embebido de Hotmart. La tienda vuelve a
  pedir los datos antes del pago, solo desde `/comprar`. `/universo`, `/link`
  y `/link-gratis` siguen enviando directo a Hotmart con el formulario
  post-pago.
- **Página de agradecimiento en Hotmart.** Verificar que el producto redirija a
  `https://astrea-charts.site/gracias`.
- **Precio.** "USD 12" es una referencia para mostrar en la tienda. El monto
  real lo cobra Hotmart en la moneda local.

## Portada (inicio)

`index.html` es la portada: el hero y la navegación de siempre (escultura en
el arco y «Un mapa del cielo para comprender tu historia.»), seguidos de la
franja de confianza, los 7 reportes con precio y "Comprar", cómo funciona,
testimonios y preguntas frecuentes. Se genera, como el resto, con
`scripts/generar-tienda.mjs`.

- **Testimonios.** El arreglo `TESTIMONIOS` está vacío y la sección no se
  muestra. Agrega solo testimonios reales y autorizados (`{ texto, nombre, detalle? }`).
- **Términos y reembolsos.** `/terminos` (generada): garantía de 7 días de Hotmart, reembolso total aunque la lectura ya se haya entregado. El pie y el paso «Revisa tu pedido» la enlazan. La garantía configurada en Hotmart debe seguir siendo de 7 días.

## Origen de la venta (`src` de Hotmart)

Cada enlace de pago lleva `src` para que el historial de Hotmart (columna "Origen venta / SRC") diga qué canal
vendió. Lo resuelve `tienda-assets/origen.js`, cargado en todas las páginas de la tienda y en `/link`,
`/link-gratis` y `/universo`:

1. `?src=` del enlace por el que entró la persona (o `?utm_source=` + `?utm_campaign=`).
2. Si no hay, el sitio que la refirió: `tiktok`, `instagram`, `facebook`, `whatsapp`, `google`… u `otro-sitio`.
3. Se guarda 30 días en el navegador (gana el último origen conocido).
4. Sin nada de lo anterior: la página por la que pasó (`tienda`, `link`, `link-gratis`, `universo`).

No pisa un `src` que el enlace ya traiga (afiliados de Hotmart) ni toca `sck`, que sigue identificando el pedido.

| Dónde publicas el enlace | Enlace |
|---|---|
| Bio de TikTok | `https://astrea-charts.site/link?src=tiktok-bio` |
| Bio de Instagram | `https://astrea-charts.site/link?src=ig-bio` |
| WhatsApp | `https://astrea-charts.site/?src=whatsapp` |
| Un video o campaña | `https://astrea-charts.site/?src=tiktok-<tema>` |
| Afiliada (fuera de Hotmart) | `https://astrea-charts.site/?src=afiliado-<nombre>` |
