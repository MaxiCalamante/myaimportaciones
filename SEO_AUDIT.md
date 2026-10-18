# Auditoría e implementación SEO — MYA Importaciones

Fecha: 17 de octubre de 2026. Dominio solicitado: https://myaimportaciones.com. Alcance nacional, español de Argentina y precios en ARS. Este documento se completa con las verificaciones de cada etapa.

## Estado inicial verificado

Next.js 16 App Router, React 19, Vercel y Supabase. Catálogo, filtros, paginación y productos se renderizan en el servidor; carrito y controles interactivos usan componentes cliente. La autenticación se valida con Supabase y el panel exige rol administrador. Las lecturas comerciales utilizan una lista explícita de columnas públicas que excluye costos y proveedores. Los precios y disponibilidad se leen sin caché compartida entre clientes. Existen feeds Google/Meta, analítica con consentimiento, checkout de Mercado Pago, correo transaccional condicionado a configuración y un sistema de sorteos separado.

Base de datos: 463 productos minoristas activos, 16 marcas, 438 productos disponibles del proveedor y ningún producto con stock propio verificado. Ninguno de los 463 productos carece de marca o imagen; uno tiene descripción inferior a 70 caracteres. Hay categorías vacías. No se modifican precios, stock, identidad comercial ni reglas de compra para el SEO.

| Severidad | Hallazgo inicial | Corrección prevista |
| --- | --- | --- |
| P0 | El dominio raíz devuelve 308 hacia www, contrario al dominio canónico solicitado. | Invertir la configuración sin bucle, comprobar HTTPS y conservar rutas/parámetros. |
| P1 | La URL pública de configuración, canonical, sitemap, JSON-LD y enlaces compartidos todavía derivan del dominio Vercel anterior. | Centralizar identidad oficial y mantener compatibles las integraciones. |
| P1 | Product declara envío gratis, devolución gratuita de 30 días y vencimiento de precio inventados; las condiciones dicen envío por separado y arrepentimiento de diez días. | Eliminar datos estructurados sin respaldo. |
| P1 | Búsquedas y combinaciones de filtros indexables; paginación canonicalizada a la primera página. | Indexar categorías/marcas reales y paginación propia; noindex en búsqueda y filtros combinados. |
| P1 | Sitemap incorpora categorías vacías y lastmod equivalente a la hora de cada petición. | Incluir sólo páginas comerciales con productos; omitir lastmod sin evidencia fiable. |
| P1 | Feed infiere marcas, publica identifier_exists=no indiscriminadamente, trata todo como nuevo y conserva caché hasta un día; hoy queda vacío al excluir todo el stock de proveedor. | Compartir la disponibilidad/condición real con la ficha, no inferir identificadores, fallar ante errores de datos y revisar requisitos de Merchant. |
| P1 | Reseñas, cinco estrellas, 1.500 envíos y despachos garantizados están escritos en código sin referencia verificable. | Sustituir prueba social sin evidencia por información comercial comprobable, preservando el lenguaje visual. |
| P2 | Titles extensos/duplicación de marca, afirmaciones de garantía oficial y originalidad genérica en metadata. | Metadata reutilizable y basada en cada producto, marca o categoría real. |
| P2 | Lookup del producto duplicado entre metadata y página; galería renderiza segunda imagen grande oculta. | Memoización por petición y carga de ampliación al abrir. |

## Accesos y límites iniciales

DNS y SSL responden, Vercel informa dominio verificado y sin conflictos DNS. Las herramientas conectadas permiten consultar el proyecto, pero la lectura de variables de entorno devuelve 403. Se utiliza el panel autenticado para la configuración que no expone el conector. No se presupone acceso a Search Console o Merchant Center ni aprobación de Google.

## Implementado

### Dominio, entornos e integraciones

