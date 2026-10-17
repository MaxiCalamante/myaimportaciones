# Experiencia premium del sorteo MYA

Rediseño de `/sorteo`, sobre las rutas y el sistema administrativo existentes. Las dos referencias del usuario guiaron la composición: hero editorial con fotografía, escenario verde petróleo, tarjeta del premio, cuatro pasos y campaña de cuidado facial.

## Componentes y comportamiento

| Archivo | Responsabilidad |
| --- | --- |
| `src/components/giveaway/live-show.tsx` | Composición pública, escenario, contador, línea de progreso y resultado según el estado real. |
| `src/components/giveaway/experience.module.css` | Diseño responsive exclusivo de la experiencia pública; preserva los estilos del administrador. |
| `src/components/giveaway/experience-sections.tsx` | Hero, premio, condiciones, campaña de catálogo y franja de servicios. |
| `src/components/giveaway/use-live-giveaway.ts` | Reloj sincronizado con servidor, polling adaptativo, reconexión y rechazo de revisiones antiguas. |
| `src/components/giveaway/participant-reel.tsx` | Canvas de participantes reales con fotos o iniciales, imágenes cargadas en paralelo y movimiento fuera del render de React. |
| `src/components/giveaway/share-button.tsx` | Web Share API, copia al portapapeles y enlace seleccionable como alternativa. |
| `src/components/giveaway/instagram-icon.tsx` | Icono SVG del canal oficial usando el lenguaje visual existente. |
| `src/components/giveaway/giveaway-store-bridge.tsx` | Integración de la campaña final con las rutas reales del catálogo. |
| `src/lib/giveaway/experience.ts` | Estados conceptuales y trayectoria determinista, sin elegir ganadoras. |
| `src/lib/giveaway/reel.ts` | Dibujo compartido del carrusel horizontal. |
| `src/lib/giveaway/visual.ts` | Reutiliza el carrusel en el escenario administrativo y las grabaciones. |
| `src/components/giveaway/selection-panel.tsx`, `src/components/giveaway/manager.tsx`, `src/lib/giveaway/selection.ts` | Alineación del texto de revisión manual con las cuatro condiciones indicadas en el nuevo pedido. |
| `tests/giveaway-experience.test.ts` | Pruebas de límites del contador, estados guardados y desaceleración. |
| `tests/giveaway-repeat.test.ts` | Mantiene la comprobación de la declaración humana de las condiciones. |
| `scripts/verify-live-giveaway.mjs` | Verificación con base local, navegador real, simulaciones, selección oficial, repetición, responsive y accesibilidad. |

Las fases son PREVIEW, READY, preparación autorizada, cuenta regresiva de inicio, DRAWING, sincronización del resultado, VERIFYING, COMPLETED y descalificación. Una interrupción de conexión conserva el último estado conocido y ofrece recuperación.

Al llegar a cero sin ronda autorizada, se muestra **Estamos por comenzar**. No se escribe en la base ni se inicia un sorteo. La indicación de selección en vivo requiere una ronda creada por el administrador. No se afirma que Instagram tenga una transmisión activa.

La cuenta seleccionada pendiente muestra la revisión manual. **¡Tenemos ganadora!** y **Ganaste** aparecen con el premio confirmado en el backend. La página recupera la misma cuenta al recargar. Una nueva ronda autorizada reemplaza el estado vigente, conservando el historial del sistema existente.

## Animación y accesibilidad

- Contador de cuatro bloques con transiciones cortas al cambiar cada valor.
- Transiciones de hero y de preparación basadas en fases reales.
- Carrusel horizontal de cuentas, foco central, halo dorado y desaceleración cúbica basada en el tiempo absoluto de la ronda.
- El resultado final procede del servidor; la animación no genera entropía ni elige participantes. Si el backend todavía no lo entregó, muestra sincronización en lugar de inventar una cuenta.
- Revelación breve alineada con el instante de publicación; al entrar después del resultado, no obliga a repetir la selección.
- Celebración limitada a la entrada de una ronda nueva; no se reinicia en cada polling. Movimiento reducido, limpieza de RAF/ResizeObserver y pausa de pintura en pestaña oculta.
- Anuncio accesible del resultado, sin narrar cada avatar o número del carrusel. Controles con focus y alternativas de imagen mediante iniciales.

No se cambiaron los contratos públicos ni las tablas para el rediseño. Se reutilizan autenticación, selección, confirmación, exclusiones, auditoría y repetición. La migración de repetición fue aplicada en producción y quedó registrada como `20261017215718_giveaway_repeat_selection`.

## Premio y contenido

Se conservaron las cuatro condiciones: like, seguir la cuenta, compartir en historias y comentar etiquetando a otra persona. La participación sucede exclusivamente en Instagram.

