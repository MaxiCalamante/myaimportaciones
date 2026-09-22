# MYA Importaciones — contexto vigente

Actualizado el 22/09/2026. La sección del 22/09 prevalece sobre estados históricos. Fuente mantenida: este archivo, dentro de Tienda WEB. El contexto anterior queda en docs/AI_CONTEXT-HISTORICO.md y no define políticas vigentes.

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

La migración supabase/migrations/20260921134833_retail_integrity.sql está aplicada en producción. El cron también está aplicado. Falta publicar la aplicación y configurar las credenciales y los datos reales antes de activar checkout. Mercado Pago no se probó con un cobro real. El proveedor logístico no tiene API integrada; envío requiere confirmación.

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

Segunda migración aplicada: `20260921134855_reservation_schedule.sql`, agenda vencimientos cada cinco minutos en pg_cron; la extensión se verificó en Supabase.

Acceso remoto revisado: Supabase responde, migraciones aplicadas, un administrador y dos pedidos conservados. Vercel CLI requiere reautenticación; herramientas del conector fallan. No se activó checkout. Referencia de pendientes y comprobaciones en docs/ACTIVACION-Y-VALIDACION.md.


## Estado vigente: migraciones aplicadas el 21/09/2026

Por instrucción expresa del dueño se aplicaron en producción `20260921134833_retail_integrity.sql` y `20260921134855_reservation_schedule.sql`. Este estado reemplaza las notas anteriores que las indicaban pendientes. Los nombres locales coinciden con las versiones registradas en Supabase.

Verificación: tablas nuevas presentes, creación de pedidos restringida al servicio, inserts directos de clientes revocados, cron activo cada cinco minutos. Se conservaron 2 pedidos, 2.892 productos y la suma de stock de 107.654 (dato histórico, no conteo físico). Ningún producto se marcó verificado. Ejecución manual de vencimientos: 0 reservas liberadas, sin errores.

El dueño realizará commit y push para publicar en Vercel. No se hizo commit, push ni despliegue desde esta tarea. La versión anterior del checkout puede resultar incompatible con los nuevos permisos hasta ese despliegue. La migración no configura credenciales de Vercel, no habilita compras y no reemplaza costos/stock/datos fiscales reales.


## Catálogo y costos: estado vigente del 21/09/2026

Aplicada `20260921185112_catalog_identity.sql`: identidad, galerías, procedencia privada de costos y guardado transaccional de costos/precio/stock. Importados 2.789 costos ARS por SKU del PDF mayorista; gastos sin confirmar. Actualizadas 2.789 herramientas y 97 cosméticos. Tres herramientas sin modelo inequívoco quedan como borradores conservados. 2.886 fichas públicas con foto; 2.847 fotos >=800 px y 39 de menor resolución original. No se alteraron precios, pedidos ni cantidades históricas.

Panel `/admin/costos`: stock, compra, venta y contribución, con alertas por gastos incompletos y fichas similares con precios diferentes. No confundir contribución con ganancia neta. No hay PDF de costos de cosméticos; no se verificó individualmente el objetivo de precio 5–10% debajo de Mercado Libre. Ver `docs/CATALOGO-COSTOS-2026-09-21.md`, `docs/auditoria-precios.csv` y `docs/precios-fichas-a-revisar.csv`. Los archivos locales de imágenes y el panel requieren el push del dueño para publicarse.


## Estado vigente al 22/09/2026: envío directo del proveedor

El dueño confirmó que la mayoría del catálogo se compra al mayorista al recibir una venta y el proveedor despacha desde Misiones al cliente. Declaró disponibilidad habitual del proveedor; un despacho anterior demoró aproximadamente dos días, sin garantía general. No confundir disponibilidad comercial con tenencia física, ni prometer entrega en dos días.

Migración aplicada `20260922140934_supplier_fulfillment.sql`: 2.886 productos activos configurados como `supplier` / disponibles; unidades históricas conservadas como referencia, no se descuentan ni reponen para estas ventas. Pedidos guardan el modo de abastecimiento al comprarse. Se conservan dos pedidos previos. El panel de costos permite elegir stock propio o proveedor y pausar disponibilidad. Stock propio sigue requiriendo verificación.

Login y registro devuelven errores controlados, respetan el destino interno y mantienen sesión mediante proxy. Cuenta admin existente configurada y acceso verificado; no guardar contraseñas en documentos. Favoritos de invitados se incorporan a la cuenta y persisten en Supabase; ruta /favoritos para todos los roles. Carrito conserva contenido al ingresar.

El envío del proveedor muestra tarifa a cotizar salvo configuración explícita `NEXT_PUBLIC_SUPPLIER_SHIPPING_RATES_JSON` por zona; no ofrece retiro en Tandil. Envíos automáticos requieren peso registrado hasta 2 kg y COMMERCE_SHIPPING_ENABLED. Carritos con distintos orígenes requieren cotización. No asumir tarifa cero cuando falta una tarifa.

Validación: 12 pruebas automatizadas (incluye SQL real aislado), tipos y compilación correctos; navegador verificó login admin, persistencia de sesión, carrito, alta y eliminación de favoritos, y checkout bloqueado por configuración local faltante. No se hizo un cobro real ni se completó una nueva alta con email. Credenciales privadas de pedidos y Mercado Pago ausentes localmente; configuración de producción no verificada en esta intervención. Todavía no certificar el lanzamiento de pagos. Cambios de aplicación sin publicar en esta intervención.