- `myaimportaciones.com` está asociado al proyecto Vercel `myaimportaciones`, verificado, con DNS sin conflictos y HTTPS operativo. Se quitó la redirección del raíz hacia www; www ahora tiene redirección 308 al raíz.
- `NEXT_PUBLIC_SITE_URL` de **producción** fue reemplazada por `https://myaimportaciones.com`, con confirmación expresa del usuario para sustituir la variable pública heredada. Ninguna clave privada fue modificada. Las herramientas conectadas devolvieron 403 para variables; el cambio se completó en el panel autenticado.
- `site-origin.ts` mantiene una identidad oficial fija para los entornos alojados. Configuraciones antiguas, www, dominios ajenos y previews no pueden convertirse en canonical. Los callbacks de fixtures locales conservan localhost; `.env.example` usa localhost para desarrollo.
- La variable de **development** en Vercel se verificó como `http://localhost:3000` y se conserva; no existe una variante específica de esa variable para preview, que usa la normalización del código y noindex.
- Preview recibe `X-Robots-Tag: noindex, nofollow` por configuración del servidor. Sus metadatos apuntan a la identidad oficial. No se publicaron pruebas como nuevas páginas comerciales.
- Las páginas comerciales GET/HEAD del dominio Vercel anterior redirigen 308 a la misma ruta y parámetros del dominio nuevo. Los POST, endpoints API, callbacks y rutas privadas de sesión se conservan para compatibilidad con enlaces de pago y sesiones anteriores. Estas excepciones tienen noindex o control de acceso; no se ofrecen como páginas comerciales indexables.
- En Supabase se verificó Site URL `https://myaimportaciones.com` y se guardaron callbacks restringidos a `/auth/callback**` de ese dominio y del dominio Vercel anterior. El sufijo permite conservar los parámetros `next`; el código continúa validando el destino interno. No se agregaron comodines de host.
- Las preferencias nuevas de Mercado Pago derivan de la URL oficial. Los handlers de firmas, verificación del proveedor, moneda, idempotencia y conciliación no cambiaron. Los webhooks antiguos siguen atendiendo directamente. No se realizó un cobro real para probar SEO.
- Correo, vistas previas de correo, enlaces de productos compartidos, Open Graph, Twitter, schemas y sitemap usan la identidad nueva. No se activó Resend ni se inventó un remitente. El UID histórico del calendario del sorteo se conserva: es un identificador persistente, no un enlace que deba redirigir.
- Al cambiar de dominio los navegadores no trasladan automáticamente sesiones ni datos locales de un origen a otro. Puede ser necesario volver a ingresar. Las rutas privadas antiguas se preservan para reducir la interrupción.

### Metadata, indexación y renderizado

`seo.ts` centraliza title, description, canonical, robots, Open Graph y Twitter. Home tiene un título nacional breve, sin repetir la marca por la plantilla. Productos conservan sus nombres, modelos y presentaciones reales. La descripción individual usa información de la ficha o especificaciones existentes; no agrega prestaciones ni beneficios médicos.

Se conservan las rutas actuales del catálogo con parámetros descriptivos. No se crean rutas nuevas que dupliquen las categorías o marcas existentes. Cada categoría y marca con productos es indexable; tiene H1, enlaces HTML, descripción, breadcrumbs y productos renderizados en servidor. Las marcas incluyen navegación hacia sus categorías reales y las fichas enlazan a su marca. Las subcategorías aparecen también en los breadcrumbs estructurados.

| Tipo de URL | Indexación y canonical |
| --- | --- |
| `/catalogo` | Indexable, canonical propia. |
| `?category=...` con productos | Indexable, canonical de esa categoría. |
| `?brand=...` real | Indexable, canonical de esa marca. |
| Paginación comercial | Canonical propia con `page`; navegación Anterior/Siguiente en HTML. |
| Búsqueda `q`, familia/modelo, rangos, orden y categoría+marca | Noindex/follow; canonical normalizada, conservando la identidad de la consulta y su página. El orden no crea un canonical adicional. |
| Categoría/marca inexistente o vacía; página comercial fuera de rango | Not found, sin presentarlas como una colección comercial válida. |
| Producto inexistente | Not found desde metadata y página. |
| Administración, cuenta, login, registro, checkout, seguimiento y recuperación | Se conservan las restricciones de acceso y noindex existentes. |

