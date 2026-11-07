# Corrección postauditoría y rentabilidad — entrega local

Producción: sólo consultas SELECT. No se aplicaron migraciones, conversiones, precios, publicaciones, bloqueos de checkout, crons, deploy, commit o push. Los cambios anteriores del árbol de trabajo se conservaron. No se instalaron procesos recurrentes en Windows.

Reglas y simulación económica detalladas: [USD-PROFITABILITY.md](USD-PROFITABILITY.md).

## P1/P2 corregidos y prueba

| Hallazgo | Corrección preparada | Estado |
|---|---|---|
| Disponibilidad calculada desde proveedores archivados | Una oferta debe pertenecer a proveedor activo, autorizado, no archivado y no pausado. Si no queda evidencia válida, estado desconocido; no se inventa agotamiento ni unidades propias. | Resuelto y probado en PostgreSQL local |
| Pausas diferentes en colas vieja/nueva | Predicado compartido para proveedor, categoría/fuente e ítem; se revalida al reclamar y al confirmar evidencia en vuelo. | Resuelto y probado localmente |
| Contenido repetido cortaba navegación nueva | La huella repetida genera un evento; se siguen enlaces nuevos. URL, huella de contenido e identidad de producto siguen separadas. La unicidad de tareas y los límites evitan ciclos. | Resuelto y probado A → A → B y vueltas al mismo URL |
| Redirecciones hacia rutas robots prohibidas | Se revisa cada destino antes de solicitarlo, con HTTPS, dominio exacto y rutas públicas. Robots no verificable falla como incidencia técnica. | Resuelto y probado con destino nunca solicitado |
| Rutas privadas codificadas | Normalización y rechazo de codificación ambigua tanto en TypeScript como en RPC SQL. Se admiten espacios y UTF-8 legítimos del catálogo. | Resuelto y probado localmente |
| Precios sin costo/método de cobro suficientes | Motor decimal único, objetivos 30/18, piso 10, comisiones confirmadas y revisión de costos exactos. Preview no se presenta como validación económica aprobada. | Resuelto y probado; configuración comercial pendiente |
| Precio manual inseguro después de nuevo costo | Se conserva el importe manual, se guarda alerta y queda en revisión. Checkout vuelve a comprobar costo, política, descuento y medio de pago. | Resuelto y probado localmente |
| Comparador elegía por costo incompleto/contribución sólo positiva | Costos por oferta documentados; cálculo central por canal/medio. Se compara costo directo total, no sólo listado. No modifica preferencia ni cambia proveedor. | Resuelto y probado con oferta de listado más barata pero costo total mayor |
| Otros motores podían ajustar ARS con otra fórmula | RPC histórica local redirigida a USD y trigger que impide cambios automáticos ARS heredados por service_role. Stock y valores sin cambios pasan. | Resuelto y probado localmente |
| Historial USD remoto inconsistente | Migración base idempotente; prueba de instalación y dos reaplicaciones sin cambiar precios, tasas, órdenes ni anidar adaptaciones. | Preparado; reparación del historial productivo pendiente de revisión/aprobación |
| Cabecera real sin ticker | `SiteHeader` muestra tipo, valor y fecha; aumenta legibilidad y permite salto de línea. | Probado con componente real a 375/390/1280 px |
| Total móvil perdía USD al aumentar cantidad | Multiplicación decimal exacta; conserva USD + ARS para tres unidades. | Probado a 375/390 px |
| Selección imprimible mayorista sólo ARS | USD/ARS por unidad, subtotal, total y tasa. Tabla adaptable a pantalla móvil. | Probado con componente real a 375/390/1280 px |
| Mensajes de Moneda podían quedar ocultos en Server Actions | Resultado administrativo controlado, estado visible y campos deshabilitados durante el guardado. | Tipado/compilación y permisos locales verificados |
| Advisory de search_path mutable | ALTER preparado para `set_updated_at` y `get_order_by_tracking`, conservando cuerpo, firmas y permisos. | SQL preparado; advisory productivo sigue pendiente de aplicación |

## Recorridos reales y persistencia local

HTTP público vigente el 06/11/2026 → respuestas guardadas → adaptador → tareas/RPC reales en PostgreSQL local persistente. Máximo un acceso por proveedor a la vez, separado al menos diez segundos; cuatro proveedores independientes en paralelo. Sin sesiones de terceros, APIs privadas ni claves de proveedor.

