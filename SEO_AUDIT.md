# MYA Importaciones — SEO Audit & Growth

> Auditoría, arquitectura SEO y estrategia de posicionamiento orgánico.
>
> Última revisión de referencia: 10/11/2026.
>
> Dominio oficial: https://myaimportaciones.com
>
> Mercado objetivo: Argentina.
>
> Idioma principal: español argentino.
>
> Stack: Next.js 16, React 19, Supabase y Vercel.
>
> Este documento contiene las reglas SEO vigentes, el estado técnico observado, los pendientes y los criterios de verificación. Las métricas históricas no representan necesariamente el estado actual.

---

## 1. Objetivo SEO

El objetivo de MYA Importaciones es captar tráfico orgánico relevante que se convierta en consultas, pedidos y ventas.

La estrategia debe favorecer el crecimiento comercial sostenible, no solamente aumentar la cantidad de páginas indexadas.

### Prioridades

1. Posicionar productos que realmente podemos comercializar.
2. Atraer compradores minoristas en Argentina.
3. Captar emprendedores y revendedores mayoristas.
4. Mejorar la visibilidad de marcas y categorías relevantes.
5. Mantener información correcta sobre precios y disponibilidad.
6. Evitar páginas duplicadas, vacías o de baja calidad.
7. Mejorar la experiencia móvil y el rendimiento.
8. Obtener métricas verificables mediante Search Console y analítica.

**Principio central: el SEO debe reflejar el catálogo comercial real y no generar páginas artificialmente para captar visitas.**

---

## 2. Alcance comercial

MYA vende principalmente:

- Cosmética coreana y skincare.
- Perfumería y fragancias.
- Cuidado capilar.
- Electrónica y tecnología.
- Herramientas y equipamiento profesional.

Opera desde Tandil, Buenos Aires, con alcance comercial nacional.

### Públicos objetivo

**Minorista:** personas que buscan comprar productos específicos.

**Mayorista:** comercios, emprendedores, revendedores, profesionales y tiendas online.

### Estrategia geográfica

Priorizar búsquedas comerciales orientadas a Argentina.

No construir decenas de páginas duplicadas del tipo:

- Cosmética coreana en Córdoba.
- Cosmética coreana en Rosario.
- Cosmética coreana en Mendoza.

Crear contenido geográfico específico únicamente cuando exista un servicio, propuesta o información diferencial auténtica para esa ubicación.

No utilizar páginas locales artificiales como estrategia de posicionamiento nacional.

---

## 3. Dominio y canonicalización

El dominio oficial es:

`https://myaimportaciones.com`

Todas las señales SEO deben utilizar esta identidad.

### Reglas

- Utilizar HTTPS.
- Mantener una única versión canónica del dominio.
- Redirigir las versiones públicas alternativas a la oficial.
- Conservar rutas y parámetros pertinentes en las redirecciones.
- Evitar cadenas y bucles.
- No utilizar dominios temporales de Vercel como canonical.
- Mantener compatibilidad con callbacks y endpoints que requieren el host anterior.
- No redirigir webhooks de forma indiscriminada.

### Implementación existente

Archivos principales:

- `src/lib/site-origin.ts`
- `src/lib/site-redirect.ts`
- `src/lib/site.ts`
- `src/proxy.ts`
- `next.config.ts`

La implementación actual define `myaimportaciones.com` como origen oficial.

El comportamiento debe verificarse después de modificar configuración, proxy, middleware o despliegue.

### Entornos

Los entornos de preview y desarrollo no deben competir con producción en los buscadores.

Las versiones temporales deben conservar sus controles de indexación.

No permitir que una variable de entorno incorrecta convierta un dominio de pruebas en la identidad SEO de MYA.

---

## 4. Arquitectura de URLs

Mantener URLs estables, descriptivas y coherentes.

### Rutas principales

- `/`
- `/catalogo`
- `/producto/[slug]`
- `/mayorista`
- `/mayorista/[rubro]`
- `/condiciones`
- `/privacidad`

