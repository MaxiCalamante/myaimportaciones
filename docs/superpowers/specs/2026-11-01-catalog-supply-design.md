# Abastecimiento y catálogo MYA

Solicitud vinculante: expansión controlada sobre el repositorio existente; sin despliegue, compras ni publicaciones masivas. Se continúa autónomamente según autorización expresa del usuario.

## Auditoría
Next.js 16.4, React 19, TypeScript, Tailwind 4, Supabase/Postgres. Se reutilizan `supplier_offers`, `supplier_observations`, matching exacto, `import_cost_policies`, `product_costs`, cron Edge y conciliación de pagos. Lectura remota 2026-11-01: 517 productos (373 activos), 2611 ofertas (2235 sin vincular); no confundir ofertas con identidades elegibles. Git coincide con producción c2b2b0f. Las importaciones actuales no son transaccionales, publican por defecto y tienen validación insuficiente. Sincronización puede activar borradores. Checkout usa booleano persistido sin vigencia. SEO ya tiene canonical, sitemap y alias que se conservan.

## Decisiones
Extender Postgres y acciones existentes, sin servicios nuevos. Importar siempre como borrador; revisión documental y comercial separada de importación. Vista previa persistida con snapshots y clave idempotente; procesar hasta 20 filas por transacción, con errores por fila y recuperación por reintento. El servidor calcula candidatos y precios, nunca confía en precios del navegador. Coincidencia exacta reutilizada; ambigüedad exige revisión. Tarifas y reglas comerciales versionadas. Desconocido no equivale a cero ni a agotado.

Se consideró ejecutar un bucle de importaciones REST: descartado por escrituras parciales y carreras. Se consideró servicio de colas externo: innecesario; PostgreSQL y el cron existente alcanzan. Se elige procesamiento transaccional acotado y reanudable.

## Límites
No regenerar rutas ni slugs existentes. No migrar producción. No alterar secretos. Sin scraping de catálogos bloqueados ni nuevas tareas en PC del usuario. Costos y evidencia siempre privados. No autorizar automáticamente cosméticos, perfumes, equipos o herramientas. La puesta en marcha exige migraciones, parámetros comerciales y revisión humana.