Se resuelve metadata antes de enviar cabeceras (`htmlLimitedBots: /.*/`) para incluir las señales en HTML inicial y evitar decisiones tardías de 404 durante streaming. Esto puede aumentar TTFB respecto de enviar inmediatamente un shell vacío; se mide también LCP, no sólo el tiempo de las primeras cabeceras. El contenido para personas y robots es el mismo.

### Productos duplicados y calidad de datos

Se identificaron tres pares existentes: Medicube Zero Pore One Day Cream 50 ml, Shiseido Tsubaki Kit Premium Cool Repair 2 × 450 ml y Apple iPhone 16 128 GB azul ultramar A3287 HN/A. Se contrastaron título, modelo, presentación y condición antes de consolidar sus señales mediante canonical.

`seo-product-aliases.ts` define sus URLs preferidas. Los seis registros, precios, stock, acceso y slugs permanecen intactos. Las tres URLs secundarias no se envían al sitemap o feed. Si el registro preferido desaparece, se despublica o cambia la identidad, se recupera la canonical propia para evitar referencias incorrectas. No se aplican fusiones automáticas a variantes no verificadas.

La ficha corta `amoladora-20v-total` contiene referencias a 20 V y 900 W sin modelo suficiente. **Pendiente de evidencia comercial:** confirmar modelo y presentación antes de enriquecerla. No se reescribe con supuestos ni se modifican sus precios o publicación.

### Sitemap, robots y automatización

El sitemap se genera con todos los productos públicos mediante lecturas paginadas. Omite categorías vacías, privados, filtros infinitos, búsquedas y duplicados canónicos. No fabrica `lastmod` con la hora de cada visita: `updated_at` también puede reflejar cambios internos y no garantiza un cambio público relevante.

El rastreo local del catálogo actual verificó **523 URLs**: 460 productos canónicos, 42 categorías/subcategorías con productos, 16 marcas y cinco páginas generales. La cantidad cambia automáticamente con la publicación real del catálogo.

Robots apunta al sitemap oficial, permite recursos de renderizado y los feeds, y restringe administración, autenticación técnica y APIs privadas. Se quitaron bloqueos de rastreo de login/registro/checkout para permitir que los robots lean su noindex. Robots no reemplaza autenticación, RLS ni la autorización del servidor.

Los productos nuevos reciben automáticamente metadata, canonical, imagen social, alt descriptivo, Product/Offer, breadcrumbs, enlaces HTML y sitemap cuando están publicados. El editor actual incorpora título SEO y descripción SEO opcionales; se guardan en el JSON de especificaciones existente y se ocultan de la tabla técnica pública. Limpiarlos restaura el cálculo automático. No se creó un modelo paralelo ni se necesitó una migración de base de datos. La canonical no se expone como un campo libre que permita dominios externos.

### Datos estructurados y condiciones comerciales

- Organization contiene la identidad real, URL, logo, contactos y cuenta de Instagram. Se quitaron el Store duplicado con geolocalización genérica y señales que concentraban el SEO global en Tandil.
- WebSite conserva SearchAction porque `/catalogo?q=...` funciona; no se atribuye un beneficio de rich results a esa propiedad.
- Product y Offer comparten precio base ARS y disponibilidad con la ficha mediante la misma política de stock propio/proveedor. Se conserva la condición explícita de reacondicionados y activados, siguiendo la clasificación comercial existente.
- SKU sólo usa el código disponible. MPN requiere el atributo explícito `MPN`; no se convierte una familia de modelo o SKU interno en un identificador de fabricante. GTIN/EAN/UPC sólo se incorporan desde atributos existentes y con formato/dígito verificador válidos. Esa validación formal no prueba una asignación GS1 ni reemplaza su evidencia comercial.
- Se retiraron precio de vencimiento inventado, envío gratis, plazo fijo de entrega y política gratuita de 30 días. Las condiciones públicas no respaldaban esos valores. No se reemplazaron por otras tarifas o plazos supuestos; las condiciones legales permanecen intactas.
- No se publican AggregateRating ni puntuaciones inventadas. Se retiraron reseñas estáticas sin fuente, cinco estrellas, 1.500 envíos y despacho garantizado, conservando la estética de tarjetas y atención comercial. La FAQ y la ficha ya no afirman garantía oficial general ni que todos los productos estén sellados: existen variantes reacondicionadas y activadas.

