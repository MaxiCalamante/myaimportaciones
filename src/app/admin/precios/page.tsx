import { getAdminClient } from "@/lib/admin-auth";
import { getProductMarketComparisons } from "@/lib/mercadolibre-pricing";
import { MercadoLibrePricingManager } from "@/components/admin/mercadolibre-pricing-manager";

export const metadata = {
  title: "Monitor de Precios Mercado Libre | Administración MYA",
  robots: { index: false, follow: false },
};

export default async function AdminMarketPricingPage() {
  const db = await getAdminClient();

  const [initialData, categoriesRes] = await Promise.all([
    getProductMarketComparisons({
      page: 1,
      pageSize: 25,
      sortBy: "gain_desc",
    }),
    db.from("categories").select("id, name, slug").order("name"),
  ]);

  const categories = (categoriesRes.data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
  }));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <MercadoLibrePricingManager
        initialItems={initialData.items}
        initialTotal={initialData.total}
        initialStats={initialData.stats}
        initialPage={initialData.page}
        initialTotalPages={initialData.totalPages}
        categories={categories}
      />
    </div>
  );
}
