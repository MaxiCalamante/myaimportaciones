# Continuación de pricing — 12/11/2026

Se concilió el trabajo pendiente con `f7e2bbc`, conservando el checkout estricto del 10/11, la política comercial y las exclusiones mayoristas. Los porcentajes efectivos siguen siendo los de la configuración persistida; las recomendaciones de alto ticket no se convierten en una regla automática nueva.

Cambios: comisiones sólo de medios habilitados; compra USDT y cotización comercial desde evidencia compartida; vigencia de conversión separada de la identidad USD/USD; parsers de moneda y formatos; identidad fuente frente a SKU; consulta nativa USA únicamente desde una URL previamente documentada. Las consultas públicas distinguen precios de referencia de importes verificados por el validador real del checkout, por identidad, variante y canal. SEO no emite ofertas no verificadas.

Tres escritores antiguos quedan bloqueados antes de leer credenciales. Sus fuentes completas se conservan en `scripts/retired/`. El inventario exploratorio pagina todas sus tablas, verifica conteos y no afirma disponibilidad ni rentabilidad por heurísticas.

La auditoría SQL guarda instantáneas privadas recuperables de cada identidad, simulación y aplicación separadas, bloqueo de concurrencia y reconciliación del conjunto completo. No modifica pedidos ni inventario físico. Las escrituras sólo aplican propuestas elegibles bajo la política habilitada; datos incompletos, cambios concurrentes y diferencias de identidad quedan pendientes. Se conservan precios manuales y ausencias mayoristas manuales.

Verificación previa: 504 pruebas aprobadas, TypeScript aprobado, build de producción aprobado; lint con cero errores y 136 advertencias preexistentes. Las cinco migraciones nuevas tienen pruebas PostgreSQL aisladas y se aplicaron en Supabase. La primera simulación real (`35750359-488b-480f-85d2-b6d52585fb18`) incluyó 1331 productos y 204 variantes: 803 productos archivados y 528 pendientes, con 59 propuestas elegibles. **Es una simulación, no acredita correcciones aplicadas ni despliegue.**

El informe final y CSV contienen costos y evidencia privada, por lo que no se versionan en este repositorio público. Se exportan con `scripts/export-pricing-audit.py` desde la instantánea completa de `store_catalog_audit_items`; el exportador rechaza cobertura incompleta o identidades duplicadas. Los registros pendientes no cuentan como corregidos.
