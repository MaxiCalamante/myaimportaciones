import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { mapProduct } from "@/lib/storefront";
export async function GET(request: Request) {
  const ids = [...new Set((new URL(request.url).searchParams.get("ids") ?? "").split(",").filter(Boolean))];
  if (ids.length > 50 || ids.some(id => !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id))) return NextResponse.json({ error: "Lista inválida" }, { status: 400 });
  if (!ids.length) return NextResponse.json([]);
  const db = await createServerSupabaseClient();
  const { data, error } = await db.from("products").select("*, categories(name)").in("id", ids).eq("is_active", true).eq("is_wholesale_only", false);
  if (error) return NextResponse.json({ error: "No disponible" }, { status: 503 });
  return NextResponse.json(data.filter(p => !/iphone|smartphone|celular/i.test(p.title)).map(p => mapProduct(p)), { headers: { "Cache-Control": "private, no-store" } });
}
