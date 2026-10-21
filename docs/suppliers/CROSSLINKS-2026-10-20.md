# Cruce privado de productos y proveedores - 20/10/2026

Implementado y desplegado en `https://myaimportaciones.com/admin/proveedores/inteligencia`, pestana **Productos y proveedores**. Despliegue final `dpl_HZAm9ySFymq5WxftnzQce2Mmy1XJ`, estado READY y dominios productivos verificados. Las dos migraciones de cruces y evidencia de stock estan aplicadas en MYA.

## Evidencia real

- Corte inicial: 463 productos y 4167 combinaciones producto/proveedor programadas, agrupadas en322 consultas base. El catalogo puede cambiar durante el procesamiento; la siembra se repite automaticamente.
- Durante el cierre el catalogo paso a469 productos; la nueva siembra incorporo los seis adicionales y se verificaron4221 combinaciones programadas (469 por nueve).
- Verificacion del cierre: 319 ofertas verificadas vinculadas, 14 ofertas distintas enlazadas por el nuevo cruce. Cinco productos tienen alternativas de al menos dos proveedores para la misma presentacion. No contar filas de auditoria repetidas como nuevos vinculos.
- Ejemplos exactos con dos proveedores: Medicube Collagen Jelly Cream50ml y110ml, Medicube Triple Collagen Toner4.0 140ml, SKIN1004 Madagascar Centella Light Cleansing Oil200ml y Ampoule Foam125ml. Los costos y estados vigentes se consultan en el administrador; esta lista no congela disponibilidad.
- La tarea Windows realiza los lotes sin intervencion. Hay consultas pendientes de recorrido y fuentes con errores/reintentos; no se afirma haber revisado todos los catalogos. Madrid mantiene su restriccion de acceso y alternativa manual/CSV.
- Dos actualizaciones consecutivas reales de una ficha Star mantuvieron identidad y verificacion, sin nuevas decisiones de vinculo. Evidencia privada: `scratch/suppliers-private/crosslink-refresh-proof.json`.
- Lecturas anonimas reales de ofertas, observaciones, trabajos y auditoria rechazadas con42501; costos sin filas visibles y `products.source_url` denegado. La ruta administrativa redirige al login sin sesion. Evidencia privada: `crosslink-privacy-proof.json`.

## Validacion

Suite completa: 176 pruebas aprobadas antes de agregar la ultima prueba del contador por variante; las seis pruebas de matching, incluida esa prueba adicional, aprobaron despues. Type-check aprobado. La prueba local de interfaz cubrio27 vistas a320,390,1440px, sin desborde horizontal ni errores JS. Los datos de UI son aislados: esa prueba no acredita una sesion administrativa autenticada en produccion.

Lint dirigido a los doce archivos de implementacion y pruebas del cruce: salida0 sin errores ni advertencias. La verificacion publica del despliegue final obtuvo200 en inicio/catalogo,307 al login en administracion y401 en la cron sin autorizacion.

Las pruebas PostgreSQL usan las siete migraciones y verifican permisos, cambios concurrentes de identidad, variantes, auditoria, leases, conservacion de precio/inventario y disponibilidad desconocida cuando solo existe un boton de compra. El build de produccion completo fue aceptado por Vercel.

## Operacion

El worker local incorpora productos nuevos al plan en cada ejecucion. Las busquedas y fichas exactas se coordinan por reservas PostgreSQL, con cadencia minima de10segundos por fuente y sin eludir restricciones. Los trabajos se procesan por lotes cada15minutos; una consulta exitosa vuelve a ser elegible a las seis horas. Este intervalo es un objetivo de programacion y depende de la cola, la PC encendida y la respuesta de cada proveedor.

El cruce dirigido tiene prioridad sobre las portadas. Las portadas se omiten durante seis horas desde su ultimo intento, salvo una busqueda solicitada. Se reinicio un ciclo anterior que se habia demorado leyendo la vista publica y se dejo constancia privada de la interrupcion; no se interpreto como agotamiento.

El instalador prefiere PowerShell7 si esta disponible y conserva Windows PowerShell como alternativa. El lanzador oculto deja una marca de inicio y resolucion de Node en `scratch/suppliers-private/launcher.log`. El disparo automatico de las18:30:52 (Argentina) volvio a iniciar el lanzador y resolvio Node sin intervencion; la prueba puntual anterior termino con salida0 y sin modificaciones de precios.

Al verificar ese ciclo se detecto una demora de arranque de Chrome personal. Se instalo el Headless Shell1248 correspondiente a Playwright y el worker paso a usarlo con timeout de45segundos. La prueba real del navegador propio abrio una pagina y termino correctamente en34782ms, sin depender de un perfil de usuario. El instalador deja preparada esta dependencia de manera reproducible. Los ciclos interrumpidos durante estas verificaciones quedaron identificados en el historial privado y no alteraron disponibilidad.

El worker de Windows con el navegador propio inicio su lote real de descubrimiento a las21:40:52UTC. A las21:41:14UTC ya habia completado y persistido una consulta real; el resto del lote continuaba en segundo plano. La comprobacion final mantuvo319 ofertas verificadas,14 nuevas identidades de oferta enlazadas, cinco productos con alternativas de la misma variante y4221 combinaciones programadas.

Las ofertas detectadas se enlazan automaticamente solo con evidencia suficiente de identidad; las ambiguas quedan para revision. La vinculacion no publica productos ni hace compras. La actualizacion de disponibilidad exige evidencia explicita; ausencia en resultados, fallos de red y404 conservan el ultimo estado. Las condiciones de Neo que pueden incluir pasador quedan fuera de la eleccion automatica de menor costo para evitar doble cargo.
