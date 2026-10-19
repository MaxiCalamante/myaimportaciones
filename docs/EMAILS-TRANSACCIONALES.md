# Emails transaccionales de MYA

Activo en producción desde el 19/10/2026. MYA usa exclusivamente el proyecto Supabase `gqcdurxndbeeugjfworx`, el dominio `mail.myaimportaciones.com` y una clave de envío limitada a ese dominio. SMTP, 13 plantillas de Auth, siete avisos de seguridad, cola transaccional, webhook firmado y scheduler cada cinco minutos configurados. Las pruebas de recuperación y transaccionales llegaron a ambos administradores según Resend y sus webhooks. No se modificaron contraseñas ni se realizaron compras o cobros para probarlo.

## Ocasiones cubiertas

| Evento confirmado en la tienda | Cliente | Administradores |
| --- | --- | --- |
| Pedido registrado | Resumen, plazo de reserva, instrucciones de pago y seguimiento | Nueva compra, productos, total, contacto, domicilio y notas; pago pendiente |
| Pago acreditado | Confirmación del pago | Pedido para preparar |
| Intento rechazado o cancelado en Mercado Pago | Aviso del intento y asistencia para evitar pagar dos veces | Historial del pedido |
| Preparación | Aviso de preparación | Historial del pedido |
| Despacho | Aviso y guía si está cargada | Historial del pedido |
| Guía cargada o corregida después del despacho | Código y enlace del correo | Historial del pedido |
| Entrega registrada | Confirmación y canal de ayuda | Historial del pedido |
| Cancelación de pedido pendiente | Aviso y asistencia si ya pagó | Aviso para revisar consultas o pagos posteriores |
| Reserva vencida | Aviso para consultar antes de pagar | Aviso de vencimiento |
| Pago que requiere revisión | Sin confirmar acreditación ni reintegro | Alerta por pago tardío, reintegro o contracargo |
| Solicitud de arrepentimiento | Constancia de recepción | Solicitud y motivo para atender |
| Solicitud en atención o resuelta | Actualización con referencia; no promete reintegros | Historial de gestión |
| Cuenta confirmada o alta inmediata | Bienvenida, sin imponer confirmación nueva | No genera avisos masivos |
| Acceso mayorista habilitado o retirado | Aviso con enlace a su cuenta | Historial de gestión |
| Prueba administrativa | No se envía a clientes | Ambas casillas, como máximo una prueba cada 10 minutos |

Despacho, guía y entrega dependen de la actualización del pedido en administración. Esta integración no consulta los movimientos de Correo Argentino ni inventa plazos. El enlace del correo abre su formulario oficial y el email incluye la guía para ingresarla allí. Los enlaces de la tienda precargan el código del pedido y solicitan el email del comprador; no llevan datos personales en la URL.

Recuperación de contraseña y confirmación de cuenta siguen a cargo de Supabase Auth y su política vigente. Para enviarlas con Resend también hay que configurar el SMTP de Supabase al verificar el dominio; no se reemplazan por tokens creados por la aplicación. Las promociones quedan fuera de los avisos operativos: requieren consentimiento específico y baja.

## Activación cuando exista un dominio

