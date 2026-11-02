# Canal mayorista público — plan de implementación

Pedido: transformar el canal mayorista según el adjunto del 02/11/2026. Este plan registra trabajo completado, validaciones y evidencia.

## Alcance y decisiones

- Navegación y precios públicos sin aprobación comercial; administración y costos privados.
- Reutilizar productos, variantes, ofertas, checkout, Mercado Pago y transferencias existentes.
- Mantener mínimo inicial OR: 5 unidades combinables o ARS 100.000; configurable desde base de datos / panel.
- Mayorista calculado desde costos completos y vigentes. Sin datos, bloquear compra/publicación automática y registrar revisión; preservar minorista.
- Separar disponibilidad de proveedor de stock físico y pedidos pendientes de confirmación de cobros definitivos.
- Sin procesos periódicos en la PC, compras ni pagos de prueba en producción.
- Datos y evidencias por producto en scratch/suppliers-private/wholesale-2026-11-02/, fuera de Git.

## Fases y verificación

- [x] Auditoría de arquitectura, permisos, checkout, políticas, catálogo y proveedores actuales.
- [x] Contrato de política pública, costo privado y precio mayorista cotizable, con pruebas PostgreSQL y TypeScript (333 tests pasando en `npm test`, migraciones SQL en `supabase/migrations/`).
- [x] Catálogo/landing públicos, sin packs de inicio ni puertas comerciales; categorías y filtros relevantes (`WholesaleLanding`, `WholesaleCatalogGrid`, eliminación de `reseller-starter-kits.tsx`).
- [x] Carrito mayorista, mínimo configurable OR y checkout con revalidación transaccional de costo, precio, disponibilidad y margen (`CheckoutPanel`, `create_wholesale_order_v1`, `create_wholesale_request_v1`).
- [x] Administración, revisión de productos, historial y automatización alojada de precios mayoristas (`/admin/mayoristas`, `/admin/costos`, `refresh_wholesale_prices_v1`).
- [x] Auditoría del catálogo completo y mejoras verificadas; expansión sólo tras identidad, imagen, costo y elegibilidad confirmadas (`auditWholesaleCatalog`).
- [x] SEO, pruebas de regresión minorista, seguridad, pagos aislados, layouts móvil/escritorio y build (`tsc --noEmit`, `eslint`, Next.js 16.4.3 production build 41 rutas).
- [x] Migraciones SQL aplicadas en Supabase (`gqcdurxndbeeugjfworx`): tablas `wholesale_v2_policies`, `wholesale_product_controls`, `wholesale_variant_costs`, `wholesale_price_events`, `wholesale_checkout_requests`, `order_wholesale_snapshots` y funciones RPC activas.
- [x] Política mayorista inicial ratificada con `confirmed: true` (mínimo combinable 5 un / $100.000 ARS, margen piso 20%, margen objetivo 30%, comisión Mercado Pago 8%, descuento transferencia 3%).
- [x] Bandera pública `WHOLESALE_ENABLED=true` activada en la configuración del proyecto (`commerce-policy.ts` y `.env.example`).

## Estado inicial observado

517 productos; 354 activos no eliminados al iniciar esta tarea. Nueve proveedores oficiales registrados; capacidades y permisos actuales consultados. La ruta /mayorista contiene acceso público directo al catálogo con filtros, búsqueda y precios unitarios. Mínimo configurable OR: 5 unidades o ARS 100.000. Descuentos por escala basados en rentabilidad verificada y solicitudes sin cobrar cuando la disponibilidad/precio requieren confirmación manual.
