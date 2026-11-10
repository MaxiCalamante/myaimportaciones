# MYA Importaciones — Canal Mayorista Público

> Documento funcional y técnico del canal mayorista de MYA Importaciones.
>
> Última revisión: 10/11/2026.
>
> Estado: canal implementado, con mejoras y validaciones operativas pendientes.
>
> Reglas generales del proyecto: `AGENTS.md`.
> Arquitectura y contexto: `AI_CONTEXT.md`.
> Calidad visual: `design-qa.md`.

---

## 1. Objetivo del canal mayorista

El canal mayorista de MYA Importaciones busca facilitar la compra y reventa de productos importados en Argentina.

Está dirigido a:

- Comerciantes.
- Emprendedores.
- Revendedores.
- Profesionales.
- Tiendas físicas.
- Tiendas online.
- Negocios que necesitan abastecimiento recurrente.

El objetivo es que cualquier interesado pueda explorar productos, conocer precios mayoristas y evaluar una compra sin atravesar procesos de aprobación comercial innecesarios.

### Principio principal

**El catálogo mayorista es público; los costos de adquisición y la información privada de proveedores no lo son.**

El canal debe ser fácil de consultar, competitivo y rentable para MYA.

---

## 2. Acceso público

Ruta principal:

`https://myaimportaciones.com/mayorista`

### Funcionamiento esperado

Los visitantes deben poder:

1. Acceder sin iniciar sesión.
2. Explorar productos mayoristas.
3. Buscar por nombre o marca.
4. Filtrar por categoría.
5. Consultar precios.
6. Conocer cantidades mínimas.
7. Combinar productos cuando las reglas lo permitan.
8. Solicitar una cotización o iniciar una compra por los recorridos habilitados.

La navegación pública no debe exigir una aprobación previa de revendedor.

### Seguridad

La apertura del catálogo no habilita:

- Acceso administrativo.
- Consulta de costos internos.
- Lectura de ofertas privadas.
- Modificación de precios.
- Acceso a datos comerciales de otros clientes.

Los permisos deben permanecer protegidos mediante los controles de autenticación y RLS existentes.

---

## 3. Modelo de venta mayorista

MYA trabaja principalmente mediante abastecimiento bajo pedido.

No todos los productos publicados corresponden a mercadería físicamente almacenada por MYA.

### Flujo comercial

1. El cliente consulta el catálogo mayorista.
2. Selecciona productos y cantidades.
3. Se verifica el cumplimiento de las condiciones comerciales.
4. Se revalidan disponibilidad y precios.
5. Se genera el pedido o la solicitud correspondiente.
6. Se confirma el pago mediante un mecanismo confiable.
7. MYA gestiona el abastecimiento.
8. Se coordina el transporte y la entrega.

Los procesos de compra y confirmación deben respetar el estado comercial real de cada producto.

No confundir una solicitud de presupuesto con un pedido pagado.

No confundir disponibilidad de proveedor con stock físico.

---

## 4. Proveedores autorizados

Los únicos proveedores operativos son:

| Proveedor | Especialidad |
|---|---|
| Atacado Connect | Electrónica y tecnología |
| Atacado USA | Cosmética y perfumería |
| Star Company | Cosmética y perfumería |
| Total Herramientas Oficial | Herramientas y equipamiento |

Las fuentes anteriores permanecen archivadas.

No reactivarlas automáticamente.

El canal mayorista utiliza el catálogo de MYA, no publica directamente todas las referencias descubiertas por estos proveedores.

Los productos deben superar los controles de identidad, disponibilidad, precio y elegibilidad correspondientes.

---

## 5. Condiciones mínimas mayoristas

La configuración vigente de Supabase establece:

**Mínimo de compra: cinco unidades combinables O $100.000 ARS en productos.**

Alcanza con cumplir cualquiera de las dos condiciones.

Ejemplos:

- Cinco productos de distintas marcas: puede cumplir por unidades.
- Un producto de valor superior a $100.000: puede cumplir por importe.
- Dos unidades con un total inferior a $100.000: no cumple el mínimo general.

Los mínimos específicos por producto o variante deben interpretarse y validarse separadamente.

### Configuración

Tabla:

`wholesale_v2_policies`

Campos de política relevantes:

- `minUnits`
- `minAmountArs`
- `confirmed`
- `autoUpdate`
- `quantityMargins`
- `paymentFees`
- `transferDiscountPercent`

No duplicar los valores en componentes cuando ya existe una fuente de configuración.

El panel administrativo y las consultas públicas deben respetar la política vigente.

---

## 6. Política de rentabilidad

La política mayorista vigente fue actualizada el 08/11/2026.

### Márgenes

| Concepto | Valor |
|---|---:|
| Objetivo general mayorista | 18% |
| Margen mínimo mayorista | 10% |
| Objetivo minorista de referencia | 30% |

Los porcentajes representan márgenes sobre el precio de venta y no recargos sobre el costo.

### Escalas por cantidad

La configuración actual incluye:

| Cantidad | Margen objetivo |
|---|---:|
| Menos de 12 unidades | 18% |
| Desde 12 unidades | 15% |
| Desde 24 unidades | 13% |

Estas escalas no representan descuentos directos equivalentes sobre el precio final.

El motor debe calcular el precio correspondiente y respetar el margen mínimo efectivo, las comisiones y las demás condiciones.

No aplicar una escala si produce pérdida.

### Medios de pago

La configuración mayorista actual contempla:

- Mercado Pago: comisión de referencia del 6%.
- Transferencia: comisión de referencia del 0%.
- Descuento por transferencia configurado: 3%.

Las comisiones deben interpretarse dentro del motor económico y verificarse contra las condiciones reales de cobro.

El descuento por transferencia no puede reducir la contribución por debajo del piso permitido.

### Configuración actual

La política registra:

- `confirmed: true`
- `autoUpdate: true`
- `targetMarginPercent: 18`
- `minimumMarginPercent: 10`
- `costValidityHours: 72`
- `maxPriceChangePercent: 35`

Estos parámetros habilitan determinados recorridos de actualización, pero no demuestran por sí solos que todas las publicaciones tengan precios correctos.

La política de rentabilidad general conserva sus propios controles y un estado de aplicación que debe comprobarse antes de afirmar que existen bloqueos productivos completos.

---

## 7. Cálculo de precios mayoristas

El precio mayorista debe calcularse utilizando costos completos y verificables.

### Componentes económicos

Considerar:

- Precio de adquisición del proveedor.
- Moneda de origen.
- Costo de compra de USD/USDT.
- Comisión del pasador.
- Transporte.
- Costos de importación.
- Gastos variables atribuibles.
- Comisiones de pago.
- Margen comercial.

No calcular el precio mayorista únicamente aplicando un porcentaje sobre el costo publicado en Paraguay.

### Reglas

1. Utilizar el motor de precios existente.
2. Mantener precisión decimal.
3. Conservar evidencia de costos.
4. Separar moneda de origen, USD y ARS.
5. Validar antigüedad de cotizaciones.
6. Respetar precios manuales autorizados.
7. No generar precios ficticios.
8. Bloquear ajustes automáticos económicamente inválidos.
9. Registrar cambios relevantes.
10. Revalidar el importe antes de aceptar la operación.

### Datos incompletos

Si falta información necesaria:

- No fabricar costos.
- No suponer disponibilidad.
- No generar una cotización definitiva sin respaldo.
- Marcar el producto para revisión.
- Ofrecer un recorrido de consulta cuando corresponda.
- No modificar el precio minorista por un problema exclusivo del mayorista.

---

## 8. Catálogo mayorista

El catálogo mayorista comparte las entidades comerciales principales con el minorista, pero aplica condiciones y precios propios.