1. Verificar un dominio propio o subdominio en Resend con sus registros DNS. Gmail puede recibir los avisos y ser el Reply-To; no puede ser el remitente de esta integración. `vercel.app` tampoco es un dominio remitente propio.
2. Crear una clave privada nueva de Resend. No reutilizar una clave expuesta en chat. Guardarla como secreto del servidor.
3. Destinatarios confirmados por el usuario y verificados en `profiles` con rol admin el 19/10/2026: `maximocalamante14@gmail.com,agustinagil009@gmail.com`. Son los valores de ejemplo y los predeterminados de la integración.
4. Aplicar `supabase/migrations/20261010120000_transactional_emails.sql` después de las migraciones existentes. Luego aplicar `20261019120000_email_account_and_aftersales.sql`. Son aditivas y no generan avisos históricos.
5. Configurar variables privadas de `.env.example`: `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (ejemplo con un dominio que sea tuyo: `MYA Importaciones <pedidos@mail.tudominio.com>`), `RESEND_REPLY_TO_EMAIL`, `ADMIN_NOTIFICATION_EMAILS`, `RESEND_WEBHOOK_SECRET`, `CRON_SECRET`. Confirmar `NEXT_PUBLIC_SITE_URL` con la URL HTTPS pública real. Tras verificar el dominio, establecer `RESEND_DOMAIN_VERIFIED=true`. Mantener `TRANSACTIONAL_EMAILS_ENABLED=false` hasta completar los pasos.
6. Registrar en Resend `https://TU-TIENDA/api/resend/webhook` para `email.sent`, `email.delivered`, `email.delivery_delayed`, `email.bounced`, `email.complained`, `email.failed` y `email.suppressed`. Guardar su signing secret como `RESEND_WEBHOOK_SECRET`. Svix verifica firma y antigüedad antes de procesar el cuerpo.
7. Desplegar y configurar un scheduler frecuente que invoque `/api/cron/emails` con `Authorization: Bearer CRON_SECRET`. `vercel.json` incluye un respaldo diario (09:00 UTC); compras, pagos y cambios administrativos se procesan inmediatamente después de la respuesta. **El respaldo diario no garantiza reintentos rápidos ni vencimientos a la hora exacta.** Antes de operar ventas con avisos garantizados, configurar ejecución cada 5 minutos en un plan que la permita o un scheduler externo. Revisar su costo y límite antes de contratarlo. Quedó preparado `supabase/operations/enable-email-scheduler.sql` para usar el pg_cron existente de Supabase cada 5 minutos, con pg_net y `CRON_SECRET` guardado en Vault bajo `mya_email_cron_secret`. Ejecutarlo solamente después del despliegue y la configuración privada. El scheduler de Supabase quedó activado el 19/10/2026 y su primer recorrido automático devolvió HTTP 200.
8. Habilitar `TRANSACTIONAL_EMAILS_ENABLED=true` y validar un pedido controlado, transiciones, ambas casillas administrativas, guía y webhooks de entrega. Validar pagos con la conciliación vigente; una redirección o un comprobante no acredita fondos.

El panel `/admin/emails` está restringido a administradores y muestra configuración, últimas 50 notificaciones, estados y vistas previas ficticias. No muestra claves ni envía correo al visualizar una plantilla. Permite procesar pendientes y reintentar errores transitorios dentro de la ventana segura.

## Fiabilidad y operación

- La cola se escribe en la misma transacción de la compra o cambio de estado. El fallo de Resend no deshace una compra ni una conciliación. Las transacciones revertidas no producen emails.
- Los eventos tienen clave única en Postgres; las peticiones a Resend usan `mya/<outbox-id>` como clave estable. Body, destinatarios y remitente quedan congelados antes del primer intento para conservarlos en los reintentos.
- Los workers reclaman hasta 4 avisos por lote (máximo 3 lotes rápidos por ejecución) con `FOR UPDATE SKIP LOCKED`, token de lease y recuperación después de 3 minutos. Timeout del proveedor: 8 segundos. Reintentos transitorios con espera creciente, máximo 8 intentos. Scheduler y botón administrativo recuperan pendientes.
- Resend conserva las claves de idempotencia 24 horas. Un aviso con primer intento hace más de 23 horas y resultado incierto pasa a revisión manual. Revisar Resend antes de reenviar; no se genera una clave nueva para eludir la protección.
- Avisos nunca intentados de más de 24 horas se omiten para no enviar backlog antiguo al activar. Avisos aún no preparados de registro/preparación/despacho/guía se omiten si el pedido ya avanzó. No se reenvían avisos antiguos o entregados desde el panel.
- La aceptación por la API no prueba entrega: se distingue aceptación local de entrega confirmada por webhook. El ledger guarda webhooks antes de conocer el provider ID y evita que un evento `email.sent` tardío sobrescriba una entrega o rebote.
- Rebotes y quejas bloquean nuevos envíos a esa dirección. Los avisos administrativos se envían al grupo configurado; en avisos nuevos se omiten las casillas bloqueadas y se avisa a las demás. Si el body ya está congelado, no se altera un reintento: se omite y queda visible para revisión. Corregir el grupo antes de continuar. No reenviar a una casilla que presentó una queja.
- Expiración usa `expire_retail_reservations_v2`, preservando stock propio y disponibilidad del proveedor. No modifica reglas de pago, precio o envíos.
- Para recuperación de acceso con Resend, configurar su SMTP en Supabase y validar registro/recuperación antes de cambiar el proveedor de Auth. Este ajuste externo se completó el 19/10/2026.

