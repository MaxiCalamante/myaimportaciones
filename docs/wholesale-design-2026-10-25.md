# Integración visual de mayoristas — 25/10/2026

## Estado

Rediseño implementado y validado localmente durante la etapa inicial. Se suma al trabajo de SEO y consultas de `wholesale-discovery-2026-10-25.md`. La publicación del conjunto fue autorizada posteriormente; seguimiento en `wholesale-release-2026-10-25.md`.

## Cambios

- La sección pública `/mayorista` usa la misma cabecera blanca, logo y enlace a inicio que el resto de MYA. `Mayoristas` se marca como sección activa. Se retiró el cartel de cambio a minorista de la experiencia pública y el texto de novedades queda en una sola línea. La apariencia y las capacidades del canal B2B continúan condicionadas por `WHOLESALE_ENABLED`, que sigue en `false`.
- Búsqueda, catálogo, cuenta, favoritos, carrito y seguimiento siguen disponibles. En la sección pública mayorista, los resultados de búsqueda usan los precios minoristas del catálogo y llevan a `/catalogo`, coherente con el canal habilitado.
- La portada reemplaza el bloque oscuro por una composición de texto y productos reales. Las cinco imágenes representan los rubros publicados y enlazan a sus páginas. La lectura móvil prioriza propuesta, mínimo y ambos contactos antes de la galería.
- El directorio de rubros, el destacado de Medicube, los pasos de compra, las preguntas frecuentes y el formulario usan una misma jerarquía tipográfica y paleta. El pie mantiene la identidad de MYA para ambas modalidades. Se reutilizan Geist, Lucide y las imágenes del catálogo; no se agregan dependencias, imágenes ficticias, cifras comerciales ni testimonios.
- Las selecciones del catálogo se comparten por solicitud entre la presentación visual y las tarjetas de consulta. Los clientes reciben únicamente los campos necesarios para esas consultas, como antes.

Se conservan venta de todos los rubros por mayor, mínimo de **5 unidades O $100.000 en productos**, combinaciones entre rubros, precios mayoristas por WhatsApp y envíos a toda Argentina. No se cambian precios, inventario, permisos, pagos ni el checkout mayorista. Se mantienen las URL, canonical, metadatos, datos estructurados y contenido comercial del trabajo de SEO.

## Validación local

- TypeScript, ESLint de archivos afectados y build webpack aprobados. Cinco pruebas específicas de SEO mayorista, consultas y descubrimiento público aprobadas. Guard de evidencia pública y `git diff --check` aprobados.
- `scripts/verify-wholesale-discovery.mjs`: 13 controles HTTP, 42 vistas a 320/390/1440 px, tres formularios y tres consultas de productos. Sin excepciones JavaScript ni desbordamiento horizontal. URLs anteriores preservadas, sitemap 393, lectura sin JavaScript y enlaces a ambos asesores correctos.
- `scripts/verify-wholesale-design.mjs`: 12 vistas de mayorista y catálogo a 320/390/768/1024/1280/1440 px. Cabecera blanca compartida, logo a inicio, sin cartel de minorista y navegación de escritorio sin saltos de línea. Ocho recorridos de abrir/cerrar el menú con Escape y dos búsquedas de Medicube, móvil y escritorio, con resultados reales y navegación al catálogo.
- Las cinco imágenes de la portada cargan correctamente en los seis anchos. `axe` no detecta violaciones WCAG A/AA en el contenido principal de mayorista y Medicube. Se corrigió el contraste de los ordinales del directorio tras la primera comprobación.
- Sin escrituras desde el navegador, apertura de WhatsApp, mensajes enviados ni compras. La ejecución final de la instancia local no registró errores del servidor. Evidencia y capturas en `docs/seo/qa-private/wholesale-design-2026-10-25/`, fuera de Git.

## Próximos pasos

1. Publicar la versión revisada cuando el dueño autorice commit, push y despliegue; repetir los controles del dominio.
2. Revisar qué rubros y contactos reciben consultas para ajustar el orden del directorio con datos reales.
