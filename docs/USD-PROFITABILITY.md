# Rentabilidad USD — propuesta local, 06/11/2026

Estado: implementación y validación local. **Sin migraciones, precios, bloqueos, deploy, cron, commit ni push en producción.**

La instrucción del dueño fija objetivos de contribución del **30% minorista**, **18% mayorista** y **piso absoluto 10%**. Sustituye, para este recorrido nuevo, la conservación automática del margen histórico. No autoriza convertir el catálogo ni activar protecciones comerciales reales.

## Cálculo único

`public.store_profitability_v2(jsonb)` es el motor financiero. PostgreSQL `numeric` realiza las operaciones; devuelve importes como cadenas decimales. TypeScript presenta resultados y distribuye descuentos en centavos enteros, sin duplicar la fórmula de rentabilidad.

Para ingreso bruto sin IVA y porcentajes sobre el cobro:

`precio = (adquisición + gastos variables + cargos fijos por operación) / (1 - margen objetivo - comisiones - otros cargos porcentuales)`.

Para precio que incluye IVA, con costos en la misma base neta confirmada:

`a = 1 / (1 + IVA/100)`

`precio = (costos + cargos fijos) / [a × (1 - margen/100 - comisión sobre neto/100) - comisión sobre bruto/100]`.

El IVA se excluye del ingreso una sola vez. Las comisiones pueden utilizar bruto o neto según la tarifa documentada. Los costos deben excluir tributos recuperables en la base neta; no se presupone la situación fiscal de MYA. Sin confirmación contable, se requiere revisión.

Los tramos de comisión deben cubrir el rango de importes sin superponerse. Se resuelve el precio dentro de cada tramo y se valida el tramo del importe efectivo. Se distingue redondeo de comisión exacto de redondeo hacia arriba al centavo ARS. Los cargos fijos se aplican una vez por operación. Después del redondeo USD y ARS se recalcula la contribución efectiva, del conjunto y de cada línea con gastos de operación repartidos por ingreso cobrado.

Ejemplos con **USD 100 de costo directo total y comisión cero expresamente confirmada**, sin otros cargos:

| Canal | Cálculo | Precio propuesto | Margen efectivo aproximado |
|---|---|---:|---:|
| Minorista | 100 / 0,70 | USD 142,86 | 30,0014% |
| Mayorista | 100 / 0,82 | USD 121,96 | 18,0059% |
| Piso | 100 / 0,90 | USD 111,12 | 10,0072% |

USD 130 sobre costo 100 produce 23,0769% de margen: no cumple el objetivo minorista aunque respeta el piso. Con USD 2 fijos y comisión 5%, el minorista requiere `(100 + 2) / 0,65`, redondeado a **USD 156,93**.

## Configuración y datos privados

`store_profitability_policy`: objetivos, mínimo, paso USD (`0.01`, `0.5`, `1`), vigencia del costo, comisiones documentadas por medio de pago, versión y autor. Se instala en **preview**, con ambas comisiones **sin confirmar**. Guardar la propuesta administrativa no cambia el modo a `enforce`. No existen excepciones automáticas al 10%.

`store_profitability_profiles`: producto/variante exactos, desglose, oferta vinculada, revisión, autor y fecha. No se hereda el costo del padre a una variante. Guardar un perfil no modifica el precio ni inventario. Las revisiones evitan sobrescribir ediciones concurrentes.

`product_usd_prices`: conserva los precios USD independientes y respaldo ARS anterior; agrega adquisición, costo directo total, mínimo, márgenes efectivos, clasificación, fuente y snapshot privado. El snapshot contiene resultados por canal y medio de pago. Un precio manual se conserva y se marca para revisión si el nuevo costo vuelve insegura su venta.

`store_checkout_quotes`: agrega snapshot de rentabilidad con versión de política y revisiones/hashes de costo. El servidor registra el reparto explícito del descuento, importe cobrado, medio y tasa. Al aceptar vuelve a verificar; un cambio de costo o comisión invalida la cotización pendiente. Los pedidos ya aceptados conservan importes y tasa; los reintentos no reservan dos veces.

Las tablas nuevas no conceden lectura pública. Las RPC administrativas verifican `is_admin()`. La validación del checkout y el refresco requieren `service_role`. Costos, documentos y URLs de proveedor permanecen privados.

`store_profitability_offer_costs` permite revisar costos propios de ofertas alternativas sin cambiar el proveedor preferido. `save_store_offer_profitability_v2` valida identidad, moneda, importe, documento y revisión. El comparador existente utiliza el motor central, compara costo directo total y excluye ofertas con cargos, vigencia o rentabilidad pendientes. Una recomendación no ejecuta el cambio de proveedor.

