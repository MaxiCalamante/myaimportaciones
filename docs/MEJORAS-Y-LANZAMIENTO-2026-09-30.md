# MyA Importaciones — mejoras y lanzamiento

Fecha: 30 de septiembre de 2026. Trabajo local, sin publicación ni cambios en datos comerciales reales.

## Estado comprobado

- Aplicación activa: `Tienda WEB`, Next.js 16.3.5, React 19.2.4, Supabase.
- La conexión local apunta al proyecto Supabase «Tienda Mayorista Minorista». Consulta de lectura actual: **0 productos totales, 0 activos**. No se extrapoló el catálogo histórico a la situación actual y no se cargaron ejemplos.
- El bucket público `product-images` existe. Actualmente no tiene límites de tamaño ni tipos MIME configurados; la migración preparada agrega esos límites.
- Las RPC de inventario y facetas existen. La migración anterior de sincronización de proveedores figura aplicada.
- Configuración local de pedidos, Mercado Pago, tarifas, envío automático y clave privada de servicio: ausente. No se verificó la configuración de producción. La compra continúa por consulta; no se habilitaron cobros.
- Se conservó MyA/MYA y el logo actual. Sigue pendiente confirmar si «IMDA» era un nombre nuevo o una referencia al proyecto existente.

## Implementado

### Productos y administración

- Editor compartido para crear y editar desde celular y escritorio, con precio en ARS, categoría/subcategoría, marca, modelo, SKU, descripción, modalidad de disponibilidad, peso, especificaciones, garantía, etiquetas y destacado.
- Productos nuevos como **borradores**. Para publicar se requiere precio positivo y foto; la disponibilidad del proveedor se confirma expresamente. Se pueden guardar fichas incompletas sin mostrar precios cero a clientes.
- Galería de hasta cuatro fotos, cámara y archivos, vista previa, eliminación de fotos de la ficha y optimización en el navegador. El servidor valida tamaño, MIME y firma del archivo; no acepta SVG, enlaces ejecutables ni dominios externos no admitidos. Fotos JPG/PNG/WebP de hasta 20 MB de entrada; resultado hasta 750 KB por foto. Para HEIC se indica exportar JPG.
- Portada e `image_urls` se guardan juntas; reemplazar una imagen ya no deja una galería vieja. Las fotos anteriores se conservan en Storage al quitarlas de una ficha, para evitar eliminar archivos reutilizados. Se intenta limpiar sólo nuevas subidas si falla el guardado; esa limpieza necesita la política DELETE de la migración.
- Validación en servidor de importes finitos/no negativos, enteros, IDs, categorías y especificaciones. El padre de categoría debe ser un rubro principal y se evita una jerarquía circular o incompatible con la interfaz.
- Edición común de producto no sobrescribe cantidades físicas ni reservas. Cambiar modalidad pasa por RPC que rechaza reservas pendientes. Verificar stock se mantiene en Operaciones.
- Importación CSV mantiene cantidades existentes y crea nuevas filas como borradores sin inventar disponibilidad ni descuentos mayoristas. Conserva galería salvo reemplazo explícito.
- Autorización en layout admin, lectura administrativa y acciones. Errores de lectura del panel se presentan como errores recuperables, no como un panel vacío. Se eliminó el caché administrativo global compartido entre sesiones.

### Proveedores

- Nueva sección `/admin/proveedores`: alta, edición, búsqueda, contacto, sitio, notas y archivo lógico.
- Persistencia en Supabase para compartir entre dispositivos; acceso exclusivo para administradores con RLS. No se envió ningún mensaje a proveedores. WhatsApp/email abren el canal para que el dueño revise y envíe.
- Los enlaces exactos de cada producto siguen en su ficha y en la verificación integrada. La agenda de contactos es independiente; no se agregó una relación automática proveedor-producto.
- La tabla nueva todavía no existe remotamente. La pantalla explica la migración pendiente y deshabilita guardar, en vez de aparentar persistencia.

### Cliente, estética, privacidad y SEO

