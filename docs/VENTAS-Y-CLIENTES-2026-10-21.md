# Ventas y clientes — publicado y verificado

Rutas privadas: `/admin/ventas`, `/admin/ventas/[id]`, `/admin/clientes` y `/admin/clientes/[id]`. Se accede desde la navegación administrativa. Requieren sesión y rol administrador, tanto en las páginas como en la capa de datos y las funciones PostgreSQL.

## Ventas

Listado paginado de 20 pedidos, búsqueda por código, nombre, email, teléfono, producto, variante o SKU; filtros por estado, revisión de pago, cuenta y fechas de Argentina. Los totales se calculan sobre todos los resultados filtrados, no solo la página visible. El panel se actualiza cada 30 segundos mientras está abierto y al recuperar el foco.

El detalle distingue la cuenta compradora del nombre y email utilizados para la entrega. Incluye líneas históricas con cantidades, variantes y SKU, subtotal, descuento, total, forma de pago, dirección completa, teléfono, notas, reserva, referencia del cobro y guía del transportista. El envío a cotizar por separado se identifica expresamente.

La gestión reutiliza las funciones transaccionales existentes de estado y guía. Mercado Pago conserva la confirmación automática mediante su integración; una transferencia requiere verificar los fondos. El formulario exige esa confirmación antes de marcarla pagada. El estado de revisión de un cobro permanece visible.

## Clientes y selección guardada

Directorio paginado de cuentas registradas, con búsqueda y filtros por favoritos, carrito o compras pagadas. Las cuentas administrativas están identificadas. Cada ficha muestra datos de cuenta, preferencias de email, favoritos, último carrito sincronizado y pedidos asociados mediante su cuenta real; no se atribuyen compras de invitados por coincidencia de email.

`account_carts` conserva únicamente referencias de producto, variante y cantidad. La función `save_account_cart_v1` valida pertenencia de las variantes, cantidades, duplicados y límite de 50 líneas. El propietario se toma de `auth.uid()`. La API además comprueba origen, tamaño de solicitud e identidad de la sesión, para rechazar escrituras iniciadas desde otra cuenta.

El carrito local se separa por cuenta y conserva la selección del visitante al iniciar sesión. Abrir la tienda desde un dispositivo nuevo sin selección no vacía el snapshot guardado. La ficha administrativa indica su fecha: es la última selección sincronizada, no una reserva ni una compra. No identifica a visitantes sin cuenta ni incorpora carritos históricos que solo existan en sus navegadores. Un problema de sincronización mantiene la selección local y avisa al cliente.

La persistencia operativa no habilita promociones ni recordatorios. La función previa de emails sigue exigiendo su consentimiento independiente. La política de privacidad informa el uso de carrito y favoritos por el equipo de atención.

## Emails

Se conservan la cola durable, idempotencia, reintentos, procesamiento posterior al checkout y webhook de entrega existentes. Los futuros eventos de pedido incorporan ID, cuenta compradora y variante exacta. El aviso administrativo lleva directamente al detalle de la venta. Los datos exclusivos de administración no se incluyen en el mensaje del cliente.

El detalle del pedido distingue pendiente, enviado, entrega confirmada y errores de email. Registrar un pedido y acreditar su pago son eventos diferentes. No se reenviaron automáticamente pedidos históricos.

## Evidencia de entrega

- Migraciones aditivas aplicadas en MYA: `20261021090000_admin_sales_customers.sql` y `20261021091000_sales_email_details.sql`.
- Suite: 181 pruebas aprobadas, incluidas RLS entre cuentas, referencias exactas, fechas de Argentina, paginación, totales, snapshots, rollback e idempotencia de emails. TypeScript, ESLint dirigido y guard de evidencia pública aprobados.
- Revisión administrativa autenticada: 24 vistas a 320/390/768/1440 px; versión final aislada, seis vistas móviles; dominio público final, 12 vistas a 390/1440 px. Sin errores de JavaScript ni desbordamiento horizontal. Las rutas sin sesión redirigen al acceso.
- Prueba real de carrito con dos unidades de una variante y un favorito en una cuenta administrativa: persistieron y se mostraron en Clientes. Se retiraron las filas temporales mediante comprobaciones de propiedad y versión; no se modificaron pedidos ni preferencias.
- Prueba identificada como `email_test`: enviada a los dos destinatarios administrativos configurados y confirmada `email.delivered` por Resend/webhook. No se generó una compra real ni un pago para probar los emails.
- Despliegue final `dpl_xMLiL3NU4r6pYYS1pWYNL7fPCLA8`, READY, promovido y comprobado en `https://myaimportaciones.com`. Sin commit ni push.

Los informes, capturas con datos personales y manifiesto de hashes permanecen en `scratch/suppliers-private/`. Durante la prueba, el script de QA necesitó respetar el aislamiento de las vistas previas de email y esperar controles visibles durante streaming; se corrigió el script sin debilitar el sandbox de esas vistas.