| Proveedor | Categoría exacta recorrida | Páginas | Identidades | Repetición local |
|---|---|---:|---:|---|
| Atacado USA | `/categoria/cosmeticos` | 14 | 156 | 0 nuevas |
| Star Company | `/categoria-premium/100` | 27 | 634 | 0 nuevas |
| Total Herramientas Oficial | `/produtos/kit-de-ferramentas/filter?d=77` | 8 | 197 | 0 nuevas |
| Atacado Connect | `/categoria/games` | 63 | 1.259 | 0 nuevas |
| Total | Cuatro categorías completas | 112 | 2.246 | 0 duplicados agregados |

Connect se detuvo al consumir el presupuesto de la primera ejecución: 43 páginas/859 identidades. Se cerró y reabrió su base persistente, se retomó la misma cola y terminó en 63/1.259. Esto prueba reanudación sin empezar desde cero.

La repetición reutiliza **las respuestas HTTP capturadas** y ejecuta nuevamente las colas/RPC locales. No se presenta como una segunda pasada HTTP ni persistencia nueva en Supabase productivo. No acredita cobertura de todos los rubros de cada proveedor. Los candidatos no se vincularon/publicaron automáticamente ni se convirtieron en stock o costos comerciales confirmados.

Evidencia privada: `scratch/suppliers-private/post-audit-2026-11-06/live-1794002097224/`. Connect tiene `report-resumed.json`; los otros tres, `report.json`. Se conservan HTML y archivos PostgreSQL. Scripts: `verify-four-suppliers-isolated.mts`, `resume-supplier-isolated.mts`.

## Datos pendientes de revisión

Consulta SELECT del `2026-11-06T22:02:11.432Z`; propuestas exactas en `scratch/suppliers-private/post-audit-2026-11-06/review/review.json`.

- 6 productos activos sin URL pública retenida ni oferta de proveedor vigente. **3 conservan URL candidata en costos**: verificar ficha y matcher exacto antes de restaurar vínculo. Los otros 3 requieren una fuente exacta nueva.
- 3 padres con variantes activas y `has_variants=false`: se prepararon IDs y propuesta de bandera, sin aplicarla.
- 44 variantes activas con mayorista cero/ausente: requieren costo y precio propios, sin copiar el padre.
- Colas bloqueadas: USA 169, Star 84 y Total 7. El plan por fila distingue identidad/variante, moneda/costo/disponibilidad, 404 y causa técnica. No se quitaron bloqueos ni se reutilizó una coincidencia débil.
- La baja histórica comprende **43 productos y 30 variantes**. El resultado de la RPC enumeraba 25 variantes exclusivas y el UPDATE incluía otras 5 de padres archivados. Se corrigió la documentación, sin una nueva baja.

## Checkout, permisos y límites de evidencia

Pruebas PostgreSQL locales: reserva única, reintento idempotente, expiración, congelación de FX/ARS, cambio concurrente de costo, cambio de comisión, descuentos asignados, producto sin costo, margen insuficiente y protección del precio manual. El nuevo modo de bloqueo se activa **sólo en fixtures de prueba**.

Rutas reales de Next en build aislado y backend de autenticación controlado:

| Ruta | Anónimo | Cliente | Administrador |
|---|---|---|---|
| `/admin/moneda` | 307 a login | 307 a cuenta | 200 |
| `/admin/proveedores/rastreador` | 307 a login | 307 a cuenta | 200 |

Las RPC se probaron además con roles PostgreSQL y denegación a anónimo/no administrador. Esto valida autorización local; no se afirma una nueva sesión administrativa productiva.

Interfaz real de cabecera, tarjetas, ficha, carrito, checkout, barra móvil y selección imprimible en 375/390/1280 px. Las respuestas de cobro/cotización de esa prueba visual son controladas: no son pagos reales.

Mercado Pago externo: **bloqueado por configuración de pruebas faltante**. Hay credencial configurada que no se identifica por prefijo TEST y no hay comprador sandbox explícito. No se usó esa credencial, no se cobró, no se certificó un webhook externo. La protección de contraseña filtrada de Supabase también queda como configuración productiva pendiente; no se cambió Auth en esta tarea.

