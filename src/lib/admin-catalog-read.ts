import type { SupabaseClient } from "@supabase/supabase-js";

// Costs/source links are read through an admin-only RPC once the security migration is applied.
// Pre-migration compatibility is limited to authenticated admins checked by each caller.
export async function readAdminProducts(db: SupabaseClient, options: { from?: number; size?: number; ids?: string[]; slugs?: string[] } = {}) {
  const from = options.from ?? 0, size = options.size ?? 1000;
  const result = await db.rpc("admin_catalog_page", { offset_input: from, limit_input: size, ids_input: options.ids ?? null, slugs_input: options.slugs ?? null });
  if (!result.error) return { data: result.data as Record<string, unknown>[], error: null };
  if (result.error.code !== "PGRST202") return { data: null, error: result.error };
  let query = db.from("products").select("*").order("is_featured", { ascending: false }).order("created_at", { ascending: false }).order("id");
  if (options.ids) query = query.in("id", options.ids);
  if (options.slugs) query = query.in("slug", options.slugs);
  return query.range(from, from + size - 1);
}