### Principios

- No cambiar slugs sin necesidad.
- No crear dos URLs indexables para el mismo contenido.
- No construir páginas de categorías sin productos útiles.
- No crear páginas de marcas inexistentes.
- No indexar búsquedas internas indiscriminadamente.
- No alterar URLs comerciales por cambios puramente visuales.

### Política de indexación

| Tipo de página | Tratamiento objetivo |
|---|---|
| Home | Indexable |
| Catálogo principal | Indexable |
| Categorías reales con contenido útil | Indexables |
| Marcas reales con productos | Indexables |
| Productos comercialmente válidos | Indexables |
| Landing mayorista | Indexable |
| Rubros mayoristas con contenido útil | Indexables |
| Búsquedas internas | Noindex |
| Filtros combinados | Noindex o política de rastreo específica |
| Ordenamientos | Evitar indexación |
| Parámetros de precio | Evitar indexación |
| Checkout | Noindex |
| Carrito | Noindex |
| Administración | Acceso restringido |
| Cuenta y autenticación | Noindex y protección correspondiente |
| Páginas inexistentes | HTTP 404 correcto |

La paginación comercial debe evaluarse según la implementación actual, evitando canonicals incorrectas hacia la primera página.

No crear canonical hacia contenido que no es equivalente.

---

## 5. Gestión de filtros y navegación facetada

MYA tiene filtros por:

- Categoría.
- Marca.
- Precio.
- Búsqueda.
- Familia o modelo.
- Ordenamiento.

La combinación de parámetros puede generar muchas URLs similares.

### Objetivo

Permitir que el comprador filtre libremente sin generar un espacio prácticamente infinito de URLs para Google.

### Reglas

1. Indexar únicamente combinaciones con valor comercial y contenido suficiente.
2. Mantener parámetros normalizados.
3. Evitar duplicados por diferente orden de parámetros.
4. Aplicar correctamente `noindex` y canonical.
5. Analizar el presupuesto de rastreo.
6. No bloquear con `robots.txt` una URL si Google necesita rastrearla para detectar su `noindex`.
7. No convertir automáticamente todos los filtros en páginas SEO.
8. No generar enlaces internos masivos hacia combinaciones irrelevantes.

Consultar las recomendaciones actuales de Google sobre navegación facetada antes de modificar esta arquitectura.

---

## 6. Metadata

El motor SEO debe centralizar:

- Title.
- Description.
- Canonical.
- Robots.
- Open Graph.
- Twitter/X Cards.
- Datos estructurados.
- Breadcrumbs.

### Implementación

Archivo principal:

`src/lib/seo.ts`

Complementos:

- `src/lib/retail-content.ts`
- `src/lib/wholesale-content.ts`
- `src/lib/seo-product-aliases.ts`

### Titles

Los títulos deben identificar claramente la intención de búsqueda.

Ejemplos de estructura:

**Producto:**

`Medicube Collagen Jelly Cream 50 ml | MYA Importaciones`

**Categoría:**

`Cosmética coreana y skincare en Argentina | MYA`

**Mayorista:**

`Cosmética coreana por mayor en Argentina | MYA`

Los ejemplos son orientativos. Usar siempre el nombre real de la ficha y evitar duplicaciones automáticas de marca.

### Meta descriptions

Deben:

- Resumir el contenido real.
- Ser coherentes con la página.
- Evitar afirmaciones sin respaldo.
- Diferenciar productos, marcas y categorías.
- Invitar a una acción útil.
- No repetir textos genéricos en cientos de URLs.

No inventar beneficios médicos, disponibilidad, descuentos ni condiciones de entrega para mejorar el texto SEO.

---

## 7. SEO de productos

Cada producto publicado debe tener información comercial suficiente.

### Datos principales

- Nombre real.
- Marca.
- Modelo.
- Presentación.
- Tamaño o capacidad.
- Categoría.
- Descripción.
- Imagen correcta.
- Precio.
- Disponibilidad.
- Condición comercial.
- Identificadores verificables cuando existan.

