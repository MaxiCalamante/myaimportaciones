# MYA Importaciones — Design QA

> Guía permanente de calidad visual, experiencia de usuario y validación responsive.
>
> Última revisión: 10/11/2026.
>
> Este documento establece los criterios para evaluar cambios de diseño en MYA Importaciones.
>
> Reglas técnicas y operativas: `AGENTS.md`.
> Contexto del proyecto: `AI_CONTEXT.md`.

---

## 1. Objetivo

MYA Importaciones debe ofrecer una experiencia de compra moderna, profesional, clara y confiable.

El diseño debe ayudar a vender, no dificultar la navegación ni distraer al comprador.

**Principio principal: una tienda visualmente atractiva, rápida y fácil de usar tanto en celulares como en computadoras.**

Prioridades:

1. Claridad y confianza.
2. Facilidad para encontrar productos.
3. Precios legibles.
4. Imágenes correctas.
5. Navegación sencilla.
6. Proceso de compra intuitivo.
7. Diseño consistente.
8. Velocidad de carga.
9. Accesibilidad.
10. Optimización de conversión.

No sacrificar funcionalidad, rentabilidad ni seguridad comercial por decisiones estéticas.

---

## 2. Identidad visual

### Dirección estética

La identidad visual de MYA se basa en:

- Predominio de blanco.
- Azul característico de MYA.
- Textos neutros de alto contraste.
- Espaciados consistentes.
- Bordes y radios discretos.
- Tarjetas limpias.
- Fotografías de producto protagonistas.
- Jerarquía tipográfica clara.
- Interacciones suaves y funcionales.

Evitar un diseño sobrecargado.

### Coherencia

Los mismos patrones visuales deben mantenerse en:

- Página principal.
- Catálogo.
- Fichas de producto.
- Mayorista.
- Carrito.
- Checkout.
- Cuenta del usuario.
- Navegación móvil.

Reutilizar tokens, componentes y estilos compartidos.

No crear cinco versiones visuales de un mismo botón o tarjeta sin una necesidad concreta.

Los colores, tamaños y espaciados exactos deben derivarse del sistema de diseño realmente implementado.

---

## 3. Página principal

La home debe permitir que un visitante comprenda rápidamente qué vende MYA.

### Orden de prioridades

1. Identidad de MYA y navegación.
2. Propuesta comercial principal.
3. Acceso a categorías.
4. Productos destacados.
5. Otras selecciones comerciales.
6. Acceso mayorista.
7. Información de compra y contacto.

El usuario debe poder descubrir productos sin atravesar una cantidad excesiva de banners o elementos decorativos.

### Hero

- Fotografía relevante y de buena calidad.
- Texto breve y claro.
- CTA visible.
- Altura contenida en móviles.
- Controles accesibles.
- Sin recortes incorrectos.
- Sin texto ilegible sobre imágenes.
- Sin bloquear el contenido comercial.

Cuando el hero sea administrable, respetar los datos, imágenes y acciones configurados desde el panel.

La primera diapositiva no debe ignorar los valores administrados.

### Categorías

Mostrar categorías comerciales claras y fáciles de reconocer.

Mantener una distribución compacta en móviles.

La composición 3+2 de Premium V2 constituye una referencia visual aprobada para cinco accesos, no una obligación rígida si cambia la cantidad de categorías.

No inventar categorías ni modificar slugs para cumplir un mockup.

---

## 4. Tarjetas de producto

Las product cards son uno de los elementos más importantes del e-commerce.

Deben mantener:

- Imagen principal correcta.
- Marca, cuando corresponda.
- Nombre del producto.
- Precio legible.
- Información de disponibilidad coherente.
- Acceso a la ficha.
- Acción de compra apropiada.
- Información de variantes cuando exista.
- Favoritos, cuando estén disponibles.

### Imágenes

Preferir `object-contain` para evitar cortar envases, herramientas o dispositivos.

Mantener una relación de aspecto consistente.

No estirar, deformar ni recortar productos incorrectamente.

