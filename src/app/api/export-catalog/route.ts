import { readAllPages } from "@/lib/read-all-pages";
import { getCurrentProfile } from "@/lib/auth";
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { siteConfig } from "@/lib/site";

export async function GET(request: Request) {
  const { profile } = await getCurrentProfile();
  if (profile?.role !== "admin") return new NextResponse("No autorizado", { status: 403 });
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "wholesale"; // 'wholesale' | 'retail' | 'full'

  if (!hasSupabaseConfig()) {
    return new NextResponse("Error: Base de datos no configurada.", { status: 500 });
  }

  try {
    const supabase = await createServerSupabaseClient();
    const products = await readAllPages((from, to) => supabase
      .from("products")
      .select("id, title, slug, retail_price, wholesale_price, wholesale_min_qty, stock, categories(name)")
      .eq("is_active", true)
      .order("title", { ascending: true })
      .order("id").range(from, to));

    if (!products) {
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
      const raw = String(val ?? "");
      const str = (/^[=+@-]/.test(raw) ? "'" + raw : raw).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = products.map((p) => {
      const category = p.categories as unknown as { name: string } | { name: string }[] | null;
      const categoryName = (Array.isArray(category) ? category[0]?.name : category?.name) ?? "General";
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
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err: unknown) {
    return new NextResponse(`Error: ${(err instanceof Error ? err.message : "Error inesperado")}`, { status: 500 });
  }
}
