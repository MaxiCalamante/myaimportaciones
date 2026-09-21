"use client";
import { useState } from "react";
import { calculateResale, type ResaleInput } from "@/lib/resale-pricing";
import { formatCurrency as money } from "@/lib/format";
import { saveProductCostAction } from "@/app/admin/costos/actions";
import type { Product } from "@/lib/types";
const fields: [keyof ResaleInput, string][] = [["purchase","Compra por unidad (moneda de origen)"],["exchange","Pesos por unidad de moneda (ARS = 1)"],["freight","Transporte por unidad en pesos"],["other","Otros costos de ingreso por unidad"],["variable","Embalaje, envío absorbido y otros gastos por venta"],["feePercent","Comisión del cobro (%)"],["minimum","Contribución mínima deseada en pesos"],["ml","Precio comparable verificado en Mercado Libre"]];
export function RealCosts({ products }: { products: Product[] }) {
  const [input, setInput] = useState<ResaleInput>({ purchase: 21000, exchange: 1, freight: 10000, other: 0, variable: 0, feePercent: 0, minimum: 0, ml: 0 });
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  let result: ReturnType<typeof calculateResale> | null = null;
  try { result = calculateResale(input); } catch {}
  return <section className="rounded-2xl border bg-white p-5 md:p-8">
    <h2 className="text-2xl font-bold">Costos reales y precio de reventa</h2>
    <p className="my-3 text-sm text-zinc-600">Ejemplo inicial: compra $21.000 + transporte $10.000 = $31.000. Venta informada: $54.900; diferencia $23.900 (43,53% de la venta). Los gastos en cero están pendientes: esta diferencia no es ganancia neta. No se aplica a otros productos automáticamente.</p>
    <form action={async data => { setPending(true); setMessage(""); try { setMessage(await saveProductCostAction(data)); } catch (e) { setMessage(e instanceof Error ? e.message : "No se pudo guardar."); } finally { setPending(false); } }} className="space-y-5">
      <label className="block">Producto a registrar<select required name="product_id" className="mt-1 w-full rounded-lg border p-3"><option value="">Elegí el producto exacto</option>{products.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}</select></label>
      <label className="block">Moneda de compra<select name="currency" className="ml-3 rounded-lg border p-2"><option>ARS</option><option>USD</option><option>PYG</option></select></label>
      <div className="grid gap-4 md:grid-cols-2">{fields.map(([key,label]) => <label key={key} className="text-sm">{label}<input name={key} required type="number" min="0" step="0.01" value={input[key]} onChange={e => setInput({ ...input, [key]: Number(e.target.value) })} className="mt-1 w-full rounded-lg border p-3" /></label>)}</div>
      <label className="block">URL del proveedor<input type="url" name="supplier_url" required className="mt-1 w-full rounded-lg border p-3" /></label>
      <label className="block">URL de Mercado Libre del mismo modelo y presentación<input type="url" name="ml_url" className="mt-1 w-full rounded-lg border p-3" /></label>
      {result && <div className="rounded-xl bg-zinc-100 p-4 space-y-2"><p>Costo puesto: <strong>{money(result.landed)}</strong>. Piso con los gastos ingresados: <strong>{money(result.floor)}</strong>.</p><p>{result.suggested === null ? "Sin sugerencia: falta referencia comparable o no permite cubrir el piso entre 5% y 10% debajo de Mercado Libre." : `Rango objetivo ${money(result.low)}–${money(result.high)}. Sugerido ${money(result.suggested)}. Contribución antes de gastos no registrados: ${money(result.contribution ?? 0)}.`}</p></div>}
      <label className="flex gap-2"><input required type="checkbox" name="confirmed" />Confirmé costos y, si la cargué, la referencia comparable de Mercado Libre.</label>
      <p className="text-xs text-zinc-600">Guardar registra costos y referencias. No modifica el precio público. La comisión porcentual se recalcula sobre el precio vigente al cotizar. Transporte de un lote: dividí el costo total según peso/volumen o unidades equivalentes.</p>
      <button disabled={pending || !result} className="rounded-xl bg-zinc-950 px-5 py-3 text-white disabled:opacity-50">{pending ? "Guardando…" : "Guardar costos verificados"}</button>
      <p role="status">{message}</p>
    </form>
  </section>;
}