No usar imágenes genéricas cuando existe una foto real y autorizada.

### Títulos

Utilizar una altura y cantidad de líneas consistentes.

Evitar títulos imposibles de leer.

Mantener el nombre suficientemente descriptivo para reconocer el producto.

No eliminar modelo, capacidad o presentación cuando son necesarios para distinguir variantes.

### Precios

Los precios deben:

- Ser correctos.
- Ser fáciles de localizar.
- Mostrar moneda claramente.
- No quedar cortados.
- No superponerse con botones.
- Mantener coherencia entre tarjetas y fichas.

Si un producto tiene un rango real de precios, mostrar correctamente la indicación «Desde».

En pantallas estrechas, permitir que esa indicación ocupe otra línea antes que recortar el importe.

No mostrar descuentos, cuotas o precios anteriores ficticios.

### Variantes

Las variantes deben conservar su identidad real.

En tarjetas compactas puede mostrarse un contador de opciones.

La selección detallada debe realizarse en la ficha cuando corresponda.

No desplegar largas listas de variantes dentro de las tarjetas.

No agregar una variante arbitraria al carrito sin la selección necesaria.

### Disponibilidad

La interfaz debe representar el estado comercial real.

Diferenciar:

- Stock propio.
- Disponibilidad de proveedor.
- Stock sin confirmar.
- Producto no comprable.

No mostrar «Disponible» si la evidencia no lo respalda.

Los productos agotados u ocultos deben respetar las reglas establecidas en `AGENTS.md`.

---

## 5. Diseño responsive

El diseño debe funcionar correctamente en dispositivos pequeños, medianos y grandes.

### Anchos de referencia

Realizar pruebas como mínimo en:

| Ancho | Escenario |
|---|---|
| 320 px | Móvil pequeño |
| 375 px | Móvil compacto |
| 390 px | Móvil habitual |
| 430 px | Móvil grande |
| 768 px | Tablet |
| 1024 px | Tablet horizontal / laptop |
| 1440 px | Escritorio |

Agregar otros anchos cuando el diseño lo requiera.

### Condiciones obligatorias

- Sin scroll horizontal accidental.
- Sin elementos cortados.
- Sin texto superpuesto.
- Sin botones inaccesibles.
- Sin precios desbordados.
- Sin modales fuera de pantalla.
- Sin imágenes deformadas.
- Sin tablas que rompan el viewport.
- Sin desplazamientos inesperados al cargar contenido.

La experiencia móvil no debe ser simplemente una versión comprimida de escritorio.

### Tarjetas móviles

Mantener una grilla compacta, preferentemente de dos columnas cuando el contenido lo permita.

Las tarjetas deben tener alturas razonablemente consistentes.

Los CTA deben resultar utilizables sin reducir excesivamente el tamaño táctil.

---

## 6. Header y navegación móvil

### Header

Debe ofrecer acceso sencillo a:

- Inicio.
- Catálogo.
- Búsqueda.
- Carrito.
- Cuenta.
- Mayorista.
- Contacto.

Conservar el logo MYA correctamente proporcionado.

Evitar que los elementos se superpongan en pantallas pequeñas.

### Menú móvil

El menú debe:

- Abrirse y cerrarse correctamente.
- Tener categorías reconocibles.
- Utilizar acordeones cuando corresponda.
- Conservar un buscador funcional.
- Permitir acceder a favoritos.
- Permitir acceder a la cuenta.
- Mostrar únicamente acciones autorizadas para el usuario.
- No bloquear permanentemente el scroll.
- Mantener una navegación accesible por teclado.

Al cerrar el menú, restaurar correctamente el foco cuando corresponda.

### Barra de navegación inferior

Cuando exista, comprobar que:

- No tape contenido.
- Respete las áreas seguras del teléfono.
- No interfiera con las acciones de compra.
- Mantenga consistencia entre pantallas.

Los accesos deben llevar a las rutas correctas.

---

## 7. Ficha de producto

Las páginas de producto deben permitir tomar una decisión de compra informada.