### Calidad de títulos

Evitar:

- Duplicación de marca.
- Nombres excesivamente extensos.
- Títulos genéricos.
- Modelos incorrectos.
- Presentaciones ambiguas.
- Mezcla de español y portugués cuando dificulta la comprensión.
- Palabras clave repetidas artificialmente.

No eliminar códigos de fabricante útiles para identificar herramientas, electrónica y productos técnicos.

### Descripciones

Las descripciones deben ayudar al usuario a comprender qué está comprando.

Para cosmética:

- Tipo de producto.
- Presentación.
- Uso general según información verificable.
- Características documentadas.

Para tecnología:

- Marca.
- Modelo.
- Capacidad.
- Características verificadas.
- Condición.

Para herramientas:

- Modelo.
- Potencia.
- Voltaje.
- Función.
- Accesorios incluidos cuando estén confirmados.

No generar especificaciones técnicas mediante suposiciones.

### Productos duplicados

El proyecto mantiene lógica de aliases canónicos para determinadas fichas históricamente duplicadas.

Archivo:

`src/lib/seo-product-aliases.ts`

Antes de agregar aliases o consolidar URLs:

1. Confirmar identidad exacta.
2. Comparar marca y modelo.
3. Verificar presentación y condición.
4. Revisar variantes.
5. Comprobar cuál es la URL preferida.
6. Evitar redirigir hacia un producto diferente.

No fusionar registros comerciales por simple similitud de títulos.

---

## 8. SEO y disponibilidad de productos

Esta sección es especialmente importante para el modelo de MYA.

El negocio trabaja principalmente bajo pedido.

Por eso debe distinguir:

- Stock físico propio.
- Stock del proveedor.
- Disponibilidad confirmada.
- Disponibilidad desconocida.
- Verificación vencida.
- Agotamiento confirmado.
- Producto archivado.
- Producto discontinuado.

### Objetivo comercial

La política solicitada para MYA contempla:

- Ocultar de los listados públicos los productos agotados.
- Mantener seguimiento interno.
- Archivar lógicamente después de siete días consecutivos de agotamiento confirmado.
- Recuperar productos cuando vuelva a existir disponibilidad válida.

### Consideración SEO

**Ocultar un producto del catálogo no exige necesariamente destruir su URL.**

Para productos agotados temporalmente, evaluar conservar la ficha individual accesible con:

- Estado real `OutOfStock`.
- Compra deshabilitada.
- Información útil del producto.
- Alternativas genuinas cuando existan.
- Canonical válida.

Esto puede preservar señales SEO durante faltantes temporales.

La ficha no debe volver a ofrecer compras hasta recuperar disponibilidad comprobada.

### Archivo lógico

El archivo interno por siete días no debe interpretarse automáticamente como una eliminación definitiva de Google.

Definir una política diferenciada:

**Agotamiento temporal:** ocultar de recomendaciones y listados comerciales, bloquear compra y evaluar conservar la ficha útil.

**Archivo recuperable:** mantener el historial y decidir la indexación según la probabilidad de regreso y el valor de la URL.

**Producto discontinuado definitivamente:** utilizar 404 o 410 cuando no exista una sustitución equivalente.

**Producto reemplazado por otro equivalente real:** evaluar redirección 301 cuando corresponda.

No redirigir todos los productos agotados a la home.

No fabricar páginas vacías que respondan HTTP 200.

### Datos estructurados

La disponibilidad declarada en Schema.org debe coincidir con la condición real de compra.

Nunca indicar `InStock` si el proveedor no está verificado o el artículo no puede comprarse.

El proceso de sincronización de stock debe actualizar también las señales comerciales expuestas a Google.

---

## 9. Sitemap y robots

### Archivos existentes

- `src/app/sitemap.ts`
- `src/app/robots.ts`

### Sitemap

El sitemap debe contener solamente URLs canónicas que correspondan a la política de indexación.

Incluir, cuando sean elegibles:

