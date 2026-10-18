# Revisión final del sorteo — 17 de octubre de 2026

Evento: domingo 18 de octubre, 12:00 h de Argentina (UTC−3). Página pública: https://myaimportaciones.com/sorteo. Panel: https://myaimportaciones.com/admin/sorteo.

## Correcciones

- Se reprodujo un problema entre administradores: una pestaña recibía una revisión nueva, pero conservaba campos anteriores del anuncio y lista. Ahora un formulario sin cambios se sincroniza con la versión guardada. Si existe un borrador local, se conserva y se informa del conflicto; se retiene la revisión anterior para que el servidor rechace sobrescribir los cambios ajenos. Recargar permite revisar la versión guardada antes de continuar.
- La confirmación de participante designado ahora exige revisar **todos los requisitos de la publicación original**, sin afirmar que son cuatro. No se cambiaron requisitos comerciales, participantes ni la selección guardada. El seguimiento, like e historia siguen siendo revisiones humanas; no se presentan como verificaciones automáticas de Meta.
- Se amplió el E2E con actualización desde otro administrador, conservación del borrador y rechazo de un guardado obsoleto. Se agregó un verificador reutilizable de producción que sólo permite GET/HEAD desde su navegador.

Archivos: `src/components/giveaway/manager.tsx` (sincronización y conflicto), `selection-panel.tsx` y `src/lib/giveaway/selection.ts` (confirmación de requisitos), `tests/giveaway-repeat.test.ts` y `scripts/verify-live-giveaway.mjs` (regresiones), `scripts/verify-giveaway-production.mjs` (lecturas de producción), este informe y `docs/sorteos/README.md` (operación y evidencia actualizadas).

## Estado real revisado

Campaña publicada, revisión 10, 1.703 comentarios importados y 81 participantes válidos. Hay 75 fotos y 67 nombres disponibles. Las cuentas restantes usan iniciales/usuario y continúan participando. Horario y cierre: `2026-10-18T12:00-03:00`. No hay ronda iniciada ni ganador. Modo aleatorio, exclusión de ganadores anteriores activada, sin exclusiones específicas guardadas.

Estas son lecturas de producción, no resultados del ensayo. No se importaron comentarios ni se ejecutaron, confirmaron, repitieron o reiniciaron sorteos reales durante esta revisión. No hizo falta una migración de base de datos.

## Validación

- 116 tests de aplicación y PostgreSQL aislado aprobados.
- E2E completo sobre base local y respuestas de Meta de prueba: ensayo sin mutaciones; importación paginada y deduplicada; selector privado; revisión manual; cuenta regresiva sincronizada; ganador oculto hasta la revelación; dos dispositivos y reloj local incorrecto; repetición, confirmación, exclusiones, bloqueo e idempotencia; reinicio; imagen y video; compartir, calendario y recuperación de conexión. Incluye las dos regresiones entre administradores.
- ESLint del código del sorteo sin errores ni advertencias; build y typecheck aprobados antes de publicar.
- Producción: `/sorteo` y `/api/sorteo` operativos, horario y Event JSON-LD coincidentes, título sin duplicación de marca, datos administrativos ausentes del payload público. API privada 401 y panel sin sesión redirigido al login.
- Público a 320, 390, 768, 1280 y 1440 px, sin desborde horizontal, errores JavaScript ni imágenes visibles rotas. Presentación/Escape y movimiento reducido comprobados. Sin infracciones Axe en las reglas WCAG ejecutadas; no se afirma una certificación integral de accesibilidad.
- `node scripts/check-public-evidence.mjs` y `git diff --check` aprobados. Fotos, actas de prueba, URLs firmadas y capturas privadas permanecen fuera de Git.

El escenario y resultado administrativos se prueban con autenticación y PostgreSQL aislados; las comprobaciones de producción son de lectura. La disponibilidad actual no garantiza que Instagram mantenga su API disponible durante todo el evento. Si la actualización de comentarios falla, se conserva la lista previamente guardada y se muestra el error; no se debe interpretar un fallo como una importación completa.

## Operación del vivo

Antes del inicio, actualizar comentarios desde el panel si se desea incluir los nuevos, revisar lista y condiciones, y guardar los cambios. El ensayo privado usa cuentas de ejemplo y no publica resultados. Volver a Vista real para iniciar el vivo mediante su confirmación. Llegar a cero en el contador **no inicia automáticamente** el sorteo.

La selección designada es opcional y requiere guardar su revisión manual antes de iniciar. Sin designación, el servidor utiliza la selección aleatoria. La confirmación final del premio registra las comprobaciones manuales. Para repetir se requiere motivo y confirmación, y cada ejecución conserva su acta. Las cuentas descalificadas no vuelven a participar.

Vercel y Supabase alojan la página, datos y ejecución. Apagar la PC no apaga la página ni programa un sorteo automático. Para operar o grabar el escenario mañana, volver a abrir el panel en el equipo correspondiente.

La evidencia queda en `docs/sorteos/qa-private/`: `verification.json` para el E2E, `production-final-verification.json` para el smoke de producción, logs de tests/build/tipos y capturas de los cinco anchos. La publicación se verifica por SHA y aliases de Vercel antes de dar la revisión por cerrada.
