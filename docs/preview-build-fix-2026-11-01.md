# Corrección de build Preview sin Supabase

El deploy801faa3 compilaba y validaba TypeScript, pero intentaba prerenderizar /admin/proveedores. Preview no recibía NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY; el cliente se construía antes de consultar cookies y fallaba durante next build. .env.local existe sólo en desarrollo y .vercelignore excluye .env*, como corresponde para evitar subir credenciales.

Cambios:
- /admin/layout fuerza renderizado por solicitud: páginas privadas y sesión no se exportan estáticamente.
- /restablecer-clave también es dinámica y muestra un estado explícito sin formulario cuando falta configuración. El cliente sigue fallando de forma estricta para llamadas que requieren Supabase; no se agregan claves ni valores ficticios.
- El sitemap lee el catálogo por solicitud; conserva su validación y no publica un sitemap vacío por falta de conexión.
- Tres pruebas de regresión cubren renderizado privado y recuperación sin configuración. Se reprodujo el build fallido antes del cambio y se verificó con ambas variables vacías después.

Configuración pendiente en Vercel: seleccionar Preview para las dos variables públicas ya utilizadas en Production. No copiar service_role, tokens de pagos ni secretos a NEXT_PUBLIC. La conexión de Vercel rechazó tanto listar como crear variables con403. El fallback CLI no tiene credenciales propias y se detuvo sin iniciar una autenticación del usuario. No se cambiaron variables ni producción.

El build puede completarse sin Supabase para mostrar los estados de preparación existentes, pero el catálogo y el acceso real requieren esas variables en Preview. Habilitarlas exige un nuevo build porque NEXT_PUBLIC se incorpora al bundle.

Verificación: build de producción aprobado con ambas variables vacías y también con configuración pública real. Suite completa317/317 aprobada; las3pruebas focalizadas finales (incluido sitemap) aprobadas. ESLint focalizado sin advertencias. No se alteraron cobros ni credenciales reales.

El deploy de Preview del commitbd40f08 quedó READY en Vercel. La falta de variables ya no interrumpe el build; sigue siendo necesario habilitarlas en Preview para mostrar datos reales. Se excluyeron de ESLint únicamente los directorios generados de las pruebas de build (.next-no-supabase y .next-visual), manteniendo el análisis de código fuente.
