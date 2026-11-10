# AI_CONTEXT.md — MYA Importaciones

> Contexto técnico y comercial del proyecto.
> Última revisión de referencia: 10/11/2026.
> Este documento describe el sistema, sus decisiones vigentes, el estado observado y los problemas conocidos.
> Las reglas de actuación de los agentes están en `AGENTS.md`.

## 1. Propósito de este documento

Este archivo es la referencia central para comprender MYA Importaciones.

No es un registro cronológico de todas las tareas realizadas.

Su objetivo es permitir que cualquier agente de desarrollo comprenda rápidamente:

- Qué es MYA y cómo funciona comercialmente.
- Qué tecnologías utiliza.
- Cómo está organizado el código.
- Cómo funciona el catálogo.
- Cómo se relacionan los productos con los proveedores.
- Cómo se calculan los precios.
- Qué automatizaciones existen.
- Qué problemas se conocen.
- Qué funcionalidades están implementadas y cuáles son objetivos pendientes.

No interpretar las funcionalidades planeadas como si ya estuvieran implementadas.

Para reglas obligatorias de desarrollo, seguridad, pruebas y despliegue, consultar `AGENTS.md`.

---

## 2. Identidad comercial

**Nombre:** MYA Importaciones

**Sitio:** https://myaimportaciones.com

**Instagram:** @_myaimportaciones

**Ubicación comercial:** Tandil, Buenos Aires, Argentina.

**Alcance:** ventas y envíos a todo el territorio argentino, sujetos a disponibilidad y condiciones logísticas.

### Modelo de negocio

MYA es un e-commerce de productos importados que vende tanto a consumidores finales como a comerciantes y revendedores.

Su modelo principal es la venta bajo pedido.

El flujo habitual es:

1. MYA publica productos disponibles a través de proveedores.
2. El cliente realiza una compra o solicita una cotización.
3. Se verifica disponibilidad, precio y condiciones.
4. MYA adquiere la mercadería al proveedor.
5. Se gestiona el transporte desde Paraguay hacia Argentina.
6. Se organiza la entrega al cliente.

Este modelo permite ofrecer un catálogo amplio sin mantener físicamente todos los productos.

La disponibilidad del proveedor y el inventario propio son conceptos distintos.

### Categorías comerciales principales

- Belleza y cuidado personal.
- Perfumería.
- Cosmética coreana.
- Cuidado capilar.
- Electrónica y tecnología.
- Herramientas y equipamiento.

Las categorías anteriores describen el negocio. Los slugs, categorías raíz y relaciones reales deben consultarse en Supabase.

No crear categorías duplicadas para cumplir una descripción comercial.

---

## 3. Tecnología y arquitectura

### Stack

- Next.js 16.
- React 19.
- TypeScript.
- Tailwind CSS.
- Supabase PostgreSQL.
- Supabase Auth.
- Supabase Storage.
- Supabase Edge Functions.
- Vercel.
- Mercado Pago.
- Resend.
- Integraciones de logística y seguimiento disponibles en el proyecto.

Verificar las versiones instaladas mediante `package.json` y el lockfile.

### Infraestructura

**GitHub:** `MaxiCalamante/myaimportaciones`

**Supabase Project ID:** `gqcdurxndbeeugjfworx`

**Vercel Project:** `myaimportaciones`

**Dominio principal:** `myaimportaciones.com`

### Directorios importantes

`src/app/` — Rutas y páginas de Next.js.

`src/components/` — Componentes de interfaz.

`src/lib/` — Servicios, motores comerciales, integraciones y utilidades.

`src/lib/supplier-tracker/` — Sistema de rastreo de proveedores.

`src/lib/supabase/` — Clientes y utilidades de Supabase.

`src/app/admin/` — Administración.

`src/app/api/` — Endpoints y procesos del servidor.

`supabase/migrations/` — Migraciones SQL.

`supabase/functions/` — Funciones alojadas.

`scripts/` — Herramientas de mantenimiento, análisis y operaciones.

`tests/` — Pruebas automatizadas.

`docs/` — Documentación de arquitectura, decisiones e informes.

**Regla de arquitectura:** revisar los servicios existentes antes de implementar otros que dupliquen su responsabilidad.

---

## 4. Estado del catálogo observado el 10/11/2026

La siguiente información proviene de una auditoría de lectura de Supabase realizada el 10 de noviembre de 2026.

