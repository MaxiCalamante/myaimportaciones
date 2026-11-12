# Continuación de pricing — 12/11/2026

Se concilió el trabajo pendiente con `f7e2bbc`, conservando el checkout estricto del 10/11, la política comercial y las exclusiones mayoristas. Los porcentajes efectivos siguen siendo los de la configuración persistida; las recomendaciones de alto ticket no se convierten en una regla automática nueva.

Cambios: comisiones sólo de medios habilitados; compra USDT y cotización comercial desde evidencia compartida; vigencia de conversión separada de la identidad USD/USD; parsers de moneda y formatos; identidad fuente frente a SKU; consulta nativa USA únicamente desde una URL previamente documentada. Las consultas públicas distinguen precios de referencia de importes verificados por el validador real del checkout, por identidad, variante y canal. SEO no emite ofertas no verificadas.

Tres escritores antiguos quedan bloqueados antes de leer credenciales. Sus fuentes completas se conservan en `scripts/retired/`. El inventario exploratorio pagina todas sus tablas, verifica conteos y no afirma disponibilidad ni rentabilidad por heurísticas.

La auditoría SQL guarda instantáneas privadas recuperables de cada identidad, simulación y aplicación separadas, bloqueo de concurrencia y reconciliación del conjunto completo. No modifica pedidos ni inventario físico. Las escrituras sólo aplican propuestas elegibles bajo la política habilitada; datos incompletos, cambios concurrentes y diferencias de identidad quedan pendientes. Se conservan precios manuales y ausencias mayoristas manuales.

Verificación previa: 504 pruebas aprobadas, TypeScript aprobado, build de producción aprobado; lint con cero errores y 136 advertencias preexistentes. Las cinco migraciones nuevas tienen pruebas PostgreSQL aisladas y se aplicaron en Supabase. La primera simulación real (`35750359-488b-480f-85d2-b6d52585fb18`) incluyó 1331 productos y 204 variantes: 803 productos archivados y 528 pendientes, con 59 propuestas elegibles. **Es una simulación, no acredita correcciones aplicadas ni despliegue.**

El informe final y CSV contienen costos y evidencia privada, por lo que no se versionan en este repositorio público. Se exportan con `scripts/export-pricing-audit.py` desde la instantánea completa de `store_catalog_audit_items`; el exportador rechaza cobertura incompleta o identidades duplicadas. Los registros pendientes no cuentan como corregidos.

## Resultado productivo y cierre

El motor y la lectura pública se desplegaron en el commit `3cfeca2` (Vercel `dpl_B5ELDDCtupQ9p97z8Lv87yCxym8t`, READY); `supplier-tracking` quedó en versión 13. Se activó la cotización comercial USDT desde la evidencia existente, sin cambiar ninguno de los 517 precios USD por el cambio de cotización. La sincronización alojada volvió a verificar fuentes y conservó las exclusiones mayoristas manuales.

La ejecución final `d285988f-27b0-4719-8bf4-64e216b18f98` abarcó 1331 productos y 204 variantes. Su resultado SQL fue 53 corregidos, 11 sin cambio, 464 pendientes y 803 ya archivados. Comparando la instantánea inicial con la final, los 64 productos finalmente validados cambiaron su precio: **64 corregidos, 0 sin cambio, 464 pendientes, 803 previamente archivados = 1331**. Las variantes: 3 pendientes y 201 ya archivadas = 204. No hubo nuevos archivos. El informe acumulado preserva el estado SQL individual y la referencia inicial para no sumar ejecuciones ni contar pendientes como corregidos.

Los pendientes principales son 361 perfiles exactos de costo ausentes, 102 rechazos de identidad dentro del control del catálogo autorizado y un cambio que excede el límite comercial. Esos rechazos no demuestran por sí solos un proveedor no autorizado. No se inventaron costos ni se eludieron controles para aumentar la cantidad de correcciones.

Se verificaron las fuentes de ambas PS5 y diez recálculos por identidad sin incrementos acumulativos. Los hashes de pedidos, ítems, perfiles e historial de stock se conservaron, igual que la definición del checkout estricto. La navegación productiva confirmó mayorista abierto, precios USD/USDT y las rutas afectadas sin errores JavaScript. La edición autenticada del administrador no pudo probarse en navegador sin una sesión. Se detectó un desborde horizontal preexistente del menú de inicio en escritorio, ajeno a pricing, pendiente.

La revisión final añadió una proyección administrativa de los importes USD canónicos, con la misma cotización comercial central. Conserva inactivos, variantes exactas y exclusiones mayoristas, y advierte cuando sólo existe una referencia ARS histórica. No calcula márgenes ni realiza escrituras. El exportador añade diferencias numéricas, costos antes/después, ARS verificado y trazabilidad acumulada.

Verificación final: **507/507 pruebas aprobadas**, TypeScript aprobado, lint con cero errores y 136 advertencias preexistentes, build de producción aprobado; tres pruebas específicas de la proyección administrativa también ejecutadas por separado. El informe privado, CSV completo de productos y CSV de variantes se entregan como artefactos fuera del repositorio público. La corrección comercial del catálogo permanece incompleta mientras haya registros pendientes de evidencia.
