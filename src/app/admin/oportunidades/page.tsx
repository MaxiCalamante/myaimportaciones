import { getAdminClient } from "@/lib/admin-auth";
import { searchSupplierOpportunities } from "@/lib/supplier-opportunities";
import { SupplierOpportunitiesRadar } from "@/components/admin/supplier-opportunities-radar";

export const metadata = {
  title: "Radar de Oportunidades Mayoristas | Administración MYA",
  robots: { index: false, follow: false },
};

export default async function AdminOpportunitiesPage() {
  const db = await getAdminClient();

  const [initialData, categoriesRes, suppliersRes] = await Promise.all([
    searchSupplierOpportunities({
      page: 1,
      pageSize: 24,
      sortBy: "profit_desc",
    }),
    db.from("categories").select("id, name, slug, parent_id").order("name"),
    db.from("suppliers").select("id, name, official_key").eq("is_active", true).order("name"),
  ]);

  const categories = (categoriesRes.data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    parentId: c.parent_id,
  }));

  const suppliers = (suppliersRes.data ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    officialKey: s.official_key,
  }));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <SupplierOpportunitiesRadar
        initialData={initialData}
        categories={categories}
        suppliers={suppliers}
      />
    </div>
  );
}