- Inicio vacío con presentación compacta de la marca, mensaje claro y consulta por WhatsApp. Se ocultan bloques de destacados vacíos. El catálogo distingue falta de resultados de una falla de conexión.
- Se mantiene la identidad de azul, blanco y negro. Editor con controles táctiles grandes, dialog nativo, scroll del formulario, bloqueo durante guardado y retorno del foco. Se agregó salto al contenido y contacto telefónico/email accionable en footer.
- Las respuestas y props públicas excluyen URL, costo y estado interno de revisión del proveedor, aun cuando navega un admin. Las consultas públicas usan columnas explícitas.
- Sitemap y feeds ahora recorren el catálogo público completo y no reutilizan lecturas de admin; los feeds preservan la restricción de stock físico verificado. Login/registro/admin sin indexación, robots para rutas privadas, canonical de producto y escape seguro de breadcrumbs JSON-LD.
- Precios públicos ya no anuncian un medio de pago sin configuración.
- La migración revoca lectura directa de columnas internas para anon/customer y agrega una RPC de lectura privada que comprueba rol admin. **Esta protección de Data API requiere aplicar la migración.** Antes de aplicarla, la aplicación ya omite los campos, pero la API de Supabase conserva los permisos anteriores.
- Corrección crítica preparada: `update_product_supplier_sync_v1` era SECURITY DEFINER sin comprobación de rol. La nueva versión rechaza clientes y admite admin/servicio. El cron exige Bearer y configuración privada; no acepta una cabecera `x-vercel-cron` como autorización ni secretos por URL. Sin configuración responde 503.

## Evidencia de validación

| Validación | Resultado | Alcance |
| --- | --- | --- |
| `npm run type-check` | Pasó | TypeScript; también ejecutado por build final |
| `npm run test` | 25/25 | Editor/archivos/enlaces, privacidad pública, RLS y permisos en PGlite, stock/reservas/pagos, CSV, envío, favoritos, auth y parser de proveedor |
| ESLint | 0 errores, 111 advertencias | Predominan código/imports sin uso y avisos de imágenes; no se declara lint libre de advertencias |
| `npm run build` | Pasó, 31 rutas | Compilación de producción local |
| Navegador Edge/Playwright | 16 comprobaciones de rutas/HTTP | 390×844 y 1440×1000; inicio, catálogo, favoritos y checkout sin JS errors ni overflow horizontal; redirección admin sin sesión |
| Capturas revisadas | Inicio móvil y escritorio | `docs/launch-validation/390-home.png` y `1440-home.png` |
| API/SEO | Pasó | Búsqueda vacía, lista inválida de favoritos 400, cron sin configurar 503, feed/sitemap/robots 200 |
| Migración preparada | Pasó en PGlite | Anon no lee contactos/costos; customer no modifica proveedores ni sincronización; admin accede mediante RPC y conserva escritura con campos públicos de retorno |

Resultados del navegador en `docs/launch-validation/browser-results.json`. Script reproducible: `scripts/verify-launch.mjs` (requiere Playwright y Edge; acepta URL y ruta a sus módulos). Incluye apertura/cierre por Escape de carrito vacío y menú móvil. Reporte ESLint en `docs/eslint-2026-09-30.json`.

No se probó una sesión admin autenticada en la tienda real, una subida real a Storage desde un teléfono, una creación/edición comercial remota ni una compra. No se usó Axe ni se afirma auditoría completa WCAG. Las pruebas de permisos usan una base local de prueba; no prueban PostgREST o Storage remoto después de migrar. No se realizó commit, push, despliegue ni migración remota.

## Antes de lanzar

1. Confirmar marca pública, razón social/CUIT/domicilio, condiciones comerciales y datos de contacto. La marca se mantiene mientras se decide el nombre.
2. Autorizar y aplicar `supabase/migrations/20260930200323_admin_suppliers_and_catalog_security.sql` junto con esta versión de código. La revocación de SELECT privado requiere los nuevos lectores admin/RPC; publicar código y migración de manera coordinada. No ejecutar seeds históricos ni scripts de catálogo masivo.
3. Probar con la cuenta admin real: entrar desde computadora y teléfono, crear categoría si falta, crear borrador con foto de cámara y galería, revisar portada, editar/quitar una foto, guardar peso/especificaciones y publicar. Comprobar que un cliente ve la ficha y no recibe los campos internos.
4. Probar Data API después de migrar: visitante/customer rechazados al pedir `source_url`/`supplier_live_price`, RPC privada prohibida para customer, admin lee catálogo y puede crear/editar/importar. Probar una subida y la limpieza de una subida fallida con las políticas reales de Storage.
5. Cargar proveedores reales y comprobar que guardar en un dispositivo aparece en el otro. Revisar enlaces de contacto; archivar uno y volver a editarlo. Los cambios de la agenda no cambian disponibilidad comercial de productos automáticamente.
6. Cargar productos reales con precios/costos documentados y confirmar disponibilidad con cada proveedor. Stock propio requiere conteo físico; productos de proveedor no consumen inventario propio. No usar el costo de moneda extranjera como precio final en ARS.
7. Para empezar por **consulta**, mantener checkout/envío automático desactivados y acordar disponibilidad, costo y plazo antes del pago. Cargar `NEXT_PUBLIC_SITE_URL` con el dominio definitivo al publicar y revisar SEO sobre ese dominio.
8. Para **cobro automático**, configurar servicio privado, Mercado Pago (token, collector numérico, webhook secret), tarifas confirmadas por zona/peso y cron secret. Conciliar una operación real autorizada con webhook, pedido, recibo y reserva antes de habilitar `COMMERCE_CHECKOUT_ENABLED`. No usar redirects como comprobante de pago.
9. Autorizar publicación, comprobar despliegue READY/dominio y repetir smoke público + admin. Los resultados locales no acreditan el estado de producción.