Ejemplo **didáctico** de perfil, que debe reemplazarse con evidencia real antes de guardarlo:

```json
{
  "status": "COSTO_VERIFICADO",
  "identityVerified": true,
  "costsComplete": true,
  "accountingConfirmed": true,
  "accountingBasis": "gross_no_vat",
  "settlementBasis": "usd",
  "settlementDocument": "Adquisición efectivamente imputada a saldo USD documentado",
  "document": "Factura exacta y confirmación de todos los gastos aplicables",
  "currency": "USD",
  "origin": "100",
  "unitsPerUsd": "1",
  "fxSource": "Moneda USD explícita en factura",
  "fxAt": "FECHA_ISO_REAL",
  "checkedAt": "FECHA_ISO_REAL",
  "offerId": "UUID_OFERTA_EXACTA_SI_ABASTECE_UN_PROVEEDOR",
  "supplierUrl": "URL_PRIVADA_EXACTA",
  "carrier": {
    "kind": "percent",
    "percent": "20",
    "confirmed": true,
    "reduced": false,
    "document": "Tarifa confirmada para esta operación",
    "validUntil": "VENCIMIENTO_ISO_REAL"
  },
  "components": [
    {"id":"flete-py","group":"acquisition","amountUsd":"5","document":"Flete por unidad documentado"},
    {"id":"embalaje","group":"sale","amountUsd":"1","document":"Embalaje por unidad documentado"}
  ]
}
```

Las comisiones se configuran aparte, **nunca dentro de `components`**. Cada componente lleva ID único. Los gastos compartidos requieren `shared: true`, `allocationPolicy` y `allocationDocument`; el importe debe ser la parte asignada por unidad, no el total del embarque. Los gastos generales `group: "overhead"` permanecen separados y sólo se imputan con `allocated: true` y política explícita.

En cantidades de una misma presentación, el redondeo respeta el paso del precio **por unidad**: diez unidades de costo USD 10, cargo fijo de operación USD 5 y objetivo 18% requieren USD 12,81 por unidad, USD 128,10 en total. El cargo de USD 5 no se cobra diez veces.

La reducción de pasador exige `reduced: true`, porcentaje confirmado, `thresholdUsd` y `procurement` con ID, documento, confirmación y valor de mercadería de la operación real **estrictamente mayor** al umbral. No se consulta el importe ni la cantidad del carrito para dar ese beneficio. Las tarifas fijas por producto se expresan como `kind: "fixed", unitUsd`; no se les suma además un porcentaje.

Adquisición y pasador pueden tener tipos de cambio diferentes, documentados. `settlementArsPerUsd`, `fxAt`, `fxSource` del pasador y `acquisitionArsPerUsd` de adquisición permiten convertir ese cargo a USD sin adoptar ARS 1.600 como cotización actual. Monedas de origen: USD, ARS, PYG, BRL, siempre con conversión propia documentada.

La forma de imputar la adquisición también es obligatoria: `settlementBasis: "usd"` requiere prueba de imputación a saldo USD; `"ars_cash"` exige `cashCostArs`, `acquisitionArsPerUsd`, `acquisitionAt` y documento, conciliados con el costo de adquisición. No se presume que el dólar de venta sea el de compra. Los componentes variables pagados en pesos pueden registrar `cashArs` documentado además de su referencia USD. El checkout utiliza el gasto ARS real y la tasa congelada de la cotización para comprobar la contribución.

Ejemplo de riesgo probado: costo de adquisición USD 100 imputado a ARS 150.000, precio USD 120. A dólar público 1.500 cumple el piso; si baja a 1.000 el cobro sería ARS 120.000 y el margen resulta **−25%**. Se bloquea/revisa esa operación; el refresco no reescribe la base USD por el solo cambio de la cotización pública.

Tarifa de cobro de ejemplo **para pruebas**, no valor comercial autorizado:

```json
{
  "transferencia": {
    "confirmed": true,
    "document": "Tarifa real confirmada para este medio",
    "validUntil": "VENCIMIENTO_ISO_REAL",
    "rounding": "ceil_cent_ars",
    "tiers": [{"minUsd":"0","maxUsd":null,"percentGross":"0","percentNet":"0","fixedUsd":"0","fixedArs":"0"}]
  },
  "mercado_pago": {"confirmed": false}
}
```

El 0% requiere evidencia y confirmación igual que cualquier otro valor. No hay comisión 0% por omisión. Cuotas u otros cargos dependientes del importe deben estar incluidos en la tarifa elegida; configuraciones desconocidas se rechazan.

## Integración y reglas anteriores

