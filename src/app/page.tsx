import { WholesalePromo } from "@/components/wholesale/wholesale-landing";
import type { Metadata } from "next";
import { getPublicCarousel } from "@/lib/carousel-data";
import { EmptyCatalog } from "@/components/commerce/empty-catalog";
import { redirect } from "next/navigation";
import {
  CategoryStrip,
  ProductSection,
  RetailHighlights,
  StoreHero,
} from "@/components/commerce/storefront-sections";
import { TrustGuaranteeBadges } from "@/components/commerce/trust-guarantee-badges";
import { getStorefrontData, getPublicFacetProducts } from "@/lib/storefront";
import { deriveCatalogFacets } from "@/lib/catalog-facets";
import { StoreSeoFaq } from "@/components/commerce/store-seo-faq";
import { siteConfig } from "@/lib/site";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: siteConfig.shareTitle,
  description: siteConfig.description,
  path: "/",
  image: "/compartir?tipo=tienda",
});

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  if (category) redirect(`/catalogo?category=${encodeURIComponent(category)}`);

  const [{ categories, products, error }, slides] = await Promise.all([
    getStorefrontData(),
    getPublicCarousel(),
  ]);

  let navigationCategories = categories;
  try {
    navigationCategories = deriveCatalogFacets(
      categories,
      await getPublicFacetProducts()
    ).categories;
  } catch {
    /* Keep navigation usable if its optional counts cannot be loaded. */
  }

  const retailProducts = products.filter((product) => !product.wholesaleOnly);

  // 1. Featured products / Destacados
  const featuredProducts = [
    ...retailProducts.filter((product) => product.featured),
    ...retailProducts.filter((product) => !product.featured),
  ].slice(0, 4);

  const featuredIds = new Set(featuredProducts.map((product) => product.id));

  // 2. Three core rubros products
  const categoryById = new Map(categories.map((c) => [c.id, c]));

  const getRootSlug = (catId: string): string => {
    let cat = categoryById.get(catId);
    while (cat?.parentId) {
      const parent = categoryById.get(cat.parentId);
      if (!parent) break;
      cat = parent;
    }
    return cat ? cat.slug.toLowerCase() : "";
  };

  const isBeauty = (catId: string) => {
    const s = getRootSlug(catId);
    return (
      s.includes("cosmetica") ||
      s.includes("coreana") ||
      s.includes("capilar") ||
      s.includes("cabello") ||
      s.includes("perfume")
    );
  };

  const isTech = (catId: string) => {
    const s = getRootSlug(catId);
    return s.includes("electronica") || s.includes("smartphone");
  };

  const isTools = (catId: string) => {
    const s = getRootSlug(catId);
    return s.includes("herramienta") || s.includes("equipamiento");
  };

  const beautyProducts = retailProducts
    .filter((p) => isBeauty(p.categoryId))
    .slice(0, 4);

  const techProducts = retailProducts
    .filter((p) => isTech(p.categoryId))
    .slice(0, 4);

  const toolProducts = retailProducts
    .filter((p) => isTools(p.categoryId))
    .slice(0, 4);

  // 3. Discovery / Más para descubrir
  const shownIds = new Set([
    ...featuredIds,
    ...beautyProducts.map((p) => p.id),
    ...techProducts.map((p) => p.id),
    ...toolProducts.map((p) => p.id),
  ]);

  const remaining = retailProducts.filter((product) => !shownIds.has(product.id));

  const discoveryProducts = [
    ...remaining.filter(
      (product) => product.tags.includes("oferta") || product.tags.includes("pack")
    ),
    ...remaining.filter(
      (product) => !product.tags.includes("oferta") && !product.tags.includes("pack")
    ),
  ].slice(0, 4);

  return (
    <>
      {/* ── 1. Hero Principal ── */}
      {slides.length > 0 ? (
        <StoreHero slides={slides} />
      ) : (
        <header className="mx-auto max-w-7xl px-4 pt-10 text-center sm:px-6">
          <p className="text-xs font-bold uppercase tracking-widest text-sky-700">
            MyA importaciones · Tandil
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-zinc-950 sm:text-5xl">
            Encontrá lo que estás buscando
          </h1>
          <p className="mt-3 text-sm text-zinc-600">
            Belleza, tecnología y herramientas importadas con atención de Máximo y Agustina.
          </p>
        </header>
      )}

      {/* ── 2. Beneficios comerciales ── */}
      {retailProducts.length > 0 && <RetailHighlights />}

      {/* ── 3. Explorar por los 3 Grandes Rubros ── */}
      {retailProducts.length > 0 && (
        <CategoryStrip categories={navigationCategories} />
      )}

      {/* ── Empty catalog state (if DB unreachable or empty) ── */}
      {(error || !retailProducts.length) && <EmptyCatalog error={error} />}

      {/* ── 4. Novedades y Productos Destacados ── */}
      {retailProducts.length > 0 && (
        <ProductSection
          eyebrow="Selección de temporada"
          id="catalogo"
          products={featuredProducts}
          title="Productos destacados"
        />
      )}

      {/* ── 5. Universo Belleza y Cuidado (K-Beauty, Capilar, Perfumes) ── */}
      {beautyProducts.length > 0 && (
        <ProductSection
          eyebrow="Cosmética coreana, capilar y fragancias"
          id="belleza"
          products={beautyProducts}
          title="Belleza y Cuidado"
          href="/catalogo?category=cosmetica-coreana"
        />
      )}

      {/* ── 6. Tecnología y Electrónica ── */}
      {techProducts.length > 0 && (
        <ProductSection
          eyebrow="Smartphones, audio y accesorios"
          id="tecnologia"
          products={techProducts}
          title="Tecnología y Electrónica"
          href="/catalogo?category=electronica"
        />
      )}

      {/* ── 7. Herramientas y Equipamiento (Total Tools & Wadfow) ── */}
      {toolProducts.length > 0 && (
        <ProductSection
          eyebrow="Líneas profesionales e industriales"
          id="herramientas"
          products={toolProducts}
          title="Herramientas y Equipamiento"
          href="/catalogo?category=herramientas-equipamiento"
        />
      )}

      {/* ── 8. Más para descubrir ── */}
      {discoveryProducts.length > 0 && (
        <ProductSection
          eyebrow="Explorá la tienda"
          id="ofertas"
          products={discoveryProducts}
          title="Más para descubrir"
        />
      )}

      {/* ── 9. Venta Mayorista B2B ── */}
      <WholesalePromo />

      {/* ── 10. Confianza y Garantía ── */}
      <TrustGuaranteeBadges variant="full" />

      {/* ── 11. FAQ y SEO Storefront ── */}
      <StoreSeoFaq />
    </>
  );
}
