import type { Metadata } from "next";
import Link from "next/link";
import { ProductShowcase } from "@/components/commerce/product-showcase";
import { notFound } from "next/navigation";
import { ArrowLeft, ChevronRight, PackageCheck, Star } from "lucide-react";
import { getStorefrontData, getProductBySlug } from "@/lib/storefront";
import { ProductCard } from "@/components/commerce/product-card";
import { breadcrumbData, productMetadata, productStructuredData } from "@/lib/seo";
import { canonicalProductSlug, PRODUCT_CANONICAL_ALIASES } from "@/lib/seo-product-aliases";
import { getProductReviews } from "@/lib/product-reviews";
import { ProductReviewsSection } from "@/components/commerce/product-reviews-section";
import { productDescriptionParagraphs, productDetailSummary } from "@/lib/product-detail-content";
import { WHOLESALE_ENABLED } from "@/lib/commerce-policy";
import { getPublicWholesaleOffers } from "@/lib/wholesale-v2-read";
import { classifyWholesaleRubro } from "@/lib/wholesale-pricing-engine";
import type { ProductChannel } from "@/lib/types";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ variant?: string; canal?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const alias = PRODUCT_CANONICAL_ALIASES[product.slug];
  const target = alias ? await getProductBySlug(alias) : undefined;
  return productMetadata(product, canonicalProductSlug(product, target || undefined));
}

