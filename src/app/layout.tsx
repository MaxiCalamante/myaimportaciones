import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { CartDrawer } from "@/components/commerce/cart-drawer";
import { CommerceProvider } from "@/components/commerce/commerce-provider";
import { ProductDetailsModal } from "@/components/commerce/product-details-modal";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { getCurrentProfile } from "@/lib/auth";
import { getPublicNavigation } from "@/lib/storefront";
import { siteConfig } from "@/lib/site";
import { pageMetadata, publicUrl, jsonLd } from "@/lib/seo";
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
  ...pageMetadata({ title: siteConfig.shareTitle, description: siteConfig.description, path: "/" }),
  metadataBase: new URL(publicUrl()),
  title: { default: siteConfig.shareTitle, template: "%s | MYA Importaciones" },
  icons: { icon: "/icon.png", shortcut: "/icon.png", apple: "/apple-icon.png" },
  verification: { google: process.env.GOOGLE_SITE_VERIFICATION || undefined },
};

const orgJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": publicUrl("/#organization"),
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
  const { categories, products } = await getPublicNavigation();

  return (
    <html
      lang="es-AR"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd(orgJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd(websiteJsonLd) }}
        />
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

