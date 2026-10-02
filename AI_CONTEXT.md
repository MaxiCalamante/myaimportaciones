# MYA Importaciones — contexto vigente

Actualizado el 02/10/2026. Las decisiones más recientes prevalecen sobre estados históricos. Fuente mantenida: este archivo, dentro de Tienda WEB. El contexto anterior queda en docs/AI_CONTEXT-HISTORICO.md y no define políticas vigentes.

## Precios: decisión del dueño del 02/10/2026

Para revisar el catálogo y las próximas cargas, el dueño eligió expresamente **10% más barato que Mercado Libre: equilibrio**. Fijar propuestas por producto con una publicación argentina equivalente (marca, fórmula/modelo, tamaño, versión, color, pack y accesorios), buscando aprovechar el margen disponible sin usar un recargo fijo de compra como único criterio. No elegir una publicación cara para aparentar competitividad. Este criterio sustituye como política general los anteriores ML menos 5% y recargo aproximado del 100%; preservar sus costos y evidencias como históricos.

Usar una cotización de trabajo indicada/confirmada para cada revisión. El dueño indicó ARS 1550/USD para esta revisión; no mantenerla fija en futuras cargas. Diferenciar costo informado, cotización actual del proveedor y costo real puesto. Venta menos compra no es ganancia neta; restan flete, impuestos, comisiones, embalaje y otros gastos. Sin equivalente suficiente, dejar el precio pendiente de revisión y documentar el motivo. No inventar precios ML ni convertir estimaciones en costos verificados.

Revisión de hoy: `docs/pricing-review-2026-10-02/revision.html`, `productos.csv` y `resumen.json`. Se leyeron inicialmente 214 productos (169 publicados, 45 borradores); durante la revisión se agregó Bare Vanilla y también se auditó sin modificarlo. Cierre: 215 productos, 170 publicados, 45 borradores, 214 con cotización actual del proveedor. Referencias ML de búsqueda indexadas, objetivos al 90% con redondeo hacia abajo a ARS 100 y pendientes explícitos.

El dueño autorizó expresamente **publicar las 85 propuestas para productos ya activos**: 29 subas y 56 bajas. Aplicadas y comprobadas las 85 en la API pública; se verificaron por HTTP las fichas de Jelly Cream 50 ml (ARS 45.400), Anua Cleansing Oil 200 ml (ARS 41.900) y Total TG1262306 (ARS 337.200). La operación modificó sólo `retail_price` y `updated_at`; se comprobaron sin cambios las otras 129 filas de la lectura inicial y todos los costos. Bare Vanilla quedó fuera del lote autorizado y sin cambios. Respaldos antes/después y SQL transaccional con control de concurrencia en la carpeta de revisión. No requiere despliegue de aplicación. Hay 126 casos pendientes y 4 propuestas de borradores que no se activaron. Ver `docs/POLITICA-DE-PRECIOS.md` para futuras cargas.

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


## Estado vigente al 28/09/2026: Control Profesional de Productos y Sincronización Mayorista

Se mejoró integralmente el panel `/admin` con un Control Profesional de Productos y sincronización de stock con proveedores:
- **`ProductControlCenter` en `/admin`**:
  - 6 Métricas KPI en cabecera: Catálogo total, publicaciones activas vs pausadas, modo proveedor vs stock propio, productos disponibles vs pausados por stock en mayorista.
  - Búsqueda en vivo (SKU, nombre, marca, modelo, tags), filtros por estado en tienda (activo/pausado), stock (disponible, pausado en proveedor, stock propio), categoría y marca. Paginación configurable (15, 25, 50, 100).
  - Pausar / Activar en 1 click: switch directo en cada fila (`is_active`) y toggle de disponibilidad en mayorista (`supplier_available`).
  - Edición rápida de precio minorista y mayorista directo desde la tabla.
  - Ajuste masivo de precios (+% o suma fija) y cambios masivos de estado con checkboxes.
  - Modal de edición integral (`ComprehensiveProductEditor`) con 6 secciones (identidad, precios, abastecimiento, visibilidad, imágenes y descripción).
- **Sincronización con Mayoristas & Cron**:
  - Servicio `src/lib/supplier-sync.ts`: verifica disponibilidad y precios en Total Tools (`totalherramientasoficial.com.py`) y Atacado USA Cosméticos (`atacadousa.com.py`).
  - Botón "Comprobar" en cada producto para verificación en vivo instantánea (con feedback de precio y estado).
  - Botón "Sincronizar Lote Ahora" en cabecera para escanear en paralelo controlado.
  - Cron automatizado en `/api/cron/sync-supplier-stock` configurado en `vercel.json` (`schedule: "0 */4 * * *"` - cada 4 horas). Pausa automáticamente productos agotados para evitar ventas sin stock.
