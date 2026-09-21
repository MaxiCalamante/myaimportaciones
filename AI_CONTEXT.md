# MYA Importaciones — contexto vigente

Actualizado el 20/09/2026. Fuente mantenida: este archivo, dentro de Tienda WEB. El contexto anterior queda en docs/AI_CONTEXT-HISTORICO.md y no define políticas vigentes.

## Decisiones del dueño

Sólo minorista por ahora. Ocultar mayorista de la web pública y conservar estructura para reactivarlo más adelante. Se autorizó implementar las correcciones de la auditoría local. No se publicó una versión ni se ejecutó una migración remota en esta intervención.

Ejemplo real informado: una crema comprada por $21.000, transporte $10.000, vendida $54.900. Se desconoce SKU/fecha y resto de gastos. Objetivo de reventa: 5–10% debajo de Mercado Libre, subordinado a costo completo y referencia equivalente verificada. No deducir costos desde PVP; no extender el flete de este ejemplo a todo el catálogo.

## Implementado localmente

- Next.js 16.3.5, React 19, Tailwind 4, Supabase. Sitio con tienda, cuenta y administración.
- Bandera WHOLESALE_ENABLED=false en src/lib/commerce-policy.ts. Ruta mayorista redirige a /catalogo. Servidor acepta sólo minorista; precios/estructuras B2B permanecen para futura revisión.
- /catalogo: consulta paginada, búsqueda, categoría y orden. Layout sin descarga masiva de productos. Categorías históricas redirigen al catálogo.
- Checkout con importes calculados en servidor, promociones no acumulables y piso según costos, reserva transaccional, clave idempotente y stock verificado. Credenciales y banderas de activación obligatorias. Sin pago demo exitoso.
- Mercado Pago: firma y consulta al proveedor, control de cuenta/importe/moneda/modo, conciliación idempotente; cobros tardíos a revisión. Las URLs de regreso no acreditan pagos.
- Seguimiento por código y email; no basta un código público. Límites de intentos persistidos y hash de IP.
- Costos reales y simulador en /admin/costos. Stock, ficha, solicitudes de arrepentimiento y cobros a revisar en /admin/operaciones. CSV histórico de 75 cosméticos con datos faltantes explícitos.
- Condiciones, privacidad, botón de arrepentimiento destacado y constancia persistida. Consentimiento publicitario y Purchase sólo desde estado pagado verificado, deduplicado por navegador. Métricas del panel limitadas a últimos 50 pedidos.
- Fuera de la portada: kits con sustituciones, asesor con selecciones automáticas, testimonios inventados y referencias ML calculadas desde PVP. Sin estrellas falsas en datos estructurados. Plantillas comerciales no respaldadas se ocultan al presentar productos.

## No confundir código con operación real

No hay stock físico confirmado por el usuario. No se marcaron los valores históricos como verificados. No se confirmaron CUIT, razón social, domicilio comercial, habilitaciones/trazabilidad, garantías, costos completos ni tarifas de transporte. Los campos quedan pendientes; no inventarlos.

La migración supabase/migrations/20260921134833_retail_integrity.sql está preparada y probada con PostgreSQL aislado. NO está aplicada en producción. Los cambios de aplicación y permisos deben coordinarse. Falta configurar clave de servicio, pagos, cron y datos reales antes de activar checkout. Mercado Pago no se probó con un cobro real. El proveedor logístico no tiene API integrada; envío requiere confirmación.

Las herramientas B2B antiguas y kits conservados NO están listos para reactivar sin revisión. Analytics depende de IDs configurados y consentimiento; configuración de marketing guardada en navegador es local. Las variables NEXT_PUBLIC_* establecen configuración compartida de despliegue. La medición de Purchase desde seguimiento no cuenta clientes que no vuelven; no sustituye contabilidad.

## Lecturas y validación

- docs/OPERACION-MINORISTA.md: costos, comparables, abastecimiento, experimento y límites.
- docs/ACTIVACION-Y-VALIDACION.md: migración, configuración, cron, verificaciones pendientes.
- docs/costos-proveedores-pendientes.csv: base para completar sin inventar datos.
- npm run type-check; npm run lint; npm run test; npm run build; npm audit.
- Los tests no deben crear compras en producción ni modificar stock real.
- Conservar cambios del dueño. No volver a agregar claims de 24 h, ahorro fijo frente a ML, garantías oficiales, factura A/B o stock del proveedor como propio sin respaldo.


## Continuación de pendientes (21/09/2026)

Nuevo `/admin/estado` con presencia de configuración y contadores operativos, sin claves expuestas. Reclamos permiten leer motivo y actualizar estado. Exportación/sitemap/catálogo administrativo leen todas las páginas con orden estable; la importación masiva omite stock para preservar reservas. El administrador depende del rol persistido, sin ascenso por email. El servidor exige las tres credenciales de Mercado Pago para generar el pago.

Segunda migración preparada: `20260921134855_reservation_schedule.sql`, agenda vencimientos cada cinco minutos en pg_cron. Todavía no aplicada: requiere Supabase y despliegue coordinado; no se valida la extensión en PGlite.

Acceso remoto revisado: Supabase responde, estructura antigua, un administrador y dos pedidos pendientes. Vercel CLI requiere reautenticación; herramientas del conector fallan. No se alteró producción ni se activó checkout. Referencia de pendientes y comprobaciones en docs/ACTIVACION-Y-VALIDACION.md.


## Estado vigente: migraciones aplicadas el 21/09/2026

Por instrucción expresa del dueño se aplicaron en producción `20260921134833_retail_integrity.sql` y `20260921134855_reservation_schedule.sql`. Este estado reemplaza las notas anteriores que las indicaban pendientes. Los nombres locales coinciden con las versiones registradas en Supabase.

Verificación: tablas nuevas presentes, creación de pedidos restringida al servicio, inserts directos de clientes revocados, cron activo cada cinco minutos. Se conservaron 2 pedidos, 2.892 productos y la suma de stock de 107.654 (dato histórico, no conteo físico). Ningún producto se marcó verificado. Ejecución manual de vencimientos: 0 reservas liberadas, sin errores.

El dueño realizará commit y push para publicar en Vercel. No se hizo commit, push ni despliegue desde esta tarea. La versión anterior del checkout puede resultar incompatible con los nuevos permisos hasta ese despliegue. La migración no configura credenciales de Vercel, no habilita compras y no reemplaza costos/stock/datos fiscales reales.
