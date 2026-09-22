import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
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
    ["Credenciales de Mercado Pago cargadas", Boolean((process.env.MERCADOPAGO_ACCESS_TOKEN || process.env.MP_ACCESS_TOKEN) && process.env.MERCADOPAGO_WEBHOOK_SECRET && process.env.MERCADOPAGO_COLLECTOR_ID)],
    ["Dirección pública HTTPS configurada", /^https:\/\//.test(process.env.NEXT_PUBLIC_SITE_URL ?? "")],
  ];
  return <main className="mx-auto max-w-3xl space-y-6 p-5"><Link className="underline" href="/admin">Volver al panel</Link><h1 className="text-3xl font-bold">Estado de la tienda</h1>
    <p>Canal: minorista. Compras online: {process.env.COMMERCE_CHECKOUT_ENABLED === "true" ? "habilitadas por configuración" : "deshabilitadas"}. Envíos automáticos: {process.env.COMMERCE_SHIPPING_ENABLED === "true" ? "habilitados por configuración" : "cotización manual"}.</p>
    <ul className="space-y-3">{checks.map(([label, ready]) => <li className="rounded-lg border p-3" key={label}>{ready ? "✓ Configurado" : "Pendiente"} — {label}</li>)}</ul>
    <p>Productos disponibles con envío del proveedor: {suppliers.error ? "sin lectura disponible" : suppliers.count}. Productos con stock propio verificado: {inventory.error ? "sin lectura disponible" : inventory.count}. Costos revisados en los últimos 30 días: {costs.error ? "sin lectura disponible" : costs.count}. Reclamos abiertos: {requests.error ? "sin lectura disponible" : requests.count}.</p>
    <p>Estos indicadores comprueban configuración y registros. Antes de aceptar pagos, verificá una compra completa, la recepción del pago y la ejecución de la tarea de vencimiento de reservas. Las credenciales cargadas no demuestran que el proveedor las haya aceptado.</p>
    <nav className="flex flex-wrap gap-4"><Link className="underline" href="/admin/costos">Revisar costos</Link><Link className="underline" href="/admin/operaciones">Inventario y reclamos</Link></nav>
  </main>;
}