### Entidades

- `products`
- `product_variants`
- `categories`
- `supplier_offers`
- `product_costs`
- `product_usd_prices`
- `wholesale_product_controls`
- `wholesale_variant_costs`
- `wholesale_price_events`

### Presentación

Cada artículo debe tener:

- Nombre claro.
- Marca.
- Imagen correcta.
- Presentación exacta.
- Categoría.
- Precio mayorista válido.
- Condiciones de cantidad.
- Disponibilidad.
- Acceso a la ficha.

### Selección comercial

Priorizar productos con potencial de reventa.

Especial atención a:

- Cosmética coreana.
- Sérums y cremas.
- Limpiadores y tónicos.
- Perfumería.
- Cuidado capilar.
- Electrónica de consumo.
- Herramientas.
- Equipamiento profesional.

El catálogo mayorista no debe llenarse indiscriminadamente de productos descubiertos por el rastreador.

El sistema de Oportunidades debe actuar como filtro previo de calidad y viabilidad comercial.

---

## 9. Disponibilidad y sincronización

El canal mayorista debe trabajar con la disponibilidad comercial verificada.

### Reglas

- No considerar `stock = 0` como agotamiento si el producto se abastece por proveedor.
- Verificar que el proveedor esté autorizado.
- Comprobar la identidad exacta de producto y variante.
- Utilizar evidencia reciente.
- No vender productos agotados.
- No presentar estados desconocidos como stock confirmado.
- Revalidar antes de generar un pedido definitivo.

### Agotamiento

La política comercial objetivo establece que un producto sin stock confirmado en todos sus proveedores válidos debe retirarse del catálogo público.

Después de siete días consecutivos de agotamiento confirmado puede archivarse lógicamente.

Si recupera disponibilidad, vuelve a ser candidato para revisión comercial.

La implementación de esta política debe coordinarse con el sistema general descrito en `AGENTS.md`.

No eliminar registros históricos.

### Incidencias técnicas

Un error del scraper, timeout o cambio de URL no equivale a agotamiento confirmado.

Distinguir:

- Agotado.
- Desconocido.
- Verificación vencida.
- Error de proveedor.
- Identidad incompatible.

No vaciar masivamente el catálogo por un problema general de sincronización.

---

## 10. Carrito y checkout mayorista

La implementación dispone de recorridos de carrito, solicitudes y órdenes mayoristas.

### Componentes y funciones relevantes

- `CheckoutPanel`
- `create_wholesale_order_v1`
- `create_wholesale_request_v1`
- `wholesale_public_policy_v1`
- `wholesale_public_offers_v1`

Consultar las firmas y versiones reales antes de modificar estas funciones.

### Validaciones

El checkout mayorista debe comprobar:

1. Productos vigentes.
2. Identidad de variantes.
3. Cantidad.
4. Cumplimiento de mínimos.
5. Disponibilidad.
6. Precio.
7. Costos.
8. Margen.
9. Medio de pago.
10. Importe total.
11. Integridad de la orden.

Cuando los datos necesarios no estén confirmados, el sistema debe utilizar un recorrido de solicitud o revisión en lugar de fabricar una operación definitiva.

### Pagos

La creación de una solicitud no constituye un cobro confirmado.

Mercado Pago y transferencias requieren sus verificaciones correspondientes.

No crear pedidos pagados ficticios para comprobar funcionalidades.

---

## 11. Panel de administración mayorista

Rutas relevantes:

- `/admin/mayoristas`
- `/admin/costos`
- `/admin/precios`
- `/admin/oportunidades`
- `/admin/proveedores/rastreador`

### Funciones esperadas

Los administradores deben poder:

- Consultar productos mayoristas.
- Revisar costos.
- Ver márgenes.
- Detectar precios problemáticos.
- Controlar cantidades mínimas.
- Gestionar políticas.
- Consultar historial de actualizaciones.
- Analizar oportunidades.
- Identificar productos sin disponibilidad.
- Revisar solicitudes y órdenes.

