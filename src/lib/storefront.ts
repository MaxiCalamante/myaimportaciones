import { readAllPages, readAllPagesParallel } from "@/lib/read-all-pages";
import { cache } from "react";
import { WHOLESALE_ENABLED, isExcludedCategory } from "@/lib/commerce-policy";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Product, StorefrontData } from "@/lib/types";

import { readAdminProducts } from "./admin-catalog-read";
import { getAdminClient } from "./admin-auth";
import { mapCategory, mapProduct, PUBLIC_PRODUCT_COLUMNS, type DbCategory, type DbProduct } from "./catalog-data";
import type { CatalogFacetProduct } from "./catalog-facets";
export { mapCategory, mapProduct } from "./catalog-data";
// Admin data is cached only within the current React request, after authorization.
export function invalidateAdminStorefrontCache(): void {}

export const getPublicFacetProducts = cache(async (): Promise<CatalogFacetProduct[]> => {
  if (!hasSupabaseConfig()) return [];
  const db = await createServerSupabaseClient();
  return readAllPages((from, to) => db.from("products").select("category_id,brand,model")
    .eq("is_active", true).eq("is_wholesale_only", false).order("id").range(from, to));
});

export const getStorefrontData = cache(async function getStorefrontData(options?: {
  categoryId?: string;
  admin?: boolean;
  limit?: number;
  all?: boolean;
}): Promise<StorefrontData> {
  if (!hasSupabaseConfig()) return { categories: [], products: [], source: "demo", error: "La tienda está en preparación. Consultanos por WhatsApp." };
  const supabase = options?.admin ? await getAdminClient() : await createServerSupabaseClient();

  // Run category listing and total product count concurrently
  const [categoriesRes, countRes] = await Promise.all([
    supabase
      .from("categories")
      .select(
        "id, name, slug, parent_id, description, image_url, is_wholesale_only, display_order",
      )
      .order("display_order", { ascending: true }),
    options?.admin
      ? supabase.from("products").select("id", { count: "exact", head: true })
      : Promise.resolve({ count: null }),
  ]);

  if (categoriesRes.error || ("error" in countRes && countRes.error)) {
    if (options?.admin) throw new Error("No se pudo leer el catálogo administrativo.");
    return { categories: [], products: [], source: "supabase", error: "No pudimos cargar el catálogo. Probá nuevamente o consultanos." };
  }
  const categoriesData = categoriesRes.data;
  const totalCount = countRes.count ?? 0;

  const buildProductsQuery = () => {
    let query = supabase
      .from("products")
      .select(
        options?.admin
          ? "*, categories(name)"
          : `${PUBLIC_PRODUCT_COLUMNS}, categories(name)`,
      );
    if (!options?.admin) query = query.eq("is_active", true);

    if (!WHOLESALE_ENABLED && !options?.admin) query = query.eq("is_wholesale_only", false);
    if (options?.categoryId) {
      const childIds = ((categoriesData ?? []) as unknown as DbCategory[])
        .filter((c) => c.parent_id === options.categoryId)
        .map((c) => c.id);

      if (childIds.length > 0) {
        query = query.in("category_id", [options.categoryId, ...childIds]);
      } else {
        query = query.eq("category_id", options.categoryId);
      }
    }

    return query
      .order("is_featured", { ascending: false })
      .order("created_at", { ascending: false }).order("id");
  };

  let productsData: unknown[];
  if (options?.admin) {
    productsData = await readAllPagesParallel((from, to) => readAdminProducts(supabase, { from, size: to - from + 1 }), totalCount, 1000);
    productsData = productsData.map(row => ({ ...(row as DbProduct), categories: { name: categoriesData?.find(c => c.id === (row as DbProduct).category_id)?.name ?? "Catálogo" } }));
  }
  else if (options?.all) productsData = await readAllPages((from, to) => buildProductsQuery().range(from, to));
  else if (options?.limit === 0) productsData = [];
  else {
    const result = await buildProductsQuery().limit(options?.limit ?? 24);
    if (result.error) return { categories: (categoriesData ?? []).map(c => mapCategory(c)), products: [], source: "supabase", error: "No pudimos cargar los productos. Probá nuevamente." };
    productsData = result.data ?? [];
  }
  const categories = ((categoriesData ?? []) as unknown as DbCategory[]).map(c => mapCategory(c, options?.admin));
  const excluded = new Set(categories.filter(c => isExcludedCategory(c.slug)).map(c => c.id));
  categories.forEach(c => { if (c.parentId && excluded.has(c.parentId)) excluded.add(c.id); });
  const products = (productsData as DbProduct[]).map(p => mapProduct(p, options?.admin)).filter(p => options?.admin || !excluded.has(p.categoryId));

  const result: StorefrontData = {
    categories: options?.admin ? categories : categories.filter(c => !c.wholesaleOnly && !excluded.has(c.id)),
    products,
    source: "supabase",
  };

  return result;
});

export async function getProductBySlug(slug: string): Promise<Product | null> {
  if (!hasSupabaseConfig()) {
    return null;
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      `${PUBLIC_PRODUCT_COLUMNS}, categories(name, slug)`,
    )
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data || (!WHOLESALE_ENABLED && data.is_wholesale_only) || isExcludedCategory((Array.isArray(data.categories) ? data.categories[0] : data.categories)?.slug ?? "")) return null;

  return mapProduct(data as unknown as DbProduct);
}
