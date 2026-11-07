# Herramienta manual de proveedores en la PC — 05/11/2026

**Alcance vigente:** la ampliación de sincronización y margen al final de este documento reemplaza las limitaciones de precios y guardado manual de la versión inicial descrita a continuación.

El dueño autorizó un recorrido local iniciado por él para consultar fichas y recopilar catálogos, con avance producto por producto. Eligió expresamente **PC con respaldo en la nube**. Esta decisión habilita la herramienta manual; mantiene retirados los instaladores de tareas periódicas y no convierte la PC en servidor permanente.

Inicio: `../Iniciar proveedores MYA.cmd`, desde la raíz MYAimportaciones, o `npm run suppliers:local` desde Tienda WEB. Guía del usuario: `../Proveedores en mi PC.md` en esa raíz.

## Implementación

- `scripts/local-suppliers/server.mts`: proceso Node manual y panel ligado exclusivamente a `127.0.0.1`. Lee las credenciales existentes con `@next/env` sólo en el proceso local. Host, Origin, Sec-Fetch-Site y token por sesión protegen las rutas del panel. No hay CORS público ni credenciales de Supabase enviadas al navegador.
- `runner.ts`: recorrido secuencial, pausa/cancelación, historial privado por consulta y selección de proveedores desde su registro persistente. Coordina la cadencia con el respaldo mediante `reserve_supplier_source_slot_v1`.
- Stock: reutiliza `readCrosslinkCatalog`, `matchTargets`, `matchSupplierProduct`, `inspectSupplierProduct`, `parseObservation` y las RPC existentes. Compara la identidad actual contra el producto/variante MYA, además del ID del proveedor. Bloquea diferencias de condición, incluido tester.
- Cada recorrido produce una vista previa. El usuario selecciona un máximo de 20 identidades concretas para registrar observaciones; la selección vence en 15 minutos y se revalida antes de guardarla. La RPC preserva los vínculos existentes y rechaza observaciones anteriores a evidencia más reciente.
- Sólo se invoca `refresh_supplier_availability_v1` cuando todas las ofertas conocidas del producto pasan el control de identidad. Esa RPC también verifica la política persistente. No se modifica `stock`, precios de venta, estado de publicación, costos históricos ni pedidos.
- Oportunidades: `collectPublicCatalog` se ejecuta con Chrome local. Los candidatos elegidos se guardan privados, sin `product_id` ni `variant_id`, con `verification=pending`. No se ejecuta reconciliación automática, importación comercial ni publicación. Los candidatos ya registrados no sobrescriben vínculos existentes.
- Se respetan robots de la página y de la navegación de búsqueda. Se siguen enlaces siguientes visibles, con límites explícitos. El resultado no equivale a cobertura completa en catálogos dinámicos.
- Se agregó lectura de tarjetas `.av-product-card` de Atacado USA: el ID se obtiene del enlace real, no de una referencia ajena; moneda sólo explícita y disponibilidad desconocida en listado. La función ejecutada dentro de Chrome usa un programa de texto para evitar ayudantes de compilación `__name` de tsx fuera de alcance.

Los procesos alojados, crons, precios automáticos y la configuración persistente conservan su estado anterior. El trabajo de red/renderizado de estos recorridos se realiza en la PC; la base privada sigue en Supabase. Madrid restringido continúa manual.

## Validación

Pruebas aisladas: controles de origen y token, ausencia de credenciales en HTML, selección explícita, identidad ajena/tamaño/tester, guardado mediante RPC, bloqueo de agregados con enlaces incompatibles, candidatos pendientes sin publicación, pausa/cancelación y concurrencia. La prueba de navegador con catálogo sintético corre aparte con `npm run test:suppliers:browser`, para no exigir Chrome en la suite general de Node.

Las consultas reales de prueba guardan su historial exclusivamente en `scratch/suppliers-private/local-monitor/`. No se aplicó un lote de disponibilidad ni se guardaron candidatos de prueba en producción.

