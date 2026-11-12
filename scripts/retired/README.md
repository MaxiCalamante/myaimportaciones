# Importadores retirados — 11/11/2026

Las fuentes completas anteriores se conservan sin modificaciones como archivos `.txt` para revisión y recuperación histórica. No son herramientas operativas y no se deben ejecutar ni volver a convertir en scripts.

- `load-curated-catalog-200.mts.txt`: reescribía moneda, disponibilidad, fechas y evidencia del rastreador antes de publicar.
- `sync-wholesale-complete.mts.txt`: usaba cambio fijo, infería costos a partir de precios de venta y escribía precios, costos y disponibilidad directamente.
- `import-curated-catalog-200.ts.txt`: importador reciente preservado íntegramente; publicaba con cambio fijo y costos/disponibilidad declarados como verificados sin una consulta vigente a la fuente.
- `simulate-catalog-audit.mts.txt`: simulador anterior preservado; sus lecturas podían quedar truncadas y su clasificación confundía errores con falta de stock.

Los tres importadores conservan sus rutas originales, pero terminan con `LEGACY_PRICING_DISABLED` antes de cargar variables de entorno o clientes. El bloqueo también se aplica con `--dry-run`.

El circuito operativo es el rastreador con evidencia vigente de la identidad exacta, un desglose de costos documentado, la revisión del motor decimal USD y la publicación revisada. Una oferta descubierta o un registro histórico no acredita su vigencia actual.

## Inventario de lectura

`node --import tsx scripts/simulate-catalog-audit.mts` imprime un inventario JSON privado. Pagina productos, variantes, precios USD, ofertas y proveedores, compara los conteos antes y después de cada lectura y rechaza errores o identidades duplicadas. Incluye identidades inactivas y archivadas. No escribe en Supabase ni llama RPC.

Todos los resultados quedan `pending`: los precios y estados comerciales mostrados son valores guardados, no conclusiones nuevas. No se certifica stock, agotamiento, rentabilidad, publicabilidad ni fuente autorizada. La lectura entre tablas no es transaccional y no debe usarse para decidir cambios masivos.

Para una auditoría comercial completa y recuperable, usar la simulación del motor SQL central `store_audit_catalog_v1`, revisar sus resultados y mantener separados simulación y aplicación. Este inventario no la ejecuta automáticamente. La información impresa es privada y no debe publicarse.
