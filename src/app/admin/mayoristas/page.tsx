import { createCommerceService } from "@/lib/supabase/service";
import { getCurrentProfile } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminMetric } from "@/components/admin/commerce-ui";
import { CommerceRefresh } from "@/components/admin/commerce-refresh";
import {
  WholesaleManager,
  type WholesaleProfile,
  type WholesaleProductMargin,
} from "@/components/admin/wholesale-manager";

export const metadata = {
  title: "Gestión Mayorista",
  robots: { index: false, follow: false },
};

export default async function AdminWholesalePage() {
  const { profile } = await getCurrentProfile();
  if (!profile) redirect("/login?next=/admin/mayoristas");
  if (profile.role !== "admin") redirect("/cuenta");
  const serviceDb = createCommerceService();

  // 1. Solicitudes pendientes (wholesale_requested_at no nulo y no aprobado)
  const { data: pendingRows } = await serviceDb
    .from("profiles")
    .select(
      "id, full_name, email, phone, business_name, cuit, wholesale_notes, wholesale_requested_at, is_approved_wholesale, customer_tier, created_at"
    )
    .not("wholesale_requested_at", "is", null)
    .eq("is_approved_wholesale", false)
    .order("wholesale_requested_at", { ascending: false });

  // 2. Mayoristas activos aprobados (excluyendo admins del listado para foco en clientes)
  const { data: approvedRows } = await serviceDb
    .from("profiles")
    .select(
      "id, full_name, email, phone, business_name, cuit, wholesale_notes, wholesale_requested_at, is_approved_wholesale, customer_tier, created_at, role"
    )
    .eq("is_approved_wholesale", true)
    .neq("role", "admin")
    .order("updated_at", { ascending: false });

  // 3. Conteo total de clientes
  const { count: totalProfilesCount } = await serviceDb
    .from("profiles")
    .select("id", { count: "exact", head: true });

  // 4. Solicitudes de pedido mayorista bajo confirmación (SOL-...)
  const { data: requestRows } = await serviceDb
    .from("wholesale_checkout_requests")
    .select("id, request_id, reference, contact, selection, status, reasons, review_notes, reviewed_at, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  // 5. Productos con precios mayoristas y costos para monitor de margen
  const { data: rawProductMargins } = await serviceDb
    .from("products")
    .select(`
      id,
      title,
      retail_price,
      wholesale_price,
      wholesale_min_qty,
      categories(name),
      product_costs(landed_cost)
    `)
    .eq("is_active", true)
    .gt("wholesale_price", 0)
    .order("title");

  const pendingApplications: WholesaleProfile[] = (pendingRows || []).map((row) => ({
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    businessName: row.business_name,
    cuit: row.cuit,
    wholesaleNotes: row.wholesale_notes,
    wholesaleRequestedAt: row.wholesale_requested_at,
    isApprovedWholesale: Boolean(row.is_approved_wholesale),
    customerTier: row.customer_tier,
    createdAt: row.created_at,
  }));

  const approvedWholesalers: WholesaleProfile[] = (approvedRows || []).map((row) => ({
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    businessName: row.business_name,
    cuit: row.cuit,
    wholesaleNotes: row.wholesale_notes,
    wholesaleRequestedAt: row.wholesale_requested_at,
    isApprovedWholesale: Boolean(row.is_approved_wholesale),
    customerTier: row.customer_tier,
    createdAt: row.created_at,
  }));

  const productMargins: WholesaleProductMargin[] = (rawProductMargins || [])
    .filter((row) => {
      const pc = Array.isArray(row.product_costs) ? row.product_costs[0] : row.product_costs;
      return pc && Number(pc.landed_cost) > 0;
    })
    .map((row) => {
      const pc = Array.isArray(row.product_costs) ? row.product_costs[0] : row.product_costs;
      const landedCost = Number(pc.landed_cost);
      const wholesalePrice = Number(row.wholesale_price);
      const retailPrice = Number(row.retail_price);
      const marginPct = Math.round(((wholesalePrice - landedCost) / wholesalePrice) * 1000) / 10;
      const netProfit = wholesalePrice - landedCost;
      const suggestedWholesalePrice = Math.ceil((landedCost / 0.75) / 100) * 100;
      const cat = Array.isArray(row.categories) ? row.categories[0] : row.categories;

      return {
        id: row.id,
        title: row.title,
        categoryName: cat?.name || "Sin categoría",
        retailPrice,
        wholesalePrice,
        wholesaleMinQty: Number(row.wholesale_min_qty || 1),
        landedCost,
        marginPct,
        netProfit,
        suggestedWholesalePrice,
      };
    })
    .sort((a, b) => a.marginPct - b.marginPct);

  const lowMarginCount = productMargins.filter((p) => p.marginPct < 25).length;

  const checkoutRequests = (requestRows || []).map((row) => ({
    id: row.id,
    requestId: row.request_id,
    reference: row.reference,
    contact: (row.contact && typeof row.contact === "object" ? row.contact : {}) as { name?: string; email?: string; phone?: string; address?: string },
    selection: (Array.isArray(row.selection) ? row.selection : []) as Array<{ productId?: string; variantId?: string | null; quantity: number; title?: string; channel?: string }>,
    status: row.status as "pending_confirmation" | "confirmed" | "rejected",
    reasons: Array.isArray(row.reasons) ? row.reasons : [],
    reviewNotes: row.review_notes || "",
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
  }));

  const pendingRequestsCount = checkoutRequests.filter((r) => r.status === "pending_confirmation").length;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-7 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-amber-600">
            Canal Mayorista · Catálogo Público & B2B
          </p>
          <h1 className="mt-1 text-3xl font-extrabold text-zinc-950">
            Aprobación y Gestión Mayorista
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-600">
            Monitoreá los pedidos mayoristas bajo confirmación (SOL-...), revisá postulaciones de clientes y asegurá que ningún costo comprometa el margen mínimo garantizado.
          </p>
        </div>
        <CommerceRefresh />
      </header>

      {/* Métricas KPI */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <AdminMetric
          label="Pedidos SOL Pendientes"
          value={
            <span className={pendingRequestsCount > 0 ? "text-amber-600 font-black" : "text-zinc-950"}>
              {pendingRequestsCount}
            </span>
          }
        />
        <AdminMetric
          label="Mayoristas Aprobados"
          value={<span className="text-emerald-600">{approvedWholesalers.length}</span>}
        />
        <AdminMetric
          label="Alertas de Margen (< 25%)"
          value={
            <span className={lowMarginCount > 0 ? "text-amber-600 font-black" : "text-zinc-950"}>
              {lowMarginCount}
            </span>
          }
        />
        <AdminMetric label="Total Clientes Registrados" value={totalProfilesCount || 0} />
      </div>

      {/* Gestor interactivo de aprobaciones, rechazos y monitor de márgenes */}
      <WholesaleManager
        pendingApplications={pendingApplications}
        approvedWholesalers={approvedWholesalers}
        productMargins={productMargins}
        checkoutRequests={checkoutRequests}
      />
    </div>
  );
}
