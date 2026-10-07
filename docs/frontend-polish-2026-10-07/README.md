# Front-end y UX — 7 de octubre de 2026

Pasada sobre la tienda existente, preservando catálogo, precios y comportamiento comercial.

## Correcciones

- Encabezado: controles de 44 px, búsqueda con estado de carga, etiquetas accesibles, imágenes optimizadas y cierre del menú con Escape o clic fuera. El menú móvil se despliega sin desplazar la página y respeta la navegación inferior.
- Navegación móvil: estado activo de Catálogo y fichas, seguimiento y contadores legibles.
- Catálogo: foco visible, filtros con nombres accesibles, indicador de actualización, etiquetas largas sin desbordes y panel móvil con foco contenido, scroll independiente y devolución del foco.
- Productos: contraste de botones, marcas sin superposición con favoritos, estado del corazón, especificaciones ordenadas, productos relacionados en dos columnas móviles, galería y vista rápida con cierre y scroll correctos. La consulta de disponibilidad en la barra móvil abre WhatsApp cuando el producto no es comprable.
- Compartir: acciones táctiles y error útil cuando el navegador rechaza copiar el enlace.
- Checkout: bordes consistentes, resumen que mantiene los importes alineados y selector de pago identificado.
- Formularios, privacidad, condiciones y arrepentimiento: legibilidad, etiquetas persistentes, foco visible, textos largos y tipografía móvil de 16 px para evitar zoom al escribir.
- Pie y avisos: enlaces táctiles, espacio para barras y áreas seguras del móvil, privacidad por debajo de ventanas modales y sin tapar las acciones del producto.
- Administración: navegación móvil con sección actual y cierre con Escape; controles de tablas con áreas táctiles más grandes. Revisión de código, sin sesión administrativa autenticada.
- Animaciones respetan la preferencia de movimiento reducido.

## Validación local

- `npm test`: 47/47 aprobados.
- `npm run build` y TypeScript: aprobados.
- ESLint de archivos modificados: sin errores; queda una advertencia previa del efecto de cotización del checkout.
- Lint completo: 25 errores previos en scripts y documentos locales de las cargas de catálogo del 6 de octubre. Esos archivos ajenos a esta pasada se preservan.
- Navegador Edge: 84 verificaciones de rutas a 320, 390, 430, 768, 1280 y 1440 px, sin desbordes horizontales ni errores JavaScript.
- Diez grupos de interacciones: carrito vacío/lleno/cantidades/eliminación, checkout con ambos medios, favoritos, galería, foco de modales, filtros, menú, vista rápida, búsqueda sin resultados, contraseñas diferentes y rechazo del consentimiento.
- Comprobación final del build de producción servido en localhost: 12 vistas a 320, 390 y 1440 px, más error de portapapeles, fotos cargadas, devolución del foco y transición de menú a carrito. Sin errores de navegador.
- Sin crear cuentas, confirmar pedidos, ejecutar pagos ni escribir en la base de datos. Las rutas de cuenta y administración validan su redirección de invitado; sus contenidos autenticados no se probaron.

Evidencia: `verification.json` y capturas en esta carpeta. Los resultados describen localhost; no equivalen a validación en producción.

Reproducción:

```powershell
node scripts/verify-frontend-polish.mjs http://localhost:3107 <directorio-node_modules-con-playwright>
```
