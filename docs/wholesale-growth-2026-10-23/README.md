# Mayoristas, adquisición y medición — 23/10/2026

## Alcance

Se suma una entrada pública para comercios y revendedores, conservando la tienda minorista. Las páginas nuevas son `/mayorista`, `/mayorista/cosmetica-coreana`, `/mayorista/perfumeria`, `/mayorista/cuidado-capilar`, `/mayorista/herramientas` y `/mayorista/electronica`.

Cada rubro tiene título, descripción, canonical propio, guía de selección, enlaces al catálogo, preguntas y formulario de consulta. La página general se enlaza desde portada, cabecera y pie; todas se incluyen en el sitemap. Se conserva la redirección de los enlaces mayoristas antiguos por `category` hacia el rubro correspondiente. Un rubro inexistente responde 404.

La consulta pide productos, unidades y destino, y prepara un mensaje en el selector existente de Máximo y Agustina. La persona elige el contacto y decide enviarlo en WhatsApp. El formulario no persiste un pedido, reserva stock, promete precios ni envía mensajes automáticamente. El checkout mayorista sigue deshabilitado; las capacidades anteriores permanecen detrás de su bandera comercial. No se cambiaron precios, costos, inventario ni permisos.

La propuesta editorial responde a la intención de comerciantes: surtido por función, identidad exacta, cantidades por variante, reposición y datos necesarios para cotizar. Se siguen los criterios de [contenido útil de Google](https://developers.google.com/search/docs/fundamentals/creating-helpful-content) y [enlaces rastreables](https://developers.google.com/search/docs/crawling-indexing/links-crawlable). Publicar páginas no demuestra indexación ni garantiza posiciones.

## Medición

Se creó una cuenta y propiedad GA4 separadas para MYA, Argentina, Buenos Aires y ARS, con el flujo `https://myaimportaciones.com`. El ID público se configura en `NEXT_PUBLIC_GA4_ID` de Vercel para producción; no se guarda una credencial de acceso. Las opciones voluntarias de compartir datos y la medición mejorada están desactivadas. La dimensión de evento `contact_type` permite distinguir `retail` y `wholesale`.

El código usa los nombres y artículos del [esquema de comercio de GA4](https://developers.google.com/analytics/devguides/collection/ga4/ecommerce?client_type=gtag): `view_item`, `add_to_cart`, `view_cart`, `begin_checkout` y `purchase`. Se conserva `contact` para el clic en el contacto de WhatsApp y se incluyen tipo de consulta, origen y asesor, sin contenido del formulario ni destino del cliente. Un clic no confirma que un mensaje se envió, que MYA lo recibió ni que hubo una venta.

Los eventos iniciales aceptados pueden esperar al montaje del receptor. Se exige consentimiento explícito y se respeta su revocación. Los eventos de prueba del panel nunca se envían como compras simuladas. Las páginas de administración y baja no activan rastreadores. En GA4 se eliminan parámetros libres de la URL, se conserva solo atribución UTM acotada y se oculta el identificador de `/pedido/…`. Las preferencias del panel de marketing siguen siendo de ese navegador y ahora lo informan correctamente; la configuración global se publica desde Vercel.

No había una instalación GA4 de producción para medir el embudo completo de MYA. Search Console sí contiene datos históricos de búsqueda orgánica y se consultó en la propiedad existente del dominio; sus clics no permiten calcular por sí solos la conversión de la tienda. Los pedidos existentes tampoco permiten calcular abandono sin el denominador de visitas. El evento de compra conserva su condición de pago acreditado y requiere que el cliente abra el resultado; no se implementó un emisor servidor a servidor. No se realizaron pagos reales, pedidos de prueba ni mensajes a clientes.

## Validación antes de publicar

- 215 pruebas aprobadas; tipos aprobados; lint sin errores y 142 advertencias preexistentes.
- Build de Next.js aprobado con webpack. Sin cambios de dependencias.
- 24 visitas de portada, catálogo y las seis páginas mayoristas en 320, 390 y 1440 px sin errores de consola ni desbordamiento horizontal.
- Tres recorridos del formulario mayorista: diálogo correcto y enlaces de ambos asesores con rubro, producto, cantidad y destino. Sin abrir los enlaces externos ni enviar consultas.
- Verificación HTTP: seis rutas 200, canonical propio, datos `Service`, sin `noindex`; rubro desconocido 404 y enlace antiguo 307 correcto.
- Sitemap: 386 URL anteriores conservadas y seis añadidas, total 392. Portada, catálogo y ficha de referencia conservan títulos y canonical minoristas.
- Comprobante público protegido y redirección anónima de `/admin` al login.

La publicación de la auditoría anterior corresponde al commit `a1bbeb222ea7fb2c9c2f1d9d81b32a2fad7699e1`, despliegue `dpl_7FFs2fszMGhaKDhbfu5nn3JoJE2x`, READY y dominio público comprobado.

## Publicación y comprobación real

- Código publicado: `09bb9ff1630029fab043c5e50c733ba913156e28`, Vercel `dpl_HDncEXpJ8bxEzjaKZ4jyYrkt3RPE`, producción READY, Next.js, compilación remota 70,6 segundos. Alias verificados: `myaimportaciones.com`, `www.myaimportaciones.com` y `myaimportaciones.vercel.app`.
- Se repitieron los controles HTTP en el dominio: seis páginas 200, canonical y datos estructurados correctos, 392 URL sin quitar ninguna de las 386 previas, 404 del rubro desconocido, redirección heredada y protección del comprobante. Evidencia: `production-smoke.json`.
- Nueve visitas de mayorista, herramientas mayoristas y catálogo a 320/390/1440 px, esperando el contenido final, sin overflow ni errores de consola. Evidencia: `ui/production-responsive.json`. Las pruebas locales y del formulario están en `ui/`.
- GA4 recibió `page_view`, `first_visit`, `session_start` y `user_engagement`, mostrando el título de la página mayorista en tiempo real. La visita pertenece a la verificación de instalación; no es un comprador ni una consulta. La vista de configuración aún puede informar que no recibió datos hasta que se actualice su estado agregado.
- Search Console aceptó el reenvío de `https://myaimportaciones.com/sitemap.xml` el 23/10. Su última lectura todavía era del 22/10 con 386 páginas descubiertas. El envío no demuestra rastreo ni indexación de las seis nuevas.
- El escaneo de errores/fatales de ejecución de 30 minutos para el despliegue no devolvió registros. La consulta de drains no estuvo disponible (404); no se confirmó monitoreo externo continuo ni se crearon automatizaciones locales.

La evidencia de cuenta, capturas de Analytics/Search Console y cualquier agregado comercial se conservan fuera del repositorio público. No se publican datos de clientes.

## Próximas prioridades

1. Revisar consultas reales y páginas de entrada en Search Console, separando intención mayorista de minorista antes de ampliar contenido.
2. Comparar consultas efectivas con clics de WhatsApp y compras acreditadas; elegir mejoras con datos y sin contar clics como compradores.
3. Documentar mínimos y condiciones mayoristas por rubro una vez confirmados comercialmente y reunir reseñas de compradores reales.
