# Cierre de producción — 07/11/2026

El estado vigente del catálogo, Supabase y la verificación del release está en [RELEASE-FINAL-2026-11-07.md](docs/RELEASE-FINAL-2026-11-07.md). Las notas del 06/11 describen el estado previo al cierre.

## Rentabilidad y corrección posterior a auditoría — 06/11/2026

Trabajo nuevo preparado **sólo en local/pruebas**: margen de contribución 30% minorista, 18% mayorista y piso 10%, con motor decimal central, costos y comisiones documentados. Esta regla sustituye conservar el margen histórico para el recorrido nuevo. La política se instala en `preview`; no activar bloqueos, convertir precios, migrar producción, desplegar ni hacer commit/push sin aprobación expresa.

Informe y fórmulas: [USD-PROFITABILITY.md](docs/USD-PROFITABILITY.md). Correcciones, evidencia y release pendiente: [POST-AUDIT-2026-11-06.md](docs/POST-AUDIT-2026-11-06.md). Los cuatro recorridos HTTP completos guardaron candidatos sólo en PostgreSQL local; no acreditan persistencia nueva en producción ni publicación. Las tarifas del pasador requieren confirmación por operación; la compra mayorista del cliente no habilita la reducción por volumen.

## Proveedores y rastreador vigente — 06/11/2026

Decisión expresa del dueño: sólo Atacado Connect (`atacadoconnect.com`), Atacado USA (`atacadousa.com.py`), Star Company (`starcompany-py.com`) y Total Herramientas Oficial (`totalherramientasoficial.com.py`). Las referencias posteriores a nueve proveedores son históricas. La tabla privada `suppliers` conserva cinco archivados por auditoría; no reactivarlos ni consultarlos automáticamente. Star Company fue comprobado por dominio e identidad; no se interpretó como Star Compass.

Se aplicó la baja lógica auditada de 43 productos exclusivamente dependientes de descartados y 30 variantes (25 exclusivas más 5 de padres archivados); 10 de esos productos estaban activos. No se tocaron órdenes, ítems ni movimientos de stock. Los candidatos del rastreador no son productos publicados. Panel nuevo `/admin/proveedores/rastreador`; comparador y abastecimiento existentes `/admin/proveedores/inteligencia`. Descubrimiento y monitor usan colas separadas, leases y cron Supabase `mya-supplier-catalog` cada minuto. Importación automática de borradores desactivada por defecto; nunca publicación automática. No instalar tareas de Windows ni servicios locales.

Estado, evidencia real, migraciones, límites y mantenimiento: [FOUR-SUPPLIER-TRACKER-2026-11-06.md](docs/suppliers/FOUR-SUPPLIER-TRACKER-2026-11-06.md). La prueba de Cosméticos USA recorrió 13 páginas y 151 identidades; dos repeticiones sin duplicados. Los otros adaptadores tienen muestras reales de categoría y monitor alojado de una ficha, sin afirmar cobertura completa de sus catálogos. Cotizaciones y gastos requieren evidencia propia y vigente; el precio de origen no es costo total. Se preservan precios manuales y se revierte un ajuste USD automático que infrinja el piso por canal.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Proveedores y costos de importación MYA

Antes de consultar proveedores, comparar costos, simular compras o modificar abastecimiento, leer `docs/suppliers/README.md` y la tabla privada `suppliers`. Allí están los cuatro proveedores vigentes, sus capacidades y autorizaciones; el resto se conserva archivado por historia. No depender del contexto de una conversación.

Reutilizar `getAdminClient`, `is_admin()`, `product_costs`, `products`, `product_variants` y las rutas administrativas existentes. Fuentes y costos son privados. Las ofertas multiproveedor viven en `supplier_offers`; evidencia e historial en `supplier_observations`. No mezclar disponibilidad del proveedor con stock físico MYA ni convertir una simulación en inventario.