### Elementos principales

- Galería de imágenes.
- Título.
- Marca y modelo.
- Precio.
- Variantes.
- Disponibilidad.
- Cantidad.
- Acción de compra.
- Información de envío.
- Descripción.
- Características.
- Garantía y condiciones aplicables.

### Galería

- Imágenes proporcionales.
- Miniaturas funcionales.
- Navegación correcta.
- Sin saltos de diseño.
- Sin fotografías incorrectas.
- Zoom cuando corresponda.

### Variantes

Verificar que la selección actualice correctamente:

- Imagen.
- Precio.
- Disponibilidad.
- Identidad de la variante.
- Carrito.
- URL cuando corresponda.

No permitir que una tarjeta o ficha seleccione silenciosamente una variante distinta de la solicitada.

### Información comercial

No inventar:

- Garantías.
- Certificaciones.
- Stock.
- Fechas de entrega.
- Descuentos.
- Beneficios terapéuticos.
- Documentación sanitaria.

La confianza visual debe estar respaldada por información verdadera.

---

## 8. Catálogo y búsqueda

El catálogo debe permitir descubrir productos fácilmente.

### Filtros

Verificar:

- Categoría.
- Subcategoría.
- Marca.
- Precio.
- Búsqueda.
- Ordenamiento.
- Paginación.

Todos los filtros deben utilizar datos reales.

No mostrar categorías vacías innecesarias.

No mostrar productos archivados como disponibles.

### Búsqueda

Debe funcionar en escritorio y móvil.

Debe tolerar razonablemente nombres comerciales, marcas y modelos.

No exponer productos eliminados, datos privados ni resultados no autorizados.

### Estados vacíos

Si no existen resultados:

- Informarlo claramente.
- Permitir quitar filtros.
- Ofrecer volver al catálogo.
- No presentar un error del servidor como si fuera ausencia real de productos.

---

## 9. Catálogo mayorista

La experiencia mayorista debe ser profesional y fácil de consultar.

Priorizar:

- Acceso público al catálogo.
- Productos claramente identificables.
- Precios mayoristas comprensibles.
- Cantidades mínimas correctas.
- Posibilidad de combinar productos según las reglas vigentes.
- Acceso a consultas y cotizaciones.
- Información comercial clara.

No confundir precios minoristas con mayoristas.

No ocultar condiciones relevantes detrás de interacciones innecesarias.

El diseño mayorista puede tener un enfoque más comercial, pero debe mantener la identidad visual de MYA.

---

## 10. Carrito y checkout

Son recorridos críticos.

### Carrito

Verificar:

- Agregar productos.
- Eliminar productos.
- Modificar cantidades.
- Mantener variantes.
- Mostrar precios correctos.
- Mostrar subtotales.
- Gestionar productos sin disponibilidad.
- Persistir correctamente el estado cuando corresponda.

Los botones deben proporcionar feedback visual comprensible.

### Checkout

Priorizar claridad sobre decoración.

Comprobar:

- Datos del comprador.
- Dirección.
- Envío.
- Medio de pago.
- Totales.
- Moneda.
- Errores de validación.
- Estados de carga.
- Confirmaciones.

No presentar como gratuito un envío cuya tarifa todavía no fue calculada.

No mostrar confirmación de compra antes de recibir una respuesta válida.

No modificar reglas de pago o precios como parte de una mejora puramente visual.

---

## 11. Accesibilidad

Los componentes interactivos deben ser utilizables con mouse, teclado y dispositivos táctiles.

### Requisitos

- Contraste suficiente.
- Indicadores de foco visibles.
- Etiquetas accesibles.
- Navegación por teclado.
- Escape para cerrar modales cuando corresponda.
- Gestión adecuada del foco.
- Textos alternativos para imágenes informativas.
- Errores comunicados de forma comprensible.
- Estados disabled y loading identificables.
- Respeto por preferencias de movimiento reducido.

Como referencia general, utilizar controles táctiles con objetivos de al menos 44 × 44 px cuando sea viable.

