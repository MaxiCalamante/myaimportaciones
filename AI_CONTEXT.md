# AI Context: MYA Importaciones

> **Documento de Contexto Maestro (Single Source of Truth)** para modelos de Inteligencia Artificial y desarrolladores que operen sobre el proyecto **MYA Importaciones**. Contiene el modelo de negocio completo, la arquitectura de software, infraestructura de base de datos, políticas comerciales, integraciones de pago y logística.

---

## 1. Resumen Ejecutivo & Identidad de Marca

* **Nombre Comercial**: MYA Importaciones
* **Titular & Fundador**: Máximo Calamante
* **Email Administrador**: `maximocalamante14@gmail.com`
* **WhatsApp Oficial**: `+54 9 249 463-8919` (`5492494638919`)
* **Sede Central & Depósito Físico**: Tandil, Provincia de Buenos Aires, Argentina (CP 7000)
* **Instagram**: [`@_myaimportaciones`](https://www.instagram.com/_myaimportaciones/)
* **Repositorio GitHub**: `https://github.com/MaxiCalamante/myaimportaciones.git` (Rama: `main`)

### Identidad Visual & Paleta Oficial
El diseño visual está armonizado directamente con el logo oficial (`/logo.png`):
1. **Celeste Argentino / Sky Blue** (`#0284c7` / `sky-600`): Importación directa hacia Argentina, botones de acción principal, selección de texto (`::selection`), pestañas activas e insignias de confianza.
2. **Dorado Sol de Mayo** (`#f59e0b` / `amber-500`): Representa el Sol de Mayo en la letra "Y" del logo. Usado en badges de ahorro frente a Mercado Libre (`-8% vs ML`), accesos mayoristas B2B, cupones promocionales y estrellas de calificación.
3. **Slate Grafito & Blanco Puro** (`#09090b`, `#f8fafc`, `#ffffff`): Fondo neutro moderno y tipografía de alto contraste con estética premium e-commerce.

---

## 2. Modelo de Negocio & Canales Comerciales

MYA Importaciones opera bajo un **modelo híbrido B2C y B2B**:

### A. Canal Minorista (B2C)
* **Público objetivo**: Consumidores finales en toda la Argentina que buscan cosmética coreana original (tendencia viral en TikTok/Instagram) y herramientas industriales de alta calidad para el hogar, taller o profesionales.
* **Propuesta de valor**:
  * Productos 100% originales sellados con lote y QR.
  * Despacho express desde Tandil en 24hs (sin demoras de aduana).
  * Precio entre un **7.5% y 8% más barato que en Mercado Libre** (`-8% vs ML`).
  * 10% OFF extra abonando con transferencia directa o efectivo.
  * Factura oficial A o B con IVA discriminado.

### B. Canal Mayorista & Revendedores (B2B)
* **Ruta**: `/mayorista`
* **Público objetivo**: Comercios, ferreterías, salones de belleza, cosmetólogas y emprendedores de reventa.
* **Mínimo de compra mayorista**: \$100.000 por orden o cumplimiento de cantidades mínimas por bulto (`wholesaleMinQuantity`).
* **Margen de reventa**: Permite a los revendedores obtener entre un **40% y 50% de ganancia neta** al revender al precio sugerido al público (PVP).
* **Herramientas de conversión B2B**:
  * **Kits de Inicio**: Pack Emprendedora K-Beauty, Pack Ferretería Total Pro, Pack Salón Karseell x6.
  * **Generador de Presupuestos Formales (Factura Proforma PDF)**: Cotización formal con membrete oficial, validez por 7 días y opción de descarga directa o envío por WhatsApp.
  * **Exportador de Lista de Difusión**: Generación en 1 clic de lista con formato Markdown para WhatsApp Business.

---

## 3. Proveedores Oficiales & Catálogo Verificado

El catálogo comercial proviene exclusivamente de 2 proveedores oficiales directos:

1. **Total Tools Paraguay** ([Sitio Oficial](https://www.totalherramientasoficial.com.py/home))
   * **Marcas**: *Total Tools* y *Wadfow Industrial*.
   * **Categorías**: Taladros, amoladoras, rotomartillos, herramientas a batería de 20V (sistema P20S con batería compartida), compresores, valijas y juegos de llaves.
   * **Garantía**: Disponibilidad de repuestos oficiales y servicio postventa.

2. **Atacado USA Cosméticos** ([Sitio Oficial](https://atacadousa.com.py/20-cosmeticos))
   * **Marcas**: *SKIN1004*, *Medicube*, *Dr. Althea*, *Celimax*, *Karseell*.
   * **Categorías**: Sérums de Centella Asiática, cremas hidratantes, exfoliantes BHA, mascarillas capilares de colágeno, ampollas PDRN y Exosome Shot.

> **Regla de Catálogo**: No existen ni deben añadirse productos de telefonía móvil (Apple, Xiaomi, Samsung celulares), ya que fueron completamente purgados para enfocar el negocio en K-Beauty y Herramientas Industriales.

---

## 4. Estructura de Precios, Márgenes & Cupones

### Regla de Calibración de Precios vs Mercado Libre
* **Multiplicador de referencia ML**: `PVP * 1.08`
* **Ahorro al comprador**: ~7.5% - 8% más económico que el precio promedio de Mercado Libre, ofreciendo un fuerte incentivo para comprar directo en la tienda propia de MYA.

### Descuentos Automáticos Acumulables
1. **Descuento por Transferencia Bancaria**: 10% OFF aplicado al subtotal en checkout (`transferDiscountPercentage = 10`).
2. **Descuento Progresivo por Volumen**:
   * 2 unidades minoristas: 5% OFF extra.
   * 3 o más unidades minoristas: 8% OFF extra.

### Motor de Cupones Promocionales (`src/lib/coupons.ts`)
| Código | Tipo | Beneficio | Condiciones |
| :--- | :--- | :--- | :--- |
| `BIENVENIDO10` | Porcentaje | 10% OFF | Mínimo \$15.000 (Tope \$25.000) |
| `TANDIL` | Monto Fijo | \$2.500 OFF (Envío local gratis) | Mínimo \$10.000 |
| `MYA5` | Porcentaje | 5% OFF | Sin mínimo de compra |
| `KBEAUTY8` | Porcentaje | 8% OFF en K-Beauty | Mínimo \$25.000 (Minorista) |
| `COMERCIO15` | Porcentaje | 15% OFF | Compras mayores a \$150.000 |

---

## 5. Infraestructura Bancaria & Pasarelas de Pago

### Datos Oficiales para Transferencia Inmediata
* **Billetera / Banco**: Mercado Pago
* **CVU**: `0000003100045616945389`
* **Alias**: `MYA.IMPORTACIONES.MP`
* **Titular**: Máximo Calamante
* **Email**: `maximocalamante14@gmail.com`
* **Descuento por método**: 10% OFF automático. Al confirmar, el cliente recibe botones para copiar CVU/Alias y un botón directo a WhatsApp con el comprobante y el N° de orden `#ORD-XXXXX`.

### Procesamiento de Tarjetas de Crédito y Débito
* **Integración**: API de Preferencias de Mercado Pago (`https://api.mercadopago.com/checkout/preferences`) vía `src/lib/mercadopago.ts`.
* **Webhook**: `src/app/api/mercadopago/webhook/route.ts` escucha eventos de pago y actualiza el pedido en Supabase a estado `paid`.
* **Formulario UI**: Formateo inteligente con espaciado cuádruple, detección de emisor (*Visa, Mastercard, AMEX, Cabal, Naranja X*), expiración `MM/AA`, código CVV, DNI y planes de cuotas (1 cuota contado, 3 cuotas, 6 cuotas fijas).
* **Modo Seguro**: Si `MERCADOPAGO_ACCESS_TOKEN` no está configurado en producción, el sistema activa un fallback simulado que previene bloqueos de checkout.

---

## 6. Motor de Logística & Envíos en Tiempo Real

Implementado en `src/lib/shipping.ts`:
* **Sede de Despacho**: Tandil, Buenos Aires.
* **Opciones Disponibles**:
  1. **Retiro en Depósito Central Tandil**: Gratis ($0).
  2. **Moto Express Tandil**: \$2.500 (Entrega en el día / 24 hs).
  3. **Correo Argentino a Sucursal**: Calculado por código postal o localidad.
  4. **Correo Argentino a Domicilio**: Entrega puerta a puerta.
  5. **Andreani Express**: Logística prioritaria nacional.
* **Envío Bonificado (Gratis)**: Automático a partir de **\$120.000**.
* **Detección Rápida de Ciudades**: Reconoce códigos postales numéricos de 4 dígitos (ej: `7000`, `1425`), códigos CPA (`B7000ABC`) o nombres directos (`Tandil`, `CABA`, `Rosario`, `Córdoba`, `Mendoza`).
* **Seguimiento (`/seguimiento`)**: Timeline interactivo de 5 pasos (`pending` ➔ `paid` ➔ `processing` ➔ `shipped` ➔ `delivered`) con accesos directos al rastreador web de Correo Argentino y Andreani cuando la orden ya cuenta con guía.

---

## 7. Marketing Digital, Píxeles & Catálogos Publicitarios

### Feeds Automáticos para Campañas Publicitarias
1. **Google Merchant Center**: `https://myaimportaciones.com/api/catalog/google-feed`
   * Formato XML RSS 2.0 con especificación oficial de Google Shopping (`g:id`, `g:title`, `g:description`, `g:price`, `g:availability`, `g:brand`, `g:condition`).
2. **Meta Ads & Instagram Shopping**: `https://myaimportaciones.com/api/catalog/meta-feed`
   * Formato XML optimizado para catálogo dinámico de Facebook/Instagram.

### Dispatcher de Eventos de Píxeles (`src/lib/analytics.ts` & `marketing-scripts.tsx`)
* Dispara eventos estándar en simultáneo a:
  * **Meta Pixel (`fbq`)**: `PageView`, `ViewContent`, `AddToCart`, `InitiateCheckout`, `Purchase`.
  * **Google Ads / GA4 (`gtag`)**: `page_view`, `view_item`, `add_to_cart`, `begin_checkout`, `purchase`.
  * **TikTok Pixel (`ttq`)**: `Pageview`, `ViewContent`, `AddToCart`, `InitiateCheckout`, `CompletePayment`.

---

## 8. Arquitectura de Software & Stack Técnico

* **Framework**: Next.js 16.2.9 (Turbopack habilitado) con App Router.
* **Lenguaje**: TypeScript 5.x.
* **Estilos**: Tailwind CSS v4 (`@import "tailwindcss"` en `globals.css`).
* **Iconografía**: `lucide-react`.
* **Autenticación & Base de Datos**: Supabase (PostgreSQL).
* **Gestión de Estado**: `CommerceProvider` (`src/components/commerce/commerce-provider.tsx`) para carrito persistido, favoritos, cálculo de envíos y modales.

### Estructura de Directorios Clave
```
Tienda WEB/
├── public/
│   ├── logo.png                # Logo oficial con Sol de Mayo
│   └── products/               # Catálogo de imágenes WebP en alta calidad
├── src/
│   ├── app/
│   │   ├── admin/              # Panel de control de Máximo Calamante
│   │   ├── api/
│   │   │   ├── catalog/        # Feeds para Google y Meta Ads
│   │   │   ├── mercadopago/    # Webhook de pagos
│   │   │   └── search/         # Búsqueda server-side
│   │   ├── checkout/           # Checkout completo
│   │   ├── mayorista/          # Portal B2B de compras por bulto
│   │   ├── producto/[slug]/    # Ficha de producto interactiva + Schema
│   │   ├── seguimiento/        # Tracker de envíos
│   │   ├── globals.css         # Tokens de diseño y paleta
│   │   ├── layout.tsx          # Layout raíz con schemas WebSite y Store
│   │   ├── page.tsx            # Portada principal minorista
│   │   ├── robots.ts           # Configuración para rastreadores
│   │   └── sitemap.ts          # Generador dinámico de sitemap.xml
│   ├── components/
│   │   ├── admin/              # Dashboard, Pricing Engine, Marketing Hub
│   │   ├── checkout/           # CheckoutPanel con cupones, tarjetas y CVU
│   │   ├── commerce/           # ProductCard, CartDrawer, Advisor, Starter Kits
│   │   ├── layout/             # SiteHeader, SiteFooter, MobileBottomNav
│   │   └── ui/                 # Button con variantes primary/accent
│   └── lib/
│       ├── coupons.ts          # Motor de cupones promocionales
│       ├── format.ts           # Formateo de moneda ARS y fechas
│       ├── mercadopago.ts      # Cliente API de preferencias MP
│       ├── shipping.ts         # Motor de cotización de envíos Correo/Andreani
│       ├── site.ts             # Configuración institucional (banco, contacto)
│       └── storefront.ts       # Consultas a la base de datos de productos
```

---

## 9. Base de Datos Supabase & Seguridad RLS

* **Proyecto Supabase**: `https://gqcdurxndbeeugjfworx.supabase.co`
* **Tablas Principales**:
  * `products`: Catálogo activo, títulos, descripciones, stock, `retail_price`, `wholesale_price`, `wholesale_min_quantity`, imágenes.
  * `categories`: Categorías padre e hijas (rubros y subcategorías).
  * `orders`: Registro de pedidos, estado (`pending`, `paid`, `processing`, `shipped`, `delivered`, `cancelled`), montos, dirección y notas.
  * `order_items`: Productos asociados a cada orden.
  * `profiles`: Perfiles de usuario y roles (`admin`, `customer`).

### Funciones Críticas PostgreSQL (RPC & RLS)
1. **`can_insert_order_item(order_id_input uuid)`**: Función con privilegios `SECURITY DEFINER` que permite a compradores anónimos/invitados registrar los ítems de su pedido sin violar las políticas de seguridad RLS.
2. **`decrement_product_stock(product_id uuid, qty integer)`**: Decrementa atómicamente el inventario de un producto tras registrar una compra exitosa.

---

## 10. Directrices para Sesiones de IA & Mantenimiento

1. **Compilación Obligatoria**: Antes de dar por finalizada cualquier tarea de código, siempre debe ejecutarse `npm run build` en el directorio `Tienda WEB` y confirmar 0 errores de compilación y 0 errores de TypeScript.
2. **Preservar CVU & Alias Oficiales**: Nunca modificar el CVU `0000003100045616945389` ni el Alias `MYA.IMPORTACIONES.MP` a menos que Máximo Calamante lo solicite explícitamente.
3. **Coherencia de Marca**: Mantener siempre la paleta Celeste Argentino (`sky-600`) + Sol de Mayo Dorado (`amber-500`) + Slate Neutro (`#f8fafc`). Evitar volver a introducir verdes arbitrarios no justificados.
4. **Respetar Proveedores Autorizados**: Solo incorporar productos que provengan de *Total Tools Paraguay* o *Atacado USA Cosméticos*.
5. **Precios Competitivos**: Los precios de venta al público siempre deben mantener la ventaja competitiva de ~7.5% - 8% menos que en Mercado Libre.
