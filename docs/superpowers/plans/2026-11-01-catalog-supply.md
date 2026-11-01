# MYA catálogo y abastecimiento — Implementation Plan

> **For agentic workers:** Usar implementación autónoma y revisión independiente. El usuario ya indicó ejecución sin nuevas aprobaciones de diseño.

**Goal:** importar y revisar catálogos de proveedores en lotes recuperables sin publicar ni cobrar con evidencia insuficiente.
**Architecture:** Postgres transaccional sobre ofertas existentes; Next Server Actions autenticadas; UI administrativa con selección, preview, progreso y revisión.
**Tech Stack:** Next.js 16, React 19, Supabase, PGlite, node:test.
**Spec:** docs/superpowers/specs/2026-11-01-catalog-supply-design.md

## Global Constraints
Sin despliegue ni escrituras en producción. Mantener Mercado Pago, transferencia, slugs y stock propio. Español argentino. Sin nuevos servicios pagos.

## Review Focus
- Reintento luego de una respuesta perdida no duplica productos.
- Dos ofertas de variantes distintas nunca se fusionan por similitud.
- Cambios después del preview exigen revisión.
- Sincronización no publica borradores.
- Cobros bajo pedido requieren evidencia vigente y costos completos.

## Tareas
- [ ] 1. Persistencia de importaciones: migración aditiva, trabajos/items, snapshots, RPC transaccionales acotadas, aprobación/pausa, controles documentales y RLS. Pruebas PGlite de rollback, repetición, permisos y publicación.
- [ ] 2. Motor comercial: reglas versionadas configurables, comisiones porcentuales y fijas, margen/recargo, reutilizar import-costs y reparto; tests monetarios y de datos incompletos.
- [ ] 3. Orquestación servidor: `supplier-catalog-import.ts`, acciones admin, filtros, matching exacto, preview y cron recuperable. Pruebas de selección/variantes/revalidación. Sin scraping durante importación.
- [ ] 4. Interfaz: panel integrado al radar, filtros/selección masiva, preview y confirmación, trabajos persistentes, pausa/reanudar/cancelar/reintentar, reglas y revisión documental.
- [ ] 5. Checkout y pedidos: vigencia y ofertas viables, revalidación transaccional, costos congelados, seguimiento logístico separado de pago y auditoría. Tests de pagos existentes y nuevos controles.
- [ ] 6. Verificación e informe: npm test, type-check, lint, build, responsive local, revisión independiente, rollback y activación documentados; commits locales, sin push.

Cada tarea comienza con pruebas que fallen por la capacidad ausente, implementa el cambio y vuelve a ejecutar pruebas. Las migraciones se verifican en PostgreSQL embebido; quedan pendientes de aplicar en producción.

## Registro de ejecución
Tareas1–3 implementadas y probadas. Tarea4: panel y revisión individual listos; aprobación por lote y paginación avanzada pendientes. Tarea5: guardias de cobro y seguimiento operativo listos, sin ensayo remoto de pagos. Tarea6:303 tests, type-check, lint y build con configuración ficticia pública; QA responsive aislada. Informe completo y límites en docs/catalog-supply/IMPLEMENTACION-2026-11-01.md. No se marca completada toda la especificación original.
