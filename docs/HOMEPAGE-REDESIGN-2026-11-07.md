# Rediseño Premium de la Home y Navegación — 07/11/2026

Implementación del rediseño UI/UX de la página principal y la navegación de MYA Importaciones, tomando como referencia de experiencia de compra a Atacado Connect (particularmente su categoría Beleza & Cuidado), preservando la identidad comercial, la taxonomía persistente y los sistemas de proveedores de MYA.

## 1. Organización en Tres Grandes Rubros
Se implementó una capa de agrupación visual en `src/lib/category-groups.ts` sin alterar las tablas ni las rutas indexadas:
- **Belleza y Cuidado**: Agrupa Cosmética coreana y facial (`cosmetica-coreana`), Cuidado capilar (`cuidado-capilar`) y Perfumería & Fragancias (`perfumeria`).
- **Tecnología y Electrónica**: Dispositivos y smartphones (`electronica`), audio y accesorios.
- **Herramientas y Equipamiento**: Herramientas profesionales e industriales Total Tools y Wadfow (`herramientas-equipamiento`).

## 2. Header y Navegación
- **Top bar**: Muestra el aviso de envíos nacionales, el cotizador en vivo del dólar MYA y acceso a atención por WhatsApp.
- **Buscador protagonista**: Campo centralizado de alta visibilidad con sugerencias instantáneas por producto, marca y modelo.
- **Mega Menú en Desktop**: Paneles organizados en 3 columnas por subgrupo con accesos directos y enlaces para explorar el catálogo completo.
- **Drawer Mobile**: Navegación lateral adaptativa con acordeones fluidos, tarjeta destacada para el canal mayorista y acceso rápido a cuenta y favoritos.

## 3. Cotización del Dólar
- Indicador transparente: `USD 1 = $X ARS (Dólar Blue venta) · Act. HH:mm`.
- Toma los datos del sistema monetario persistente (`CurrencyContext` / `DolarAPI`) con hora oficial de Argentina.
- No altera los precios comerciales en ARS, ni la moneda de cobro de checkout.

## 4. Vitrina de la Home
1. Hero principal con banners y llamadas comerciales (*"Explorar belleza"*, *"Ver tecnología"*, *"Comprar herramientas"*).
2. Franja de beneficios: Envíos Correo Argentino, Minorista/Mayorista, Atención personalizada de Máximo y Agustina, Garantía oficial.
3. Tarjetas interactivas de los 3 grandes rubros.
4. Selección destacada de temporada.
5. Bloque protagonista de Belleza y Cuidado (K-Beauty, Kérastase, Lattafa).
6. Bloque de Tecnología y Electrónica.
7. Bloque de Herramientas Total Tools & Wadfow.
8. Bloque de compras para revendedores con mínimo flexible ($100.000 o 5 unidades).
9. Bloque de confianza y garantías con retiro en Tandil y atención directa.
10. Preguntas frecuentes y marcado estructurado Schema.org.

## 5. Verificación
- 423 / 423 pruebas pasando sin fallas (`npm test`).
- Verificación estricta de TypeScript aprobada (`npm run type-check`).
- Compilación de producción Turbopack completada exitosamente (`npm run build`).
- Capturas de pantalla realizadas en 5 resoluciones responsive (1920x1080, 1440x900, 768x1024, 390x844, 360x800).