### Merchant Center

El feed funcional está en `https://myaimportaciones.com/api/catalog/google-feed`; Meta reutiliza el mismo contrato comercial. Incluye IDs estables, título, descripción, marca real, categoría comercial, URL, foto, ARS, condición y disponibilidad. Se habilita únicamente cuando el checkout está habilitado. Actualmente genera 460 entradas canónicas; no inventa stock físico para los productos del proveedor. Se eliminan `identifier_exists=no` indiscriminado, marcas inferidas y una categoría propia presentada como taxonomía oficial de Google.

Ambos feeds responden sin caché de precios o stock, devuelven error de servicio si falla la lectura y no publican un catálogo vacío como si la sincronización hubiera funcionado. La condición y disponibilidad proceden de las mismas funciones que la ficha.

**Preparado técnicamente, sin aprobación externa:** para activarlo en Merchant Center se necesita acceso a la cuenta, verificar/reclamar el dominio y revisar el diagnóstico de cada producto. Los GTIN/MPN ausentes deben completarse con evidencia cuando el fabricante los haya asignado. No marcar que carecen de identificador sólo porque no está cargado.

**Pendiente de decisión comercial:** publicar los datos fiscales/domicilio que las condiciones todavía señalan pendientes y definir en Merchant Center transporte, tarifas, plazos y devoluciones reales. El envío se cotiza y paga por separado en la modalidad vigente: debe revisarse su compatibilidad con el checkout y las políticas de Google antes de solicitar activación de las fichas gratuitas. No se cambió esa modalidad para obtener una aprobación aparente.

### Rendimiento, imágenes y analítica

- Memoización dentro de una petición React para perfil, navegación pública y producto consultado desde página y metadata. No se comparte información de usuarios entre peticiones ni se cachean precios entre clientes.
- Carrusel con imágenes responsive de Next/Image: prioriza la primera y evita descargar todos los fondos ocultos al inicio. Mantiene composición, controles y movimiento reducido.
- La imagen grande del zoom de la ficha sólo se crea cuando se abre; se conservan dimensiones, alt, miniaturas, formatos y fallback. No se descargaron ni reemplazaron masivamente fotos del catálogo.
- Se mantienen analítica y scripts terceros detrás del consentimiento existente. La búsqueda del catálogo emite un evento al enviar el formulario, sin emitir otra búsqueda por cada cambio de orden o filtro. Se adapta `search_term` para GA4.
- ViewContent, AddToCart, InitiateCheckout y Purchase reutilizan las integraciones existentes; Purchase continúa dependiendo del estado confirmado del pedido y de su identificador. No se creó un segundo sistema de conversiones. Si se configura GA4/GTM, elegir una sola fuente para cada evento para evitar duplicación con medición mejorada.

Las medidas reproducibles de laboratorio están en los JSON de `docs/seo/qa-private/`. Antes del cambio: LCP aproximado de 1,44 s móvil y 1,14 s desktop en home; 1,26 s móvil y 1,05 s desktop en la ficha muestreada, con CLS 0 en esas cuatro navegaciones. Sin emulación de red/CPU; no equivalen al percentil 75 de usuarios reales ni certifican Core Web Vitals. INP de campo queda pendiente de datos CrUX/Search Console o RUM consentido; no se lo reemplaza por un clic sintético.

## Verificación

Los resultados se guardan fuera de Git en `docs/seo/qa-private/` y `docs/sorteos/qa-private/`.