- Inicio.
- Catálogo.
- Categorías con contenido real.
- Marcas con productos.
- Productos canónicos.
- Landing mayorista.
- Rubros mayoristas útiles.
- Páginas informativas indexables.

### Excluir

- Búsquedas internas.
- Filtros arbitrarios.
- Administración.
- Checkout.
- Cuentas privadas.
- Duplicados canónicos.
- URLs eliminadas definitivamente.
- Páginas que no deben indexarse.

### `lastmod`

Incluir fechas únicamente cuando representen cambios públicos relevantes y exista evidencia confiable.

No generar `lastmod` utilizando simplemente la hora de cada petición.

### Fallos

Si falla Supabase o la consulta del catálogo:

- No presentar un sitemap vacío como si fuera el resultado correcto.
- Registrar el error.
- Preservar las garantías de consistencia.
- No eliminar masivamente URLs por una interrupción temporal.

### Robots

No utilizar `robots.txt` como mecanismo de autenticación o seguridad.

Las páginas privadas deben protegerse mediante permisos.

Evitar configuraciones que impidan a Google acceder a recursos necesarios para renderizar páginas públicas.

---

## 10. Datos estructurados

Revisar los schemas implementados en cada página.

### Tipos relevantes

- `Organization`
- `WebSite`
- `Product`
- `ProductGroup`
- `Offer`
- `BreadcrumbList`
- `Service` cuando corresponda

No incorporar tipos solamente para intentar obtener resultados enriquecidos.

### Product y Offer

Los datos deben coincidir con la información visible:

- Nombre.
- Precio.
- Moneda.
- Disponibilidad.
- Condición.
- Marca.
- URL.
- Imagen.
- Variante.

### Identificadores

- GTIN únicamente cuando esté verificado.
- MPN únicamente cuando exista identificación confiable.
- SKU según los datos del producto.
- No inventar códigos.
- No marcar indiscriminadamente que un artículo carece de identificadores.

### Reseñas

No publicar:

- Estrellas ficticias.
- Calificaciones generadas.
- Reseñas inventadas.
- Cantidades de clientes no verificadas.
- Cantidades de envíos inventadas.

### Condiciones comerciales

No incorporar datos estructurados falsos de:

- Envío gratuito.
- Entrega inmediata.
- Devoluciones gratuitas.
- Garantías generales.
- Vencimiento de precios.
- Descuentos inexistentes.

### Validación

Utilizar pruebas automatizadas y herramientas oficiales.

La existencia de JSON-LD válido no demuestra que Google haya aprobado un resultado enriquecido.

---

## 11. Google Merchant Center y feeds

### Implementación existente

Archivos principales:

- `src/lib/merchant-feed.ts`
- `src/app/api/catalog/google-feed/route.ts`
- `src/app/api/catalog/meta-feed/route.ts`

Feed de Google:

`https://myaimportaciones.com/api/catalog/google-feed`

### Objetivo

Mantener feeds consistentes con el catálogo público y las condiciones reales de compra.

### Datos críticos

- ID estable.
- Nombre.
- Descripción.
- URL canónica.
- Imagen.
- Marca.
- Condición.
- Disponibilidad.
- Precio.
- Moneda.
- Identificadores disponibles.

### Consistencia

Los siguientes elementos deben coincidir:

**Ficha pública = checkout = datos estructurados = feed comercial.**

No mostrar un precio en Google diferente del importe vigente y comprable en la web.

No declarar un producto disponible si el checkout lo rechaza por falta de stock.

No mostrar una presentación distinta de la publicada en el feed.

### Monedas

MYA utiliza precios dolarizados y equivalencias en pesos argentinos.

Verificar qué moneda y precio corresponden realmente al cobro antes de generar feeds.

No publicar conversiones inconsistentes entre USD y ARS.

### Requisitos externos

La existencia de un feed funcional no garantiza aprobación en Merchant Center.

Antes de anunciar que Google Shopping está funcionando:

- Verificar la cuenta.
- Confirmar el dominio.
- Revisar identidad comercial.
- Revisar políticas de envío.
- Revisar devoluciones.
- Confirmar requisitos de productos.
- Revisar diagnósticos.
- Comprobar aprobación efectiva.

No manipular información comercial para superar artificialmente una validación.

---

## 12. SEO mayorista

El canal mayorista constituye una oportunidad de captación orgánica.

### URLs principales

`/mayorista`

Rubros:

- Cosmética coreana.
- Perfumería.
- Cuidado capilar.
- Herramientas.
- Electrónica.
- Medicube.

Los slugs reales deben consultarse en el código.

### Público objetivo

- Revendedores.
- Emprendedores.
- Perfumerías.
- Centros de estética.
- Peluquerías.
- Ferreterías.
- Comercios electrónicos.
- Tiendas físicas.

### Estrategia

Crear contenido que responda preguntas reales:

- Qué productos se pueden comprar al por mayor.
- Qué presentaciones existen.
- Qué marcas se comercializan.
- Cómo combinar productos.
- Cuáles son los mínimos.
- Cómo se solicitan cotizaciones.
- Qué condiciones de envío se aplican.

### Palabras clave orientativas

- Cosmética coreana por mayor Argentina.
- Medicube por mayor Argentina.
- Skincare coreano para revender.
- Perfumes árabes por mayor.
- Herramientas Total por mayor.
- Productos importados para revendedores.

Estas consultas son hipótesis de posicionamiento, no palabras clave con volumen o rentabilidad verificada.

Validarlas con datos reales de Search Console y herramientas de investigación antes de priorizar inversiones.

### Calidad de landings

Las páginas mayoristas deben aportar contenido específico.

No crear páginas casi idénticas cambiando únicamente el nombre de una marca.

No publicar landing pages que anuncien productos inexistentes.

Verificar que la información comercial respete la política mayorista vigente.

---

## 13. Estrategia de contenido

Priorizar contenido útil asociado a productos y categorías reales.

### Belleza

Posibles temas:

- Cómo diferenciar sérum, ampolla y crema.
- Qué revisar antes de comprar skincare coreano.
- Presentaciones y tamaños de productos Medicube.
- Diferencias entre tipos de limpiadores faciales.
- Cómo organizar un catálogo inicial para revender skincare.

### Herramientas

Posibles temas:

- Taladro percutor frente a rotomartillo.
- Diferencia entre atornillador y llave de impacto.
- Qué incluye un kit de herramientas.
- Cómo interpretar potencia, torque y voltaje.
- Diferencias entre baterías y accesorios compatibles.

### Perfumería

Posibles temas:

- Diferencias entre EDP y EDT.
- Cómo identificar la presentación de un perfume.
- Qué comprobar al comprar packs.
- Diferencias entre perfumes, body mists y sets.

### Reglas

- No escribir contenido masivo sin utilidad.
- No copiar textos ajenos sin autorización.
- No inventar especificaciones.
- No crear recomendaciones médicas sin respaldo.
- No prometer resultados de productos cosméticos.
- No incorporar enlaces a artículos agotados como si estuvieran disponibles.
- Actualizar contenidos cuando cambien productos o condiciones.

El contenido debe dirigir a categorías y productos relacionados de forma natural.

---

## 14. SEO técnico y rendimiento

El proyecto utiliza Next.js con renderizado del lado del servidor en páginas comerciales.

### Prioridades

- HTML útil accesible para buscadores.
- Metadatos presentes correctamente.
- Códigos HTTP coherentes.
- Imágenes optimizadas.
- Navegación con enlaces rastreables.
- Menor duplicación de consultas.
- Carga eficiente.
- Buena experiencia móvil.
- Evitar errores de hidratación.
- Evitar contenido principal que aparezca demasiado tarde.

### Core Web Vitals

Monitorear:

- LCP.
- INP.
- CLS.

Priorizar datos reales de usuarios cuando estén disponibles.

