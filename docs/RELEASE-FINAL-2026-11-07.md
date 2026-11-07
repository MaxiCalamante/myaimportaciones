# MYA Importaciones — cierre de release del 7 de noviembre de 2026

## Catálogo y recuperación

Se auditó la base productiva antes de escribir. Había 943 productos, 204 variantes y 758 productos publicados. Quedaron 225 ofertas exactas y 11 identidades con varias ofertas autorizadas en el plan. Se descartaron 690 ofertas que tenían una verificación previa pero no superaron la revisión de identidad o vigencia. Se revisaron 37 categorías afectadas y 628 URL de fichas publicadas. Once de esas fichas figuraban como destacadas. La tienda y sus recomendaciones toman los productos visibles con el filtro de catálogo. No se identificó una tabla de combos comerciales con productos enlazados. El respaldo no encontró filas afectadas en favoritos, carritos de cuenta, carritos guardados por correo ni carritos heredados.

Supabase archivó lógicamente 755 productos, de los cuales 628 estaban publicados, 171 variantes y 757 ofertas. Los acumulados del historial son 798 productos y 201 variantes archivados. Al cierre de la verificación de base quedaron 130 productos y 3 variantes visibles bajo el rol anónimo, sin fichas activas fuera del alcance. El rastreador detectó dos cambios de URL en el sitio de Total. Se verificaron modelo, SKU y presentación exacta antes de revalidar ambas asociaciones en el historial. La variante de 710 W mantuvo su stock físico y la disponibilidad del proveedor siguió agotada.

Star Company, Atacado USA, Atacado Connect y Total Herramientas Oficial son los cuatro registros operativos. Sus dominios son starcompany-py.com, atacadousa.com.py, atacadoconnect.com y totalherramientasoficial.com.py. Cinco proveedores anteriores permanecen archivados. Las vistas públicas y la validación de pedidos comprueban identidad por producto y variante. El checkout exige además evidencia operativa vigente. La comparación con el respaldo devolvió cero diferencias en los 4 pedidos, 3 ítems de pedido, 27 movimientos de stock y los campos de precio y stock físico de los 943 productos y 204 variantes.

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

La cotización pública productiva verificada en Supabase fue dólar blue venta a ARS 1.555 por USD, fuente DolarAPI del 06/11 a las 18:00 de Argentina y consultada el 07/11 a la 01:40. Es la cotización de venta configurada, independiente de las condiciones del pasador.

## Checkout y seguridad

Se probó el RPC productivo de cotización por transferencia dentro de transacciones revertidas. En la primera pasada devolvió 69 cotizaciones válidas y rechazó 60 identidades por costos incompletos o vencidos (41), evidencia de oferta no disponible o desactualizada (17) o contribución insuficiente (2). Una variante con stock físico revalidada después de esa pasada también cotizó correctamente. Una ficha archivada y una identidad inexistente quedaron rechazadas. Se conservaron los filtros de compra previos y las validaciones se aplican también al insertar ítems de pedidos.

Las pruebas aisladas cubrieron concurrencia, vigencia de cotización, cambios de medio de pago, descuentos, importes históricos y validaciones de orden. En producción se ejercitó la cotización sin crear pedidos ni enviar pagos. El rol público tiene acceso al catálogo autorizado y carece de lectura de los marcadores privados de archivo y de las ofertas de proveedores. El listado de archivados consulta las columnas necesarias sólo desde el servidor tras verificar el perfil administrativo.

## Pruebas y permisos

- Tests automatizados 419 aprobados. TypeScript aprobado. Lint con cero errores y 134 advertencias. Build real de Next.js aprobado contra backend aislado.
- SQL aislado con copia del esquema y la muestra productiva para recuperar el catálogo, verificar permisos y descartar nuevos pedidos de artículos retirados.
- En Supabase se verificaron las RPC de Moneda y Rastreador con el rol de una cuenta administradora existente, limitado a una transacción. Se guardó la política de prueba, se comprobó el incremento de versión y se revirtió la transacción.
- Rutas administrativas y ambas vistas del archivo probadas en el build aislado con visitante, cliente y administrador. Moneda y Rastreador tienen acceso desde el menú de administración. Rastreador incluye el listado paginado de productos y variantes archivados. Pendiente una sesión administrativa real en el dominio para acreditar navegación y persistencia de punta a punta.
- Mercado Pago se cubrió con fixtures de precios y estados locales. Pendiente el pago externo y el webhook en sandbox con credenciales y comprador de prueba. No se realizaron cobros de producción.

## Git, Vercel y verificación pública

La rama de trabajo fue `feat/four-supplier-tracker`. Se hizo push fast-forward a `origin/main`. El commit de aplicación `469f1568c8c898e76de331e29e9f8626643182e7` contiene el archivo administrativo y sucede al commit de integración `84952e57d343870e43e558a25f4b6a21701c9e42`.

