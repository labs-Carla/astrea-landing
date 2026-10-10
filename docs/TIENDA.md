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
| `/comprar/carta-natal` | `comprar/carta-natal.html` | Solo existe para reportes con checkout real. `noindex` |
| `/pedido` | `pedido.html` | Estado del último pedido de este navegador. `noindex` |
| `/como-funciona`, `/sobre-astrea`, `/preguntas-frecuentes` | | Informativas |
| `/gracias` | `gracias.html` | **Sin cambios para quien paga directo en Hotmart.** Si el navegador tiene un pedido de la tienda, lleva a `/pedido?retorno=hotmart`. `?formulario=1` fuerza el formulario |

No cambia: `/universo`, `/link`, `/link-gratis`, `/carta`, `/r/:token`,
`/admin` ni `/proximamente`.

## Archivos

- `tienda-assets/catalogo.js`: los 7 reportes. Fuente única de contenido.
- `tienda-assets/config.js`: URL de la API, checkouts de Hotmart y URL de
  Astrea.ai. Cumple el papel de variables de entorno, porque el sitio no tiene
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

### Qué falta en el backend (documentado, no implementado)

**Estado del pedido.** No existe un endpoint público, así que `/pedido` solo
puede mostrar "creado" o "pago pendiente de confirmación". Contrato propuesto:

```
GET /api/v1/carta-natal/orden/{referencia}/estado
→ 200 {"estado": "pendiente" | "confirmado" | "rechazado"}   404 si no existe
```

- `{referencia}` debe ser un **identificador no adivinable** (por ejemplo, un
  token aleatorio que devuelva `/carta-natal/orden`), no el `id` numérico. Si
  no, cualquiera podría consultar órdenes ajenas.
- Nunca debe devolver datos personales ni el token de entrega.
- "rechazado" solo existirá cuando llegue la información de Hotmart (webhook).

Cuando exista: poner `ESTADO_PEDIDO_HABILITADO = true` en `config.js` y
ajustar la URL en `pedido.js`.

## Qué se puede comprar

| Reporte | Estado | Por qué |
|---|---|---|
| Carta natal completa | **Disponible** | Producto Hotmart `B106744064D`, flujo de orden, panel y entrega reales |
| Revolución solar | Próximamente | El backend no puede generarla |
| Compatibilidad | Próximamente | El backend no lee dos cartas a la vez |
| Amor, Vocación, Dinero, Patrones | Próximamente | Existe el motor genérico `producto_configs`, pero falta lo de la lista siguiente |

Lo que falta para vender un reporte temático:
- un producto en Hotmart;
- una orden pública por producto;
- la página de entrega del `ProductoGenerado`, porque `/productos/token/{token}` existe en la API pero no tiene página;
- confirmar que su `producto_config` esté activo en producción.

Para habilitar uno: cumplir todo lo anterior, agregar su checkout a
`CHECKOUTS` y regenerar las páginas.

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