Las mediciones locales y de laboratorio sirven para diagnosticar problemas, pero no deben presentarse como Core Web Vitals reales de campo.

### Imágenes

- Utilizar imágenes correspondientes al producto exacto.
- Mantener dimensiones adecuadas.
- Evitar deformaciones.
- Priorizar imágenes importantes.
- Cargar de forma diferida las secundarias.
- Utilizar atributos alt descriptivos.
- Evitar nombres y textos alternativos artificialmente saturados de keywords.

No realizar descargas masivas de imágenes de terceros sin comprobar sus permisos de uso.

---

## 15. Analítica y conversiones

El SEO debe medirse por su contribución comercial.

### Herramientas

- Google Search Console.
- GA4.
- Herramientas de diagnóstico de rendimiento.
- Datos comerciales internos de MYA.

### Indicadores

- Clics orgánicos.
- Impresiones.
- CTR.
- Posición media por consulta.
- Páginas indexadas.
- Errores de cobertura.
- Rendimiento móvil.
- Consultas mayoristas originadas en búsqueda.
- Productos añadidos al carrito.
- Compras verificadas.
- Ingresos atribuibles cuando la medición lo permita.

### Eventos

Conservar una implementación coherente de eventos como:

- `view_item`
- `add_to_cart`
- `begin_checkout`
- `purchase`
- `search`

Verificar los nombres efectivamente implementados.

No emitir dos veces la misma conversión.

No registrar una compra como confirmada por haber abierto una página de pago.

Respetar los controles de consentimiento existentes.

### Interpretación

Más impresiones no significan necesariamente más ventas.

Priorizar páginas y consultas que atraigan compradores relevantes.

---

## 16. Google Search Console

### Estado histórico comprobado

El 17/10/2026 se documentó:

- Propiedad de dominio existente.
- Sitemap enviado.
- Sitemap procesado correctamente.
- 523 URLs descubiertas en esa verificación.

Ese resultado confirma el procesamiento histórico del sitemap.

**No demuestra que las 523 páginas hayan sido indexadas.**

Tampoco demuestra cuál es el estado actual de Google Search Console.

### Verificaciones pendientes

Cuando exista acceso autorizado a la propiedad:

1. Revisar indexación real.
2. Identificar URLs excluidas.
3. Investigar 404 y soft 404.
4. Revisar canonicals elegidas por Google.
5. Inspeccionar páginas importantes.
6. Revisar errores de datos estructurados.
7. Revisar rendimiento por dispositivo.
8. Identificar consultas con impresiones y CTR bajo.
9. Analizar categorías con tráfico pero sin conversiones.
10. Consultar Core Web Vitals.

No utilizar estimaciones como sustituto de datos de Search Console.

---

## 17. Auditoría histórica — 17/10/2026

La auditoría original registró:

- 463 productos minoristas activos.
- 16 marcas.
- 438 productos disponibles según la evidencia de entonces.
- 523 URLs recorridas.
- 460 productos canónicos en el feed.
- Corrección del dominio canónico.
- Correcciones de metadata.
- Mejora de sitemap.
- Consolidación de duplicados canónicos.
- Corrección de datos estructurados.
- Eliminación de prueba social sin respaldo.
- Mejoras de feeds.
- Pruebas responsive.
- Verificación de publicación en Vercel.

Commit documentado:

`750807fbf54b570d2d277a91d9028c550908a423`

### Resultado histórico

La implementación SEO del 17 de octubre fue publicada y verificada dentro del alcance documentado.

La indexación completa y la aprobación de Merchant Center no quedaron demostradas.

Las cifras y condiciones anteriores no deben trasladarse automáticamente al estado actual.

Los informes completos y evidencias permanecen en la documentación histórica.

---

## 18. Riesgos conocidos al 10/11/2026

### P0 — Integridad comercial

Evitar mostrar precios o condiciones de compra inconsistentes.

El SEO no debe enviar compradores a páginas con precios que puedan generar pérdidas o con información de compra incorrecta.

