import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { mapProduct } from "@/lib/storefront";
export async function GET(request: Request) {
 const q = (new URL(request.url).searchParams.get("q") ?? "").trim().replace(/[%_]/g, "").slice(0, 100);
 if (q.length < 2) return NextResponse.json({ results: [] });
 try {
  const db = await createServerSupabaseClient();
  const { data, error } = await db.from("products").select("*, categories!inner(name,slug)").eq("is_active", true).eq("is_wholesale_only", false).ilike("title", `%${q}%`).order("is_featured", { ascending: false }).limit(12);
  if (error) return NextResponse.json({ results: [] }, { status: 503 });
  return NextResponse.json({ results: (data ?? []).filter(p => !/iphone|smartphone|celular/i.test(p.title)).slice(0, 8).map(p => mapProduct(p)) });
 } catch { return NextResponse.json({ results: [] }, { status: 503 }); }
}
