# MYA UX/UI premium V2

## Auditoría y dirección
Referencia principal: mockup móvil provisto por el usuario (home, grilla y menú). Sólo se recibió esa imagen en este turno; no se afirman comparaciones con otras ocho capturas ausentes. Se capturó producción a390px antes de cambiar código.

Stack existente Next16/React19/Tailwind4. Se conservan CommerceProvider, ProductSearch, selección de variantes en PDP, carrito, autenticación, fuentes de catálogo y SEO. c2b2b0f mejoró búsqueda y rutas, pero separó imagen/texto del hero en móvil, amplió categorías y convirtió versiones en filas44px dentro de cada card. e196b18 agregó información real de versiones: se conserva esa información mediante un contador, sin sus botones desplegados.

Dirección: blanco, texto neutro, azul MYA, fotos originales, cards cuadradas compactas, dos columnas móviles, hero fotográfico de altura contenida, accesos de categorías en grilla y menú modal con acordeones. Sin rollback completo ni cambios de base de datos.

## Plan autorizado
1. Registrar estado inicial y revisar historial.
2. Definir tokens reutilizables y compactar home/hero/categorías.
3. Corregir cards y variantes sin alterar compra.
4. Rehacer navegación móvil con foco, Escape, fondo bloqueado y enlaces por rol.
5. Verificar datos reales, categorías, PDP, carrito y navegaciones en7anchos, Chromium y WebKit.
6. Ejecutar tests, tipos, lint, build; documentar límites y hacer commit/push en rama, sin despliegue de producción.

## Implementado
- Tokens compartidos de color, espaciado, tipografía, radios, controles y sombras; breakpoints existentes de Tailwind.
- Hero fotográfico compacto con contenido/CTA del carrusel guardado, navegación discreta y controles44px. Se preserva la edición administrativa y se limita visualmente la descripción a2líneas.
- Cinco categorías compactas3+2 en móvil y fila en escritorio, con imágenes reales y slugs conservados. Nombres breves visibles sin cambiar categorías ni URLs.
- Cards2columnas móviles con imagen cuadrada contain, marca, título2líneas, precio en ARS, contador de opciones y CTA. «Desde» sólo en rangos reales; en320px puede ocupar su propia línea para no recortar importes. Variantes se eligen en PDP, nunca se agrega una arbitraria.
- Disponibilidad propia, bajo pedido o sin confirmar según evidencia existente. Se conservan los precios/reglas comerciales.
- Header blanco sticky60px móvil y franja24px que sale del scroll. Menú modal con buscador real, acordeones52px, favoritos, cuenta, mayorista y WhatsApp. Foco atrapado, Escape/restauración, scroll propio y fondo inert. Admin condicionado al rol.
- Barra inferior60px+safe-area con Inicio/Catálogo/Carrito/Mis pedidos/WhatsApp. En PDP y checkout se mantienen las acciones específicas existentes.
- PDP conserva galería/zoom, selección de variantes, precios, envío, consultas y compra; se reduce el acolchado de imágenes. Mayorista y FAQ compactos, manteniendo reglas y contenido SEO.

## Verificación real
`npm test`:315/315, sin fallos. Pruebas focalizadas de cards, variantes y navegación:15/15. TypeScript y build de producción aprobados con configuración pública real de Supabase, sin credenciales de servicio. ESLint sin errores;151warnings existentes (se revisó separadamente código modificado).

Chromium: home y menú en320,375,390,430,768,1024,1440px. Catálogo, PDP simple, PDP con variantes y carrito en los7anchos:28casos aprobados, sin recortes horizontales de precios ni desbordes de página. Se verificó favorito ida/vuelta.57categorías/subcategorías reales devuelven200; no se rehacen rutas previamente corregidas. Ver `evidence/results.json` y `routes.json`.

WebKit de Playwright (Linux WPE, emulación móvil, no un iPhone físico):375,390,430px;12vistas aprobadas de home, menú, PDP, selección real de variante y carrito. Pruebas adicionales de foco/Escape/búsqueda/subcategoría a320px. La variante Zanzibar de Lattafa Asad se mantuvo correctamente en el carrito local. Cero errores de página. Ver `webkit-results.json` y `webkit-navigation-results.json`. La primera ejecución estándar de WebKit estaba bloqueada por librerías; se resolvió con dependencias extraídas en/tmp, sin instalar servicios ni modificar el sistema. Reproducción en `webkit-userland.md`.

La primera revisión visual detectó productos demasiado abajo y precios cortados a320px: se redujeron categorías/hero y se permitió que «Desde» ocupe una línea separada. La segunda revisión encontró falta de acceso móvil a favoritos y discrepancia entre preview y primer slide: corregidos. Los controles del carrusel se ampliaron a44px. La versión final ubica la primera fila entre775–788px en320–430px, con cards de347–385px según foto/tamaño/precio; no aparecen listados de variantes.

## SQL autorizado y aplicado
Se aplicó `storefront_supplier_freshness_read` (archivo20261101064218): únicamente GRANT SELECT sobre supplier_last_checked_at a anon/authenticated. Resuelve una autorización faltante del trabajo previo, sin exponer costos ni fuentes privadas.

Por pedido posterior explícito del usuario también se aplicaron las tres migraciones antes pendientes: `catalog_pricing_rules`, `supplier_catalog_import`, `supplier_checkout_operations`. Se instalaron primero reglas, luego catálogo, luego operaciones. Se verificaron columnas previas, marcador de la función de estados,8tablas con RLS, RPC protegidas, wrapper de checkout y denegación de accesos anónimos. Jobs/reglas/snapshots/operaciones permanecen en0: no se importó, publicó ni compró nada. El acceso anónimo a product_costs devuelve0filas por RLS. El catálogo público continúa200.

Advisors: las advertencias previas se mantienen; las funciones SECURITY DEFINER ejecutables por authenticated aumentan26→32 por las RPC nuevas, todas con comprobación administrativa o de rol en su interior. No aumentan funciones ejecutables por anon. Revisión: https://supabase.com/dashboard/project/gqcdurxndbeeugjfworx/database/security-advisor . No se cambió configuración Auth ni se borró historial.

## Límites y entrega
Sólo se recibió el mockup principal; no se recibieron las otras8capturas mencionadas. Se guardó comparación con producción antes/después; las fotos y datos difieren del mockup porque se usan los reales. No se afirma fidelidad de textos/fotos ficticios ni ensayo en dispositivos físicos. No se creó ningún pago o pedido real durante QA.

El diseño aún no está desplegado. Las migraciones del trabajo anterior ya están aplicadas, pero publicar esa funcionalidad requiere desplegar código y actualizar Edge coordinadamente, sin habilitar publicación automática.

Git por HTTPS rechazó escritura403; la integración GitHub también rechazó crear blobs403 «Resource not accessible by integration», aunque la cuenta indica permisos de push. No se ocultó el bloqueo ni se usaron credenciales ajenas. Se dejan commits y bundle completo para transportar a la PC. Para subir al remoto hace falta reconectar/habilitar escritura de contenidos en la integración o ejecutar git push desde una PC autorizada.