Vercel construyó y sirvió el commit exacto en `dpl_5BochMbqahdgSphiVx9vpZ1H6VXW`. Se probó con la configuración productiva antes de promoverlo y se comprobó que el dominio resuelve al mismo despliegue. El acceso temporal utilizado para la prueba fue revocado. [Despliegue de Vercel](https://vercel.com/maxicalamantes-projects/myaimportaciones/5BochMbqahdgSphiVx9vpZ1H6VXW) · [Sitio productivo](https://myaimportaciones.com)

La prueba de navegador real pasó tanto antes de la promoción como en el dominio productivo, a 375, 390 y 1280 px. Incluyó inicio, catálogo, búsqueda interactiva, ficha con imagen cargada, ticker, carrito con cambio de cantidad, pantalla de checkout y selección mayorista poblada en vista de impresión. Las APIs de carrito y búsqueda excluyeron la ficha archivada de prueba. Esa URL devolvió HTTP 404 y quedó fuera del sitemap. Moneda, Rastreador y las dos vistas del archivo redirigieron al inicio de sesión para visitantes. Vercel devolvió cero grupos de logs de nivel error o fatal para el despliegue en la ventana de observación del smoke.

La visualización y el total dual USD/ARS se probaron con datos controlados a los tres anchos. Producción conserva los importes ARS vigentes porque aún no hay precios base USD aprobados.

## Resultado y pendientes

El release está en producción con Supabase, Git y Vercel verificados. Falta certificar Moneda y Rastreador de punta a punta con una sesión administrativa productiva autorizada. También queda pendiente el pago externo en Mercado Pago sandbox y el webhook asociado. La revisión comercial debe completar los costos y condiciones de los productos rechazados por el checkout antes de aprobar precios USD.

No se programó el apagado de Windows porque quedó pendiente la verificación administrativa real. Los procesos iniciados para las pruebas se cerraron al terminar.

## Revisión operativa posterior del 07/11/2026

Se verificaron en Supabase los cuatro proveedores operativos, cinco archivados y cero fuentes con importación automática. El rol público ve 130 productos y 3 variantes. Los costos y las ofertas privadas quedan fuera de su acceso efectivo, al igual que las RPC administrativas y de cotización interna. Se conservaron el esquema y las cinco versiones del release en el historial remoto.

El barrido de checkout minorista de una unidad encontró 70 identidades cotizables y 60 bloqueadas. Siete fichas de Total Herramientas Oficial conservaban modelo, SKU, número de publicación, moneda e importe de origen, pero el costo apuntaba a una URL anterior del mismo listado. Se confirmó cada ficha vigente mediante el adaptador y se ensayó el cambio en una transacción revertida. En producción se corrigieron sólo esas siete referencias, con la evidencia anterior y nueva registrada en el historial privado. Los modelos fueron TR111216, TGT11226, TACSDL25106, TPSLI2014, TMT570268, TS1001201 y TIDLI20668.

La comprobación posterior devolvió 77 identidades cotizables por cada medio en el cálculo interno y 53 bloqueadas. De las 53, 39 tienen gastos sin confirmar, 2 carecen de ficha de costo, 9 tienen cambios en la cotización del proveedor, 1 requiere recalcular el costo porque la oferta vigente es de otro proveedor y 2 quedan por debajo de la contribución mínima confirmada. Cinco de las que tienen gastos sin confirmar ya cuentan con una oferta vigente que coincide en fuente e importe. La revisión por identidad quedó guardada en un registro privado fuera de Git. Los valores, las fechas de validación de los costos, los pedidos, sus ítems y el stock físico se conservaron.

La política sigue en `preview`, con 30% minorista, 18% mayorista y 10% mínimo sobre el precio de venta, descontando el costo directo total y los gastos y comisiones atribuibles. Producción sigue sin perfiles de costo USD validados ni precios base USD publicados.

### Evidencia de verificación

- Navegación pública real a 375, 390 y 1280 px con búsqueda, imagen, carrito, cambio de cantidad y selección mayorista imprimible. La ficha archivada de prueba devolvió 404, quedó fuera del sitemap y de las APIs públicas y fue rechazada por el checkout.
- Pasaron 419 pruebas, TypeScript y el build aislado. Lint quedó en cero errores y 134 advertencias preexistentes. La auditoría de dependencias de producción devolvió cero vulnerabilidades reportadas.
- Sin sesión, Moneda, Rastreador y las dos vistas del archivo redirigen al inicio de sesión. El build aislado comprobó las rutas con roles de visitante, cliente y administrador. Supabase denegó las RPC de lectura administrativa desde un contexto sin identidad administrativa.
- Las pruebas aisladas cubrieron precios, cotizaciones y estados de pago. El barrido de Supabase ejercitó el cálculo interno para transferencia y Mercado Pago sin crear pedidos ni emitir cobros.

### Bloqueos y pasos para levantarlo

1. **Panel productivo.** Abrir una sesión de administrador autorizada y entrar desde el menú a Moneda, Proveedores, Rastreador y Archivo. Probar guardado con un ajuste reversible, confirmar que reaparece tras recargar y devolverlo a su valor original. La revisión actual acreditó protección y pruebas aisladas, pero quedó pendiente la persistencia desde una sesión real.
2. **Mercado Pago.** Habilitar un entorno aislado con las credenciales de prueba de la aplicación y una cuenta compradora de prueba. Confirmar pago sandbox, firma de la notificación y entrega duplicada del webhook. Las variables de Mercado Pago encontradas están configuradas en producción y no se usaron para la prueba externa. [Cuentas de prueba de Checkout Pro](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro-preferences/test-accounts)
3. **Checkout.** Revisar las 53 identidades pendientes. Empezar por las cinco con oferta vigente y gastos atribuibles por confirmar. Mantener el bloqueo hasta documentar los costos y verificar el piso de contribución.