Es una fotografía de ese momento, no una garantía del estado futuro.

| Indicador | Resultado observado |
|---|---:|
| Productos registrados | 1.130 |
| Activos, no eliminados ni archivados | 316 |
| Inactivos, eliminados o archivados | 814 |
| Activos con proveedor no disponible | 7 |
| Activos con verificación de más de 24 horas | 152 |
| Activos sin URL de origen en `products` | 20 |
| Activos sin marca estructurada | 111 |
| Activos sin precio mayorista USD calculado | 53 |
| Activos con precio minorista inferior al costo registrado | 3 |
| Activos con precio mayorista inferior al costo registrado | 2 |

Los 316 productos representan registros activos que cumplen las condiciones mencionadas, no necesariamente la cantidad exacta que ve un visitante.

La visibilidad pública depende además del código, las políticas comerciales y los filtros de las consultas.

### Problemas detectados

Durante la auditoría se identificaron inconsistencias que requieren atención:

- Productos activos cuya disponibilidad no está confirmada.
- Fichas con verificaciones vencidas.
- Diferencias entre costo registrado y precio comercial.
- Marcas faltantes o inconsistentes.
- Productos sin URL de origen en su ficha principal.
- Posibles duplicados comerciales.
- Reglas de visibilidad no aplicadas consistentemente en todos los recorridos públicos.

Se detectó un posible problema de publicabilidad en `src/lib/storefront.ts` y `src/app/catalogo/page.tsx`: las consultas utilizan `is_active` y `deleted_at`, pero no todas aplican consistentemente la disponibilidad de proveedor ni el archivo comercial.

Verificar nuevamente antes de corregir, porque el código puede haber cambiado.

---

## 5. Proveedores autorizados

Los cuatro proveedores operativos son:

| Proveedor | Dominio | Especialidad |
|---|---|---|
| Atacado Connect | atacadoconnect.com | Tecnología y electrónica |
| Atacado USA | atacadousa.com.py | Cosmética y perfumería |
| Star Company | starcompany-py.com | Cosmética y perfumería |
| Total Herramientas Oficial | totalherramientasoficial.com.py | Herramientas |

No confundir Star Company con Star Compass.

Los demás proveedores históricos deben permanecer archivados mientras no exista una nueva autorización.

### Funcionamiento del sistema

MYA dispone de un sistema de rastreo que puede:

- Descubrir referencias comerciales.
- Registrar URLs originales.
- Consultar fichas de proveedores compatibles.
- Guardar precios y monedas.
- Verificar disponibilidad cuando existe evidencia suficiente.
- Relacionar ofertas con productos.
- Comparar proveedores.
- Registrar historial de observaciones.
- Generar candidatos de importación.

El descubrimiento es privado y no equivale a publicación comercial.

### Tablas relevantes

- `suppliers`
- `supplier_offers`
- `supplier_observations`
- `supplier_tracker_sources`
- `supplier_tracker_items`
- `supplier_tracker_memberships`
- `supplier_tracker_tasks`
- `supplier_tracker_runs`
- `supplier_link_decisions`
- `product_supplier_preferences`

Consultar el esquema real antes de utilizar o modificar estas tablas.

### Estado del rastreador al 10/11/2026

| Indicador | Cantidad |
|---|---:|
| Referencias registradas | 10.564 |
| Marcadas `in_stock` | 3.138 |
| Disponibilidad desconocida | 7.424 |
| Referencias con vínculo a producto | 280 |

La disponibilidad desconocida es un estado informativo. No significa que el producto esté agotado ni que esté disponible.

Los estados y cantidades deben obtenerse de consultas actuales, no de esta fotografía.

### Documentación

Ver:

- `docs/suppliers/README.md`
- `docs/suppliers/FOUR-SUPPLIER-TRACKER-2026-11-06.md`

---

## 6. Modelo de datos del catálogo

Las entidades centrales incluyen:

### `products`

Representa las fichas comerciales de MYA.

Contiene información como:

- Identidad.
- Título.
- Marca.
- Modelo.
- Categoría.
- Descripción.
- Fotos.
- Precio.
- Estado de publicación.
- Stock propio.
- Disponibilidad de proveedor.
- Datos de verificación.
- Archivo lógico.

### `product_variants`

Representa presentaciones o configuraciones distintas.

Las variantes pueden diferenciarse por:

