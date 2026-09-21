import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { getStorefrontData } from "@/lib/storefront";
import { RealCosts } from "@/components/admin/real-costs";
export const metadata = { title: "Costos reales", robots: { index: false, follow: false } };
export default async function CostsPage() {
  const { profile } = await getCurrentProfile();
  if (profile?.role !== "admin") redirect("/login?next=/admin/costos");
  const { products } = await getStorefrontData({ admin: true });
  return <div className="mx-auto max-w-5xl p-5"><RealCosts products={products} /></div>;
}
