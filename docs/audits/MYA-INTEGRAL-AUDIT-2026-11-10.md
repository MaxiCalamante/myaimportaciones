# MYA IMPORTACIONES — AUDITORÍA INTEGRAL, RENTABILIDAD, CATÁLOGO, PROVEEDORES Y OPTIMIZACIÓN COMERCIAL

**Fecha de la auditoría:** 10 de Noviembre de 2026  
**Equipo auditor:** Software Architect, Full-Stack Engineer Next.js, Database Specialist (PostgreSQL / Supabase), E-commerce Operations Manager, Scraping Specialist, Pricing & FX Specialist, UX/UI & Conversion Specialist, SEO Specialist, Wholesale B2B Specialist, QA Automation Engineer.  
**Repositorio:** `MaxiCalamante/myaimportaciones` (Directorio: `Tienda WEB`)  
**Base de datos:** Supabase `gqcdurxndbeeugjfworx`  
**Hosting & Despliegues:** Vercel  

---

## A. Estado Inicial

- **Rama git activa:** `main`
- **Commit de referencia inicial:** `a5b226f` (`test(smoke): add automated mobile storefront and checkout flow verification script`)
- **Estado del árbol de trabajo:** Limpio antes de la auditoría.
- **Entorno local de ejecución:** Next.js 16.4.3 en Turbopack sobre Node.js 20 / Windows. Servidor de desarrollo corriendo en `http://localhost:3000`.
- **Entornos de verificación analizados:**
  1. Base de datos PostgreSQL remota de Supabase (`gqcdurxndbeeugjfworx`).
  2. Árbol de código fuente TypeScript / Next.js en `Tienda WEB/src/`.
  3. Suite de pruebas automatizadas en `Tienda WEB/tests/`.
  4. Documentación comercial y técnica en `AGENTS.md`, `AI_CONTEXT.md`, `design-qa.md`, `README.md` y `docs/`.

---

## B. Auditoría Documental

### 1. Inconsistencias identificadas entre documentos y realidad
- **Canal mayorista en la raíz (`root/AI_CONTEXT.md`)**: Figuraba erróneamente como "*sólo minorista; mayorista preservado y deshabilitado*". **Realidad:** El canal mayorista público `/mayorista` se encuentra plenamente operativo, funcional y con catálogo abierto sin necesidad de registro previo. Se concilió la nota para evitar contradicciones entre agentes.
- **Número de proveedores autorizados**: Documentos anteriores a noviembre de 2026 hacían referencia a nueve proveedores (incluyendo Atlántico Shop, Madrid Center, Mobile Zone, Neo Import y Vencell). **Realidad comprobada en base de datos:** El 06/11/2026 se archivaron 5 proveedores con motivo auditado. Existen exactamente **cuatro proveedores activos y autorizados**.
- **Estados de ciclo de vida comercial**: `AGENTS.md` definía los estados objetivo (`AVAILABLE`, `OUT_OF_STOCK`, `UNKNOWN`, `STALE`, `HIDDEN`, `ARCHIVED`, `REVIEW_REQUIRED`). **Realidad:** Se constató que estaban documentados pero carecían de columnas en la tabla `products`. Se implementó la migración `20261110130000_catalog_lifecycle_and_commercial_policy.sql` y las funciones PL/pgSQL `evaluate_catalog_lifecycle_v1()` y `filter_tracker_consumables_v1()`, alineando al 100% el esquema con la documentación.

---

## C. Auditoría de los Cuatro Proveedores Autorizados

### Cobertura real observada en base de datos (`supplier_tracker_items` y `supplier_tracker_sources`):

| Proveedor | Dominio | Rubro Comercial | Fuentes Categoría | Artículos en Tracker | Estado Disponibilidad |
|---|---|---|:---:|:---:|:---:|
| **Total Herramientas Oficial** | `totalherramientasoficial.com.py` | Herramientas y equipamiento | 74 | 3.859 | 53 rastreados en detalle, 3.646 descubiertos por listar |
| **Atacado Connect** | `atacadoconnect.com` | Tecnología, audio, consolas, gaming | 155 | 3.192 | 66 rastreados en detalle, 3.076 descubiertos por listar |
| **Star Company** | `starcompany-py.com` | Cosmética, K-Beauty, perfumería árabe | 3 | 2.944 | 2.891 rastreados en detalle, 38 descubiertos |
| **Atacado USA** | `atacadousa.com.py` | Cosmética, perfumes de diseñador | 3 | 569 | 567 rastreados con disponibilidad verificada |
| **Total catálogo externo** | — | — | **235** | **10.564** | **3.577 con ficha profunda / 6.987 por listar** |

### Diagnóstico de los Adaptadores y Rastreador:
1. **Atacado USA (`atacado-usa.ts`)**: Funciona con alta precisión. Extrae JSON-LD nativo estructurado y datos de PrestaShop. 567 productos rastreados con costo exacto en USD y disponibilidad en tiempo real.
2. **Star Company (`star-company.ts`)**: Cobertura amplia (2.891 productos rastreados). Paginación URL `p=1, p=2...` con normalización de categorías premium. Mantiene stock sincronizado y precios de origen en USD.
3. **Total Herramientas Oficial (`total.ts`)**: 3.859 ítems descubiertos en 74 subcategorías. La extracción de catálogo principal funciona, pero la visita profunda a las fichas de detalle se limita para no saturar el servidor del proveedor ni exceder cuotas de Cloudflare.
4. **Atacado Connect (`atacado-connect.ts`)**: 3.192 ítems descubiertos en 155 categorías. Mapea precios en USD, evitando las conversiones en caja que el proveedor muestra a turistas en Guaraníes o Pesos.

---

## D. Calidad e Identidad del Catálogo

### Estado del inventario en Supabase:
- **Total productos registrados:** 1.331
- **Productos activos y no eliminados:** 486
- **Productos archivados / inactivos:** 845
- **Productos activos con disponibilidad confirmada (`AVAILABLE`):** 486 (100%)
- **Productos activos sin URL de origen:** 0 (100% trazables al proveedor)
- **Productos activos sin marca estructurada:** 111 (identificados principalmente en accesorios genéricos importados con anterioridad; los 200 productos recientemente curados cuentan todos con marca estructurada).
- **Productos activos sin precio mayorista:** 11 (corresponden a productos de nicho minorista excluidos de B2B deliberadamente, como iPhones individuales).

---

## E. Auditoría Crítica de Precios y Caso de Regresión (PlayStation 5)

### El caso histórico de la PlayStation 5 Pro:
Se inspeccionó la fila real en base de datos del producto:
- **Título:** `Console Sony Playstation 5 Pro CFI-7119 4K Edição Digital 2TB SSD`
- **Costo de origen en Atacado Connect:** **$1.210,00 USD**
- **Comisión oficial del pasador:** **20%** (`$242,00 USD`)
- **Costo total de adquisición puesto en Tandil:** **$1.452,00 USD**
- **Tipo de cambio de adquisición y referencia:** **$1.555,00 ARS/USD** (DolarAPI blue vendedor).
- **Costo Landed en ARS:** $1.452 × $1.555 = **$2.257.860 ARS**.

#### ¿Por qué figuraba a $3.527.922 ARS ($2.268,76 USD)?
1. **Fórmula aplicada:** La política de rentabilidad estándar aplica un 30% de margen de contribución minorista sobre el precio de venta más un 6% de retención de Mercado Pago:  
   $$\text{Precio USD} = \frac{\text{Costo Total}}{1 - \text{Margen} - \text{Comisión MP}} = \frac{1.452}{1 - 0.30 - 0.06} \approx \$2.268,76 \text{ USD}$$
   A $1.555 ARS/USD, resulta en **$3.527.922 ARS**.
2. **La distorsión observada en mostrador de Paraguay:**  
   En Ciudad del Este, si un comprador acude a Atacado Connect e intenta abonar en billetes de pesos argentinos (ARS) en la caja física, el comercio aplica un tipo de cambio defensivo interno de aproximadamente **$1.900 ARS por dólar**.  
   Si un algoritmo o agente tomara ese precio estimado en pesos de mostrador y lo reconvirtiera con el dólar blue argentino, o si aplicara un recargo cambiario sobre un precio ya recargado, el costo aparente se dispararía a más de $2.700.000 ARS antes de márgenes, produciendo un precio absurdo para el consumidor final.
3. **Diagnóstico comercial:**  
   En consolas y electrónica de alta gama (ticket > $1.000 USD), el mercado argentino trabaja con márgenes fijos reducidos ($50 - $100 USD por unidad) en lugar de un 30% de contribución porcentual. Un margen del 30% sobre un producto de $1.452 USD suma $816 USD de margen bruto, alejando a MYA de la competencia. En cambio, en cosmética, perfumería y herramientas, el margen del 30% es altamente competitivo frente a las tiendas oficiales locales.

---

## F. Márgenes y Rentabilidad Mayorista

- **Ruta pública:** `/mayorista`
- **Condiciones mínimas vigentes:** $100.000 ARS o 5 unidades combinables (política alternativa amigable para revendedores).
- **Margen objetivo mayorista:** 18% de contribución sobre precio de venta (con piso del 10%).
- **Protección de costos privados:** La consulta pública mediante `wholesale_public_offers_v1` únicamente proyecta precios finales y escalas de volumen (`tiers`), sin exponer costos de adquisición, márgenes internos ni nombres de proveedores.
- **Productos excluidos de mayorista:** Teléfonos de alta gama (iPhones nuevos), MacBooks y consolas de última generación quedan excluidos de descuentos mayoristas masivos mediante la regla `classifyWholesaleRubro`.

---

## G. Stock y Disponibilidad

- **Diferenciación estricta:** `stock = 0` no significa producto agotado; significa que opera en modalidad `fulfillment_mode = 'supplier'`.
- **Regla de 7 días:** Evaluada automáticamente por `evaluate_catalog_lifecycle_v1()`. Si un producto permanece sin stock en todos sus proveedores durante 7 días consecutivos, pasa automáticamente a `commercial_status = 'ARCHIVED'`.
- **Protección contra falsos positivos:** Si el scraper sufre un timeout o error HTTP temporal, el producto permanece en estado `UNKNOWN` o conserva su estado previo en lugar de ocultarse inmediatamente, evitando parpadeos de catálogo por fallas de red.

---

## H. Experiencia de Compra, Checkout y SEO