- Editor `/admin/moneda`: muestra política, precio automático, costo total, margen del precio manual, mínimo, diferencia y riesgo por medio de cobro. Permite guardar un desglose documentado por identidad y motivos auditados. La configuración avanzada usa JSON explícito para no ocultar tramos ni condiciones.
- Rastreador: nuevo costo observado permanece como evidencia privada. El refresco usa el mismo motor y protege las fuentes pausadas y la identidad. El modo preview sólo devuelve propuestas. No cambia de proveedor por ser más barato en el listado; una oferta alternativa sin su costo total y disponibilidad confirmados requiere revisión.
- Motor local histórico de conservación de margen: su RPC queda redirigida a la validación USD al instalar la integración; el cliente detecta la nueva política. No tiene un camino alternativo para saltarse el piso.
- Checkout: valida descuentos asignados por línea y comisiones del medio elegido. Cupones de envío reducen envío; no se reparten sobre productos excluidos. Combos exigen costo conocido de todos sus componentes.
- El mínimo mayorista de $100.000 **o** 5 unidades, combinables, conserva su función de elegibilidad. No equivale al umbral del pasador ni autoriza un margen inferior al 10%.
- Las reglas anteriores de comparables y preservación de margen no justifican una actualización que incumpla la política nueva. No se ejecutaron cambios comerciales para reemplazarlas en producción.

## Impacto medido, sólo lectura

Instantánea: `2026-11-06T21:40:30.814Z`. 943 productos, 204 variantes; 758 productos activos no eliminados. **0 bases USD y 0 perfiles v2 existentes**.

| Estado de costo | Productos activos | Identidades de venta activas |
|---|---:|---:|
| COSTO_VERIFICADO | 0 | 0 |
| COSTO_ESTIMADO | 0 | 0 |
| COSTO_DESACTUALIZADO | 164 | 164 |
| COSTO_INCOMPLETO | 151 | 124 |
| SIN_COSTO | 443 | 555 |
| REVISION_MANUAL | 0 | 0 |
| Total | 758 | 843 |

Las 843 identidades son productos simples y variantes activas; no se suma el padre con variantes como otra venta independiente. **0 actualizables automáticamente y 843 pendientes de revisión** bajo el contrato estricto. Activar ahora el bloqueo afectaría esas 843 identidades; **no se activó**. Las categorías son excluyentes; los motivos adicionales de revisión se guardan por identidad.

No se concluye que los 758 productos sean ventas a pérdida. Se concluye que faltan pruebas para afirmar rentabilidad con las reglas nuevas. Costos heredados, comisiones registradas en cero y precios aparentemente superiores a adquisición no son prueba suficiente.

Informe privado reproducible: `scratch/suppliers-private/profitability-impact-2026-11-06/impact.json`, `summary.json` y `manual-review.csv`. Ejecución: `node --env-file=.env.local --import tsx scripts/simulate-profitability-impact.mts`. El script sólo usa SELECT, no RPCs, migraciones ni actualizaciones de cotización.

## Migraciones preparadas y aprobación

1. `20261106154701_usd_base_pricing.sql`: instalación aditiva y reconciliación idempotente de objetos USD existentes. Se probó instalación limpia y dos reaplicaciones conservando datos y definiciones adaptadas. La reconciliación del historial remoto requiere revisión de firma/esquema antes de un `migration repair`; no se ejecutó ese comando.
2. `20261106212229_supplier_post_audit_controls.sql`: disponibilidad con proveedores válidos, pausa común, paginación y rutas.
3. `20261106213029_usd_contribution_policy.sql`: política preview, perfiles privados y motor decimal.
4. `20261106213412_usd_profitability_integration.sql`: editor, integración de cotizaciones, revisión de costos y refresco de proveedores.

Requieren aprobación previa al despliegue: base contable/IVA, tarifas reales de cobro y pasador, gastos y reparto, costos y precios concretos del lote inicial, reconciliación del historial de migraciones, plan de conversión, carga gradual de perfiles y alcance del bloqueo global. La aprobación debe incluir la lista privada de impacto, no un permiso genérico de actualizar todo.

No hay credenciales de prueba de Mercado Pago identificadas por prefijo TEST ni comprador sandbox configurado. No se utilizó la credencial real, no se generó un cobro ni se certificó pago/webhook externo. Las pruebas PostgreSQL de reserva, vencimiento, concurrencia e idempotencia son locales; las pruebas de interfaz usan respuestas controladas.

Rollback propuesto: mantener `preview`, deshabilitar ajustes nuevos y volver al frontend anterior si aparece un problema. Conservar las tablas/snapshots y órdenes aceptadas para auditoría; no borrar historia ni reconvertir pedidos. Los importes ARS anteriores siguen respaldados y las migraciones nuevas no los convierten masivamente.
