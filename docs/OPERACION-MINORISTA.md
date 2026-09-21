# Operación minorista — 20/09/2026

## Decisión vigente

Venta minorista. Canal mayorista conservado pero deshabilitado en `commerce-policy.ts`; `/mayorista` redirige al catálogo y servidor rechaza líneas mayoristas. Reactivarlo requiere revisar precios, mínimos, autorización y promociones, no solamente cambiar la bandera. Kits y asesor automático no se publican mientras no tengan selección exacta y condiciones comprobadas.

## Economía por producto

Dato aportado por el dueño: compra de una crema $21.000 + transporte $10.000; venta $54.900. Costo conocido $31.000; diferencia bruta $23.900, 43,53% sobre ventas y 77,10% sobre costo conocido. No identifica SKU ni fecha y no incluye embalaje, comisión, tributos, devoluciones, garantía o publicidad. Por eso es un ejemplo de simulación, no un costo asignado automáticamente al catálogo.

Regla implementada: costo puesto = origen × tipo de cambio real + transporte por unidad + otros costos de ingreso. Piso = (costo puesto + gastos variables + contribución mínima) / (1 − comisión porcentual). Comparación ML: rango entre 90% y 95% del precio comparable; sugerir 90% si cubre el piso, o el piso si permanece dentro del rango; si no, no recomendar ese precio. No llamar a esta contribución “ganancia neta”.

El panel **Costos reales** guarda moneda, cotización, flete, gastos, referencia del proveedor y comparación ML. No modifica precios públicos al guardar. Los descuentos del checkout usan una sola promoción y no atraviesan el piso registrado. Sin costo registrado/revisado en 30 días, no se otorgan promociones; si falta costo en una línea, se desactiva la promoción del pedido completo.

`costos-proveedores-pendientes.csv` incorpora los 75 cosméticos del archivo histórico con URL y costo USD originales, sin inventar fechas, tipo de cambio ni flete. No confundir existencias en Paraguay con inventario físico de MYA. El archivo histórico de 3.478 herramientas ya tiene PVP calculado y stock ficticio; no sirve como factura ni costo original. Recuperar cotizaciones originales por modelo antes de recalcularlas.

## Comparables de Mercado Libre

Comparar modelo/código, tamaño, cantidad, condición, vendedor, entrega nacional y precio final con envío. Excluir publicaciones internacionales, cuotas con distinta base y productos de otra presentación. Preferir tres referencias y guardar fecha y URL. Revisar cada semana los 20–40 SKU elegidos y ante cada reposición.

Consulta del 20/09/2026: los accesos directos a Atacado USA y Total tuvieron 403/timeout. Los resultados indexados muestran precios, pero no prueban costo actualizado. Un resultado de [Centella 55 ml](https://www.mercadolibre.com.ar/skin1004-centella-ampoule-serum-facial-hidratante-55ml-sensible-dianoche/p/MLA22328527) pertenece a Internacional: no se tomó como comparable nacional. No se importaron estos valores como precios vigentes. Proveedores: [Atacado USA](https://atacadousa.com.py/20-cosmeticos) y [Total herramientas](https://www.totalherramientasoficial.com.py/home).

## Rutina operativa

1. Seleccionar 20–40 productos con costo completo, documentos, ficha y stock comprobados. Registrar SKU exacto, proveedor y comprobante; prorratear flete del lote por peso/volumen o unidades equivalentes y dejar el criterio.
2. En **Inventario, fichas y reclamos**, verificar unidades realmente disponibles, peso, contenido/modelo, ingredientes/uso/precauciones o batería/accesorios/compatibilidad; registrar lote, vencimiento, responsable local y garantía respaldada. No modificar conteos con reservas pendientes.
3. Confirmar acreditación de transferencias en el medio de cobro. Nunca con una captura como única evidencia. Mercado Pago se confirma por webhook firmado y consulta al proveedor, no por la URL de regreso.
4. Revisar cada día pagos que requieren revisión y arrepentimientos. Un cobro tardío no vuelve a reservar stock automáticamente: resolver reposición o devolución antes de despachar. La constancia de arrepentimiento se muestra al cliente; el contacto posterior requiere operación humana.
5. Revisar entrega, faltantes y devoluciones. Conservar prueba de despacho y trazabilidad. No prometer garantía oficial, autenticidad o habilitaciones sin documentación.

## Marketing y métricas

Separar Belleza y Herramientas en campañas, mensajes y presupuesto. Preparar contenido con fotos propias y fichas verificadas: presentación/uso para belleza, modelo/accesorios/aplicación para herramientas. No publicar reseñas inventadas ni promesas médicas. Solicitar reseñas a compradores reales después de la entrega, con consentimiento para publicarlas.

Antes de invertir: costo de adquisición máximo = contribución del pedido después de producto, cobro, entrega y descuentos − contribución que se desea conservar. Con gastos desconocidos no hay presupuesto rentable calculable. Primer experimento: un grupo de SKU por rubro durante 14 días; medir pago aprobado, contribución, cancelaciones y entregas; ampliar sólo si cubre costos y cumple entregas. No se crearon campañas pagas ni mensajes a terceros.

El panel existente informa cobrado **entre los últimos 50 pedidos**, no ingresos históricos totales. El evento Purchase se dispara al consultar un pedido con pago confirmado, con deduplicación local por pedido y consentimiento. Esto no reemplaza la contabilidad ni garantiza atribución de todas las ventas; faltan conversiones servidor a servidor para quienes no vuelven al seguimiento. No usar esa métrica incompleta como único criterio de inversión. Revisar recompra a 30/60/90 días, stock sin ventas y devoluciones por rubro.

## Información real pendiente

Razón social, CUIT y domicilio comercial; documentos de importación/comercialización y trazabilidad por SKU; garantías comerciales específicas; costos totales, pesos y existencias físicas. No se pueden deducir de un precio de venta. El sistema permite registrarlos, pero no los presenta como confirmados.

Referencia de arrepentimiento: [Disposición 954/2025](https://www.argentina.gob.ar/normativa/nacional/norma-417152/texto), modificada por [Disposición 3/2026](https://www.argentina.gob.ar/normativa/nacional/disposici%C3%B3n-3-2026-423007/texto). Para cosméticos, revisar documentación aplicable con el responsable de la operación antes de activar ventas; este documento no certifica cumplimiento.
