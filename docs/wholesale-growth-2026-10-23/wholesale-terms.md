# Mínimos y consultas mayoristas — 23/10/2026

El dueño confirmó dos alternativas: **$100.000 en productos o 5 unidades en total**, del mismo producto o combinando varios. Basta con cumplir una de ellas. El importe corresponde a los productos de la propuesta mayorista; la entrega se cotiza por separado.

Se publican las condiciones en portada, las seis páginas mayoristas, preguntas frecuentes, formulario, metadatos y condiciones generales. El mensaje preparado incluye el mínimo. No se activa el checkout mayorista ni se calcula un descuento a partir del precio minorista. Consultar sigue siendo posible antes de completar el surtido; el mínimo aplica a la compra, no al permiso de hacer una consulta.

## Mejora elegida con los datos disponibles

Se revisó la propiedad real de Search Console y los estados agregados de pedidos, sin extraer datos personales. Las búsquedas visibles incluyen modelos de herramientas y una consulta sobre Anua. Por eso se agrega un acceso mayorista en las fichas existentes: conserva el producto, la variante seleccionada y la cantidad consultada, y permite abrir la conversación con Máximo o Agustina. La ficha conserva sus acciones minoristas y se enlaza a las condiciones mayoristas.

El período disponible de búsquedas todavía es corto y GA4 fue conectado hoy. No se puede atribuir una venta a una búsqueda ni calcular conversión de consultas efectivas con esta muestra. No se identificaron como compradores las visitas de verificación. Las consultas de WhatsApp enviadas y las ventas cerradas por fuera del checkout requieren confirmación comercial; un clic de Analytics no demuestra ninguna de ellas.

Se amplía la segmentación del evento `contact` con las dimensiones `contact_source`, que diferencia formulario mayorista, ficha y selector general, y `category`, que identifica el rubro. Se mantiene `contact_type` para separar minorista/mayorista. Las tres definiciones se verificaron guardadas tras recargar Google Analytics. El contenido del mensaje, destino y datos de quien consulta no se envían en estos parámetros.

## Verificación local

- 216 pruebas aprobadas; tipos y build webpack aprobados; lint sin errores, 142 advertencias existentes.
- 30 vistas a 320/390/1440 px: portada, seis páginas mayoristas, condiciones y dos fichas. Mínimos visibles y sin desbordamiento horizontal.
- Consulta desde variante Verde / 256 GB con cantidad 2 correcta en ambos enlaces de asesores a los tres tamaños; consulta combinada 2 + 3 correcta. No se enviaron mensajes, pedidos ni pagos.
- Se conservan 392 direcciones del sitemap, canonical y títulos minoristas. Sin habilitar compras mayoristas, modificar precios ni inventario.

La evidencia comercial y de Google se conserva fuera del repositorio público.

## Publicación comprobada

Código `d75c32e2aebd2bb72de31fe0afec757ab98f5619`, despliegue `dpl_GEm6hmaDFVSVkGh3a6uYgNwktk68`, producción READY, Next.js, build de 38 segundos. Alias del dominio y SHA confirmados. El control HTTP conserva las 392 URL, las seis páginas mayoristas responden 200, un rubro desconocido 404 y los enlaces heredados redirigen correctamente. Se preservan títulos minoristas y el comprobante protegido.

En el dominio se comprobaron 12 vistas de mayorista, herramientas, condiciones y ficha con variantes a 320/390/1440 px, sin overflow ni errores de consola. La consulta pública conservó Verde / 256 GB, cantidad 2 y el mínimo alternativo en ambos enlaces de asesores. No se enviaron mensajes. El escaneo de errores/fatales de ejecución de 30 minutos no devolvió registros; monitoreo externo continuo no confirmado. Evidencia responsive: `ui/terms-responsive-production.json`.

## Próximas prioridades

1. Registrar, durante la atención habitual, cuáles consultas se convierten en pedidos confirmados para contrastarlas con los clics del sitio.
2. Evaluar páginas y consultas con un período completo de datos antes de invertir en anuncios o ampliar páginas por marca.
