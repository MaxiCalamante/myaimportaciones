import {projectUsdProducts} from '@/lib/monetary';
import { PUBLIC_PRODUCT_COLUMNS } from "@/lib/catalog-data";
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getPublicNavigation, mapProduct } from "@/lib/storefront";
import { normalizeProductSearch } from "@/lib/product-search";
import { searchPublicProductIds } from "@/lib/public-product-search";
export async function GET(request: Request) {
 const q = (new URL(request.url).searchParams.get("q") ?? "").trim().slice(0, 100);
 if (normalizeProductSearch(q).length < 2) return NextResponse.json({ results: [] });
 try {
  const { categories, error: navigationError } = await getPublicNavigation();
  if (navigationError) throw new Error("Navigation unavailable");
  const ids = await searchPublicProductIds(q, categories.map(c => c.id));
  if (!ids.length) return NextResponse.json({ results: [] });
  const db = await createServerSupabaseClient();
  const { data, error } = await db.from("products").select(`${PUBLIC_PRODUCT_COLUMNS}, categories(name), product_variants(id,product_id,title,sku,retail_price,wholesale_price,is_active,stock,stock_verified_at,supplier_available,fulfillment_mode,options,image_url,display_order)`).eq("is_active", true).eq("is_wholesale_only", false).is("deleted_at", null).in("id", ids.slice(0, 8));
  if (error) return NextResponse.json({ results: [] }, { status: 503 });
  return NextResponse.json({ results: await projectUsdProducts((data ?? []).sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id)).map(p => mapProduct(p)), db) }, { headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=120" } });
 } catch { return NextResponse.json({ results: [], error: "No pudimos buscar. Intentá nuevamente." }, { status: 503 }); }
}
