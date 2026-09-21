# Activación y validación

Los cambios son locales. No se aplicó la migración a Supabase ni se desplegó una versión pública.

## Orden de activación

1. Respaldar y revisar políticas y funciones actuales de Supabase. En una base nueva aplicar `supabase/schema.sql` y luego `supabase/migrations/20260921134833_retail_integrity.sql`. La migración elimina escrituras públicas a órdenes e items y revoca funciones antiguas de stock/seguimiento. Coordinar el cambio con la versión nueva de la aplicación: el checkout anterior deja de funcionar con las nuevas restricciones.
2. Configurar `SUPABASE_SERVICE_ROLE_KEY` sólo en servidor; nunca en una variable pública. Configurar origen HTTPS canónico, identidad fiscal y datos de contacto verificados.
3. Probar en un entorno de ensayo con cuentas propias: cotización, reserva, pedido repetido, vencimiento, seguimiento con código+email, arrepentimiento y administración. Revisar RLS real y autorización del administrador, además de los tests SQL locales.
4. Configurar Mercado Pago: token, `MERCADOPAGO_WEBHOOK_SECRET` y `MERCADOPAGO_COLLECTOR_ID`. Revisar webhook `/api/mercadopago/webhook`, firma, importe ARS, cuenta receptora, modo real y referencia. Probar pago aprobado y fallido en el entorno adecuado antes de aceptar cobros reales. No existe modo demo que finja pago exitoso.
5. Aplicar `20260921134855_reservation_schedule.sql` después de la migración principal. Programa en Supabase la liberación de reservas cada cinco minutos, sin servicio externo ni token HTTP. Verificar el job `mya-expire-retail-reservations` y una ejecución correcta en `cron.job_run_details` antes de habilitar compras. El endpoint HTTP queda como alternativa; no requiere programar ambos. La extensión pg_cron no está disponible en PGlite: esta segunda migración requiere validación en Supabase. Referencia: https://supabase.com/docs/guides/cron/install.
6. Comprobar que el proxy de despliegue sobreescribe `x-forwarded-for`. Los límites de intentos usan su hash y ventanas de diez minutos; no almacenar direcciones IP completas.
7. Registrar existencias verificadas y costos. `COMMERCE_CHECKOUT_ENABLED=false` por defecto. Habilitar sólo al completar estos pasos. `COMMERCE_SHIPPING_ENABLED=false` por defecto: las tarifas heredadas son estimaciones, no una integración con transportistas. Antes de habilitarlas, confirmar tarifas por zona, peso y volumen; los pedidos sin peso o de más de 2 kg requieren cotización manual.

## Conservación mayorista

No se eliminó la estructura de precios mayoristas, permisos, vistas ni datos. Las herramientas antiguas de cálculo están fuera de las pestañas activas y se conserva su código para revisión. No reactivar sin reemplazar las antiguas estimaciones y corregir kits exactos, mínimos y permisos.

## Comprobaciones

- `npm run test`: precios, promociones, firma de pagos y PostgreSQL embebido real para migración, reservas, idempotencia, importes, expiración, permisos y cobros tardíos.
- `npm run type-check` y `npm run build`.
- `npm run lint`: el proyecto tenía 127 errores y 84 advertencias antes de esta intervención. Tras las correcciones, lint pasa sin errores; permanecen advertencias de código heredado.
- Verificación visual local de catálogo, búsqueda, ficha, navegación mayorista redirigida, checkout sin credenciales y páginas de atención. No se realizaron compras reales.

Limitaciones: los tests PostgreSQL usan una base aislada y no validan políticas manuales existentes en producción; falta validar pagos reales/sandbox configurado, avisos por email, tarifa logística real y la información operativa del negocio. La página de arrepentimiento genera constancia cuando el servicio de base está configurado; en caso contrario muestra el contacto alternativo sin fingir un envío.

