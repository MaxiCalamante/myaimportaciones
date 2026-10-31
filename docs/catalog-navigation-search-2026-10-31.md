# Categorías, menú y búsqueda — 31/10/2026

## Alcance

Corrección local del catálogo público, navegación responsive y búsqueda compartida entre encabezado y listado. Sin modificaciones de productos, precios, inventario, permisos o proveedores. Sin commit, push ni despliegue.

## Corrección del 404

El encabezado mostraba todas las categorías públicas, pero `generateMetadata` y el catálogo validaban las URLs contra las categorías con productos activos. Las subcategorías existentes sin productos terminaban en `notFound()`.

Se separa la existencia de una categoría pública de sus facetas pobladas. Las categorías existentes abren su página y ofrecen navegación hacia el rubro y el catálogo cuando están vacías. Estas páginas vacías llevan `noindex`; el sitemap conserva su selección de categorías pobladas. Las categorías desconocidas y las páginas fuera de rango mantienen `notFound()`. Se conserva la redirección de `smartphones-tecnologia` hacia `electronica` también durante la generación de metadatos.

## Menú

- Desktop: panel de rubros con iconos, subcategorías en dos columnas, nombres completos y un acceso visible a todo el rubro. La zona de subcategorías tiene desplazamiento propio para los rubros extensos.
- Mobile y tablet: desplegables nativos, nombres que admiten varias líneas y enlaces táctiles de al menos 44 px. Navegar cierra el menú.
- Se conservan cuenta, carrito, favoritos, seguimiento, mayoristas y acceso administrativo.

## Búsqueda

El autocompletado y los resultados usan el mismo motor. Reconoce tildes, mayúsculas, términos en diferente orden, plurales simples, marcas, modelos, SKU, etiquetas y variantes activas. Admite separadores de modelo y prioriza coincidencias por relevancia. Los identificadores con sufijos explícitos conservan su versión para evitar confundir modelos próximos.

El índice usa solamente campos públicos y lecturas paginadas del catálogo activo. Los filtros de categoría, marca, modelo, precio y orden siguen disponibles. No requiere migración. El formulario permite enviar con Enter o el botón de búsqueda; las sugerencias usan enlaces accesibles y cancelan respuestas anteriores. Distingue búsqueda en curso, sin coincidencias y error de red con reintento.

## Verificación

- 272 pruebas automáticas aprobadas; incluye seis pruebas nuevas de búsqueda y cobertura de categorías públicas vacías.
- TypeScript y lint de archivos afectados sin errores.
- Compilación de producción local aprobada.
- Verificador reproducible: `node scripts/verify-catalog-navigation.mjs`, con la aplicación local en el puerto 3100; admite `QA_BASE_URL`.
- 57 URLs de categorías y subcategorías comprobadas con respuesta 200, incluyendo categorías vacías.
- Vistas de 320, 390, 768, 1280 y 1440 px sin desbordamiento horizontal.
- Consultas reales por marca/tildes, términos invertidos y modelo; consistencia del primer resultado entre sugerencias y catálogo. Envío, estado vacío y fallo de red comprobados en mobile y desktop.
- Sin excepciones JavaScript; sin infracciones WCAG A/AA detectadas por axe en el encabezado con la búsqueda abierta en las dos vistas comprobadas.
- Capturas e informe local en `docs/seo/qa-private/catalog-navigation-2026-10-31/`.
- El recorrido completo también se ejecutó sobre el servidor local de la compilación de producción, en el puerto 3101, con los mismos resultados.

Los controles de rutas inexistentes comprueban la frontera `notFound`: el servidor de desarrollo puede enviar HTTP 200 antes de emitir esa frontera. Este trabajo no acredita una publicación ni cambia ese comportamiento del framework.

## Próximo paso

Publicar el cambio y repetir el verificador sobre el dominio público para acreditar el resultado en producción.