### P1 — Disponibilidad

Revisar la relación entre:

- Publicación.
- Stock de proveedor.
- Stock físico.
- Visibilidad.
- Datos estructurados.
- Feeds.
- Checkout.

Se detectaron productos con disponibilidad pendiente y una política de visibilidad que requiere unificación.

### P1 — Sitemap

El sitemap actual utiliza datos del catálogo, pero debe verificarse que aplique la misma política de publicación vigente en todos los recorridos.

Especial atención a productos ocultos y archivados.

### P1 — Feeds

Verificar consistencia entre precio, moneda, disponibilidad y capacidad real de compra.

No considerar el feed válido únicamente porque responde HTTP 200.

### P1 — Promesas comerciales

Revisar afirmaciones generales de garantía, autenticidad, entrega y disponibilidad en la home y otras páginas.

No eliminar información correcta: verificar cada afirmación antes de modificarla.

### P2 — Calidad del catálogo

Revisar:

- Marcas faltantes.
- Títulos extensos.
- Presentaciones ambiguas.
- Duplicados.
- Descripciones poco útiles.
- Categorías sin contenido.
- Fotografías incorrectas.

### P2 — Cobertura SEO mayorista

Auditar las landings mayoristas y su consistencia con el catálogo disponible.

No asumir que la existencia de una ruta significa que esté posicionando.

---

## 19. Procedimiento de auditoría SEO

Cuando se solicite una auditoría completa:

### Etapa 1 — Estado inicial

Registrar:

- Fecha.
- Commit.
- Despliegue.
- Dominio.
- Número de URLs.
- Cantidad de productos visibles.
- Páginas indexables.
- Feeds disponibles.
- Configuración de robots.

### Etapa 2 — Rastreo

Comprobar:

- HTTP.
- Redirecciones.
- Canonicals.
- Titles.
- Descriptions.
- H1.
- Indexación permitida.
- Breadcrumbs.
- JSON-LD.
- Enlaces internos.
- Imágenes.
- Paginación.
- Productos ocultos.

### Etapa 3 — Calidad

Revisar:

- Duplicados.
- Contenido insuficiente.
- Fichas sin marca.
- Productos sin imagen.
- URLs huérfanas.
- Categorías vacías.
- Información comercial incorrecta.

### Etapa 4 — Datos externos

Consultar Search Console y Merchant Center únicamente cuando exista acceso disponible y autorizado.

No inventar resultados externos.

### Etapa 5 — Correcciones

Priorizar por impacto comercial y riesgo.

Realizar cambios comprobables y evitar alterar múltiples sistemas sin necesidad.

### Etapa 6 — Regresión

Confirmar que las mejoras SEO no rompan:

- Inicio.
- Catálogo.
- Mayorista.
- Fichas.
- Carrito.
- Checkout.
- Autenticación.
- Pagos.
- Administración.

### Etapa 7 — Evidencia

Guardar resultados, capturas e informes con fecha y versión.

---

## 20. Pruebas técnicas

Archivos y herramientas relevantes:

- `tests/seo.test.ts`
- `tests/site.test.ts`
- `scripts/verify-seo.mjs`
- `scripts/check-public-evidence.mjs`

Comandos:

```bash
npm run lint
npm run type-check
npm test
npm run build
```

Para el verificador SEO, revisar las opciones admitidas por la versión actual antes de ejecutarlo.

### Criterios

- No afirmar aprobación por ejecutar solamente un test unitario.
- No confundir un rastreo local con indexación en Google.
- No declarar un sitemap correcto sin comprobar sus URLs.
- No afirmar que el feed cumple Merchant únicamente porque genera XML válido.
- No atribuir cambios en ventas a SEO sin datos suficientes.
- No ejecutar compras reales para validar metadata.

---

## 21. Plan de mejora continua

### Prioridad inmediata

**1. Unificar la publicabilidad.**

Garantizar que catálogo, sitemap, búsqueda, schemas, feeds y checkout utilicen condiciones comerciales compatibles.

