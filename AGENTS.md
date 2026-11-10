# AGENTS.md — MYA Importaciones

## 1. Identidad y objetivo del proyecto

Este repositorio contiene **MYA Importaciones**, un e-commerce argentino de venta minorista y mayorista de productos importados.

- Web: https://myaimportaciones.com
- Repositorio: `MaxiCalamante/myaimportaciones`
- Supabase: `gqcdurxndbeeugjfworx`
- Hosting: Vercel
- Stack: Next.js 16, React 19, TypeScript, Tailwind CSS y Supabase.

MYA trabaja principalmente con productos de proveedores de Paraguay que luego comercializa en Argentina.

**Objetivo comercial:** construir un e-commerce confiable, rentable, escalable y automatizado, con especial atención a cosmética coreana, perfumería, electrónica y herramientas.

El negocio tiene dos modalidades principales:

- Minorista: consumidores finales.
- Mayorista: comerciantes, profesionales y revendedores.

La tienda mayorista es pública y no debe requerir una cuenta especial para consultar productos y precios.

### Principios generales

1. Priorizar la rentabilidad real del negocio.
2. Mantener un catálogo limpio, profesional y actualizado.
3. No vender productos sin disponibilidad suficiente o comprobable.
4. No publicar precios que generen pérdidas.
5. Automatizar tareas repetitivas sin comprometer la seguridad.
6. Preservar los datos comerciales y la integridad de los pedidos.
7. Reutilizar la arquitectura existente antes de crear sistemas nuevos.
8. No inventar información para completar datos faltantes.
9. Mantener una experiencia de usuario rápida, clara y responsive.
10. Favorecer soluciones mantenibles y verificables.

**Regla principal:** no confundir cantidad de productos descubiertos con calidad del catálogo comercial.

---

## 2. Fuentes de verdad y documentación

Antes de modificar una funcionalidad, inspeccionar su implementación actual.

### Documentación relevante

- `docs/RELEASE-FINAL-2026-11-07.md`
- `docs/USD-PROFITABILITY.md`
- `docs/POST-AUDIT-2026-11-06.md`
- `docs/suppliers/README.md`
- `docs/suppliers/FOUR-SUPPLIER-TRACKER-2026-11-06.md`
- `docs/suppliers/LOCAL-MANUAL-2026-11-05.md`

Los documentos con fechas anteriores describen decisiones y estados de su momento.

**No asumir que una descripción histórica refleja necesariamente la producción actual.**

Orden de referencia:

1. Instrucción explícita del dueño en la tarea actual.
2. Reglas de seguridad e integridad de este archivo.
3. Código y configuración realmente desplegados.
4. Estado actual de Supabase y sus migraciones.
5. Documentación vigente verificada.
6. Historial y documentación anterior.

Si existen contradicciones entre documentación, código y producción:

- Identificar la contradicción.
- Comprobar cuál representa el comportamiento real.
- Evitar sobrescribir datos con suposiciones.
- Resolverla de forma compatible.
- Documentar el resultado.

No asumir que una migración está pendiente únicamente porque su fecha local difiere de la versión registrada en Supabase.

---

## 3. Forma de trabajar de los agentes

Los agentes deben actuar como desarrolladores senior responsables de un sistema comercial en producción.

### Antes de modificar

1. Comprender el objetivo solicitado.
2. Inspeccionar los archivos relacionados.
3. Revisar implementaciones y servicios existentes.
4. Detectar riesgos, dependencias y efectos secundarios.
5. Consultar el esquema real si corresponde.
6. Definir verificaciones para determinar si el cambio funciona.

### Durante el desarrollo

- Evitar refactorizaciones innecesarias.
- No modificar funcionalidades ajenas al pedido sin justificación.
- Preferir cambios pequeños, coherentes y comprobables.
- Respetar convenciones existentes.
- Usar TypeScript con tipos correctos.
- Evitar `any` injustificado.
- Mantener la lógica comercial centralizada.
- No duplicar motores de precios, stock ni proveedores.
- Manejar errores y estados desconocidos explícitamente.
- Evitar introducir dependencias innecesarias.

### Prohibiciones

No se permite:

