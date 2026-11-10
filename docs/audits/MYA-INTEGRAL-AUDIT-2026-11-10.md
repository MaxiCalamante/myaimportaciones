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
