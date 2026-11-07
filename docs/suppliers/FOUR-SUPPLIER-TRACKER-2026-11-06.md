# Proveedores y rastreador — 06/11/2026

## Pedido y estado de trabajo

El dueño pidió conservar únicamente Atacado Connect, Atacado USA, Star Company y Total Herramientas Oficial, archivar las otras fuentes y productos exclusivamente dependientes de ellas, y operar descubrimiento y monitor por separado en la nube. No habilita publicación sin revisión, uso de APIs privadas, evasión de acceso, inventario supuesto ni órdenes de compra automáticas.

Rama `feat/four-supplier-tracker`, sobre los cambios USD ya preparados. Hay trabajo previo local del 05/11 que se conserva. El respaldo previo está en `scratch/suppliers-private/tracker-2026-11-06/before/`, con JSON por tabla y SHA256 por archivo. No versionar esa carpeta.

Auditoría inicial: 9 proveedores, 943 productos, 204 variantes, 5.414 ofertas y 38.245 observaciones; 4 órdenes históricas y 3 ítems. La identidad persistente es **Star Company**, `starcompany-py.com`; no aparece Star Compass. Clasificación previa: 786 productos conservables por fuente retenida, 43 dependientes exclusivamente de descartados (10 activos), 114 requieren revisión. Se protegen las existencias propias y los productos sin asociación comprobable. Los datos originales y relaciones se conservan; la baja es lógica.

## Evidencia de fuentes

Las cuatro portadas responden por HTTP público. Robots se consultó el 06/11. Atacado Connect prohíbe `/api/`; el adaptador sólo lee HTML público y sus enlaces. Total devuelve 404 para robots; no se evaden controles. Star publica política de contenido; la lectura operativa conserva evidencia privada, no publica textos/imágenes sin autorización ni utiliza datos para entrenamiento.

Atacado USA tiene diseño `av-product-card` y categoría real `https://atacadousa.com.py/categoria/cosmeticos`. La primera página tiene 12 productos y expone `?p=2`; se siguen enlaces efectivos sin fijar un total. Su vista resumida muestra `$` sin moneda ni stock suficientes. Se conserva el importe visible como texto, costo normalizado desconocido y disponibilidad desconocida. Un botón de presupuesto no prueba stock. La URL nativa sólo se considera si está publicada explícitamente y pasa robots y pertenencia; no se construyen endpoints internos ni se reutilizan tokens.

## Plan de migración

1. Respaldar tablas y generar clasificación privada previa; conservar hashes y la lista exacta.
2. Añadir esquema de fuentes, recorridos, candidatos, tareas, historial y auditoría con RLS administrativo.
3. Probar archivo lógico e idempotencia en PostgreSQL local. Aplicar sólo el alcance auditado, con verificación de concurrencia. Mantener pedidos y movimientos comerciales intactos.
4. Ejecutar descubrimiento completo de Cosméticos Atacado USA y repetirlo para comprobar ausencia de duplicados; no publicar candidatos.
5. Comprobar HTML, identidad y paginación de los otros tres adaptadores. Registrar limitaciones reales y controles de acceso.
6. Conectar worker de lotes y panel administrativo; validar errores, exclusiones, permisos, disponibilidad, importación selectiva, overrides USD y responsive.
7. Ejecutar suites/build y generar reporte posterior, cron vigente y guía de operación.

## Decisiones de implementación

Se reutilizan `suppliers`, `supplier_offers`, `supplier_observations`, el vinculador de identidad exacta, importación administrativa, costos y reservas existentes. El descubridor persiste enlaces y pertenencia a cada categoría; el monitor tiene tareas por producto y no necesita volver al listado. Los catálogos descubiertos son privados. La importación automática por categoría comienza desactivada y sólo puede crear borradores revisables; la publicación mantiene la revisión comercial vigente.

El seguimiento vive en Supabase/Edge con tickets de un uso, límites y leases. La PC sólo ejecuta pruebas/manuales expresamente iniciadas; no instala servicios ni tareas periódicas. Los cron compartidos continúan para proveedores retenidos; fuentes archivadas no pueden reclamar trabajos nuevos ni aceptar escrituras de workers antiguos. Las órdenes aceptadas no cambian ante sustitución de fuente o precio.

La normalización USD requiere moneda y tipo de cambio explícitos. Se mantienen distintos el cambio de venta, adquisición y pasador. Ante costos que producen pérdida se conserva el precio manual, se bloquea el cambio automático problemático y se registra una alerta. Una prueba de descubrimiento no acredita disponibilidad comercial ni permiso de reutilizar medios.

## Resultado aplicado en Supabase

Proyecto comprobado `gqcdurxndbeeugjfworx`. Migraciones `four_supplier_tracker`, `supplier_tracker_cloud_schedule`, `supplier_tracker_recommendations`, `supplier_tracker_monitor_evidence` y `supplier_tracker_identity_review` aplicadas con sus versiones remotas registradas. Los archivos locales conservan las marcas temporales generadas por CLI; MCP asigna versiones remotas diferentes. No volver a aplicar por discrepancia de timestamp: comparar nombres/contenido e historial remoto.

