import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
export async function GET() {
  const db = await createServerSupabaseClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ items: [] }, { status: 401 });
  const { data, error } = await db.from("email_saved_carts").select("items").eq("profile_id", user.id).maybeSingle();
  return NextResponse.json({ items: data?.items || [] }, { status: error ? 503 : 200, headers: { "Cache-Control": "private, no-store" } });
}
export async function POST(req: Request) {
  if (req.headers.get("origin") !== new URL(req.url).origin) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  if (Number(req.headers.get("content-length")) > 15000) return NextResponse.json({ error: "Too large" }, { status: 413 });
  const text = await req.text();
  if (text.length > 15000) return NextResponse.json({ error: "Too large" }, { status: 413 });
  let items: unknown;
  try { items = JSON.parse(text).items; } catch { return NextResponse.json({ error: "Invalid cart" }, { status: 400 }); }
  if (!Array.isArray(items) || items.length > 50) return NextResponse.json({ error: "Invalid cart" }, { status: 400 });
  const db = await createServerSupabaseClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return new Response(null, { status: 204 });
  const { error } = await db.rpc("save_email_cart_v1", { items_input: items });
  return error ? NextResponse.json({ error: "No se pudo guardar el carrito" }, { status: 400 }) : new Response(null, { status: 204 });
}
