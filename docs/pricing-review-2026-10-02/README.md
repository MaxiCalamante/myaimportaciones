# Revisión de precios del 02/10/2026

Decisión del dueño: 10% más barato que Mercado Libre, usando una referencia equivalente y cuidando el margen. Cotización indicada para esta operación: ARS 1550/USD. Las referencias ML son de búsqueda indexada; no certifican precio vigente en checkout ni mínimo absoluto del mercado. Cotizaciones de mayoristas leídas directamente en el producto principal por ID/SKU.

## Resultado aplicado

El dueño autorizó publicar las 85 propuestas para productos ya activos. Se actualizaron 29 precios hacia arriba y 56 hacia abajo, redondeando hacia abajo a ARS 100 para mantener al menos 10% de diferencia contra la referencia elegida. La transacción se habría cancelado ante cambios concurrentes de esos productos o valores fuera de la política. Ningún precio actualizado está bajo la compra calculada; la rentabilidad final depende de gastos todavía no confirmados.

La API pública confirma los 85 importes. Tres fichas públicas respondieron HTTP 200 con sus precios correctos en datos estructurados: Jelly Cream 50 ml ARS 45.400, Anua Cleansing Oil 200 ml ARS 41.900 y Total TG1262306 ARS 337.200.

Se revisaron los 214 productos de la lectura inicial. Se verificó que las 129 filas no seleccionadas y todos los costos quedaron iguales; en las 85 seleccionadas sólo cambiaron precio y fecha de actualización. Se conservaron los 45 borradores, disponibilidad, stock y modos de abastecimiento. No se modificaron pedidos ni categorías ni se desplegó código de aplicación.

Durante la tarea se creó un producto Bare Vanilla 250 ml. También se revisó: MYA ARS 35.000, Atacado USD 11,25, compra ARS 17.437,50. Se dejó fuera de las 85 actualizaciones autorizadas. Cierre del informe: 215 productos, 170 publicados, 45 borradores, 214 con cotización actual, 85 precios aplicados, 126 casos pendientes y cuatro propuestas para borradores conservados.

## Archivos

- `revision.html`: informe final filtrable; `productos.csv` y `productos.json`: todas las filas con estado y fuentes.
- `catalog-before.json`: lectura inicial; `catalog-after.json`: lectura posterior a la transacción.
- `price-changes-proposed.json`: lote de 85 cambios; `price-changes-authorized.sql`: operación aplicada con bloqueo y control de precio/fecha anteriores. **No volver a ejecutar el SQL**: conserva la evidencia de esta operación y rechaza el estado posterior.
- `public-verification.json`: comprobación de los 85 precios en API pública y tres fichas HTTP.
- `revision-propuestas.html` y `productos-propuestas.json`: tabla presentada antes de publicar.
- `supplier-live.json`, `supplier-*.html`: cotizaciones directas, alternativas y errores; `market-*.txt`: búsquedas ML, `market-candidates.json`: candidatos filtrados.
- `additional-product.json`: producto agregado durante la revisión.

Venta menos compra se informa antes de flete, impuestos, comisiones, embalaje y otros gastos: no es ganancia neta. Se mantuvieron los costos privados existentes; las cotizaciones nuevas son evidencia separada. El criterio para próximas cargas está en `../POLITICA-DE-PRECIOS.md` y `../../AI_CONTEXT.md`.