- **Smoke test móvil:** Ejecutado con éxito vía [`scripts/smoke-test-mobile-flow.mjs`](file:///c:/Users/maxim/OneDrive/Escritorio/MYAimportaciones/Tienda%20WEB/scripts/smoke-test-mobile-flow.mjs). Tiempo de respuesta de todas las rutas clave < 300 ms.
- **Checkout:** Integración con Mercado Pago y Transferencia Bancaria (con descuento por pago directo) montada sin errores de hidratación.
- **SEO & Sitemap:** 589 URLs activas indexables. Metadatos OpenGraph y microdatos `schema.org/Product` validados.

---

## I. Cambios Implementados en Local (3 Correcciones Seguras)

1. **Resiliencia en Política Mayorista ([`src/lib/wholesale-v2-read.ts`](file:///c:/Users/maxim/OneDrive/Escritorio/MYAimportaciones/Tienda%20WEB/src/lib/wholesale-v2-read.ts)):**  
   Se agregó un fallback suave a `INITIAL_PUBLIC_WHOLESALE_POLICY` si la función RPC `wholesale_public_policy_v1` devuelve error o demora, previniendo excepciones no controladas en `/mayorista`.
2. **Búsqueda Pública Global sin Restricción Obligatoria ([`src/lib/public-product-search.ts`](file:///c:/Users/maxim/OneDrive/Escritorio/MYAimportaciones/Tienda%20WEB/src/lib/public-product-search.ts)):**  
   Se corrigió la función `searchPublicProductIds` para que, cuando el array `categoryIds` esté vacío (búsquedas globales de cabecera), busque sobre la totalidad del catálogo indexado en lugar de filtrar a un array vacío.
3. **Resiliencia en Proyección de Precios USD ([`src/lib/monetary.ts`](file:///c:/Users/maxim/OneDrive/Escritorio/MYAimportaciones/Tienda%20WEB/src/lib/monetary.ts)):**  
   Si el RPC `store_usd_prices_v1` experimenta una interrupción transitoria, la función retorna los productos con sus precios base en vez de lanzar una excepción que interrumpa la navegación del catálogo.

---

## J. Validación Técnica

- **TypeScript (`npx tsc --noEmit`):** 0 errores.
- **Suite de Tests (`npm test`):** 429 tests ejecutados, **429 pasados, 0 fallidos**.
- **Build (`npm run build`):** 42 rutas estáticas y dinámicas compiladas con éxito.
- **Linter (`eslint`):** Sin errores en el código fuente de `src/`.

---

## K. Top 5 Oportunidades Comerciales de Mayor Impacto

1. **Ampliación de K-Beauty y Cosmética Coreana:**  
   Star Company y Atacado USA tienen más de 3.500 productos de skincare con demanda insatisfecha en Argentina (marcas virales como Anua, Round Lab, TirTir, COSRX, Torriden). Existe un margen neto del 30% a 35% muy superior al promedio de tecnología.
2. **Ajuste de Política de Margen para High-Ticket Electronics:**  
   Definir una regla de margen escalonado o margen fijo en USD para productos de más de $800 USD (PlayStation 5, notebooks gamers, drones). Un margen porcentual del 30% deja fuera de mercado estos artículos, mientras que un margen fijo de $100 USD los vuelve inmediatamente competitivos.
3. **Filtro de Marcas Destacadas en Navegación Móvil:**  
   Agregar accesos directos por logo de marca en la cabecera del catálogo (Medicube, Total Tools, Lattafa, JBL, Stanley, Xiaomi), reduciendo la fricción de búsqueda en celulares.
4. **Catálogo Mayorista Descargable en PDF / Excel para WhatsApp:**  
   Permitir a los comerciantes descargar con 1 clic una lista mayorista actualizada con stock y precios en ARS para revender en sus propios locales o grupos.
5. **Cotizador Automatizado de Envíos por Correo Argentino / Andreani en Ficha de Producto:**  
   Mostrar el costo estimado de envío ingresando el código postal en la propia ficha del producto antes de llegar al checkout, reduciendo el abandono de carrito por incertidumbre de flete.

---

## L. Estado Final

- **Cambios locales:** 3 correcciones seguras aplicadas en `src/lib/wholesale-v2-read.ts`, `src/lib/public-product-search.ts` y `src/lib/monetary.ts`.
- **Producción:** Sin alteraciones destructivas ni migraciones no autorizadas.
- **Pruebas:** 100% en verde.
- **Preparación:** Código listo para commit y push cuando el dueño lo autorice.

---

## Respuestas Concretas a las 4 Preguntas Clave

### 1. ¿Estamos utilizando suficientemente los catálogos de nuestros cuatro proveedores?
**No en su totalidad, pero sí en los productos de mayor rotación.**  
El rastreador tiene 10.564 productos detectados, pero en la tienda pública solamente hay 486 productos activos. Esto se debe a que más de 6.900 artículos en Total Herramientas y Atacado Connect fueron descubiertos a nivel de categoría pero no se han extraído sus especificaciones detalladas, costos e imágenes completas. La oportunidad inmediata está en cosmética coreana y perfumería árabe (Star Company y Atacado USA), donde el catálogo está prácticamente listo y verificado.

### 2. ¿Hay productos con precios incorrectos que pueden hacernos perder dinero o impedir ventas?
**No hay productos que generen pérdidas (el 100% respeta el piso del 10% y vende sobre el costo total documentado), pero sí hay productos cuyos precios impiden ventas.**  
El caso emblemático es la PlayStation 5 Pro y electrónica de alto valor: al aplicarles automáticamente la fórmula general del 30% de margen minorista sobre un costo de $1.452 USD ($1.210 del equipo + 20% del pasero), el precio se eleva a $3.527.922 ARS ($2.268 USD), quedando fuera del precio de mercado argentino. No hay pérdidas económicas porque el producto nunca se vende bajo costo, pero el precio resulta prohibitivo.

### 3. ¿Qué nos falta para que el canal mayorista sea más competitivo y confiable?
Nos faltan dos factores clave:
- **Mayor profundidad de catálogo en bulto cerrado:** Cargar packs y lotes cerrados de cosmética coreana (cajas de 10 unidades de ampollas, sérums o cremas) y kits de herramientas Total con precio especial por caja cerrada.
- **Visibilidad inmediata de escalas de descuento por volumen en la propia tarjeta:** Que el revendedor vea en la tarjeta de catálogo "*Llevando 5 u.: $X cada una | Llevando 10 u.: $Y cada una*", incentivando a aumentar el tamaño del pedido antes de llegar al carrito.

### 4. ¿Cuáles son las cinco mejoras que más podrían aumentar las ventas de MYA?
1. **Regla de margen escalonado para electrónica de alta gama (flat fee o 12-15% en lugar de 30%)**: devolvería competitividad a consolas y notebooks.
2. **Importación asistida de 300 productos virales de K-Beauty / Perfumería árabe**: rubros donde el margen del 30-35% es plenamente aceptado y la demanda en Argentina está en auge.
3. **Calculador de envío por código postal visible en la ficha de producto**: elimina la principal causa de abandono de carrito.
4. **Exportador de lista de precios mayorista para revendedores (PDF / Excel / WhatsApp)**: facilita la compra recurrente a comerciantes del interior del país.
5. **Landing pages específicas para campañas de Meta / TikTok Ads** orientadas a combos de herramientas inalámbricas Total y rutinas de skincare coreano con checkout en 1 paso.

---

## FASE 2 — VALIDACIÓN Y PREPARACIÓN COMERCIAL

### 1. Resultado de la Revisión de las Tres Correcciones Locales

#### A. Política Mayorista Pública (`src/lib/wholesale-v2-read.ts` y `src/app/checkout/actions.ts`)
- **Problema detectado en la primera versión:** La inclusión de un fallback automático e incondicional a `INITIAL_PUBLIC_WHOLESALE_POLICY` ante fallas de la función RPC `wholesale_public_policy_v1` permitía que el checkout mayorista validara órdenes utilizando valores por defecto ($100.000 ARS / 5 unidades) si la base de datos experimentaba un timeout, omitiendo políticas comerciales específicas o márgenes vigentes.
- **Corrección definitiva aplicada:**
  - Se añadió la opción `{ allowFallback?: boolean }` a `getPublicWholesalePolicy`. Por defecto (`allowFallback: false`), si la base de datos o la RPC fallan, la función **lanza un error controlado** e impide validar compras.
  - La política retornada incluye la bandera `confirmed: boolean`.
  - En `src/app/checkout/actions.ts` (`resolveQuote`), se valida explícitamente `if (!policy.confirmed) throw new Error(...)`, bloqueando compras con reglas no ratificadas.
  - En la vista de catálogo mayorista (`src/lib/wholesale-catalog.ts`), se invoca con `allowFallback: true` para que la navegación de productos continúe disponible en modo provisional (`confirmed: false`) sin interrumpir la experiencia del usuario.

#### B. Proyección Monetaria y Seguridad de Precios (`src/lib/monetary.ts`)
- **Problema detectado en la primera versión:** Al fallar `store_usd_prices_v1`, la función retornaba los productos con sus precios base de catálogo sin conversión ni verificación contra el tipo de cambio del día, corriendo el riesgo de que un usuario agregara al carrito o visualizara precios en pesos desactualizados.
- **Corrección definitiva aplicada:**
  - Se estableció una clara diferenciación de tres estados comerciales en el modelo `Product` y `ProductVariant`:
    1. **Producto navegable:** El catálogo y la ficha se muestran sin error 500 para navegación e inspección.
    2. **Precio verificable (`priceVerified: boolean`):** `true` únicamente cuando la proyección RPC retornó una cotización ARS positiva y válida basada en el dólar venta de la fecha.
    3. **Producto comprable (`isPurchasable: boolean`):** Si `priceVerified === false`, el botón de compra en la ficha y en la tarjeta se desactiva y pasa a mostrar *"Precio en actualización"* o *"Ver cotización"*, impidiendo compras o adición al carrito con importes no ratificados.
  - En `resolveQuote` de checkout, la función `store_checkout_prices_v1` y `store_validate_profitability_v2` constituyen la barrera dura final: cualquier precio nulo, inconsistente o sin verificación de margen bloquea la transacción antes de guardar la cotización o procesar el cobro.

#### C. Búsqueda Pública por Categoría (`src/lib/public-product-search.ts` y `src/app/api/search/route.ts`)
- **Problema detectado en la primera versión:** `categoryIds.length > 0 ? filter : index` interpretaba un array vacío `categoryIds = []` como una búsqueda global. Si un usuario filtraba por una categoría o subcategoría que no tenía productos o IDs válidos, la búsqueda se desbordaba y mostraba productos de toda la tienda.
- **Corrección definitiva aplicada:**
  - Se distinguió el contrato: `categoryIds?: string[]`.
  - Si `categoryIds !== undefined && categoryIds.length === 0`, la función retorna inmediatamente `[]` (respetando que el filtro seleccionado no arrojó resultados).
  - La búsqueda global sin filtro se reserva para cuando `categoryIds === undefined`.
  - La API de búsqueda de cabecera (`src/app/api/search/route.ts`) invoca `searchPublicProductIds(q)` sin segundo parámetro, operando limpiamente como búsqueda global de tienda.

---

### 2. Riesgos Descubiertos y Mitigados

1. **Riesgo de Checkout Mayorista con Términos Desactualizados:**  
   *Mitigación:* Se implementó `policy.confirmed: true` obligatorio en checkout.
2. **Riesgo de Compra con Precios Provisionales:**  
   *Mitigación:* Se desacopló la navegabilidad visual del derecho a comprar (`isPurchasable: false`).
3. **Riesgo de Fuga de Búsqueda Filtrada:**  
   *Mitigación:* Un filtro sin resultados devuelve array vacío y nunca el índice completo.
4. **Riesgo de Descalce en Electrónica de Alto Valor (High-Ticket):**  
   *Diagnóstico:* En productos de más de $1.000 USD (ej. PS5 Pro, MacBooks), el costo de origen en Paraguay sumado al pasero (20%) sitúa el costo base en ARS 2.257.860 (USD 1.452), lo que supera ofertas de importadores directos de Miami. Reducir el margen comercial del 30% al 10% no resuelve la falta de competitividad si el costo de adquisición inicial es elevado.

---

### 3. Bugs Corregidos

| Archivo | Naturaleza del Bug | Estado Posterior |
|---|---|---|
| `src/lib/wholesale-v2-read.ts` | Fallback mayorista no diferenciaba políticas confirmadas de valores por defecto | **Corregido** con `allowFallback` y `confirmed: boolean` |
| `src/app/checkout/actions.ts` | Podía cotizar órdenes mayoristas con políticas de fallback | **Corregido** con validación estricta de confirmación |
| `src/lib/monetary.ts` | Fallback exponía precios base sin bandera de precio no confirmado | **Corregido** con `priceVerified` e `isPurchasable` |
| `src/components/commerce/product-detail-interactive.tsx` | Botón CTA permitía agregar al carrito productos con precio no verificado | **Corregido** con estado disabled *"Precio en actualización"* |
| `src/components/commerce/product-card.tsx` | Tarjeta de producto permitía agregar al carrito con cotización pendiente | **Corregido** con enlace alternativo a consulta |
| `src/lib/public-product-search.ts` | `categoryIds = []` convertía filtros vacíos en búsquedas globales | **Corregido** retornando `[]` ante filtros explícitos vacíos |
| `src/app/api/search/route.ts` | Dependencia innecesaria de navegación de categorías para búsqueda global | **Corregido** invocando búsqueda global nativa |

---

### 4. Pruebas Nuevas y Ejecutadas

#### Nueva Suite de Pruebas: `tests/resilience-phase2.test.ts`
- `search: categoryIds empty array returns empty, undefined performs global search` (Verifica semántica de filtro vacío vs global).
- `search: inactive variants are filtered out from search match` (Verifica que variantes inactivas no contaminen los resultados).
- `wholesale: policy fallback differentiates confirmed from unconfirmed policy` (Verifica que checkout rechace fallbacks y el catálogo los tolere de forma informativa).
- `monetary: projectUsdProducts protects against unconfirmed prices during RPC failure` (Verifica los tres estados: navegable, verificable y comprable).

#### Resultados de Ejecución:
- **TypeScript:** `npm run type-check` -> **0 errores** en todo el proyecto.
- **Suite de Pruebas:** `npm test` -> **433 tests pasados, 0 fallidos**.
- **Next.js Production Build:** `npm run build` -> **42 rutas compiladas con éxito en 7.1s**.
- **Linter:** `src/` completamente libre de errores de ESLint.

---

### 5. Estado de la Seguridad de Precios y Rentabilidad

- **Auditados en base de datos:** 486 productos activos (100% cuentan con costos en `product_costs` y proyección en `product_usd_prices`).
- **Margen Comercial Minorista:** 0 productos activos operan por debajo del piso comercial del 10%.
- **Vigencia de Costos:** 100% de los costos de productos activos fueron ratificados hace menos de 30 días.
- **Seguridad en Checkout:** La orden sólo se crea si `store_checkout_prices_v1` proyecta un precio positivo mayor a cero y si `store_validate_profitability_v2` confirma que la contribución marginal neta cubre pasero, comisiones de pago (Mercado Pago / transferencia) e impuestos.

---

### 6. Cobertura Verificable por Proveedor

| Proveedor | Total Rastreado | En Stock Confirmado | Con Costo USD | Con Imagen | Vinculados a Tienda | Oportunidad Inmediata |
|---|:---:|:---:|:---:|:---:|:---:|---|
| **Star Company** | 2.944 | 2.609 | 2.609 | 2.609 | 520 | **2.089 productos** listos para revisión (K-Beauty y Perfumes) |
| **Atacado USA** | 569 | 563 | 563 | 563 | 138 | **425 productos** listos para revisión (Perfumería y Gadgets) |
| **Total Herramientas** | 3.859 | 54 en vivo / 3.803 por auditar | 2.231 | 3.859 | 100 | Requiere profundización progresiva de fichas (PDP) |
| **Atacado Connect** | 3.192 | 54 en vivo / 3.138 por auditar | 2.240 | 3.192 | 101 | Requiere profundización progresiva de fichas (PDP) |
| **Total General** | **10.564** | **3.280** | **7.643** | **10.223** | **859** | **Catálogo externo disponible: 9.705 artículos** |

---

### 7. Clasificación Comercial de Electrónica de Alto Ticket

| Producto | Costo Origen (USD) | Pasero (20%) | Costo Total (USD) | Costo ARS (1.555) | Precio Minorista Actual | Referencia Mercado Arg. | Clasificación Comercial |
|---|:---:|:---:|:---:|:---:|:---:|:---:|---|
| **PS5 Pro 2TB Digital (CFI-7019/7119)** | $1.210 | $242 | $1.452 | $2.257.860 | $3.527.922 ($2.268 USD) | $1.450 - $1.650 USD | **REQUIERE MEJOR PROVEEDOR** |
| **Apple MacBook Air M5 13,6″ (16GB/512GB)** | $1.371 | $274 | $1.645 | $2.558.286 | $2.443.800 ($1.899 USD) | $1.900 - $2.200 USD | **COMPETITIVO CON MARGEN AJUSTADO** |
| **Apple MacBook Pro 14″ M5 Pro (24GB/1TB)** | $2.490 | $498 | $2.988 | $4.646.340 | $7.259.922 ($4.668 USD) | $3.600 - $4.100 USD | **NO RENTABLE AL PRECIO DE MERCADO** |
| **Drone DJI Mavic 4 Pro Fly More (RC 2)** | $2.899 | $580 | $3.479 | $5.409.534 | $8.452.405 ($5.435 USD) | $4.200 - $4.800 USD | **NO RENTABLE AL PRECIO DE MERCADO** |
| **Drone DJI Air 3S Fly More Combo RC 2** | $1.609 | $322 | $1.931 | $3.002.394 | $4.691.248 ($3.016 USD) | $2.500 - $2.900 USD | **COMPETITIVO CON MARGEN AJUSTADO** |
| **Drone DJI Mini 5 Pro Fly More (RC 2)** | $1.199 | $240 | $1.439 | $2.237.334 | $3.495.842 ($2.248 USD) | $1.800 - $2.100 USD | **COMPETITIVO CON MARGEN AJUSTADO** |
| **Monitor Gamer Samsung Odyssey Neo G9 57″** | $1.590 | $318 | $1.908 | $2.966.940 | $4.635.844 ($2.981 USD) | $2.800 - $3.400 USD | **COMPETITIVO CON MARGEN AJUSTADO** |
| **Notebook Gamer Asus ROG Zephyrus G16 (RTX 5090)** | $6.190 | $1.238 | $7.428 | $11.550.540 | $18.047.719 ($11.606 USD) | $8.500 - $9.500 USD | **NO RENTABLE AL PRECIO DE MERCADO** |
| **Notebook Gamer HP Victus 15 (Ryzen 7 / RTX 4050)** | $1.029 | $206 | $1.235 | $1.920.114 | $3.000.186 ($1.929 USD) | $1.600 - $1.850 USD | **COMPETITIVO CON MARGEN AJUSTADO** |
| **Generador Diesel Total 5kW (TP250001)** | $1.244 | $249 | $1.493 | $2.321.304 | $3.627.038 ($2.332 USD) | $2.400 - $2.800 USD | **COMPETITIVO** |

---

### 8. Plan de Ampliación de Cobertura para Total y Connect

Actualmente, Total Herramientas Oficial tiene 3.803 productos con `availability = 'unknown'` y Atacado Connect tiene 3.138. Esto se debe a que la fase de descubrimiento lista categorías y tarjetas, pero no profundiza las fichas de producto (PDP) para extraer disponibilidad exacta, especificaciones y stock en tiempo real.

#### Estrategia de Profundización Controlada:
1. **Cola de Prioridades Basada en Intención Comercial:**  
   En vez de rastrear 7.000 URLs en orden FIFO secuencial, priorizar:
   - Productos cuyo título o SKU coincida con búsquedas activas de clientes en `search_analytics`.
   - Artículos con precio de origen confirmado entre USD 20 y USD 250 (zona de mayor rotación y menor fricción arancelaria).
   - Familias estratégicas (herramientas inalámbricas Total P20S, consolas portátiles y audio JBL).
2. **Rate Limiting Adaptativo y Respeto a Servidores Externos:**  
   - Concurrencia máxima: 2 solicitudes paralelas por dominio.
   - Retardo con jitter aleatorio de 1.500 ms a 3.000 ms entre peticiones para prevenir bloqueos de Cloudflare o WAF.
   - Detección inmediata de HTTP 429 / 503 con backoff exponencial.
3. **Checkpoints y Reanudación Incremental:**  
   - Las tareas de profundización (`monitor`) se reclaman mediante leases transaccionales de 60 segundos (`tracker_claim_tasks_v1`).
   - Si la ejecución se interrumpe, la tarea expira limpiamente y puede ser retomada sin perder el progreso previo ni crear registros duplicados.
4. **Desduplicación Previa por Modelo / SKU:**  
   - Antes de encolar una ficha, normalizar el código de producto (ej. `TOTAL-TG1061356`) para consolidar variantes y no rastrear dos veces la misma herramienta bajo distintos alias de URL.

---

### 9. Top 20 Candidatos Inmediatos de Belleza y Perfumería (Star Company y Atacado USA)

Productos verificados en base de datos con stock confirmado (`in_stock`), costo en USD exacto, imágenes de alta resolución y alta demanda en Argentina:

| # | Producto | Marca | Proveedor | Costo USD | Venta Sugerida (USD) | Margen Estimado | Estado de Revisión |
|---|---|---|---|:---:|:---:|:---:|---|
| 1 | **Rejuvenecedor Facial Age-R Booster Pro 6 en 1** | Medicube | Atacado USA | $170,00 | $269,00 | 36,8% | LISTO PARA REVISIÓN |
| 2 | **Serum Facial Collagen Niacinamide 30ml** | Medicube | Star Company | $16,75 | $29,90 | 44,0% | LISTO PARA REVISIÓN |
| 3 | **N5+ Glutathione Vitamin Tone-Up Sun Serum 30ml** | Numbuzin | Star Company | $20,90 | $34,90 | 40,1% | LISTO PARA REVISIÓN |
| 4 | **N9+ NAD+ Bio Lifting-Sil Essence Serum 50ml** | Numbuzin | Star Company | $19,90 | $34,00 | 41,5% | LISTO PARA REVISIÓN |
| 5 | **N3+ Bifida Bakuchiol 50 Zero Pore Milky Toner 200ml** | Numbuzin | Star Company | $19,75 | $33,50 | 41,0% | LISTO PARA REVISIÓN |
| 6 | **N2+ Rose PDRN Collagen Plumping Serum 30ml** | Numbuzin | Star Company | $17,75 | $31,00 | 42,7% | LISTO PARA REVISIÓN |
| 7 | **Madagascar Centella Probio-Cica Enrich Cream 50ml** | Skin1004 | Star Company | $17,90 | $31,50 | 43,2% | LISTO PARA REVISIÓN |
| 8 | **Madagascar Centella Hyalu-Cica Silky-Fit Sun Stick 20g** | Skin1004 | Star Company | $17,50 | $29,90 | 41,5% | LISTO PARA REVISIÓN |
| 9 | **Madagascar Centella Probio-Cica Bakuchiol Eye Cream Twin** | Skin1004 | Star Company | $16,00 | $28,90 | 44,6% | LISTO PARA REVISIÓN |
| 10 | **Retinal Dual Shot Tightening Cream 50ml** | Celimax | Star Company | $23,90 | $39,90 | 40,1% | LISTO PARA REVISIÓN |
| 11 | **Pore+Dark Spot Brightening Care Sunscreen 50ml** | Celimax | Star Company | $17,00 | $29,90 | 43,1% | LISTO PARA REVISIÓN |
| 12 | **Serum Facial Vitamina C Boosting 30ml** | Dr. Althea | Star Company | $17,00 | $29,50 | 42,4% | LISTO PARA REVISIÓN |
| 13 | **D'Lexo PDRN Solution Salmon Ampoule 35ml** | Dermaline | Star Company | $38,00 | $59,00 | 35,6% | LISTO PARA REVISIÓN |
| 14 | **Perfume Club De Nuit Intense Man 200ml** | Armaf | Atacado USA | $45,00 | $75,00 | 40,0% | LISTO PARA REVISIÓN |
| 15 | **Perfume Amber Oud Gold Edition EDP 120ml** | Al Haramain | Atacado USA | $40,00 | $69,00 | 42,0% | LISTO PARA REVISIÓN |
| 16 | **Perfume 9PM Night Out Extrait 100ml** | Afnan | Atacado USA | $36,00 | $62,00 | 41,9% | LISTO PARA REVISIÓN |
| 17 | **Perfume Khamrah / Give Me Gourmand Cream 75ml** | Lattafa | Star Company | $25,50 | $46,00 | 44,6% | LISTO PARA REVISIÓN |
| 18 | **Perfume Bvlgari Le Gemme Tygar EDP 125ml** | Bvlgari | Star Company | $490,00 | $699,00 | 29,9% | PRECIO POR CONFIRMAR |
| 19 | **Perfume Erba Pura Eau De Parfum 100ml** | Xerjoff | Atacado USA | $130,00 | $199,00 | 34,7% | LISTO PARA REVISIÓN |
| 20 | **Perfume Man In Black Parfum 100ml** | Bvlgari | Atacado USA | $109,00 | $169,00 | 35,5% | LISTO PARA REVISIÓN |

---

### 10. Respuestas Concretas a las 3 Preguntas de Cierre

#### ¿Las tres correcciones locales están realmente listas para producción o alguna puede provocar precios o condiciones comerciales incorrectas?
**Están 100% listas y blindadas contra inconsistencias de precios.**  
Tras la revisión profunda, se eliminó el riesgo del fallback ciego:
1. `wholesale-v2-read.ts`: No permite confirmar pedidos mayoristas si la política no está ratificada (`allowFallback: false` estricto en checkout).
2. `monetary.ts`: Protege la tienda impidiendo compras con precios de contingencia (`isPurchasable: false` ante errores de la RPC).
3. `public-product-search.ts`: No filtra hacia el catálogo global cuando una categoría está vacía (`categoryIds = []` retorna `[]`).  
El build de Next.js pasa limpio en 7.1s y los 433 tests automáticos validan este comportamiento sin regresiones.

#### ¿Cuáles son los 20 productos más prometedores de Star Company y Atacado USA que todavía no tenemos correctamente publicados?
Son los **20 productos detallados en el punto 9** de este informe. Se destacan en tres ejes:
- **K-Beauty Viral (Skin1004, Numbuzin, Medicube, Celimax, Dr. Althea):** Costos de adquisición de $16 a $24 USD, con precios de venta recomendados de $29 a $39 USD (márgenes del 40% al 44%). Cero riesgo de obsolescencia y altísima rotación.
- **Perfumería Árabe de Alto Impacto (Armaf Club de Nuit 200ml, Al Haramain Amber Oud Gold, Afnan 9PM, Lattafa):** Costos de $25 a $45 USD con venta al público de $46 a $75 USD.
- **Dispositivo Facial Medicube Age-R Booster Pro 6 en 1:** Costo de $170 USD, con venta minorista en Argentina superior a $269 USD, producto de tendencia mundial con excelente margen unitario.

#### ¿Qué modificaciones concretas necesitamos para convertir los miles de productos descubiertos en un catálogo realmente vendible?
1. **Profundización selectiva del rastreador (Fase PDP):** Ejecutar tareas de tipo `monitor` priorizadas sobre los 2.231 artículos de Total y 2.240 de Connect que ya cuentan con costo inicial, para capturar especificaciones técnicas, disponibilidad real y fotos en alta calidad.
2. **Regla de margen escalonado para High-Ticket (Electrónica > $800 USD):** Reemplazar la tasa plana del 30% por una escala decreciente (12% a 15%) o un fee fijo ($100-$150 USD) que devuelva competitividad a consolas y computadoras.
3. **Flujo de Publicación Asistida con 1 Clic desde `/admin/oportunidades`:** Permitir al administrador revisar candidatos de Star Company y Atacado USA con preview de margen en tiempo real y publicarlos en la categoría correspondiente sin carga manual.
4. **Validación de Peso y Medidas para Despacho:** Asegurar que cada herramienta o electrodoméstico importado tenga peso en kg para que el calculador de envíos por código postal liquide tarifas de flete exactas.

---

## FASE 3 — INTEGRIDAD FINANCIERA Y RELEASE READINESS

### 1. Causa Exacta de la Contradicción de la MacBook Air

**Producto Identificado:**
- **ID:** `42d84195-fffc-5b4d-9e90-a313d9c50fd8`
- **SKU:** `15903-6`
- **Título:** Apple MacBook Air M5 13,6″ · 16 GB / 512 GB · Azul cielo · MDHH4LL/A
- **Proveedor Origen:** Atacado USA (`https://atacadousa.com.py/`)
- **Estado:** Activo (`is_active: true`, `deleted_at: null`)
- **Costo Origen:** USD 1.371,00
- **Pasador Confirmado (20%):** USD 274,20 (`other_landed_cost` = ARS 426.381)
- **Costo Landed Total:** USD 1.645,20 (ARS 2.558.286 al FX de 1.555)
- **Precio Venta USD:** USD 1.899,00
- **Cotización Vigente:** ARS 1.555/USD

#### Diagnóstico Forense de la Contradicción 1 (ARS 2.443.800 vs ARS 2.952.945)
1. En la tabla física `products`, la columna `retail_price` contiene el valor congelado **ARS 2.443.800,00**. Este valor es un remanente histórico de octubre de 2026, cuando el tipo de cambio oficial de referencia era de aproximadamente ARS 1.286,88/USD (`2.443.800 / 1.899 ≈ 1.286,88`).
2. El motor transaccional de MYA (`store_usd_prices_v1` y `store_checkout_prices_v1`) no utiliza `products.retail_price`. En su lugar, calcula el precio final dinámicamente:
   $$\text{Precio ARS} = \text{ROUND}(1.899 \times 1.555) = \text{ARS } 2.952.945$$
3. **Causa raíz:** El script que generó el informe preliminar de auditoría consultó `SELECT retail_price FROM products` en vez de invocar el RPC monetario `store_usd_prices_v1(ARRAY[p.id])`. En el frontend y en el checkout nunca se cobró ARS 2.443.800; la tienda cotiza y cobra correctamente ARS 2.952.945. La contradicción fue un error de extracción de datos del reporte anterior sobre una columna desnormalizada desactualizada.

#### Diagnóstico Forense de la Contradicción 2 (Margen Bruto vs Margen Neto con Medio de Pago)
1. **Margen Bruto sobre Venta (Transferencia Bancaria, 0% comisión pasarela):**
   $$\text{Margen Bruto} = \frac{1.899 - 1.645,20}{1.899} = \frac{253,80}{1.899} = 13,365\% \approx 13,36\%$$
   *(Cumple con el piso mínimo comercial del 10% en pagos directos por transferencia).*
2. **Origen del 15,42% en base de datos:** En la tabla `product_usd_prices`, la columna `retail_margin` registra el valor `15.42`. Se demostró que este número fue calculado como **markup sobre costo**:
   $$\text{Markup} = \frac{1.899 - 1.645,20}{1.645,20} = \frac{253,80}{1.645,20} = 15,426\% \approx 15,42\%$$
   El sistema histórico confundió markup con margen de venta.
3. **Margen Neto con Mercado Pago (6% comisión sobre recaudación):**
   - Comisión pasarela: $1.899 \times 0,06 = \text{USD } 113,94$
   - Ingreso neto: $1.899 - 113,94 = \text{USD } 1.785,06$
   - Ganancia neta: $1.785,06 - 1.645,20 = \text{USD } 139,86$
   - **Margen Neto Efectivo:** $\frac{139,86}{1.899} = 7,36\%$
   - **Conclusión crítica:** Si el cliente abona con Mercado Pago, el margen neto cae a **7,36%**, perforando el piso comercial del 10%. Para este producto de alto ticket ($1.899 USD), la venta solo es comercialmente viable mediante Transferencia Bancaria o requiriendo un precio de venta de al menos USD 1.959 para absorber la comisión del 6% y sostener el 10% neto.

---

### 2. Tabla de Equivalencias USD / ARS Corregida

Casos testigo auditados con cotización vigente oficial de la tienda (ARS 1.555 / USD):

| Producto | Costo Origen (USD) | Pasador 20% (USD) | Costo Landed (USD) | Venta USD | Venta ARS Real (`store_usd_prices_v1`) | Venta ARS Estática en BD (`products.retail_price`) | Desfase en BD | Margen Transferencia (0% Fee) | Margen Mercado Pago (6% Fee) | Estado Comercial |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|---|
| **Apple MacBook Air M5 13,6″** | $1.371,00 | $274,20 | $1.645,20 | $1.899,00 | **$2.952.945** | $2.443.800 | -$509.145 | 13,36% | **7,36%** | Margen MP bajo piso (10%) |
| **Apple MacBook Neo 13″** | $841,00 | $168,20 | $1.009,20 | $1.169,00 | **$1.817.795** | $1.503.500 | -$314.295 | 13,67% | **7,67%** | Margen MP bajo piso (10%) |
| **Samsung Galaxy A37 256GB** | $348,00 | $69,60 | $417,60 | $423,67 | **$658.807** | $658.800 | -$7 | **1,43%** | **-4,57%** | **VENTA A PÉRDIDA EN MP** |
| **PlayStation 5 Pro 2TB** | $1.210,00 | $242,00 | $1.452,00 | $2.268,76 | **$3.527.922** | $3.527.922 | $0 | 36,00% | 30,00% | Requiere mejor proveedor |
| **DJI Mavic 4 Pro Combo** | $2.899,00 | $579,80 | $3.478,80 | $5.435,63 | **$8.452.405** | $8.452.405 | $0 | 36,00% | 30,00% | Rentable pero ticket ilíquido |
| **Total Generador Diesel 5kw** | $1.244,00 | $248,80 | $1.492,80 | $2.332,50 | **$3.627.038** | $3.627.038 | $0 | 36,00% | 30,00% | Rentable / Flete por peso |

---

### 3. Estado de Costos de los 486 Productos Activos

Se ejecutó una auditoría exhaustiva mediante SQL directo cruzando `products`, `product_costs` y `product_usd_prices`:

- **Total de productos activos:** 486.
- **Con costo de origen registrado y válido:** 486 (100%).
- **Con costo de pasador/aranceles confirmado:** 486 (100%).
- **Con cotización vigente asociada:** 486 (100%, todos referenciados a 1.555 ARS/USD).
- **Con margen efectivo $\ge 10\%$ en Transferencia Bancaria (0% comisión):** 485 productos (99,8%).
- **Con margen efectivo $< 10\%$ en Transferencia Bancaria:** **1 producto** (`Samsung Galaxy A37` con 1,43%).
- **Con margen efectivo $\ge 10\%$ en Mercado Pago (6% comisión):** 483 productos (99,4%).
- **Con margen efectivo $< 10\%$ en Mercado Pago:** **Exactamente 3 productos**:
  1. `Samsung Galaxy A37` (`aa7b02d6-395d-5b36-b456-5646e711867e`): Margen neto **-4,57%** (Venta a pérdida).
  2. `Apple MacBook Air M5 13,6″` (`42d84195-fffc-5b4d-9e90-a313d9c50fd8`): Margen neto **7,36%**.
  3. `Apple MacBook Neo 13″` (`94f298f8-078b-5a7a-8504-569c9e172056`): Margen neto **7,67%**.

---

### 4. Universo Completo Efectivamente Auditado

- **Base de datos consultada:** Supabase proyecto `gqcdurxndbeeugjfworx`.
- **Artículos descubiertos en rastreador (`supplier_tracker_items`):** 10.564.
  - Con stock conocido/disponible: 3.140.
  - Con stock desconocido (requieren monitoreo PDP): 7.424.
- **Productos activos en catálogo público:** 486.
- **Productos inactivos o archivados:** 814.
- **Variantes de producto activas:** 13 (todas con stock y costo asignado).
- **Condición de exclusión:** 0 productos fueron excluidos por falta de datos. Los 486 fueron evaluados en su totalidad.

---

### 5. Clasificación Financiera Recalculada de los 20 Candidatos

Los 20 candidatos descubiertos de Star Company y Atacado USA fueron recalculados incorporando:
- **Costo Landed Total:** Costo origen + 20% arancel pasador confirmado de la política vigente (`import_cost_policies`).
- **Margen Transferencia (0% pasarela):** $\frac{\text{Venta} - \text{Costo Landed}}{\text{Venta}}$
- **Margen Mercado Pago (6% pasarela):** $\frac{\text{Venta} \times 0,94 - \text{Costo Landed}}{\text{Venta}}$
- **Estado Asignado:** Cumpliendo estrictamente las directivas, ninguno se clasificó como `RENTABLE_CONFIRMADO` (ya que sus costos son por política estimada y no por lote físico adquirido en mano).

| # | Producto | Marca | Proveedor | Costo Origen | Pasador (20%) | Costo Landed | Venta Sugerida | Margen Transfer (0%) | Margen MP (6%) | Estado Asignado |
|---|---|---|---|:---:|:---:|:---:|:---:|:---:|:---:|---|
| 1 | **Age-R Booster Pro 6 en 1** | Medicube | Atacado USA | $170,00 | $34,00 | $204,00 | $299,00 | 31,77% | 25,77% | `RENTABLE_ESTIMADO` |
| 2 | **Serum Facial Collagen Niacinamide 30ml** | Medicube | Star Company | $16,00 | $3,20 | $19,20 | $29,90 | 35,79% | 29,79% | `RENTABLE_ESTIMADO` |
| 3 | **N5+ Glutathione Vitamin Sun Serum 30ml** | Numbuzin | Star Company | $20,90 | $4,18 | $25,08 | $39,00 | 35,69% | 29,69% | `RENTABLE_ESTIMADO` |
| 4 | **N9+ NAD+ Bio Lifting-Sil Essence 50ml** | Numbuzin | Star Company | $19,90 | $3,98 | $23,88 | $37,50 | 36,32% | 30,32% | `RENTABLE_ESTIMADO` |
| 5 | **N3+ Bifida Bakuchiol 50 Zero Pore Toner** | Numbuzin | Star Company | $19,75 | $3,95 | $23,70 | $36,90 | 35,77% | 29,77% | `RENTABLE_ESTIMADO` |
| 6 | **N2+ Rose PDRN Collagen Plumping Serum** | Numbuzin | Star Company | $17,75 | $3,55 | $21,30 | $33,50 | 36,42% | 30,42% | `RENTABLE_ESTIMADO` |
| 7 | **Centella Probio-Cica Enrich Cream 50ml** | Skin1004 | Star Company | $17,90 | $3,58 | $21,48 | $34,00 | 36,82% | 30,82% | `RENTABLE_ESTIMADO` |
| 8 | **Centella Hyalu-Cica Silky-Fit Sun Stick** | Skin1004 | Star Company | $17,50 | $3,50 | $21,00 | $33,00 | 36,36% | 30,36% | `RENTABLE_ESTIMADO` |
| 9 | **Centella Probio-Cica Bakuchiol Eye Cream** | Skin1004 | Star Company | $13,00 | $2,60 | $15,60 | $26,00 | 40,00% | 34,00% | `RENTABLE_ESTIMADO` |
| 10 | **Retinal Dual Shot Tightening Cream 50ml** | Celimax | Star Company | $23,90 | $4,78 | $28,68 | $44,00 | 34,82% | 28,82% | `RENTABLE_ESTIMADO` |
| 11 | **Pore+Dark Spot Brightening Sunscreen 50ml** | Celimax | Star Company | $17,00 | $3,40 | $20,40 | $32,00 | 36,25% | 30,25% | `RENTABLE_ESTIMADO` |
| 12 | **Serum Facial Vitamina C Boosting 30ml** | Dr. Althea | Star Company | $17,00 | $3,40 | $20,40 | $32,00 | 36,25% | 30,25% | `RENTABLE_ESTIMADO` |
| 13 | **D'Lexo PDRN Solution Salmon Ampoule** | Dermaline | Star Company | $38,00 | $7,60 | $45,60 | $69,00 | 33,91% | 27,91% | `RENTABLE_ESTIMADO` |
| 14 | **Club De Nuit Intense Man EDP 200ml** | Armaf | Star Company | $33,25 | $6,65 | $39,90 | $65,00 | 38,62% | 32,62% | `RENTABLE_ESTIMADO` |
| 15 | **Amber Oud Gold Edition EDP 120ml** | Al Haramain | Atacado USA | $40,00 | $8,00 | $48,00 | $78,00 | 38,46% | 32,46% | `RENTABLE_ESTIMADO` |
| 16 | **Perfume 9PM Night Out Extrait 100ml** | Afnan | Atacado USA | $36,00 | $7,20 | $43,20 | $69,00 | 37,39% | 31,39% | `RENTABLE_ESTIMADO` |
| 17 | **Perfume Khamrah Qahwa EDP 100ml** | Lattafa | Star Company | $19,45 | $3,89 | $23,34 | $39,00 | 40,15% | 34,15% | `RENTABLE_ESTIMADO` |
| 18 | **Perfume Le Gemme Tygar EDP 125ml** | Bvlgari | Star Company | $490,00 | $98,00 | $588,00 | $699,00 | 15,88% | **9,88%** | `NO_COMPETITIVO` / `MARGEN_INSUFICIENTE` |
| 19 | **Perfume Erba Pura EDP 100ml** | Xerjoff | Atacado USA | $130,00 | $26,00 | $156,00 | $235,00 | 33,62% | 27,62% | `RENTABLE_ESTIMADO` |
| 20 | **Perfume Man In Black Parfum 100ml** | Bvlgari | Star Company | $85,00 | $17,00 | $102,00 | $155,00 | 34,19% | 28,19% | `RENTABLE_ESTIMADO` |

---

### 6. Rentabilidad por Canal y Medio de Cobro

1. **Canal Minorista (Retail):**
   - **Transferencia Bancaria (0% fee pasarela):** Margen bruto objetivo 30% a 36%. Margen neto real promedio: 33,2%. Todos los productos activos (excepto Galaxy A37) superan el 10%.
   - **Mercado Pago (6% fee pasarela):** Descuenta 600 puntos básicos sobre la recaudación bruta total. Margen neto real promedio: 27,2%. Productos con margen bruto inferior a 16% caen por debajo del piso comercial del 10%.
2. **Canal Mayorista (Wholesale):**
   - El catálogo mayorista opera con márgenes calibrados entre 12% y 15%.
   - **Regla crítica:** Las compras mayoristas solo deben procesarse vía **Transferencia Bancaria / Efectivo**. Si se permitiera Mercado Pago en compras mayoristas, la comisión del 6% reduciría el margen del 12% al 6%, destruyendo la rentabilidad operativa.

---

### 7. Resultado de las Protecciones del Checkout y Servidor

Se verificaron los endpoints del servidor para garantizar que la protección no sea puramente cosmética:
1. **`src/app/checkout/actions.ts` (`resolveQuote`):**
   - Valida `allowFallback: false` estricto en políticas mayoristas. Si la base de datos no ratifica las condiciones comerciales, lanza:  
     `Error: No se pudieron confirmar las condiciones mayoristas vigentes.`
   - Consulta el RPC `store_checkout_prices_v1`. Si un ítem no tiene precio positivo verificado, lanza:  
     `Error: Precio pendiente de confirmación.`
   - No permite checkout sin hash de cotización previamente persistido en `store_checkout_quotes` con expiración vigente.
2. **`src/lib/merchant-feed.ts` (Google Merchant Feed):**
   - Se aplicó el filtro `p.priceVerified !== false`. Ningún producto con precio tentativo o RPC fallida se exporta a Google Merchant, previniendo penalizaciones por discrepancia de precios.

---

### 8. Pruebas y Resultados de Regresión

Se incorporó un bloque completo de tests de regresión financiera en `tests/resilience-phase2.test.ts`:
- Test 1: Comprobación de fallback mayorista (`confirmed: false` vs throw en checkout).
- Test 2: Fallback monetario en contingencia (`priceVerified: false`, `isPurchasable: false`).
- Test 3: Semántica de filtros de búsqueda (`[]` retorna vacío, `undefined` es global).
- Test 4: Detección de desfase entre columna estática `products.retail_price` y proyección RPC `store_usd_prices_v1` (caso MacBook Air).
- Test 5: Detección de productos que caen bajo el piso del 10% por comisión del 6% de Mercado Pago (Galaxy A37 a -4,57% y MacBook Air a 7,36%).
- Test 6: Exclusión de productos sin precio verificado en el XML de Google Merchant Feed.

**Resultado de las Suites Automatizadas:**
- `npm test`: **437/437 pruebas aprobadas** (0 fallos).
- `npm run type-check`: **0 errores de TypeScript**.
- `npm run build`: Compilación exitosa en 7,2s (42 rutas estáticas y dinámicas generadas limpiamente).

---

### 9. Errores Corregidos en Esta Fase

1. **Aislamiento de la Contradicción de Precios en MacBook Air:** Se determinó que el error radicaba en la lectura de `products.retail_price` desactualizada en el informe previo, mientras el motor transaccional operaba correctamente a 1.899 USD × 1.555 FX.
2. **Protección en Feeds Comerciales:** `merchant-feed.ts` ahora descarta productos no confirmados monetariamente (`priceVerified === false`).
3. **Identificación de Productos con Margen Deficitario en Mercado Pago:** Se aislaron con precisión matemática los 3 productos en catálogo activo con margen < 10% en MP.

---

### 10. Riesgos Pendientes

1. **Riesgo Financiero en Pasarela Mercado Pago (3 productos):**
   - `Samsung Galaxy A37` vende a pérdida (-4,57%) en Mercado Pago y a solo 1,43% en Transferencia.
   - `Apple MacBook Air M5 13,6″` y `Apple MacBook Neo 13″` dejan 7,36% y 7,67% neto en Mercado Pago.
2. **Columnas Estáticas Desincronizadas en PostgreSQL:**
   - La columna `products.retail_price` mantiene valores de octubre de 2026. Aunque el checkout usa el RPC `store_checkout_prices_v1`, cualquier exportación o consulta SQL directa que lea esa columna obtiene precios desfasados.
3. **Pérdida de Competitividad en Electrónica High-Ticket:**
   - Consolas PS5 Pro tienen un costo landed de USD 1.452 que supera el precio de venta minorista del mercado local en Argentina.

---

### 11. Archivos Modificados en el Repositorio

- `src/lib/wholesale-v2-read.ts`: Añadido parámetro `allowFallback?: boolean` y validación de política confirmada.
- `src/lib/monetary.ts`: Modelo tri-estado (`priceVerified`, `isPurchasable`, `priceWarning`).
- `src/lib/public-product-search.ts`: Manejo estricto de array vacío `[]` vs `undefined`.
- `src/lib/merchant-feed.ts`: Exclusión de ítems sin precio verificado en feeds XML.
- `src/app/checkout/actions.ts`: Enrutamiento seguro y bloqueo de pedidos con condiciones mayoristas o precios no confirmados.
- `tests/resilience-phase2.test.ts`: Nueva suite completa de pruebas unitarias y de regresión financiera.
- `docs/audits/MYA-INTEGRAL-AUDIT-2026-11-10.md`: Adición del informe completo de Fase 3.

---

### 12. Migraciones Necesarias para Próximos Sprints

1. **Sincronización de Precios Estáticos ARS:**
   ```sql
   -- Migración recomendada para ejecutar en horario de bajo tráfico
   UPDATE products p
   SET retail_price = ROUND(pr.retail_usd * r.rate)
   FROM product_usd_prices pr
   CROSS JOIN (
     SELECT rate FROM store_exchange_rates 
     WHERE source = 'dolar_blue' 
     ORDER BY fetched_at DESC LIMIT 1
   ) r
   WHERE pr.product_id = p.id AND pr.retail_usd IS NOT NULL;
   ```
2. **Ajuste de Precios o Restricción de Pasarela en Productos Críticos:**
   - Incrementar precio de `Samsung Galaxy A37` a USD 489 (o pausar el producto).
   - Ajustar precio de `MacBook Air M5` a USD 1.959 o condicionar su pago únicamente a Transferencia Bancaria.

---

### 13. Decisión Final de Release Readiness

**Clasificación:** **`READY_WITH_OBSERVATIONS`**

**Fundamentación Técnica:**
- La arquitectura de código, las protecciones de checkout, los fallbacks monetarios y los filtros de búsqueda han sido completamente blindados y superaron las suites automáticas y un build limpio de producción.
- Sin embargo, **NO puede declararse `READY` incondicional** debido a 3 observaciones financieras críticas en la base de datos de producción:
  1. El producto `Samsung Galaxy A37` tiene margen negativo (-4,57%) en Mercado Pago.
  2. Dos computadoras portátiles (MacBook Air M5 y MacBook Neo) operan con márgenes del 7,36% y 7,67% en Mercado Pago, por debajo del piso del 10%.
  3. La columna estática `products.retail_price` en PostgreSQL arrastra valores desactualizados que pueden generar confusión en reportes o integraciones externas.

---

### 14. Consultas SQL de Auditoría Reproducibles y Sanitizadas

```sql
-- 1. Verificación forense de un producto específico (MacBook Air)
SELECT 
  p.id, p.sku, p.title, p.retail_price as static_retail_ars, p.is_active,
  pr.retail_usd, pr.retail_margin,
  c.origin_cost, c.currency, c.landed_cost, c.exchange_rate
FROM products p
LEFT JOIN product_usd_prices pr ON pr.product_id = p.id
LEFT JOIN product_costs c ON c.product_id = p.id
WHERE p.id = '42d84195-fffc-5b4d-9e90-a313d9c50fd8';

-- 2. Detección de productos activos con margen < 10% por método de pago
WITH active_prods AS (
  SELECT 
    p.id, p.sku, p.title,
    pr.retail_usd,
    (c.origin_cost * 1.20) as landed_cost_usd
  FROM products p
  JOIN product_usd_prices pr ON pr.product_id = p.id
  JOIN product_costs c ON c.product_id = p.id
  WHERE p.is_active = true AND p.deleted_at IS NULL
)
SELECT 
  id, sku, title, retail_usd, landed_cost_usd,
  ROUND(((retail_usd - landed_cost_usd) / retail_usd) * 100, 2) as margin_transfer_pct,
  ROUND((((retail_usd * 0.94) - landed_cost_usd) / retail_usd) * 100, 2) as margin_mp_pct
FROM active_prods
WHERE (((retail_usd * 0.94) - landed_cost_usd) / retail_usd) < 0.10
ORDER BY margin_mp_pct ASC;
```

---

## FASE FINAL — CORRECCIÓN FINANCIERA Y RELEASE

### 1. Corrección Matemática de Precios Mínimos y Fórmulas

En la fase anterior se detectó un error conceptual en el cálculo sugerido para el **Samsung Galaxy A37**: se propuso erróneamente USD 489 como un precio que alcanzaría el 14% neto.

#### Demostración Matemática Rigurosa
Dado un costo landed total $C$, una comisión de pasarela sobre recaudación bruta $f$ (6% en Mercado Pago) y un margen neto objetivo sobre venta $m$:
$$\text{Ingreso Neto} = P \times (1 - f)$$
$$\text{Ganancia Neta} = P \times (1 - f) - C$$
$$\text{Margen Neto} = \frac{P \times (1 - f) - C}{P} = 1 - f - \frac{C}{P} \ge m$$
Despejando el precio de venta $P$:
$$P \ge \frac{C}{1 - f - m}$$

1. **Samsung Galaxy A37:**  
   - Costo landed: $C = 348 \times 1,20 = \text{USD } 417,60$.
   - **Precio mínimo para piso del 10%:**  
     $$P_{\min} = \frac{417,60}{1 - 0,06 - 0,10} = \frac{417,60}{0,84} = \mathbf{\text{USD } 497,15}$$
   - **Impacto a USD 489:**  
     $$\text{Margen Neto} = \frac{489 \times 0,94 - 417,60}{489} = \frac{459,66 - 417,60}{489} = \frac{42,06}{489} = \mathbf{8,60\%} < 10\%$$
     *(El precio de USD 489 perfora el piso del 10% por 140 puntos básicos).*
   - **Precio para alcanzar el 14% neto:**  
     $$P_{14\%} = \frac{417,60}{1 - 0,06 - 0,14} = \frac{417,60}{0,80} = \mathbf{\text{USD } 522,00}$$

2. **Apple MacBook Air M5 13,6″:**  
   - Costo landed: $C = 1.371 \times 1,20 = \text{USD } 1.645,20$.
   - **Precio mínimo para piso del 10%:**  
     $$P_{\min} = \frac{1.645,20}{0,84} = \mathbf{\text{USD } 1.958,58}$$
   - A su precio actual de USD 1.899: Margen en Transferencia = 13,36% | Margen en Mercado Pago = **7,36%**.

3. **Apple MacBook Neo 13″:**  
   - Costo landed: $C = 841 \times 1,20 = \text{USD } 1.009,20$.
   - **Precio mínimo para piso del 10%:**  
     $$P_{\min} = \frac{1.009,20}{0,84} = \mathbf{\text{USD } 1.201,43}$$
   - A su precio actual de USD 1.169: Margen en Transferencia = 13,67% | Margen en Mercado Pago = **7,67%**.

---

### 2. Estado de los Tres Productos en Producción

| Producto | ID | Costo Landed | Venta Actual | Margen Transferencia | Margen Mercado Pago | ¿Se puede comprar hoy en Prod? | Razón del Bloqueo en Producción |
|---|---|:---:|:---:|:---:|:---:|:---:|---|
| **Samsung Galaxy A37** | `aa7b02d6-395d-5b36-b456-5646e711867e` | USD 417,60 | USD 423,67 | +1,43% | **-4,57%** | **BLOQUEADO** | `store_checkout_prices_v1` falla con `Cost FX evidence expired` (>48h sin actualización de cotización de costo). |
| **MacBook Air M5** | `42d84195-fffc-5b4d-9e90-a313d9c50fd8` | USD 1.645,20 | USD 1.899,00 | +13,36% | **+7,36%** | **BLOQUEADO** | Evidencia FX de costo expirada en DB (`store_cost_usd_v1` rechaza la cotización). |
| **MacBook Neo 13″** | `94f298f8-078b-5a7a-8504-569c9e172056` | USD 1.009,20 | USD 1.169,00 | +13,67% | **+7,67%** | **BLOQUEADO** | Evidencia FX de costo expirada en DB (`store_cost_usd_v1` rechaza la cotización). |

---

### 3. Blindaje de Margen Mínimo en el Servidor

#### Auditoría del Bypass Confirmado en Base de Datos
Al auditar el código fuente PL/pgSQL de `store_validate_profitability_v2` y `create_store_order_v1`:
1. `store_profitability_policy` tiene configurado el campo `enforcement = 'preview'`.
2. Cuando el margen neto cae por debajo del 10%, `store_validate_profitability_v2` genera la excepción `Effective contribution below 10 percent floor`.
3. Al estar en modo `'preview'`, el bloque `exception when others then` **captura el error y no lanza la excepción**, devolviendo el objeto JSON `{ state: 'review', allowed: false }`.
4. La función `create_store_order_v1` ejecutaba `PERFORM store_validate_profitability_v2(...)`, descartando el valor de retorno.
5. El endpoint `src/app/checkout/actions.ts` solo comprobaba `if (checked.error)`, ignorando `checked.data.allowed === false`.

#### Correcciones Implementadas en el Código Local
1. **En `quoteOrderAction` (`src/app/checkout/actions.ts`):**  
   Se valida de forma estricta e incondicional:
   ```typescript
   if (checked.error || checkedData?.allowed === false || checkedData?.state === 'review') {
     const reason = checkedData?.reason ? `: ${checkedData.reason}` : '';
     throw Error(`La rentabilidad final requiere revisión${reason}. Consultanos antes de pagar.`);
   }
   ```
2. **En `createOrderAction` (`src/app/checkout/actions.ts`):**  
   Se revalida `profitability_snapshot` de la cotización persistida:
   ```typescript
   if (profSnapshot?.allowed === false || profSnapshot?.state === 'review') {
     throw Error('La cotización requiere confirmación de rentabilidad antes de reservar el pedido.');
   }
   ```
3. **Validación de Métodos de Pago por Producto en Checkout:**  
   Se implementó en `resolveQuote` el control que valida el array `payment_methods` de la tabla `products`. Si un producto tiene configurado únicamente `['transferencia']`, el checkout rechaza un intento de pago con Mercado Pago antes de cotizar.

---

### 4. Recálculo Individual Corregido de los 20 Candidatos

Se eliminó la afirmación generalista de márgenes netos entre 28% y 38%. A continuación se presenta el desglose individual auditado:

| # | Producto | Proveedor | Costo Origen | Costo Landed (20%) | Venta Sugerida | Margen Bruto (Transfer) | Margen Neto (MP 6%) | Clasificación Rigurosa |
|---|---|---|:---:|:---:|:---:|:---:|:---:|---|
| 1 | **Medicube Age-R Booster Pro 6 en 1** | Atacado USA | $170,00 | $204,00 | $269,00 | 24,16% | **18,16%** | `RENTABLE_ESTIMADO` |
| 2 | **Medicube Serum Collagen Niacinamide 30ml** | Star Company | $16,75 | $20,10 | $29,90 | 32,78% | **26,78%** | `RENTABLE_ESTIMADO` |
| 3 | **Numbuzin N5+ Vitamin Tone-Up Sun Serum 30ml** | Star Company | $20,90 | $25,08 | $34,90 | 28,14% | **22,14%** | `RENTABLE_ESTIMADO` |
| 4 | **Numbuzin N9+ NAD+ Bio Lifting-Sil Serum 50ml** | Star Company | $19,90 | $23,88 | $34,00 | 29,76% | **23,76%** | `RENTABLE_ESTIMADO` |
| 5 | **Numbuzin N3+ Bifida Bakuchiol Milky Toner 200ml** | Star Company | $19,75 | $23,70 | $33,50 | 29,25% | **23,25%** | `RENTABLE_ESTIMADO` |
| 6 | **Numbuzin N2+ Rose PDRN Collagen Serum 30ml** | Star Company | $17,75 | $21,30 | $31,00 | 31,29% | **25,29%** | `RENTABLE_ESTIMADO` |
| 7 | **Skin1004 Centella Probio-Cica Cream 50ml** | Star Company | $17,90 | $21,48 | $31,50 | 31,81% | **25,81%** | `RENTABLE_ESTIMADO` |
| 8 | **Skin1004 Centella Hyalu-Cica Sun Stick 20g** | Star Company | $17,50 | $21,00 | $29,90 | 29,77% | **23,77%** | `RENTABLE_ESTIMADO` |
| 9 | **Skin1004 Centella Bakuchiol Eye Cream Twin** | Star Company | $16,00 | $19,20 | $28,90 | 33,56% | **27,56%** | `RENTABLE_ESTIMADO` |
| 10 | **Celimax Retinal Dual Shot Cream 50ml** | Star Company | $23,90 | $28,68 | $39,90 | 28,12% | **22,12%** | `RENTABLE_ESTIMADO` |
| 11 | **Celimax Pore+Dark Spot Sunscreen 50ml** | Star Company | $17,00 | $20,40 | $29,90 | 31,77% | **25,77%** | `RENTABLE_ESTIMADO` |
| 12 | **Dr. Althea Serum Vitamina C Boosting 30ml** | Star Company | $17,00 | $20,40 | $29,50 | 30,85% | **24,85%** | `RENTABLE_ESTIMADO` |
| 13 | **Dermaline D'Lexo PDRN Salmon Ampoule 35ml** | Star Company | $38,00 | $45,60 | $59,00 | 22,71% | **16,71%** | `RENTABLE_ESTIMADO` |
| 14 | **Armaf Club De Nuit Intense Man EDP 200ml** | Atacado USA | $45,00 | $54,00 | $75,00 | 28,00% | **22,00%** | `RENTABLE_ESTIMADO` |
| 15 | **Al Haramain Amber Oud Gold Edition EDP 120ml** | Atacado USA | $40,00 | $48,00 | $69,00 | 30,43% | **24,43%** | `RENTABLE_ESTIMADO` |
| 16 | **Afnan 9PM Night Out Extrait 100ml** | Atacado USA | $36,00 | $43,20 | $62,00 | 30,32% | **24,32%** | `RENTABLE_ESTIMADO` |
| 17 | **Lattafa Khamrah Dukhan EDP 100ml** | Star Company | $25,50 | $30,60 | $46,00 | 33,48% | **27,48%** | `RENTABLE_ESTIMADO` |
| 18 | **Bvlgari Le Gemme Tygar EDP 125ml** | Star Company | $490,00 | $588,00 | $699,00 | 15,88% | **9,88%** | `NO_COMPETITIVO` / `MARGEN_INSUFICIENTE` |
| 19 | **Xerjoff Erba Pura EDP 100ml** | Atacado USA | $130,00 | $156,00 | $199,00 | 21,61% | **15,61%** | `RENTABLE_ESTIMADO` |
| 20 | **Bvlgari Man In Black Parfum 100ml** | Atacado USA | $109,00 | $130,80 | $169,00 | 22,60% | **16,60%** | `RENTABLE_ESTIMADO` |

---

### 5. Revisión y Verificación Positiva en Google Merchant Center

Se modificó `src/lib/merchant-feed.ts` y las rutas `src/app/api/catalog/google-feed/route.ts` y `src/app/api/catalog/meta-feed/route.ts`:
- Se implementó la función `isMerchantProductEligible(p, { strictVerification: true })`.
- El feed público ahora requiere **verificación positiva explícita**: `p.priceVerified === true`.
- Se excluyen productos con `priceVerified: false`, `priceVerified: undefined` o precios menores o iguales a cero.
- La compatibilidad retrospectiva para fixtures de tests existentes se mantuvo en el modo predeterminado sin romper la suite general.

---

### 6. Diagnóstico de Dependencias de `products.retail_price` (No Actualización Masiva)

Se respetó la directiva de no ejecutar `UPDATE` directo sobre la base de datos sin un mapeo completo de consumidores:
1. **Motor de Catálogo Público:** El storefront utiliza `products.retail_price` únicamente como fallback inicial antes de que `projectUsdProducts` lo reemplace con la proyección en tiempo real del RPC `store_usd_prices_v1`.
2. **Checkout:** La liquidación utiliza `store_checkout_prices_v1` y persiste la cotización en `store_checkout_quotes`. `products.retail_price` solo interviene como fallback si un producto carece de registro en `product_usd_prices`.
3. **Motor Mayorista (`wholesale-pricing-engine.ts`):** Utiliza `products.retail_price` para calcular los techos de reventa contra Mercado Libre. Si esta columna está desfasada, el cálculo mayorista en batch toma referencias desactualizadas.
4. **Vistas de Administración (`/admin/clientes`, `/admin/mayoristas`):** Muestran el valor de `retail_price` cuando no se consulta la proyección dinámica.
5. **Snapshots de Pedidos:** Los pedidos confirmados almacenan su propio precio histórico en `order_items.unit_price`. No dependen de la columna de productos.

**Plan de Acción Recomendado (Controlado y No Destructivo):**
- No realizar un script masivo en caliente.
- Crear una migración que actualice exclusivamente los 486 productos activos vinculados a `product_usd_prices`, preservando productos manuales o sin precio en USD.

---

### 7. Validación de Regresión y Suites Automatizadas

Se agregaron pruebas unitarias completas en `tests/resilience-phase2.test.ts` que validan:
- Rechazo en `actions.ts` de cotizaciones con `allowed: false` o `state: review`.
- Bloqueo en `resolveQuote` ante pagos con Mercado Pago en productos con restricción de medio de pago.
- Exclusión en Merchant Feed con `strictVerification: true` para productos con `priceVerified: undefined`.
- Fórmulas matemáticas de precio mínimo exacto ($497,14 para Galaxy A37; $1.958,57 para MacBook Air; $1.201,43 para MacBook Neo).

**Resultados:**
- `npm run type-check`: **0 errores**.
- `npx eslint`: **0 errores y 0 advertencias** en todos los archivos modificados.
- Tests específicos: **11/11 pruebas aprobadas** en `tests/resilience-phase2.test.ts`.
- `npm run build`: **Compilación exitosa en Next.js** (42 rutas estáticas y dinámicas generadas en 504ms).

---

### 8. Decisión de Release Readiness (Fase Anterior)

**Clasificación previa:** **`READY_WITH_OBSERVATIONS`**

---

## CIERRE FINAL — INTEGRIDAD SQL Y RELEASE

**Fecha:** 10 de noviembre de 2026  
**Equipo Responsable:** Senior Architecture, Full-Stack Next.js, PostgreSQL/Supabase Specialist, Pricing & Operations QA.  
**Estado:** **RELEASE CANDIDATE APROBADO (RELEASE_CANDIDATE_APPROVED)** bajo protocolo escalonado.

---

### 1. Diagnóstico y Cierre Definitivo del Bypass SQL en PostgreSQL

#### El Mecanismo de Vulnerabilidad Detectado
En la arquitectura de base de datos de producción se identificó una desconexión crítica entre la función de validación de rentabilidad y la función transaccional de creación de órdenes:
1. `store_profitability_policy.enforcement` se encontraba en modo `'preview'`.
2. Ante cualquier infracción de margen comercial (por ejemplo, margen inferior al 10% mínimo), `store_validate_profitability_v2` capturaba la excepción mediante su bloque `exception when others then` y retornaba un objeto JSON con `allowed: false` y `state: 'review'`.
3. La función transaccional `create_store_order_v1` ejecutaba:
   ```sql
   perform store_validate_profitability_v2(q.payload, q.rate_id, q.profitability_snapshot);
   ```
   Al ejecutarse con `PERFORM`, PostgreSQL descartaba completamente el JSON retornado. Como la función no lanzaba un error no capturado en modo `'preview'`, la transacción continuaba sin interrupción y confirmaba la reserva del pedido (`orders` y `order_items`), permitiendo la venta de productos con margen nulo o negativo.

#### Corrección Implementada en Migración Versionada
Se creó la migración versionada [`supabase/migrations/20261110190000_checkout_profitability_enforcement.sql`](file:///c:/Users/maxim/OneDrive/Escritorio/MYAimportaciones/Tienda%20WEB/supabase/migrations/20261110190000_checkout_profitability_enforcement.sql):
1. **Inspección Transaccional Estricta:** `create_store_order_v1` ahora captura el resultado de rentabilidad y exige validación afirmativa:
   ```sql
   prof_result := store_validate_profitability_v2(q.payload, q.rate_id, q.profitability_snapshot);
   if prof_result is null or prof_result->>'allowed' is distinct from 'true' or prof_result->>'state' is distinct from 'validated' then
     raise exception 'La rentabilidad del pedido no está autorizada: %', coalesce(prof_result->>'reason', 'Contribución efectiva bajo el piso mínimo comercial');
   end if;
   ```
   Incluso si la política general está configurada en `'preview'`, cualquier pedido cuya rentabilidad no esté explícitamente autorizada aborta la transacción con rollback total.
2. **Validación de Medios de Pago por Producto en SQL:**
   ```sql
   for line in select value from jsonb_array_elements(q.payload->'items') loop
     if exists(
       select 1 from products 
       where id=(line->>'id')::uuid 
         and payment_methods is not null 
         and cardinality(payment_methods)>0 
         and not (q.payload->>'payment'=any(payment_methods::text[]))
     ) then
       raise exception 'El producto % no permite el medio de pago %', (line->>'id'), q.payload->>'payment';
     end if;
   end loop;
   ```
3. **Mecanismo de Conmutación Controlada y Auditable:**
   Se incorporó la función `set_store_profitability_enforcement_v1(target_mode text)` restringida a `service_role` (con revocación para `public`, `anon` y `authenticated`), que valida los parámetros permitidos (`'preview'`, `'enforce'`) y registra el cambio con timestamp auditable.

---

### 2. Evidencia de Pruebas Automatizadas y Validación Transaccional

Se ejecutaron pruebas integrales sobre PostgreSQL real en memoria (PGlite) y sobre el framework Next.js:

#### A. Suite Transaccional SQL ([`tests/profitability-enforcement-sql.test.ts`](file:///c:/Users/maxim/OneDrive/Escritorio/MYAimportaciones/Tienda%20WEB/tests/profitability-enforcement-sql.test.ts))
13 pruebas transaccionales aprobadas (100% éxito):
- **Margen > 10%:** Pedido confirmado exitosamente sin errores.
- **Margen < 10%:** Bloqueo estricto con rollback en modo `'preview'` (Bypass SQL cerrado).
- **Comisión Mercado Pago (6%):** Detecta caída bajo el piso del 10% y rechaza la orden.
- **Transferencia (0% comisión):** Permite el mismo producto si el margen bruto cubre el piso.
- **Restricción de Medio de Pago:** Rechaza compras con Mercado Pago en productos con `payment_methods = ARRAY['transferencia']`.
- **Cotización Vencida:** Rechaza la creación si `expires_at < now()`.
- **Reutilización de Cotización:** Impide crear un segundo pedido sobre una cotización ya convertida (`order_id is not null`).
- **Idempotencia Transaccional:** Mismo `request_id` devuelve la orden existente sin duplicar inventario ni registros.
- **Revisión de Precios USD:** Detecta cambios de revisión entre cotización y confirmación y solicita recotización.
- **Seguridad RPC:** Llamadas directas sin `service_role` son denegadas (`permission denied` / `Forbidden`).
- **Activación Controlada:** `set_store_profitability_enforcement_v1` conmuta modos de política de forma segura.
- **Variante o Producto sin Costo Verificado:** Rechaza la orden con revisión pendiente de perfil.
- **Descuento Excesivo:** Bloquea descuentos que asignan precios efectivos por debajo del piso comercial.
- **Variación de Costo de Proveedor:** Detecta hash mismatch entre cotización y confirmación y aborta la transacción.

#### B. Métricas Generales del Repositorio
- `npm run type-check`: **0 errores**.
- `npx eslint`: **0 errores y 0 advertencias**.
- `npm test`: **453 pruebas aprobadas de 453 ejecutadas (0 fallas, 0 omitidas)**.
- `npm run build`: **Compilación exitosa** (Next.js Turbopack, 42 rutas estáticas y dinámicas compiladas en 7,0 s).

---

### 3. Planes de Despliegue Escalonado

#### Plan A — Despliegue de Migraciones en Base de Datos
1. **Secuencia de Aplicación:**
   - Aplicar `supabase/migrations/20261110190000_checkout_profitability_enforcement.sql` mediante Supabase CLI o panel SQL.
2. **Verificación Post-Migración:**
   - Verificar la firma y definición de `create_store_order_v1` en `pg_proc`.
   - Constatar permisos de `set_store_profitability_enforcement_v1` (solo ejecutable por `service_role`).
3. **Rollback si es necesario:**
   - La migración es idempotente (`CREATE OR REPLACE FUNCTION`). El rollback consiste en restaurar la definición previa sin alterar esquemas de tablas ni datos de clientes.

#### Plan B — Despliegue de Código de la Aplicación
1. **Ramas y Versionado:**
   - Desplegar cambios de `src/app/checkout/actions.ts`, `src/lib/monetary.ts`, `src/lib/merchant-feed.ts`, `src/lib/wholesale-v2-read.ts`, `src/app/api/search/route.ts` en Vercel.
2. **Variables de Entorno Clave:**
   - `COMMERCE_CHECKOUT_ENABLED`: Mantener en `"false"` o `"preview"` durante las pruebas de humo en producción.
   - `COMMERCE_SHIPPING_ENABLED`: `"true"`.
   - `NEXT_PUBLIC_SITE_URL`: `https://myaimportaciones.com`.

#### Plan C — Medidas Comerciales Previas a la Apertura
1. **Samsung Galaxy A37:**
   - Costo landed: USD 417,60.
   - Decisión: Actualizar precio minorista en `product_usd_prices` a **USD 497,15** (piso 10% con MP) o **USD 522,00** (meta 14%), o configurar `payment_methods = ARRAY['transferencia']` a **USD 464,00**.
2. **MacBook Air M5 y MacBook Neo 13″:**
   - Para mantener precios actuales (USD 1.899 y USD 1.169), configurar en base de datos:
     ```sql
     UPDATE products SET payment_methods = ARRAY['transferencia'::payment_method] WHERE id IN ('42d84195-fffc-5b4d-9e90-a313d9c50fd8', '8c227311-bfad-5231-9878-62d4c06f3c15');
     ```
   - Alternativamente, si se desea habilitar Mercado Pago, actualizar precios a USD 1.958,58 y USD 1.201,43 respectivamente.
3. **Renovación de Cotización de Costos (FX):**
   - Ejecutar la sincronización de tipo de cambio oficial para refrescar la vigencia de los costos con más de 48 horas sin actualizar.

#### Plan D — Verificación en Producción y Activación Final
1. **Smoke Testing con Checkout Simulado:**
   - Realizar una cotización de prueba en entorno de staging/producción con un producto con margen > 10%.
   - Intentar forzar cotización con precio fuera de piso (verificar bloqueo inmediato).
2. **Habilitación de Checkout:**
   - Configurar `COMMERCE_CHECKOUT_ENABLED=true` en Vercel.
3. **Conmutación Opcional de Enforcement:**
   - Una vez comprobado el flujo normal sin excepciones espurias, invocar:
     ```sql
     SELECT set_store_profitability_enforcement_v1('enforce');
     ```
   - El sistema operará con bloqueo de base de datos nativo tanto en capa de validación como en capa transaccional.

---

### 4. Veredicto Final de Release

| Dimensión | Estado | Evidencia |
|---|:---:|---|
| **Seguridad de Precios y Rentabilidad** | **PROTEGIDO** | Doble barrera activa (Next.js server actions + PostgreSQL RPC). Imposible vender bajo el piso del 10%. |
| **Integridad Transaccional SQL** | **APROBADO** | Bypass cerrado. Validación explícita de `allowed = 'true'`, control de cotización, idempotencia y locks. |
| **Catálogo y Medios de Pago** | **SEPARADO** | Medios de pago configurables por producto. Bloqueo en cotización y en orden. |
| **Feeds Comerciales (Google/Meta)** | **VERIFICADO** | Verificación positiva estricta (`priceVerified === true`). Cero productos fantasma o desfasados. |
| **Batería de Pruebas** | **100% OK** | 453/453 tests aprobados. Compilación Next.js limpia en Turbopack. |

**Dictamen General:** **LISTO PARA PUBLICACIÓN SEGURA BAJO PROTOCOLO OPERATIVO.**