- Tamaño.
- Color.
- Capacidad.
- Modelo.
- Presentación.
- Contenido del paquete.

Cada variante debe conservar su identidad comercial.

### `supplier_offers`

Relaciona productos y variantes con ofertas de proveedores.

Un producto MYA puede tener varias ofertas válidas de diferentes proveedores.

### `product_costs`

Conserva información de costos y sus bases de cálculo.

### `product_usd_prices`

Contiene precios y datos económicos utilizados por el sistema de precios dolarizados.

### Otras entidades

- `categories`
- `orders`
- `order_items`
- `product_audit_logs`
- `catalog_product_reviews`
- `wholesale_product_controls`
- `store_profitability_policy`
- `wholesale_v2_policies`

La estructura exacta debe verificarse contra Supabase y las migraciones.

No asumir que todos los campos, restricciones o relaciones son idénticos a los de una versión histórica.

---

## 7. Política de publicación del catálogo

### Comportamiento deseado

MYA necesita un catálogo público con productos realmente comercializables.

La política objetivo es que un producto se publique únicamente cuando cumpla las condiciones necesarias de:

- Identidad.
- Fuente autorizada.
- Disponibilidad.
- Precio.
- Rentabilidad.
- Calidad de ficha.
- Documentación aplicable.

### Diferenciar estados

La arquitectura debe distinguir conceptualmente:

- Disponible.
- Agotado.
- Desconocido.
- Verificación vencida.
- Oculto.
- Archivado.
- Pendiente de revisión.

Estos estados describen la política comercial objetivo, no garantizan que ya exista una implementación completa.

### Agotamiento

La decisión comercial del 10/11/2026 establece como objetivo:

- Ocultar inmediatamente una referencia cuando todos sus proveedores válidos confirmen falta de stock.
- Mantenerla bajo seguimiento.
- Archivar lógicamente después de siete días consecutivos sin stock confirmado.
- Permitir que regrese a Oportunidades al recuperar disponibilidad.
- Exigir nuevamente los controles de publicación antes de reactivarla.

No eliminar físicamente productos por agotamiento.

La ausencia de evidencia y un error técnico no deben contar como siete días de stock agotado.

### Productos con varios proveedores

Si un proveedor queda sin stock pero otro autorizado ofrece exactamente la misma identidad comercial:

- Verificar la alternativa.
- Recalcular costos y precios.
- Mantener o recuperar visibilidad cuando corresponda.
- Preservar los vínculos e historial.

No sustituir modelos o variantes distintos.

### Integración pública

Los filtros de publicabilidad deben ser consistentes entre:

- Inicio.
- Catálogo.
- Buscador.
- Fichas individuales.
- Mayorista.
- Recomendaciones.
- Sitemap.
- Carrito.
- Checkout.

El checkout debe volver a verificar las condiciones críticas.

---

## 8. Precios y rentabilidad

La política de referencia actual establece:

| Canal | Margen objetivo |
|---|---:|
| Minorista | 30% |
| Mayorista | 18% |
| Piso | 10% |

Los márgenes se calculan sobre el precio de venta.

No son porcentajes de recargo sobre el costo.

### Costos

Deben contemplar las partidas atribuibles que correspondan:

- Costo del proveedor.
- Moneda original.
- Costo efectivo de adquisición de USD/USDT.
- Pasador.
- Transporte.
- Gastos de importación.
- Comisiones de pago.
- Gastos comerciales variables.

Utilizar los motores actuales:

- `src/lib/import-costs.ts`
- `src/lib/wholesale-pricing-engine.ts`
- `src/lib/monetary.ts`
- `src/lib/profitability.ts`

Comprobar sus responsabilidades y funciones antes de modificarlos.

### Consideraciones

El costo de origen no es el costo final.

No utilizar ARS 1.600 como tipo de cambio permanente porque aparezca en documentación histórica.

Las tarifas del pasador también requieren verificar condiciones actuales.

El cálculo debe conservar la precisión decimal.

No aplicar automáticamente reducciones de margen que puedan generar pérdidas.

### Estado de la política

La documentación de noviembre registra la política de contribución en modo `preview`.

No asumir que ya existe un bloqueo productivo completo basado únicamente en esa descripción.

Consultar la configuración persistida actual, el código y el comportamiento de checkout.

Las modificaciones masivas de precios requieren cálculos verificables, protección contra concurrencia, auditoría y controles comerciales.