Tablas nuevas privadas: `supplier_tracker_sources`, `supplier_tracker_runs`, `supplier_tracker_page_hashes`, `supplier_tracker_items`, `supplier_tracker_memberships`, `supplier_tracker_tasks`, `supplier_tracker_events`, `supplier_scope_audit`, `product_supplier_preferences`. Todas con RLS y lectura administrativa; escrituras por RPC con permisos y controles de administrador/servicio. Columnas de archivo lógico y configuración de seguimiento añadidas a proveedores/productos/variantes/ofertas. No se borraron filas comerciales.

Activos: Atacado Connect, Atacado USA, Star Company y Total. Archivados: Atlántico Shop, Madrid Center, Mobile Zone, Neo Import y Vencell Alberdi (identidad registrada de la fuente mencionada como Bencel). Se archivaron 43 productos, de los cuales 10 estaban activos, y 25 variantes. Los productos con una fuente retenida y los registros con stock propio se conservaron. Quedan 114 productos de la clasificación inicial pendientes de revisión de fuente; no se infirió su dependencia ni agotamiento.

Los JSON de `orders`, `order_items` y `stock_logs` antes/después son idénticos byte por byte (4 órdenes, 3 ítems y 27 movimientos). Reportes, CSV, hashes y evidencia están exclusivamente en `scratch/suppliers-private/tracker-2026-11-06/`; no versionar ni desplegar. Las cinco fuentes descartadas tienen `is_active=false`, `automation_authorized=false`, monitor deshabilitado y colas bloqueadas. No había cron dedicado a esas fuentes; los compartidos filtran activos y las escrituras antiguas quedan protegidas por trigger.

## Adaptadores y pruebas reales del 06/11

| Proveedor | Descubrimiento comprobado | Monitor comprobado | Límite |
|---|---|---|---|
| Atacado USA | Cosméticos completo, 13 páginas, 151 IDs; dos repeticiones sin nuevos duplicados | Una ficha nativa real con USD y disponibilidad explícitos; asociación MYA ambigua en revisión | `$` sin moneda ni presupuesto equivalen a evidencia insuficiente; URL nativa sólo si está publicada y autorizada por robots |
| Atacado Connect | Belleza y Cuidado: 20 tarjetas en primera página y enlaces reales hasta página 214 | Una ficha real procesada en Supabase, USD y disponibilidad explícitos | No se declara recorrido completo de 214 páginas; `/api/` prohibido |
| Star Company | Cosméticos: 24 tarjetas y paginación real hasta 27; normalización entre módulo y `/categoria-premium/100` | Una ficha real con moneda y cantidad publicadas | No se declara recorrido completo de 27 páginas; cantidades no reservadas para MYA |
| Total | Herramientas: 25 tarjetas y paginación real hasta 4 | Una ficha real; ID de URL separado de SKU/modelo | Precio sin IVA: cargos pendientes; no es costo landed completo |

El primer recorrido USA detectó una falsa vuelta por `p=1` y quedó auditado como parcial. Se corrigió la canonicalización y después se completaron dos ejecuciones de 13/151 sin duplicados. Se conserva ese intento inicial para auditoría. Las muestras de los otros tres proveedores no publicaron productos, cambiaron inventario ni crearon compras.

## Operación y mantenimiento

1. Entrar como administrador a `/admin/proveedores/rastreador`. Elegir uno de los cuatro proveedores. Consultar categorías públicas o pegar hasta 20 URLs, una por línea. Las URLs de Star módulo y premium se normalizan a la misma identidad.
2. Configurar intervalo de descubrimiento y monitor entre 900 y 2.592.000 segundos. Valor inicial: categorías cada 24 h, fichas cada 6 h; se puede reemplazar por proveedor/categoría/producto. El límite de páginas es un tope de seguridad, no un total fijo. Si se alcanza, el recorrido figura parcial.
3. Iniciar recorrido y observar páginas, ítems, novedades e incidencias. El navegador puede cerrarse. Pausar fuente/producto invalida sus leases. Excluir impide consultas de seguimiento. Una fuente pausada puede reanudarse e iniciar un nuevo recorrido, conservando la auditoría anterior.
4. Seleccionar uno o varios candidatos y una categoría MYA; importar como borradores mediante el flujo existente. Un borrador puede tener precio cero pendiente: no se activa ni publica por ese motivo. Revisar identidad exacta, medios autorizados, descripción, costos completos y disponibilidad antes de publicar.
5. Para categorías automáticas, marcar expresamente la opción y elegir categoría MYA. Sólo se encolan hasta cinco borradores por fuente y ciclo; existe un cerrojo transaccional contra importaciones repetidas. Las coincidencias que requieren vinculación quedan en revisión; no se fusiona por títulos.
6. Un importe no USD necesita tasa `unidades de moneda original / USD`, fuente y fecha de menos de 24 horas. No se reutiliza automáticamente el dólar público ni el del pasador. Total advierte el alcance sin IVA. Ninguna vista pública expone estos datos privados.
7. Consultar historial por producto o tipo: precios, cantidad, agotados, reposiciones, retiro, errores y alertas comerciales. HTTP 403/429, CAPTCHA, timeout y extracción defectuosa son incidencias. Retiro requiere tres 404 espaciados al menos una hora y una ventana de 24 horas; no cambia disponibilidad a agotado.
8. Comparar fuentes de la presentación exacta o usar el comparador existente para validar un vínculo. La recomendación sólo aparece con disponibilidad vigente, base de costos total documentada, cargos y contribución suficiente. La ausencia de costo total de un alternativo se muestra como pendiente. Elegir manualmente una fuente registra motivo y no reasigna pedidos existentes; aprovisionamiento nuevo queda bloqueado hasta que su evidencia de costos coincida.

