# MYA Importaciones · Catálogo de oportunidades y validación aislada

Trabajo del **7 de noviembre de 2026** en el checkout local, con PostgreSQL aislado y lecturas HTTP públicas. Supabase productivo se consultó en modo de solo lectura. Este informe distingue recorridos agotados, cobertura desconocida y pruebas comerciales controladas.

## 1. Estado y causa del descubrimiento anterior

El registro productivo consultado contenía cuatro proveedores autorizados y cinco archivados. El rastreador tenía una categoría programada, Cosméticos de Atacado USA, y cuatro fuentes de validación de una ficha. Las páginas hijas se limitaban a la categoría cargada a mano. Los adaptadores devolvían enlaces de categorías y el trabajador los descartaba. Atacado Connect rechazaba las rutas de categoría con más de un nivel. El radar de Oportunidades buscaba ofertas comerciales y no representaba las filas privadas descubiertas. La incorporación individual conducía a un borrador y exigía otro recorrido para activarlo. El actualizador de ofertas reemplazaba su JSON de evidencia. La integración ahora conserva la marca de revisión al refrescar y registra el alta asistida en una relación privada separada de los datos del proveedor.

El registro de categorías premium de Star también podía conservar un alias incorrecto del menú cuando varios enlaces compartían la misma URL. Atacado USA presenta tarjetas con moneda ambigua y un enlace nativo PrestaShop que puede aportar evidencia de moneda, cantidad y presentación. Una tarjeta observada decía Salvo Intense y la ficha nativa del mismo ID decía Salvo. El seguimiento nuevo conserva esa discrepancia para revisión.

## 2. Arquitectura y funcionalidades

- Se conservaron cuatro adaptadores, las tablas privadas de rastreador, las membresías, la cola, los leases y el historial existentes. Cada proveedor tiene una fuente raíz y cada categoría una membresía independiente. El trabajo raíz descubre categorías, incorpora su paginación a la cola y registra las páginas terminadas, pendientes, repetidas y bloqueadas.
- Los candidatos se guardan por proveedor e identificador estable, con deduplicación adicional por URL. Se conserva evidencia de listado y de ficha, junto con sus fechas. Cada detalle sólo acredita lo que ofrece su fuente. Una ausencia en un listado no retira una oferta. Se mantiene el criterio existente de verificaciones 404 separadas para retiro de la ficha.
- `/admin/oportunidades` consulta y pagina en PostgreSQL. Busca por nombre, marca, SKU y modelo, filtra por proveedor, fuente, disponibilidad, precio, costo, margen y fecha de verificación, y ofrece orden por novedad, precio, margen o fecha. El detalle muestra original, fecha, condición y respaldos. El radar anterior sigue en `?vista=radar`, con la revisión masiva y las herramientas de Proveedores separadas.
- El costo y el margen calculados se muestran donde existe revisión económica. Las sugerencias de fuentes usan identidad exacta y el comparador existente conserva las preferencias manuales. La clasificación de stock y margen no estima ventas ni demanda.
- El trabajador sólo consulta URLs HTTPS de los cuatro dominios permitidos. La red comprueba robots y destinos de redirección. Se mantienen una solicitud concurrente por proveedor, una reserva de cadencia de 10 segundos, timeout, backoff y reintentos. El sitemap tiene un límite de tamaño de respuesta independiente del límite de HTML. Las categorías gestionadas prescinden de los antiguos máximos de páginas o artículos por recorrido. Si una rama sigue ofreciendo respuestas idénticas en URLs nuevas, el trabajador registra el motivo y deja esa cobertura como parcial.

## 3. Cobertura con respuestas reales

Corte **7/11/26, 7:23:16 p. m. de Argentina**. Se guardaron **10.633 referencias elegibles únicas** en los cuatro catálogos privados de prueba. Se interrumpió el primer proceso y se reabrió la misma base. Los recorridos siguieron avanzando sin duplicar el catálogo ni reiniciar las categorías ya agotadas.

| Proveedor | Referencias | Páginas | Categorías con páginas / detectadas | Categorías agotadas | Páginas en cola al corte | Con precio | Con stock verificado en el barrido | Estado |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Star Company | 2.918 | 124 | 2/2 | 2 | 0 | 2.918 | 119 | Paginación agotada |
| Atacado USA | 561 | 48 | 2/2 | 2 | 0 | 195 | 195 | Paginación agotada |
| Atacado Connect | 3.217 | 243 | 154/154 | 69 | 342 | 2.311 | 0 | Parcial |
| Total Herramientas Oficial | 3.937 | 243 | 73/73 | 69 | 13 | 2.282 | 0 | Parcial |