Validar con herramientas automatizadas y pruebas manuales.

Una auditoría automática sin errores no reemplaza la revisión de accesibilidad real.

---

## 12. Rendimiento visual

No introducir mejoras visuales que perjudiquen significativamente la velocidad.

### Prioridades

- Optimización de imágenes.
- Carga diferida cuando corresponda.
- Prioridad adecuada para contenido principal.
- Evitar dependencias pesadas innecesarias.
- Minimizar desplazamientos del layout.
- Evitar animaciones costosas.
- Mantener interacciones fluidas.

Revisar cuando corresponda:

- LCP.
- CLS.
- INP.
- Tiempo de carga.
- Tamaño de imágenes.
- Recursos JavaScript.

Medir el rendimiento antes y después de cambios importantes.

No afirmar mejoras de rendimiento sin medición.

---

## 13. Proceso obligatorio de Design QA

Para cada cambio visual relevante:

### Paso 1 — Revisar

- Inspeccionar el diseño actual.
- Identificar componentes afectados.
- Revisar referencias existentes.
- Definir qué debe mantenerse.
- Registrar posibles regresiones.

### Paso 2 — Implementar

- Reutilizar componentes.
- Respetar la identidad visual.
- Mantener datos reales.
- Evitar modificar lógica comercial innecesariamente.

### Paso 3 — Capturar

Tomar capturas comparables antes y después.

Usar las mismas rutas y dimensiones.

Registrar fecha, versión y condiciones de prueba.

### Paso 4 — Validar

Comprobar:

- Home.
- Menú.
- Catálogo.
- Ficha simple.
- Ficha con variantes.
- Carrito.
- Checkout afectado.
- Mayorista afectado.
- Estados vacíos.
- Estados de error.

### Paso 5 — Probar interacciones

No basta con una captura atractiva.

Probar navegación, botones, búsqueda, carrito, variantes y formularios.

### Paso 6 — Ejecutar verificaciones

Cuando corresponda:

- `npm run lint`
- `npm run type-check`
- `npm test`
- `npm run build`
- Pruebas con Playwright.
- Revisión de accesibilidad.

### Paso 7 — Documentar

Registrar resultados y pendientes sin exagerar el alcance.

No declarar una funcionalidad aprobada si solamente se revisó una captura.

---

## 14. Clasificación de defectos

### P0 — Bloqueante

Problemas que impiden comprar, acceder a funcionalidades críticas o utilizar la web.

Ejemplos:

- Checkout inutilizable.
- Pérdida de datos.
- Precio comercial incorrecto.
- Fallo grave de navegación.
- Acceso indebido a información privada.

**No desplegar con P0 abiertos.**

### P1 — Alta prioridad

Problemas graves de usabilidad.

Ejemplos:

- Botones inaccesibles en móvil.
- Precios cortados.
- Menú que no cierra.
- Variantes incorrectas.
- Elementos importantes ocultos.

**Corregir antes de aprobar el release.**

### P2 — Prioridad media

Problemas visuales o funcionales localizados.

Ejemplos:

- Espaciados inconsistentes.
- Desalineaciones.
- Jerarquía visual deficiente.
- Componentes poco claros.

Registrar y resolver antes de declarar el alcance visual completamente aprobado.

### P3 — Mejora

Ajustes secundarios o comprobaciones adicionales.

Ejemplos:

- Animaciones.
- Refinamiento de fotografías.
- Mejoras menores de composición.
- Pruebas físicas adicionales.

Pueden quedar pendientes si se documentan correctamente y no impiden el uso seguro.

---

## 15. Evidencia histórica — Premium V2

### Alcance original

El proyecto Premium V2 utilizó como referencia un mockup principal con:

- Página de inicio.
- Tarjetas de productos.
- Menú móvil.

Las otras ocho capturas mencionadas no estaban disponibles durante aquella revisión.

Se compararon capturas locales con el diseño de referencia.

### Mejoras verificadas

