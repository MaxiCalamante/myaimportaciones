import type { Metadata } from "next";
import Link from "next/link";
import { ProductShowcase } from "@/components/commerce/product-showcase";
import { notFound } from "next/navigation";
import { ArrowLeft, ChevronRight, PackageCheck, ShieldCheck, Star, Truck } from "lucide-react";
import { getStorefrontData, getProductBySlug } from "@/lib/storefront";
import { ProductCard } from "@/components/commerce/product-card";
import { breadcrumbData, productMetadata, productStructuredData } from "@/lib/seo";
import { canonicalProductSlug, PRODUCT_CANONICAL_ALIASES } from "@/lib/seo-product-aliases";
import { getProductReviews } from "@/lib/product-reviews";
import { ProductReviewsSection } from "@/components/commerce/product-reviews-section";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ variant?: string }>;
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

  const requestedVariant = (await searchParams).variant;
  const initialVariantId = typeof requestedVariant === "string" ? product.variants?.find(variant => variant.isActive && variant.id === requestedVariant)?.id : undefined;

  const { categories, products } = await getStorefrontData({ categoryId: product.categoryId });
  const category = categories.find((c) => c.id === product.categoryId);
  const parent = categories.find(c => c.id === category?.parentId);
  const alternativeModel = product.specifications?.["Modelo alternativo"];
  const alternativeProduct = alternativeModel
    ? products.find((p) => p.id !== product.id && p.model === alternativeModel)
    : undefined;
  const relatedProducts = products
    .filter((p) => p.id !== product.id)
    .slice(0, 4);

  const { reviews, summary } = getProductReviews(product);

  const productJsonLd = productStructuredData(product);

  const breadcrumbJsonLd = breadcrumbData([
    { name: "Inicio", path: "/" },
    ...(parent ? [{ name: parent.name, path: "/catalogo?category=" + encodeURIComponent(parent.slug) }] : []),
    { name: product.categoryName, path: "/catalogo?category=" + (category?.slug || "") },
    { name: product.title, path: "/producto/" + product.slug },
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
          <Link href="/" className="hover:text-zinc-900 transition flex items-center gap-1">
            <ArrowLeft className="h-3.5 w-3.5" /> Inicio
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-zinc-300" />
          {parent && <><Link href={"/catalogo?category=" + encodeURIComponent(parent.slug)} className="hover:text-zinc-900 transition">{parent.name}</Link><ChevronRight className="h-3.5 w-3.5 text-zinc-300"/></>}
          <Link
            href={`/catalogo?category=${category?.slug || ""}`}
            className="hover:text-zinc-900 transition"
          >
            {product.categoryName}
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-zinc-300" />
          <span className="min-w-0 truncate font-medium text-zinc-900">{product.title}</span>
        </nav>

        {/* Product Showcase (Gallery + Interactive Info) */}
        <ProductShowcase
          key={`${product.id}:${initialVariantId || "default"}`}
          product={product}
          initialVariantId={initialVariantId}
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
                <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-semibold text-zinc-950 tracking-tight leading-tight">
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
            </>
          }
          afterInteractive={
            <>
              <details className="group rounded-2xl border border-zinc-200 bg-white px-4 sm:px-5">
                <summary className="flex min-h-14 cursor-pointer items-center justify-between gap-3 text-sm font-semibold text-zinc-900">Descripción del producto<ChevronRight className="size-4 shrink-0 text-zinc-400 transition-transform group-open:rotate-90"/></summary>
                <p className="whitespace-pre-line break-words pb-5 text-sm leading-7 text-zinc-600">{product.description}</p>
              </details>
              {alternativeProduct && (
                <Link
                  href={`/producto/${alternativeProduct.slug}`}
                  className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-900 transition hover:bg-sky-100"
                >
                  Ver otra versión: {alternativeProduct.title}
                </Link>
              )}
              {Object.entries(product.specifications ?? {}).filter(([k, v]) => v && !k.startsWith("_seo_")).length > 0 && (
                <dl className="mt-6 divide-y divide-zinc-200 rounded-2xl border border-zinc-200 bg-white px-4">
                  {Object.entries(product.specifications ?? {})
                    .filter(([k, v]) => v && !k.startsWith("_seo_"))
                    .map(([k, v]) => (
                      <div key={k} className="grid min-w-0 gap-1 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] sm:gap-4">
                        <dt className="text-sm font-semibold text-zinc-800">{k.replaceAll("_", " ")}</dt>
                        <dd className="whitespace-pre-line break-words text-sm leading-6 text-zinc-600">{v}</dd>
                      </div>
                    ))}
                </dl>
              )}
              {product.warrantyTerms && <p className="mt-4 text-sm">Garantía: {product.warrantyTerms}</p>}

              <div className="pt-4 border-t border-zinc-200 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-zinc-600">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span>Condiciones y garantía informadas en la ficha</span>
                </div>
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 shrink-0 text-sky-600" />
                  <span>Envíos a todo el país desde Tandil</span>
                </div>
              </div>
            </>
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
              Productos Relacionados en {product.categoryName}
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