---

## 9. Oportunidades e importación de productos

Rutas relevantes:

- `/admin/oportunidades`
- `/admin/oportunidades/importacion`
- `/admin/proveedores/rastreador`
- `/admin/proveedores/inteligencia`

Servicios principales:

- `src/lib/supplier-opportunities.ts`
- `src/lib/supplier-tracker/`
- `src/lib/supplier-matching.ts`
- `src/lib/supplier-crosslinks.ts`
- `src/lib/catalog-import-plan.ts`

### Objetivo comercial

El sistema debe descubrir una gran cantidad de referencias sin convertir automáticamente todas ellas en publicaciones.

Oportunidades debe ayudar a elegir productos con potencial comercial.

La clasificación objetivo es:

**Recomendadas:** referencias verificadas, rentables y relevantes.

**Exploración:** resultados descubiertos que requieren más información.

**Descartadas:** artículos comercialmente irrelevantes, duplicados o fuera del alcance autorizado.

### Criterios

Evaluar por categoría:

- Identidad exacta.
- Stock.
- Precio y moneda.
- Costos completos.
- Margen.
- Interés comercial.
- Tamaño del producto.
- Costos logísticos.
- Calidad de imagen y descripción.
- Posibilidad real de venta.
- Documentación necesaria.

No priorizar tornillos sueltos y consumibles insignificantes al mismo nivel que equipos completos.

No excluir automáticamente un atornillador o un kit profesional por contener palabras vinculadas a tornillería.

Las exclusiones comerciales deben distinguir producto, presentación y categoría.

### Automatización

El descubrimiento puede continuar de forma exhaustiva.

La publicación debe mantener los controles comerciales correspondientes.

Los candidatos privados no deben convertirse en publicaciones únicamente por aparecer en un listado.

---

## 10. Venta mayorista

MYA busca atender:

- Comercios.
- Revendedores.
- Profesionales.
- Emprendedores.
- Tiendas digitales.

Ruta principal:

`/mayorista`

El objetivo vigente es permitir la consulta pública del catálogo mayorista, sin exigir una cuenta especial únicamente para conocer los productos y sus precios.

### Mínimos

La documentación histórica describe como condición comercial **$100.000 ARS en productos o cinco unidades combinadas**, alcanzando una de las dos condiciones.

La configuración de políticas y sus validadores pueden haber evolucionado.

Antes de utilizar este mínimo en checkout, mensajes comerciales o formularios, verificar la política vigente en `wholesale_v2_policies` y su interpretación real en el código.

No convertir automáticamente mínimos por referencia en mínimos generales, ni viceversa.

### Condiciones especiales

MYA puede evaluar:

- Compras recurrentes.
- Descuentos por volumen.
- Combos para emprendedores.
- Pedidos mixtos.
- Venta para reventa.

La modalidad de dropshipping y las APIs para revendedores son oportunidades comerciales a evaluar, no funcionalidades operativas garantizadas.

No prometer envíos neutros, sincronización externa ni compra individual mayorista si todavía no existe un acuerdo y una implementación comprobada.

---

## 11. Checkout, pagos y logística

### Pagos

El proyecto dispone de integración con Mercado Pago y mecanismos de cobro y seguimiento de órdenes.

No considerar una redirección exitosa como confirmación de pago.

La validez de un pago depende de verificaciones confiables del servidor.

### Pedidos

Mantener:

- Cotización coherente.
- Validación comercial del producto.
- Protección contra órdenes duplicadas.
- Integridad de cantidades e importes.
- Estados de pago.
- Auditoría.
- Historial del cliente.

Los pedidos confirmados no deben reescribirse cuando cambia un precio o proveedor.

### Envíos

El negocio gestiona entregas a clientes de Argentina.

La información de entrega requiere comprobar:

- Disponibilidad.
- Condiciones de abastecimiento.
- Transporte.
- Código postal.
- Costo logístico.
- Seguimiento disponible.

No presentar valores estimados como tarifas oficiales verificadas.

No garantizar fechas de llegada que no estén respaldadas.

Los sistemas actuales de consulta por WhatsApp y seguimiento deben preservarse.

---

## 12. Administración

MYA dispone de un panel administrativo para gestionar las principales operaciones comerciales.

Funcionalidades existentes o con soporte en código:

- Productos.
- Categorías.
- Variantes.
- Precios.
- Costos.
- Proveedores.
- Rastreador.
- Oportunidades.
- Clientes.
- Pedidos.
- Auditoría.
- Herramientas de importación.
- Moneda y cotizaciones.

No asumir que toda funcionalidad documentada históricamente sigue disponible en el mismo lugar.

Verificar las rutas reales y el estado actual de la interfaz.

### Principio de administración

Un administrador debe poder comprender rápidamente:

- Qué productos están publicados.
- Cuáles tienen disponibilidad.
- Cuáles están agotados.
- Qué sincronizaciones fallaron.
- Qué precios requieren revisión.
- Qué oportunidades son relevantes.
- Qué cambios se hicieron automáticamente.

El objetivo es reducir tareas manuales y mejorar la claridad del negocio.

---

## 13. Automatizaciones y ejecución local

La sincronización alojada utiliza procesos de Supabase y Vercel.

El sistema de proveedores dispone de trabajos separados de descubrimiento y seguimiento.

Consultar los crons y funciones realmente activos antes de instalar, modificar o duplicar automatizaciones.

### PC del dueño

No utilizar Windows como servidor permanente del negocio.

La herramienta local de proveedores se inicia manualmente.

Referencia:

`docs/suppliers/LOCAL-MANUAL-2026-11-05.md`

No reinstalar tareas antiguas de Windows ni procesos permanentes sin una nueva autorización expresa.

La base compartida es Supabase, no una copia local utilizada como producción.

---

## 14. Seguridad y datos privados

Los costos de adquisición, ofertas y observaciones internas de los proveedores son datos comerciales privados.

No exponerlos mediante:

- Endpoints públicos.
- Componentes del cliente.
- Variables `NEXT_PUBLIC_*`.
- Respuestas de búsqueda.
- Metadatos públicos.
- Errores del servidor.

Respetar RLS, roles y autorizaciones existentes.

No eludir las verificaciones mediante clientes privilegiados innecesarios.

Las operaciones administrativas deben comprobar autorización real del usuario.

Preservar privacidad de compradores, contactos, pedidos y datos de pago.

No utilizar valores ficticios en reseñas, garantías, certificaciones o documentación comercial presentada como auténtica.

---

## 15. Cumplimiento de cosmética y perfumería

MYA comercializa productos de belleza importados.

No asumir que todo producto disponible en Paraguay puede comercializarse automáticamente en Argentina.

Diferenciar:

- Disponibilidad del proveedor.
- Identidad y autenticidad del producto.
- Documentación de trazabilidad.
- Lote y vencimiento.
- Requisitos sanitarios aplicables.
- Habilitaciones y regularización correspondientes.
- Facturación y documentación comercial.

No afirmar que un producto tiene autorización ANMAT si no existe respaldo específico.

No inventar certificados ni promesas médicas.

La publicación debe contemplar controles documentales cuando corresponda.

---

## 16. Experiencia de usuario y marca

El diseño debe ser moderno, profesional, rápido y accesible desde celulares.

Priorizar:

- Navegación clara.
- Diseño responsive.
- Imágenes correctas.
- Categorías bien organizadas.
- Tarjetas legibles.
- Precios en USD y ARS coherentes.
- Acceso al mayorista.
- Contacto por WhatsApp.
- Checkout comprensible.
- Seguimiento de pedidos.
- SEO correcto.

El diseño debe facilitar las ventas sin agregar distracciones.

No reconstruir el frontend completo ante una corrección pequeña.

Las referencias visuales externas sirven para orientar decisiones de diseño, no para copiar sin criterio.

---

## 17. Problemas conocidos y prioridades

Hallazgos de la auditoría de referencia del 10/11/2026:

### Prioridad crítica

**Rentabilidad**

Revisar los productos cuyo precio registrado es inferior al costo total.

Confirmar la exactitud de las bases antes de modificar importes.

**Visibilidad y compra**

Unificar las condiciones comerciales que determinan si un producto se puede mostrar y comprar.

Asegurar consistencia entre catálogo, buscador, fichas y checkout.

### Prioridad alta

**Sincronización**

Resolver fichas con disponibilidad vencida, evitando confundir errores técnicos con falta de stock.

**Oportunidades**

Aplicar clasificación de relevancia comercial sin dejar de descubrir referencias útiles.

**Datos incompletos**

