# Herramientas Total y Wadfow — revisión 01/10/2026

Se cargaron 60 presentaciones en 30 pares; 52 están publicadas en 26 pares y 8 quedaron en borrador porque una de las opciones deja una diferencia comercial insuficiente frente a la referencia local. La selección reúne categorías de uso doméstico, taller y obra; no constituye un ranking demostrado de los 50 modelos más vendidos.

Las fichas distinguen potencia, capacidad, torque, cantidad de piezas y accesorios. Los equipos eléctricos y cargadores publicados son compatibles con 220–240 V; las herramientas a batería conservan su tensión real. El cliente puede pasar a la otra presentación desde la ficha. La navegación omite rubros vacíos y limita las marcas a la categoría elegida.

Los precios utilizan la política de catálogo indicada por el usuario, con redondeo comercial y ajuste frente a Mercado Libre donde se obtuvo una referencia equivalente. De las 52 presentaciones publicadas, 36 tienen una referencia de precio indexada y 16 conservan un precio provisional calculado por costo. Esas referencias pueden tener demora de indexación y no prueban el precio mínimo actual de toda la plataforma.

Se verificaron las 85 imágenes de las galerías, las 52 páginas públicas, sus precios y la exclusión de los 8 borradores. Los 154 productos y registros de costos anteriores permanecen intactos. Las cantidades del proveedor no fueron informadas y no se declaró stock físico propio. La diferencia de compra y venta se registra antes de transporte, impuestos de importación y comisiones pendientes; no representa ganancia neta.

El proveedor publica precios distintos según país. La evidencia de compra corresponde a Paraguay y al precio que incluye IVA. Los manifiestos, capturas del proveedor, costos, márgenes, referencias comerciales y SQL de aplicación permanecen privados y excluidos de Git porque el repositorio es público.

Scripts: `collect-total-selection.py`, `review-total-candidates.py`, `prepare-total-selection.py`, `verify-total-media.py` y `verify-total-selection.py`. La preparación valida presentaciones, enlaces de mercado observados, pares completos, fotos y precios; genera un lote transaccional que no se aplica automáticamente. La verificación comprueba el lote aplicado y las páginas anónimas.

El verificador de Total lee la disponibilidad del SKU principal desde sus datos estructurados. No toma la disponibilidad de recomendaciones ni interpreta guaraníes como dólares; deja el costo de compra según la cotización revisada. Se comprobó contra las 60 fichas del lote.

Revisión visual en producción: escritorio de 1280 px y celular de 390 px sin desbordamiento horizontal; fotos visibles correctas, filtro Wadfow con 9 resultados y enlaces entre ambas versiones comprobados. Las capturas y `ui-verification.json` documentan la revisión.

Validación de aplicación: 38 pruebas aprobadas, TypeScript y compilación aprobados; ESLint sin errores y con 111 advertencias preexistentes.
