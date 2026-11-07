# Precios base USD — implementación del 06/11/2026

## Estado y auditoría

Rama `feat/usd-base-pricing`. Implementación local; la migración, el paquete Edge y la conversión del catálogo **no se aplicaron a producción** en esta intervención. La modificación masiva del catálogo requiere aprobar el listado concreto, según AGENTS.md. No se crearon compras ni cobros reales.

Auditoría de solo lectura realizada el 06/11: 943 productos, 204 variantes y 475 registros `product_costs`; 166 con gastos confirmados. Informe individual privado en `scratch/suppliers-private/usd-migration-2026-11-06/review.json` y `review.csv`: 1.147 identidades, 596 sin documento de costos, 344 sin precio mayorista y una sin precio minorista. Son indicadores de revisión, no una certificación del resto. Las variantes necesitan su propio costo exacto. La existencia de un costo de producto padre no acredita el de una variante.

El contrato anterior de la aplicación usa ARS: columnas `retail_price` / `wholesale_price`, `formatCurrency`, pedidos y preferencias de Mercado Pago. La moneda original de proveedor vive separadamente en `product_costs` / `supplier_offers`. No se deriva una de la otra ni se modifica el historial. Los cambios locales de proveedores del 05/11 ya presentes se conservan.

Recorridos auditados: `catalog-data`, `storefront`, catálogo paginado/búsqueda/favoritos/carrito, ficha/variantes/relacionados, `order-pricing`, checkout, preferencia y conciliación MP, transferencia/comprobante, motor mayorista v2, seguimiento alojado y herramienta manual. Los componentes antiguos `ProformaQuoteModal` y `SmartBuyerAdvisor` no están montados en la aplicación; sus simulaciones no autorizan cobros.

## Persistencia y compatibilidad

Migración: `supabase/migrations/20261106154701_usd_base_pricing.sql`.

- `product_usd_prices`: bases minorista/mayorista independientes por producto o variante, seis decimales exactos, origen manual/automático por canal, márgenes, revisión, costo USD, documento y desglose privado, fechas y respaldo original.
- `store_money_settings`: configuración de venta y márgenes predeterminados. Los márgenes comienzan pendientes; no se inventan porcentajes comerciales.
- `store_exchange_rates`: cotizaciones inmutables por fuente/tipo, venta original, ajuste, venta efectiva, fecha de fuente, consulta y vencimiento.
- `store_money_audit`: historial privado de configuraciones, emergencia, migraciones y cambios de precio.
- `store_checkout_quotes`: presupuesto del servidor con selección, revisión USD, importes ARS, tasa y vencimiento.
- `orders.charge_currency`, `orders.exchange_snapshot`, `order_items.base_unit_usd`: nueva evidencia monetaria. Las órdenes anteriores mantienen importes y moneda contractual original, con estos campos nuevos en null. No se les atribuye una cotización histórica inexistente.

Las columnas ARS anteriores se conservan como respaldo y compatibilidad de lectura administrativa. Los precios públicos y el checkout de identidades dolarizadas usan la proyección USD. Un trigger impide que editores o trabajadores anteriores escriban sobre sus precios ARS: deben usar el editor USD. Stock, disponibilidad y publicación siguen siendo campos independientes.

Todas las tablas nuevas tienen RLS y grants explícitos. Costos, fuentes, auditoría y presupuestos son privados. Los RPC públicos devuelven únicamente cotización y precios publicados; los RPC de configuración requieren `is_admin()`. Los de reserva y actualización de fuente requieren service role. Se mantiene `getAdminClient` y no se usa metadata editable por el usuario para autorizar.

## Cotización de venta

