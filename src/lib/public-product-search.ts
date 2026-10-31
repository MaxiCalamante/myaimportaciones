import { cache } from "react";
import { createServerSupabaseClient } from "./supabase/server";
import { readAllPages } from "./read-all-pages";
import { rankProductSearch, type SearchProduct } from "./product-search";

type PublicSearchProduct = SearchProduct & { category_id: string };

// Only compact public fields: no descriptions, costs or supplier sources.
const getPublicSearchIndex = cache(async (): Promise<PublicSearchProduct[]> => {
  const db = await createServerSupabaseClient();
  return readAllPages((from, to) => db.from("products")
    .select("id,title,brand,model,sku,tags,category_id,product_variants(title,sku,is_active,options)")
    .eq("is_active", true).eq("is_wholesale_only", false).is("deleted_at", null)
    .order("id").range(from, to));
});

export async function searchPublicProductIds(query: string, categoryIds: string[]): Promise<string[]> {
  const ids = new Set(categoryIds);
  return rankProductSearch((await getPublicSearchIndex()).filter(p => ids.has(p.category_id)), query).map(p => p.id);
}
