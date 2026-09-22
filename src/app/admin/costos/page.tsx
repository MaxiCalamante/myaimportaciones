import { ProductProfitControl } from "@/components/admin/product-profit-control";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { readAllPages } from "@/lib/read-all-pages";
import type { ProductCost } from "@/lib/product-profit";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { getStorefrontData } from "@/lib/storefront";
import { RealCosts } from "@/components/admin/real-costs";
export const metadata = { title: "Stock, costos y ganancias", robots: { index: false, follow: false } };
export default async function CostsPage() {
  const { profile } = await getCurrentProfile();
  if (profile?.role !== "admin") redirect("/login?next=/admin/costos");
  const { products } = await getStorefrontData({ admin: true });
  const db = await createServerSupabaseClient();
  const costs = await readAllPages((from,to) => db.from("product_costs").select("*").order("product_id").range(from,to));
  return <div className="mx-auto max-w-5xl p-5"><ProductProfitControl products={products} costs={costs as ProductCost[]} /><details className="mt-8"><summary className="cursor-pointer font-semibold">Simulador de referencia Mercado Libre</summary><RealCosts products={products} /></details></div>;
}
