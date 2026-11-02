# Comprobación de seguimiento, coincidencias y oportunidades — 01/11/2026

## Evidencia real y límites

La sesión administrativa real abrió los tres recorridos. El botón de seguimiento generó el ciclo `c92f98fc-636e-4bc6-99b0-446cfb6d5732`: tres consultas, dos correctas y una incidencia HTTP 403 en Atlántico. El resultado conserva evidencia anterior ante el rechazo; registró cero cambios de precio. El botón procesa hasta seis consultas pendientes dentro de su tiempo disponible, no todo el catálogo.

La cola tenía 165 fuentes bloqueadas: cambios de identidad, variantes ambiguas, páginas desaparecidas y lecturas insuficientes, principalmente de Atacado USA y Star Company. Esto no equivale a agotamiento. Continúan 109 productos sin URL de ficha verificada, siete activos; ver el informe de vinculación. La configuración observada mantiene los ajustes automáticos de precio deshabilitados. El seguimiento puede actualizar disponibilidad y pausar productos simples agotados con evidencia; no activa borradores ni promete la reactivación automática de publicaciones.

## Correcciones

- El alta individual utilizaba un cliente de servicio para RPC que sólo aceptan al administrador autenticado. Se corrigió el cliente sin ampliar permisos. Se comprobó en PostgreSQL aislado que el cliente de servicio es rechazado y que el administrador completa vista previa, confirmación y procesamiento.
- Los nuevos borradores guardan `products.source_url` además de la relación con la oferta. La migración sólo cambia operaciones futuras. La oferta permanece pendiente y no inicia seguimiento hasta verificar identidad.
- La ficha general del proveedor, una tarjeta de listado o una URL ajena no sirven como enlace exacto para crear el borrador.
- El radar excluye proveedores inactivos y muestra disponibilidad desconocida ante errores, evidencia vencida o stock inferido sólo del listado. Los comparables ML requieren identidad y presentación exactas; compartir modelo ya no basta.
- El formulario ofrecía modificar título, precio minorista/mayorista y referencia ML aunque el servidor ignoraba esos campos. Ahora muestra el título de origen, permite elegir categoría y conduce al editor para guardar los ajustes reales. El botón dice «Crear borrador».
- La respuesta distingue un producto nuevo de una oferta vinculada a un producto existente y conserva el estado real de esa publicación.
- En Proveedores se puede verificar explícitamente una oferta pendiente del producto seleccionado; la RPC existente registra y encola el vínculo. Las coincidencias parciales sin destino confirmado comienzan con producto y variante vacíos, evitando preseleccionar otro artículo.
- Edge `supplier-tracking` v7 incorpora el trabajador de importaciones que faltaba en el despliegue: continúa sólo lotes que un administrador ya confirmó. No crea ni publica candidatos por iniciativa propia y no depende de la PC.

## Recorrido comprobado

1. Crear borrador desde Oportunidades con ficha exacta y categoría. Se conserva título fuente, marca, modelo, oferta y enlace; el precio se calcula en servidor o queda pendiente si faltan condiciones.
2. Completar título comercial, descripción factual, fotos autorizadas, costos y precio en el editor y Costos.
3. En Compras y proveedores elegir el producto/variante, revisar la fuente y confirmar el vínculo pendiente. Para fuentes con capacidad de ficha primaria se crea la cola de seguimiento.
4. Aprobar la publicación en Importación masiva y revisión. El servidor exige evidencia documental, descripción útil, imagen, contribución suficiente y oferta verificada con costo y disponibilidad vigentes.

La descripción y las fotos no se importan automáticamente. El alta crea un borrador incompleto para revisión. No se publicó ningún producto de prueba en producción.

## Validación

Pruebas sobre PostgreSQL aislado: permisos, transacciones completas, reintentos, duplicados, enlace de origen, entrada en seguimiento después de verificar y rechazo de una ficha general. También se comprobaron los requisitos de publicación y la conservación del stock físico. Pruebas del radar cubren errores, vigencia, proveedor inactivo y presentaciones distintas del mismo modelo. Evidencia privada y registros de ejecución en `scratch/suppliers-private/`.

## Verificación final — 02/11/2026

La prueba real de filtros encontró una lectura directa de `products.source_url`, columna privada que el rol autenticado no puede consultar. Se eliminó del radar porque no necesita ese dato para comparar identidades. La vista previa de importación obtiene el catálogo mediante `admin_catalog_page`, el acceso administrativo ya existente. No se ampliaron permisos de columnas ni de funciones. La regresión de PostgreSQL ahora restringe explícitamente `source_url` y comprueba el alta completa bajo el rol autenticado; antes el fixture concedía lectura de toda la tabla y ocultaba esa incompatibilidad. Los errores de búsqueda cruzan la acción como un resultado controlado con mensaje legible.
