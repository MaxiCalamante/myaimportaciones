import Link from "next/link";
import {
  CategoryStrip,
  ProductSection,
  RetailHighlights,
  StoreHero,
  TestimonialsSection,
} from "@/components/commerce/storefront-sections";
import { CatalogWithFilters } from "@/components/commerce/catalog-with-filters";
import { getStorefrontData } from "@/lib/storefront";
import { SmartBuyerAdvisor } from "@/components/commerce/smart-buyer-advisor";
import { ResellerStarterKits } from "@/components/commerce/reseller-starter-kits";
import { TrustGuaranteeBadges } from "@/components/commerce/trust-guarantee-badges";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const params = await searchParams;
  const selectedCategorySlug = params.category;

  const initialData = await getStorefrontData();
  const selectedCategory = selectedCategorySlug
    ? initialData.categories.find((c) => c.slug === selectedCategorySlug)
    : null;

  const { categories, products } = selectedCategory
    ? await getStorefrontData({ categoryId: selectedCategory.id })
    : initialData;

  const retailProducts = products.filter((product) => !product.wholesaleOnly);

  if (selectedCategory) {
    const categoryProducts = retailProducts;

    return (
      <div id="catalogo" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 scroll-mt-20">
        <div className="relative overflow-hidden rounded-2xl bg-zinc-950 text-white p-8 md:p-12 shadow-xl border border-zinc-800">
          <div className="relative z-10 max-w-2xl">
            <Link
              href="/"
              className="inline-flex items-center text-xs font-semibold uppercase tracking-wider text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              &larr; Volver al inicio
            </Link>
            <h1 className="mt-4 text-3xl font-extrabold sm:text-4xl md:text-5xl tracking-tight text-white">
              {selectedCategory.name}
            </h1>
            {selectedCategory.description && (
              <p className="mt-4 text-sm text-zinc-300 leading-relaxed max-w-xl">
                {selectedCategory.description}
              </p>
            )}
          </div>
          {selectedCategory.imageUrl && (
            <div
              className="absolute inset-0 bg-cover bg-center opacity-25 pointer-events-none"
              style={{ backgroundImage: `url(${selectedCategory.imageUrl})` }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/80 to-transparent pointer-events-none" />
        </div>

        <CatalogWithFilters products={categoryProducts} channel="retail" />
      </div>
    );
  }

  const featuredProducts = retailProducts
    .filter((product) => product.featured)
    .slice(0, 4);
  const offerProducts = retailProducts
    .filter((product) => product.tags.includes("oferta") || product.tags.includes("pack"))
    .slice(0, 4);

  return (
    <>
      <StoreHero />
      <RetailHighlights />
      <CategoryStrip categories={categories} />
      <SmartBuyerAdvisor products={products} />
      <ProductSection
        eyebrow="Selección Especial"
        id="catalogo"
        products={featuredProducts}
        title="Productos Destacados de Importación"
      />
      <ResellerStarterKits products={products} />
      <ProductSection
        eyebrow="Oportunidades & Ahorro"
        id="ofertas"
        products={offerProducts.length > 0 ? offerProducts : retailProducts.slice(0, 4)}
        title="Ofertas y Precios Especiales"
      />
      <TrustGuaranteeBadges />
      <TestimonialsSection />
    </>
  );
}

