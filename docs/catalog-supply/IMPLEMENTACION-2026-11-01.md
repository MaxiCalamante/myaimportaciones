# MYA: expansión controlada de abastecimiento

## Estado de entrega
Implementación local en `feat/scalable-supplier-catalog`. No se hizo push, despliegue, migración remota, publicación, compra ni modificación de credenciales. Lecturas remotas: 517 productos, 373 activos; 2611 ofertas, 2235 sin vincular. Las ofertas no son identidades únicas ni publicaciones aprobadas.

## Diagnóstico
Se conserva Next16/React19/TypeScript/Tailwind/Supabase. Ya existían nueve proveedores, observaciones privadas, matching, ofertas múltiples, colas con recuperación, tarifas versionadas, USDT, estados de pedidos y conciliación de Mercado Pago. El pago se verifica por firma y consulta al proveedor, no por retorno del navegador. Se mantienen ese webhook, transferencias, categorías, URLs, canonical, sitemap y alias existentes.

Importar previamente hacía varias escrituras REST y podía publicar inmediatamente. El matching descartaba 4G/5G y admitía diferencias unilaterales de medidas. El seguimiento interpretaba el resultado de una RPC como stock y podía activar borradores. El checkout sólo confiaba en supplier_available y costos incompletos permitían cobrar.

## Cambios funcionales
- `/admin/oportunidades/importacion`: ofertas paginadas, filtros de texto, proveedor, marca, costo y disponibilidad informada; selección individual o de todos los resultados hasta un límite explícito (150 inicial, hasta5000). Categoría de destino elegida desde categorías reales, sin modificar código.
- Previews persistentes con snapshots, clasificación new/link/review/skip y confirmación separada. Los nuevos artículos son borradores, stock propio0, disponibilidad sin certificar, sin fotos copiadas ni descripciones fabricadas. Precio0 significa borrador sin precio calculable; nunca precio de venta público.
- Trabajo durable: RPC hasta20 filas/transacción, savepoint por fila, idempotencia, serialización de identidades entre trabajos, reintento sólo de errores, pausa/reanudación/cancelación. No hace scraping durante la importación. Si cambian fuente o reglas, exige nueva revisión. Los títulos/slugs existentes no se reescriben.
- Procesamiento manual por lote desde el panel; continuidad independiente del navegador mediante el ciclo `sync` Edge existente. Vercel diario conserva respaldo. Requiere actualizar Edge con el código de esta rama para el ciclo frecuente; no se agregó un servicio ni una tarea en la PC.
- Reglas comerciales append-only sin semilla de valores: objetivo, mínimo, mayorista, comisión sobre venta, gasto por unidad, redondeo ascendente y excepciones por categoría. Reutiliza import-costs para tarifas y reparto, separa margen de recargo. El umbral por operación nunca se aplica automáticamente a un artículo del catálogo. El transporte compartido sin distribuir bloquea precio publicable.
- Revisión persistente separada: identidad, costos, derechos de fotos, cumplimiento documental y referencia de evidencia. Publicación individual explícita con trigger SQL que exige contenido, imagen, costos completos, margen y oferta vigente. Publicación automática se fuerza desactivada en cada lote. No hay habilitación de publicación desatendida en esta entrega.
- Ruta de importación individual reutiliza el mismo trabajo transaccional y ya no publica. Su precio se calcula desde configuración del servidor; ajustes particulares se hacen luego en editor/costos.
- Matching conserva red móvil, medidas simétricas, concentración, marca y GTIN contradictorio. Ambigüedades permanecen privadas. El seguimiento sólo pausa agotamientos explícitos, nunca activa.
- Lectura pública deja de presentar disponibilidad de proveedor con timestamp faltante, futuro o mayor24h. No cambia inventario ni evidencia administrativa. Variantes heredan conservadoramente la vigencia del padre; falta una proyección pública por oferta/variante con TTL específico.
- Checkout consulta evidencia vigente, oferta exacta, proveedor activo y costos completos vinculados a esa fuente. SQL vuelve a verificar al reservar y congela costos/evidencia privados; mantiene idempotencia, precios aceptados y pagos actuales. Transferencia sigue pendiente hasta conciliación. Pagos en revisión no avanzan a preparación/despacho.
- Ventas: seguimiento independiente por renglón con proveedor, costo estimado/real, responsable/referencia, tránsito, recepción, despacho, entrega, incidencia, cancelación y auditoría con control de versión. No automatiza compras ni reembolsos.

## Archivos principales
`catalog-import-plan.ts`: clasificación pura conservadora.
`supplier-catalog-import.ts`: consultas, cotización, snapshots y orquestación.
`catalog-import-worker.ts`: lotes desde cron, compatible Edge.
`catalog-pricing.ts`: cálculo financiero exacto y validación.
`import-actions.ts`, `supplier-catalog-manager.tsx`: panel autenticado.
`supply-actions.ts`, `supply-operations.tsx`: gestión logística en ventas.
`catalog-data.ts`, `supplier-matching.ts`, `supplier-automation.ts`, `checkout/actions.ts`: integración existente.

