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
    default: "MYA Importaciones | Cosmética Coreana y Herramientas Industriales",
    template: "%s | MYA Importaciones",
  },
  description: siteConfig.description,
  keywords: [
    "MYA Importaciones",
    "Cosmética Coreana Argentina",
    "K-Beauty Argentina",
    "Skincare Coreano Original",
    "SKIN1004",
    "Medicube",
    "Dr Althea",
    "Celimax",
    "Karseell colágeno",
    "Herramientas Total Tools",
    "Herramientas Wadfow",

    "Distribución mayorista y minorista",
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
    title: "MYA Importaciones | Cosmética Coreana y Herramientas Industriales",
    description: siteConfig.description,
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 1200,
        alt: "MYA Importaciones",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MYA Importaciones | Importación Directa",
    description: siteConfig.description,
    images: ["/og-image.png"],
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />

      </head>
      <body className="min-h-full bg-slate-50 text-zinc-950">
        <CommerceProvider>
          <div className="flex min-h-screen flex-col pb-16 md:pb-0">
            <SiteHeader initialCategories={categories} initialProducts={products} profile={profile} />
            <div className="bg-zinc-100 px-4 py-2 text-center text-xs"><a href="/arrepentimiento" className="underline">Botón de arrepentimiento</a></div><main className="flex-1">{children}</main>
            <SiteFooter />
            <AnalyticsConsent />
          </div>
          <CartDrawer />
          <ProductDetailsModal />
          <WhatsAppFloatingButton />
          <MobileBottomNav />
          <Suspense fallback={null}>
            <MarketingScripts />
          </Suspense>
        </CommerceProvider>
      </body>
    </html>
  );
}