| Comprobación | Estado |
| --- | --- |
| Tests de aplicación/SQL aislado y SEO | 116 aprobados. |
| Build y typecheck | Aprobados sobre el conjunto final antes de publicar. |
| ESLint | Sin errores; quedan advertencias históricas del repositorio. Se eliminó el error previo de Date.now en la ficha al retirar el vencimiento de precio inventado. |
| Rastreo local de sitemap | 523 URLs, sin fallos de HTTP/canonical ni títulos duplicados entre las URLs enviadas. |
| Sitemap/robots/feed XML | URLs oficiales, exclusiones, XML válido y 460 entradas de feed comprobados. |
| SSR y códigos HTTP | Contenido y precios en HTML, metadata individual, noindex de filtros y respuestas de inexistentes comprobados. |
| Navegador | Catálogo y ficha a 320/390/768/1280/1440; sin desborde ni errores JS; Axe sin infracciones en las reglas ejecutadas. |
| Carrito/checkout/login | Agregado y persistencia del carrito, acceso al checkout y login comprobados sin enviar pedidos ni cobros. |
| Sorteos | Regresión completa aprobada con base y participantes aislados: ensayo, importación, selector, revisión, exportación, repetición, idempotencia, responsive y accesibilidad. |
| Administración/stock/pagos | Se conservan guards, RLS, permisos y tests de contratos/SQL. La API privada rechaza visitantes. No se hizo una compra, un pago, un cambio real de stock ni un sorteo oficial como prueba. |
| Producción | Se comprueban el SHA desplegado, HTTPS, redirecciones y rutas con `scripts/verify-seo.mjs`; el resultado posterior al push queda en `production-verification.json`. |
| Validadores externos de Google | Pendientes de acceso/ejecución externa; parsear JSON-LD y revisar sus valores no equivale a aprobación de Rich Results o Merchant. |

Comandos: `npm test`, `npm run type-check`, `npm run lint`, `npm run build`, `npm run test:giveaway`, `node scripts/check-public-evidence.mjs`, `git diff --check` y `node scripts/verify-seo.mjs`. El verificador SEO permite `SEO_BASE_URL`, `SEO_BASELINE=1` para medir antes y `SEO_CRAWL=1` para recorrer todo el sitemap. Bloquea escrituras desde el navegador y terceros de analítica.

## Estado de Google y configuración restante

Se accedió a la propiedad de dominio `myaimportaciones.com` en Search Console con la cuenta del titular. Ya estaba creada: no se generó otra propiedad ni se publicó un token inventado. Rendimiento, indexación y experiencia muestran **datos en procesamiento**. Antes del despliegue de esta implementación, Sitemaps mostraba cero envíos. El sitemap se presenta después de verificar las URLs nuevas en producción; su resultado se incorpora al cierre de esta auditoría.

1. Conservar la propiedad de dominio existente y su verificación. Si se necesita verificar otra propiedad, usar el TXT exacto suministrado por Google en el DNS autoritativo, preservando MX y verificaciones existentes. No hay un token ficticio configurado.
2. Como alternativa para una propiedad de prefijo `https://myaimportaciones.com/`, usar su token real en `GOOGLE_SITE_VERIFICATION`; el layout ya admite la etiqueta. El método HTML no sustituye la verificación DNS de la propiedad de dominio.
3. Verificar también la propiedad antigua `https://myaimportaciones.vercel.app/` con la misma cuenta propietaria. Usar Cambio de dirección si la herramienta lo ofrece para esas propiedades a nivel de host y cumple sus requisitos; no confundirla con un simple cambio HTTP→HTTPS o una ruta parcial. No se afirmó haber enviado ese cambio.
4. Enviar `https://myaimportaciones.com/sitemap.xml`. Inspeccionar home, una categoría, una marca, una ficha y página 2: revisar HTML rastreado, canonical declarada/elegida y respuesta HTTP. Solicitar indexación de muestras relevantes, sin enviar indiscriminadamente cada filtro.
5. Seguir los informes Indexación de páginas, Sitemaps, Estadísticas de rastreo, Resultados de productos, Fichas de comerciantes y Core Web Vitals. Analizar rendimiento por consulta, página, dispositivo y país Argentina. La elegibilidad y la aparición efectiva dependen de Google.
6. Mantener las redirecciones públicas al menos un año y preferiblemente mientras existan enlaces antiguos. Revisar que los perfiles comerciales y campañas externas enlacen al dominio nuevo. No se enviaron mensajes a terceros ni se editaron cuentas sociales.
7. En Merchant Center verificar/reclamar el mismo dominio, completar identidad comercial y condiciones reales, conectar el feed por URL y revisar sus diagnósticos. No anunciar aprobación, Shopping activo o productos indexados hasta verificarlo en la cuenta.
8. Para GA4 utilizar el ID real y revisar consentimiento, parámetros, referencias de Mercado Pago y deduplicación de compras. Configurar dimensiones/objetivos con datos efectivos, no métricas inventadas.

