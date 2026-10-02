# Ficha de producto en celular — 2026-10-02

Verificación local en `http://localhost:3015/producto/anua-heartleaf-pore-control-cleansing-oil-200-ml` con navegador real.

- Antes: el botón del carrito tenía 20 px de alto por encogimiento de flexbox; favoritos quedaba en una fila separada.
- Después: carrito y favoritos comparten fila, con 48 px de alto; cantidad ocupa su propia fila en celular.
- Pantallas de 320, 390, 430 y 1280 px: sin desbordamiento horizontal de la página ni del texto del carrito. En 320 px se compactó el texto del logo para mantener los controles del encabezado accesibles.
- Cantidad: aumento a 2 y regreso a 1 comprobados.
- Favoritos: activación y desactivación comprobadas.
- Carrito: agregado de 2 unidades, subtotal correcto y apertura del panel comprobados; producto de prueba retirado después.
- Barra móvil: botón de 44 px; posición ajustada al área segura inferior junto con la navegación.
- TypeScript y build de producción: aprobados. ESLint de los componentes de producto y navegación inferior: sin errores ni advertencias.
- Evidencia: `mobile-390.jpg`.

Los cambios están en el código local. No se publicó un despliegue ni se realizó una compra.
