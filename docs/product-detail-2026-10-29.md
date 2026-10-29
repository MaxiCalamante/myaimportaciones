# Ficha de producto — 29/10/2026

La ficha acumulaba tarjetas promocionales y acciones secundarias debajo de la compra. Ahora agrupa precio, disponibilidad, cantidad, variantes y acciones en un bloque; muestra un resumen corto y hasta tres especificaciones reales junto al título. La descripción completa, incluidas instrucciones de uso y seguridad, y la ficha técnica ocupan una sección inferior de dos columnas en escritorio y una en móvil.

Mayorista, pagos/comprobante y garantía quedan en desplegables accesibles. Se conservan mínimos mayoristas, consultas, favoritos, compartir, galería, variantes, carrito y barra móvil. Se retiraron textos genéricos sobre baterías, certificaciones y garantías que no acreditaban condiciones específicas del producto. No se cambiaron precios ni inventario.

## Envío

La revisión del código mostró que el antiguo componente calculaba tarifas estáticas por zona, sin llamar a un servicio de tarifas de Correo Argentino. El cliente de Correo tiene operaciones de agencias, pedidos, etiquetas y seguimiento, pero no un método de cotización. La configuración de producción revisada tampoco acreditó las credenciales requeridas para una cotización en vivo. Por lo tanto, no se presenta como una conexión operativa de tarifas.

La ficha permite ingresar un código postal válido y abrir el selector de contacto con producto, variante, cantidad y destino. El costo y plazo se confirman antes del pago. No se envía ningún mensaje automáticamente. Se retiraron fechas calculadas interpretando horas como días. El origen de despacho no se expone ni se infiere del domicilio comercial.

Esta entrega no conecta una API de tarifas ni cambia la política global del checkout, que debe revisarse al incorporar cotizaciones reales. Esa integración requiere credenciales, configuración privada del despacho y datos de peso/dimensiones del paquete.

## Verificación

- 266 pruebas unitarias aprobadas; TypeScript, lint de archivos modificados y compilación de producción aprobados.
- Sin desborde horizontal en 320, 390, 768 y 1200 px.
- Consulta de envío: código inválido muestra error; código válido abre consulta contextual sin enviar mensajes.
- Mayorista: conserva el mínimo de $100.000 o cinco unidades combinables y el contexto del producto.
- Variante Plata / 512 GB de iPhone: precio, consulta y carrito conservan la selección; el artículo de prueba se retiró del carrito local.
- Sin errores de consola en la revisión del navegador local. No se crearon pedidos ni pagos.