Comprobaciones finales del 05/11/2026:

- Suite general: 351 pruebas aprobadas; prueba aislada con Chrome: 1 aprobada. Tipos y compilación de producción aprobados. ESLint terminó sin errores (134 advertencias existentes fuera del código nuevo); la revisión dirigida del código nuevo no produjo advertencias. `git diff --check` y la protección de evidencia pública aprobaron.
- Lectura real de Star Company: la ficha Medicube Zero Pore 2.0 Sérum Facial 37 ml devolvió identidad exacta, disponibilidad explícita y costo en USD. Se mostró lista para guardar; no se aplicó su resultado en producción.
- Exploración real de Star: tres tarjetas Medicube leídas y reconocidas como existentes. Exploración real de Atacado USA: tres tarjetas de su diseño actual, dos existentes y un candidato nuevo; moneda y disponibilidad quedaron sin confirmar porque esa vista no las acreditaba.
- Un vínculo Total incompatible quedó en revisión sin consultar una ficha ajena ni guardar disponibilidad.
- Panel verificado a 390 y 320 px, con tabla desplazable y sin desborde del documento. Se corrigió el ajuste de la ruta larga del historial. Captura privada: `scratch/suppliers-private/local-monitor/panel-verificado.jpg`.
- Cierre desde el panel verificado; el proceso manual terminó con código 0. No quedaron servicios o tareas instalados ni un servidor local abierto. No se modificaron la configuración persistente de seguimiento, los crons ni los despliegues.

Estas muestras validan el recorrido; no acreditan cobertura real de todos los proveedores ni de sus catálogos completos. Las fuentes dinámicas o sin evidencia compatible conservan sus límites y quedan informadas para revisión.

## Ampliación: sincronización PC, panel y tienda

El dueño aclaró que la herramienta debe alimentar el catálogo compartido. Eligió expresamente **actualizar automáticamente conservando el margen actual** y confirmó USD100 de productos + USD20 de pasador = **120 USDT a la cotización de compra del día**. No se usa ARS1600 como cambio fijo para ese modo. La regla queda identificada como `localMarginCarrier=goods_20pct_usdt`; los antecedentes y tarifas especiales del simulador histórico no se reescriben silenciosamente.

- `sync` y `prices` son opciones explícitas del recorrido. El panel las ofrece activadas; las llamadas antiguas sin esas opciones conservan el modo revisión. La sincronización vacía los resultados comprobados en lotes de hasta 20, al reunir 10 pendientes, al pasar un minuto, al terminar una página de catálogo o al terminar el recorrido. Las identidades ambiguas nunca se aplican automáticamente.
- Cada guardado se realiza en la misma base Supabase del administrador y la tienda. Los cambios de disponibilidad y los precios efectivamente aplicados aparecen en la siguiente lectura/actualización de la página web. No se necesita copiar archivos ni desplegar el catálogo. Los clientes que ya tenían una página abierta deben actualizarla.
- `/api/connection` distingue disponibilidad y ajuste por margen; `/api/web-state` consulta precios/publicación/stock de proveedor del producto o variante exacta del resultado actual. Los botones abren el editor autenticado real, la ficha pública o el flujo de incorporación/publicación existente. No se crea un editor alternativo que omita sus controles.
- Explorar registra candidatos privados. **Completar alta y publicar** abre el administrador: seleccionar el candidato por su título, crear/vincular el borrador, completar descripción/fotos/costos y aprobar la publicación. Sólo el alta aprobada aparece en la tienda. No se simuló una publicación durante la prueba.
- `recoverLatest` recupera los resultados de stock listos y pendientes de un informe anterior y vuelve a consultar sus fuentes. No aplica evidencia vieja. Los informes nuevos se escriben mediante archivo temporal y renombrado, con escrituras serializadas; no se anuncia disponibilidad para un nuevo recorrido hasta completar su informe. No se cierra ni reinicia una instancia anterior del usuario.