- **Migración aplicada en Supabase**:
  - `20260928150000_supplier_stock_sync.sql` aplicada con éxito en proyecto `gqcdurxndbeeugjfworx` (añade columnas `supplier_last_checked_at`, `supplier_stock_status`, `supplier_live_price`, índice y RPC `update_product_supplier_sync_v1`).
- **Verificación**: 16 pruebas automatizadas aprobadas, TypeScript sin errores, build de producción Next.js 16.3.5 / Turbopack de 30 rutas exitoso.


## Estado vigente al 28/09/2026: Vaciado del catálogo de productos (reinicio limpio)

Por instrucción expresa del usuario ("elimina todos los productos de todas las categorias y subcategoais de la pagna (quiero borrar todo y empezar de nuevo= sin bprrar categpriasa y subcategorias solo todos sus productos"), se realizó la eliminación completa de los productos:
- Se ejecutó `DELETE FROM products;` en la base de datos Supabase de producción (`gqcdurxndbeeugjfworx`).
- **Productos eliminados**: 2.655 registros removidos. Tablas dependientes (`product_costs`, `stock_logs`) vaciadas por CASCADE. Referencias en `order_items` preservadas como NULL.
- **Categorías y subcategorías preservadas intactas**: Las 47 categorías y subcategorías (4 principales y 43 subcategorías) se conservaron intactas con sus slugs, jerarquías y descripciones para la carga de nuevos productos.
- **Verificación técnica**: Type-check, 16 pruebas automatizadas (`npm test`) y compilación de producción de Next.js (`npm run build`) ejecutadas exitosamente.


## Estado vigente al 28/09/2026: Gestión de Enlaces a Proveedores y Rediseño de "+ Nuevo Producto"

Por solicitud del usuario para preparar la recarga limpia de todo el catálogo con máxima comodidad operativa:
- **Gestión Directa de Enlaces a Proveedores (`source_url`)**:
  - Columna dedicada en `ProductControlCenter`: enlace directo con botón "Abrir proveedor ↗" (`target="_blank"`), botón de 1-click para copiar enlace con toast de confirmación, botón rápido "Vincular / Editar", insignia con costo mayorista en vivo y badge de margen bruto porcentual (`+X% mrg`).
  - Alerta visual ámbar para productos "Sin vincular" con botón rápido para asociar el link.
  - Modal ultrarrápido `QuickSupplierModal`: permite pegar el link del proveedor, actualizar el costo mayorista en vivo (`supplier_live_price`), cambiar la disponibilidad (`supplier_available`) y la modalidad de fulfillment sin tener que abrir el formulario completo.
  - Filtro por estado de proveedor en la barra de herramientas: "Todos los productos", "Con link de proveedor", "Sin link de proveedor (por vincular)".
- **Rediseño Integral de "+ Nuevo Producto" (`CreateProductModal`)**:
  - Reemplazo completo del modal anterior por un asistente moderno de 5 pestañas:
    1. *Datos Básicos*: Título, categoría, subcategoría, marca, modelo, SKU con generador y personalizador, vista previa automática de slug.
    2. *Proveedor & Costo*: Enlace directo a la web del mayorista con botón "Probar enlace ↗", costo en proveedor en ARS, disponibilidad del mayorista y modalidad de despacho.
    3. *Precios & Margen*: Precios minorista y mayorista, mínimo de unidades, simulador en tiempo real de ganancia bruta ($) y margen comercial (%) con advertencias visuales ante ventas bajo costo.
    4. *Imagen & Stock*: Carga directa de archivo a Supabase Storage o enlace URL externo, vista previa en vivo de imagen y unidades de stock físico.
    5. *Ficha & Publicación*: Descripción detallada, constructor dinámico de especificaciones técnicas (clave-valor), términos de garantía, etiquetas (tags), flags de publicación (activo, destacado, exclusivo mayorista) y métodos de pago permitidos.
- **Backend Robusto (`src/app/admin/actions.ts`)**:
  - `createProductAction`: validación de campos, normalización de números, validación de categorías y slugs, inserción completa en Supabase con todas las columnas e invalidación inmediata de caché administrativo y de tienda (`invalidateAdminStorefrontCache()`).
  - `quickUpdateSupplierLinkAction`: acción optimizada para actualización instantánea de enlace, costo y disponibilidad de proveedor.
  - `updateProductAction`: expandida para soportar stock, garantía, especificaciones y costos en vivo.
