# Carrito y checkout — 05/11/2026

Correcciones:
- La actualización del carrito tiene un endpoint propio que incluye productos exclusivamente mayoristas y sus precios públicos. Favoritos conserva su filtro minorista.
- La reconciliación conserva los precios y ofertas mayoristas de referencia cuando una respuesta minorista los omite, incluida la variante exacta. El servidor sigue verificando los precios antes del cobro.
- Al agregar otra unidad a una selección existente se usa el stock actual del carrito, evitando que una ficha vieja reduzca las unidades. Los controles y la actualización comparten los límites de disponibilidad.
- El carrito permite revisar el mínimo en checkout. Una cotización vigente aprobada por el servidor habilita la confirmación aunque la estimación local sea inferior. Una cotización fallida invalida la confirmación y el formulario rechaza envíos sin cotización vigente.

Validación:
- Suite completa: 344 pruebas aprobadas; sin fallos.
- TypeScript y compilación de producción aprobados. ESLint sin errores en los archivos modificados; la revisión general previa tenía advertencias existentes.
- `node scripts/verify-cart-checkout.mjs`: navegador Chromium, 390 y 1280 px. Agregar 3, agregar desde ficha desactualizada, reducir, actualizar disponibilidad y recargar; preservación del carrito; $99.999, $100.000, $100.001; alternativa de 5 unidades; error de cotización; selección y confirmación simulada de transferencia y Mercado Pago, CVU y enlace de pago.
- La regresión de checkout se reprodujo con el componente anterior usando `CART_TEST_BASELINE=checkout node scripts/verify-cart-checkout.mjs`: bloqueaba una cotización aprobada por el servidor.

Las confirmaciones del navegador usan acciones simuladas, sin crear pedidos, reservar stock ni cobrar a clientes. La configuración pública de producción informa checkout y Mercado Pago habilitados. Los productos que requieren confirmar costos o disponibilidad mantienen ese control; alcanzar el mínimo no inventa stock ni autoriza precios pendientes. Se conservan los límites actuales de 100 unidades por línea y 50 líneas por pedido.