Revisar productos sin fuente, sin marca o sin precio mayorista USD calculado.

### Prioridad media

- Normalización de marcas.
- Detección de duplicados.
- Optimización de categorías.
- Calidad de imágenes.
- Descripciones.
- Rendimiento.
- Mejoras visuales.
- SEO.

Estas prioridades son una referencia de auditoría y no sustituyen los pedidos actuales del dueño.

---

## 18. Estado real versus estado documentado

Este punto es fundamental.

Distinguir siempre:

**Diseñado:** existe un plan o propuesta.

**Implementado localmente:** hay código, pero no se demostró su funcionamiento productivo.

**Migrado:** existen cambios de base aplicados.

**Desplegado:** Vercel u otro servicio sirve una versión.

**Verificado:** se comprobó el comportamiento con evidencia real.

**Operativo comercialmente:** el proceso puede utilizarse de forma confiable en operaciones reales.

Estos estados no son equivalentes.

El release del 07/11/2026 tiene su propio informe:

`docs/RELEASE-FINAL-2026-11-07.md`

La auditoría de lectura del 10/11/2026 encontró un catálogo diferente al registrado en aquel cierre.

Por eso no reutilizar cantidades antiguas como si fueran actuales.

---

## 19. Validación técnica

Comandos disponibles:

```bash
npm run lint
npm run type-check
npm test
npm run build
```

Ejecutar también pruebas especializadas cuando corresponda.

Para cambios críticos verificar:

- Precios.
- Stock.
- Publicación.
- Identidad de productos.
- Variantes.
- Ofertas de proveedores.
- Checkout.
- Migraciones.
- Autorizaciones.
- RLS.
- Concurrencia.
- Comportamiento público.

Una prueba local exitosa no demuestra por sí sola que producción funcione.

Para reglas completas de validación y despliegue, consultar `AGENTS.md`.

---

## 20. Documentación complementaria

### Operación general

- `AGENTS.md`
- `README.md`
- `docs/RELEASE-FINAL-2026-11-07.md`

### Rentabilidad

- `docs/USD-PROFITABILITY.md`
- `docs/POST-AUDIT-2026-11-06.md`

### Proveedores

- `docs/suppliers/README.md`
- `docs/suppliers/FOUR-SUPPLIER-TRACKER-2026-11-06.md`
- `docs/suppliers/LOCAL-MANUAL-2026-11-05.md`
- `docs/suppliers/LINKING-2026-11-01.md`

### Historial

Las decisiones anteriores pueden consultarse en los informes fechados de `docs/` y en la copia archivada del antiguo `AI_CONTEXT.md`.

Los documentos históricos aportan contexto, pero no anulan instrucciones posteriores.

---

## 21. Mantenimiento de este archivo

`AI_CONTEXT.md` debe mantenerse breve, actualizado y útil.

No convertirlo nuevamente en un registro diario de cambios.

### Cuando se complete un trabajo importante

Actualizar únicamente las secciones afectadas.

Ejemplos:

- Cambió el modelo de precios: actualizar Rentabilidad.
- Se incorporó una nueva automatización: actualizar Automatizaciones.
- Se solucionó una incidencia: retirarla de Problemas conocidos.
- Cambió el número de productos: actualizar la fotografía de auditoría con fecha.
- Se modificó la arquitectura: actualizar Tecnología y modelo de datos.

Los detalles extensos de cada implementación deben quedar en un documento específico dentro de `docs/`.

### Reglas de actualización

1. Mantener las decisiones vigentes en un único lugar.
2. No duplicar instrucciones de `AGENTS.md`.
3. No conservar contradicciones sin aclaración.
4. No mezclar resultados de pruebas con estado productivo.
5. No atribuir disponibilidad a datos vencidos.
6. No tratar cifras históricas como actuales.
7. No registrar credenciales ni secretos.
8. No agregar cientos de líneas por cada pequeña tarea.

### Propósito final

Este documento debe permitir que un agente nuevo comprenda MYA Importaciones en pocos minutos.

Las instrucciones de trabajo viven en `AGENTS.md`.

La historia vive en `docs/`.

El estado real del sistema se verifica en código, Supabase y Vercel.

**El objetivo es que cada agente continúe desarrollando MYA con conocimiento del negocio, sin repetir errores históricos ni perder de vista la rentabilidad, la seguridad y la experiencia del cliente.**