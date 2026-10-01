# Cierre del catálogo de cosméticos — 01/10/2026

Catálogo: https://myaimportaciones.vercel.app/catalogo?category=cosmetica-coreana

- 116 cosméticos públicos y 1 producto capilar público; 154 registros en total.
- 12 incorporaciones, 8 marcas, 46 correcciones de subcategoría y 3 fotos reemplazadas.
- 38 precios aprobados preservados; 37 borradores siguen sin publicar.
- 117 imágenes comprobadas por HTTP y dimensiones.
- Costos y enlaces de proveedores protegidos frente a acceso anónimo.
- Cantidades del proveedor separadas de stock físico propio; entrega a coordinar.
- Revisión visual en escritorio 1280×900 y móvil 390×844, sin desbordamiento horizontal.
- Correcciones de precio y compartir publicadas en el commit `5fc3ddb`.

Las comprobaciones públicas y capturas de este directorio se versionan. El informe
privado `cierre-cosmeticos.html`, los costos, márgenes, SQL, manifiestos de carga y
respaldos de base de datos se conservan localmente y están excluidos de Git porque
el repositorio es público. No se borraron estos archivos.

## Verificar el estado actual sin sobrescribir el informe privado

Con los manifiestos privados originales presentes y `.env.local` configurado:

```powershell
python scripts/verify-cosmetics-completion.py --verify-only
```

Dependencias Python: `requests`, `Pillow`, `beautifulsoup4`.
El verificador comprueba precios, categorías, fotos, acceso anónimo y facetas.
Los scripts de preparación y SQL corresponden a lotes ya aplicados: **no ejecutar
otra vez las importaciones**. Los verificadores de la carga inicial son históricos
y usan las cantidades de aquella etapa; el cierre es el verificador vigente.

## Validación antes del push final

- `npm run type-check`: aprobado.
- `npm test`: 32 pruebas aprobadas.
- `npm run lint`: 0 errores; 111 advertencias existentes.
- `npm run build`: aprobado, 32 rutas.
- Auditoría de credenciales de los archivos nuevos: sin hallazgos.

Evidencia: `verification.json`, `media-verification.json`, `ui-verification.json`,
`deployment.json` y capturas de la web publicada.