- **Verificación**: 0 errores en TypeScript (`tsc --noEmit`), 16/16 pruebas pasando (`npm test`), build de producción Next.js 16.3.5 / Turbopack de 30 rutas verificado.


## Estado vigente al 28/09/2026: Rediseño Integral de "/admin/costos" (Stock, Costos y Rentabilidad)

Por solicitud expresa del usuario para transformar `/admin/costos` en una herramienta profesional a la altura del panel de administración:
- **Cabecera de Navegación & Layout Profesional (`src/app/admin/costos/page.tsx`)**:
  - Contenedor espacioso `max-w-7xl` con barra de navegación superior conectada a `/admin` ("← Panel Admin"), `/admin/operaciones`, `/admin/estado` y enlace directo a la Tienda Pública.
- **`ProductProfitControl` Rediseñado por Completo (`src/components/admin/product-profit-control.tsx`)**:
  - **Selector de Vistas**: Pestaña 1 "Control de Catálogo & Márgenes" y Pestaña 2 "Simulador Mercado Libre (-8%)".
  - **6 Tarjetas de Métricas KPI**: Catálogo total analizado, margen bruto promedio sobre venta, productos costeados vs por costear, proveedores vinculados vs pendientes, y conteo de alertas de margen crítico / bajo costo.
  - **Barra de Filtros y Búsqueda**: Búsqueda instantánea en vivo (nombre, SKU, marca, modelo, URL de proveedor), filtro por categoría, filtro por rango de margen (saludable >30%, aceptable 15-30%, bajo 0-15%, crítico ≤0%, sin costo), filtro por enlace de proveedor (con link vs sin link), filtro por modalidad (proveedor vs stock propio), ordenamiento dinámico y selector de filas (15, 25, 50, 100).
  - **Tabla Enriquecida**:
    - Miniatura de producto con fallback, título con enlace a la tienda, SKU copiable con 1-click y badges de categoría/marca.
    - Columna de proveedor: botón "Abrir mayorista ↗", botón para copiar enlace con confirmación, costo de origen en vivo, semáforo de disponibilidad y botón de edición rápida.
    - Costo puesto (landed): desglose de compra, flete y gastos de internación.
    - Precio minorista (PVP): con botón de edición rápida en línea (`QuickPriceModal`) y recálculo de margen en vivo.
    - Contribución en ARS ($) y badge color-coded de margen (%): verde (>30%), azul (15-30%), ámbar (0-15%), rojo (≤0% o venta a pérdida).
    - Modalidad de entrega: despacho directo del proveedor vs stock propio verificado.
- **Modales Rápidos e Interactivos**:
  - `QuickPriceModal`: edición de precio de venta en 1-click con simulación antes/después del margen.
  - `QuickSupplierCostModal`: vinculación rápida de URL de mayorista, costo de origen y disponibilidad.
  - `FinancialControlModal`: formulario integral con 5 secciones (compra, flete, comisiones de cobro, precio, modalidad y stock) con tarjeta de simulación en vivo y guardado atómico.
- **Simulador Mercado Libre Modernizado (`src/components/admin/real-costs.tsx`)**:
  - Selector de producto con autocompletado y precarga automática de costos, precio actual y enlace de mayorista.
  - Cálculo instantáneo de costo landed, piso mínimo, rango sugerido de ahorro (-5% a -10% vs ML) y contribución neta.
  - Casilla opcional para aplicar el precio sugerido directamente a la tienda pública al guardar.
- **Acciones y Base de Datos**:
  - `saveFinancialControl` y `saveProductCostAction` actualizan simultáneamente `product_costs` y `products` (`source_url`, `supplier_live_price`, `fulfillment_mode`, `supplier_available`), e invalidan la caché de inmediato.
- **Verificación**: 0 errores de TypeScript (`tsc --noEmit`), 16/16 pruebas aprobadas (`npm test`), 30 rutas de producción compiladas limpiamente en Next.js Turbopack.

## Estado vigente al 28/09/2026: Modernización y Rediseño Integral de Todo el Panel de Administración (7 Secciones)

Por requerimiento expreso del usuario de transformar todos los módulos clave del panel administrativo en herramientas profesionales, modernas y completas (tanto frontend como backend):

1. **Costos y Precios (`/admin/costos`)**:
   - Layout espacioso y responsive con navegación directa hacia el panel principal, operaciones y tienda.
   - 6 Tarjetas de KPIs financieros y de rentabilidad.
   - Pestaña de Control de Catálogo con filtros avanzados por salud de margen (crítico, bajo, saludable), proveedor y modalidad.
   - Simulador Mercado Libre modernizado con autocompletado de productos, sugerencia de precios y aplicación directa al catálogo.
   - Modales ágiles para ajuste de precio (`QuickPriceModal`), costo de proveedor (`QuickSupplierCostModal`) y control financiero atómico (`FinancialControlModal`).

