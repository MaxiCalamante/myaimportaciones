import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, ChevronRight, PackageCheck, ShieldCheck, Sparkles, Truck } from "lucide-react";
import { getStorefrontData, getProductBySlug } from "@/lib/storefront";
import { siteConfig } from "@/lib/site";
import { ProductDetailInteractive } from "@/components/commerce/product-detail-interactive";
import { ProductCard } from "@/components/commerce/product-card";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    return {
      title: "Producto no encontrado | MYA Importaciones",
      description: "El producto que buscas no está disponible en MYA Importaciones.",
    };
  }

  const title = `${product.title} | MYA Importaciones`;
  const description =
    product.description ||
    `Comprá ${product.title} al mejor precio minorista y mayorista en MYA Importaciones. Envíos a todo el país.`;

  const imageUrl = product.imageUrl?.startsWith("http")
    ? product.imageUrl
    : `${siteConfig.appUrl}${product.imageUrl}`;

  return {
    title,
    description,
    keywords: [
      product.title,
      product.categoryName,
      ...product.tags,
      "MYA Importaciones",
      "K-Beauty Argentina",
      "Distribución mayorista y minorista",
      "Herramientas Total Tools Wadfow",
      "Tecnología importada Argentina",
    ],
    openGraph: {
      title,
      description,
      url: `${siteConfig.appUrl}/producto/${product.slug}`,
      siteName: siteConfig.brandName,
      locale: "es_AR",
      type: "website",
      images: [
        {
          url: imageUrl,
          width: 800,
          height: 800,
          alt: product.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) {
    notFound();
  }

  const { categories, products } = await getStorefrontData({ categoryId: product.categoryId });
  const category = categories.find((c) => c.id === product.categoryId);
  const relatedProducts = products
    .filter((p) => p.id !== product.id)
    .slice(0, 4);

  const detectBrand = (title: string): string => {
    const t = title.toUpperCase();
    if (t.includes("TOTAL")) return "Total Tools";
    if (t.includes("WADFOW")) return "Wadfow Industrial";
    if (t.includes("MEDICUBE")) return "Medicube";
    if (t.includes("SKIN1004")) return "SKIN1004";
    if (t.includes("DR. ALTHEA") || t.includes("DR ALTHEA")) return "Dr. Althea";
    if (t.includes("CELIMAX")) return "Celimax";
    if (t.includes("KARSEELL")) return "Karseell";
    if (t.includes("IPHONE") || t.includes("APPLE")) return "Apple";
    return "MYA Importaciones";
  };

  const brandName = detectBrand(product.title);

  const productJsonLd = {
    "@context": "https://schema.org/",
    "@type": "Product",
    name: product.title,
    image: [product.imageUrl?.startsWith("http") ? product.imageUrl : `${siteConfig.appUrl}${product.imageUrl}`],
    description: product.description,
    sku: product.id,
    itemCondition: "https://schema.org/NewCondition",
    brand: {
      "@type": "Brand",
      name: brandName,
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.9",
      reviewCount: "38",
      bestRating: "5",
      worstRating: "1",
    },
    offers: {
      "@type": "Offer",
      url: `${siteConfig.appUrl}/producto/${product.slug}`,
      priceCurrency: "ARS",
      price: product.retailPrice,
      priceValidUntil: "2027-12-31",
      availability: product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: {
        "@type": "Organization",
        name: siteConfig.brandName,
      },
    },
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Inicio",
        item: siteConfig.appUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: product.categoryName,
        item: `${siteConfig.appUrl}/?category=${category?.slug || ""}`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: product.title,
        item: `${siteConfig.appUrl}/producto/${product.slug}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-xs sm:text-sm text-zinc-500 overflow-x-auto whitespace-nowrap">
          <Link href="/" className="hover:text-zinc-900 transition flex items-center gap-1">
            <ArrowLeft className="h-3.5 w-3.5" /> Inicio
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-zinc-300" />
          <Link
            href={`/?category=${category?.slug || ""}`}
            className="hover:text-zinc-900 transition"
          >
            {product.categoryName}
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-zinc-300" />
          <span className="font-semibold text-zinc-900 truncate max-w-xs">{product.title}</span>
        </nav>

        {/* Product Grid */}
        <div className="grid gap-10 lg:grid-cols-2">
          {/* Left Column: Image */}
          <div className="relative aspect-square overflow-hidden rounded-3xl border border-zinc-200/90 bg-white p-6 sm:p-8 shadow-xs flex items-center justify-center">
            <div className="relative h-full w-full">
              <Image
                src={product.imageUrl || "/placeholder-product.svg"}
                alt={product.title}
                fill
                priority
                className="object-contain transition-transform duration-300 hover:scale-105"
                sizes="(min-width: 1024px) 50vw, 100vw"
                quality={95}
              />
            </div>
            {product.featured && (
              <span className="absolute left-6 top-6 inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white shadow-md">
                <Sparkles className="h-3 w-3" /> Destacado
              </span>
            )}
          </div>

          {/* Right Column: Info & Actions */}
          <div className="flex flex-col justify-center space-y-6">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-800 ring-1 ring-inset ring-sky-600/20 uppercase tracking-wider">
                <PackageCheck className="h-3.5 w-3.5" /> {product.categoryName}
              </span>
              <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-extrabold text-zinc-950 tracking-tight leading-tight">
                {product.title}
              </h1>
              {product.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {product.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-600 capitalize"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <p className="text-sm sm:text-base leading-relaxed text-zinc-650">
              {product.description}
            </p>

            <ProductDetailInteractive product={product} />

            <div className="pt-4 border-t border-zinc-200 grid grid-cols-2 gap-4 text-xs text-zinc-500">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>Garantía Oficial de Importación</span>
              </div>
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-sky-600" />
                <span>Despacho Rápido Asegurado</span>
              </div>
            </div>
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="mt-16 pt-12 border-t border-zinc-200">
            <h2 className="text-2xl font-bold text-zinc-950 mb-6">
              Productos Relacionados en {product.categoryName}
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {relatedProducts.map((p) => (
                <ProductCard key={p.id} product={p} channel="retail" />
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