**2. Resolver productos agotados.**

Implementar una política que preserve el valor SEO de URLs recuperables sin permitir compras de productos no disponibles.

**3. Corregir inconsistencias económicas.**

Revisar precios y conversiones antes de exponerlos en datos estructurados o feeds.

**4. Validar la información pública.**

Eliminar o corregir afirmaciones comerciales no verificadas.

### Siguiente etapa

**5. Mejorar el SEO mayorista.**

Priorizar cosmética coreana, perfumería y herramientas según demanda y rentabilidad comprobables.

**6. Normalizar productos.**

Corregir marcas, modelos, presentaciones y duplicados.

**7. Medir resultados.**

Consultar Search Console para priorizar URLs y consultas relevantes.

### Crecimiento

**8. Crear contenido útil.**

Publicar guías asociadas a productos y necesidades reales.

**9. Optimizar conversión orgánica.**

Relacionar tráfico, consultas mayoristas, pedidos y ventas verificadas.

**10. Ampliar categorías solamente cuando exista oferta comercial suficiente.**

---

## 22. Estado de aprobación SEO

Una mejora SEO puede estar en alguno de estos estados:

- **Propuesta:** cambio planificado.
- **Implementada:** código desarrollado.
- **Probada:** validaciones locales completas.
- **Desplegada:** versión servida en producción.
- **Verificada:** funcionamiento productivo comprobado.
- **Observada en Google:** Search Console u otra herramienta oficial confirma su procesamiento o comportamiento.
- **Con resultado comercial medido:** existen datos suficientes para evaluar el impacto.

No confundir estos estados.

Un cambio desplegado no garantiza indexación.

Una página indexada no garantiza posicionamiento.

Un buen posicionamiento no garantiza ventas.

---

## 23. Referencias técnicas

### Código MYA

- `src/lib/seo.ts`
- `src/lib/site-origin.ts`
- `src/lib/site-redirect.ts`
- `src/lib/seo-product-aliases.ts`
- `src/lib/product-identifiers.ts`
- `src/lib/merchant-feed.ts`
- `src/lib/retail-content.ts`
- `src/lib/wholesale-content.ts`
- `src/lib/storefront.ts`
- `src/app/sitemap.ts`
- `src/app/robots.ts`
- `src/app/catalogo/page.tsx`

### Documentación del proyecto

- `AGENTS.md`
- `AI_CONTEXT.md`
- `design-qa.md`
- `mayorista-publico-plan.md`
- `docs/RELEASE-FINAL-2026-11-07.md`

### Google Search Central

- https://developers.google.com/search/docs
- https://developers.google.com/search/docs/crawling-indexing/canonicalization
- https://developers.google.com/search/docs/appearance/structured-data/product
- https://developers.google.com/crawling/docs/faceted-navigation
- https://developers.google.com/search/docs/crawling-indexing/pause-online-business

Consultar la documentación vigente cuando se modifiquen requisitos técnicos relacionados con Google.

---

## 24. Mantenimiento de SEO_AUDIT.md

Este archivo no debe volver a convertirse en un diario de desarrollo.

Actualizar únicamente cuando cambien:

- Reglas SEO.
- Arquitectura de URLs.
- Política de indexación.
- Gestión de productos agotados.
- Integración con Merchant.
- Configuración de Search Console.
- Prioridades de posicionamiento.
- Riesgos conocidos.
- Estado de aprobación de mejoras importantes.

Los informes extensos, resultados de pruebas y capturas deben almacenarse en `docs/seo/` o en los directorios documentales correspondientes.

Cada auditoría nueva debe tener su propia fecha y evidencia.

No sobrescribir pruebas históricas.

### Principio final

**MYA necesita atraer compradores reales mediante páginas útiles, técnicamente correctas y comercialmente confiables.**

El SEO debe crecer junto al negocio.

No se debe sacrificar calidad del catálogo, rentabilidad ni confianza del cliente para aumentar artificialmente la cantidad de URLs indexadas.