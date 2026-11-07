import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { getAdminClient } from "@/lib/admin-auth";
import { hasCommerceService, createCommerceService } from "@/lib/supabase/service";
import { searchSupplierOpportunities } from "@/lib/supplier-opportunities";
import { SupplierOpportunitiesRadar } from "@/components/admin/supplier-opportunities-radar";
import { SupplierOpportunityCatalog, type CatalogSummary, type CatalogPageData } from "@/components/admin/supplier-opportunity-catalog";

export const metadata = {
  title: "Radar de Oportunidades Mayoristas | Administración MYA",
  robots: { index: false, follow: false },
};

export default async function AdminOpportunitiesPage({ searchParams }: { searchParams: Promise<Record<string,string|string[]|undefined>> }) {
  const { profile } = await getCurrentProfile();
  if (!profile) {
    redirect("/login?next=/admin/oportunidades");
  }
  if (profile.role !== "admin") {
    redirect("/cuenta");
  }

  const params = await searchParams;
  if (params.vista !== "radar") {
    const filters = Object.fromEntries(Object.entries(params).flatMap(([key,value]) => {
      if (typeof value !== "string" || !value) return [];
      if (key === "q") return [[key,value.slice(0,120)]];
      if (["supplierId","sourceId"].includes(key) && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value)) return [[key,value]];
      if (["minOrigin","maxOrigin","minCost","minMargin","page"].includes(key) && /^\d{1,9}(?:\.\d{1,4})?$/.test(value)) return [[key,key==="page"?String(Math.trunc(Number(value))):value]];
      if (key==="checkedFrom" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const date = new Date(value+"T00:00:00-03:00");
        if (Number.isFinite(date.getTime()) && date.toISOString().startsWith(value)) return [[key,value]];
      }
      if (["status","currency","sort"].includes(key) && /^[a-z_]{1,20}$/i.test(value)) return [[key,value]];
      return [];
    }));
    const admin = await getAdminClient();
    const [list, summary] = await Promise.all([
      admin.rpc("tracker_opportunities_v1", { f: filters }),
      admin.rpc("tracker_catalog_summary_v1", { supplier_input: null }),
    ]);
    return <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6 lg:px-8">
      <nav className="flex flex-wrap gap-4 text-sm font-semibold text-sky-800">
        <Link href="/admin/oportunidades?vista=radar">Radar comercial anterior</Link>
        <Link href="/admin/oportunidades/importacion">Importación masiva y revisión</Link>
        <Link href="/admin/proveedores/rastreador">Configuración del rastreador</Link>
      </nav>
      {list.error || summary.error
        ? <p role="status">El catálogo de oportunidades requiere las migraciones del rastreador en este entorno.</p>
        : <SupplierOpportunityCatalog page={list.data as CatalogPageData} summary={summary.data as CatalogSummary} filters={filters} />}
    </div>;
  }

  const db = hasCommerceService() ? createCommerceService() : await getAdminClient();

  const [initialData, categoriesRes, suppliersRes] = await Promise.all([
    searchSupplierOpportunities(
      {
        page: 1,
        pageSize: 24,
        sortBy: "profit_desc",
      },
      { client: db }
    ),
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
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link href="/admin/oportunidades" className="text-sm font-semibold text-sky-800">Catálogo de oportunidades</Link>
        <Link href="/admin/oportunidades/importacion" className="rounded-xl bg-sky-800 px-4 py-3 text-sm font-semibold text-white">Importación masiva y revisión de catálogo</Link>
      </div>
      <SupplierOpportunitiesRadar
        initialData={initialData}
        categories={categories}
        suppliers={suppliers}
      />
    </div>
  );
}
