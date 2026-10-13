# Emails transaccionales de MYA

Implementación local preparada el 10/10/2026. Los envíos están desactivados por defecto. No se aplicó la migración en producción, no se desplegó y no se enviaron correos reales durante la validación.

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

Despacho, guía y entrega dependen de la actualización del pedido en administración. Esta integración no consulta los movimientos de Correo Argentino ni inventa plazos. El enlace del correo abre su formulario oficial y el email incluye la guía para ingresarla allí. Los enlaces de la tienda precargan el código del pedido y solicitan el email del comprador; no llevan datos personales en la URL.

Recuperación de contraseña y confirmación de cuenta siguen a cargo de Supabase Auth y su política vigente. Para enviarlas con Resend también hay que configurar el SMTP de Supabase al verificar el dominio; no se reemplazan por tokens creados por la aplicación. Las promociones quedan fuera de los avisos operativos: requieren consentimiento específico y baja.

## Activación cuando exista un dominio

1. Verificar un dominio propio o subdominio en Resend con sus registros DNS. Gmail puede recibir los avisos y ser el Reply-To; no puede ser el remitente de esta integración. `vercel.app` tampoco es un dominio remitente propio.
2. Crear una clave privada nueva de Resend. No reutilizar una clave expuesta en chat. Guardarla como secreto del servidor.
3. Confirmar el email de Máximo (`maximocalamante14@gmail.com` figura en la tienda) y la dirección exacta de Agustina. Configurar `ADMIN_NOTIFICATION_EMAILS` con ambas direcciones separadas por comas. No se adivinó la dirección de Agustina.
4. Aplicar `supabase/migrations/20261010120000_transactional_emails.sql` después de las migraciones existentes. Es aditiva y no genera avisos históricos.
5. Configurar variables privadas de `.env.example`: `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (ejemplo con un dominio que sea tuyo: `MYA Importaciones <pedidos@mail.tudominio.com>`), `RESEND_REPLY_TO_EMAIL`, `ADMIN_NOTIFICATION_EMAILS`, `RESEND_WEBHOOK_SECRET`, `CRON_SECRET`. Confirmar `NEXT_PUBLIC_SITE_URL` con la URL HTTPS pública real. Tras verificar el dominio, establecer `RESEND_DOMAIN_VERIFIED=true`. Mantener `TRANSACTIONAL_EMAILS_ENABLED=false` hasta completar los pasos.
6. Registrar en Resend `https://TU-TIENDA/api/resend/webhook` para `email.sent`, `email.delivered`, `email.delivery_delayed`, `email.bounced`, `email.complained`, `email.failed` y `email.suppressed`. Guardar su signing secret como `RESEND_WEBHOOK_SECRET`. Svix verifica firma y antigüedad antes de procesar el cuerpo.
7. Desplegar y configurar un scheduler frecuente que invoque `/api/cron/emails` con `Authorization: Bearer CRON_SECRET`. `vercel.json` incluye un respaldo diario (09:00 UTC); compras, pagos y cambios administrativos se procesan inmediatamente después de la respuesta. **El respaldo diario no garantiza reintentos rápidos ni vencimientos a la hora exacta.** Antes de operar ventas con avisos garantizados, configurar ejecución cada 5 minutos en un plan que la permita o un scheduler externo. Revisar su costo y límite antes de contratarlo. No se contrató ni activó un scheduler externo.
8. Habilitar `TRANSACTIONAL_EMAILS_ENABLED=true` y validar un pedido controlado, transiciones, ambas casillas administrativas, guía y webhooks de entrega. Validar pagos con la conciliación vigente; una redirección o un comprobante no acredita fondos.

El panel `/admin/emails` está restringido a administradores y muestra configuración, últimas 50 notificaciones, estados y vistas previas ficticias. No muestra claves ni envía correo al visualizar una plantilla. Permite procesar pendientes y reintentar errores transitorios dentro de la ventana segura.

## Fiabilidad y operación

