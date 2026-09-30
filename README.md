# MyA Importaciones

Tienda minorista de MyA Importaciones, con Next.js 16.3.5, React 19 y Supabase. La aplicación activa está en este directorio.

## Estado y lanzamiento

Ver [mejoras, evidencia y checklist del 30/09/2026](docs/MEJORAS-Y-LANZAMIENTO-2026-09-30.md). La base conectada tiene cero productos al verificarla. Las migraciones de proveedores/seguridad y carrusel se aplicaron y verificaron remotamente el 30/09/2026. La publicación de la aplicación se verifica por separado del commit/push.

El canal B2B permanece desactivado. Checkout y envío automático requieren configuración y conciliación real antes de habilitarse; el cliente puede consultar disponibilidad y entrega por WhatsApp.

## Administración

- `/admin`: productos, categorías, pedidos y clientes. Crear y editar comparten editor, galería, cámara/archivos y validación en servidor.
- `/admin/proveedores`: agenda privada compartida entre dispositivos, contacto, notas y archivo lógico; requiere la migración nueva.
- `/admin/carrusel`: imágenes, textos, enlaces, orden y visibilidad del inicio, con vista previa y guardado conjunto; requiere `20260930200326_storefront_carousel.sql`.
- `/admin/operaciones`: verificación de stock físico y reclamos.
- `/admin/costos`: costos documentados y precios.
- `/admin/estado`: configuración operativa.

Todos los accesos necesitan una sesión con rol admin. No ejecutar seeds históricos para empezar una tienda vacía. Los productos se crean como borradores y la disponibilidad de proveedor se confirma expresamente.

## Desarrollo y validación

Copiar `.env.example` a una configuración local y completar las variables correspondientes. No guardar credenciales privadas en el repositorio ni usar prefijo `NEXT_PUBLIC` para secretos.

```sh
npm install
npm run dev
npm run type-check
npm run lint
npm run test
npm run build
```

El script `scripts/verify-launch.mjs` comprueba la experiencia pública móvil/escritorio con Playwright y Edge sobre un servidor local. Acepta URL y, opcionalmente, ruta a los módulos de Playwright. No crea productos ni envía mensajes.

La publicación debe coordinar esta versión de código con la migración `20260930200323_admin_suppliers_and_catalog_security.sql`. Ver el checklist antes de activar cobros, cron o publicar.

El carrusel agrega la migración independiente `20260930200326_storefront_carousel.sql`, aplicada remotamente. `scripts/verify-carousel.mjs` verifica sus controles públicos y el acceso sin sesión en móvil/escritorio con los mismos argumentos del script anterior. `node --env-file=.env.local --import tsx scripts/verify-supabase-release.mjs` comprueba lectura pública, bloqueo de campos privados y las diapositivas persistidas mediante PostgREST, sin imprimir claves ni modificar datos.