El motor `src/lib/import-costs.ts` toma tarifas de `import_cost_policies`. La semilla del 16/10/2026 es histórica: 20% general; 15% sobre USD 1.000 con interpretación pendiente; USD 25/iPhone; TV por pulgadas exactas. No interpolar TV, aplicar porcentual adicional a tarifas fijas ni adoptar ARS 1.600 como cambio actual. Separar adquisición y pago al pasador. Confirmar base/volumen de pedidos mixtos.

Fuentes inaccesibles o sin autorización: CSV/manual y limitación explícita. No descubrir y usar claves internas de terceros. Cambios de identidad requieren revisión; comparar modelos/variantes exactos, sin deduplicar por títulos. Propuestas y candidatos son privados: no publicar, cambiar masivamente catálogo, comprar ni pagar automáticamente. Mantener política comercial de comparables exactos; margen y recargo son indicadores distintos, contribución no es ganancia neta.

Validar tarifas, reparto, variantes, errores y permisos con `tests/import-costs.test.ts`, `tests/supplier-intelligence.test.ts`, `tests/supplier-intelligence-database.test.ts` y la prueba local responsive documentada. Distinguir implementación local, migración aplicada, despliegue y evidencia real del proveedor.

## Seguimiento automatico vigente (20/10/2026)

Ampliación expresa del 05/11/2026: el dueño pidió sincronización PC/panel web/tienda y eligió **actualizar automáticamente conservando el margen actual**. Confirmó que USD 100 de productos + USD 20 del pasador se pagan como 120 USDT a la cotización de compra del día. El modo local `localMarginPrices`/`localMarginCarrier=goods_20pct_usdt` reemplaza para ese recorrido la prohibición anterior de ajustes de venta. Requiere base documental exacta, contribución positiva por canal, vigencia, límites y control transaccional de ediciones concurrentes. No habilitar el motor antiguo de comparables ni publicar candidatos explorados como si ya fueran altas aprobadas. El stock físico sigue separado. Ver la ampliación en `docs/suppliers/LOCAL-MANUAL-2026-11-05.md`.

Actualización expresa del 05/11/2026: el dueño autorizó una herramienta **manual** en su PC, con avance por producto, y eligió conservar respaldo en la nube. Usar `scripts/local-suppliers/` y el acceso `../Iniciar proveedores MYA.cmd`; operación en `docs/suppliers/LOCAL-MANUAL-2026-11-05.md`. Esta autorización habilita el proceso mientras lo abre el dueño; mantiene prohibidos servicios, tareas periódicas, arranque automático y la reinstalación de los instaladores históricos. El inventario físico no forma parte de este recorrido; la ampliación posterior incorpora ajustes de venta comprobables.

El cruce multiproveedor por producto/variante vive en `supplier-crosslinks.ts`, `supplier-matching.ts`, `supplier_discovery_jobs` y `supplier_link_decisions`. Leer la seccion de vinculos en `docs/suppliers/README.md`. La primera pestana administrativa compara proveedores de la misma variante. Mantener privados los costos, fuentes y auditoria. Preservar la identidad fuente al refrescar y no considerar un boton de compra como prueba de stock. Validar con `tests/supplier-matching.test.ts` y `tests/supplier-crosslinks-database.test.ts`.

El usuario autorizo continuar el sistema automatico alojado en Vercel/Supabase. El 21/10/2026 prohibio tareas periodicas, procesos en segundo plano y ventanas de consola en su PC: se elimino la tarea de Windows y la automatizacion local de Codex. No reinstalarlas ni usar esta PC como servidor. Leer la operacion actual en docs/suppliers/README.md. La configuracion persistente confirma ARS1600/USD el 20/10 y transporte a Tandil pagado por tercero. Disponibilidad y precios se actualizan solamente con evidencia y limites configurados; propuestas grandes requieren revision. Madrid restringido: CSV/manual. Preservar la excepcion de precio de electronica USA; un 404 conserva disponibilidad. No publicar candidatos automaticamente ni convertir disponibilidad en inventario.

Al finalizar cada trabajo o tarea, además del reporte/descripción de lo realizado, incluir siempre entre 1 y 3 sugerencias concretas de próximos pasos o mejoras prioritarias con las que seguir.