- La cola se escribe en la misma transacción de la compra o cambio de estado. El fallo de Resend no deshace una compra ni una conciliación. Las transacciones revertidas no producen emails.
- Los eventos tienen clave única en Postgres; las peticiones a Resend usan `mya/<outbox-id>` como clave estable. Body, destinatarios y remitente quedan congelados antes del primer intento para conservarlos en los reintentos.
- Los workers reclaman hasta 4 avisos por ejecución con `FOR UPDATE SKIP LOCKED`, token de lease y recuperación después de 3 minutos. Timeout del proveedor: 8 segundos. Reintentos transitorios con espera creciente, máximo 8 intentos. Scheduler y botón administrativo recuperan pendientes.
- Resend conserva las claves de idempotencia 24 horas. Un aviso con primer intento hace más de 23 horas y resultado incierto pasa a revisión manual. Revisar Resend antes de reenviar; no se genera una clave nueva para eludir la protección.
- Avisos nunca intentados de más de 24 horas se omiten para no enviar backlog antiguo al activar. Avisos aún no preparados de registro/preparación/despacho/guía se omiten si el pedido ya avanzó. No se reenvían avisos antiguos o entregados desde el panel.
- La aceptación por la API no prueba entrega: se distingue aceptación local de entrega confirmada por webhook. El ledger guarda webhooks antes de conocer el provider ID y evita que un evento `email.sent` tardío sobrescriba una entrega o rebote.
- Rebotes y quejas bloquean nuevos envíos a esa dirección. Los avisos administrativos se envían al grupo configurado; en avisos nuevos se omiten las casillas bloqueadas y se avisa a las demás. Si el body ya está congelado, no se altera un reintento: se omite y queda visible para revisión. Corregir el grupo antes de continuar. No reenviar a una casilla que presentó una queja.
- Expiración usa `expire_retail_reservations_v2`, preservando stock propio y disponibilidad del proveedor. No modifica reglas de pago, precio o envíos.
- Para recuperación de acceso con Resend, configurar su SMTP en Supabase y validar registro/recuperación antes de cambiar el proveedor de Auth. Este ajuste externo está pendiente.

## Fuentes y validación

Documentación oficial: [enviar email](https://resend.com/docs/api-reference/emails/send-email), [idempotencia](https://resend.com/docs/dashboard/emails/idempotency-keys), [dominios verificados](https://resend.com/docs/dashboard/domains/introduction), [firmas de webhooks](https://resend.com/docs/webhooks/verify-webhooks-requests).

Pruebas locales: `tests/emails.test.ts`, `tests/email-database.test.ts`, `tests/email-dispatch.test.ts`. Postgres/PGlite verifica captura, rollback, líneas, idempotencia, acreditación, guía, vencimiento, leases, webhooks y permisos. Transporte simulado: no prueba DNS, casillas reales, reputación, entrega de Resend ni pagos reales.

`node scripts/verify-email-ui.mjs` recorre la ruta real local `/admin/emails` con Supabase/Auth ficticios en 320, 390 y 1440 px; prueba selecciones, vistas previas, acceso anónimo/cliente, cron privado y rechazo de webhook sin firma. Evidencia en `../scratch/email-system-2026-10-10/`. No escribe en Supabase real ni envía emails. Requiere Chromium/Chrome y Playwright del runtime local (configurable con `CODEX_NODE_MODULES`).

El guard `scripts/check-public-evidence.mjs` detectó archivos previamente rastreados de `docs/mango-fuerza-2026-10-08/` con campos privados. No pertenecen a esta integración y no se modificaron ni publicaron; ese bloqueo debe resolverse antes de una publicación del repositorio.

Resultado final local: 64/64 pruebas, type-check, lint de archivos afectados y build de producción aprobados. Smoke de la ruta real con fixtures: 320/390/1440 px sin desbordes ni errores de JavaScript; vistas previas interactivas, redirección de anónimos/clientes, cron con autenticación y rechazo de webhook sin firma verificados. No hay prueba de envío/entrega real ni despliegue.
