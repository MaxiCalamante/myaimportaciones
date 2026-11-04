import type { Category } from "./types";

export type BrandFacet = { brand: string; count: number };
export function catalogBrandKey(brand?: string | null) {
  return (brand ?? "").trim().normalize("NFC").toLocaleLowerCase("es");
}

export function catalogBrandLabels(values: (string | null | undefined)[]) {
  const labels = new Map<string, string>();
  const caseScore = (name: string) => Number(name !== name.toLocaleLowerCase("es")) + Number(name !== name.toLocaleUpperCase("es"));
  for (const value of values) {
    const label = value?.trim().normalize("NFC");
    if (!label) continue;
    const key = catalogBrandKey(label);
    const previous = labels.get(key);
    if (!previous || caseScore(label) > caseScore(previous) ||
      (caseScore(label) === caseScore(previous) && label < previous)) labels.set(key, label);
  }
  return labels;
}

export type CatalogFacetProduct = { category_id: string; brand: string | null; model?: string | null };

/** Use the complete public catalog, never a page of search results, for navigation. */
export function deriveCatalogFacets(categories: Category[], products: CatalogFacetProduct[]) {
  const byId = new Map(categories.map(category => [category.id, category]));
  const populated = new Set<string>();
  const counts = new Map<string, Map<string, number>>();
  const global = new Map<string, number>();
  const labels = catalogBrandLabels(products
    .filter(product => byId.has(product.category_id) && !byId.get(product.category_id)?.wholesaleOnly)
    .map(product => product.brand));
  for (const product of products) {
    const category = byId.get(product.category_id);
    if (!category || category.wholesaleOnly) continue;
    const ids = [category.id, ...(category.parentId ? [category.parentId] : [])];
    ids.forEach(id => populated.add(id));
    const key = catalogBrandKey(product.brand);
    if (!key) continue;
    global.set(key, (global.get(key) ?? 0) + 1);
    for (const id of ids) {
      const brands = counts.get(id) ?? new Map<string, number>();
      brands.set(key, (brands.get(key) ?? 0) + 1);
      counts.set(id, brands);
    }
  }
  const list = (brands: Map<string, number>): BrandFacet[] => [...brands]
    .map(([key, count]) => ({ brand: labels.get(key) ?? key, count })).sort((a, b) => a.brand.localeCompare(b.brand, "es"));
  return {
    // A valid category remains a page even when its last active product is removed.
    publicCategories: categories.filter(category => !category.wholesaleOnly),
    categories: categories.filter(category => populated.has(category.id) && !category.wholesaleOnly),
    brands: list(global),
    brandsByCategory: Object.fromEntries([...counts].map(([id, brands]) => [id, list(brands)])),
  };
}
