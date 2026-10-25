# Versiones en tarjetas y ampliación de perfumería — 25/10/2026

## Comportamiento

Las tarjetas muestran hasta dos versiones reales activas con miniatura y nombre. El enlace `+N` permite abrir las demás opciones sin aumentar la altura de la tarjeta. Cada miniatura abre la ficha con esa variante seleccionada, conservando imagen, precio y opciones. Los parámetros inválidos usan la selección normal y la URL canónica sigue siendo la ficha del producto.

Se usa el mismo componente en todos los rubros. Las dimensiones públicas se derivan de filas reales activas, incluso en publicaciones con configuración antigua. Las ediciones pendientes no aparecen en tarjetas, galería ni datos públicos. Administración conserva las filas inactivas y su configuración editable.

La galería tiene una columna explícita y permite reducir su ancho en pantallas pequeñas; esto corrige el desborde observado con cuatro fotos en Yara a 320 px.

## Catálogo

- Nueva familia **Lattafa Ana Abiyedh Eau de Parfum 60 ml**, con **Rouge** y **Leather**, imágenes y precios minoristas propios.
- **Fakhar 100 ml**: se completaron Black y Rose, que antes se anunciaban sin filas seleccionables.
- **Khamrah 100 ml**: Qahwa seleccionable y verificado. La edición Clásico queda inactiva y en revisión privada: la fotografía de la fuente contradice el nombre de la edición.
- **Yara**: el selector recupera las tres ediciones reales; no publica una cuarta edición anunciada sin fila real.

Consulta del proveedor y precios documentados en evidencia privada, con la cotización de compra y pasador confirmada por el dueño para esta operación. Sin modificación global de la cotización ni recálculo masivo del catálogo. Los precios existentes de Fakhar y Khamrah y sus costos históricos se preservan. Las seis filas nuevas tienen stock físico cero; cinco quedan activas con disponibilidad de proveedor y una pendiente. Costos, fuentes comerciales y auditoría permanecen privados. El precio mayorista se consulta por WhatsApp.

Otras fragancias investigadas permanecen pendientes cuando falta una referencia vigente suficiente, el costo no sostiene el objetivo comercial o la identidad es contradictoria. No se presentan precios indexados como consultas actuales de Mercado Libre.

## Verificación

223 pruebas automáticas, incluidas variantes inactivas, configuración antigua, enlaces y límite de vista previa con 500 variantes. Tipado y compilación de producción; lint afectado sin errores, con advertencias preexistentes. Guard de evidencia pública aprobado. La prueba `scripts/verify-variant-preview.mjs` revisa catálogo de perfumería, electrónica y cosmética a 320/390/1440 px, enlaces de variantes y fichas nuevas/recuperadas, sin pedidos ni mensajes reales. Resultado y capturas locales y de producción en `docs/seo/qa-private/variant-preview-2026-10-25/`.

La publicación de código se confirma por SHA, estado y aliases de Vercel y comprobaciones públicas. No se presume indexación o recomendación por buscadores y asistentes.
