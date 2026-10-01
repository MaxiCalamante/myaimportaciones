import { getPublicCarousel } from "@/lib/carousel-data";
import { EmptyCatalog } from "@/components/commerce/empty-catalog";
import { redirect } from "next/navigation";
import {
  CategoryStrip,
  ProductSection,
  RetailHighlights,
  StoreHero,
} from "@/components/commerce/storefront-sections";
import { getStorefrontData, getPublicFacetProducts } from "@/lib/storefront";
import { deriveCatalogFacets } from "@/lib/catalog-facets";
import { TrustGuaranteeBadges } from "@/components/commerce/trust-guarantee-badges";

export default async function Home({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { category } = await searchParams;
  if (category) redirect(`/catalogo?category=${encodeURIComponent(category)}`);

  const [{ categories, products, error }, slides] = await Promise.all([getStorefrontData(), getPublicCarousel()]);
  let navigationCategories = categories;
  try { navigationCategories = deriveCatalogFacets(categories, await getPublicFacetProducts()).categories; } catch { /* Keep navigation usable if its optional counts cannot be loaded. */ }
  const retailProducts = products.filter(product => !product.wholesaleOnly);
  const featuredProducts = [
    ...retailProducts.filter(product => product.featured),
    ...retailProducts.filter(product => !product.featured),
  ].slice(0, 4);
  const featuredIds = new Set(featuredProducts.map(product => product.id));
  const remaining = retailProducts.filter(product => !featuredIds.has(product.id));
  const discoveryProducts = [
    ...remaining.filter(product => product.tags.includes("oferta") || product.tags.includes("pack")),
    ...remaining.filter(product => !product.tags.includes("oferta") && !product.tags.includes("pack")),
  ].slice(0, 4);

  return <>
    {slides.length > 0 ? <StoreHero slides={slides} /> : <header className="mx-auto max-w-7xl px-4 pt-10 text-center sm:px-6"><p className="text-xs font-bold uppercase tracking-widest text-sky-700">MyA importaciones · Tandil</p><h1 className="mt-3 text-3xl font-bold tracking-tight text-zinc-950 sm:text-5xl">Encontrá lo que estás buscando</h1><p className="mt-3 text-sm text-zinc-600">Cosmética, cuidado capilar y herramientas con atención cercana.</p></header>}
    {retailProducts.length > 0 && <RetailHighlights />}
    {retailProducts.length > 0 && <CategoryStrip categories={navigationCategories} />}
    {(error || !retailProducts.length) && <EmptyCatalog error={error} />}
    {retailProducts.length > 0 && <ProductSection eyebrow="Selección especial" id="catalogo" products={featuredProducts} title="Productos destacados" />}
    {retailProducts.length > 0 && <ProductSection eyebrow="Explorá la tienda" id="ofertas" products={discoveryProducts} title="Más para descubrir" />}
    <TrustGuaranteeBadges />
  </>;
}
