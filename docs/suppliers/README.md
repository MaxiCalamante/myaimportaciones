# Proveedores, costos y seguimiento de MYA

Panel: `/admin/proveedores/inteligencia`. Agenda: `/admin/proveedores`. Editor y costos comerciales existentes se conservan.

## Funcionamiento actual

Los nueve proveedores oficiales estan registrados en `suppliers`. Ocho catalogos publicos devolvieron productos reales: Star Company, Vencell Alberdi, Neo Import, Atacado USA, Total Herramientas Oficial, Atlantico Shop, Atacado Connect y Mobile Zone. Madrid Center restringe el acceso automatizado y dispone de importacion CSV o carga manual. No se evitan controles de acceso ni se usan claves internas.

El procesador `scripts/supplier-worker.mts` consulta las vistas publicas mediante navegador, guarda candidatos privados y atiende busquedas solicitadas desde el panel. Las listas iniciales son muestras/paginas visibles, no una afirmacion de haber descargado todos los catalogos. El cruce automatico vincula solo identidades exactas con evidencia suficiente; los candidatos parciales requieren revision. Vincular no publica productos. Se excluyen iPhone CPO, OUTLET, usados o activados de Connect; solo nuevos sellados.

## Un producto, varios proveedores

La primera pestana del panel, **Productos y proveedores**, agrupa las ofertas por producto MYA y variante exacta. Muestra los nueve proveedores, costo y moneda originales, disponibilidad comprobada, fechas, fuente y estado de busqueda. El indicador de varios proveedores exige la misma variante; dos tamanos distintos de una familia no cuentan como alternativas equivalentes. El menor costo calculable usa compra y pasador configurados; ofertas sin condiciones confirmadas no participan.

`src/lib/supplier-matching.ts` exige identidad completa: modelo, formula, volumen/capacidad, color, condicion y contenido del kit. Valida GTIN y modelos de fabricante, distingue accesorios y excluye iPhone usados/CPO/OUTLET. No decide vinculos por similitud de titulos. Las coincidencias ambiguas quedan en revision privada con confirmacion administrativa explicita y auditoria.

`supplier_discovery_jobs` programa todo producto contra cada proveedor activo. Las consultas se agrupan por marca/familia, siguen la paginacion expuesta y enriquecen fichas primarias cuando las tarjetas estan truncadas. Cada ciclo local atiende hasta18 trabajos adicionales con leases y presupuesto de tiempo; los exitosos vuelven a seis horas y los errores usan espera creciente, con revision despues de cuatro intentos. Las nuevas altas de catalogo se incorporan en el siguiente ciclo, incluso dentro de marcas ya programadas. La cobertura programada no equivale a haber terminado de consultar todos los resultados.

Los vinculos viven en `supplier_offers`, la auditoria en `supplier_link_decisions`. La RPC `link_supplier_offer_v1` revalida las instantaneas de producto, variante y fuente en transaccion. No cambia inventario, publicacion ni precio de venta. Un boton de compra del proveedor sin prueba explicita de stock conserva disponibilidad desconocida. Las actualizaciones preservan la identidad del proveedor y el vinculo verificado; un cambio de identidad produce una incidencia.

Ejecucion puntual del cruce y su siembra: `node --import tsx scripts/supplier-crosslink.mts`; agregar `--cycle` para procesar un lote de consultas. El worker habitual ya incluye ambas tareas. Ver [CROSSLINKS-2026-10-20.md](CROSSLINKS-2026-10-20.md) para evidencia y limites.

La tarea de Windows `MYA - Seguimiento de proveedores` ejecuta el procesador cada 15 minutos. Necesita esta PC encendida, sesion iniciada e internet. Atiende hasta 60 productos vinculados por ciclo y programa cada ficha exitosa a seis horas. Sus errores se reintentan con espera creciente y quedan visibles en el panel. Tras cinco incidencias se detiene esa ficha hasta revision; hay un boton para reintentar. El cron diario de Vercel a las 06:00 UTC atiende un lote acotado de respaldo de fichas vinculadas; no sustituye el procesador local de catalogos dinamicos.

El cruce dirigido por producto tiene prioridad dentro del ciclo. Las portadas generales se vuelven a leer solo si su ultimo intento tiene al menos seis horas, salvo una busqueda solicitada expresamente, para dedicar el tiempo a alternativas concretas y evitar repeticiones.

Instalacion local reproducible: `powershell -NoProfile -File scripts/install-supplier-worker.ps1`. Ejecucion puntual: `node --import tsx scripts/supplier-worker.mts`; `--tracking-only` omite catalogos y `--quick` reduce el lote. Informes privados en `scratch/suppliers-private/`. Nunca versionar `.env.local`, registros, cotizaciones privadas o credenciales.