- Inventar datos de proveedores.
- Simular pruebas como si fueran reales.
- Ocultar errores para conseguir un build exitoso.
- Deshabilitar validaciones de seguridad para resolver errores.
- Modificar precios indiscriminadamente.
- Eliminar pedidos o historiales comerciales.
- Exponer credenciales.
- Ejecutar operaciones destructivas masivas sin autorización.
- Desplegar código que no haya superado las verificaciones críticas.

La autorización expresa del dueño para implementar, migrar, hacer commit, push o desplegar una tarea permite avanzar dentro del alcance aprobado. No exigir una nueva autorización para cada paso ya incluido en ese pedido.

Los cambios destructivos o fuera del alcance requieren autorización independiente.

---

## 4. Proveedores autorizados

MYA trabaja exclusivamente con estos cuatro proveedores operativos:

| Proveedor | Dominio | Rubro |
|---|---|---|
| Atacado Connect | atacadoconnect.com | Electrónica y tecnología |
| Atacado USA | atacadousa.com.py | Belleza, perfumería y cosmética |
| Star Company | starcompany-py.com | Belleza, perfumería y cosmética |
| Total Herramientas Oficial | totalherramientasoficial.com.py | Herramientas y equipamiento |

Los demás proveedores históricos están archivados.

No reactivarlos ni sincronizarlos sin autorización.

**Star Company no debe confundirse con Star Compass.**

### Reglas de abastecimiento

- Consultar únicamente fuentes autorizadas.
- Respetar las limitaciones técnicas y de acceso de cada proveedor.
- No evadir controles ni utilizar endpoints internos no autorizados.
- No utilizar cookies, tokens o credenciales obtenidos indebidamente.
- Mantener evidencia de precios y disponibilidad.
- Preservar la identidad del proveedor.
- Comparar modelos y variantes exactas.
- No vincular productos diferentes por similitud de títulos.
- Distinguir cantidades, colores, capacidades, tamaños y presentaciones.
- No interpretar un botón de compra como prueba suficiente de stock.
- No convertir disponibilidad del proveedor en inventario físico MYA.

Tablas y sistemas relevantes:

- `suppliers`
- `supplier_offers`
- `supplier_observations`
- `supplier_tracker_items`
- `supplier_tracker_sources`
- `supplier_tracker_tasks`
- `supplier_discovery_jobs`
- `supplier_link_decisions`
- `product_supplier_preferences`

Antes de modificar estos sistemas, revisar su esquema real y la documentación correspondiente.

---

## 5. Rentabilidad y precios

La política comercial de referencia establece:

- Margen objetivo minorista: **30%**.
- Margen objetivo mayorista: **18%**.
- Margen mínimo: **10%**.

Estos porcentajes representan margen de contribución sobre el precio de venta, no un recargo sobre el costo.

### Cálculo

El costo total debe contemplar, cuando corresponda:

- Costo del proveedor.
- Moneda de origen.
- Cotización efectiva de adquisición de USD/USDT.
- Transporte desde Paraguay.
- Comisión del pasador.
- Gastos de importación.
- Transporte interno.
- Comisiones de cobro.
- Costos variables atribuibles.
- Otros gastos verificados.

Fórmula conceptual:

`precio_venta = costo_total / (1 - margen_objetivo)`

Utilizar el motor decimal central existente, no implementar cálculos monetarios con aproximaciones inconsistentes.

### Reglas obligatorias

1. El costo de proveedor no equivale al costo final.
2. Nunca confundir margen con markup.
3. No utilizar cotizaciones históricas como actuales.
4. Separar dólar de exhibición, dólar de adquisición y costo de USDT.
5. No aplicar tarifas del pasador sin comprobar sus condiciones.
6. No utilizar automáticamente una tarifa reducida por volumen sin evidencia.
7. Respetar excepciones comerciales aprobadas.
8. Preservar precios manuales cuando corresponda.
9. No reemplazar un precio conocido por una estimación sin evidencia suficiente.
10. Registrar el origen de cada actualización.

### Protección contra pérdidas

Si un precio calculado resulta inferior al costo total o no respeta el margen mínimo:

- No publicarlo automáticamente.
- No reemplazar silenciosamente un precio anterior.
- Marcar el producto para revisión.
- Registrar costos, fecha, moneda y motivo.
- Impedir ventas económicamente inválidas cuando corresponda.

