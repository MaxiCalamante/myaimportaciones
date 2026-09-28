import { ProductProfitControl } from "@/components/admin/product-profit-control";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { readAllPagesParallel } from "@/lib/read-all-pages";
import type { ProductCost } from "@/lib/product-profit";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { getStorefrontData } from "@/lib/storefront";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Activity, ClipboardList } from "lucide-react";

export const metadata = {
  title: "Control de Costos, Precios y Márgenes | MYA Importaciones",
  robots: { index: false, follow: false },
};

export default async function CostsPage() {
  const { profile } = await getCurrentProfile();
  if (profile?.role !== "admin") redirect("/login?next=/admin/costos");

  const [db, { products, categories }] = await Promise.all([
    createServerSupabaseClient(),
    getStorefrontData({ admin: true }),
  ]);

  const { count: costsCount } = await db
    .from("product_costs")
    .select("product_id", { count: "exact", head: true });

  const costs = await readAllPagesParallel(
    (from, to) => db.from("product_costs").select("*").order("product_id").range(from, to),
    costsCount ?? 3000,
    1000
  );

  return (
    <div className="min-h-screen bg-zinc-50/70 pb-20">
      {/* Top Admin Navigation Header */}
      <header className="border-b border-zinc-200/80 bg-white shadow-xs">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Left breadcrumb navigation */}
            <div className="flex items-center gap-3">
              <Link
                href="/admin"
                className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-100/80 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-200 hover:text-zinc-950 transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Panel Admin
              </Link>
              <span className="text-zinc-300">/</span>
              <span className="text-xs font-bold text-zinc-900 bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-full border border-amber-300/60">
                Finanzas & Costos
              </span>
            </div>

            {/* Quick cross-admin links */}
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/admin/operaciones"
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
              >
                <ClipboardList className="h-3.5 w-3.5 text-zinc-500" />
                Operaciones
              </Link>
              <Link
                href="/admin/estado"
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
              >
                <Activity className="h-3.5 w-3.5 text-zinc-500" />
                Estado del Sistema
              </Link>
              <a
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-sky-700 hover:bg-sky-50 transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Tienda Pública
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
        <ProductProfitControl
          products={products}
          categories={categories}
          costs={(costs as ProductCost[]) || []}
        />
      </main>
    </div>
  );
}
