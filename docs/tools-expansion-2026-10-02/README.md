# Ampliación de herramientas — 02/10/2026

Se revisaron 46 candidatos adicionales por utilidad para obra, colocación de revestimientos, taller, mantenimiento del hogar y limpieza automotor. Se publicaron cinco modelos con cotización directa disponible, composición comprobada y referencia argentina de Mercado Libre suficiente. El dueño autorizó publicarlos con los gastos de transporte aún pendientes y eligió precios 10% debajo de ML.

| Modelo | Producto | Precio MYA ARS | Referencia ML ARS |
|---|---|---:|---:|
| TAPLI2015 | Pulidora Total 20V, 150 mm; sin batería ni cargador | 207.000 | 230.000 |
| TOPLI202548 | Lustradora orbital Total 20V, 254 mm; sin batería ni cargador | 152.100 | 169.000 |
| THT571001 | Cortadora manual de cerámicos Total, 1.000 mm | 240.100 | 266.849,30 |
| TLL3012165 | Nivel láser Total 20V, 12 líneas, 35 m; dos baterías y cargador | 405.000 | 450.000 |
| TH217068 | Martillo demoledor Total, 1.700 W, 50 J; cincel y maletín | 539.100 | 599.000 |

Referencias consultadas el 02/10/2026:

- [Pulidora TAPLI2015 — publicación identificada en listado ML](https://listado.mercadolibre.com.ar/pulidora-orbital-auto).
- [Lustradora TOPLI202548 — ficha ML](https://www.mercadolibre.com.ar/lustra-pulidora-de-auto-orbital-inalambrica-total-20v-motor-sin-carbones-10-pulgadas-254mm-no-incluye-bateria-ni-cargador-topli202548/p/MLA53771823).
- [Cortadora THT571001 — ficha ML](https://www.mercadolibre.com.ar/cortadora-ceramica-porcelanato-azulejos-total-1000mm-cortes-super-precisos/p/MLA44959650).
- [Nivel TLL3012165 — publicación identificada en listado ML](https://listado.mercadolibre.com.ar/nivel-l%C3%A1ser-total-360).
- [Demoledor TH217068 — publicación identificada en listado ML](https://listado.mercadolibre.com.ar/martillo-demoledor-total-1700w).

Precios: referencia ×0,90, redondeada hacia abajo a ARS100. Se compararon los mismos modelos y kits, distinguiendo baterías/cargador incluidos. La evidencia ML proviene de resultados indexados: puede tener demora y no certifica el mínimo absoluto del mercado ni equivalencia de envío o financiación.

Cada ficha incluye descripción de uso, alimentación, capacidades, accesorios, exclusiones del kit, imágenes de la ficha del modelo y consulta de garantía/posventa. No se inventó duración de garantía oficial. Disponibilidad del proveedor sujeta a reconfirmación; stock propio sin verificar.

## Verificación

- Inserción transaccional de cinco productos y sus registros privados de costos.
- Base: 215 → 220 productos; los 215 originales quedaron iguales.
- Cinco rutas de producción HTTP 200, con SKU y precio correctos en Product JSON-LD.
- Seis fotos descargadas y decodificadas correctamente, con lado mayor de al menos 1.024 px.
- Revisión visual de las fichas del nivel láser y cortadora; imagen ampliable disponible. Evidencia de escritorio guardada localmente.
- Lint de scripts TypeScript y compilación de scripts Python aprobados. No se modificó ni desplegó código de aplicación para esta ampliación.

## Casos pendientes

Los otros 41 candidatos no se añadieron: falta una referencia ML argentina del modelo/kit exacto, no tienen disponibilidad/cotización actual, hay discrepancias técnicas o la diferencia antes de gastos resulta insuficiente. Hidrolavadoras grandes, mezcladoras, generadores y otros equipos pesados requieren completar esa evidencia. Las aspiradoras Wadfow de 30 y 35 litros ya estaban publicadas; no se duplicaron. Los distanciómetros existentes de 35 y 85 metros complementan el nivel nuevo, que proyecta referencias y no mide longitudes.

Los respaldos de compra, fuentes mayoristas, notas de gastos desconocidos y payload SQL se mantienen en archivos privados ignorados por Git. Flete, internación, comisiones y gastos variables siguen pendientes: la diferencia venta−compra no representa ganancia neta ni garantiza cubrir el transporte.

La verificación reproducible está en `verification.json`. Los scripts preparan datos y revisan evidencia; el SQL se aplicó una sola vez. No volver a ejecutar la inserción sobre la misma selección.