Star reconcilió los recuentos por categoría de 2.325 en Perfumes y 628 en Cosméticos. Hubo 35 referencias compartidas entre ambas categorías. En Atacado USA se agotaron 34 páginas de Perfumes y 14 de Cosméticos, con 404 y 157 referencias respectivamente. El contador de páginas en cola es el trabajo visible al corte. Algunas páginas pendientes pueden descubrir nuevos enlaces. Las verificaciones de las cuatro fichas de muestra se ejecutaron por separado.

Las identidades únicas son de productos de origen. Una referencia puede pertenecer a más de una categoría. Las cifras no representan artículos en venta ni certifican todas las variantes ocultas, inventario físico, autenticidad, habilitación, documentación aduanera o permiso de imágenes.

- **Star Company.** Recorrido de las categorías públicas Perfumes y Cosméticos. El sitio informa un total por categoría. La URL premium se canonicaliza y se ignoran los filtros de fabricante como raíces nuevas. Las fichas usan los datos primarios PrestaShop. El sitemap estándar respondió 404.
- **Atacado USA.** El sitio usa un frontal propio sobre PrestaShop. Se recorrieron Perfumes y Cosméticos siguiendo la navegación pública. Las fichas nativas enlazadas ofrecen mejor evidencia que la tarjeta. El sitemap estándar respondió 404. No se identificó un feed autorizado. El Webservice oficial de PrestaShop requiere que el operador lo habilite y entregue una clave con permisos limitados. [Documentación de PrestaShop](https://devdocs.prestashop-project.org/9/webservice/tutorials/creating-access/)
- **Atacado Connect.** El sitemap público devolvió 21.960 URLs, entre ellas 21.122 fichas del sitio completo. Esas cifras incluyen rubros fuera del alcance MYA. Se detectaron 154 rutas elegibles de Games, Smartphones, Informática, Eletrônicos y Eletroportáteis. Se usan sitemap, HTML público paginado y JSON-LD de detalle. `robots.txt` excluye `/api/`. La opción «Baixar lista» se inspeccionó en navegador con esas rutas bloqueadas. La exportación quedó sin verificar bajo esas condiciones. [Sitemap](https://atacadoconnect.com/sitemap.xml) · [Robots](https://atacadoconnect.com/robots.txt)
- **Total Herramientas Oficial.** Se recorren las categorías de herramientas y taller y sus subcategorías visibles. La fuente expone recuentos en listados, marca, SKU, fotos y ficha principal. La muestra de herramientas indicó 4.025 referencias en esa sección. El precio visible se separa de la leyenda de IVA. En la muestra de detalle el proveedor publicó «PREÇO SEM I.V.A.». El robots estándar respondió 404 y el sitemap estándar redirigió a otra ruta. [Proveedor](https://www.totalherramientasoficial.com.py/)

## 4. Publicación asistida

La ficha muestra una propuesta de título y categoría. El administrador puede corregirlas, revisar la descripción en español y confirmar la identidad, el uso de imágenes y los requisitos comerciales. La vista previa guarda una revisión privada y explica cualquier dato faltante. El desglose económico utiliza el mismo formato documentado de Moneda. En Total, si el origen no acredita IVA incluido, se exige documento e importe de IVA atribuible, incluso si corresponde cero.

**Publicar en MYA** pide una comprobación de origen si la evidencia supera dos minutos. Si el proveedor está ocupado o en pausa por cadencia, se encola la verificación y se informa el estado. La transacción comprueba evidencia de los últimos cinco minutos, revisión vigente, pertenencia al catálogo elegible, precio, moneda, disponibilidad y costos. Genera la ficha, costos, precio base USD, oferta, auditoría de identidad y enlace en una sola operación. La ficha se activa sólo si supera el control del catálogo público. El doble envío devuelve la ficha existente. Se reutilizan las etiquetas SEO y datos estructurados de la ficha pública, con slug único e imagen asociada a la presentación confirmada.

Las cuatro muestras de origen se verificaron por HTTP y completaron la publicación en PostgreSQL local con documentación, cotización y tarifas **controladas exclusivamente para QA**. Con la evidencia comercial real disponible, la vista previa las bloqueó por permisos de imagen, respaldos de cumplimiento y base documentada de gastos. Star y USA también carecían de una descripción de origen suficiente. Los resultados controlados no certifican rentabilidad real ni autorización comercial.

| Proveedor | Identificador observado | Disponibilidad de la ficha de muestra | Publicación aislada con costos controlados |
| --- | --- | --- | --- |
| Star Company | 15478 | Confirmada, con cantidad en origen | Activa, visible como anónimo, stock físico 0 |
| Atacado USA | 8735 | Confirmada en ficha nativa, con cantidad en origen | Activa, visible como anónimo, stock físico 0 |
| Atacado Connect | 1194784 | Confirmada, sin cantidad explícita | Activa, visible como anónimo, stock físico 0 |
| Total Herramientas | 53487 | Confirmada, sin cantidad explícita, precio sin IVA | Activa, visible como anónimo, stock físico 0 |

Para perfumes y cosméticos se requiere documentar el encuadre y respaldo de importación y comercialización aplicable a esa presentación. La revisión humana también cubre las restricciones de la tecnología y herramientas. [ANMAT, Disposición 236/2026](https://www.argentina.gob.ar/normativa/nacional/disposici%C3%B3n-236-2026-423003/texto)

## 5. Márgenes, precios y checkout

Supabase productivo confirmó los objetivos de contribución de **30% minorista, 18% mayorista y piso 10%**, con política en `preview`. Las tarifas de transferencia y Mercado Pago estaban sin confirmar. El motor calcula contra el precio de venta con la base contable elegida. Si corresponde IVA recuperable, la base neta se declara explícitamente. El cálculo incluye adquisición, conversión documentada, pasador, imputación de lote, costos de venta y comisión del medio. El costo de una muestra sintética verificó USD 50 de origen + USD 6 de pasador imputado + USD 5 de IVA, para USD 61 de costo directo, con los dos objetivos alcanzados. Se probaron costos o tributos ausentes, cantidades incompatibles y pérdida de stock.

Para fichas creadas por Oportunidades, el checkout intenta una verificación de origen cuando la evidencia excede cinco minutos y aplica un máximo de 30 minutos a la evidencia utilizable. Si la fuente sólo confirma estado y falta una cantidad, una selección superior a una unidad queda para confirmación. Si cambian costo, evidencia de identidad, stock o margen efectivo, la validación rechaza el cobro correspondiente. La revisión anterior de precios y los productos manuales conservan su recorrido. Con la política en `preview`, los cambios automáticos se registran como propuestas. La aplicación de precios conserva el límite comercial vigente y requiere evidencia compatible, incluido el tratamiento tributario en Total.

## 6. Sincronización

- **Manual.** Botones para todos, proveedor, categoría y referencia. Las acciones encolan trabajos reales. La base evita dos recorridos raíz simultáneos del mismo proveedor. El panel consulta pendientes, fechas, errores y detalle por categoría.
- **Programada.** El cron productivo existente `mya-supplier-catalog` está activo cada minuto. El código nuevo reutiliza ese ciclo para iniciar recorridos de navegación cada 24 horas cuando el anterior termina. Se priorizan las fichas publicadas y los controles solicitados. Los candidatos leen el detalle al entrar a la cola y lo vuelven a consultar con menor frecuencia. El proceso conserva los datos anteriores ante errores temporales. Una caída de más del 40% frente al último recorrido completo, una categoría relevante que deja de aparecer o un total informado sin reconciliar genera cobertura parcial.
- **Límite operativo.** Programar un recorrido diario es diferente de demostrar que el sitio entrega todas sus referencias en 24 horas. Con una cadencia de 10 segundos, sólo caben 8.640 solicitudes por proveedor en un día aun con utilización continua. Atacado Connect publica más fichas que ese máximo para el sitio completo. Un feed oficial con cambios y stock es la vía para certificar detalle diario a gran escala. La cadencia real del worker alojado debe medirse antes de comprometer un plazo.

## 7. Pruebas y rendimiento

| Verificación | Resultado |
| --- | --- |
| Suite del repositorio | 422 pruebas aprobadas, incluida la regresión de checkout y catálogo. Las pruebas focalizadas se repitieron después del ajuste de paginación repetida. |
| TypeScript, lint y build | Tipos y build de producción aislado aprobados. Lint con 0 errores y 134 advertencias preexistentes. |
| Edge | Paquete de 35 archivos y `deno check` aprobados. Se añadió la declaración de tipos de Papa Parse en Deno. |
| Base de datos | Instalación de las dos migraciones, RLS, doble confirmación, leases vencidos, deduplicación, cobertura incompleta, rechazo de IVA ausente, envío sin costo, cantidad no confirmada y agotamiento. |
| Publicación de cuatro fichas reales | Lectura de listado y ficha pública, guardado local, vista previa bloqueada sin respaldo y activación local con costos de prueba. Se volvió a ejecutar la lógica final sobre las capturas HTTP. |
| Cambios de precio | Con datos controlados, `preview` conservó el precio y devolvió propuesta. Una suba y una baja aplicadas bajo `enforce` aislado actualizaron el precio USD y su costo compatible con checkout. |
| Navegador | Next compilado, Auth local controlado y RPC reales de PostgreSQL a 320, 390 y 1440 px. Se comprobó denegación a visitante/cliente, cola de cuatro proveedores, búsqueda, vista previa bloqueada, publicación y ficha anónima HTTP 200 con datos estructurados y sin costos privados. La regresión de carrito y checkout pasó a 390 y 1280 px con ambos medios de pago bajo control de prueba. |
| Rendimiento | 30.000 filas locales, 24 por página. En una medición aislada, búsqueda 6 ms, página 600 en 205 ms y filtro 2 ms. El sitemap real de 5,55 MB se procesó en 266 ms en Node local. |

Se comprobaron los puntos de anclaje de las funciones que se amplían con una consulta de sólo lectura contra Supabase productivo. PostgreSQL aislado comprobó permisos, idempotencia, publicación y checkout. Las lecturas reales de proveedores se guardaron en `scratch/suppliers-private`. Las trazas con precios, URLs de fichas y capturas de administración quedan fuera de Git. La evidencia privada de cobertura por categoría queda en `scratch/suppliers-private/mass-validation/report.json`. El recorrido local se puede reanudar desde la misma base con `node --import tsx scripts/verify-supplier-catalog-live.mts scratch/suppliers-private/mass-validation --resume --minutes=30`. No se hicieron pedidos ni cobros externos.

## 8. Migraciones y revisión de seguridad

| Orden | Archivo | Contenido |
| --- | --- | --- |
| 1 | `20261107212258_supplier_catalog_discovery.sql` | Raíces, categorías, índices, coordinación, métricas y programación diaria sobre el cron existente. |
| 2 | `20261107213252_supplier_opportunity_publication.sql` | RPC privadas, revisión y publicación transaccional, lectura paginada, comprobaciones de compra y proyección de costos compatible con checkout. |

Ambas migraciones son aditivas para datos y se aplicaron a PostgreSQL aislado. Las raíces y categorías del catálogo masivo tienen un control SQL que impide los borradores automáticos. Las tablas privadas tienen RLS y las RPC distinguen administrador, service role y anónimo. El acceso público a la ficha reutiliza el control de identidad de catálogo. Los precios y URLs privados se conservan en tablas y vistas administrativas. Los procesos de Windows periódicos siguen fuera de la arquitectura.

## 9. Pendientes y puesta en producción

1. Revisar el diff, las dos migraciones, la interfaz y los respaldos de una referencia comercial real. Confirmar comisiones vigentes de transferencia y Mercado Pago, liquidación de adquisición, costo del pasador, IVA y uso de imágenes por producto.
2. Después de aprobación, repetir la secuencia en un Supabase aislado con el historial productivo reconciliado. Empaquetar Edge con `node scripts/package-supplier-cloud.mjs`. Actualizar primero `supplier-tracking` con el paquete compatible, esperar que terminen sus leases anteriores y aplicar sólo las dos migraciones revisadas en el orden indicado. Luego construir y validar Vercel Preview con el código y las migraciones correspondientes. En el panel, comprobar los cuatro recorridos, la reserva concurrente y una publicación con una sesión administrativa autorizada.
3. Para promover, comparar el commit exacto y las versiones SQL, revisar la ejecución diaria y el tiempo hasta vaciar las colas, verificar ficha anónima, checkout sin cobro, sitemap, catálogo y ausencia de columnas privadas. Solicitar a Connect una exportación autorizada con identificador de producto y variante, categoría, precio, moneda, stock y fecha de cambio. Para ampliar variantes ocultas en Star y USA, pedir acceso de lectura al Webservice o un archivo con esos mismos campos. Mantener el modo comercial `preview` hasta completar la revisión de precios real.

El árbol se trabajó sobre `main` en `4e114f2`. Los cambios quedan sin commit ni push. No se aplicaron migraciones ni se desplegó a producción.
