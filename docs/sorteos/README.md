# Sorteo de MYA integrado en la tienda

## Recorrido

- **`/sorteo`**: página pública dentro de MYA Importaciones, con la navegación de la tienda, contador, ruleta, ganador y enlaces al catálogo. No tiene controles para importar o sortear.
- **`/admin/sorteo`**: acceso con el administrador existente. Preparación de comentarios, revisión de reglas/exclusiones, publicación del anuncio e inicio del vivo.
- **`/sorteo?presentacion=1`**: escenario sin controles para grabar la pantalla. Escape permite salir.

Pegá una lista `@usuario | comentario` o importá CSV. La herramienta permite **descargar el CSV preparado**, pero la lista completa se persiste en tablas privadas de Supabase. No se pone un archivo con participantes en `public/`, Git ni un endpoint descargable para visitantes.

El generador procesa datos aportados por el organizador y comentarios renderizados en su navegador. **No hay extracción de contraseñas, cookies, tokens ni datos privados. No se necesita la API de Meta.** Los CSV con columnas de credenciales se rechazan. Nombre visible, usuario, comentario, fecha e ID se aceptan cuando fueron aportados; no se inventan perfiles ni fotos.

## Exportar desde Instagram

1. En `/admin/sorteo`, elegir **Importar de Instagram** y **Copiar script para Chrome**. También se puede descargar `docs/sorteos/exportar-instagram.js`.
2. Abrir la publicación en su propia pestaña de Chrome. Abrir la consola con `F12` → **Console**, pegar el script y ejecutarlo.
3. El panel de MYA reúne comentarios ya cargados. **Cargar comentarios** activa hasta 120 clics espaciados en el botón nativo de carga. También se puede desplazar el post y abrir manualmente las respuestas necesarias. **Detener carga** y **Cerrar** permiten parar.
4. Si Instagram pide iniciar sesión o deja de cargar, resolverlo en Instagram. El script no evita sus controles ni usa endpoints internos. No recargar la pestaña: la recolección vive en esa página.
5. Registrar opcionalmente la cantidad que indica Instagram, pulsar **Copiar JSON**, volver al admin y pegarlo. **Revisar comentarios de Instagram** prepara la tabla con cuentas, nombres disponibles, fotos, fechas y exclusiones.
6. Comparar cantidades y revisar cobertura. Confirmar la revisión, configurar el cierre y guardar la lista privada. El servidor rechaza exportaciones de otro post y cargas sin esta revisión.

La exportación declara siempre `loaded-comments-only`: no certifica todos los comentarios. Contadores abreviados, filtros, comentarios ocultos y respuestas pueden impedir comparar cantidades exactas. Un contador estable no demuestra completitud. El nombre completo solo se conserva si aparece como nombre visible en el comentario; habitualmente Instagram muestra únicamente el usuario. La ausencia de nombre se informa por separado.