El instalador prepara el navegador headless propio de la version instalada de Playwright (`node node_modules/playwright/cli.js install chromium --only-shell`). El procesador usa ese navegador con un limite de arranque de45segundos y no depende de Chrome personal. Repetir la instalacion si se actualiza Playwright a una version que requiere otro navegador.

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

El usuario confirmo el 20/10/2026 ARS 1600 por USD de adquisicion y transporte hasta Tandil pagado por tercero: se excluye de sus costos. La cotizacion se puede actualizar en el panel; no es una constante permanente. Separar siempre cambio de compra y cambio para pagar al pasador.

Motor `src/lib/import-costs.ts`, tarifas versionadas en `import_cost_policies`: 20% general; 15% al superar USD1000 solo bajo interpretacion confirmada; USD25 por iPhone; tarifas TV por pulgadas exactas 32/43/50/60/70/80/100. No interpolar TV de 55 ni sumar porcentaje a una tarifa fija. La aplicacion del umbral y los pedidos mixtos no estan confirmados: se conserva 20% general, con advertencia. Las simulaciones admiten cotizaciones especiales y gastos por valor, cantidad, peso, volumen o asignacion manual, conservando centavos.

Automatizacion comercial habilitada: comparable exacto vigente, oferta verificada con costo y disponibilidad actuales, USD de adquisicion confirmado, piso por margen estimado y limite de cambio. Objetivo general 10% debajo del comparable, redondeado hacia abajo a ARS100. Se preserva la excepcion historica del 3% para la electronica de Atacado USA mediante `productDiscountPercent`. El margen minimo inicial configurado es 20% sobre los costos registrados, no ganancia neta. Los cambios superiores al 20% se presentan para aprobacion administrativa; al aprobar se revalidan datos y precio anterior en transaccion.

Mercado Libre puede restringir lecturas: el motor conserva fecha/precio historicos, registra el error y permite cargar una referencia exacta revisada desde el panel. Sin evidencia vigente se conserva el precio y se registra el motivo. Nunca fabricar referencias a partir del precio MYA ni elegir una publicacion cara para inflar margen. No se garantiza el minimo absoluto del mercado.

El seguimiento actualiza `supplier_available` solo con evidencia explicita fresca: una alternativa disponible basta; para marcar agotado, todas las ofertas conocidas deben confirmar agotamiento. Nunca escribe `stock`, pedidos, pagos o activacion de productos. Las simulaciones, candidatos y compras administrativas tampoco envian encargos ni ingresan inventario.

## Persistencia y permisos

Migraciones aditivas `20261020120000_supplier_intelligence.sql`, `20261020170000_supplier_automation.sql`, `20261020180000_supplier_automation_guards.sql`, `20261020190000_supplier_worker_coordination.sql`, `20261020200000_supplier_manual_references.sql`, `20261020210000_supplier_crosslinks.sql` y `20261020220000_supplier_link_stock_evidence.sql`. Ya aplicadas en MYA; no ejecutar reset.

Ofertas e identidades en `supplier_offers`; observaciones inmutables en `supplier_observations`; propuestas de abastecimiento en `supplier_proposals`; simulaciones y registros administrativos en `import_simulations` e `import_purchases`; configuracion e historial privados, cola con leases, salud de fuentes, busquedas, referencias y decisiones de precio. Las ofertas verificadas y vinculadas con adaptador se agregan a la cola automaticamente. Los costos historicos de `product_costs` se conservan.

RLS y acciones `getAdminClient` requieren administrador. Workers usan exclusivamente el service role privado de MYA. Los clientes y visitantes no pueden leer costos ni enlaces mayoristas. La cron requiere `CRON_SECRET`. El catalogo publico mantiene su seleccion explicita de columnas.

## Validacion y entrega

`npm test`, `npm run type-check`, `npm run lint`, `npm run build`, `node scripts/check-public-evidence.mjs`, `node scripts/verify-supplier-workspace.mjs`. La UI se verifica a 320,390,1440 px con datos aislados: no acredita por si sola guardados reales. Las pruebas PostgreSQL verifican RLS, rollback, inventario, tarifas y revalidacion transaccional. Ver [IMPLEMENTATION-2026-10-20.md](IMPLEMENTATION-2026-10-20.md) para evidencia de entrega.

Revision adicional diaria en Codex a las09:30 (Argentina): `mya-revisar-abastecimiento-y-comparables`. Busca comparables por lotes y comprueba salud del procesador, sin renovar precios desde resultados indexados. Referencias humanas se conservan hasta48horas sin ser invalidadas por un fallo del robot; pueden ser de Mercado Libre o de otra tienda argentina verificada.