Cron alojado nuevo: `mya-supplier-catalog`, `* * * * *`. Reutiliza tickets de un uso, `supplier_cloud_leases` y Edge `supplier-tracking` v10. Cada ciclo reserva una tarea por dominio, respeta separación de 10 s, timeout de 10 s, lotes acotados y presupuesto de 45 s. Robots se consulta y cachea durante una hora por instancia; hay espera tras su lectura. Hasta tres redirecciones al mismo proveedor; cambio de ruta requiere revisión. Hasta cinco fallos antes de bloqueo de tarea; backoff exponencial y cortacircuitos de proveedor de 30 min ante 403/429 o errores repetidos. Una caída no vacía stocks.

Los cron anteriores continúan: sync cada 5 min, details minutos 2/17/32/47, market minuto 7 por hora y plan cada 6 h al minuto 11. El respaldo diario Vercel existente no cambió. No hay worker periódico nuevo en la PC. Credenciales backend existentes; no se necesitan credenciales de proveedores para las muestras públicas actuales. Si una fuente exige autenticación/CAPTCHA, se registra la incidencia y no se evade.

## Validación y estado de entrega

Suite completa: 378 pruebas aprobadas. Verificación adicional de las últimas correcciones SQL e importación automática: 9/9; extracción, límites de URL/robots y normalización: 5/5. TypeScript aprobado. Lint global: cero errores y 135 advertencias preexistentes. Build Next.js aprobado con la ruta dinámica nueva. Panel probado localmente con datos sintéticos a 320/390/1440 px: selección e importación de borradores, búsqueda, historial y preferencia manual; sin overflow ni errores de consola. Esto acredita interfaz local, no sesión administrativa de producción. Evidencia: `scratch/suppliers-private/tracker-2026-11-06/ui/results.json`.

Backend y cron están desplegados y verificados. El frontend está preparado localmente en la rama `feat/four-supplier-tracker`, junto al trabajo USD previo; no se hizo commit, push ni publicación del frontend de producción. La dolarización conserva sus propios pendientes documentales: no se ejecutó la conversión masiva del catálogo ni se inventaron márgenes/costos. No confundir funciones/tablas USD presentes con migración comercial completa de productos.

Para repetir pruebas manuales: `node --env-file=.env.local --import tsx scripts/verify-four-supplier-live.mts --twice` (USA completo), `node --import tsx scripts/probe-four-supplier-adapters.mts` (muestras de otros tres), `node --env-file=.env.local --import tsx scripts/verify-tracker-cloud.mts` (encola cuatro fichas para el cron alojado), `node scripts/verify-supplier-tracker-ui.mjs` (interfaz sintética local). No ejecutar de nuevo el respaldo `before` ni la limpieza; conservar originales y verificar hashes antes de cualquier restauración.


Cierre adicional: la muestra USA nativa permitió conservar costo USD y disponibilidad real, pero su enlace comercial previo resultó ambiguo. Edge v10 conserva esa observación privada en estado `review`, emite `identity_review` y no reescribe la oferta comercial. Las cuatro muestras de monitor están comprobadas; quedan 154 candidatos privados (151 USA + una ficha de cada otro proveedor), sin importación automática habilitada. Evidencia final privada: `live/final-evidence.json`. Se verificó en vivo la denegación HTTP 401 para lectura anónima de candidatos e invocación de workspace/historial/ejecución; las nueve tablas tienen RLS, no hay SELECT anónimo ni funciones `tracker_*` SECURITY DEFINER ejecutables por anónimos.

Preparación para revisión y release: manifiesto de archivos y hashes en `scratch/suppliers-private/tracker-2026-11-06/delivery-manifest.json`. Hay archivos compartidos con la migración USD y el trabajo manual previo; no usar `git add .` ni publicar todos los cambios sin revisar ese alcance. La validación completa más reciente aprobó 378 casos; la prueba adicional de idempotencia de borradores aprobó 9/9 de la base del rastreador.