La foto original muestra una espuma de 20 ml junto con productos de 30 ml. Se usa **cinco productos en formato viaje** para evitar publicar **5 × 30 ml**. Referencia del producto: [SKIN1004 Madagascar Centella Travel Kit](https://www.skin1004.com/collections/special-care/products/skin1004-madagascar-centella-travel-kit).

Se mantienen la fecha del 18 de octubre de 2026, las 12:00 de Argentina y el logo original. El horario visible se toma de la configuración real de la campaña y del reloj sincronizado. Se conserva la imagen social original del sorteo y sus metadatos.

## Recursos gráficos

Los dos recursos se generaron con la herramienta integrada de imágenes y se guardaron como WebP en el proyecto. La foto original del premio continúa visible en la tarjeta lateral. La escena de bienestar es un recurso editorial y no representa a una participante.

- `public/sorteo/campana-mama.webp`: composición de campaña basada en la fotografía original del kit; 252 KB aproximadamente.
- `public/sorteo/cuidado-editorial.webp`: escena editorial de cuidado facial; 125 KB aproximadamente.
- `public/sorteo/dia-de-la-madre-instagram.jpg`: fotografía original conservada sin sobrescribir.

### Prompt final del hero

Edit target: supplied real SKIN1004 Madagascar Centella Travel Kit promotional product photograph. Create a premium photorealistic wide 3:2 skincare campaign asset for Mother's Day in warm ivory, soft daylight, stone, linen and tiny white flowers and green foliage. Product identity invariant: preserve exactly the same five individual travel-size items, brown-capped foam tube, white cream tube, amber small cleansing oil bottle, toner bottle and dropper ampoule, and original rectangular rocky landscape printed box with its real SKIN1004 labels. No different product line, extra bottles, pumps or full-size bottles. Carefully retain the original product geometry and label appearance; only replace surroundings. Remove all existing giveaway text, handwritten text, stickers, hearts and logo from the original photograph. Arrange the exact products prominently on cream limestone plinths with linen drapery, soft white flowers and subtle leaves on the right side behind products, warm window light. Image left quarter fades into very light warm cream with a little negative space, right side hero products fill frame. Premium international beauty editorial campaign photography. No text overlays, no UI, no logos invented, no people. Save the output image for integration into the website.

### Prompt final de la campaña secundaria

Create a premium international skincare editorial photograph for a warm Mother's Day beauty ecommerce campaign. Wide horizontal 2:1 composition. On right third a relaxed adult woman around forty years old, natural medium-brown hair loosely tied back, cream knitted top, eyes gently closed with a soft serene smile, hands resting gently on her cheeks as part of her skincare routine. Realistic skin texture, refined natural beauty, no airbrushing, not a celebrity or identifiable person. Left half is intentionally empty ivory and warm cream wall with sheer linen curtain and subtle soft window light, intended for a headline implemented separately in HTML. Background right soft bokeh green foliage and white flowers, understated beige and sage palette, natural daylight. No cosmetics bottles or product packaging, no text, no logos, no UI, no writing. Quiet, sophisticated, photorealistic beauty advertising photograph. This is a secondary editorial wellbeing campaign asset, not a participant photo.

## Alcance de la entrega

Validación local:

- 108 tests de aplicación y base de datos aprobados.
- Build de producción y comprobación de tipos aprobados.
- Prueba completa `npm run test:giveaway` aprobada: importación aislada, ensayo privado, cero del contador sin iniciar, compartir nativo y por copia, reconexión, designación persistida, selección, revisión, exportación, repetición e idempotencia.
- Páginas pública y administrativa a 320, 390, 768, 1280 y 1440 px; resultado confirmado comprobado en los cinco tamaños. Sin desborde horizontal ni errores de JavaScript.
- Axe sin infracciones en las reglas WCAG A/AA ejecutadas sobre la previa y el resultado confirmado.
- Lint de los componentes y la lógica del sorteo aprobado. Control de evidencia pública y revisión de whitespace aprobados.

El usuario autorizó aplicar la migración y publicar estos cambios mediante commit y push a `main`. La migración ya está aplicada y verificada: conserva los 1.161 comentarios y 75 participantes, sin iniciar ninguna ronda. La publicación se comprueba contra el commit desplegado y las rutas reales de Vercel. Las pruebas de navegador de selecciones y repeticiones usan PostgreSQL y servicios de Instagram aislados; su evidencia está excluida de Git en `docs/sorteos/qa-private/`.

El lint general del repositorio detecta un error previo `react-hooks/purity` por `Date.now()` en `src/app/producto/[slug]/page.tsx:115`, además de advertencias preexistentes. Ese archivo no forma parte del rediseño.