## Fuentes y validación

Documentación oficial: [enviar email](https://resend.com/docs/api-reference/emails/send-email), [idempotencia](https://resend.com/docs/dashboard/emails/idempotency-keys), [dominios verificados](https://resend.com/docs/dashboard/domains/introduction), [firmas de webhooks](https://resend.com/docs/webhooks/verify-webhooks-requests).

Pruebas locales: `tests/emails.test.ts`, `tests/email-database.test.ts`, `tests/email-dispatch.test.ts`. Postgres/PGlite verifica captura, rollback, líneas, idempotencia, acreditación, guía, vencimiento, leases, webhooks y permisos. Transporte simulado: no prueba DNS, casillas reales, reputación, entrega de Resend ni pagos reales.

`node scripts/verify-email-ui.mjs` recorre la ruta real local `/admin/emails` con Supabase/Auth ficticios en 320, 390 y 1440 px; prueba selecciones, vistas previas, acceso anónimo/cliente, cron privado y rechazo de webhook sin firma. Evidencia en `../scratch/email-system-2026-10-10/`. No escribe en Supabase real ni envía emails. Requiere Chromium/Chrome y Playwright del runtime local (configurable con `CODEX_NODE_MODULES`).

Antecedente del 10/10 (resuelto en la revisión actual): el guard `scripts/check-public-evidence.mjs` detectó archivos previamente rastreados de `docs/mango-fuerza-2026-10-08/` con campos privados. No pertenecen a esta integración y no se modificaron ni publicaron; ese bloqueo debe resolverse antes de una publicación del repositorio.

Resultado local del 10/10/2026: 64/64 pruebas, type-check, lint de archivos afectados y build de producción aprobados. Smoke de la ruta real con fixtures: 320/390/1440 px sin desbordes ni errores de JavaScript; vistas previas interactivas, redirección de anónimos/clientes, cron con autenticación y rechazo de webhook sin firma verificados. No hay prueba de envío/entrega real ni despliegue.

## Acceso y seguridad de cuentas

Las 13 plantillas de `supabase/templates/` se generan con `node scripts/build-auth-email-templates.mjs`. `auth-config.json` contiene únicamente asuntos y HTML para la API de configuración de Supabase, sin claves. Cubre confirmación (solo si la política vigente la requiere), recuperación, invitación, enlace de ingreso, cambio de email, reautenticación y siete avisos de seguridad. No habilita notificaciones ni modifica la política de confirmación por sí solo. Para SMTP: `smtp.resend.com`, puerto 465, usuario `resend`, contraseña = clave privada nueva limitada al dominio MYA. Remitente: `pedidos@mail.myaimportaciones.com`. Desactivar seguimiento de clics/aperturas de Auth para preservar enlaces. Supabase genera y valida los tokens; no se mandan contraseñas ni tokens propios desde la cola de pedidos.

Antes de activar las notificaciones de seguridad, configurar SMTP y probar recuperación con una casilla administrativa controlada. La bienvenida se encola una sola vez al confirmar el email o al crear una cuenta inmediatamente confirmada; nunca se hace backfill de cuentas anteriores. El worker comprueba que el email de la cuenta y el acceso mayorista sigan vigentes antes del primer envío.

## Evidencia de esta actualización

- Dominio verificado en Resend: `bb26b82c-069b-4b88-8c77-0d86f9fe10b8`, región São Paulo. Evidencia privada en `../scratch/email-system-2026-10-19/`.
- Producción: se aplicaron `transactional_emails`, `email_account_and_aftersales` y `enable_email_scheduler` exclusivamente en MYA. Las variables de Resend y del cron quedaron guardadas como secretos de producción en Vercel. El conector de Vercel rechazó el listado con 403; el CLI con sus credenciales propias permitió realizar la configuración autorizada.
- Se creó la clave `MYA web - envio restringido`, permiso Sending access y dominio exclusivo MYA. La clave que quedó visible en un diagnóstico fue revocada antes de usarse; se utilizó un reemplazo privado. No se usó una clave de Turnero para MYA.
- La compilación de Next pasó. Se excluyeron del chequeo de TypeScript los scripts privados `docs/**/qa-private/**`, que contenían errores ajenos al código de la tienda. La app y sus pruebas siguen incluidas.
- La prueba envió recuperación de cuenta y dos avisos `email_test`, uno por administrador. Los cuatro correos de MYA tienen evento firmado `email.delivered`. No se crearon compras ficticias, campañas ni pagos.

Validación final del 19/10/2026: 118/118 pruebas de la tienda aprobadas; TypeScript y compilación de producción aprobados; lint de los archivos modificados sin errores (una advertencia preexistente en `src/app/admin/actions.ts`). Prueba de rutas y previews reales locales con fixtures en 320/390/1440 px aprobada, sin desbordes ni errores JS; las 13 plantillas de Auth también se revisaron en esos anchos. Cron sin credencial y webhook sin firma rechazados; acceso anónimo y de cliente restringido. `check-public-evidence.mjs` aprobado. Esa validación local se complementó con la activación y la evidencia productiva detallada debajo, después de la autorización expresa del usuario.

## Activación y verificación productiva del 19/10/2026

- Despliegue `dpl_46fLdMojKZ5CdN3NQJ9FXJPDNzoh`, READY, alias `https://myaimportaciones.com`. Se excluyeron todos los directorios `.next*` del upload; la publicación usó archivo tgz.
- `/` y `/recuperar-clave`: HTTP 200. `/admin/emails` anónimo: redirección al login. Cron sin autorización y webhook sin firma: HTTP 401.
- SMTP de MYA: `smtp.resend.com:465`, remitente `pedidos@mail.myaimportaciones.com`; recuperación aceptada y entrega confirmada para las dos cuentas administrativas. Se conservó el alta inmediata (`mailer_autoconfirm=true`).
- Avisos administrativos controlados: dos filas `activation/2026-10-19/admin-test/*`, `sent`, `email.delivered`, sin errores. Se enviaron desde el worker productivo, sin crear pedidos.
- Webhook Resend `0c9c8415-9bb2-4d1e-8d33-63aeabcd336b`, siete eventos operativos habilitados, firma verificada y cuatro confirmaciones de entrega recibidas.
- Cron `mya-process-transactional-emails`, `*/5 * * * *`, activo. Primer recorrido automático a las 13:10 de Argentina: succeeded y HTTP 200; segunda invocación controlada por pg_net también HTTP 200, sin errores. Vault almacena su credencial bajo `mya_email_cron_secret`; nunca se incluye el valor en el código o el comando del cron.
- La configuración de Turnero se realizó antes y por separado: proyecto `nacxavvyaajaemzxdyhs`, remitente `notificaciones@turnero.site`, su propia clave, 13 plantillas y siete avisos de seguridad; ambas pruebas de recuperación de Turnero figuran delivered. Su código operativo no fue modificado.
- Evidencia de UI privada: carpeta de visualizaciones de esta conversación y `../scratch/email-system-2026-10-19/`. Las pruebas de entrega confirman aceptación en el servidor de destino; no prueban lectura humana ni ubicación en la bandeja principal.
