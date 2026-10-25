# Grabados del almanaque

Doce ilustraciones originales generadas con la herramienta integrada `image_gen`, una por signo. Estética de grabado antiguo, líneas sepia y dorado sobre papel marfil. Sin texto ni símbolos dibujados: los nombres y glifos siguen siendo HTML accesible.

Los prompts completos están en [prompts.json](prompts.json). Los PNG originales se conservan en la biblioteca local de imágenes generadas. Las versiones web están en esta carpeta: `SIGNO-320.webp`, `SIGNO-640.webp` y `SIGNO-960.webp`, optimizadas a calidad 0,86.

La API consume estas imágenes desde el dominio de la tienda en `app/templates/blog/_almanaque.html`: miniaturas con carga diferida en las doce tarjetas y una imagen prioritaria en la cabecera de cada signo. Los metadatos sociales del signo usan su grabado de 960 px. Las dimensiones explícitas y `srcset` reservan espacio y permiten elegir el tamaño según pantalla.

Las ilustraciones son decorativas y no representan el cielo de una fecha. La rueda calculada con Swiss Ephemeris conserva su representación de las posiciones reales.
