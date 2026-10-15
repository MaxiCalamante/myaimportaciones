import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { CartDrawer } from "@/components/commerce/cart-drawer";
import { CommerceProvider } from "@/components/commerce/commerce-provider";
import { ProductDetailsModal } from "@/components/commerce/product-details-modal";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { getCurrentProfile } from "@/lib/auth";
import { getStorefrontData } from "@/lib/storefront";
import { siteConfig } from "@/lib/site";
import { WhatsAppFloatingButton } from "@/components/commerce/whatsapp-button";
import { WhatsAppContactModal } from "@/components/commerce/whatsapp-modal";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { AnalyticsConsent } from "@/components/analytics/consent";
import { MarketingScripts } from "@/components/analytics/marketing-scripts";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.appUrl),
  title: {
    default: siteConfig.shareTitle,
    template: "%s | MyA importaciones",
  },
  description: siteConfig.description,
  keywords: [
    "MyA importaciones",
    "MYA Importaciones",
    "MYA Tandil",
    "Tienda online importaciones Argentina",
    "Cosmética Coreana Argentina",
    "K-Beauty Argentina",
    "Skincare Coreano Original",
    "Skincare Coreano Tandil",
    "SKIN1004 Madagascar Centella",
    "Medicube Collagen",
    "Dr Althea 345 Relief Cream",
    "Celimax Noni Energy",
    "Anua Heartleaf",
    "Beauty of Joseon",
    "Karseell colágeno original",
    "Kérastase Argentina",
    "Shiseido Fino Premium Touch Hair Mask",
    "Victoria's Secret Body Mist original",
    "Herramientas Total Tools Argentina",
    "Herramientas Wadfow Tandil",
    "Taladros amoladoras herramientas a batería",
    "Apple iPhone Tandil",
    "Samsung Galaxy Argentina",
    "Smartphones tablets MacBook iMac",
    "Importaciones Tandil",
    "Envíos a todo el país",
    "Máximo y Agustina",
  ],
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/apple-icon.png",
  },
  openGraph: {
    type: "website",
    locale: "es_AR",
    url: siteConfig.appUrl,
    siteName: siteConfig.brandName,
    title: siteConfig.shareTitle,
    description: siteConfig.description,
    images: [
      {
        url: "/compartir",
        width: 1200,
        height: 630,
        alt: "MyA importaciones",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.shareTitle,
    description: siteConfig.description,
    images: ["/compartir"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

const orgJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: siteConfig.brandName,
  url: siteConfig.appUrl,
  logo: `${siteConfig.appUrl}/logo.png`,
  sameAs: [siteConfig.instagram],
  contactPoint: {
    "@type": "ContactPoint",
    telephone: siteConfig.phone,
    email: siteConfig.email,
    contactType: "sales",
    areaServed: "AR",
    availableLanguage: "es",
  },
};

const storeJsonLd = {
  "@context": "https://schema.org",
  "@type": ["Store", "OnlineStore"],
  name: siteConfig.brandName,
  alternateName: ["MYA Importaciones", "MyA Importaciones Tandil", "MYA Tienda"],
  url: siteConfig.appUrl,
  logo: `${siteConfig.appUrl}/logo.png`,
  image: `${siteConfig.appUrl}/compartir`,
  description: siteConfig.description,
  telephone: siteConfig.phone,
  email: siteConfig.email,
  priceRange: "$$",
  currenciesAccepted: "ARS",
  paymentAccepted: "Cash, Credit Card, Debit Card, Mercado Pago, Bank Transfer",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Tandil",
    addressRegion: "Buenos Aires",
    addressCountry: "AR",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: -37.32167,
    longitude: -59.13316,
  },
  areaServed: {
    "@type": "Country",
    name: "Argentina",
  },
  sameAs: [siteConfig.instagram],
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: siteConfig.brandName,
  url: siteConfig.appUrl,
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${siteConfig.appUrl}/catalogo?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { profile } = await getCurrentProfile();
  const { categories, products } = await getStorefrontData({ limit: 0 });

  return (
    <html
      lang="es"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(storeJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />

        <meta name="geo.region" content="AR-B" />
        <meta name="geo.placename" content="Tandil" />
        <meta name="geo.position" content="-37.32167;-59.13316" />
        <meta name="ICBM" content="-37.32167, -59.13316" />
      </head>
      <body className="min-h-full bg-slate-50 text-zinc-950">
        <a href="#contenido" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-xl focus:bg-white focus:px-5 focus:py-3 focus:font-bold focus:shadow-xl">Saltar al contenido</a>
        <CommerceProvider>
          <div className="storefront-shell flex min-h-screen flex-col">
            <SiteHeader initialCategories={categories} initialProducts={products} profile={profile} />
            <main id="contenido" tabIndex={-1} className="flex-1">{children}</main>
            <SiteFooter />
            <AnalyticsConsent />
          </div>
          <CartDrawer checkoutEnabled={process.env.COMMERCE_CHECKOUT_ENABLED === "true"} />
          <ProductDetailsModal />
          <WhatsAppFloatingButton />
          <WhatsAppContactModal />
          <MobileBottomNav signedIn={Boolean(profile)} />
          <Suspense fallback={null}>
            <MarketingScripts />
          </Suspense>
        </CommerceProvider>
      </body>
    </html>
  );
}

