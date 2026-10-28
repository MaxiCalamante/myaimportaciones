# Medición de consultas y crecimiento orgánico

Se reutilizan Search Console, GA4 y los eventos existentes de MYA. No se agrega un tracker ni se modifica el consentimiento.

- Search Console: comparar dos períodos completos de 28 días con los mismos filtros. Guardar clics, impresiones, CTR, posición, consultas y páginas principales; distinguir marca, mayorista y productos. Anotar la fecha final disponible.
- GA4: `contact` con `contact_type=wholesale`, `contact_source`, `category` y `advisor` permite separar clics de consulta. Un clic no demuestra un mensaje enviado ni una venta.
- Cuentas: contrastar registros nuevos y solicitudes mayoristas de la base de datos, excluyendo administradores y períodos incompletos. No asumir que todas las altas vinieron del SEO.
- Ventas: confirmar pedidos y pagos reales según sus estados; no usar apertura de WhatsApp o visitas como ingresos.
- Privacidad: medición de marketing sólo con consentimiento vigente. No registrar texto libre de consultas, teléfonos, correo, credenciales ni información privada de pedidos.

La evidencia de cuenta se guarda en `docs/seo/qa-private/seo-complement-2026-10-28/`, excluida de Git. La comparación posterior requiere datos suficientes después del release y no se sustituye por conversiones simuladas.
