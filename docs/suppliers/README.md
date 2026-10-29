# Proveedores, costos y seguimiento de MYA

Panel: `/admin/proveedores/inteligencia`. Agenda: `/admin/proveedores`. Editor y costos comerciales existentes se conservan.

## Funcionamiento actual

Los nueve proveedores oficiales estan registrados en `suppliers`. Ocho catalogos publicos devolvieron productos reales: Star Company, Vencell Alberdi, Neo Import, Atacado USA, Total Herramientas Oficial, Atlantico Shop, Atacado Connect y Mobile Zone. Madrid Center restringe el acceso automatizado y dispone de importacion CSV o carga manual. No se evitan controles de acceso ni se usan claves internas.

El seguimiento se aloja en Supabase y conserva el respaldo diario existente de Vercel. Desde el 21/10/2026 no hay tarea de Windows ni revisión periódica local de Codex: el dueño prohibió usar su PC como servidor o abrir consolas automáticas. Los scripts PowerShell anteriores están deshabilitados. No reinstalarlos.

El procesador histórico `scripts/supplier-worker.mts` consultaba catálogos mediante navegador local; ese recorrido periódico fue retirado. Las listas iniciales son muestras/páginas visibles, no catálogos completos. La función Edge procesa las fichas primarias compatibles con HTTP, el cruce exacto de esas fichas y los comparables ya registrados. Las búsquedas que requieren renderizar un navegador (incluidos catálogos dinámicos) no están migradas a Edge: quedan para listas autorizadas CSV o revisión expresamente solicitada. No contratar ni simular un navegador remoto, ni reanudar el local silenciosamente. Vincular no publica productos; las coincidencias parciales requieren revisión. Se excluyen iPhone CPO, OUTLET, usados o activados de Connect; solo nuevos sellados.

## Un producto, varios proveedores

La primera pestana del panel, **Productos y proveedores**, agrupa las ofertas por producto MYA y variante exacta. Muestra los nueve proveedores, costo y moneda originales, disponibilidad comprobada, fechas, fuente y estado de busqueda. El indicador de varios proveedores exige la misma variante; dos tamanos distintos de una familia no cuentan como alternativas equivalentes. El menor costo calculable usa compra y pasador configurados; ofertas sin condiciones confirmadas no participan.

`src/lib/supplier-matching.ts` exige identidad completa: modelo, formula, volumen/capacidad, color, condicion y contenido del kit. Valida GTIN y modelos de fabricante, distingue accesorios y excluye iPhone usados/CPO/OUTLET. No decide vinculos por similitud de titulos. Las coincidencias ambiguas quedan en revision privada con confirmacion administrativa explicita y auditoria.

`supplier_discovery_jobs` programa todo producto contra cada proveedor activo. Las fichas primarias compatibles se procesan desde la nube por lotes con leases, cadencia y presupuesto de tiempo; los éxitos vuelven a seis horas y los errores usan espera creciente, con revisión después de cuatro intentos. Los trabajos de búsqueda con navegador se conservan pendientes, sin fingir que Edge los recorrió. La actualización del plan incorpora nuevas altas a las fichas y mantiene las consultas por marca/familia. La cobertura programada no equivale a resultados comprobados.

Los vinculos viven en `supplier_offers`, la auditoria en `supplier_link_decisions`. La RPC `link_supplier_offer_v1` revalida las instantaneas de producto, variante y fuente en transaccion. No cambia inventario, publicacion ni precio de venta. Un boton de compra del proveedor sin prueba explicita de stock conserva disponibilidad desconocida. Las actualizaciones preservan la identidad del proveedor y el vinculo verificado; un cambio de identidad produce una incidencia.

La siembra en la nube reutiliza `seedSupplierDiscovery` y el cruce de fichas reutiliza `runSupplierDiscovery` con `detailsOnly`. El historial anterior con navegador se conserva en [CROSSLINKS-2026-10-20.md](CROSSLINKS-2026-10-20.md); no describe la operación local actual.