### Ajuste automático por margen

`src/lib/supplier-margin-prices.ts` calcula desde una **base fija**: precios minorista/mayorista actuales y costos documentados. Conserva la contribución porcentual de cada canal teniendo en cuenta comisiones porcentuales y gastos variables fijos; redondea hacia arriba según la configuración y evita acumular redondeos entre ejecuciones. El nuevo costo de mercadería y pasador es `USD de la ficha × USDT/ARS vigente × 1,20`; el flete adicional documentado se mantiene separado. Una base sin desglose suficiente queda bloqueada: no se deduce la composición de gastos ni se duplica un pasador que figure incluido en el costo.

Requiere producto simple activo con despacho por proveedor, presentación exacta, misma fuente del costo registrado, gastos confirmados, documentación y cotización USDT vigente. Revalida también la evidencia local inmediatamente anterior: título de la fuente, costo, URL y fechas. Las variantes sin costo individual, bases con margen negativo, fuentes sin moneda/stock explícitos o relaciones incompatibles quedan pendientes con motivo visible.

La RPC `apply_supplier_margin_price_v1` revalida en transacción producto, oferta, costos, configuración y política; bloquea cambios concurrentes y ediciones manuales. El límite persistente de cambio sigue en 20%: una propuesta mayor se muestra para revisión en el editor web. La base se conserva incluso si una propuesta excede el límite, evitando recalcular un margen compuesto después de una edición manual. Los costos históricos, el inventario físico y la publicación no se alteran desde esta RPC. La auditoría queda privada en `supplier_margin_price_events`.

Migraciones **aplicadas** en MYA: `20261105170000_supplier_margin_prices.sql` y `20261105173000_supplier_margin_review_baseline.sql`. Se habilitaron `localMarginPrices=true` y la regla confirmada con registro de la autorización. `autoStock=true` se conserva; los motores antiguos de comparables (`autoPrices`) y bases FX (`usdtAutoPrices`) permanecen deshabilitados. El ajuste por margen corre al sincronizar desde la herramienta local, no como un proceso nuevo de Vercel; la nube conserva su seguimiento de respaldo y la cotización USDT existentes.

Validación de la ampliación:

- 356 pruebas generales aprobadas, incluyendo cálculo por canal, regla 120 USDT, fuentes cambiadas, recuperación con nueva lectura, conservación de precios/inventario, RPC y privacidad en PostgreSQL. Tipos, compilación y revisión dirigida del código aprobados.
- Migraciones verificadas en producción: RPC ejecutable sólo por `service_role`; tablas privadas y sin acceso público. Habilitar el modo no aplicó un lote de precios.
- Prueba real individual, repetida al verificar el resguardo de la base: Medicube Zero Pore 2.0 Sérum Facial 37 ml, Star Company. Se guardó la observación y se sincronizó la disponibilidad; el panel confirmó el registro compartido. La propuesta de precio superó el límite del 20% y se dejó para revisión con los importes propuestos visibles. Se registró la base privada para impedir un reajuste compuesto tras una edición manual; no se aplicó ese cambio de precio ni se publicó un producto de prueba.
- Se abrió la ficha pública: disponibilidad habilitada y coincidencia de precios minorista y mayorista con la lectura compartida. La prueba se hizo en una instancia temporal separada en el puerto 4318, sin reiniciar el recorrido anterior del usuario. Esa instancia se cerró desde el panel; captura privada del resultado: `scratch/suppliers-private/local-monitor/sincronizacion-verificada.jpg`.

Límites: el ajuste requiere evidencia y bases completas; no equivale a cobertura total de los catálogos ni garantiza márgenes sobre gastos que no estén documentados. Las nuevas altas siguen el proceso de aprobación existente. No se desplegó un frontend nuevo ni se instalaron tareas o servicios locales.
