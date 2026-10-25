# Publicación de mayoristas, frontend y SEO — 25/10/2026

El dueño autorizó commit, push y deploy del conjunto y una última revisión de frontend/SEO. Esta entrega reúne `wholesale-design-2026-10-25.md` y `wholesale-discovery-2026-10-25.md`, junto con la optimización pendiente de las tarjetas para compartir.

## Alcance final

- Mayoristas integrado visualmente con la tienda: cabecera blanca común, navegación activa y sin el cartel de cambio a minorista. Portada con fotos reales de cinco rubros, directorio, pasos, formulario y preguntas frecuentes.
- Todos los rubros se pueden consultar por mayor; Medicube tiene un acceso específico. Mínimo de 5 unidades O $100.000 en productos, combinables entre rubros; envío aparte a toda Argentina. Precios mayoristas por WhatsApp con Máximo o Agustina.
- SEO minorista en las URLs existentes de los cinco rubros y Medicube; nueva página `/mayorista/medicube`, enlaces internos, organización con ambos contactos y cobertura nacional. `/llms.txt` complementa las páginas HTML, sin afirmar indexación ni recomendaciones de asistentes de IA.
- Revisión final: el pie mayorista incluye electrónica y usa enlaces directos a los rubros. Las páginas mayoristas comparten una imagen propia de categoría con mínimo, contacto y entrega, sin precios de producto.
- Se incorporan las dos sombras eliminadas de `/compartir` y `scripts/benchmark-share-cpu.mts`, revisados y validados con renders PNG reales. No se atribuye un ahorro de CPU productivo sin medirlo en Vercel.
- El control de seguridad detectó avisos en Next.js 16.3.8. Se actualizan Next.js y su configuración de ESLint a 16.4.3 y la dependencia transitiva de desarrollo Zod a una versión corregida. `npm audit` completo queda sin vulnerabilidades. Referencia del mantenedor: [Server Actions](https://github.com/vercel/next.js/security/advisories/GHSA-p3m5-59mp-jv5r).

No se cambiaron precios, inventario, proveedores, permisos, pagos, tareas programadas ni la bandera del checkout mayorista. No se publican la conversación ni los datos personales de la clienta. La evidencia local de navegadores y operaciones permanece fuera de Git.

## Validación y publicación

La revisión local cubre pruebas, tipos, lint, build webpack, auditoría de dependencias y guard de evidencia pública. Los scripts de navegador comprueban lectura sin JavaScript, metadatos/canonical, sitemap, imágenes y consultas por WhatsApp sin enviar mensajes ni registrar compras. El informe de diseño añade menú, búsqueda y cabecera a seis anchos.

La publicación apunta a `main` de `MaxiCalamante/myaimportaciones`, proyecto Vercel `myaimportaciones`, dominio `myaimportaciones.com`. Se comprueban el SHA del despliegue, estado READY, aliases, controles públicos y registros de ejecución. La evidencia final de producción se conserva en `docs/seo/qa-private/wholesale-release-2026-10-25/production/` y el resultado de esta tarea; no se confunde compilación local con despliegue ni lectura por bots simulados con indexación real.

## Próximas prioridades

1. Revisar en Search Console la indexación y las consultas de las páginas mayoristas y minoristas.
2. Comparar referencias desde buscadores/asistentes, clics en los contactos y consultas recibidas, sin contar un clic como una venta.
