import { cache } from "react";
import { getPublicNavigation, getStorefrontData } from "./storefront";

/** Published catalog only. Used by both the editorial visuals and the quote gallery. */
export const getWholesaleSelection = cache(async (categorySlug: string, brand?: string) => {
  const { categories } = await getPublicNavigation();
  const category = categories.find(item => item.slug === categorySlug);
  if (!category) return [];
  const { products, error } = await getStorefrontData({ categoryId: category.id, brand, limit: 6 });
  return error ? [] : products;
});
