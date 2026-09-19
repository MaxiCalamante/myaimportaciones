import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { siteConfig } from "@/lib/site";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "wholesale"; // 'wholesale' | 'retail' | 'full'

  if (!hasSupabaseConfig()) {
    return new NextResponse("Error: Base de datos no configurada.", { status: 500 });
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data: products, error } = await supabase
      .from("products")
      .select("id, title, slug, retail_price, wholesale_price, wholesale_min_qty, stock, categories(name)")
      .eq("is_active", true)
      .order("title", { ascending: true })
      .range(0, 5000);

    if (error || !products) {
      return new NextResponse("Error al generar catálogo.", { status: 500 });
    }

    // CSV Headers
    const headers = [
      "Código",
      "Producto",
      "Categoría / Rubro",
      "Precio Minorista (Contado)",
      "Precio Mayorista (Bulto)",
      "Mínimo Mayorista (Unid)",
      "Stock",
      "Enlace Web",
    ];

    const escapeCsv = (val: string | number | null | undefined) => {
      const str = String(val ?? "").replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = products.map((p: any) => {
      const categoryName = Array.isArray(p.categories) ? p.categories[0]?.name : p.categories?.name ?? "General";
      return [
        escapeCsv(p.id.slice(0, 8).toUpperCase()),
        escapeCsv(p.title),
        escapeCsv(categoryName),
        escapeCsv(p.retail_price ? `$${Number(p.retail_price).toLocaleString("es-AR")}` : "$0"),
        escapeCsv(p.wholesale_price ? `$${Number(p.wholesale_price).toLocaleString("es-AR")}` : "$0"),
        escapeCsv(p.wholesale_min_qty ?? 1),
        escapeCsv(p.stock ?? 0),
        escapeCsv(`${siteConfig.appUrl}/producto/${p.slug}`),
      ].join(",");
    });

    // UTF-8 BOM for Microsoft Excel on Windows compatibility
    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");

    const filename =
      type === "wholesale"
        ? `MYA_Importaciones_Catalogo_Mayorista_${new Date().toISOString().split("T")[0]}.csv`
        : `MYA_Importaciones_Catalogo_General_${new Date().toISOString().split("T")[0]}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (err: any) {
    return new NextResponse(`Error: ${err.message}`, { status: 500 });
  }
}