2. **Importar CSV (`BulkImportModal` + `src/lib/admin-csv.ts`)**:
   - Componente modular de carga masiva (`src/components/admin/bulk-import-modal.tsx`) con doble entrada: Drag & Drop de archivos `.csv` y pestaña para pegar texto directo.
   - Botón para descargar la plantilla oficial con encabezados (`plantilla-productos-mya.csv`).
   - Tabla interactiva de previsualización que muestra los primeros registros parseados, con badges de validación (estado listo vs errores) antes de confirmar.
   - Compatibilidad ampliada del parser con SKU, marca, modelo, enlace a proveedor y costo en vivo, manteniendo estricta compatibilidad con las pruebas unitarias existentes.

3. **Nuevo Producto (`CreateProductModal`)**:
   - Modal asistido por pasos / pestañas (Identificación, Categoría, Precios & Margen con calculadora interactiva, Imagen & Stock, Ficha & Publicación).
   - Soporte directo de enlace a proveedor mayorista, costo de origen y cálculo en vivo del margen de ganancia antes de publicar.
   - Constructor dinámico de especificaciones técnicas y carga directa de imágenes a Supabase Storage con previsualización.

4. **Nueva Categoría (`CategoryModal`)**:
   - Componente reutilizable tanto para creación como para edición (`src/components/admin/category-modal.tsx`).
   - Subida directa de imágenes con preview interactivo (admite tanto archivo local como URL externa).
   - Generación y vista previa en tiempo real del slug URL de catálogo (`/catalogo?categoria=...`).
   - Selector jerárquico inteligente de categoría padre / subcategoría con prevención de auto-referencia.
   - Configuración de visibilidad exclusiva para mayoristas y orden de visualización numérico.

5. **Productos (`ProductControlCenter`)**:
   - Panel de control de productos de alto rendimiento con vista de catálogo, buscador en tiempo real y filtrado por rubros.
   - Botones directos para abrir o copiar el enlace del proveedor mayorista con un solo clic.
   - Píldoras visuales de margen comercial y stock físico.
   - Acciones masivas de catálogo y operaciones optimizadas.

6. **Categorías (Pestaña Categorías en `AdminDashboard`)**:
   - Buscador en tiempo real de categorías y subcategorías.
   - Conteo automático y badges de productos asociados por rubro principal y por cada subcategoría directa.
   - Enlace directo con ícono para abrir el catálogo público filtrado por dicha categoría en la tienda (`/catalogo?categoria=...`).
   - Botón directo "+ Subcategoría" dentro de cada tarjeta para crear subcategorías con la categoría padre preseleccionada.
   - Botones rápidos de edición (abre `CategoryModal`) y eliminación con confirmación segura.

7. **Pedidos y Clientes (Pestañas Pedidos y Clientes en `AdminDashboard`)**:
   - **Pedidos**:
     - 4 Tarjetas de métricas superiores: Total pedidos, pedidos pendientes, pedidos entregados y facturación acumulada.
     - Buscador global por número de pedido, cliente, email, teléfono, dirección o código de seguimiento.
     - Filtros rápidos por estado de pedido y por canal comercial (minorista vs mayorista).
     - Botón directo de WhatsApp (`https://wa.me/...`) en cada fila de pedido para contactar al cliente con un solo clic.
     - Asignador y actualizador rápido de número de guía / seguimiento de encomienda / correo.
   - **Clientes**:
     - 3 Tarjetas de métricas: Total usuarios registrados, clientes mayoristas activos y cuentas de administrador.
     - Buscador por nombre, email, empresa / nombre de fantasía y CUIT.
     - Filtros rápidos por rol (Todos, Mayoristas, Minoristas, Admins).
     - Enlace y botón para copiar o compartir el enlace mayorista privado por WhatsApp.
     - Formulario de habilitación rápida de cliente mayorista por correo.
     - Tabla enriquecida con avatar de iniciales, CUIT/empresa, botón directo de WhatsApp si el cliente registró teléfono en sus compras, historial de compras (`X pedidos`, `total gastado`), switch interactivo de condición mayorista y gestión de rol de administrador.

8. **Vercel Hobby Cron Compliance**:
   - Ajustada la expresión cron en `vercel.json` a `0 6 * * *` (diaria a las 06:00 UTC / 03:00 ART) para cumplir estrictamente con el límite de ejecuciones diarias del plan gratuito de Vercel.
