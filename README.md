# MYA Importaciones - E-Commerce Oficial

Plataforma oficial de comercio electrónico de **MYA Importaciones** (Argentina). Especialistas en importación directa y distribución mayorista y minorista de Cosmética Coreana original (K-Beauty), smartphones liberados Apple iPhone y herramientas profesionales de equipamiento.

## ✨ Características Principales

- **Doble Modalidad Minorista & Mayorista (B2B)**: Experiencia de compra minorista ágil y portal mayorista con precios diferenciales por bulto/volumen y calculadora de pedidos.
- **Catálogo Real Integrado**: Conexión nativa con Supabase (PostgreSQL, Storage y Auth).
- **SEO de Nueva Generación**: Fichas dinámicas `/producto/[slug]` con metadatos SSR, OpenGraph, Twitter Cards y datos estructurados Schema.org (`Product`, `BreadcrumbList`, `Organization`).
- **Sitemap & Robots**: Generación dinámica en `/sitemap.xml` y `/robots.txt`.
- **Integraciones de Contacto**: Botón flotante de WhatsApp, enlaces a Instagram (`@_myaimportaciones`) y checkout con datos bancarios (Alias/CBU) y confirmación directa por WhatsApp.
- **Panel Administrativo Completo (`/admin`)**:
  - Control de catálogo (productos, categorías, stock, imágenes).
  - Carga masiva de productos vía CSV.
  - Gestión de roles de usuario (Admin / Cliente / Mayorista Aprobado).
  - Gestión interactiva de estados de pedidos en tiempo real.

## 🛠️ Stack Tecnológico

- **Framework**: Next.js 15 (App Router, Turbopack)
- **Lenguaje**: TypeScript
- **Estilos**: Tailwind CSS & Lucide Icons
- **Backend & Base de Datos**: Supabase (PostgreSQL, Auth, Storage, RLS)
- **Deploy**: Vercel

## 🚀 Despliegue en Vercel

1. En tu panel de [Vercel](https://vercel.com/), conecta tu repositorio de GitHub `MaxiCalamante/myaimportaciones`.
2. En la sección **Environment Variables**, configura las siguientes variables:

```bash
NEXT_PUBLIC_SITE_URL=https://myaimportaciones.vercel.app
NEXT_PUBLIC_SUPABASE_URL=https://gqcdurxndbeeugjfworx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_de_supabase
```

3. Haz clic en **Deploy**. ¡Listo!

## 💻 Desarrollo Local

```bash
# Instalar dependencias
npm install

# Correr servidor de desarrollo
npm run dev

# Compilar para producción
npm run build
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