Un precio marcado como verificado en la base no demuestra por sí solo que sea correcto. Ante contradicciones, revisar las evidencias originales.

### Moneda

Mantener la arquitectura de precios en USD y la visualización en ARS conforme a las políticas vigentes.

No mezclar monedas ni aplicar conversiones sucesivas.

---

## 6. Stock, disponibilidad y visibilidad pública

MYA vende principalmente bajo pedido.

Por tanto:

**`products.stock = 0` no significa necesariamente que el proveedor esté agotado.**

Existen dos conceptos diferentes:

- Stock físico propio de MYA.
- Disponibilidad verificada en proveedores.

La visibilidad y posibilidad de compra deben considerar ambos correctamente.

### Política comercial objetivo

La arquitectura debe permitir los siguientes estados:

- `AVAILABLE`
- `OUT_OF_STOCK`
- `UNKNOWN`
- `STALE`
- `HIDDEN`
- `ARCHIVED`
- `REVIEW_REQUIRED`

Estos estados representan el comportamiento comercial deseado. Antes de implementarlos, comprobar qué campos y funciones existen y cuáles requieren migraciones.

No asumir que la política completa ya está implementada.

### Sin stock confirmado

Cuando todos los proveedores válidos confirman que un producto está agotado:

1. Ocultarlo inmediatamente del catálogo público.
2. Impedir nuevas compras.
3. Registrar la fecha y evidencia.
4. Mantener el seguimiento de sus proveedores.
5. Conservar sus relaciones e historial.

Si otro proveedor autorizado dispone del mismo producto y variante exacta, evaluar mantenerlo visible con precio y costos recalculados.

### Regla de siete días

Si el producto permanece sin stock confirmado durante siete días consecutivos:

- Archivarlo lógicamente.
- Retirarlo de todas las consultas públicas.
- Mantenerlo disponible para administración y seguimiento.
- Conservar sus identificadores e historial.
- Evitar duplicarlo si reaparece.

Si recupera stock, puede regresar al circuito de oportunidades y revisión comercial.

No realizar borrados físicos automáticos.

### Estados desconocidos

No confundir:

- Falta de stock confirmada.
- Error del scraper.
- Timeout.
- HTTP 404.
- Cambio de URL.
- Verificación vencida.
- Información insuficiente.

Una verificación vencida no es una prueba de agotamiento.

Ante incertidumbre, evitar nuevas compras sin verificación suficiente y aplicar una política de visibilidad segura, sin destruir información.

Si falla masivamente un proveedor o el rastreador, detectar el incidente antes de archivar cientos de productos.

### Consistencia pública

Aplicar una condición centralizada de publicabilidad en:

- Inicio.
- Catálogo minorista.
- Catálogo mayorista.
- Páginas de producto.
- Buscador.
- Filtros.
- Destacados.
- Recomendaciones.
- Productos relacionados.
- Carrito.
- Checkout.
- Sitemap.
- APIs públicas y feeds.

Una ficha oculta no debe permanecer comprable mediante su URL anterior.

El checkout debe revalidar precio y disponibilidad antes de confirmar la operación.

---

## 7. Rastreador y oportunidades comerciales

**Descubrir productos no significa publicarlos.**

El objetivo del rastreador es mantener información amplia sobre los proveedores.

El objetivo de la tienda es publicar productos seleccionados, confiables y rentables.

### Flujo correcto

`Descubrimiento → Verificación → Clasificación → Costos → Rentabilidad → Revisión → Publicación`

Los candidatos descubiertos permanecen privados hasta superar los controles correspondientes.

La importación automática de borradores se mantiene desactivada por defecto, salvo autorización expresa.

No publicar directamente candidatos sin completar su validación comercial.

### Clasificación de oportunidades

Distinguir tres grupos:

**1. Recomendadas**

Productos con evidencia suficiente, identificación correcta, disponibilidad vigente y condiciones comerciales atractivas.

**2. Exploración**

Artículos descubiertos que requieren completar información, verificar stock, obtener costos o estudiar su relevancia.

**3. Descartadas**

Referencias duplicadas, no autorizadas, irrelevantes o comercialmente inviables.

