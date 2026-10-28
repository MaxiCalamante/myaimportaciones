# Auditoría del release SEO — 28/10/2026

Publicación autorizada por el dueño de los refuerzos de navegación y variantes, la unificación del mínimo mayorista de $100.000 o 5 unidades combinables, y las correcciones pendientes del canal mayorista.

## Correcciones de auditoría

- Administrador mayorista: tipos inferidos de Supabase en lugar de `any`; autorización explícita previa a consultas con cliente de servicio.
- Presupuesto: autorización mayorista comprobada antes de consultar el catálogo privado. Visitantes van al login y cuentas sin aprobación vuelven al portal.
- Documento imprimible: número de referencia y fechas calculados una vez en servidor y pasados como datos; se elimina el cambio de estado dentro del efecto y la fecha impura durante el render. La referencia es de visualización, no un pedido persistido. Fechas en hora argentina y vigencia existente de 15 días.
- No se modifican precios, inventario, pedidos, pagos, consentimientos ni esquemas de base de datos.

## Validación

Lint completo: cero errores y 169 advertencias existentes. Type-check, 260 pruebas y build aprobados. Auditoría de dependencias de producción: cero vulnerabilidades reportadas. Respuestas anónimas de `/mayorista/presupuesto` y `/admin/mayoristas`: redirección a login, sin catálogo ni costos privados. Revisión responsive de siete páginas y dos selecciones reales de variantes; evidencia privada en `docs/seo/qa-private/seo-complement-2026-10-28/`.

`check-public-evidence.mjs` se ejecuta sobre el índice antes del push. Credenciales, capturas de cuentas, datos comerciales y logs quedan fuera de Git. La evidencia final de SHA, Vercel y producción se conserva en el registro privado del release.

## Medición

Se revisaron Search Console, GA4 y agregados de la base de datos. El procedimiento está en `docs/seo-measurement.md`; el informe de cuenta es privado. Se distingue clic de contacto, conversación y venta, y no se atribuyen todas las altas a Google. No se crearon tareas programadas en la PC.
