# Pulido visual y revisión final — 18/10/2026

Horario conservado: **domingo 18 de octubre de 2026 a las 12:00 de Argentina**. Al terminar esta revisión ya pasó la medianoche; no se desplaza el evento al lunes por la palabra «mañana». Producción sigue publicada con 81 participantes, sin ronda ni ganador durante las comprobaciones.

## Estética y funcionamiento

Se mantuvieron el logo MYA, la fotografía, la tipografía serif de campaña y la combinación crema, verde petróleo y dorado del sorteo. El panel utiliza la misma familia de colores, con tarjetas claras y controles verde petróleo. No se rediseñaron el sitio ni la arquitectura.

- Se reprodujo y corrigió el descentrado de las confirmaciones: el reset global de márgenes anulaba el centrado nativo del diálogo. Ahora tienen margen automático, contenido desplazable dentro del cuadro y títulos que ajustan sin desbordar.
- Los diálogos bloquean el desplazamiento del fondo, restaurándolo al cerrar. Escape respeta el estado de una operación en curso y el botón de cerrar se deshabilita mientras se guarda.
- La presentación ampliada conserva el foco de teclado dentro del escenario, identifica su comportamiento modal y devuelve el foco al control de apertura al salir. Se oculta el botón de ampliar cuando ya está ampliada y se restaura el desplazamiento normal al cerrar.
- El foco visible usa verde petróleo sobre superficies claras y dorado sobre el escenario oscuro. Los controles de ampliar/salir y las acciones pequeñas del panel tienen objetivos de 44 px en móvil. Los campos administrativos móviles utilizan 16 px; los nombres largos del resultado pueden ajustarse a varias líneas.
- Se preservaron las transiciones, ruleta, revelación, celebración y la variante de movimiento reducido. Se comprueba que el canvas cambia entre fotogramas durante la selección: no se acepta una imagen estática como prueba de animación.
- El verificador de producción ahora recorre la sección fotográfica antes de capturar, comprueba que su imagen cargó y vuelve instantáneamente al inicio para evitar capturas engañosas del encabezado sticky a mitad de página.

## Comprobaciones

116 tests aprobados, lint del sorteo sin errores ni advertencias, build y tipos aprobados. El ensayo completo usa PostgreSQL/PGlite y respuestas locales de Meta; no realiza selecciones oficiales ni altera producción. Conserva las pruebas de importación, designación, exclusión, confirmación, repetición, idempotencia, concurrencia, reconexión, reloj incorrecto, exportaciones PNG/video y separación entre ensayo y resultado oficial.

Se revisan público y administración a **320, 390, 768, 1280 y 1440 px**, junto con espera, cuenta regresiva, selección y resultado. Las confirmaciones además se comprueban a **320 × 600** y **844 × 390**, incluyendo centrado horizontal/vertical, límites de pantalla, scroll interior, cancelación y conservación del estado sin iniciar una ronda. La presentación se prueba con Tab, Escape, restauración de foco y movimiento reducido.

La verificación final sobre el SHA publicado comprueba `/sorteo`, `/api/sorteo`, coincidencia de horario y Event JSON-LD, bloqueo del panel/API sin sesión y ausencia del selector privado en la página pública. Incluye imágenes visibles/editoriales, cinco tamaños, presentación, teclado, errores JavaScript, desbordes y Axe con las reglas WCAG ejecutadas. No se afirma una certificación integral ni una garantía de disponibilidad futura de terceros.

No se necesitan nuevas migraciones. Participantes, reglas, selección guardada y estado oficial se conservan. El sorteo requiere inicio y confirmación desde el panel: llegar a cero en el anuncio no lo ejecuta automáticamente. Apagar este equipo no apaga Vercel ni Supabase.

## Archivos

- `src/components/giveaway/experience.module.css`: foco, controles móviles y ajuste de nombres.
- `src/components/giveaway/giveaway.module.css`: centrado y límites del diálogo; campos y controles móviles.
- `src/components/giveaway/live-show.tsx`: foco y scroll de la presentación ampliada.
- `src/components/giveaway/manager.tsx`: ciclo de vida del diálogo, Escape y cierre durante guardado.
- `scripts/verify-live-giveaway.mjs`: geometría en siete tamaños, cancelación, foco y fotogramas de animación.
- `scripts/verify-giveaway-production.mjs`: capturas completas con fotos cargadas y comprobación de presentación publicada.
- Este informe y `docs/sorteos/README.md`: evidencia y operación actualizadas.

Capturas y logs permanecen en `docs/sorteos/qa-private/`, fuera de Git: `branding-final-*`, confirmaciones por tamaño, `production-preview-390.png`, `production-preview-1440.png`, `production-presentation.png` y `production-final-verification.json`. Se comprueba Vercel READY y sus aliases antes de cerrar el trabajo y programar el apagado autorizado.
