# MYA Importaciones — cierre de release del 7 de noviembre de 2026

## Catálogo y recuperación

Se auditó la base productiva antes de escribir. Había 943 productos, 204 variantes y 758 productos publicados. Quedaron 225 ofertas exactas y 11 identidades con varias ofertas autorizadas en el plan. Se descartaron 690 ofertas que tenían una verificación previa pero no superaron la revisión de identidad o vigencia. Se revisaron 37 categorías afectadas. El respaldo no encontró filas afectadas en favoritos, carritos de cuenta, carritos guardados por correo ni carritos heredados.

Supabase archivó lógicamente 755 productos, de los cuales 628 estaban publicados, 171 variantes y 757 ofertas. Los acumulados del historial son 798 productos y 201 variantes archivados. Tras el lote quedaron 130 fichas activas y 3 variantes activas. La siguiente lectura pública devolvió 129 productos por una URL de proveedor que cambió después del respaldo. La regla de alcance ocultó esa ficha y bloqueó su venta mientras se contrastaba la nueva evidencia.

Star Company, Atacado USA, Atacado Connect y Total Herramientas Oficial son los cuatro registros operativos. Sus dominios son starcompany-py.com, atacadousa.com.py, atacadoconnect.com y totalherramientasoficial.com.py. Cinco proveedores anteriores permanecen archivados. Las vistas públicas y la validación de pedidos comprueban identidad por producto y variante. El checkout exige además evidencia operativa vigente. Se preservaron las relaciones históricas y se comparó la huella de los cuatro pedidos antes y después.

El respaldo privado contiene los datos previos, manifiesto por archivo y plan transaccional. El SHA-256 del plan ejecutado es `65b245fad2acf6ca24e6910760168baaedadd1dcacab71be21b01f78079bea73`. Supabase conserva también las banderas previas y el resultado en un registro privado del lote. Se ensayaron restauración, idempotencia y rechazo de divergencias en PostgreSQL aislado. El respaldo y las credenciales permanecen fuera de Git.

## Supabase y migraciones

Proyecto verificado `gqcdurxndbeeugjfworx`. Cada migración se ensayó en un PostgreSQL aislado con esquema y funciones capturados de producción. Se verificaron objetos y permisos tras aplicar cada paso. El historial remoto usa la fecha real de aplicación y los archivos locales conservan las fechas de preparación.

| Archivo local | Versión remota aplicada |
| --- | --- |
| `20261107040127_final_catalog_supplier_scope.sql` | `20261107041552` |
| `20261106154701_usd_base_pricing.sql` | `20261107042110` |
| `20261106212229_supplier_post_audit_controls.sql` | `20261107042114` |
| `20261106213029_usd_contribution_policy.sql` | `20261107042119` |
| `20261106213412_usd_profitability_integration.sql` | `20261107042124` |

El esquema USD tenía objetos ya presentes con su registro base ausente. Se ejecutó el SQL idempotente para reconciliarlo. Los siete antecedentes del rastreador ya constaban con SQL equivalente y permanecen en su historial, en las versiones `20261105170408`, `20261105171011`, `20261106165901`, `20261106171813`, `20261106172227`, `20261106173028` y `20261106204536`. Las migraciones de este cierre están aplicadas. Para futuros cambios hay que usar esta correspondencia antes de interpretar un listado automático de migraciones.

## Rastreador y rentabilidad

La función alojada `supplier-tracking` corre en versión 11. El cron existente completó una muestra de seguimiento para cada proveedor el 7 de noviembre a las 04:27 UTC y reprogramó las cuatro tareas sin errores de reintento. Se verificó el rechazo de credenciales inválidas. Se mantuvieron las colas y los siete crons de Supabase. La importación automática sigue desactivada. Las 112 páginas y 2.246 identidades del recorrido anterior corresponden a detección privada, no a ventas ni publicaciones aprobadas.

El motor de contribución usa 30% minorista, 18% mayorista y un piso del 10% sobre precio de venta. La política productiva está en `preview`. Se conservan precios ARS, importes históricos y ediciones manuales. La validación de publicación USD requiere costos atribuibles y comisiones documentados. La base productiva tiene cero perfiles validados y cero precios base USD, por lo que el cierre deja habilitada la administración USD sin conversión masiva. Los parámetros históricos del pasador de 20%, 15%, USD 1.000 y ARS 1.600 quedan como referencia sujeta a evidencia de cada operación.

## Pruebas y permisos

- Tests automatizados 419 aprobados. TypeScript aprobado. Lint con cero errores y 134 advertencias. Build real de Next.js aprobado contra backend aislado.
- SQL aislado con copia del esquema y la muestra productiva para recuperar el catálogo, verificar permisos y descartar nuevos pedidos de artículos retirados.
- En Supabase se verificaron las RPC de Moneda y Rastreador con el rol de una cuenta administradora existente, limitado a una transacción. Se guardó la política de prueba, se comprobó el incremento de versión y se revirtió la transacción.
- Rutas administrativas probadas en el build aislado con visitante, cliente y administrador. Pendiente una sesión administrativa real en el dominio para acreditar navegación y persistencia de punta a punta.
- Mercado Pago se cubrió con fixtures de precios y estados locales. Pendiente el pago externo y el webhook en sandbox con credenciales y comprador de prueba. No se realizaron cobros de producción.

## Git, Vercel y verificación pública

La rama de trabajo es `feat/four-supplier-tracker` y la rama productiva es `main`. Se actualizará esta sección con el SHA, el despliegue y las comprobaciones del dominio al cerrar el release.

Producción: [myaimportaciones.com](https://myaimportaciones.com).

El apagado queda condicionado a completar todas las verificaciones críticas, incluida la sesión administrativa real.
