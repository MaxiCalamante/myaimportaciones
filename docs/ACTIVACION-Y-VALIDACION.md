# Activación y validación

## Registro y cobros — 28/09/2026

- El registro de la aplicación ya entra directamente cuando Supabase devuelve una sesión. En el proyecto Supabase **Tienda Mayorista Minorista**, `Authentication > Sign In / Providers > Confirm email` quedó desactivado y la Site URL se corrigió de `http://localhost:3000` a `https://myaimportaciones.vercel.app` el 28/09/2026. Se verificó que ambos ajustes persisten tras recargar; las dos cuentas existentes ya tenían el email confirmado. Falta probar con una cuenta de ensayo nueva: registro, acceso inmediato, cierre, nuevo ingreso y sesión tras recargar.
- El CVU `0000003100045616945389` y el WhatsApp `5492494638919` fueron confirmados por el dueño. La pantalla de transferencia muestra el CVU y abre WhatsApp con código e importe; el cliente adjunta manualmente el comprobante. Un comprobante recibido **no** acredita el pago: operaciones debe verificar el ingreso de fondos antes de marcar el pedido como pagado.
- El precio de catálogo es el precio para Mercado Pago. La transferencia obtiene por defecto un 3% adicional (`TRANSFER_DISCOUNT_PERCENT`, limitado a 0–5%) sobre la mejor promoción, solo cuando los costos recientes y confirmados dejan ese margen. El servidor bloquea el pago si falta un costo confirmado y verificado en los últimos 30 días. Al 28/09/2026 hay 0 costos recientes confirmados entre 2.789 registros, por lo que todavía no hay productos habilitados para pago. Confirmar comisiones reales de Mercado Pago en `product_costs.payment_fee_percent` y los costos de envío antes de abrir cobros.
- Para Mercado Pago faltan `MERCADOPAGO_ACCESS_TOKEN` de producción, `MERCADOPAGO_WEBHOOK_SECRET`, `MERCADOPAGO_COLLECTOR_ID` y `NEXT_PUBLIC_SITE_URL` HTTPS del dominio final. Los tres secretos deben cargarse solo del lado servidor en Vercel; `NEXT_PUBLIC_SITE_URL` es la URL pública. Configurar el webhook HTTPS `/api/mercadopago/webhook` para pagos; probar preferencia, pago aprobado/rechazado, firma, referencia, importe exacto y conciliación antes de activar `COMMERCE_CHECKOUT_ENABLED`.
- En el proyecto Vercel `myaimportaciones` se observaron únicamente `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` para producción. Faltan la clave de servicio de Supabase y todas las variables de cobro y envío; la versión en producción sigue siendo el commit `0d2bde9` y no contiene estos cambios locales. El enlace local `.vercel/project.json` apunta a otro proyecto (`tienda-mayorista-minorista`); corregirlo antes de cualquier despliegue por CLI.
- La sesión de Supabase no tiene vencimiento por inactividad ni plazo fijo; los tokens de acceso se renuevan (vigencia actual: 3.600 segundos). Las políticas de `favorites`, `orders` y `order_items` restringen al propietario mediante `auth.uid()`; los dos usuarios existentes tienen email confirmado. El asesor de seguridad muestra advertencias genéricas sobre funciones `SECURITY DEFINER` y protección contra contraseñas filtradas (esta última requiere plan Pro); no se modificaron esas opciones.
- Para envíos desde proveedor faltan tarifas confirmadas por zona en `NEXT_PUBLIC_SUPPLIER_SHIPPING_RATES_JSON` y pesos verificados; `COMMERCE_SHIPPING_ENABLED` sigue desactivado. La entrega sin tarifa permanece “A cotizar” y no acepta pagos.

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

## Control Profesional de Productos y Sincronización Mayorista — 28/09/2026

Por requerimiento expreso del dueño se implementó el nuevo Control Profesional de Productos en `/admin`:
1. **Centro de Control (`ProductControlCenter`)**:
   - Tarjetas KPI en tiempo real: total de catálogo, publicaciones activas vs pausadas, productos en modo proveedor vs stock propio, productos disponibles vs pausados por falta de existencias en el mayorista.
   - Búsqueda en tiempo real (por SKU, título, marca, modelo y etiquetas), filtros avanzados por estado en tienda, disponibilidad mayorista, modalidad de abastecimiento, categoría y marca, y selector de productos por página.
   - Acciones masivas con selección múltiple: pausar en tienda, activar en tienda, habilitar en mayorista, pausar en mayorista y ajuste masivo de precios (+% o suma fija).
   - Acciones individuales por fila: switch directo para pausar/activar en tienda (`is_active`), toggle directo de disponibilidad del mayorista (`supplier_available`), edición rápida de precios en 1 click, comprobación en vivo con el mayorista y modal de edición integral.
2. **Sincronización Automática con Proveedor y Cron**:
   - Módulo `src/lib/supplier-sync.ts`: verifica disponibilidad, precios y existencias directamente contra los sitios del mayorista (Total Tools / Wadfow y Atacado USA). Detecta páginas 404, indicadores de "sin stock / esgotado / fora de estoque" y precios publicados.
   - Endpoint de cron `/api/cron/sync-supplier-stock`: endpoint para escaneo automatizado por lotes (concurrencia controlada para evitar bloqueos).
   - Configuración `vercel.json`: cron programado cada 4 horas (`0 */4 * * *`) para ejecutar la verificación periódica de disponibilidad en Vercel.
   - Botón interactivo "Sincronizar Lote Ahora" en el panel administrativo y botón "Comprobar" en cada fila para verificación instantánea.
3. **Migración en Supabase**:
   - Aplicada en producción: `20260928150000_supplier_stock_sync.sql` (columnas `supplier_last_checked_at`, `supplier_stock_status`, `supplier_live_price` e índice de escaneo, junto con RPC de actualización segura `update_product_supplier_sync_v1`).
4. **Validaciones**:
   - 16 pruebas automatizadas aprobadas (incluyendo tests de sincronización de mayorista).
   - TypeScript y `npm run build` con Next.js 16.3.5 / Turbopack aprobados con 0 errores (30 rutas generadas exitosamente).

