import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isMercadoPagoConfigured } from "@/lib/mercadopago";
export const metadata = { title: "Estado de la tienda", robots: { index: false, follow: false } };
function recentCostCutoff() { return new Date(Date.now() - 30 * 86400000).toISOString(); }
export default async function StoreStatus() {
  if ((await getCurrentProfile()).profile?.role !== "admin") redirect("/login?next=/admin/estado");
  const db = await createServerSupabaseClient();
  const [inventory, suppliers, costs, requests] = await Promise.all([
    db.from("products").select("id", { count: "exact", head: true }).eq("is_active", true).eq("is_wholesale_only", false).eq("fulfillment_mode", "own_stock").gt("stock", 0).not("stock_verified_at", "is", null),
    db.from("products").select("id", { count: "exact", head: true }).eq("is_active", true).eq("is_wholesale_only", false).eq("fulfillment_mode", "supplier").eq("supplier_available", true),
    db.from("product_costs").select("product_id", { count: "exact", head: true }).gte("verified_at", recentCostCutoff()),
    db.from("withdrawal_requests").select("id", { count: "exact", head: true }).neq("status", "resolved"),
  ]);
  const checks: [string, boolean][] = [
    ["Conexión privada para pedidos y reclamos", Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)],
    ["Estructura de inventario, costos y reclamos", !inventory.error && !suppliers.error && !costs.error && !requests.error],
    ["Identidad del vendedor publicada", Boolean(process.env.NEXT_PUBLIC_BUSINESS_NAME && process.env.NEXT_PUBLIC_BUSINESS_CUIT && process.env.NEXT_PUBLIC_BUSINESS_ADDRESS)],
    ["Mercado Pago configurado para este entorno", isMercadoPagoConfigured()],
    ["Dirección pública HTTPS configurada", /^https:\/\//.test(process.env.NEXT_PUBLIC_SITE_URL ?? "")],
  ];
  const metrics = [
    { label: "Disponible en proveedor", value: suppliers.error ? "—" : suppliers.count },
    { label: "Stock propio verificado", value: inventory.error ? "—" : inventory.count },
    { label: "Costos revisados en 30 días", value: costs.error ? "—" : costs.count },
    { label: "Reclamos abiertos", value: requests.error ? "—" : requests.count },
  ];
  return <main className="mx-auto max-w-7xl space-y-7 px-4 py-7 sm:px-6 lg:px-8">
    <header><p className="text-xs font-bold uppercase tracking-widest text-sky-700">Supervisión</p><h1 className="mt-1 text-3xl font-bold text-zinc-950">Estado de la tienda</h1><p className="mt-2 max-w-2xl text-sm text-zinc-600">Resumen de configuración y registros para detectar qué necesita atención.</p></header>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{metrics.map(metric => <div key={metric.label} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs sm:p-5"><p className="text-xs font-semibold text-zinc-500">{metric.label}</p><p className="mt-3 text-2xl font-bold text-zinc-950 sm:text-3xl">{metric.value}</p></div>)}</div>
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs sm:p-6"><h2 className="text-lg font-bold text-zinc-950">Configuración</h2><p className="mt-1 text-sm text-zinc-600">Compras online: {process.env.COMMERCE_CHECKOUT_ENABLED === "true" ? "habilitadas por configuración" : "deshabilitadas"} · Envíos automáticos: {process.env.COMMERCE_SHIPPING_ENABLED === "true" ? "habilitados por configuración" : "cotización manual"}.</p><ul className="mt-5 grid gap-3 md:grid-cols-2">{checks.map(([label, ready]) => <li className="flex items-start gap-3 rounded-xl border border-zinc-200 p-3 text-sm" key={label}><span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${ready ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>{ready ? "Listo" : "Pendiente"}</span><span>{label}</span></li>)}</ul></section>
    <p className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950">Estos indicadores comprueban configuración y registros. Antes de aceptar pagos, verificá una compra completa, la recepción del pago y el vencimiento de reservas. Las credenciales cargadas no demuestran que el proveedor las haya aceptado.</p>
  </main>;
}