Dependencias actualizadas a Next.js y eslint-config-next 16.3.5; npm audit fix sin cambios mayores. Auditoría de dependencias final: 0 vulnerabilidades reportadas.

## Cierre de verificación — 21/09/2026

- Seis pruebas aprobadas, incluyendo la migración completa en PostgreSQL aislado.
- TypeScript y compilación de producción con Next.js 16.3.5: aprobados.
- Lint: 0 errores y 85 advertencias. No se ocultaron las advertencias; predominan imports/variables de componentes heredados e imágenes.
- npm audit: 0 vulnerabilidades reportadas.
- Navegador local: catálogo con 2.889 resultados, búsqueda Medicube con 43 resultados y segunda página correcta; esto es una fotografía de la consulta a catálogo, no inventario físico.
- Vista móvil 390×844: ficha sin desbordamiento horizontal, compra deshabilitada sin stock verificado, enlace de consulta disponible; portada y acceso destacado a arrepentimiento visibles.
- /mayorista redirige a /catalogo; no se activó B2B.
- Checkout local sin credenciales muestra compra en preparación y canal de consulta, no éxito de pago simulado.
- Formulario de arrepentimiento accesible sin cuenta. No se envió ninguna solicitud real de prueba.
- Se separó la guía de transporte del código privado de pedido para conservar el seguimiento del cliente.
- Se encontraron publicaciones históricas con nombres similares y precios distintos (por ejemplo Medicube Collagen Jelly Cream 50 ml). Antes de activar esas referencias, confirmar SKU/presentación y unificar duplicados; no se borraron productos ni se eligió arbitrariamente un precio.

No se aplicaron cambios a datos de producción, no se realizó un pago y no se publicó un despliegue. El apagado del equipo solicitado al terminar no afecta los archivos guardados, pero cerrará la vista previa local.


## Continuación: pendientes técnicos cerrados

- Panel `/admin/estado`: configuración sin exponer claves, stock verificado, costos recientes y reclamos abiertos.
- Reclamos: lectura del motivo y cambio de estado autenticado por administrador.
- Catálogo administrativo, feeds, sitemap y exportación recorren páginas sin límite fijo de 1.000/4.000 resultados. Lecturas incompletas fallan explícitamente.
- La importación masiva no envía stock: conserva el existente y las nuevas filas usan cero por defecto. La verificación se realiza en Operaciones.
- Acceso administrativo basado en el rol real de la base; retirado el ascenso implícito por email.
- Creación de pagos comprueba también firma y cuenta receptora configuradas en el servidor.
- Siete pruebas aprobadas en la continuación.

Accesos comprobados: Supabase disponible; producción conserva la estructura anterior, un administrador y dos pedidos pendientes. No se modificaron esos pedidos. La CLI de Vercel pide nueva autenticación y el conector falla por argumentos/función no disponible. Publicación y migraciones coordinadas pendientes de restablecer ese acceso. No habilitar compras ni declarar existencias por inferencia.


## Estado vigente: migraciones aplicadas el 21/09/2026

Por instrucción expresa del dueño se aplicaron en producción `20260921134833_retail_integrity.sql` y `20260921134855_reservation_schedule.sql`. Este estado reemplaza las notas anteriores que las indicaban pendientes. Los nombres locales coinciden con las versiones registradas en Supabase.

Verificación: tablas nuevas presentes, creación de pedidos restringida al servicio, inserts directos de clientes revocados, cron activo cada cinco minutos. Se conservaron 2 pedidos, 2.892 productos y la suma de stock de 107.654 (dato histórico, no conteo físico). Ningún producto se marcó verificado. Ejecución manual de vencimientos: 0 reservas liberadas, sin errores.

El dueño realizará commit y push para publicar en Vercel. No se hizo commit, push ni despliegue desde esta tarea. La versión anterior del checkout puede resultar incompatible con los nuevos permisos hasta ese despliegue. La migración no configura credenciales de Vercel, no habilita compras y no reemplaza costos/stock/datos fiscales reales.