### Automatización

Existen componentes y funciones de actualización mayorista, incluyendo:

`refresh_wholesale_prices_v1`

La automatización debe reutilizar los procesos alojados existentes.

No instalar servicios ni tareas periódicas en la PC del dueño.

No sobrescribir ediciones manuales válidas ni actualizar precios sin datos confiables.

---

## 12. Experiencia de usuario

La página mayorista debe mantener la identidad de MYA:

- Diseño limpio.
- Precios legibles.
- Imágenes correctas.
- Navegación clara.
- Buscador funcional.
- Categorías organizadas.
- Buena experiencia móvil.
- Acceso directo a consultas.
- Información comprensible sobre mínimos.

### Prohibiciones visuales

No volver a incorporar packs de inicio obligatorios que bloqueen el acceso al catálogo.

No mostrar precios ficticios.

No presentar como disponible un producto agotado.

No utilizar imágenes genéricas cuando existan fotografías correctas.

No esconder las condiciones comerciales relevantes.

### Responsive

Probar en móviles pequeños, móviles habituales, tablets y escritorio.

Consultar los criterios de `design-qa.md`.

---

## 13. Seguridad

Los precios públicos son diferentes de los costos internos.

La información privada nunca debe incluirse en respuestas públicas.

### Proteger especialmente

- Costos de proveedor.
- Costos de importación.
- Cotizaciones internas de adquisición.
- Márgenes internos.
- Historial de ofertas.
- Documentación administrativa.
- Datos de compradores.
- Información de pagos.

Las operaciones de administración deben exigir permisos correctos.

No desactivar RLS para resolver errores.

Los RPC de órdenes y precios deben validar cantidades, usuarios y datos comerciales en el servidor.

---

## 14. Estado técnico verificado

### Implementación histórica del 02/11/2026

El desarrollo original documentó como completados:

- Catálogo mayorista público.
- Landing mayorista.
- Filtros y búsqueda.
- Política configurable.
- Carrito mayorista.
- Checkout con validaciones.
- Solicitudes mayoristas.
- Administración.
- Control de costos.
- Motor de actualización de precios.
- Migraciones SQL.
- Pruebas automatizadas.
- Compilación de producción.

Estas afirmaciones corresponden al cierre documentado de esa implementación.

No deben interpretarse automáticamente como una nueva validación integral al 10/11/2026.

### Verificación de Supabase del 10/11/2026

Se comprobó la existencia de:

- `wholesale_v2_policies`
- `wholesale_product_controls`
- `wholesale_variant_costs`
- `wholesale_price_events`
- `wholesale_checkout_requests`
- `order_wholesale_snapshots`

También se encontraron las funciones:

- `create_wholesale_order_v1`
- `create_wholesale_request_v1`
- `refresh_wholesale_prices_v1`
- `wholesale_public_policy_v1`
- `wholesale_public_offers_v1`

La política más reciente corresponde al 08/11/2026 y contiene las condiciones comerciales descriptas en este documento.

El catálogo de Supabase observado en esta revisión tenía 1.130 registros de productos, de los cuales 283 estaban activos, sin eliminación ni archivo comercial.

Esta cifra no demuestra por sí sola que todos aparezcan en la web ni que sean cotizables como mayoristas.

Las cantidades son dinámicas y deben comprobarse nuevamente en cada auditoría.

---

## 15. Problemas y verificaciones pendientes

### Alta prioridad

**1. Rentabilidad**

Revisar los productos con precios inferiores a sus costos registrados.

Validar el cálculo final por medio de pago y cantidad.

**2. Disponibilidad**

Garantizar que los productos no disponibles no permanezcan comprables desde el canal mayorista.

**3. Sincronización**

Revisar la vigencia de la evidencia de proveedores y precios.

