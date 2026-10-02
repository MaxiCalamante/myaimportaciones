# Revisión de fichas MYA — 02/10/2026

Consulta en vivo de la base de datos finalizada a las 17:02, hora argentina.
No se modificaron productos ni se publicó una actualización.

## Resultado

| Control | Resultado |
| --- | --- |
| Registros revisados | 215: 170 publicados y 45 borradores |
| Fichas públicas | 170/170 responden correctamente y contienen datos estructurados Product |
| Imágenes originales | 240/240 descargadas y decodificadas, incluyendo galerías y borradores |
| Títulos, marcas, categorías y precios de publicados | Sin faltantes o precios no positivos |
| Descripciones de plantilla en publicados | 117 |
| Publicados con una sola imagen | 152 |
| Publicados con alguna imagen menor de 1000 px en su lado mayor | 118; ninguno con imágenes menores de 600 px |
| Herramientas sin condiciones específicas de garantía | 52 |
| Publicado sin SKU y sin especificaciones estructuradas | Body Splash Victoria's Secret Bare Vanilla 250 ml |

Los 37 borradores sin precio positivo no se consideran fallas de la tienda pública.
Hay 154 descripciones de plantilla si se incluyen los borradores.

## Qué necesita trabajo

1. **Descripción útil:** las 117 fichas señaladas repiten el nombre, a veces la presentación y un aviso de disponibilidad. No explican suficientemente el producto. Redactar información específica en español sobre qué es, finalidad cosmética o función, contenido y modo de uso, contrastando la variante exacta con el fabricante. Añadir precauciones cuando correspondan y evitar promesas clínicas, porcentajes o compatibilidades no respaldados. Los dispositivos también requieren funciones, alimentación y contenido del paquete verificados.
2. **Galería:** priorizar etiqueta legible, vista posterior y contenido del kit en los 152 productos con una única foto. Una imagen que carga no demuestra por sí sola que sea la variante correcta. No inventar vistas ni ampliar artificialmente una imagen de 800 px como si fuese una fuente de mayor calidad.
3. **Garantía:** verificar las condiciones que realmente ofrece MYA para las 52 herramientas. La muestra publicada anuncia “Condiciones de garantía en la ficha” sin mostrar un bloque de garantía. Cargar condiciones respaldadas o adecuar el texto de la interfaz; no inventar garantía oficial ni plazos.
4. **Ficha de Victoria's Secret:** completar código interno y presentación estructurada, familia olfativa y uso solo con información respaldada. El texto actual sí describe la fragancia, por eso no aparece entre las 117 descripciones de plantilla.

Las herramientas tienen descripciones con características y contenido del kit; las observaciones sobre ellas se concentran en fotos adicionales y garantía.

## Verificación visual de muestra

- Catálogo publicado: el contador muestra 170 productos.
- Anua Heartleaf Pore Control Cleansing Oil 200 ml: foto visible, descripción de plantilla visible, ampliación abre y cierra.
- Total TDLI12456: descripción incluye torque, velocidad, mandril, batería y exclusión de cargador. La segunda miniatura cambia la selección.
- Ambas fichas muestran “Disponible” junto con “Disponibilidad a confirmar”: conviene unificar la explicación de disponibilidad.

La revisión visual fue de muestra, no de los 170 productos uno por uno. Las comprobaciones de carga, dimensiones y rutas sí abarcaron todo el catálogo. No se certificó composición, eficacia, autenticidad, garantía, coincidencia visual de todas las variantes ni calidad de todos los textos contra documentación del fabricante.

## Archivos

- `revision.html`: informe filtrable con la descripción, especificaciones, fotos y observaciones de cada producto.
- `audit.json`: resultados completos, fecha, dimensiones y comprobaciones de rutas.
- `scripts/audit-product-quality.mts`: auditoría de solo lectura; requiere las variables existentes de Supabase en `.env.local`.

Ejecutar desde la raíz de Tienda WEB: `node --import tsx scripts/audit-product-quality.mts`.
El script no exporta costos, enlaces de proveedores ni credenciales. Se validó con ESLint.