## Matriz de intención nacional

Prioridades y competencia son hipótesis cualitativas de planificación, sin volúmenes, CPC ni posiciones comprobadas. Las URLs corresponden al catálogo real; no se crean páginas por ciudad.

| Consulta principal | Intención | URL objetivo | Prioridad | Contenido | Competencia estimada |
| --- | --- | --- | --- | --- | --- |
| Cosmética facial y corporal Argentina | Compra | `/catalogo?category=cosmetica-coreana` | Alta | Categoría y subcategorías | Alta |
| Sérums y ampollas faciales | Compra/comparación | `/catalogo?category=serums-ampollas` | Alta | Fichas y presentaciones | Alta |
| Protector solar facial | Compra | `/catalogo?category=proteccion-solar` | Alta | Presentaciones documentadas | Alta |
| Kits de skincare | Compra/regalo | `/catalogo?category=kits-de-viaje-k-beauty` | Alta | Contenido de cada kit | Media/alta |
| SKIN1004 Argentina | Marca/compra | `/catalogo?brand=SKIN1004` | Alta | Marca y modelos reales | Alta |
| Medicube Argentina | Marca/compra | `/catalogo?brand=Medicube` | Alta | Marca y fichas específicas | Alta |
| Karseell mascarilla capilar | Compra | `/catalogo?brand=Karseell` | Alta | Presentación y contenido | Alta |
| Shiseido Fino Hair Mask | Compra | `/catalogo?brand=Shiseido` | Alta | Fichas, Fino y Tsubaki diferenciados | Alta |
| Kérastase Argentina | Marca/compra | `/catalogo?brand=K%C3%A9rastase` | Media | Productos por línea real | Alta |
| Victoria's Secret body mist | Compra | `/catalogo?brand=Victoria%27s+Secret` | Media | Fragancia y volumen exactos | Alta |
| Herramientas Total Argentina | Marca/compra | `/catalogo?brand=Total` | Alta | Fichas por código | Alta |
| Herramientas Wadfow | Marca/compra | `/catalogo?brand=Wadfow` | Alta | Modelos y accesorios incluidos | Media/alta |
| Llaves de impacto a batería | Comparación/compra | `/catalogo?category=atornilladores-llaves-impacto` | Alta | Modelo y contenido del kit | Alta |
| Taladros y rotomartillos | Comparación/compra | `/catalogo?category=taladros-rotomartillos` | Alta | Especificaciones verificadas | Alta |
| Amoladoras y pulidoras | Compra | `/catalogo?category=amoladoras-pulidoras` | Media | Modelo, potencia y presentación | Alta |
| Apple iPhone modelo/capacidad | Compra específica | `/catalogo?brand=Apple` y ficha exacta | Media | SIM, región, color y condición | Alta |
| Samsung Galaxy modelo/capacidad | Compra específica | `/catalogo?brand=Samsung` y ficha exacta | Media | Modelo y presentación exactos | Alta |

## Plan de 30, 60 y 90 días

**0–30 días — Base técnica y observación:** verificar las propiedades de Google, enviar sitemap/cambio de dirección cuando sea aplicable, revisar rastreo/404/canonical, completar identidad fiscal y condiciones comerciales pendientes y confirmar la ficha ambigua de la amoladora. Revisar GTIN/MPN con fuentes de fabricante y completar únicamente identificadores exactos. Validar un ciclo autorizado de compra y entrega por separado del trabajo SEO.