Conservar registro de las exclusiones para evitar que los mismos artículos descartados vuelvan continuamente como recomendaciones.

### Selección inteligente

Priorizar:

- Productos reconocibles y comercializables.
- Marcas relevantes.
- Productos con demanda potencial.
- Artículos con márgenes adecuados.
- Productos fáciles de describir y vender.
- Presentaciones con potencial mayorista.
- Artículos con costos logísticos razonables.

No llenar la tienda de miles de accesorios menores únicamente porque los proveedores los tienen publicados.

### Herramientas

Priorizar equipamiento de interés comercial, como:

- Taladros.
- Atornilladores.
- Rotomartillos.
- Amoladoras.
- Sierras.
- Hidrolavadoras.
- Soldadoras.
- Compresores.
- Kits profesionales.
- Herramientas inalámbricas.

Reducir la prioridad de tornillos sueltos, tuercas, arandelas, repuestos diminutos y consumibles de valor insignificante.

**No implementar filtros ingenuos por palabras.**

Un atornillador eléctrico no es un tornillo suelto. Un kit profesional de brocas puede ser comercialmente interesante.

Clasificar considerando el producto completo, categoría, precio, presentación y rentabilidad.

### Belleza y cosmética

Priorizar:

- Skincare coreano.
- Sérums.
- Cremas.
- Limpiadores.
- Tónicos.
- Mascarillas.
- Protectores solares.
- Tratamientos faciales.
- Perfumes y fragancias.
- Packs para revendedores.

Los productos económicos pueden ser rentables como parte de combos o compras mayoristas.

No descartarlos exclusivamente por tener bajo precio unitario.

---

## 8. Calidad del catálogo

Los productos publicados deben cumplir estándares mínimos de calidad.

Verificar:

1. Título claro.
2. Marca normalizada.
3. Modelo exacto.
4. Presentación correcta.
5. Descripción coherente.
6. Imagen correcta.
7. Categoría apropiada.
8. URL verificable del proveedor.
9. Precio válido.
10. Disponibilidad comprobable.
11. Costos actualizados.
12. Rentabilidad suficiente.
13. Ausencia de duplicados comerciales.
14. Documentación y autorización cuando corresponda.

No fabricar imágenes, descripciones, especificaciones ni precios para completar campos faltantes.

Si la identidad del producto es ambigua, dejarlo pendiente de revisión.

### Duplicados

Identificar duplicados considerando:

- Marca.
- Modelo.
- GTIN/EAN.
- SKU.
- Capacidad.
- Tamaño.
- Color.
- Contenido del paquete.
- Condición comercial.

No fusionar productos distintos únicamente porque sus títulos sean parecidos.

Mantener intactas las relaciones con pedidos, variantes, imágenes y proveedores.

---

## 9. Seguridad de Supabase

Supabase contiene información comercial crítica.

### Reglas

- Mantener RLS correctamente configurado.
- Usar controles de administrador existentes.
- Reutilizar `getAdminClient` y las verificaciones de `is_admin()` donde correspondan.
- No exponer claves administrativas.
- No incluir `service_role` ni secretos en variables públicas.
- Mantener costos y ofertas privadas fuera de consultas públicas.
- Restringir escrituras sensibles.
- Evitar SQL dinámico inseguro.
- Utilizar transacciones para modificaciones relacionadas.
- Preservar integridad referencial.
- Auditar cambios relevantes.

Las vistas, funciones RPC y funciones `SECURITY DEFINER` requieren especial revisión de permisos.

No solucionar problemas de autorización desactivando RLS.

### Datos críticos

Proteger especialmente:

- `products`
- `product_variants`
- `product_costs`
- `product_usd_prices`
- `orders`
- `order_items`
- `supplier_offers`
- `supplier_observations`
- Tablas de auditoría.
- Historiales de pagos y cotizaciones.

No borrar ni reconstruir órdenes históricas para resolver problemas del catálogo.

---

## 10. Migraciones y cambios productivos

Antes de una modificación de esquema:

