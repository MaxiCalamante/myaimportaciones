import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { getStorefrontData } from "@/lib/storefront";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { updateWithdrawalAction } from "./actions";
import { InventoryVerificationForm } from "@/components/admin/inventory-verification-form";

export const metadata = { title: "Operación y reclamos", robots: { index: false, follow: false } };

export default async function Operations() {
  if ((await getCurrentProfile()).profile?.role !== "admin") redirect("/login?next=/admin/operaciones");
  const db = await createServerSupabaseClient();
  const [{ products }, requests, reviews] = await Promise.all([
    getStorefrontData({ admin: true }),
    db.from("withdrawal_requests").select("reference,order_code,email,reason,created_at,status").order("created_at", { ascending: false }).limit(100),
    db.from("orders").select("tracking_code,total_amount,status,customer_email,payment_id").eq("payment_review", true).limit(100),
  ]);
  return <main className="mx-auto max-w-7xl space-y-8 px-4 py-7 sm:px-6 lg:px-8">
    <header><p className="text-xs font-bold uppercase tracking-widest text-sky-700">Atención y control</p><h1 className="mt-1 text-3xl font-bold text-zinc-950">Operaciones y reclamos</h1><p className="mt-2 text-sm text-zinc-600">Gestioná solicitudes, revisá cobros observados y verificá el inventario físico.</p></header>
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs sm:p-6"><h2 className="text-xl font-bold text-zinc-950">Arrepentimientos recibidos</h2><p className="mt-1 text-sm text-zinc-500">{requests.data?.length ?? 0} solicitudes recientes</p>
        {requests.error ? <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">No se pudo leer el registro. Revisá la migración.</p> : requests.data?.length ? <div className="mt-4 max-h-[560px] space-y-3 overflow-y-auto">{requests.data.map(request => <form action={updateWithdrawalAction} className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4" key={request.reference}><div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-sm text-zinc-900">{request.order_code || request.reference}</strong><time className="text-xs text-zinc-500">{new Date(request.created_at).toLocaleDateString("es-AR")}</time></div><p className="break-all text-xs text-zinc-600">{request.email}</p><p className="text-sm text-zinc-700">{request.reason || "Sin motivo indicado."}</p><input type="hidden" name="reference" value={request.reference} /><div className="flex flex-wrap items-end gap-2"><label className="min-w-36 flex-1 text-xs font-semibold text-zinc-600">Estado<select name="status" defaultValue={request.status} className="mt-1 min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-2 text-sm"><option value="received">Recibida</option><option value="contacted">Contactada</option><option value="resolved">Resuelta</option></select></label><button className="min-h-11 rounded-lg bg-zinc-950 px-4 text-sm font-semibold text-white">Guardar</button></div></form>)}</div> : <p className="mt-4 rounded-xl bg-zinc-50 p-4 text-sm text-zinc-500">No hay solicitudes.</p>}
      </section>
      <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs sm:p-6"><h2 className="text-xl font-bold text-zinc-950">Pagos para revisar</h2><p className="mt-1 text-sm text-zinc-600">Conciliá cobros tardíos, duplicados, devoluciones y contracargos antes de despachar.</p>{reviews.error ? <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">No se pudo leer el registro. Revisá la migración.</p> : reviews.data?.length ? <div className="mt-4 max-h-[560px] space-y-3 overflow-y-auto">{reviews.data.map(order => <div className="rounded-xl border border-amber-200 bg-amber-50 p-4" key={order.tracking_code}><div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-sm text-zinc-900">{order.tracking_code}</strong><span className="text-sm font-bold text-zinc-900">${Number(order.total_amount).toLocaleString("es-AR")}</span></div><p className="mt-1 break-all text-xs text-zinc-700">{order.customer_email}</p><p className="mt-1 text-xs text-zinc-600">Estado: {order.status} · Pago: {order.payment_id || "sin referencia"}</p></div>)}</div> : <p className="mt-4 rounded-xl bg-zinc-50 p-4 text-sm text-zinc-500">No hay pagos marcados para revisión.</p>}</section>
    </div>
    <InventoryVerificationForm products={products} />
  </main>;
}
