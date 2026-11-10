# MYA Importaciones

**E-commerce argentino de productos importados, con venta minorista, mayorista y gestión automatizada de proveedores.**

MYA Importaciones es una plataforma comercial desarrollada con Next.js, React, TypeScript y Supabase. Permite administrar un catálogo de productos importados, consultar precios y disponibilidad de proveedores, gestionar pedidos y ofrecer productos tanto a consumidores finales como a revendedores.

**Sitio oficial:** https://myaimportaciones.com

**Instagram:** https://www.instagram.com/_myaimportaciones/

**Mercado:** Argentina.

**Modalidad principal:** comercialización bajo pedido, con abastecimiento desde Paraguay.

> Este documento presenta el proyecto, su arquitectura y los procedimientos generales de desarrollo. Las reglas para agentes de IA están en `AGENTS.md`; el contexto técnico y comercial detallado está en `AI_CONTEXT.md`.

---

## 1. Descripción del negocio

MYA Importaciones comercializa productos de distintas categorías mediante dos canales principales.

### Canal minorista

Orientado a consumidores finales que buscan comprar productos importados.

Incluye:

- Catálogo público.
- Categorías y subcategorías.
- Búsqueda y filtros.
- Fichas de producto.
- Variantes.
- Carrito.
- Checkout.
- Medios de pago.
- Consulta de disponibilidad.
- Información de envíos.
- Seguimiento de pedidos.

### Canal mayorista

Orientado a emprendedores, revendedores, profesionales y comercios.

**Acceso:** https://myaimportaciones.com/mayorista

Incluye:

- Catálogo mayorista público.
- Precios mayoristas diferenciados.
- Productos y marcas combinables.
- Políticas de compra configurables.
- Descuentos sujetos a rentabilidad.
- Solicitudes y pedidos mayoristas.
- Herramientas administrativas para precios y costos.

La consulta del catálogo no requiere aprobación comercial previa.

Las condiciones definitivas de compra dependen de la política vigente.

### Categorías comerciales

- Cosmética coreana y skincare.
- Perfumería y fragancias.
- Cuidado capilar.
- Electrónica y tecnología.
- Herramientas y equipamiento.

Las categorías comerciales pueden agruparse visualmente sin modificar innecesariamente las entidades y URLs existentes.

---

## 2. Tecnologías utilizadas

| Tecnología | Función |
|---|---|
| Next.js 16.4.3 | Aplicación y renderizado |
| React 19 | Interfaz |
| TypeScript | Desarrollo tipado |
| Tailwind CSS 4 | Estilos |
| Supabase PostgreSQL | Base de datos |
| Supabase Auth | Autenticación |
| Supabase Storage | Archivos e imágenes |
| Supabase Edge Functions | Procesos alojados |
| Vercel | Hosting y despliegue |
| Mercado Pago | Integración de pagos |
| Resend | Correo transaccional |
| Playwright | Pruebas de navegador |

Las versiones efectivamente instaladas deben verificarse en `package.json` y el archivo de bloqueo de dependencias.

---

## 3. Arquitectura general

La aplicación utiliza Next.js App Router.

### Organización principal

```text
src/
├── app/
│   ├── admin/
│   ├── api/
│   ├── catalogo/
│   ├── checkout/
│   ├── mayorista/
│   ├── producto/
│   ├── cuenta/
│   ├── seguimiento/
│   ├── sitemap.ts
│   └── robots.ts
│
├── components/
│   ├── admin/
│   ├── commerce/
│   ├── layout/
│   ├── wholesale/
│   └── ui/
│
└── lib/
    ├── supplier-tracker/
    ├── supabase/
    └── servicios comerciales

supabase/
├── migrations/
└── functions/

scripts/
tests/
docs/
```

La estructura es orientativa. Consultar el árbol real del repositorio para localizar módulos específicos.

### Principios de arquitectura

- La lógica sensible permanece en el servidor.
- Los clientes públicos no reciben costos internos.
- Las operaciones administrativas verifican autorización.
- Los datos comerciales se almacenan en Supabase.
- El frontend utiliza servicios compartidos.
- Las modificaciones críticas se validan en el servidor.
- Los procesos automatizados deben evitar duplicaciones y escrituras inconsistentes.

---

## 4. Proveedores oficiales

MYA trabaja actualmente con cuatro proveedores autorizados de Paraguay.