1. Inspeccionar tablas, columnas, índices y restricciones existentes.
2. Revisar el historial de migraciones.
3. Evitar objetos duplicados.
4. Preparar una migración versionada.
5. Probarla en un entorno seguro.
6. Evaluar compatibilidad con los datos actuales.
7. Definir cómo revertirla cuando sea posible.
8. Verificar permisos y RLS.
9. Comprobar resultados después de aplicarla.

Nunca ejecutar una limpieza masiva sin una simulación previa.

Toda operación masiva debe informar:

- Registros afectados.
- Criterios utilizados.
- Riesgos identificados.
- Registros protegidos.
- Método de restauración.
- Resultado de las verificaciones.

No usar `DELETE` físico si una baja lógica resuelve el problema.

No presentar como aplicada una migración que solamente se preparó o probó localmente.

---

## 11. Automatización

MYA utiliza automatizaciones alojadas principalmente en Supabase y Vercel.

Mantener y mejorar la infraestructura existente.

### Reglas

- Reutilizar workers y cron jobs.
- Evitar procesos duplicados.
- Utilizar leases y controles de concurrencia.
- Implementar reintentos con límites.
- Registrar errores y cambios.
- Evitar consultas excesivas.
- Respetar las limitaciones de los proveedores.
- No crear bucles de sincronización infinitos.
- No perder cambios manuales válidos.
- No sobrescribir información reciente con observaciones antiguas.

Las tareas deben ser idempotentes siempre que resulte aplicable.

### PC local

No usar la PC del dueño como servidor permanente.

Está prohibido instalar sin autorización:

- Servicios de Windows.
- Tareas periódicas.
- Procesos persistentes.
- Automatizaciones de arranque.
- Ventanas de consola en segundo plano.

La herramienta local de proveedores puede ejecutarse manualmente cuando el dueño la inicia o solicita explícitamente.

Su documentación se encuentra en `docs/suppliers/LOCAL-MANUAL-2026-11-05.md`.

---

## 12. Frontend y experiencia de usuario

La web debe transmitir confianza y profesionalismo.

### Prioridades

- Diseño moderno y consistente.
- Buena experiencia móvil.
- Navegación clara.
- Categorías organizadas.
- Productos fáciles de encontrar.
- Fotografías de calidad.
- Precios comprensibles.
- Conversión USD/ARS coherente.
- Catálogo mayorista accesible.
- Checkout simple.
- Buen rendimiento.
- SEO técnico correcto.

Evitar:

- Tarjetas desproporcionadas.
- Títulos cortados incorrectamente.
- Imágenes deformadas.
- Categorías vacías innecesarias.
- Productos duplicados.
- Badges excesivos.
- Inconsistencias de precios.
- Información comercial engañosa.

Antes de realizar un rediseño amplio, revisar los componentes y estilos existentes.

No rehacer la identidad visual completa cuando el pedido se limita a una sección.

Probar siempre desktop y mobile.

---

## 13. Cumplimiento comercial y documentación

No afirmar que un producto dispone de documentación que no haya sido verificada.

Especialmente para cosmética y perfumería:

- Revisar origen.
- Verificar identidad comercial.
- No inventar lotes.
- No inventar fechas de vencimiento.
- No prometer habilitaciones sanitarias sin respaldo.
- No afirmar que existe documentación ANMAT sin comprobarla.
- No inventar certificados.
- No prometer facturas o condiciones fiscales no verificadas.

Respetar los requisitos aplicables a la comercialización e importación en Argentina.

Las descripciones no deben inventar beneficios médicos o terapéuticos.

No copiar contenido de proveedores si su reutilización no está autorizada.

---

## 14. Pedidos, pagos y checkout

El checkout es una funcionalidad crítica.

Nunca asumir que un precio mostrado anteriormente sigue siendo válido al momento de pagar.

Verificar:

- Identidad exacta del producto.
- Variante.
- Estado comercial.
- Disponibilidad vigente.
- Precio actualizado.
- Moneda.
- Cotización aplicable.
- Costos y márgenes.
- Medio de pago.
- Cantidad.
- Reglas mayoristas.
- Costos de envío.
- Integridad de la orden.

No modificar retroactivamente importes históricos de órdenes confirmadas.

Las operaciones de pago requieren idempotencia y controles contra duplicaciones.

No ejecutar cobros, compras o pedidos reales como parte de pruebas técnicas.

---

