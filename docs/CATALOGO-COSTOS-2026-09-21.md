# Catálogo, stock y rentabilidad — 21/09/2026

La base de datos está actualizada. El nuevo panel y los archivos de fotos locales se publicarán cuando el dueño haga commit y push a Vercel. No se realizó ese despliegue desde esta tarea.

## Qué quedó implementado

- `/admin/costos`: búsqueda y paginación de productos, compra en ARS/USD/PYG, conversión, transporte por unidad, otros gastos, comisión, precio de venta, contribución y margen. Permite registrar conteo físico confirmado. Conserva el stock si se deja el campo vacío.
- Guardado transaccional: rol administrador obligatorio; rechaza precio inferior al costo registrado y recuentos con reservas abiertas. Los costos no son accesibles para visitantes.
- Los costos base del PDF se distinguen de los gastos completos. Importar un costo no confirma transporte, comisiones, stock ni fecha de vigencia del proveedor.
- Galería con ampliación, filtro por marca y categorías agrupadas. Se añadieron subcategorías específicas de herramientas, contorno de ojos y kits capilares, conservando los enlaces históricos.
- Nombres y marcas corregidos; especificaciones de herramientas obtenidas por código exacto del proveedor. Se retiraron descripciones masivas con garantías, facturación y promesas comerciales no respaldadas.

## Resultados comprobados

| Control | Resultado |
|---|---:|
| Productos conservados en base | 2.892 |
| Fichas activas de la tienda minorista, excluidos teléfonos | 2.886 |
| Fichas activas con marca, descripción, precio y foto | 2.886 |
| Fotos de al menos 800 px en su lado mayor | 2.847 |
| Fotos de menor resolución original | 39 |
| Herramientas vinculadas al proveedor por SKU | 2.789 |
| Costos base vinculados al PDF mayorista | 2.789 |
| Ventas iguales o inferiores al costo base del PDF | 0 |
| Margen mínimo antes de transporte y otros gastos | 34,91% |
| Pedidos conservados | 2 |
| Suma del stock histórico, sin modificar | 107.654 |
| Productos con stock físico confirmado | 0 |

La resolución no equivale por sí sola a nitidez. Las 39 fotos menores conservan el detalle disponible; no se ampliaron artificialmente para llamarlas HD. Se recuperaron las 75 imágenes de cosméticos que respondían con error desde el proveedor. Sus originales y la procedencia quedan en `docs/catalog-audit/beauty-resolved.json`; las fotos para publicar están en `public/products/catalog/`.

## Precios: alcance real de la auditoría

Se localizaron tres PDF en las carpetas del negocio: dos de herramientas y uno de teléfonos. `Catalogo_MyA_Importaciones_MAYORISTA_2026.pdf` contiene 3.899 costos base; 2.789 se vinculan con herramientas publicadas. El PDF comercial contiene precios de venta y no se tomó como costo de compra.

No se encontró un PDF de costos de cosméticos. Los 97 cosméticos activos siguen sin costo de compra confirmado. Los precios históricos en dólares del archivo de importación no incluyen una conversión y gastos actuales confirmados: no se convirtieron en ganancias ficticias.

No se cambió masivamente el precio de venta. Cubrir el costo base no demuestra rentabilidad después de transporte, comisiones, impuestos y gastos fijos. Tampoco acredita estar 5–10% por debajo de una publicación comparable y vigente de Mercado Libre. Esa comparación individual sigue pendiente.

El ejemplo aportado por el dueño —compra $21.000, transporte $10.000, venta $54.900— deja $23.900 antes de otros gastos. No identifica un producto concreto y no se trasladó a todo el catálogo.

`auditoria-precios.csv` detalla los 2.892 registros y marca los costos faltantes. `precios-fichas-a-revisar.csv` identifica 18 fichas, agrupadas en nueve fotos compartidas, con precios diferentes. Es una señal de revisión, no una prueba de que todas sean duplicados: confirmar presentación antes de unificar. El panel muestra la misma alerta.

## Tres herramientas preservadas como borrador

- Taladro percutor Total 20V: varios modelos posibles en PDF.
- Amoladora Total 750W 115mm: al menos dos modelos/códigos compatibles.
- Set Wadfow 120 piezas con valija: el PDF contiene WHS3120, pero describe caja metálica; no alcanza para asegurar que sea la misma ficha.

Se conservaron sus registros y precios. No se les asignó un modelo ni una foto por aproximación. Se muestran como borradores en el administrador.

## Base y validación

Migración aplicada: `20260921185112_catalog_identity.sql`, además de las dos migraciones minoristas ya aplicadas. Carga de costos en siete lotes; no sobrescribe costos existentes. Carga de herramientas por SKU en 28 lotes, y 97 fichas de cosméticos.

Validación: TypeScript, ocho pruebas de comercio/PostgreSQL, compilación de producción de 27 páginas. Lint terminó sin errores (86 advertencias existentes o de código conservado). Auditoría de las 2.886 imágenes sin rutas faltantes ni productos incompletos. Consulta anónima de costos: cero filas visibles.

En navegador local se verificaron catálogo de marca en 1440 y 390 px, fotos cargadas y fichas de herramienta/cosmético, sin desbordes ni errores de JavaScript. `/admin/costos` redirige a login sin sesión. El guardado administrativo se probó en PostgreSQL aislado; no se crearon pedidos ni se modificó stock real para probarlo.

## Antes de vender con cobro automático

Completar costo de cosméticos, gastos por unidad y conteo físico real; resolver fichas similares; verificar comparables antes de prometer ahorro respecto de Mercado Libre. Persisten los requisitos de credenciales de pago y datos comerciales descritos en `ACTIVACION-Y-VALIDACION.md`. La migración y el catálogo actualizado no activan por sí solos el checkout.
