import type { Category } from "./types";

export type BrandFacet = { brand: string; count: number };
export type CatalogFacetProduct = { category_id: string; brand: string | null };

/** Use the complete public catalog, never a page of search results, for navigation. */
export function deriveCatalogFacets(categories: Category[], products: CatalogFacetProduct[]) {
  const byId = new Map(categories.map(category => [category.id, category]));
  const populated = new Set<string>();
  const counts = new Map<string, Map<string, number>>();
  const global = new Map<string, number>();
  for (const product of products) {
    const category = byId.get(product.category_id);
    if (!category || category.wholesaleOnly) continue;
    const ids = [category.id, ...(category.parentId ? [category.parentId] : [])];
    ids.forEach(id => populated.add(id));
    if (!product.brand) continue;
    global.set(product.brand, (global.get(product.brand) ?? 0) + 1);
    for (const id of ids) {
      const brands = counts.get(id) ?? new Map<string, number>();
      brands.set(product.brand, (brands.get(product.brand) ?? 0) + 1);
      counts.set(id, brands);
    }
  }
  const list = (brands: Map<string, number>): BrandFacet[] => [...brands]
    .map(([brand, count]) => ({ brand, count })).sort((a, b) => a.brand.localeCompare(b.brand, "es"));
  return {
    categories: categories.filter(category => populated.has(category.id) && !category.wholesaleOnly),
    brands: list(global),
    brandsByCategory: Object.fromEntries([...counts].map(([id, brands]) => [id, list(brands)])),
  };
}