## 15. Auditoría continua y mantenimiento

Cuando se solicite auditar el catálogo, revisar el conjunto completo y no solamente los primeros resultados.

Medir:

- Productos publicados.
- Productos ocultos.
- Productos archivados.
- Productos con stock confirmado.
- Productos con stock desconocido.
- Verificaciones vencidas.
- Productos sin proveedor válido.
- Productos sin costo confiable.
- Precios bajo costo.
- Precios bajo margen.
- Productos sin imagen.
- Productos sin marca.
- Productos sin fuente.
- Duplicados.
- Oportunidades pendientes.
- Errores del rastreador.

Comparar resultados con la situación anterior cuando exista una referencia confiable.

No asumir que todas las incidencias son defectos nuevos.

La auditoría debe terminar en recomendaciones concretas, priorizadas por riesgo e impacto.

---

## 16. Pruebas obligatorias

El proyecto dispone de scripts de validación:

- `npm run lint`
- `npm run type-check`
- `npm test`
- `npm run build`

Ejecutar las verificaciones relevantes al cambio.

Agregar pruebas específicas cuando se modifique lógica crítica.

### Escenarios prioritarios

- Cambios de stock.
- Agotamiento y recuperación.
- Archivo lógico.
- Varios proveedores para un producto.
- Variantes.
- Precios USD.
- Cálculos de margen.
- Conversión de moneda.
- Carrito.
- Checkout.
- Permisos de administrador.
- RLS.
- Publicación.
- Importación.
- Duplicados.
- Concurrencia.
- Errores de red.

Distinguir claramente:

- Prueba unitaria.
- Prueba de integración.
- Prueba con datos simulados.
- Prueba con Supabase real.
- Verificación productiva.
- Operación comercial real.

No declarar que algo funciona en producción basándose únicamente en tests locales.

---

## 17. Despliegues

Cuando el dueño autorice desplegar:

1. Revisar cambios pendientes.
2. Verificar el alcance.
3. Ejecutar las pruebas.
4. Comprobar TypeScript.
5. Comprobar lint.
6. Ejecutar el build.
7. Aplicar las migraciones autorizadas en el orden correcto.
8. Verificar el esquema remoto.
9. Realizar commit.
10. Realizar push.
11. Desplegar en Vercel.
12. Revisar el estado del despliegue.
13. Probar las rutas afectadas.
14. Verificar funcionamiento real en producción.
15. Revisar errores y logs disponibles.

No afirmar que una tarea fue desplegada simplemente porque el commit llegó a GitHub.

Si una verificación crítica falla, detener la promoción del cambio defectuoso y explicar el problema.

No modificar secretos de producción sin necesidad y autorización.

No apagar la PC salvo solicitud explícita del dueño, y únicamente después de concluir las verificaciones necesarias.

---

## 18. Comunicación y entrega final

Al finalizar cada tarea, responder en español argentino, de forma clara, técnica y directa.

Evitar informes extensos que no expliquen resultados reales.

Siempre informar:

**Qué se hizo:** cambios implementados.

**Qué se verificó:** pruebas y resultados.

**Qué quedó pendiente:** limitaciones o problemas no resueltos.

**Estado de producción:** indicar explícitamente si los cambios están solamente en local, committeados, subidos a GitHub, migrados a Supabase o desplegados y verificados en Vercel.

No confundir ninguno de esos estados.

Cuando existan modificaciones de datos, informar cantidades afectadas.

Al final, incluir entre una y tres sugerencias concretas de mejoras prioritarias.

No sugerir tareas genéricas si existen problemas críticos pendientes.

---

## 19. Prioridades permanentes del negocio

Ante varias alternativas técnicamente válidas, priorizar en este orden:

1. Seguridad de pedidos, pagos y datos.
2. Evitar pérdidas económicas.
3. Disponibilidad real de los productos.
4. Integridad del catálogo.
5. Calidad de la información comercial.
6. Automatización confiable.
7. Experiencia de compra.
8. Rendimiento.
9. SEO.
10. Mejoras visuales secundarias.

No sacrificar seguridad o rentabilidad para aumentar artificialmente el número de productos publicados.

El sistema debe ayudar a MYA a vender más, no solamente a almacenar más información.

---

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->