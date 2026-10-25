# SEO, descubrimiento en IA y consultas mayoristas — 25/10/2026

## Alcance y estado

Implementación local solicitada por el dueño: venta mayorista de todos los rubros del catálogo, venta minorista, envíos a toda Argentina y precios mayoristas únicamente por WhatsApp con Máximo o Agustina. Medicube recibe un acceso especializado por las consultas recibidas; no sustituye ni restringe los demás rubros. No se guarda ni publica la conversación de la clienta ni sus datos personales.

Se mantiene el mínimo confirmado: **5 unidades en total O $100.000 en productos**, iguales o combinadas entre marcas y rubros; alcanza una de las condiciones. Envío cotizado aparte. No se alteraron precios, inventario, permisos ni la bandera del checkout mayorista.

## Cambios

- `/mayorista` y los cinco rubros existentes muestran dos enlaces directos de WhatsApp, uno por asesor, sin exigir el formulario. El formulario existente sigue disponible para consultas detalladas. Los eventos de contacto conservan tipo, origen, rubro y asesor, con el consentimiento existente; no incluyen el texto de la consulta ni el destino ingresado. Un clic no demuestra un mensaje enviado ni una venta.
- `/mayorista/medicube` agrega contenido específico para el primer pedido, las presentaciones exactas y la combinación con otros productos. Tiene canonical propio y entra en el sitemap mediante el registro existente de rutas mayoristas. Se preserva la redirección antigua de cosmética a su página general.
- Las páginas de rubro muestran hasta seis productos reales del catálogo publicado. Las tarjetas no publican precios mayoristas ni envían objetos de producto completos al cliente: pasan solo título, slug y rubro para la consulta. Las fichas enlazadas continúan mostrando precios minoristas. La disponibilidad por cantidad se confirma en la propuesta.
- Las URLs minoristas existentes de Medicube y las cinco categorías principales reciben títulos, descripciones, introducciones y guías de compra propias, con enlaces a su sección mayorista. No se crean páginas minoristas duplicadas. Se conserva `noindex` para búsquedas y combinaciones de filtros, los canonical y la paginación. El texto introductorio también se ve en móvil.
- La portada comunica todo el catálogo por mayor y enlaza a skincare y Medicube. La información estructurada de la organización incluye cobertura nacional y ambos teléfonos comerciales.

## Buscadores y asistentes de IA

Se priorizan texto legible en HTML, enlaces rastreables, identidad comercial consistente y datos estructurados coincidentes con lo visible. Las reglas universales existentes de `robots.txt` permiten las páginas públicas y conservan las exclusiones administrativas; no se agregan grupos por bot que puedan reemplazar accidentalmente esas exclusiones.

`/llms.txt` es un índice público complementario, generado con los mismos mínimos y rutas que la web. Resume rubros, venta minorista/mayorista, entrega y contactos; omite listas privadas, costos y datos de clientes. Su existencia no es requisito de Google ni prueba de uso por asistentes de IA.

Fuentes revisadas:

- [Google: AI features and your website](https://developers.google.com/search/docs/appearance/ai-features): las bases de SEO siguen aplicando a AI Overviews y AI Mode; no se requieren archivos especiales para esas funciones. No equivale a garantizar aparición en Gemini.
- [OpenAI: crawlers](https://developers.openai.com/api/docs/bots): `OAI-SearchBot` corresponde al descubrimiento para búsqueda; `ChatGPT-User` a solicitudes del usuario. Permitirlos no acredita una visita ni una recomendación. La política de entrenamiento no se modifica.
- [Anthropic: robots](https://privacy.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler): `Claude-SearchBot` y `Claude-User` tienen funciones diferentes de `ClaudeBot`.
- [Google: estructura de sitios de comercio](https://developers.google.com/search/docs/specialty/ecommerce/help-google-understand-your-ecommerce-site-structure): relaciones claras entre páginas y enlaces a productos.

## Validación

- 220 pruebas aprobadas, TypeScript aprobado y ESLint sin errores. Build de producción local con webpack aprobado; incluye `/llms.txt` estático.
- 13 páginas con HTTP 200, canonical propio e indexación habilitada: siete mayoristas y seis minoristas. Rubro inexistente 404; redirección antigua 307 a cosmética coreana.
- Sitemap local: 393 URLs; preserva las 392 del dominio público consultado y añade únicamente `/mayorista/medicube`.
- 42 vistas de portada, mayorista y minorista a 320, 390 y 1440 px: sin desbordamiento horizontal ni excepciones de JavaScript. Se comprobó visualmente móvil y escritorio. Ambos asesores quedan visibles en el primer viewport de la página mayorista general a 390 × 900.
- Seis recorridos de consulta en tres páginas (Medicube, electrónica y perfumería): formulario detallado y consulta de un producto real. Se verificaron rubro, producto, enlace, unidades, destino y ambos contactos, sin abrir WhatsApp ni enviar mensajes.
- 18 imágenes de las nuevas tarjetas mayoristas cargadas correctamente en los tres rubros anteriores. `axe` no detectó violaciones WCAG A/AA en el contenido principal de `/mayorista`.
- Sin JavaScript, Medicube mayorista muestra título, condiciones, enlaces a los dos contactos y fichas de productos reales. `/llms.txt` responde 200 con `text/plain` y términos compartidos. Solicitudes con user agents simulados de OpenAI, Anthropic y Google respondieron 200 en la instancia local; no prueban visitas reales de esos servicios ni acceso desde sus IPs.
- La navegación de prueba espera la respuesta completa y bloquea precargas especulativas, rastreadores y escrituras en el navegador. Al terminar el script principal, el servidor no había registrado errores. Capturas adicionales con las precargas activas registraron `The destination stream closed early`, compatible con respuestas interrumpidas al navegar o cerrar el navegador; no se confirmó otra causa. No se detectaron excepciones de JavaScript ni un fallo visible en las páginas. Este registro queda como limitación de la prueba local; no se afirma una ejecución productiva libre de errores.
- `git diff --check` y el guard de evidencia pública aprobados. Cambios previos en `src/app/compartir/route.tsx` y `scripts/benchmark-share-cpu.mts` se conservaron separados del alcance.

Los resultados de la etapa local de `scripts/verify-wholesale-discovery.mjs` se guardan en `docs/seo/qa-private/wholesale-discovery-2026-10-25/verification.json`, fuera de Git. La publicación del conjunto fue autorizada posteriormente; seguimiento en `wholesale-release-2026-10-25.md`. La indexación y las recomendaciones de IA no están verificadas.

## Próximos pasos

1. Publicar los cambios con autorización y repetir las comprobaciones sobre el dominio y el despliegue resultante.
2. Revisar consultas y páginas de entrada en Search Console y referencias de asistentes en GA4. Separar clics de WhatsApp, consultas recibidas y ventas reales; las consultas comunicadas por el dueño no identifican por sí solas su fuente de adquisición.
