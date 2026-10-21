# Storefront premium — 20 de octubre de 2026

Publicado en https://myaimportaciones.com mediante el despliegue READY `dpl_CGgBpk2zxywZaEBV78mTJBM49jwU`. El despliegue se verificó antes de promoverlo; después se comprobó el dominio público. No se creó commit ni se hizo push.

## Experiencia del cliente

- Ficha de producto: jerarquía de precio y variantes más clara, descripción y medios de pago desplegables, cantidad alineada y controles accesibles, consulta y compartir ordenados.
- Barra móvil de compra: total según cantidad, botón principal y acceso al carrito; distribución compacta con espacio seguro para el teléfono y el aviso de privacidad.
- Catálogo y búsqueda: buscador prioritario, filtros móviles, navegación horizontal de marcas, resultados que abren la ficha completa y estados de carga.
- Tarjetas: imágenes cuadradas visibles, precios en una línea y etiquetas de variantes más legibles.
- Carrito y checkout: controles consistentes, importes ordenados y restauración del carrito guardado antes de mostrar el estado vacío.
- Contacto: panel móvil desplazable y filas completas de atención, con cierre por teclado y restauración del foco.

Se conservaron las integraciones administrativas y las restricciones de publicación de datos internos. No se alteró la lógica de cobros ni se realizaron pedidos, pagos o envíos de correo durante las pruebas.

## Validación

- Suite existente: 177 pruebas aprobadas. TypeScript, ESLint dirigido y control de evidencia pública aprobados.
- Auditoría responsive de 68 vistas/estados en 320, 390, 768 y 1440 px sobre el despliegue aislado, sin errores de JavaScript ni desbordamiento horizontal. Incluyó inicio, catálogo, producto, favoritos, checkout, seguimiento, acceso, registro, condiciones y privacidad.
- Después de los ajustes finales de tarjetas y restauración del carrito: recorrido enfocado de 10 vistas a 390 px y controles móviles a 320 px. El script usa esperas sobre el estado persistido para evitar carreras de hidratación.
- Dominio público: primera visita móvil con aviso de privacidad, selección de dos unidades, carrito y checkout persistido; tres vistas de escritorio de catálogo, producto y contacto. Solicitudes de escritura bloqueadas en el navegador de pruebas.
- HTTP público: inicio, catálogo y producto 200; administración redirige al acceso; cron sin credenciales devuelve 401.

El build de producción en Vercel pasó. El servidor local de desarrollo fue demasiado lento para completar la primera compilación en este equipo; la evidencia visual corresponde a los despliegues y al dominio real.

Capturas e informes locales: `../scratch/storefront-premium-20261020/preview/` y `../scratch/storefront-premium-20261020/production/`. El manifiesto privado conserva los hashes del código publicado y la evidencia de la promoción.

## Corrección puntual de imágenes

La revisión visual detectó fotografías incorrectas para los tres colores del iPhone 17 Pro Max. Se sustituyeron las referencias de imagen del producto y sus cinco variantes por archivos WebP de 1000 × 1000 verificados por color. La actualización fue atómica, con comprobación de los valores anteriores y del número exacto de filas. Los snapshots privados permiten comprobar que precios, capacidades, stock, disponibilidad y activación se conservaron. La verificación final en el dominio público recorrió los tres colores a 390 y 1440 px: seis estados sin errores ni desbordamiento, con las seis imágenes cargadas a su resolución original. Evidencia privada: `scratch/suppliers-private/iphone17pm-images-proof.json`.

Identidad y colores: [Apple, especificaciones del iPhone 17 Pro Max](https://support.apple.com/en-la/125091). Fotografías de producto: [Verizon, iPhone 17 Pro Max](https://www.verizon.com/smartphones/apple-iphone-17-pro-max/?mtnFlow=P), recursos publicados para Cosmic Orange, Deep Blue y Silver. Se conservaron los archivos originales del proveedor de imágenes; no se generaron representaciones del producto.

Esta corrección cubre ese modelo; no constituye una auditoría de identidad fotográfica de todo el catálogo.