**4. Consistencia comercial**

Comprobar que catálogo, ficha, carrito y checkout devuelvan condiciones compatibles.

**5. Elegibilidad**

Verificar que productos sin identidad o costos suficientes no reciban cotizaciones definitivas.

### Prioridad media

- Normalizar marcas.
- Revisar imágenes y presentaciones.
- Evitar duplicados.
- Mejorar recomendaciones mayoristas.
- Optimizar filtros.
- Mejorar informes comerciales.
- Revisar comunicación de mínimos y escalas.

### Oportunidades futuras

Evaluar comercialmente:

- Combos para emprendedores.
- Compras recurrentes.
- Cotizaciones personalizadas.
- Condiciones especiales para profesionales.
- Modalidades de abastecimiento directo a clientes de revendedores.
- Exportación de catálogos.
- Integraciones B2B.

Estas oportunidades no equivalen a funcionalidades ya implementadas.

---

## 16. Pruebas y criterios de aceptación

Antes de dar por finalizado un cambio importante del canal mayorista, comprobar:

- Acceso sin cuenta.
- Carga del catálogo.
- Búsqueda.
- Filtros.
- Precios correctos.
- Mínimos combinados.
- Reglas por cantidad.
- Descuento por transferencia.
- Comisión de Mercado Pago.
- Variantes.
- Disponibilidad.
- Productos agotados.
- Solicitudes.
- Creación de órdenes.
- Validación de pagos.
- Protección de datos privados.
- Diseño móvil.
- Regresión del catálogo minorista.

### Validaciones técnicas

Ejecutar las pruebas relevantes:

```bash
npm run lint
npm run type-check
npm test
npm run build
```

Complementarlas con verificaciones de PostgreSQL y pruebas de navegación cuando corresponda.

No realizar compras reales en producción como parte de pruebas.

No declarar una funcionalidad como verificada en producción basándose únicamente en la existencia de código o en pruebas locales.

---

## 17. Despliegue y mantenimiento

La publicación del canal mayorista debe coordinar correctamente:

- Código Next.js.
- Migraciones de Supabase.
- Funciones RPC.
- Procesos de actualización.
- Configuración de Vercel.
- Permisos.
- Políticas comerciales.

La bandera `WHOLESALE_ENABLED` depende de la configuración efectiva de la aplicación.

No inferir su estado productivo solamente por la existencia de la constante en el código.

### Después de un cambio relevante

1. Validar funcionamiento local.
2. Revisar los cambios de esquema.
3. Comprobar precios y reglas comerciales.
4. Verificar permisos.
5. Ejecutar pruebas.
6. Desplegar cuando esté autorizado.
7. Revisar la web productiva.
8. Actualizar este documento si cambia una decisión permanente.

No incorporar aquí un diario extenso de cada desarrollo.

Los informes de implementación y evidencia deben conservarse en `docs/`.

---

## 18. Referencias

- `AGENTS.md`
- `AI_CONTEXT.md`
- `design-qa.md`
- `docs/RELEASE-FINAL-2026-11-07.md`
- `docs/USD-PROFITABILITY.md`
- `docs/POST-AUDIT-2026-11-06.md`
- `docs/suppliers/README.md`

Evidencia privada del desarrollo original:

`scratch/suppliers-private/wholesale-2026-11-02/`

No incorporar información privada de esa carpeta al repositorio público.

---

## 19. Principio final

El canal mayorista de MYA debe facilitar que un emprendedor o comerciante pueda encontrar productos, consultar precios y abastecerse con confianza.

El objetivo no es ofrecer indiscriminadamente el precio más bajo.

**El objetivo es ofrecer condiciones competitivas, proteger la rentabilidad de MYA y construir relaciones comerciales sostenibles con los revendedores.**

Un catálogo público amplio es útil únicamente cuando los productos son confiables, están correctamente identificados y pueden venderse con márgenes saludables.