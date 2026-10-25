# Revisión del diseño público · 25 de octubre de 2026

Dominio configurado y comprobado: `astrea-charts.site`. La variante escrita sin «s», `astrea-chart.site`, no resolvió en la comprobación. Se trabaja únicamente en este repositorio del sitio público; no se modifica la API, la app ni el panel.

## Resultado

Identidad común en marfil, sepia y dorado, con Cormorant Garamond y DM Sans, ilustración editorial nítida, iconos propios, navegación y emblema coherentes, formularios claros y tarjetas de lectura.

Las páginas generadas usan `sitio-publico.css` y `sitio-publico.js`. Las páginas antiguas se adaptan con clases específicas para conservar sus formularios y resultados. El lector de impresión carga la nueva presentación solo en pantalla. La muestra se rehace sin Tailwind remoto, precios obsoletos ni botones sin acción. El texto de privacidad se conserva íntegro en una fuente HTML separada del diseño.

## Comprobación por ruta

Se inspeccionaron las siguientes 37 rutas en Chromium a 320, 390 y 1440 px: **111 vistas**, todas con respuesta 200 final, sin desbordamiento horizontal ni errores de JavaScript. `/proximamente` conserva su redirección a `/universo`.

| Ruta | 320 px | 390 px | 1440 px |
|---|---|---|---|
| `/` | OK | OK | OK |
| `/baja` | OK | OK | OK |
| `/canjear` | OK | OK | OK |
| `/carta` | OK | OK | OK |
| `/como-funciona` | OK | OK | OK |
| `/ejemplo` | OK | OK | OK |
| `/gracias` | OK | OK | OK |
| `/link-gratis` | OK | OK | OK |
| `/link` | OK | OK | OK |
| `/pedido` | OK | OK | OK |
| `/preguntas-frecuentes` | OK | OK | OK |
| `/privacidad` | OK | OK | OK |
| `/proximamente` | OK | OK | OK |
| `/regalar` | OK | OK | OK |
| `/reporte-impresion` | OK | OK | OK |
| `/reporte` | OK | OK | OK |
| `/reportes` | OK | OK | OK |
| `/sobre-astrea` | OK | OK | OK |
| `/terminos` | OK | OK | OK |
| `/universo` | OK | OK | OK |
| `/reportes/amor` | OK | OK | OK |
| `/reportes/carta-natal` | OK | OK | OK |
| `/reportes/compatibilidad` | OK | OK | OK |
| `/reportes/dinero` | OK | OK | OK |
| `/reportes/pack` | OK | OK | OK |
| `/reportes/patrones` | OK | OK | OK |
| `/reportes/revolucion-solar` | OK | OK | OK |
| `/reportes/tu-2027` | OK | OK | OK |
| `/reportes/vocacion` | OK | OK | OK |
| `/comprar/amor` | OK | OK | OK |
| `/comprar/carta-natal` | OK | OK | OK |
| `/comprar/compatibilidad` | OK | OK | OK |
| `/comprar/dinero` | OK | OK | OK |
| `/comprar/pack` | OK | OK | OK |
| `/comprar/patrones` | OK | OK | OK |
| `/comprar/revolucion-solar` | OK | OK | OK |
| `/comprar/vocacion` | OK | OK | OK |

## Estados y flujos

- Las ocho compras recorren datos → correo → revisión, incluidos pack, compatibilidad y revolución solar. Se verifica la validación y la presentación del resumen; no se crean pedidos ni se abre un pago real.
- Los tres generadores (`/universo`, `/carta`, `/link-gratis`) se prueban con respuesta simulada: formulario, rueda, resultado y Big Three.
- `/reporte` y `/reporte-impresion` se revisan con datos ficticios a 390 y 1440 px, además de su estado sin parámetros.
- Se revisan otras 15 rutas del blog en 390 y 1440 px: índice, semana actual, semana fechada y los doce signos, con la semana local de muestra. Todas responden y conservan el diseño sin desbordamientos.
- La suite existente `node --test tests/tienda.test.mjs` pasa, incluidas las comprobaciones de páginas generadas, catálogo, precios, checkouts y datos de compra.
- Se compara el contenido de privacidad con el anterior, normalizando solo espacios: idéntico.
- Las capturas y la galería de trabajo quedan en `/tmp/astrea-auditoria`; no se incluyen en el despliegue.

## Límites de la revisión

Las APIs de producción se interceptan durante las pruebas. Las capturas locales usan datos simulados donde hace falta; esta revisión no comprueba pagos ni generación real en producción. `/admin`, `/r/:token` y la aplicación de otro repositorio conservan su implementación. Las páginas de horóscopo ya diseñadas se revisan mediante la vista local del blog, sin cambios nuevos en el backend.

No se publica ni se mergea el rediseño con esta revisión. La coordinación del blog y sus secretos pendientes se mantiene en los PRs originales.
