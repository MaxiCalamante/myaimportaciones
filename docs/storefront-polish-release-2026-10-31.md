# Renovación visual de la tienda — 31/10/2026

## Alcance de la entrega

El dueño autorizó mejorar el diseño público en desktop y mobile, incorporar el trabajo pendiente y publicarlo mediante commit y push. Esta entrega reúne la corrección de subcategorías y la búsqueda documentadas en `catalog-navigation-search-2026-10-31.md`, la retirada del email personal de los contactos públicos y la renovación visual de la tienda.

## Diseño e interacción

- Cabecera con marca, buscador amplio y controles de cuenta, favoritos y carrito. La navegación desktop tiene su propia fila; mobile mantiene búsqueda y menú accesibles desde la cabecera y la navegación inferior.
- Portada con composición de texto e imagen, controles de carrusel accesibles y pausa durante la interacción. Conserva las diapositivas y los enlaces configurados por administración; también permite elegir una diapositiva directamente.
- Los cinco rubros comparten un directorio compacto, con desplazamiento nativo en mobile y subcategorías desplegables. Se conservan todos los enlaces públicos.
- Tarjetas con fotos sobre blanco, una sola etiqueta destacada, marca y título legibles, precios alineados, variantes reales, disponibilidad diferenciada y acciones de compra. Se retira el texto de transferencia repetido en cada tarjeta; las condiciones siguen en la ficha y en el resumen de compra.
- Fichas con títulos más claros, galería y miniaturas, bloque de compra y secciones técnicas ordenadas. Selección de variantes, cantidades, consulta de envío, ampliación de foto y enlaces mayoristas conservan su funcionamiento.
- Pie más compacto, dos contactos directos de WhatsApp e Instagram. El email personal se retira también de presupuestos, textos para compartir, páginas de contacto y datos estructurados públicos.
- Contraste reforzado en marcas, navegación móvil y etiquetas de opciones. Se retira de la portada una sección de beneficios que repetía información ya presentada.

No se modifican productos, precios, stock, activaciones, tarifas, pagos, permisos o seguimiento de proveedores. Los correos operativos privados y los formularios que solicitan el email del cliente conservan su función.

## Verificación reproducible

```powershell
npm run type-check
npm test
npm run lint -- --ignore-pattern '.next-*/**'
npm audit --omit=dev
npm run build
node scripts/check-public-evidence.mjs
node scripts/verify-catalog-navigation.mjs
node scripts/verify-storefront-polish.mjs
```

Los verificadores del navegador aceptan `QA_BASE_URL`; el segundo también acepta `QA_STAGE` para separar evidencia local y producción. Sólo realizan navegación, lecturas y cambios en el estado del navegador invitado. No registran pedidos ni realizan pagos. Las solicitudes de escritura se bloquean en el segundo verificador.

La comprobación cubre portada, catálogo, perfumería, electrónica, herramientas, fichas, mayoristas, Medicube, favoritos, checkout, condiciones, privacidad, arrepentimiento, seguimiento y acceso. Las vistas principales se revisan a 320, 390, 768, 1280 y 1440 px. Se comprueban carrusel, subcategorías, búsqueda, orden, favoritos, cantidades, carrito, variantes, galería y contactos.

La evidencia detallada y las capturas se guardan localmente en `docs/seo/qa-private/premium-2026-10-31/`, excluido de Git. El estado del despliegue y el SHA activo se deben contrastar con Vercel y con el dominio público; la compilación local por sí sola no acredita publicación.

Validación local completada: 272 pruebas aprobadas, TypeScript y compilación correctos, lint sin errores y auditoría de dependencias de producción sin vulnerabilidades. Sobre la compilación optimizada se aprobaron 50 vistas en cinco anchos, siete conjuntos de interacciones y seis controles de accesibilidad sin infracciones WCAG A/AA detectadas por axe. Los 57 enlaces de categorías abrieron correctamente; se comprobaron además búsqueda, ausencia de coincidencias y error de red. Sin excepciones JavaScript ni escrituras de backend durante estos recorridos.

## Próximos pasos

1. Medir uso del buscador y apertura de fichas con consentimiento para detectar dificultades reales de navegación.
2. Revisar las fotos de catálogo que tengan calidad desigual antes de reemplazarlas, conservando la identidad exacta de cada presentación.
