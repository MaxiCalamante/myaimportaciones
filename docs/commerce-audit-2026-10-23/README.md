# Auditoría de tienda y administración — 23/10/2026

Correcciones publicadas el 23/10/2026 por autorización del dueño: commit `a1bbeb222ea7fb2c9c2f1d9d81b32a2fad7699e1`, despliegue Vercel `dpl_7FFs2fszMGhaKDhbfu5nn3JoJE2x`, READY y alias del dominio verificados. El control público está en `production-smoke.json`. No hubo migraciones remotas, compras, cobros ni envíos de correo. La inspección de Supabase fue de solo lectura y consultó permisos y definiciones, sin descargar pedidos de clientes.

## Hallazgos corregidos

1. **Privacidad del comprobante.** `/pedido/[id]` consultaba con la clave de servicio y enviaba nombre, teléfono, dirección, artículos y enlace de pago al cliente con solo presentar un código o UUID. Ahora el GET muestra un formulario; una Server Action exige el email de la compra, usa coincidencia exacta para código o UUID y comparte el límite persistente de intentos de seguimiento. La respuesta omite notas internas y no permite distinguir un pedido existente con email incorrecto de uno inexistente. Los enlaces enviados por correo y desde checkout siguen funcionando y solicitan el email al abrirse.
2. **Reseñas sin respaldo.** El código generaba testimonios y entre 18 y 45 valoraciones, con 4,9 estrellas y 99% de recomendación, sin una fuente persistida. Se retiraron el contenido, las estadísticas y los votos locales. La ficha muestra que aún no hay opiniones verificadas publicadas y ofrece compartir una experiencia por el selector de WhatsApp existente. No se incorporaron estrellas al JSON-LD.
3. **Precio anunciado frente al cobrado.** Ficha, catálogo, barra móvil y carrito aplicaban visualmente 3% fijo y anunciaban tres cuotas, aunque el servidor puede reducir o deshabilitar descuentos según costos vigentes, margen y configuración. Ahora el resumen del servidor confirma el descuento real antes de registrar el pedido y Mercado Pago informa las condiciones de financiación. El cálculo, las reservas y la conciliación del servidor se preservan.
4. **Envíos a cotizar mostrados como gratis.** Una opción con `requiresQuote` y precio interno cero se mostraba gratis y podía mostrar una fecha calculada. La UI prioriza “Tarifa a cotizar” y “Costo y plazo a confirmar”. Si no hay configuración de envío del proveedor, el motor conserva la cotización pendiente y no ofrece tarifas ni retiro propios como alternativa automática.
5. **Destino y variante.** Elegir una opción de entrega desde una consulta de CP aún no aplicada podía dejar otro destino en el contexto del carrito. La selección ahora aplica también el CP. El calculador recibe stock, verificación y disponibilidad de la variante seleccionada. El campo también refleja un CP borrado externamente.
6. **Errores de análisis en administración.** Se corrigieron reinicios de estado mediante efectos en recorte de imágenes y auditoría, se evita aplicar respuestas antiguas al modal desmontado y se tiparon registros de auditoría y dobles de pruebas. ESLint ignora la salida de compilación `.next-storefront-qa`.

## Permisos y pagos

- Inspección de producción: las políticas consultadas restringen pedidos y artículos a su cuenta compradora y administradores; los clientes pueden leer su perfil y la gestión exige `is_admin()`.
- `create_retail_order_v2`, `reconcile_retail_payment_v2` y el RPC antiguo `get_order_by_tracking` no son ejecutables por `anon` ni `authenticated`. El RPC de cambio de estado exige administrador y no permite acreditar manualmente Mercado Pago.
- El webhook comprueba firma y consulta al proveedor; valida cuenta, moneda y modo antes de conciliar. Las pruebas cubren firma, vencimiento, importe, redirecciones y transacciones SQL aisladas. **Esto no equivale a un pago real aprobado y conciliado.**
- El asesor de Supabase informa protección de contraseñas filtradas deshabilitada y dos funciones históricas sin `search_path` fijo. No se modificó configuración remota. Las advertencias por funciones `SECURITY DEFINER` requieren revisar permisos y controles internos; no prueban por sí solas un acceso indebido. Las tablas privadas sin políticas se mantienen inaccesibles por RLS.
- Referencias del asesor: [search_path](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable), [contraseñas filtradas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## Validación

- `npm test`: 211 pruebas aprobadas; incluye nuevos casos del comprobante con email incorrecto, UUID, patrones comodín, límites, entradas inválidas y errores de lectura.
- `npm run type-check`: aprobado.
- `npm run lint`: cero errores y 142 advertencias no bloqueantes del proyecto.
- `next build --webpack`: aprobado; 43 páginas generadas. El intento final incluye todas las correcciones.
- Navegador: 48 visitas de rutas y 3 recorridos de carrito en 320/390/1440 px, sin errores JavaScript ni desbordamiento horizontal. Se validaron CP seleccionado, opciones a cotizar, comprobante protegido y redirección de visitantes en `/admin`, `/admin/ventas` y `/admin/costos`. Evidencia: `ui/verification.json` y capturas públicas en `ui/`.
- `node scripts/check-public-evidence.mjs` y `git diff --check`: aprobados.

El primer intento con Turbopack quedó sin completar y se interrumpió; la validación de compilación usa `next build --webpack`. El verificador local es `scripts/verify-commerce-audit-2026-10-23.mjs`; rechaza destinos remotos y no confirma pedidos ni pagos. No se probó una sesión administrativa real mediante navegador.

## Prioridades siguientes

1. Publicación y controles públicos realizados; continuar con la medición y las páginas mayoristas documentadas en `../wholesale-growth-2026-10-23/README.md`.
2. Verificar medición del recorrido visita → producto → carrito → checkout → pago acreditado con consentimiento; usarla para elegir dónde recuperar ventas, sin contar un pedido pendiente como venta.
3. Recopilar reseñas reales con consentimiento y vinculación a compras entregadas antes de volver a mostrar estadísticas de satisfacción.