La función Supabase `supplier-tracking` ejecuta lotes cortos y registra `supabase-*` en `supplier_sync_runs`: fichas vinculadas cada5minutos, alternativas con ficha primaria cada15minutos, comparables/precios cada hora y actualización del plan cada6horas. El cron diario de Vercel a las06:00UTC se conserva como respaldo de fichas. Los leases coordinan ambos motores. Cada ficha exitosa se vuelve a programar a seis horas; los errores usan espera creciente y quedan visibles en el panel. Tras cinco incidencias de sincronización se exige revisión administrativa.

El motor en la nube conserva permisos, identidad, robots, cadencia, tarifas, vigencias y controles de cambio. No lee portadas con un navegador de la PC. Su planificación no acredita disponibilidad ni descubre por sí sola un comparable que aún no está registrado.

El paquete Edge se prepara puntualmente con `node scripts/package-supplier-cloud.mjs`, usando las fuentes compartidas de `src/lib` y dependencias fijadas; no instala servicios ni tareas. Nunca versionar `.env.local`, registros, cotizaciones privadas o credenciales. La programación usa tickets aleatorios de un uso, con vencimiento de dos minutos, emitidos solo desde PostgreSQL. Edge verifica y consume el ticket con el service role propio del servidor. No se coloca una clave de servicio o secreto reutilizable en la cola HTTP de `pg_net`.

Los instaladores locales rechazan su ejecución. La PC puede estar apagada; la ejecución programada permanece en Supabase. No cambiar esta decisión por instrucciones históricas en documentos de entrega.

## Adaptadores y evidencia

| Fuente | Lectura implementada | Limites que se conservan |
|---|---|---|
| Star Company / Atacado USA | Ficha PrestaShop: ID, atributo, cantidad, moneda explicita; catalogo visible y buscador | Variantes ambiguas requieren revision; un relacionado no es el producto principal |
| Total | SKU/JSON-LD principal, disponibilidad explicita y USD visible del bloque principal con impuestos | El precio JSON-LD puede ser anterior a impuestos; no reemplaza el precio visible |
| Vencell / Neo Import | Tarjetas publicas renderizadas, ID visible y USD | Condiciones de pase incluido de Neo requieren revision para evitar doble cargo |
| Atlantico Shop | Tarjetas y buscador publico renderizado | Nombres truncados y variantes siguen privados hasta identificar el producto |
| Atacado Connect | Tarjetas y fichas publicas, USD, condicion y modelo | No usar claves de buscadores internos; iPhone solo nuevo sellado |
| Mobile Zone | Precio de tarjeta visible; stock y moneda de respuestas publicas sin credenciales que usa su interfaz | El precio base de su respuesta puede omitir recargo; se usa el visible |
| Madrid Center | Registro, incidencias, manual / CSV | Proteccion antibots sin evasion |

Se respetan robots, cadencia de al menos 10 segundos y limites de respuesta. Las reservas de cadencia se comparten en PostgreSQL entre procesadores. Un 404, error, identidad cambiada o parser sin evidencia conserva la ultima disponibilidad y costo, y registra la incidencia. Ausencia de una tarjeta no significa agotado. Las cantidades propias de MYA nunca se escriben desde el seguimiento.

## Costos y precios

Desde el 29/10/2026 el dueño indicó pago a proveedores a paridad de **1 USD publicado = 1 USDT**. El modo de adquisición USDT consulta la punta de compra con comisión informada y la contrasta con Binance Spot en el ciclo horario alojado. Los ajustes de venta usan bases aprobadas, evidencia y límites; consultar [USDT-2026-10-29.md](USDT-2026-10-29.md). La cotización de USDT no renueva las tarifas o el cambio del pasador, ni certifica gastos de red. Los parámetros históricos siguientes se conservan como antecedentes.

El usuario confirmo el 20/10/2026 ARS 1600 por USD de adquisicion y transporte hasta Tandil pagado por tercero: se excluye de sus costos. La cotizacion se puede actualizar en el panel; no es una constante permanente. Separar siempre cambio de compra y cambio para pagar al pasador.

