<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Proveedores y costos de importación MYA

Antes de consultar proveedores, comparar costos, simular compras o modificar abastecimiento, leer `docs/suppliers/README.md` y la tabla privada `suppliers`. Allí están los nueve proveedores oficiales, sus capacidades y autorizaciones. No depender del contexto de una conversación.

Reutilizar `getAdminClient`, `is_admin()`, `product_costs`, `products`, `product_variants` y las rutas administrativas existentes. Fuentes y costos son privados. Las ofertas multiproveedor viven en `supplier_offers`; evidencia e historial en `supplier_observations`. No mezclar disponibilidad del proveedor con stock físico MYA ni convertir una simulación en inventario.

El motor `src/lib/import-costs.ts` toma tarifas de `import_cost_policies`. La semilla del 16/10/2026 es histórica: 20% general; 15% sobre USD 1.000 con interpretación pendiente; USD 25/iPhone; TV por pulgadas exactas. No interpolar TV, aplicar porcentual adicional a tarifas fijas ni adoptar ARS 1.600 como cambio actual. Separar adquisición y pago al pasador. Confirmar base/volumen de pedidos mixtos.

Fuentes inaccesibles o sin autorización: CSV/manual y limitación explícita. No descubrir y usar claves internas de terceros. Cambios de identidad requieren revisión; comparar modelos/variantes exactos, sin deduplicar por títulos. Propuestas y candidatos son privados: no publicar, cambiar masivamente catálogo, comprar ni pagar automáticamente. Mantener política comercial de comparables exactos; margen y recargo son indicadores distintos, contribución no es ganancia neta.

Validar tarifas, reparto, variantes, errores y permisos con `tests/import-costs.test.ts`, `tests/supplier-intelligence.test.ts`, `tests/supplier-intelligence-database.test.ts` y la prueba local responsive documentada. Distinguir implementación local, migración aplicada, despliegue y evidencia real del proveedor.

## Seguimiento automatico vigente (20/10/2026)

El cruce multiproveedor por producto/variante vive en `supplier-crosslinks.ts`, `supplier-matching.ts`, `supplier_discovery_jobs` y `supplier_link_decisions`. Leer la seccion de vinculos en `docs/suppliers/README.md`. La primera pestana administrativa compara proveedores de la misma variante. Mantener privados los costos, fuentes y auditoria. Preservar la identidad fuente al refrescar y no considerar un boton de compra como prueba de stock. Validar con `tests/supplier-matching.test.ts` y `tests/supplier-crosslinks-database.test.ts`.

El usuario autorizo continuar el sistema automatico alojado en Vercel/Supabase. El 21/10/2026 prohibio tareas periodicas, procesos en segundo plano y ventanas de consola en su PC: se elimino la tarea de Windows y la automatizacion local de Codex. No reinstalarlas ni usar esta PC como servidor. Leer la operacion actual en docs/suppliers/README.md. La configuracion persistente confirma ARS1600/USD el 20/10 y transporte a Tandil pagado por tercero. Disponibilidad y precios se actualizan solamente con evidencia y limites configurados; propuestas grandes requieren revision. Madrid restringido: CSV/manual. Preservar la excepcion de precio de electronica USA; un 404 conserva disponibilidad. No publicar candidatos automaticamente ni convertir disponibilidad en inventario.

Al finalizar cada trabajo o tarea, además del reporte/descripción de lo realizado, incluir siempre entre 1 y 3 sugerencias concretas de próximos pasos o mejoras prioritarias con las que seguir.
