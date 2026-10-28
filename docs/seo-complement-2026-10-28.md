# Complemento SEO — 28/10/2026

Se agregaron enlaces HTML a las seis páginas mayoristas existentes desde el portal público y entre páginas de rubro. Se conservan los accesos al catálogo minorista, contactos y flujo B2B. No se agregaron URLs indexables ni se modificaron canonical o sitemap.

Las ofertas estructuradas de variantes ahora usan el enlace que preselecciona la presentación real. Se excluyen precios no positivos o no finitos y variantes inactivas; si un producto requiere variantes y ninguna tiene precio válido, no se sustituye por una oferta del padre. Se preservan la moneda y la política existente de disponibilidad.

El dueño reconfirmó el mínimo de $100.000 o 5 unidades combinables. Se corrigieron los textos que sólo mencionaban el importe en las tres vistas del portal, la presentación de kits y la promoción mayorista de la tienda, reutilizando la política compartida. La validación existente ya usa la condición alternativa (`importe >= 100.000 || unidades >= 5`); no requirió cambios de comportamiento. El acceso a precios privados se conserva.

Validación de publicación: 260/260 pruebas, type-check, build y guard de evidencia pública aprobados. El lint general inicial detectó cuatro errores previos; quedaron corregidos en la auditoría de publicación, con cero errores y 169 advertencias existentes. Ver `docs/seo-release-2026-10-28.md` para los controles de acceso y del presupuesto imprimible añadidos durante esa revisión.

Revisión de navegador: 21 vistas de las siete páginas mayoristas a 320/390/1440 px, sin overflow ni excepciones JS; enlaces nuevos comprobados con HTTP 200. Dos ofertas reales de Ana Abiyedh abrieron Rouge y Leather preseleccionados manteniendo canonical de familia. Build y revisión de las 21 vistas repetidos tras unificar el mínimo confirmado; la condición completa se comprobó en el portal. No hubo peticiones de escritura. Captura móvil inspeccionada. Evidencia local en `docs/seo/qa-private/seo-complement-2026-10-28/`, excluida de Git.

Lectura previa de producción: `/mayorista` y `/mayorista/perfumeria` respondían 200 con canonical propio, aún sin la nueva navegación. El dueño autorizó después commit, push y publicación. La evidencia final de SHA y verificación pública se conserva en el registro privado del release.

Fuentes: [estructura de URLs y variantes](https://developers.google.com/search/docs/specialty/ecommerce/designing-a-url-structure-for-ecommerce-sites), [enlaces internos](https://developers.google.com/search/docs/crawling-indexing/links-crawlable).
