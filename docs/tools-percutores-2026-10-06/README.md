# Taladros percutores y atornilladores — 06/10/2026

Pedido del dueño: completar distintas gamas de herramientas con las tres funciones (taladro, atornillador y percusión), después de aclarar que los atornilladores de impacto no resolvían esta selección.

| Gama publicada | Modelo | Torque | Kit | Precio ARS |
|---|---|---:|---|---:|
| Baja / entrada | TIDLI12206 | 20 Nm, 12V | Dos baterías de 1,5 Ah, carga USB-C, maletín y accesorios; sin cargador | 73.300 |
| Media | TIDLI20558 | 55 Nm, 20V, brushless | Dos baterías de 2 Ah, cargador 220–240V y accesorios | 166.900 |
| Profesional | TIDLI20668 | 66 Nm, 20V, brushless | Dos baterías de 2 Ah, cargador 220–240V y accesorios | 185.900 |

Se agregó el TIDLI12206 y se completaron título, descripción, especificaciones y etiquetas de los dos modelos de 20V ya publicados. Sus títulos antes no incluían «atornillador»; la búsqueda del catálogo consulta título/marca/modelo/SKU, por lo que quedaron ahora incluidos en las búsquedas de atornilladores. Los slugs y precios de los dos modelos existentes se conservaron. Las tres gamas se presentan según sus potencias reales, sin llamar al modelo de 66 Nm «el más potente de Total».

El modelo de entrada se cotizó con la política de 90% del comparable argentino exacto, redondeada hacia abajo a ARS100. [Mercado Libre](https://www.mercadolibre.com.ar/taladro-percutor-y-atornillador-inalambrico-total-12v-20nm-puerto-de-carga-usb-c-con-2-baterias-15ah-litio-ion-maletin-plastico-mechas-y-puntas-tidli12206/p/MLA61371984) mostró ARS81.500, Malvinas Herramientas, mismo kit, precio principal, verificado directamente en navegador. Se utilizó blue venta ARS1545/USD, [DolarAPI](https://dolarapi.com/v1/dolares/blue), actualizado 06/10/2026 15:51 UTC. La diferencia de entrada venta−compra es estrecha: ARS11.268,25 antes de flete, internación y comisiones. No se presenta como ganancia neta ni se infla el precio usando un comparable más caro.

## Industrial de mayor torque pendiente

Se revisaron 20 fichas actuales del mayorista. Los kits de 96 Nm TIDLI209681/685/686/687, 136 Nm TIDLI201368 y 166 Nm TIDLI201668 están agotados y sin precio. Las variantes más potentes con cargador de 110–120V no se presentaron como equivalentes a un kit de 220–240V. No se publicaron costos inventados ni disponibilidad falsa.

## Verificación

- Base 223 → 224 productos; dos fichas existentes enriquecidas. Otros 221 productos y todos los costos anteriores preservados. Costo del nuevo producto registrado en privado, gastos pendientes explícitos.
- Tres fichas públicas HTTP200 con títulos, gamas y precios correctos en Product JSON-LD; sin fuente o notas privadas expuestas.
- Foto del producto nuevo decodificada, 1024×978. Tres fotos principales de catálogo cargadas y verificadas visualmente.
- [La búsqueda combinada muestra los tres modelos](https://myaimportaciones.vercel.app/catalogo?q=percutor%20y%20atornillador), con precio y fotografía correctos. Captura `percutores-publicados.png`.
- Ficha nueva a 390×844: título, tres funciones y precio presentes, sin desborde horizontal. Escritorio de catálogo a 1280 px sin desborde.
- Scripts Python compilados y lint de TypeScript aprobado.

Snapshots, proveedor, payload, SQL y referencias de compra están ignorados por Git. `import.sql` documenta una operación ya aplicada; no volver a ejecutarla.
