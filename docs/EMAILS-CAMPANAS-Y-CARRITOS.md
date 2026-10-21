# Campañas y recordatorios de MYA

## Uso del panel

1. Abrir `/admin/emails/campanas`, también disponible desde Emails o Marketing.
2. Escribir asunto, título, mensaje y un enlace interno de la tienda. Revisar la vista previa y guardar un borrador. Guardar no envía correos.
3. Usar **Probar con administradores**. El destinatario está fijado en la configuración privada; no se admiten casillas arbitrarias. Hay un máximo de una prueba de campaña cada diez minutos.
4. Abrir **Revisar mensaje completo** y confirmar **Enviar campaña**. La confirmación indica la audiencia con consentimiento. El cron prepara y envía lotes; repetir la confirmación no duplica la campaña.
5. Consultar `/admin/emails` para distinguir pendientes, aceptación del proveedor, entrega confirmada, omisiones y fallos. **Detener campaña** cancela lo pendiente; un email enviado o en tránsito no puede retirarse.

El contenido se guarda como texto y se escapa al renderizar. Los enlaces de campaña solo pueden apuntar al dominio de MYA. Los borradores son inmutables; para cambiar un mensaje, detener el borrador anterior y crear otro. El historial de campañas se pagina de a diez.

## Preferencias del cliente

En `/cuenta#emails`, cada usuario puede activar por separado ofertas/novedades y recordatorios de carrito. Ambas opciones comienzan desmarcadas. El consentimiento se registra en un historial append-only; no se suscribe a los clientes existentes ni se reutiliza el consentimiento de cookies.

Cada correo opcional incluye una baja pública y headers de baja de un clic (POST, RFC 8058). Un GET muestra la confirmación y nunca modifica preferencias. La baja detiene ambos tipos opcionales y borra la selección guardada; no suprime mensajes necesarios de pedidos o seguridad. No se incluyen emails personales en los enlaces.

La página de baja no inicializa píxeles ni scripts de publicidad, aunque el navegador tenga consentimiento general de analítica, para mantener privado el enlace de baja. Esta condición se probó en un contexto nuevo con todos los identificadores de publicidad habilitados y no se emitieron requests a los proveedores.

## Carrito

El navegador conserva el carrito local existente. Solo con el permiso específico y una cuenta confirmada se guarda en servidor una selección de hasta 50 referencias de productos/variantes y cantidades, sin precios ni datos privados de proveedores. Guardar el mismo contenido no cambia la revisión ni reinicia el reloj.

El cron considera selecciones con 24 a 48 horas de antigüedad. Envía como máximo un aviso por revisión y por semana. Omite el recordatorio si la selección cambió o quedó vacía, si hubo una compra posterior desde la cuenta o el mismo email (incluidos pedidos como invitado), si el email cambió, si se revocó el permiso o si el proveedor bloqueó el destinatario. Las selecciones de más de 30 días se limpian en lotes.

El enlace `/recuperar-carrito` exige iniciar sesión. La recuperación es explícita, informa si reemplazará un carrito local y consulta precios, variantes y disponibilidad actuales. El checkout sigue validando importes y stock en servidor; un carrito guardado no reserva productos.

## Operación

Proyecto Supabase: `gqcdurxndbeeugjfworx` (**Tienda Mayorista Minorista**). No aplicar esta migración en Turnero. Migración: `20261019200000_email_campaigns_and_cart.sql`, aplicada con éxito el 19/10/2026.

La migración complementaria `20261019210000_email_cart_frequency_guard.sql` mantiene el límite semanal aunque el cliente se dé de baja, borre su selección y después vuelva a autorizar. Ambas se aplicaron y sus pruebas SQL pasaron.

Publicado en `https://myaimportaciones.com` mediante `dpl_Da8TPyswZUR86Tge767dQYYionRy`, estado READY y alias verificado. Se comprobaron home y baja con HTTP 200, las redirecciones privadas y las respuestas 401 de carrito, cron y webhook sin autorización. Una invocación autenticada del cron posterior a la publicación devolvió HTTP 200, sin fallos. La página de baja final se verificó en producción a 390px: cero scripts publicitarios solicitados aun con consentimiento general de analítica, cero overflow y cero errores JS.

Se reutilizan `email_outbox`, sus leases y su idempotencia, el webhook firmado y el scheduler existente de cinco minutos. La preparación tiene límites y locks. Los mensajes de pedidos/cuenta tienen prioridad sobre campañas. El consentimiento, la cancelación y el estado del carrito se verifican antes de cada intento, incluso si ya existía un payload congelado. Se conserva el límite de reintentos del proveedor; si su resultado queda incierto al vencer la ventana de idempotencia, se requiere revisión.

No se crearon campañas reales ni se cambiaron preferencias de clientes durante la activación. Pruebas técnicas controladas con entrega confirmada por webhook:

- Diseño de ofertas: `01a155e1-2cef-7ecc-aad0-5c04436b3d02`.
- Diseño de carrito: `01a155e1-3043-7dc1-8bd0-113496fdce7a`.

El cron procesó ambas pruebas con `sent:2, failed:0, skipped:0`, HTTP 200. Las pruebas anteriores de SMTP y avisos administrativos también tuvieron entrega confirmada.

Verificación local: 128 tests, type-check, build, lint específico sin errores y revisión de rutas reales con Supabase sintético a 320/390/1440px, sin overflow ni errores JS. Incluye previews, opciones desmarcadas, baja, protección de acceso y rechazo de webhooks de Turnero sin escrituras en MYA. Los tests SQL comprueban RLS, consentimiento, deduplicación, cambios de email/carrito, compra, baja, reconsentimiento y cancelación. Las pruebas visuales nunca contactan servicios externos ni envían correos.
