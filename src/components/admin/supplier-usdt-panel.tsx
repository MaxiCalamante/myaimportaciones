"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { previewSupplierFxAction, refreshSupplierUsdtAction, approveSupplierFxPlanAction } from "@/app/admin/proveedores/automation-actions";
import type { readSupplierFxPreview, UsdtSettings } from "@/lib/supplier-usdt";
import { acquisitionFxFresh } from "@/lib/supplier-usdt";
import { formatCurrency } from "@/lib/format";

export function SupplierUsdtPanel({ config }: { config: UsdtSettings }) {
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof readSupplierFxPreview>> | null>(null);
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  const rows = preview?.rows.filter(r => !r.reason && r.newRetail !== null) ?? [];
  const run = (action: () => Promise<void>) => start(async () => { setMessage(""); try { await action(); router.refresh(); } catch (e) { setMessage(e instanceof Error ? e.message : "No se pudo completar la operación."); } });
  return <section className="min-w-0 rounded-2xl border border-sky-200 bg-sky-50 p-5">
    <h3 className="font-bold">Costos de compra con USDT</h3>
    <p className="mt-2 text-sm">1 USD publicado por el proveedor = 1 USDT de pago. {config.acquisitionFxMode === "usdt" ? `${formatCurrency(config.acquisitionArsPerUsd)} por USDT` : "Cotización manual activa"}.</p>
    <p className="mt-2 text-xs text-zinc-600">{config.usdtQuotedAt ? `Consulta: ${new Date(config.usdtQuotedAt).toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })}. ${acquisitionFxFresh(config) ? "Cotización vigente." : "Cotización vencida: no se aplican ajustes."}` : "Todavía no hay una consulta USDT registrada."} Fuente: CriptoYa, compra en Binance con comisión informada, contrastada con Binance Spot. Cargos de red aparte.</p>
    <p className="mt-2 text-xs text-zinc-600">{config.usdtAutoPrices ? "Ajuste automático habilitado para productos con base aprobada." : "Ajuste de precios pendiente de aprobar una base."} El procesador consulta cada hora. Conserva el margen sobre costos registrados; mantiene separados el pasador y los gastos históricos. Los costos y precios por variante requieren revisión individual.</p>
    <div className="mt-4 flex flex-wrap gap-3">
      <button disabled={pending} className="min-h-11 rounded-xl bg-zinc-950 px-4 text-sm font-semibold text-white disabled:opacity-40" onClick={() => run(async () => { setMessage(await refreshSupplierUsdtAction()); setPreview(null); })}>Consultar USDT ahora</button>
      <button disabled={pending} className="min-h-11 rounded-xl border border-zinc-300 bg-white px-4 text-sm font-semibold disabled:opacity-40" onClick={() => run(async () => { setPreview(await previewSupplierFxAction()); })}>Previsualizar corrección</button>
    </div>
    <p role="status" aria-live="polite" className="mt-3 text-sm">{pending ? "Procesando…" : message}</p>
    {preview && <div className="mt-4 min-w-0">
      <p className="text-sm">{rows.length} productos con base calculable; {preview.rows.length - rows.length} requieren revisión. La aplicación también exige oferta exacta vigente, costo USD sin cambios y límites comerciales.</p>
      <div className="mt-3 max-h-96 overflow-auto"><table className="w-full min-w-[480px] text-left text-xs"><thead><tr><th className="p-2">Producto</th><th className="p-2">Minorista actual</th><th className="p-2">Propuesto</th><th className="p-2">Mayorista propuesto</th></tr></thead><tbody>{rows.map(r => <tr key={r.productId} className="border-t"><td className="p-2">{r.title}</td><td className="p-2">{formatCurrency(r.oldRetail)}</td><td className="p-2">{formatCurrency(r.newRetail!)}</td><td className="p-2">{formatCurrency(r.newWholesale!)}</td></tr>)}</tbody></table></div>
      <p className="mt-2 text-xs">La aprobación incorpora las {rows.length} bases calculables; las incidencias se conservan para revisar, sin aplicar cambios forzados.</p>
      {!!rows.length && <form className="mt-4 space-y-3" onSubmit={e => { e.preventDefault(); run(async () => { const result = await approveSupplierFxPlanAction(rows.map(r => ({ productId: r.productId, retail: r.oldRetail, wholesale: r.oldWholesale, cost:r.costSnapshot })), preview.config.usdtQuoteId, true); setPreview(null); setMessage(result); }); }}>
        <label className="flex items-start gap-2 text-xs"><input type="checkbox" required />Apruebo las bases de estos productos y los ajustes posteriores por USDT dentro de los límites. Si cambia el precio manualmente o la evidencia vence, el ajuste se detiene para ese producto.</label>
        <button disabled={pending} className="min-h-11 rounded-xl bg-zinc-950 px-4 text-sm font-semibold text-white disabled:opacity-40">Aprobar bases y habilitar ajuste USDT</button>
      </form>}
    </div>}
  </section>;
}