## Archivos y migraciones

Cambios principales de esta corrección:

- `src/lib/profitability.ts`, `money.ts`, `order-pricing.ts`, `supplier-url-policy.ts`, `supplier-response.ts`, `supplier-url.ts`, `supplier-automation.ts`, `supplier-margin-prices.ts` y red/adaptadores de `supplier-tracker`.
- `src/app/checkout/actions.ts`, `src/app/admin/moneda/actions.ts`, `src/app/admin/moneda/page.tsx` y componentes administrativos `money-product-editor`, `money-action-form`, `profitability-policy-editor`.
- `site-header.tsx`, `currency-provider.tsx`, `sticky-mobile-buy-bar.tsx`, `wholesale-quote-printable.tsx`.
- Regresiones `profitability.test.ts`, `profitability-checkout.test.ts`, `supplier-post-audit.test.ts`, `usd-reconciliation.test.ts`; fixtures compartidos extraídos conservando las pruebas anteriores.
- Scripts nuevos de impacto, revisión privada, recorridos aislados, compilación y permisos; prueba visual USD ampliada para usar la cabecera real.
- `AGENTS.md`, `AI_CONTEXT.md`, README de proveedores y los dos informes de entrega.

SQL preparado, sin ejecutar en producción:

1. Base USD `20261106154701_usd_base_pricing.sql`, adaptada para reconciliación idempotente.
2. `20261106212229_supplier_post_audit_controls.sql`.
3. `20261106213029_usd_contribution_policy.sql`.
4. `20261106213412_usd_profitability_integration.sql`.

Las migraciones del rastreador que ya figuran aplicadas y sus crons no deben volver a ejecutarse como si fueran cambios nuevos. No utilizar un `db push` indiscriminado sobre este árbol de trabajo.

## Validación y release pendiente

La suite final pasó **419 pruebas**, incluidas las 379 previas y 40 regresiones. TypeScript, compilación aislada y las verificaciones de interfaz y permisos pasaron. El lint general registró 0 errores y 134 advertencias. El lint dirigido a los cambios finales quedó limpio. La comparación de archivos confirmó que el código de la aplicación coincide con la copia compilada.

Los logs finales están en `scratch/suppliers-private/post-audit-2026-11-06/` e incluyen `tests.log`, `typecheck.log`, `lint.log`, `targeted-lint.log`, `build.log`, `build-source-proof.json`, `ui.log` y `admin-routes.log`.

La compilación utiliza copia aislada, dependencias reales y Supabase simulado local, sin copiar `.env.local`; no necesita ni modifica producción. Evidencia adicional de rutas y solicitudes: `C:\Users\maxim\.codex\visualizations\2026\11\06\01a1b187-bf29-7fe3-9032-1efdb5c8100b\post-audit-build`.

Antes de un release real:

1. Revisar diferencias de historial y contratos SQL con el snapshot remoto. Resolver la fila faltante de la migración USD sólo después de confirmar la equivalencia; no se ejecutó `migration repair`.
2. Revisar/aprobar base contable, tarifas de cobro, condiciones del pasador, gastos y reparto. Completar un lote pequeño de perfiles exactos y revisar su precio USD propuesto.
3. Aprobar los IDs de corrección de fuentes/banderas y los cambios comerciales concretos. Mantener importación/publicación automática desactivada.
4. Aplicar primero en staging, probar pagos con credenciales y comprador sandbox, y revisar resultados. Sólo después solicitar/aplicar aprobación productiva del esquema y frontend.
5. Cargar perfiles gradualmente en preview. El interruptor `enforce` actual es **global**, no por lote: decidir expresamente ese bloqueo con el informe de 843 identidades afectadas, o implementar y aprobar un alcance limitado antes de activarlo.

Rollback: mantener preview y automáticos detenidos, volver al frontend previo y conservar tablas/snapshots/órdenes. Si fuera necesario restaurar funciones o retirar el guard del motor ARS heredado, hacerlo con sus definiciones previas y aprobación específica; no eliminar historial, reconvertir pedidos ni reactivar precios antiguos sin su propia revisión.

**Estado final:** correcciones y motor preparados y probados localmente; evidencia económica comercial, pago externo sandbox, reconciliación remota y release sujetos a configuración/aprobación. No se certifica el sistema como listo en producción.