- Hero más compacto.
- Categorías compactas.
- Tarjetas de dos columnas en móvil.
- Imágenes con `object-contain`.
- Precios legibles.
- Corrección de desbordes de «Desde» a 320 px.
- Contador de variantes.
- Menú con acordeones.
- Buscador funcional.
- Acceso móvil a favoritos.
- Primer slide vinculado a valores administrados.
- Controles de carrusel de 44 px.

### Pruebas documentadas

La implementación registró:

- Chromium en siete anchos de pantalla.
- WebKit móvil en tres anchos.
- Revisión de home y menú.
- Catálogo.
- Fichas simples y con variantes.
- Carrito.
- Navegación y accesibilidad básica.
- Verificación de precios sin recortes en 28 casos de rutas y tamaños.

### Resultado

**Premium V2: aprobado en el alcance visual comprobado.**

No se registraron defectos P0, P1 o P2 pendientes en ese alcance.

Este resultado es histórico.

No implica que cualquier modificación posterior esté aprobada ni que todas las funcionalidades actuales hayan sido verificadas.

### Pendientes históricos

- Smoke test en Safari de un iPhone físico.
- Smoke test en Chrome de un Android físico.
- Ajustes futuros de fotografías del carrusel desde administración.

### Evidencia conservada

Directorio:

`docs/premium-ux-v2/evidence/`

Archivos principales:

- `before-home-390.png`
- `before-menu-390.png`
- `after-home-390.jpg`
- `after-menu-390.jpg`
- `after-home-1440.jpg`
- `results.json`
- `routes.json`
- `webkit-results.json`
- `webkit-navigation-results.json`

Informe de implementación:

`docs/premium-ux-v2/IMPLEMENTACION.md`

Las pruebas con WebKit emulado no equivalen a pruebas en un iPhone físico.

El informe histórico documenta además que el diseño no se había desplegado al finalizar aquella tarea. Consultar GitHub y Vercel para determinar su estado de publicación posterior.

---

## 16. Criterios para aprobar un diseño

Un cambio visual puede considerarse aprobado únicamente si:

- Respeta la identidad MYA.
- Cumple el objetivo solicitado.
- Mantiene funcionalidad existente.
- No introduce errores comerciales.
- No rompe la navegación.
- No presenta desbordes relevantes.
- Funciona en los tamaños afectados.
- Las imágenes corresponden a productos reales.
- Los precios se muestran correctamente.
- Los controles son accesibles.
- Las pruebas necesarias se completaron.
- Las limitaciones quedan documentadas.

Si se incumple algún criterio importante, no declarar el trabajo como completamente aprobado.

La aprobación debe indicar su alcance y fecha.

---

## 17. Formato de informe final de Design QA

Al finalizar una modificación visual importante, entregar:

**Cambio:** qué se modificó.

**Objetivo:** qué problema resolvía.

**Rutas afectadas:** páginas o componentes incluidos.

**Validaciones:** navegadores, anchos y flujos probados.

**Resultado:** aprobado, aprobado con observaciones o rechazado.

**Defectos:** clasificados por prioridad.

**Evidencia:** capturas y resultados disponibles.

**Limitaciones:** pruebas que no pudieron realizarse.

**Estado de publicación:** local, commit, push, preview o producción verificada.

No confundir compilación correcta con validación visual.

No confundir capturas locales con pruebas de producción.

---

## 18. Mantenimiento

Este archivo debe mantenerse como una guía de QA reutilizable.

No agregar una sección extensa por cada pequeño cambio visual.

Las nuevas auditorías deben conservar sus capturas e informes en carpetas específicas dentro de `docs/`.

Actualizar aquí solamente:

- Reglas de diseño vigentes.
- Criterios de calidad.
- Patrones aceptados.
- Problemas recurrentes importantes.
- Referencias a auditorías relevantes.
- Pendientes que continúen siendo aplicables.

Conservar las auditorías anteriores como historial.

**Principio final: MYA no necesita solamente verse bien en capturas. Debe funcionar bien, facilitar la compra y mantener una experiencia profesional con datos comerciales reales.**