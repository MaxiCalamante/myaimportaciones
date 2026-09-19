import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { demoProducts } from "@/lib/demo-data";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() || "";
  const channel = searchParams.get("channel") || "retail";

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  if (!hasSupabaseConfig()) {
    const results = demoProducts
      .filter((p) => {
        const matches =
          p.title.toLowerCase().includes(q.toLowerCase()) ||
          p.description?.toLowerCase().includes(q.toLowerCase()) ||
          p.tags?.some((t) => t.toLowerCase().includes(q.toLowerCase()));
        return channel === "wholesale" ? matches && (p.wholesalePrice > 0 || p.wholesaleOnly) : matches && !p.wholesaleOnly;
      })
      .slice(0, 8);
    return NextResponse.json({ results });
  }

  try {
    const supabase = await createServerSupabaseClient();
    let query = supabase
      .from("products")
      .select("id, title, slug, image_url, retail_price, wholesale_price, stock, wholesale_min_qty, categories(name)")
      .eq("is_active", true)
      .ilike("title", `%${q}%`);

    if (channel === "wholesale") {
      query = query.gt("wholesale_price", 0);
    } else {
      query = query.eq("is_wholesale_only", false);
    }

    const { data, error } = await query
      .order("is_featured", { ascending: false })
      .limit(8);

    if (error || !data) {
      return NextResponse.json({ results: [] });
    }

    const results = data.map((p: any) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      imageUrl: p.image_url,
      retailPrice: Number(p.retail_price ?? 0),
      wholesalePrice: Number(p.wholesale_price ?? 0),
      wholesaleMinQuantity: Number(p.wholesale_min_qty ?? 1),
      stock: Number(p.stock ?? 0),
      categoryName: Array.isArray(p.categories) ? p.categories[0]?.name : p.categories?.name ?? "Herramientas",
    }));

    return NextResponse.json({ results });
  } catch (err: any) {
    return NextResponse.json({ results: [], error: err.message }, { status: 500 });
  }
}