## Límites operativos

- La sincronización automática sólo reconoce proveedores integrados y señales verificables. Un contacto nuevo no agrega por sí mismo un scraper. El cron no funciona sin clave privada y secreto configurados.
- Cambios masivos de modalidad se procesan por producto con protección de reservas. Si un producto falla, el mensaje informa cuántos cambiaron y pide recargar; no se promete atomicidad de todo el lote.
- La galería acepta cuatro imágenes por producto; no se implementó video ni conversión HEIC. La agenda muestra hasta 500 proveedores.
- El panel informa cobros de los últimos 50 pedidos; no equivale a una contabilidad histórica completa. Se conservan las advertencias de lint y módulos B2B dormidos.
- Algunas operaciones existentes de costos/modo se guardan por pasos. Una falla posterior se debe revisar recargando la ficha; no se afirma transacción única entre costos, producto y Storage.

Referencias técnicas consultadas: [Storage de Supabase](https://supabase.com/docs/guides/storage/uploads/standard-uploads), [RLS y permisos](https://supabase.com/docs/guides/database/postgres/row-level-security) y documentación local de Next.js 16.3.5 sobre formularios y límites de Server Actions.

## Comprobación final de rutas admin sin sesión

Se revisaron específicamente `/admin/costos`, `/admin/operaciones`, `/admin/proveedores` y `/admin/estado` sobre el build local de producción, con contexto nuevo de navegador sin sesión:

| Ruta inicial | Respuesta inicial | Destino | Respuesta final |
| --- | --- | --- | --- |
| `/admin/costos` | 307 | `/login?next=/admin` | 200, formulario login visible |
| `/admin/operaciones` | 307 | `/login?next=/admin` | 200, formulario login visible |
| `/admin/proveedores` | 307 | `/login?next=/admin` | 200, formulario login visible |
| `/admin/estado` | 307 | `/login?next=/admin` | 200, formulario login visible |

Ninguna terminó en 500, pantalla genérica de error del admin ni errores JavaScript. Evidencia: `docs/launch-validation/admin-routing-results.json`. El layout dirige a la entrada general `/admin` después de login; el `next` es interno. Los mensajes de servidor «Iniciá sesión para administrar la tienda» provienen de una denegación en el loader de proveedores durante la evaluación concurrente de layout/página; la redirección del layout se entrega correctamente. No se cambiaron loaders ni checks de autorización porque no se comprobó una falla visible.

Se confirmó por código que el layout desvía perfiles con rol distinto de admin a `/cuenta`, y que las acciones mutantes mantienen verificaciones de usuario y rol. Esta comprobación adicional no incluyó una sesión customer autenticada ni una sesión admin real. No se ejecutaron migraciones remotas ni publicación.

## Carrusel editable desde administración

Implementación local posterior a las comprobaciones anteriores. Acceso desde **Admin → Carrusel** (`/admin/carrusel`). Conserva las tres diapositivas originales, sus imágenes, textos, colores y transiciones. El inicio ahora muestra el carrusel también con catálogo vacío y mantiene el aviso de catálogo en preparación debajo. Los textos largos pueden ampliar su altura sin cortar el botón en móvil.

- Crear hasta diez diapositivas; editar imagen, encabezado breve, título, descripción y texto/enlace del botón; subir fotos desde galería o cámara con la validación y compresión existentes. Admite enlaces internos o HTTPS seguros.
- Seleccionar para ver una vista previa del mismo componente público, ordenar mediante subir/bajar, activar/pausar y eliminar. Los cambios se aplican juntos con **Guardar carrusel**. Las imágenes subidas no se eliminan al borrar una diapositiva, para conservar archivos que podrían estar reutilizados; una subida abandonada puede quedar en Storage.
- Persistencia en una fila privada de Supabase, con revisión para detectar guardados simultáneos desde otros dispositivos y rechazar una sobrescritura desactualizada. La página y las acciones exigen rol admin; RLS impide cambios de visitantes/clientes. La RPC pública entrega sólo diapositivas activas en su orden. Pausar/eliminar todas oculta el carrusel intencionalmente.

**Requisito pendiente exacto:** autorizar y aplicar `supabase/migrations/20260930200326_storefront_carousel.sql` al proyecto conectado, y publicar esta versión de código de manera coordinada. La migración crea `storefront_carousel`, sus permisos/políticas, la RPC `public_carousel_slides` y copia las tres diapositivas originales. Es independiente de la migración anterior de proveedores/seguridad, que también sigue pendiente. No se aplicó ninguna remotamente. Hasta disponer de la nueva tabla, el editor informa el requisito y permite editar/previsualizar, pero deshabilita subir/guardar; el inicio usa las diapositivas originales cuando falta la RPC.

Validación final: **28/28 pruebas**, TypeScript correcto y build de producción correcto (**32 rutas**, incluida `/admin/carrusel`). ESLint dirigido a los archivos nuevos/modificados del carrusel: sin errores ni advertencias; esto no elimina los avisos históricos del lint general. PGlite comprobó permisos anon/customer/admin, orden, persistencia, exclusión de pausadas, borrado total, validación y rechazo de revisión desactualizada.

Edge/Playwright comprobó 390×844 y 1440×1000: pausa/reanudación, anterior/siguiente, indicadores y enlace activo; sin errores JavaScript, overflow horizontal ni botón recortado; `/admin/carrusel` sin sesión termina en login 200 con formulario visible. Evidencia: `docs/launch-validation/carousel-results.json`, capturas `carousel-390.png` / `carousel-1440.png` y script reproducible `scripts/verify-carousel.mjs`. No se probó una sesión admin real, guardado por PostgREST remoto ni subida real de fotos; esas comprobaciones requieren la migración autorizada. Sin migración, despliegue, cambios comerciales, cobros ni comunicaciones externas.

## Aplicación remota autorizada y comprobación final

Esta actualización reemplaza los estados «migración pendiente» de las secciones anteriores, que describen la preparación inicial. El usuario autorizó aplicar las migraciones y hacer commit/push.

Se aplicaron mediante el plugin Supabase al proyecto `gqcdurxndbeeugjfworx` (ACTIVE_HEALTHY):

- `20260930200323_admin_suppliers_and_catalog_security.sql`.
- `20260930200326_storefront_carousel.sql`.

Los nombres de archivo y referencias de pruebas se alinearon con las versiones asignadas por el historial remoto. No volver a aplicar las versiones antiguas de preparación. La fila del carrusel conserva las tres diapositivas originales, revisión 0; catálogo y proveedores siguen en cero registros.

Comprobaciones remotas mediante SQL con roles reales: anon sólo obtiene diapositivas públicas; clientes no acceden a carrusel/proveedores privados, RPC admin ni sincronización; rol admin puede leer catálogo privado, guardar carrusel, rechazar una revisión desactualizada, pausar una diapositiva y escribir proveedores. **Todo el ensayo de escritura se revirtió con ROLLBACK**. Evidencia reproducible: `docs/launch-validation/supabase-permissions.sql` y `supabase-permissions-results.json`. Esta prueba simula las claims de una cuenta admin existente dentro de la transacción; no equivale a iniciar sesión en un navegador.

PostgREST real con clave pública: ocho comprobaciones pasaron; catálogo público 200, columnas `source_url`/`supplier_live_price` bloqueadas, tablas privadas bloqueadas, RPC privada/sincronización bloqueadas y RPC pública 200 con las tres diapositivas originales exactas. Evidencia: `supabase-release-results.json` y `scripts/verify-supabase-release.mjs`. Sin escrituras de catálogo ni pruebas de cobro.

28/28 pruebas locales tras alinear migraciones; TypeScript y build final previo correctos (32 rutas, mismo código de aplicación). Se repitieron los scripts públicos y del carrusel después de migrar sobre el servidor local de producción en `http://127.0.0.1:3100`, usando Supabase real. Se usó IPv4 explícita porque otra superficie local ocupaba `localhost` por IPv6 y devolvía una aplicación distinta. No se modificó esa superficie.

El advisor de seguridad conserva avisos históricos: `set_updated_at` y `get_order_by_tracking` sin search_path fijo; protección de contraseñas filtradas desactivada; funciones SECURITY DEFINER ejecutables. Las RPC nuevas son intencionales: carrusel público sólo entrega activas; catálogo privado y sincronización comprueban autorización, verificada remotamente. La tabla interna de límites de solicitudes tiene RLS sin políticas (acceso público cerrado). No se declara que todo el proyecto esté libre de advertencias. Referencias: [search_path](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable), [funciones públicas privilegiadas](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [protección de contraseñas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

Una subida real desde teléfono y una sesión admin real de navegador siguen sin probarse. Commit/push no acreditan por sí solos un despliegue READY; el estado de publicación se informará por separado.
