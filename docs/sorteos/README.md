# MYA Sorteos: conexión oficial y vivo compartido

## Uso

- `/admin/sorteo`: administrador de la tienda. **Cargar últimos comentarios** obtiene los comentarios de la publicación y todas sus páginas/respuestas mediante Meta. Guarda una lista privada; no inicia el sorteo.
- La actualización combina por ID y conserva los datos anteriores. Si falla Meta o una página de resultados, no se guarda una importación parcial. Una cuenta participa una vez según las reglas de revisión.
- Las fotos y nombres visibles se obtienen gratuitamente de los metadatos públicos de cada perfil, sin cookies ni inicio de sesión. Se verifica que URL y usuario correspondan exactamente. Los resultados se reutilizan; ante errores se conservan los datos ya recuperados. En la verificación de producción Vercel no recuperó los perfiles públicos, aunque la misma lectura funcionó desde el equipo de MYA. Las 75 cuentas actuales se enriquecieron desde ese equipo, con registro en el historial; no se afirma recuperación automática garantizada de perfiles nuevos desde Vercel. El panel muestra la cobertura de fotos y nombres; un nombre vacío no se inventa. Las 75 fotos se copiaron al bucket privado `giveaway-avatars`. El admin y el ganador revelado acceden a esas copias mediante endpoints propios; no se publican URLs del bucket. La clave de cada PNG es el SHA-256 de su referencia original. Si no hay copia, se intenta descargar la imagen y almacenarla; el ganador también intenta refrescar la referencia del perfil.
- Ajustar condiciones, revisar exclusiones y guardar el anuncio. **Iniciar en vivo** requiere confirmación y bloquea la lista. No actualizar participantes durante una selección.
- `/sorteo`: acceso público por enlace, con acceso desde el navbar, fuera del sitemap y con `noindex`. No requiere cuenta para que la comunidad vea el mismo resultado. El contador y ganador se sincronizan con la base de datos.
- `/sorteo?presentacion=1`: presentación para transmitir. El ensayo del admin utiliza datos ficticios y no modifica resultados reales.

No se ofrecen scripts de consola ni cargas manuales de participantes. Se conserva el lector de datos históricos para no romper actas anteriores. La foto manual de un ganador sigue disponible como corrección de identidad, con confirmación y registro.

## Configuración privada

`INSTAGRAM_ACCESS_TOKEN` es un secreto del servidor, nunca `NEXT_PUBLIC_`. En producción se guarda como Secret solo en el proyecto Vercel de MYA. No guardar credenciales en Git, logs ni respuestas al navegador. El token de usuario se extendió mediante el intercambio oficial de Meta el 14/10/2026, con duración informada de 60 días. Meta puede revocarlo antes; el admin muestra un error legible y conserva la lista si vence.

App: MYA Sorteos (`1730894734661446`). Cuenta: `_myaimportaciones` (`17841402381081579`). Página vinculada: MYA Importaciones (`1392079903987769`). Permisos: `instagram_basic`, `instagram_manage_comments`, `pages_read_engagement`, `pages_show_list`. Solo se utilizan consultas de lectura.

Meta no proporciona la foto de todos los comentaristas. La recuperación gratuita de perfiles es una consulta a su página pública y depende de la disponibilidad de Instagram; no usa una API de pago ni evita autenticación, restricciones de acceso o bloqueos.

## Seguridad del vivo

Las tres tablas de la migración `20261014140000_live_giveaway.sql` usan RLS. Solo el backend autenticado como administrador ejecuta escrituras. La RPC comprueba revisión y bloqueo para evitar carreras. La lista permanece privada; los datos públicos no revelan ganador antes de la hora de la base. La selección usa aleatoriedad criptográfica con rechazo, acta firmada y registro de descalificaciones. Seguimiento, like e historia requieren revisión manual del ganador.

## Verificación

Prueba real de lectura: 1.161 registros, 75 cuentas, 75 fotos descargadas correctamente y 67 nombres visibles. Los datos y capturas están en `qa-private/`, fuera de Git. Meta informó 1.074 en su contador durante la consulta; ese contador no se usa para inventar ni descartar registros.

`npm test`, `npm run build`, `npm run type-check`, `npm run lint` y `npm run test:giveaway`. El E2E usa Postgres/PGlite y respuestas locales de Meta/perfiles; prueba paginación, actualización sin duplicados, fotos/nombres, ensayo privado, sincronización en dos navegadores, reloj incorrecto, recuperación al recargar y 320/390/768/1440 px. No ejecuta selecciones reales en producción.

## Presentación y fotos en el vivo

Fecha visible: domingo 18 de octubre de 2026, Día de la Madre; horario a confirmar hasta que MYA lo configure. El admin distingue cuentas participantes, comentarios repetidos y otros comentarios no válidos. Incluye búsqueda por usuario, nombre y comentario y presentación de registros adaptada a celular.

Durante la cuenta regresiva y selección, solo las identidades de la ruleta ya liberadas por la proyección pública reciben URLs de lectura de sus fotos: vencen en 10 minutos, se generan por lote y se reutilizan durante 4 minutos por instancia. No se vuelve público el bucket ni la lista privada. El ganador sigue oculto hasta la hora de la base de datos. El canvas precarga las fotos con CORS para conservarlas al exportar PNG y video. La foto del ganador reintenta su lectura ante fallos transitorios; si no está disponible, muestra las iniciales de esa misma cuenta.

Las animaciones respetan la preferencia de movimiento reducido. El ensayo permanece privado y no modifica la lista ni genera resultados reales.
