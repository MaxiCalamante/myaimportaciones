# Herramientas Total agregadas el 06/10/2026

Por pedido del dueño se agregaron tres productos a la tienda. Se revisaron 34 fichas directas del mayorista y el catálogo actual para evitar duplicaciones. Los taladros atornilladores TDLI12456 (12V), TDLI205582 (20V) y los atornilladores de impacto TIRLI2023 y TIRLI2028 ya estaban publicados. Luego se aclararon las gamas y los usos de tres modelos, conservando sus precios y existencias.

## Tres gamas de atornilladores publicadas

| Gama | Modelo | Uso | Precio ARS |
|---|---|---|---:|
| Baja | TSDLI08025, 8V, 6 Nm | Hogar, muebles y mantenimiento liviano | 86.400 |
| Media | TDLI205582, 20V, 55 Nm | Taladro atornillador con mandril de 13 mm, batería de 2 Ah y 47 accesorios | 122.900 |
| Industrial de alta potencia | TIRLI2028, impacto 20V, 285 Nm | Fijaciones exigentes; dos baterías de 2 Ah y cargador 220–240V | 230.900 |

El modelo de impacto no reemplaza al taladro para perforar con brocas convencionales. Se verificaron los kits y disponibilidad directamente en el proveedor antes de enriquecer las descripciones y especificaciones. La actualización modificó únicamente título, descripción, etiquetas y especificaciones de estos tres registros; los precios, costos privados, stock y otros 220 productos quedaron iguales. Las tres fichas muestran la gama y el precio correctos en móvil de 390 px, sin desborde. `gamas-verification.json` conserva la comprobación contra la base actual y las rutas públicas; `atornillador-industrial.png` muestra el resultado en escritorio.

## Productos nuevos y precios

| Modelo | Producto nuevo | Precio MYA ARS | Referencia ML ARS |
|---|---|---:|---:|
| TSDLI08025 | Atornillador articulado 8V, 6 Nm, 17 accesorios y caja | 86.400 | 96.000 |
| THT10821 | Gato hidráulico carrito de 2 toneladas | 116.300 | 129.299 |
| THT10834 | Gato hidráulico carrito de 3 toneladas, perfil bajo y doble bomba | 350.900 | 389.998,99 |

Los precios son referencia del mismo modelo y kit ×0,90, redondeada hacia abajo a ARS100. Las tres referencias se comprobaron directamente en el navegador el 06/10/2026, con el precio principal que incluye impuestos; se descartaron los valores indexados cuando diferían de la ficha visible.

- [TSDLI08025, Don Andrés Comercial](https://www.mercadolibre.com.ar/atornillador-8v--17-accesorios-industrial-total-tsdli08025/up/MLAU4406355397).
- [THT10821, El Rosarino Ferreteria](https://www.mercadolibre.com.ar/cricket-gato-carrito-hidraulico-2-tn-industrial-total/p/MLA24308196).
- [THT10834, IMPEXPRO SHOP](https://www.mercadolibre.com.ar/cricket-carrito-3-tn-extra-chato-industrial-total-tht10834/up/MLAU3140783842).

El dueño pidió consultar el dólar blue del día. Se usó **venta ARS1545/USD**, según [DolarAPI](https://dolarapi.com/v1/dolares/blue), actualizado a las 10:56 de Argentina del 06/10/2026. Cotizaciones directas del proveedor en USD con IVA; respaldo y costos privados guardados fuera de Git y en `product_costs`.

La diferencia venta−compra es anterior a flete, internación, comisiones y otros gastos desconocidos; no representa ganancia neta. `expenses_confirmed=false`. No se promete una ventaja sobre el costo total entregado: el THT10834 de ML tenía entrega a acordar, mientras los otros dos ofrecían envío gratis para el destino del navegador. El abastecimiento se registra como proveedor; stock propio no confirmado.

## Pendientes concretos

- **TIDLI201668, 166 Nm:** el modelo de mayor torque entre los taladros revisados tiene dos baterías de 5 Ah y cargador de 220–240V, pero está agotado y sin cotización en el mayorista. No se publicó con un costo inventado.
- **Gato Total tipo botella de 3 t:** no se encontró un modelo exacto en el catálogo del proveedor. No se agregó otro carrito similar para reemplazarlo ni un gato de distinta capacidad.
- **UTIDLI209686, 96 Nm:** disponible, pero incluye cargador de 110–120V; no se comparó como equivalente al kit argentino de 220–240V.
- **THT108313 y TSDLI0442:** disponibles, sin referencia argentina exacta suficiente para aplicar la regla de precios. Se conserva la evidencia privada.

## Verificación realizada

- Inserción transaccional de los tres productos y sus costos privados; sin migraciones ni despliegue de aplicación.
- Inserción inicial: 220 → 223 productos. En esa inserción los 220 productos anteriores y sus registros de costos quedaron iguales. La posterior aclaración de gamas está detallada arriba.
- Tres fichas públicas HTTP200 con SKU y precio correctos en Product JSON-LD; sin fuentes ni notas privadas expuestas.
- Cinco fotos originales decodificadas, todas con lado mayor de 1024 px. Las imágenes principales corresponden visualmente al atornillador 8V, carrito 2 t y carrito 3 t de perfil bajo.
- Las tres fichas se comprobaron a 390 px con foto cargada, precio correcto y sin desborde horizontal. Galería ampliada del THT10834 funcional.
- La categoría Gatos y criques muestra exactamente dos productos nuevos, con precios correctos. Captura de escritorio en `catalogo-publicado.png`.
- Validación de sintaxis Python y lint de los scripts TypeScript aprobados.

`verification.json`, `media-verification.json` y `ui-verification.json` conservan los resultados. Los archivos de cotizaciones, respaldos, payload e inserción son privados y están ignorados por Git. No volver a ejecutar `import.sql` sobre los productos ya agregados.