Fuente: [DolarAPI Argentina](https://dolarapi.com/docs/argentina/), [endpoint Blue](https://dolarapi.com/docs/argentina/operations/get-dolar-blue). Consulta backend `https://dolarapi.com/v1/dolares/{casa}`; inicio blue **venta**. MEP usa `bolsa`, CCL `contadoconliqui`. Oficial, mayorista bancario, tarjeta y cripto conservan identidades distintas.

Un lease PostgreSQL compartido limita la consulta entre instancias Vercel y Edge. Frecuencia inicial 15 minutos, timeout de 5 segundos y antigüedad máxima de fuente de 72 horas para contemplar cierres de mercado; configurables en `/admin/moneda`. La antigüedad se calcula sobre `fechaActualizacion`, nunca sobre la última consulta. La tasa de venta efectiva incorpora el ajuste administrativo explícito y lo informa al comprador.

Se rechazan moneda/casa incorrectas, venta cero/negativa/nula/textual, compra mayor que venta, fechas inválidas/futuras y variaciones sospechosas. Un error conserva el último dato válido y registra la incidencia. Una tasa vencida sigue identificada como referencia vencida en la presentación; no permite emitir una nueva cotización de compra USD. La fuente caída no produce un precio cero visible ni autoriza un cobro.

Se actualiza con tráfico desde el backend y en el ciclo `sync` alojado de proveedores (normalmente cada cinco minutos; el lease respeta la frecuencia elegida). El cron diario de Vercel continúa como respaldo. No se agrega ninguna tarea local, servicio de Windows o navegador periódico. La barra y el catálogo se refrescan al navegar, volver a la ventana o cumplirse el intervalo de visualización; el carrito revalida productos con su mecanismo existente.

Emergencia: valor manual con motivo, autor y duración de 1 a 72 horas. Se informa como manual; no se oculta su vencimiento. «Actualizar ahora desde DolarAPI» permite volver a la fuente automática. Un cambio de configuración invalida presupuestos aún no aceptados. No altera una orden ya creada.

## Dinero, costos y seguimiento

`money.ts` usa enteros BigInt para decimales, conversión, porcentajes y redondeo. PostgreSQL usa `numeric`. La conversión USD × venta efectiva se redondea una vez por unidad al paso ARS configurado, half-up. Los importes finales se suman en centavos; el formato ARS conserva centavos cuando existen. USD muestra al menos dos decimales y hasta los seis necesarios para no ocultar precisión de migración.

El cambio del público no recalcula las bases USD. La adquisición y el pasador tienen cotizaciones y fechas independientes. El desglose privado editable admite moneda/costo original, unidades de esa moneda por USD con fuente documental, adquisición ARS por USD/USDT, pasador porcentual/fijo con su cambio específico, gastos adicionales USD/ARS, gastos variables, comisión de cobro y contribución mínima. Los gastos por unidad deben incluir su reparto documentado. No se aplica automáticamente el 15% por superar USD1.000 ni una tarifa TV/iPhone: se carga el cargo aplicable tras comprobar la operación y el motor de importación existente. No se fija ARS1.600 ni se equiparan blue y USDT.

Fórmula de costo normalizado: mercadería original / unidadesPorUSD + cargoPasadorUSD × cambioPasador / cambioAdquisición + gastosUSD + gastosARS / cambioAdquisición. El cargo del pasador puede ser porcentual y/o fijo sólo si el documento confirma que ambos corresponden; no completar cargos por inferencia. El formulario exige confirmar también los ceros. Los cambios documentados del desglose vencen a las 24 horas para autorizar actualizaciones automáticas.

El rastreador conserva disponibilidad separada de inventario físico. Tras guardar una observación, `store_refresh_supplier_usd_v1` sólo opera sobre la misma oferta vinculada, moneda, URL y evidencia vigente. Actualiza el costo normalizado y únicamente los canales automáticos; los manuales conservan su importe. Los márgenes se calculan sobre costo total y comisión, sobre venta, con redondeo USD hacia arriba. Límites de variación o costos incompletos generan revisión privada. Los trabajadores ARS antiguos no pueden destruir esas bases. La herramienta manual sigue comprobando identidad y evidencia antes de invocar el recorrido USD.

El motor mayorista v2 conserva acceso público, controles de elegibilidad, medios de pago, escalas, vigencias, mínimos combinables y piso de rentabilidad. El precio independiente USD reemplaza el candidato de precio, manteniendo beneficios explícitos por cantidad/transferencia; vuelve a comprobar el piso. El USD base puede distinguirse del precio beneficiado por esas reglas. No se habilitan productos sin documentación por el hecho de registrar un precio.

## Carrito, cotización y pago

La navegación usa una proyección compartida de precios; no hace una consulta externa por card. Los filtros y orden por precio del catálogo se aplican sobre importes ARS proyectados. Se mantienen URLs, metadatos y ofertas estructuradas en ARS con el precio proyectado que se muestra al comprador argentino.

El servidor verifica selección exacta, disponibilidad, costos y medios de pago. Calcula promociones y genera un presupuesto privado, inicialmente válido por 15 minutos. El navegador recibe ID, vencimiento y resumen; sus importes no autorizan una orden. Al confirmar se compara la huella de selección, destino, medio y cupón, y se usan los importes guardados. La transacción bloquea productos/variantes, comprueba revisión USD, vuelve a validar costos, márgenes, reglas mayoristas y existencias, y reserva con el mecanismo actual.

La orden conserva la venta USD original, la tasa, tipo, fuente, ajuste y total ARS. Mercado Pago recibe `orders.total_amount`, moneda ARS; transferencia muestra exactamente ese mismo total. El cambio posterior del dólar no modifica una preferencia o reserva vigente. La duración de reserva del mecanismo existente permanece: 30 minutos MP, 24 horas transferencia. El presupuesto previo puede vencer antes de crear la orden; no reemplaza el vencimiento de una reserva ya aceptada. Los reintentos conservan idempotencia y no reservan dos veces. La conciliación de pagos existente sigue validando importe/moneda/estado.

## Migración controlada y puesta en marcha

1. Revisar el informe privado, la moneda contractual y las excepciones. Volver a ejecutar `node --env-file=.env.local --import tsx scripts/audit-usd-migration.mts` para regenerarlo; sólo lee producción.
2. Aplicar la migración aditiva en Supabase y desplegar la aplicación compatible. La migración no convierte productos. Mientras no se registre una base USD, se mantiene la ruta ARS existente.
3. Configurar márgenes reales, comisiones, gastos y fuente de venta en `/admin/moneda`; obtener una cotización válida. No habilitar ventas de casos sin costo exacto.
4. Generar vista previa por identidad con `migrate_product_usd_v1(product_id, variant_id, reference_rate_id, {currency:'ARS',retail:precio_original,wholesale:precio_original}, false)`. El resultado identifica tasa, originales y USD. No permite suponer moneda ni usar una tasa vencida.
5. Aprobar la lista concreta antes de la modificación masiva en producción. Aplicar las identidades aprobadas con `apply_input=true`, por lotes transaccionales del operador. Cada aplicación verifica que los originales no cambiaron y respalda esos importes. Los errores o duplicados detienen la transacción. Cero minorista se revisa; mayorista cero queda sin precio USD y exige revisión. Las órdenes completadas no forman parte de este proceso.
6. Desplegar el paquete actualizado de `supplier-tracking`: `node scripts/package-supplier-cloud.mjs` prepara las mismas fuentes compartidas; conservar tickets, crons y permisos existentes. No desplegar accidentalmente una versión anterior del bundle privado.
7. Hacer smoke autenticado de administración, venta minorista/mayorista, transferencia y MP en entorno de prueba, sin cobro real; después verificar muestra aprobada en producción.

Vercel conserva las variables existentes: `NEXT_PUBLIC_SUPABASE_URL`, clave pública, `SUPABASE_SERVICE_ROLE_KEY` sólo backend, `CRON_SECRET`, `COMMERCE_CHECKOUT_ENABLED`, las de MP y política de envío vigente. DolarAPI no requiere una nueva clave. Supabase conserva el service role propio de Edge y sus tickets. No modificar credenciales ni crons locales para esta mejora.

No retirar las columnas ni guardas de compatibilidad en la misma publicación. Un rollback de frontend posterior a dolarizar productos debe mantener el checkout USD o deshabilitar cobros de esas identidades; volver a una interfaz que interpreta el respaldo ARS como precio vigente es incorrecto. Restaurar bases requiere revisión explícita, nunca una conversión inversa masiva.

## Validación

Pruebas focalizadas: `tests/money.test.ts`, `tests/usd-pricing-database.test.ts`, y suites existentes de importación, proveedores, mayorista, carrito, pedidos, Mercado Pago y comprobantes. Las pruebas SQL ejecutan la migración real en PGlite e incluyen proyección, respaldo, permisos, leases, emergencia/vencimiento, FX congelado, idempotencia, costos separados, overrides y escalas mayoristas. Registrar resultados finales en la entrega. Un resultado local no acredita migración aplicada ni cobro real.


## Resultado verificado de esta entrega

- Suite completa: 365/365 pruebas aprobadas; luego se ejecutaron nuevamente las pruebas monetarias y SQL focalizadas.
- TypeScript y build de producción aprobados. ESLint completo: sin errores, con advertencias anteriores; los archivos nuevos no agregan advertencias.
- Navegador: recorrido anterior de carrito/checkout a 390 y 1280 px; nuevo recorrido USD/ARS a 375, 390 y 1280 px. Incluye catálogo, ficha, carrito, vencimiento, recálculo y envío de ID de cotización al pagar con fixtures de transferencia y MP. Capturas privadas en la carpeta `ui` del informe. No se emitieron órdenes ni cobros reales.
- La definición de las funciones de reserva en producción se contrastó con los marcadores de la migración. PostgreSQL 17.6 es compatible; la migración USD sigue sin aplicar.
- Vista previa privada regenerada con DolarAPI Blue venta ARS 1.555, fuente del 06/11/2026 a las 12:56 ART y consulta a las 13:22 ART. Es una instantánea revisable, no una tasa perpetua ni autorización para convertir el catálogo. JSON y CSV incluyen USD propuestos y diferencia de redondeo por identidad; se excluyen identidades que ya tengan USD.
- Advisors del proyecto actual conserva avisos anteriores sobre search_path, funciones públicas y protección de contraseñas. No acredita permisos de una migración aún no aplicada. Los permisos nuevos se comprobaron en PostgreSQL local; volver a ejecutar Advisors después de aplicar en el entorno elegido.
- Pendientes de operación: aplicar migración y desplegar tras revisión; confirmar parámetros comerciales y costos; aprobar el lote y referencia de conversión; smoke autenticado de producción y validación real de integración MP en su entorno de prueba. El checkout de prueba del navegador usa acciones simuladas.

## Archivos y preparación de Git

Cambios monetarios: `src/lib/money.ts`, `exchange-rate.ts`, `monetary.ts`, `order-pricing.ts`, `order-receipt.ts`, `storefront.ts`, `types.ts`; rutas de catálogo, búsqueda, favoritos y carrito; checkout y comprobante; `currency-provider.tsx` y consumidores de precio en cards/ficha/modales/carrito/barra móvil/búsqueda; layout y barra superior; alta de producto, editor de variantes y nueva sección `/admin/moneda`; migración USD y enganche del worker alojado; informe y pruebas nuevas.

La rama contiene trabajo previo del dueño: AGENTS.md, AI_CONTEXT.md, docs de proveedores, package.json, scripts locales, migraciones del 05/11, pruebas y `supplier-margin-prices.ts`. Se preserva ese trabajo y no se hace `git add .`. La entrega prepara un parche propio contra HEAD y un parche separado de integración sobre el archivo local previo. Ambos viven en `scratch/suppliers-private/usd-migration-2026-11-06/`; revisar el manifiesto antes de commit/push. No publicar esa carpeta, el informe individual, el bundle o las capturas privadas.
