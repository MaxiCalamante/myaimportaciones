import { redirect } from "next/navigation";
import {
  CategoryStrip,
  ProductSection,
  RetailHighlights,
  StoreHero,
} from "@/components/commerce/storefront-sections";
import { getStorefrontData } from "@/lib/storefront";
import { TrustGuaranteeBadges } from "@/components/commerce/trust-guarantee-badges";

export default async function Home({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { category } = await searchParams;
  if (category) redirect(`/catalogo?category=${encodeURIComponent(category)}`);

  const { categories, products } = await getStorefrontData();
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
    <StoreHero />
    <RetailHighlights />
    <CategoryStrip categories={categories} />
    <ProductSection eyebrow="Selección especial" id="catalogo" products={featuredProducts} title="Productos destacados" />
    <ProductSection eyebrow="Explorá la tienda" id="ofertas" products={discoveryProducts} title="Más para descubrir" />
    <TrustGuaranteeBadges />
  </>;
}