**31–60 días — Captación:** usar consultas reales de Search Console para priorizar títulos y fichas con impresiones y bajo CTR. Revisar conversiones por marca/categoría, configurar Merchant si el negocio reúne sus requisitos y publicar pocos contenidos útiles basados en dudas reales, por ejemplo cómo leer el contenido de un kit de herramientas o comparar presentaciones de cuidado capilar, vinculados a productos existentes. Evitar recomendaciones médicas y páginas vacías.

**61–90 días — Crecimiento:** comparar evolución por dispositivo y Argentina, contrastar ventas verificadas con tráfico orgánico, mejorar categorías rentables y enlaces internos, revisar Core Web Vitals de campo y duplicados detectados por Google. Expandir contenido o categorías sólo con inventario y evidencia suficientes. No se prometen posiciones, tráfico ni aprobación.

## Archivos y recursos principales

| Archivos | Responsabilidad |
| --- | --- |
| `src/lib/site-origin.ts`, `site-redirect.ts`, `site.ts`, `src/proxy.ts` | Identidad, redirecciones compatibles y previews. |
| `next.config.ts` | Metadata resuelta antes de cabeceras para decisiones de indexación/404. |
| `src/lib/seo.ts`, `seo-product-aliases.ts`, `product-identifiers.ts` | Metadata, schemas, canonicals verificados e identificadores. |
| `src/app/layout.tsx`, `page.tsx`, `catalogo/page.tsx`, `producto/[slug]/page.tsx` | SEO global, home, marcas/categorías, productos y navegación real. |
| `src/app/sitemap.ts`, `robots.ts` | Descubrimiento e indexación. |
| `src/lib/merchant-feed.ts`, `src/app/api/catalog/{google,meta}-feed/route.ts` | Feeds consistentes sin datos inventados ni caché de precios. |
| `src/lib/admin-product.ts`, `src/components/admin/product-editor.tsx` | Personalización SEO opcional sobre el modelo existente. |
| `src/lib/storefront.ts`, `auth.ts` | Memoización por petición, sin compartir datos privados entre usuarios. |
| `src/components/commerce/product-gallery.tsx`, `storefront-sections.tsx` | Carga de imágenes y retiro de testimonios sin fuente. |
| `social-proof-section.tsx`, `store-seo-faq.tsx`, `product-detail-interactive.tsx`, `proforma-quote-modal.tsx` | Información comercial respaldada, sin métricas, garantía oficial o despacho inventados. |
| `src/components/commerce/catalog-search-controls.tsx`, `src/components/analytics/marketing-scripts.tsx` | Búsqueda medida por intención y consentimiento. |
| `src/lib/email-config.ts`, `src/components/admin/email-preview.tsx` | Enlaces públicos de correo con el dominio oficial. |
| `src/app/condiciones/page.tsx`, `privacidad/page.tsx` | Metadata individual sin cambiar condiciones legales. |
| `.env.example`, `.gitignore` | Configuración documentada y evidencia de QA privada. |
| `tests/seo.test.ts`, `tests/site.test.ts`, `scripts/verify-seo.mjs` | Regresiones, rastreo, responsive, contratos e informe reproducible. |
| `SEO_AUDIT.md` | Auditoría inicial, implementación, límites y seguimiento. |

## Fuentes oficiales consultadas

- [Google: migración de URLs](https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes?hl=es) y [Cambio de dirección](https://support.google.com/webmasters/answer/9370220).
- [Google: estructura de URLs de e-commerce](https://developers.google.com/search/docs/specialty/ecommerce/designing-a-url-structure-for-ecommerce-sites) y [canonical](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls).
- [Product y Merchant listings](https://developers.google.com/search/docs/appearance/structured-data/product), [identificadores de fabricante](https://support.google.com/merchants/answer/160161) y [requisitos de compra](https://support.google.com/merchants/answer/10249082).
- [Vercel: configuración de dominios](https://vercel.com/docs/domains) y [Supabase: redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls).
- Documentación incluida con Next.js 16.3.8: metadata, redirects, sitemap, robots y htmlLimitedBots. No se utilizaron recetas de otra versión para cambiar esas convenciones.