export default async function ProductPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) {
    notFound();
  }

  const { categories, products } = await getStorefrontData({ categoryId: product.categoryId });
  const category = categories.find((c) => c.id === product.categoryId);
  const catSlug = category?.slug || "";
  const classification = classifyWholesaleRubro(product.title, catSlug, product.brand, product.retailPrice);
  const isWholesaleEligible = classification.isEligible && classification.rubro !== "ineligible";

  const sp = await searchParams;
  const requestedVariant = sp.variant;
  const initialVariantId = typeof requestedVariant === "string" ? product.variants?.find(variant => variant.isActive && variant.id === requestedVariant)?.id : undefined;
  const isWholesale = sp.canal === "mayorista" && isWholesaleEligible;
  const initialChannel: ProductChannel | undefined = isWholesale ? "wholesale" : undefined;
  const showIneligibleWholesaleNotice = sp.canal === "mayorista" && !isWholesaleEligible;

  let enrichedProduct = product;
  if (WHOLESALE_ENABLED && isWholesaleEligible) {
    const items = [
      { productId: product.id, variantId: null },
      ...(product.variants ?? []).filter(v => v.isActive).map(v => ({ productId: product.id, variantId: v.id }))
    ];
    try {
      const offers = await getPublicWholesaleOffers(items);
      const offerMap = new Map(offers.map(o => [`${o.productId}:${o.variantId ?? "base"}`, o]));
      enrichedProduct = {
        ...product,
        wholesaleOffer: product.wholesaleOffer ?? offerMap.get(`${product.id}:base`),
        variants: product.variants?.map(v => ({
          ...v,
          wholesaleOffer: v.wholesaleOffer ?? offerMap.get(`${product.id}:${v.id}`)
        }))
      };
    } catch {
      // Fallback to base product without dynamic offers
    }
  }
  const parent = categories.find(c => c.id === category?.parentId);
  const alternativeModel = product.specifications?.["Modelo alternativo"];
  const alternativeProduct = alternativeModel
    ? products.find((p) => p.id !== product.id && p.model === alternativeModel)
    : undefined;
  const relatedProducts = products
    .filter((p) => p.id !== product.id)
    .slice(0, 4);

  const { reviews, summary } = getProductReviews(product);
  const { intro, highlights } = productDetailSummary(product);
  const descriptionParagraphs = productDescriptionParagraphs(product.description);
  const specifications = Object.entries(product.specifications ?? {}).filter(([key,value]) => value && !key.startsWith("_seo_"));

  const productJsonLd = productStructuredData(product);

  const breadcrumbJsonLd = breadcrumbData([
    { name: isWholesale ? "Mayorista" : "Inicio", path: isWholesale ? "/mayorista" : "/" },
    ...(parent && !isWholesale ? [{ name: parent.name, path: "/catalogo?category=" + encodeURIComponent(parent.slug) }] : []),
    { name: product.categoryName, path: isWholesale ? "/mayorista" : "/catalogo?category=" + (category?.slug || "") },
    { name: product.title, path: "/producto/" + product.slug + (isWholesale ? "?canal=mayorista" : "") },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd).replace(/</g, "\\u003c") }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, "\\u003c") }}
      />

      <div data-product-page className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-8 lg:px-8">
        {/* Breadcrumb */}
        <nav aria-label="Ubicación del producto" className="mb-4 flex min-w-0 items-center gap-2 text-xs sm:text-sm text-zinc-500 overflow-x-auto whitespace-nowrap no-scrollbar [&>svg]:shrink-0">
          <Link href={isWholesale ? "/mayorista" : "/"} className={`hover:text-zinc-900 transition flex items-center gap-1 ${isWholesale ? "font-medium text-sky-800" : ""}`}>
            <ArrowLeft className="h-3.5 w-3.5" /> {isWholesale ? "Catálogo mayorista" : "Inicio"}
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-zinc-300" />
          {parent && !isWholesale && <><Link href={"/catalogo?category=" + encodeURIComponent(parent.slug)} className="hover:text-zinc-900 transition">{parent.name}</Link><ChevronRight className="h-3.5 w-3.5 text-zinc-300"/></>}
          <Link
            href={isWholesale ? "/mayorista" : `/catalogo?category=${category?.slug || ""}`}
            className="hover:text-zinc-900 transition"
          >
            {product.categoryName}
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-zinc-300" />
          <span className="min-w-0 truncate font-medium text-zinc-900">{product.title}</span>
        </nav>

        {showIneligibleWholesaleNotice && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/90 p-4 text-xs sm:text-sm text-amber-900 shadow-2xs">
            <PackageCheck className="size-5 shrink-0 text-amber-700 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-950">Este producto no forma parte del canal mayorista</p>
              <p className="mt-1 text-amber-800 leading-relaxed">
                Los dispositivos de telefonía, celulares y computación se comercializan exclusivamente al por menor con garantía y entrega asegurada. Podés explorar nuestro catálogo mayorista de cosmética, perfumería y herramientas en{" "}
                <Link href="/mayorista#catalogo" className="font-semibold underline underline-offset-2 text-amber-950 hover:text-amber-900">
                  /mayorista
                </Link>.
              </p>
            </div>
          </div>
        )}

        {/* Product Showcase (Gallery + Interactive Info) */}
        <ProductShowcase
          key={`${product.id}:${initialVariantId || "default"}:${initialChannel || "retail"}`}
          product={enrichedProduct}
          initialVariantId={initialVariantId}
          initialChannel={initialChannel}
          beforeInteractive={
            <>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-800 ring-1 ring-inset ring-sky-600/20 uppercase tracking-wider">
                    <PackageCheck className="h-3.5 w-3.5" /> {product.categoryName}
                  </span>
                  {summary.totalReviews > 0 && (
                  <a
                    href="#opiniones"
                    className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900 border border-amber-200/80 transition hover:bg-amber-100/80 cursor-pointer"
                  >
                    <Star className="size-3.5 fill-amber-400 text-amber-400" />
                    <span className="font-bold tabular-nums">{summary.averageRating.toFixed(1)}</span>
                    <span className="text-zinc-400">·</span>
                    <span className="text-amber-800 underline decoration-amber-300 underline-offset-2">
                      {summary.totalReviews} opiniones
                    </span>
                  </a>
                  )}
                </div>
                <h1 className="mt-3 text-balance text-2xl sm:text-3xl lg:text-4xl font-semibold text-zinc-950 tracking-tight leading-tight">
                  {product.title}
                </h1>
                <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-600">
                  {[["Marca", product.brand], ["Modelo", product.model], ["Código", product.sku]]
                    .filter(([, value]) => value)
                    .map(([label, value]) => (
                      <div key={label} className="min-w-0 break-words">
                        <dt className="inline font-semibold">{label}: </dt>
                        <dd className="inline">
                          {label === "Marca" ? (
                            <Link href={"/catalogo?brand=" + encodeURIComponent(value!)} className="text-sky-800 underline">
                              {value}
                            </Link>
                          ) : (
                            value
                          )}
                        </dd>
                      </div>
                    ))}
                </dl>
                {intro && <p className="mt-4 max-w-prose text-sm leading-7 text-zinc-600">{intro}</p>}
                {highlights.length > 0 && <dl className="mt-5 grid grid-cols-3 gap-3 border-y border-zinc-200 py-4">{highlights.map(([label,value]) => <div key={label} className="min-w-0"><dt className="break-words text-[11px] leading-5 text-zinc-500">{label.replaceAll("_", " ")}</dt><dd className="mt-1 break-words text-sm font-semibold text-zinc-900">{value}</dd></div>)}</dl>}

              </div>
            </>
          }
          afterInteractive={
            <section id="detalles-producto" className="scroll-mt-44 rounded-3xl border border-zinc-200/80 bg-white p-5 sm:p-8" aria-label="Información del producto">
              <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-10">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-sky-800">Conocé el producto</p>
                  <h2 className="mt-2 text-xl font-semibold tracking-tight text-zinc-950">Descripción y uso</h2>
                  <div className="mt-4 space-y-4 text-sm leading-7 text-zinc-600">{descriptionParagraphs.length ? descriptionParagraphs.map((paragraph,index) => <p key={index} className="whitespace-pre-line break-words">{paragraph}</p>) : <p>Consultanos por los detalles de este producto antes de comprar.</p>}</div>
                  {alternativeProduct && <Link href={`/producto/${alternativeProduct.slug}`} className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-sky-800 underline underline-offset-4">Ver otra versión: {alternativeProduct.title}</Link>}
                </div>
                {specifications.length > 0 && <section aria-labelledby="product-specifications" className="min-w-0">
                  <h2 id="product-specifications" className="text-xl font-semibold tracking-tight text-zinc-950">Ficha técnica</h2>
                  <dl className="mt-4 divide-y divide-zinc-200 border-y border-zinc-200">{specifications.map(([label,value]) => <div key={label} className="grid min-w-0 gap-1 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] sm:gap-4"><dt className="break-words text-sm font-medium text-zinc-800">{label.replaceAll("_", " ").replace(/ por el proveedor/gi, "")}</dt><dd className="whitespace-pre-line break-words text-sm leading-6 text-zinc-600">{value}</dd></div>)}</dl>
                </section>}
              </div>
            </section>
          }
        />

        {/* Customer Verified Reviews Section */}
        <ProductReviewsSection
          reviews={reviews}
          summary={summary}
          productTitle={product.title}
        />

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="mt-16 pt-12 border-t border-zinc-200">
            <h2 className="text-2xl font-bold text-zinc-950 mb-6">
              Seguí explorando {product.categoryName.toLocaleLowerCase("es-AR")}
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">
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
