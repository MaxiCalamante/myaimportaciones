import { WHOLESALE_PATHS } from "@/lib/wholesale-content";
import type { MetadataRoute } from "next";
import { getStorefrontData } from "@/lib/storefront";
import { deriveCatalogFacets } from "@/lib/catalog-facets";
import { publicUrl } from "@/lib/seo";
import { canonicalProductSlug, PRODUCT_CANONICAL_ALIASES } from "@/lib/seo-product-aliases";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { categories, products: catalog, error } = await getStorefrontData({ all: true });
  if (error) throw new Error("No se pudo generar el sitemap con el catálogo actual.");
  const products = catalog.filter(p => p.active && !p.wholesaleOnly);
  const bySlug = new Map(products.map(p => [p.slug, p]));
  const facets = deriveCatalogFacets(categories, products.map(p => ({ category_id: p.categoryId, brand: p.brand || null })));
  // Omit lastmod without a reliable date of a meaningful public-content change.
  return [
    ...["/", "/catalogo", "/condiciones", "/privacidad", ...WHOLESALE_PATHS].map(path => ({ url: publicUrl(path) })),
    ...facets.categories.map(category => ({ url: publicUrl('/catalogo?category=' + encodeURIComponent(category.slug)) })),
    ...facets.brands.map(({ brand }) => ({ url: publicUrl('/catalogo?brand=' + encodeURIComponent(brand)) })),
    ...products.filter(p => canonicalProductSlug(p, bySlug.get(PRODUCT_CANONICAL_ALIASES[p.slug])) === p.slug).map(product => ({ url: publicUrl('/producto/' + product.slug), images: product.imageUrl ? [publicUrl(product.imageUrl)] : undefined })),
  ];
}