## Migraciones pendientes
Aplicar en staging primero, en orden:
1. `20261101025502_supplier_catalog_import.sql`: jobs/items/reviews/events, RPC, RLS y guardia de activación.
2. `20261101025508_supplier_checkout_operations.sql`: guardias transaccionales, snapshots privados, operaciones e historial, permiso de lectura del timestamp público.
3. `20261101025557_catalog_pricing_rules.sql`: reglas comerciales privadas append-only.

Las funciones PL/pgSQL del primer archivo consultan reglas comerciales durante ejecución, por lo que las tres migraciones deben estar instaladas antes de usar el panel. No aplicar contra una base sin las migraciones previas del repositorio. No activar cobros con una migración incompleta.

## Configuración y activación
1. Respaldar y aplicar las tres migraciones en staging. Verificar roles admin y denegación a cliente/anon. Configurar credenciales por canales seguros existentes, sin versionarlas.
2. Ratificar import_cost_policies, vigencia del cambio de adquisición y del pasador, inclusiones por proveedor, gastos/impuestos y costos compartidos mediante simulación existente. Los antecedentes20%/15%/1600 no son tarifas actuales.
3. Guardar reglas comerciales explícitas en el nuevo panel; no hay tasas predeterminadas. La confirmación de gastos debe representar documentación real.
4. Elegir categoría y filtros; generar preview de100–150, revisar vínculos y confirmar sólo borradores. Procesar manualmente20 y verificar resultados. Pausar/reintentar si es necesario.
5. Completar fotos autorizadas y descripción real desde `/admin?editProduct=ID`; verificar costos en `/admin/costos` y la identidad de ofertas en `/admin/proveedores/inteligencia`. El lote no marca automáticamente las ofertas como verificadas.
6. Revisar evidencia documental/comercial y publicar cada producto aprobado. Aumentar el límite progresivamente sólo después de comprobar calidad. Confirmar checkout con producto propio y bajo pedido, transferencia y sandbox de Mercado Pago antes de habilitar cambios de cobro.
7. Tras autorización de despliegue, actualizar web y función Edge como conjunto compatible. El paquete Edge local se genera con `node scripts/package-supplier-cloud.mjs`; no se desplegó.

## Pausa y rollback operativo
Cancelar/pausar trabajos desde el panel; los borradores y éxitos se conservan. Pausar productos gestionados desde revisión; la sincronización no los reactiva. No borrar tablas ni historial para retroceder. Conservar las migraciones aditivas y restaurar el código anterior sólo después de evaluar que volvería a habilitar las rutas de publicación anteriores; no quitar las guardias financieras sin revisión. Cambios de pedidos pagados requieren conciliación humana. Los productos previos no se migran ni se despublican masivamente.

## Límites pendientes explícitos
No constituye implementación completa de todas las cinco fases solicitadas. Faltan aprobación/publicación transaccional por lote (se mantiene individual), ranking nuevo ponderado por confiabilidad/ventas, filtros combinados de rentabilidad calculada en SQL, edición documental avanzada con archivos, paginación de revisiones más allá de200 y descarga de todas las incidencias (detalle muestra primeras100). El ranking histórico de oportunidades se conserva y sus benchmarks no sustituyen las reglas nuevas.
No se incorporó scraping de catálogos dinámicos a Edge ni evasión de proveedores bloqueados; usar CSV/manual autorizado. No se afirma demanda, cumplimiento sanitario/aduanero ni permisos fotográficos por superar filtros.
No hubo sesión administrativa real ni compra/pago de prueba remoto: validación local PostgreSQL y componentes; validar staging y responsive autenticado antes de producción. Sincronización pública tiene TTL conservador24h; checkout aplica TTL real de cada proveedor. Revisión independiente final pendiente tras interrupción de los agentes; se efectuó revisión propia de integración.

## Evidencia de verificación
- Suite completa `npm test`: **303 pruebas aprobadas, 0 fallidas** (180,2 s). Incluye PGlite real: permisos/RLS, rollback por fila, reintentos, fuente/reglas cambiadas, identidades múltiples y variantes, publicación documental, pagos duplicados/reembolsos/transferencia y operaciones.
- `npm run type-check`: sin errores.
- `npm run lint`: sin errores,150 advertencias de código existente; los nuevos módulos y el radar modificado pasan ESLint focalizado sin advertencias.
- Build sin configuración falla por variables públicas Supabase faltantes en páginas existentes. Build con `NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co` y clave pública ficticia exclusiva de compilación pasa; no valida conectividad ni credenciales reales.
- `node scripts/package-supplier-cloud.mjs`: paquete local16 archivos; no desplegado.
- `node --import tsx scripts/verify-catalog-import-responsive.ts`: Chromium local,320/390/1440px sin desborde horizontal de página. Fixture explícito sin persistencia ni login. Captura390px en `evidence/import-390.png`; prueba disposición visual, no pagos ni operaciones remotas.
- Se corrigió un fixture de checkout que omitía la columna histórica supplier_last_checked_at requerida por el nuevo permiso. Después de la corrección pasan las4 pruebas de checkout/operaciones y la suite completa.
- Revisión propia: corregida discrepancia entre payload de target y snapshots de vinculación; identidad conservadora incluye GTIN/modelo para no colisionar cuando el matcher rechaza coincidencias. Costos y evidencias permanecen privados.