Motor `src/lib/import-costs.ts`, tarifas versionadas en `import_cost_policies`: 20% general; 15% al superar USD1000 solo bajo interpretacion confirmada; USD25 por iPhone; tarifas TV por pulgadas exactas 32/43/50/60/70/80/100. No interpolar TV de 55 ni sumar porcentaje a una tarifa fija. La aplicacion del umbral y los pedidos mixtos no estan confirmados: se conserva 20% general, con advertencia. Las simulaciones admiten cotizaciones especiales y gastos por valor, cantidad, peso, volumen o asignacion manual, conservando centavos.

Automatizacion comercial habilitada: comparable exacto vigente, oferta verificada con costo y disponibilidad actuales, USD de adquisicion confirmado, piso por margen estimado y limite de cambio. Objetivo general 10% debajo del comparable, redondeado hacia abajo a ARS100. Se preserva la excepcion historica del 3% para la electronica de Atacado USA mediante `productDiscountPercent`. El margen minimo inicial configurado es 20% sobre los costos registrados, no ganancia neta. Los cambios superiores al 20% se presentan para aprobacion administrativa; al aprobar se revalidan datos y precio anterior en transaccion.

Mercado Libre puede restringir lecturas: el motor conserva fecha/precio historicos, registra el error y permite cargar una referencia exacta revisada desde el panel. Sin evidencia vigente se conserva el precio y se registra el motivo. Nunca fabricar referencias a partir del precio MYA ni elegir una publicacion cara para inflar margen. No se garantiza el minimo absoluto del mercado.

El seguimiento actualiza `supplier_available` solo con evidencia explicita fresca: una alternativa disponible basta; para marcar agotado, todas las ofertas conocidas deben confirmar agotamiento. Nunca escribe `stock`, pedidos, pagos o activacion de productos. Las simulaciones, candidatos y compras administrativas tampoco envian encargos ni ingresan inventario.

## Persistencia y permisos

Migraciones aditivas `20261020120000_supplier_intelligence.sql`, `20261020170000_supplier_automation.sql`, `20261020180000_supplier_automation_guards.sql`, `20261020190000_supplier_worker_coordination.sql`, `20261020200000_supplier_manual_references.sql`, `20261020210000_supplier_crosslinks.sql`, `20261020220000_supplier_link_stock_evidence.sql`, `20261021181000_supplier_cloud_worker.sql` y `20261021182000_supplier_cloud_crons.sql`. Ya aplicadas en MYA; no ejecutar reset. Ver [CLOUD-2026-10-21.md](CLOUD-2026-10-21.md) para la verificación del retiro local y la ejecución real alojada.

Ofertas e identidades en `supplier_offers`; observaciones inmutables en `supplier_observations`; propuestas de abastecimiento en `supplier_proposals`; simulaciones y registros administrativos en `import_simulations` e `import_purchases`; configuracion e historial privados, cola con leases, salud de fuentes, busquedas, referencias y decisiones de precio. Las ofertas verificadas y vinculadas con adaptador se agregan a la cola automaticamente. Los costos historicos de `product_costs` se conservan.

RLS y acciones `getAdminClient` requieren administrador. Workers usan exclusivamente el service role privado de MYA. Los clientes y visitantes no pueden leer costos ni enlaces mayoristas. La cron requiere `CRON_SECRET`. El catalogo publico mantiene su seleccion explicita de columnas.

## Validacion y entrega

`npm test`, `npm run type-check`, `npm run lint`, `npm run build`, `node scripts/check-public-evidence.mjs`, `node scripts/verify-supplier-workspace.mjs`. La UI se verifica a 320,390,1440 px con datos aislados: no acredita por si sola guardados reales. Las pruebas PostgreSQL verifican RLS, rollback, inventario, tarifas y revalidacion transaccional. Ver [IMPLEMENTATION-2026-10-20.md](IMPLEMENTATION-2026-10-20.md) para evidencia de entrega.

La revisión periódica local de Codex `mya-revisar-abastecimiento-y-comparables` fue eliminada el21/10/2026 por pedido del dueño. La revisión humana de comparables se hace solo cuando se solicita; nunca renovar evidencia desde resultados indexados. Referencias humanas se conservan hasta48horas sin ser invalidadas por un fallo del robot; pueden ser de Mercado Libre o de otra tienda argentina verificada.