| Proveedor | Rubro | Web |
|---|---|---|
| Atacado Connect | Electrónica | https://atacadoconnect.com |
| Atacado USA | Belleza y perfumería | https://atacadousa.com.py |
| Star Company | Belleza y perfumería | https://starcompany-py.com |
| Total Herramientas Oficial | Herramientas | https://totalherramientasoficial.com.py |

Los proveedores anteriores permanecen archivados para preservar el historial comercial.

No reactivar fuentes históricas sin autorización.

### Sistema de rastreo

MYA dispone de un sistema para:

- Descubrir productos.
- Registrar fichas de proveedores.
- Verificar precios.
- Registrar disponibilidad.
- Detectar cambios.
- Relacionar productos con diferentes proveedores.
- Comparar oportunidades comerciales.
- Conservar historial de observaciones.
- Generar candidatos de importación.

El descubrimiento y la publicación son procesos diferentes.

**Un producto descubierto no se publica automáticamente por el solo hecho de aparecer en un proveedor.**

La publicación debe cumplir las condiciones comerciales y de seguridad correspondientes.

### Componentes relevantes

- `src/lib/supplier-tracker/`
- `src/lib/supplier-matching.ts`
- `src/lib/supplier-crosslinks.ts`
- `src/lib/supplier-opportunities.ts`
- `src/lib/import-costs.ts`

### Administración

- `/admin/proveedores`
- `/admin/proveedores/rastreador`
- `/admin/proveedores/inteligencia`
- `/admin/oportunidades`

Documentación:

`docs/suppliers/README.md`

---

## 5. Modelo de catálogo e inventario

MYA comercializa principalmente mercadería bajo pedido.

Por este motivo, diferencia:

**Stock físico:** unidades que pertenecen a MYA y se encuentran en su inventario.

**Disponibilidad de proveedor:** existencia de unidades ofrecidas por un proveedor autorizado.

No son equivalentes.

Un producto puede tener stock físico cero y aun así ser comercializable mediante abastecimiento externo.

### Entidades principales

- `products`
- `product_variants`
- `categories`
- `supplier_offers`
- `supplier_observations`
- `product_costs`
- `product_usd_prices`

### Visibilidad pública

La publicación depende de las políticas de:

- Estado comercial.
- Identidad del producto.
- Disponibilidad.
- Fuente válida.
- Precio.
- Rentabilidad.
- Calidad de la ficha.

Las reglas deben aplicarse consistentemente en catálogo, búsqueda, fichas, carrito, checkout y feeds.

### Productos agotados

La política comercial objetivo contempla ocultar los productos cuyo agotamiento haya sido confirmado en todos sus proveedores válidos.

Después de siete días consecutivos sin stock confirmado, pueden archivarse lógicamente.

El archivo debe conservar la información necesaria para recuperar el producto si vuelve a estar disponible.

Esta política requiere distinguir errores técnicos de agotamiento real y coordinar la visibilidad comercial con el SEO.

No borrar físicamente registros simplemente por falta de stock.

---

## 6. Precios y rentabilidad

El sistema contempla precios minoristas y mayoristas, con manejo de USD y equivalencias en ARS.

### Política de referencia

| Concepto | Margen objetivo |
|---|---:|
| Minorista | 30% |
| Mayorista | 18% |
| Piso general | 10% |

Los porcentajes son márgenes sobre el precio de venta, no recargos sobre el costo de adquisición.

### Costo total

Los cálculos deben contemplar las partidas aplicables:

- Compra al proveedor.
- Cotización efectiva de USD/USDT.
- Comisión del pasador.
- Transporte.
- Importación.
- Gastos variables.
- Comisiones de cobro.

No utilizar solamente el precio publicado por el proveedor para calcular rentabilidad.

### Controles

- Validación de costos.
- Vigencia de cotizaciones.
- Revisión de márgenes.
- Protección de precios manuales.
- Historial de cambios.
- Control de variaciones.
- Revisión de precios económicamente inválidos.

La configuración productiva debe consultarse en las políticas persistidas.

La existencia de un cálculo o de una política en modo `preview` no demuestra que todas sus restricciones estén aplicándose automáticamente en producción.

### Documentación

- `docs/USD-PROFITABILITY.md`
- `docs/POST-AUDIT-2026-11-06.md`
- `docs/POLITICA-DE-PRECIOS.md`

---

## 7. Canal mayorista

Ruta:

`/mayorista`

El canal está orientado a compras para reventa.

### Condiciones configuradas de referencia

La política mayorista verificada en noviembre de 2026 establece:

- Mínimo general: cinco unidades combinables **o** $100.000 ARS en productos.
- Margen objetivo: 18%.
- Margen mínimo: 10%.
- Escalas de cantidad sujetas a controles de rentabilidad.
- Condiciones diferenciadas por medio de pago.

Estas reglas se administran mediante configuración persistente y pueden modificarse.

No duplicarlas como constantes comerciales en múltiples componentes.

### Sistemas relacionados

- `src/lib/wholesale-v2.ts`
- `src/lib/wholesale-v2-read.ts`
- `src/lib/wholesale-catalog.ts`
- `src/lib/wholesale-content.ts`

### Datos y operaciones

- `wholesale_v2_policies`
- `wholesale_product_controls`
- `wholesale_variant_costs`
- `wholesale_price_events`
- `wholesale_checkout_requests`
- `order_wholesale_snapshots`

Consultar las versiones y firmas vigentes antes de modificar funciones o migraciones.

Documentación:

`mayorista-publico-plan.md`

---

## 8. Panel administrativo

El panel requiere una sesión autorizada con rol administrador.

### Secciones principales

| Ruta | Función |
|---|---|
| `/admin` | Panel general |
| `/admin/ventas` | Gestión comercial |
| `/admin/clientes` | Clientes |
| `/admin/costos` | Costos |
| `/admin/precios` | Precios y referencias |
| `/admin/mayoristas` | Canal mayorista |
| `/admin/proveedores` | Proveedores |
| `/admin/proveedores/rastreador` | Seguimiento de proveedores |
| `/admin/proveedores/inteligencia` | Comparación y abastecimiento |
| `/admin/oportunidades` | Oportunidades comerciales |
| `/admin/carrusel` | Carrusel del inicio |
| `/admin/operaciones` | Operaciones |
| `/admin/moneda` | Moneda y cotizaciones |
| `/admin/estado` | Configuración operativa |

Las rutas deben consultarse en el proyecto antes de agregar enlaces o modificar permisos.

### Seguridad

El frontend no debe sustituir las validaciones del servidor.

Las operaciones administrativas requieren autenticación, autorización y controles de acceso a datos.

No exponer información privada de proveedores o costos en respuestas públicas.

---

## 9. Pagos, pedidos y envíos

MYA dispone de recorridos de carrito, checkout y gestión de pedidos.

### Pagos

La aplicación contempla integración con Mercado Pago y transferencias.

La confirmación de una operación debe realizarse mediante validaciones confiables del servidor.

No considerar una simple redirección como confirmación de pago.

### Pedidos

Preservar:

- Identidad del producto.
- Variantes.
- Cantidades.
- Precio confirmado.
- Moneda.
- Medio de pago.
- Estado del pedido.
- Historial comercial.

Las modificaciones posteriores de precios o proveedores no deben alterar automáticamente pedidos históricos.

### Envíos

MYA opera con envíos a diferentes provincias de Argentina.

Los costos y plazos deben confirmarse según el pedido y el destino.

No presentar estimaciones como tarifas oficiales.

No prometer plazos de entrega sin respaldo operativo.

---

## 10. SEO y crecimiento orgánico

El dominio canónico es:

`https://myaimportaciones.com`

El proyecto incluye:

- Metadata dinámica.
- URLs canónicas.
- Sitemap.
- Robots.
- Datos estructurados.
- Páginas de categorías.
- Páginas de marcas.
- Landing pages mayoristas.
- Open Graph.
- Feeds comerciales.
- Integración de analítica.

### Archivos relevantes

- `src/lib/seo.ts`
- `src/lib/site-origin.ts`
- `src/lib/merchant-feed.ts`
- `src/app/sitemap.ts`
- `src/app/robots.ts`

### Consideración importante

Los productos agotados, ocultos o archivados requieren tratamiento SEO coherente.

No eliminar automáticamente URLs valiosas sin revisar si el agotamiento es temporal.

No publicar información falsa de stock, precios, calificaciones, garantías o envíos para mejorar los datos estructurados.

### Documentación

- `SEO_AUDIT.md`
- `docs/seo-measurement.md`

---

## 11. Instalación local

### Requisitos

- Node.js compatible con la versión instalada de Next.js.
- npm.
- Acceso autorizado al repositorio.
- Variables de entorno necesarias.
- Acceso a Supabase cuando corresponda.

### Preparación

Desde el directorio de la aplicación:

```bash
npm install
```

Crear la configuración local a partir de:

`.env.example`

Completar únicamente las variables necesarias para el entorno de desarrollo.

Después:

```bash
npm run dev
```

La aplicación local utiliza normalmente:

`http://localhost:3000`

### Variables de entorno

El proyecto utiliza variables como:

```text
NEXT_PUBLIC_SITE_URL
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY

COMMERCE_CHECKOUT_ENABLED
NEXT_PUBLIC_WHOLESALE_ENABLED

RESEND_API_KEY
CRON_SECRET

COMMERCE_SHIPPING_ENABLED
```

Consultar `.env.example` para el listado actualizado y las variables adicionales.

**Seguridad:**

- No subir `.env.local` al repositorio.
- No publicar credenciales.
- No colocar secretos en variables `NEXT_PUBLIC_*`.
- No compartir claves administrativas de Supabase.
- No apuntar tareas destructivas a producción durante el desarrollo.
- No habilitar pagos reales en entornos de pruebas sin autorización.

Una instalación local no debe ejecutar migraciones, seeds o cambios productivos automáticamente.

---

## 12. Scripts disponibles

Comandos principales del proyecto:

### Desarrollo

```bash
npm run dev
```

### Verificación de tipos

```bash
npm run type-check
```

### Análisis estático

```bash
npm run lint
```

### Pruebas

```bash
npm test
```

### Build

```bash
npm run build
```

### Ejecución de producción local

```bash
npm run start
```

### Herramienta manual de proveedores

```bash
npm run suppliers:local
```

Esta última herramienta requiere configuración y autorización apropiadas.

No debe ejecutarse como un servicio permanente.

### Pruebas especiales

```bash
npm run test:suppliers:browser
```

```bash
npm run test:giveaway
```

Existen además scripts especializados de auditoría, catálogo, proveedores y validación dentro de `scripts/`.

**No ejecutar scripts históricos de importación, publicación, limpieza, seeds o eliminación sin inspeccionar primero su comportamiento y alcance.**

---

## 13. Supabase y migraciones

Las migraciones versionadas se encuentran en:

`supabase/migrations/`

El proyecto utiliza Supabase para:

- Productos y variantes.
- Clientes.
- Pedidos.
- Costos.
- Precios.
- Proveedores.
- Seguimiento.
- Políticas mayoristas.
- Auditoría.
- Configuración comercial.

### Antes de modificar la base

1. Inspeccionar el esquema actual.
2. Consultar las migraciones existentes.
3. Revisar el historial remoto.
4. Identificar datos afectados.
5. Preparar una migración versionada.
6. Validar permisos y RLS.
7. Probar en un entorno seguro.
8. Aplicar únicamente cambios autorizados.
9. Comprobar el resultado.

No ejecutar nuevamente todas las migraciones históricas sobre una base existente.

No utilizar seeds antiguos para completar productos sin conocer su alcance.

### Protección de datos

Evitar eliminar:

- Pedidos.
- Ítems de pedidos.
- Pagos.
- Movimientos de inventario.
- Historiales de proveedores.
- Registros de auditoría.

La baja lógica debe preferirse a la eliminación física cuando sea suficiente.

---

## 14. Automatizaciones

El proyecto utiliza procesos alojados en Supabase y Vercel.

### Vercel

`vercel.json` define recorridos programados para:

- Correos.
- Sincronización de stock de proveedores.
- Precios mayoristas.

### Supabase

Existen funciones y trabajos asociados al seguimiento de proveedores.

La programación efectiva debe verificarse en producción.

No asumir que un archivo de configuración demuestra que todos los procesos están activos y funcionando.

### PC local

La PC del dueño no debe utilizarse como servidor permanente.

No instalar tareas automáticas de Windows, servicios o procesos persistentes sin autorización.

La herramienta local de proveedores está diseñada para ejecutarse manualmente.

---

## 15. Calidad y validación

Antes de publicar cambios importantes:

- Revisar código.
- Ejecutar TypeScript.
- Ejecutar ESLint.
- Ejecutar pruebas.
- Generar build.
- Comprobar las rutas afectadas.
- Verificar permisos.
- Probar navegación móvil y escritorio.
- Revisar precios y stock si el cambio afecta el comercio.

### Funcionalidades críticas

Requieren especial atención:

- Autenticación.
- Administración.
- RLS.
- Precios.
- Stock.
- Proveedores.
- Checkout.
- Pagos.
- Pedidos.
- Migraciones.
- Procesos automáticos.

No reemplazar pruebas reales por afirmaciones de éxito.

### Calidad visual

Los estándares de interfaz y validación responsive se encuentran en:

`design-qa.md`

---

## 16. Despliegue

La aplicación se aloja en Vercel y utiliza Supabase como backend.

### Flujo general

1. Completar los cambios autorizados.
2. Revisar el diff.
3. Ejecutar pruebas.
4. Validar el build.
5. Aplicar migraciones necesarias y autorizadas.
6. Comprobar compatibilidad entre código y base.
7. Realizar commit.
8. Realizar push.
9. Desplegar.
10. Verificar el dominio productivo.
11. Revisar errores y rutas afectadas.

No confundir:

- Código local.
- Commit.
- Push.
- Migración.
- Despliegue.
- Validación productiva.

Cada etapa debe confirmarse por separado.

El despliegue debe preservar la integridad de los pedidos y evitar interrupciones innecesarias.

### Estado documentado

El release del 07/11/2026 está registrado en:

`docs/RELEASE-FINAL-2026-11-07.md`

Ese documento describe el estado y las comprobaciones realizadas durante ese cierre.

No representa necesariamente el estado actual de todas las funcionalidades posteriores.

---

## 17. Documentación del proyecto

Para evitar duplicar instrucciones, la documentación se divide por responsabilidad.

| Archivo | Contenido |
|---|---|
| `README.md` | Introducción y puesta en marcha |
| `AGENTS.md` | Reglas obligatorias para agentes |
| `AI_CONTEXT.md` | Arquitectura y contexto comercial |
| `design-qa.md` | Calidad visual y UX |
| `mayorista-publico-plan.md` | Canal mayorista |
| `SEO_AUDIT.md` | SEO e indexación |
| `docs/suppliers/README.md` | Sistema de proveedores |
| `docs/USD-PROFITABILITY.md` | Rentabilidad |
| `docs/RELEASE-FINAL-2026-11-07.md` | Cierre productivo documentado |

Los informes históricos se conservan en `docs/`.

No convertir el README en un registro de todos los cambios realizados.

---

## 18. Principales objetivos de evolución

MYA busca avanzar hacia una operación comercial cada vez más automatizada.

### Catálogo

- Mayor calidad de fichas.
- Menos duplicados.
- Identidades verificadas.
- Disponibilidad actualizada.
- Archivo y recuperación de productos agotados.

### Proveedores

- Descubrimiento amplio.
- Verificación confiable.
- Comparación multiproveedor.
- Clasificación de oportunidades relevantes.
- Menor intervención manual.

### Rentabilidad

- Precios USD coherentes.
- Costos completos.
- Márgenes controlados.
- Alertas de inconsistencias.
- Protección frente a variaciones cambiarias.

### Mayorista

- Catálogo público competitivo.
- Mejor experiencia para revendedores.
- Herramientas de cotización.
- Compras recurrentes.
- Nuevas oportunidades de integración B2B.

### Experiencia de usuario

- Mejor navegación.
- Menos fricción.
- Diseño profesional.
- Rendimiento móvil.
- SEO nacional.
- Mayor conversión.

Estos objetivos no deben presentarse automáticamente como funcionalidades ya completas.

---

## 19. Estado actual y limitaciones

MYA es un sistema comercial activo y en evolución.

La base de productos y las condiciones de los proveedores cambian continuamente.

Las cifras históricas de productos, marcas, stock o URLs no deben utilizarse como si fueran permanentes.

Al iniciar una auditoría o modificación crítica, verificar:

- Commit y despliegue vigente.
- Datos actuales de Supabase.
- Proveedores autorizados.
- Políticas de precios.
- Disponibilidad.
- Estado del checkout.
- Automatizaciones.
- Permisos.
- Errores relevantes.

### Regla de mantenimiento

Actualizar este README únicamente cuando cambien:

- Descripción general del producto.
- Tecnologías principales.
- Estructura del proyecto.
- Procedimiento de instalación.
- Comandos.
- Arquitectura de alto nivel.
- Servicios e integraciones.
- Documentación de referencia.

Los detalles de cada corrección deben almacenarse en sus informes técnicos correspondientes.

---

## 20. Principio final

MYA Importaciones combina comercio electrónico, administración comercial, gestión de proveedores y automatización.

Su objetivo no es simplemente acumular productos en una tienda.

**El objetivo es ofrecer productos confiables, con precios rentables y disponibilidad verificable, mediante una experiencia de compra profesional para clientes minoristas y mayoristas de toda Argentina.**

La evolución del sistema debe priorizar seguridad, rentabilidad, calidad del catálogo y facilidad de uso.