El script es propio y no carga código externo. Un [ejemplo histórico de consola](https://gist.github.com/dvingerh/8eb091483e65717031cef0d02414f587) usa cookies e identificadores de consultas internas de 2017; no se incorporó a MYA. Se inspeccionó el DOM real del post el 14/10/2026 para usar el enlace de comentario, su fecha, el autor y la foto renderizada. Cambios futuros del DOM pueden requerir ajustar el extractor.

Las URLs de foto se guardan en la lista privada, dentro de su hash. El admin muestra una vista previa. La página pública solicita solo la foto del ganador después de la revelación, mediante `/api/sorteo/foto?round=...`; el servidor valida el CDN, omite credenciales, rechaza redirecciones y convierte a PNG con límites de bytes y píxeles. Las fotos pueden vencer: el escenario usa iniciales si una no carga, y permite continuar la exportación PNG. Sigue disponible la asociación manual de foto.

CSV externo: `username,text,timestamp,id,name,avatar_url` (también `usuario,comentario,fecha,nombre,foto`). Máximo 3 MB en el selector/JSON de Instagram, 4 MB en el endpoint, 50.000 comentarios. El CSV generado usa columnas JSON para conservar exactamente comentarios, nombres e IDs sin celdas de fórmula. Se puede reimportar directamente en esta herramienta.

Una cuenta participa una vez; la cuenta organizadora se excluye. Las menciones, cierre y registros sin fecha son configurables. Seguir a MYA, el like y la historia se revisan manualmente para el ganador.

## Vivo compartido

El administrador presiona **Iniciar en vivo**, después de guardar la lista y confirmar las reglas. El servidor usa `crypto.randomBytes` con rechazo para evitar sesgo de módulo, firma el acta y persiste una única selección. Supabase fija la línea de tiempo: cuatro segundos de preparación, cinco segundos de cuenta regresiva y 10,5 segundos de ruleta.

Los visitantes consultan el mismo estado cada segundo. El reloj se calibra con la hora del servidor y `performance.now()`, evitando que una fecha incorrecta del dispositivo cambie la animación. La selección no sucede en cada celular. Recargar muestra el resultado existente; llegar tarde se incorpora al momento actual.

El endpoint/RPC público omite ganador, comentario ganador y foto hasta que el reloj de la base alcanza `reveal_at`. Solo aparecen hasta 72 nombres válidos durante la animación; no se exponen la lista completa de comentarios, IDs originales, exclusiones ni entropía. Ante un error de sincronización, se conserva el estado y se espera el resultado del servidor.

El horario previsto es opcional y sirve para el contador del anuncio. **No inicia automáticamente una selección**: al llegar ese horario se espera que MYA inicie el vivo. No se inventó un horario para el 18/10/2026.

## Seguridad y actas

Migración: `supabase/migrations/20261014140000_live_giveaway.sql`. Crea tres tablas nuevas, RLS, lectura administrativa y funciones con permisos explícitos. Los clientes anónimos y clientes de la tienda no leen los datos privados. Incluso un JWT admin no ejecuta las funciones de selección/escritura: solo el backend, después de verificar el rol, usa la clave de servicio.

Las listas se bloquean mientras existe una cuenta regresiva/ruleta activa. Los inicios repetidos son idempotentes. Una descalificación requiere motivo antes de un reemplazo; el acta conserva todas las selecciones y excluye a las cuentas ya ganadoras. Preparar otra lista después de sortear registra un motivo y conserva las actas anteriores.

La firma HMAC usa `GIVEAWAY_AUDIT_SECRET` si está configurada o deriva una clave con contexto desde `SUPABASE_SERVICE_ROLE_KEY`. Ambas quedan en el servidor. Si se rota esa clave, las actas anteriores conservan sus hashes/procedimiento pero requieren la clave histórica para comprobar la firma. El acta verifica el procedimiento registrado; no prueba entropía ante un tercero independiente ni impide que el propietario borre su propia base.

El admin puede descargar PNG 1080×1920, video compatible con el navegador y actas JSON/CSV. El video no incluye audio y debe descargarse antes de cerrar o recargar. Las fotos manuales se asocian únicamente a la cuenta ganadora, con confirmación y hash registrados.

## Activación y evidencia

1. Revisar y aplicar la nueva migración en el Supabase de la tienda, con autorización del propietario.
2. Publicar el código de la tienda en Vercel, con autorización del propietario.
3. Entrar con el admin existente a `/admin/sorteo`, cargar los comentarios reales, revisar la hora de cierre y activar el anuncio.
4. Compartir la URL de la tienda terminada en `/sorteo`. El día del vivo, confirmar **Iniciar en vivo**.

El propietario autorizó la activación y publicación el 14/10/2026. La migración se aplicó en el proyecto Supabase de la tienda (`gqcdurxndbeeugjfworx`): RLS activo, funciones de escritura solo para el backend, campaña inicial sin publicar, cero rondas y cero eventos. Los conteos de productos, pedidos y perfiles se conservaron. El código se publica mediante el despliegue de `main` en Vercel; la disponibilidad real se comprueba después de que finalice.

No se importaron participantes reales ni se inició un sorteo real durante el desarrollo. Los tests usan Postgres/PGlite y un servidor Supabase de prueba en localhost, sin participantes ni selecciones de prueba en producción.

Validación: `npm test`, `npm run type-check`, `npm run build`, `npm run lint` y `npm run test:giveaway`. La excepción existente de `no-explicit-any` para verificadores históricos se extendió a cinco scripts antiguos que leen snapshots dinámicos. Las reglas estrictas se mantienen en la aplicación y en todo el código del sorteo.

La revisión de publicación detectó avisos de seguridad en Next.js 16.3.6. Se actualizó Next y su configuración ESLint al parche 16.3.8, y `npm audit --omit=dev` pasó sin vulnerabilidades. Referencia del mantenedor: [aviso de seguridad y versión corregida](https://github.com/vercel/next.js/security/advisories/GHSA-3w37-wq28-93x7).

La prueba del vivo usa dos navegadores, un reloj de celular adelantado siete minutos, importación real en el admin de prueba, la API real de Next y funciones reales de Postgres. Verifica privacidad, sincronización, recuperación al recargar, revisión compartida, 320/390/768/1440 px, ausencia de errores JS y axe WCAG A/AA. Las capturas privadas de QA contienen exclusivamente participantes sintéticos `fixture.*`.

La extensión de Instagram pasó 95 tests y la prueba completa de recolector sintético → JSON → admin → vivo compartido. La pantalla de importación también se comprobó a 320/390 px. La inspección del post real obtuvo 15 comentarios actualmente cargados, de 2 cuentas, con 15 fotos y 15 fechas; ninguno mostraba nombre completo. Esa muestra se mantuvo local y fuera de Git, sin guardar participantes ni ejecutar una selección en producción. Es evidencia de lectura parcial del DOM, no de todos los comentarios del post.

El control de evidencia pública detectó cinco snapshots financieros/de proveedores ya versionados en `docs/mango-fuerza-2026-10-08`. Se conservaron localmente y se retiraron del índice para la próxima publicación. Esto protege el árbol actual; no reescribe ni elimina contenido de commits históricos.
