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

No había medición histórica verificable de visitas en MYA. Los pedidos existentes por sí solos no permiten calcular conversión ni abandono. El evento de compra conserva su condición de pago acreditado y requiere que el cliente abra el resultado; no se implementó un emisor servidor a servidor. No se realizaron pagos reales, pedidos de prueba ni mensajes a clientes.

## Validación antes de publicar

- 215 pruebas aprobadas; tipos aprobados; lint sin errores y 142 advertencias preexistentes.
- Build de Next.js aprobado con webpack. Sin cambios de dependencias.
- 24 visitas de portada, catálogo y las seis páginas mayoristas en 320, 390 y 1440 px sin errores de consola ni desbordamiento horizontal.
- Tres recorridos del formulario mayorista: diálogo correcto y enlaces de ambos asesores con rubro, producto, cantidad y destino. Sin abrir los enlaces externos ni enviar consultas.
- Verificación HTTP: seis rutas 200, canonical propio, datos `Service`, sin `noindex`; rubro desconocido 404 y enlace antiguo 307 correcto.
- Sitemap: 386 URL anteriores conservadas y seis añadidas, total 392. Portada, catálogo y ficha de referencia conservan títulos y canonical minoristas.
- Comprobante público protegido y redirección anónima de `/admin` al login.

La publicación de la auditoría anterior corresponde al commit `a1bbeb222ea7fb2c9c2f1d9d81b32a2fad7699e1`, despliegue `dpl_7FFs2fszMGhaKDhbfu5nn3JoJE2x`, READY y dominio público comprobado. Esta entrega requiere confirmar después del push el SHA publicado, alias, controles públicos y recepción en GA4. La evidencia de cuenta y cualquier agregado comercial se conserva fuera del repositorio público.

## Próximas prioridades

1. Revisar consultas reales y páginas de entrada en Search Console, separando intención mayorista de minorista antes de ampliar contenido.
2. Comparar consultas efectivas con clics de WhatsApp y compras acreditadas; elegir mejoras con datos y sin contar clics como compradores.
3. Documentar mínimos y condiciones mayoristas por rubro una vez confirmados comercialmente y reunir reseñas de compradores reales.
