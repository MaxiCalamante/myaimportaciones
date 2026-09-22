"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Product } from "@/lib/types";
import { calculateProductProfit, type ProductCost } from "@/lib/product-profit";
import { formatCurrency as money } from "@/lib/format";
import { saveFinancialControl } from "@/app/admin/costos/control-actions";
export function ProductProfitControl({ products, costs }: { products: Product[]; costs: ProductCost[] }) {
  const [missingOnly, setMissingOnly] = useState(false);
  const [search, setSearch] = useState(""); const [page, setPage] = useState(1); const [selected, setSelected] = useState<Product | null>(null);
  const costMap = useMemo(() => new Map(costs.map(c => [c.product_id, c])), [costs]);
  const filtered = products.filter(p => (!missingOnly || !costMap.has(p.id))).filter(p => `${p.title} ${p.sku ?? ""} ${p.model ?? ""} ${p.brand ?? ""}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  const priceConflicts = useMemo(() => {
    const groups = new Map<string, Product[]>();
    for (const p of products) { if (p.imageUrl) groups.set(p.imageUrl, [...(groups.get(p.imageUrl) ?? []), p]); }
    return new Set([...groups.values()].filter(group => new Set(group.map(p => p.retailPrice)).size > 1).flat().map(p => p.id));
  }, [products]);
  const pages = Math.max(1, Math.ceil(filtered.length / 25)); const current = Math.min(page, pages);
  return <section className="space-y-5"><h1 className="text-3xl font-bold">Stock, costos y ganancias</h1><p>Costo documentado, precio de venta y contribución por unidad. Sin gastos completos, la diferencia es provisional; no representa ganancia neta ni incluye impuestos y gastos fijos no registrados.</p>
    <input type="search" aria-label="Buscar producto, modelo o código" placeholder="Buscar por producto, marca, modelo o código" value={search} onChange={e => {setSearch(e.target.value);setPage(1);}} className="w-full rounded-xl border p-3" />
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={missingOnly} onChange={e => {setMissingOnly(e.target.checked);setPage(1);}} />Mostrar sólo productos sin costo registrado</label>
    <p>{filtered.length} productos · {costs.length} con costo registrado</p>{priceConflicts.size > 0 && <p className="rounded-xl bg-amber-50 p-3 text-sm">{priceConflicts.size} fichas comparten foto con otra publicación que tiene un precio distinto. Revisá sus presentaciones antes de cambiar el precio.</p>}
    <div className="overflow-x-auto rounded-xl border"><table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-zinc-100"><tr>{["Producto", "Stock", "Compra (ARS)", "Venta", "Contribución", "Margen", "Control"].map(h => <th className="p-3" key={h} scope="col">{h}</th>)}</tr></thead><tbody>{filtered.slice((current-1)*25,current*25).map(p => {const c=costMap.get(p.id),v=calculateProductProfit(p.retailPrice,c);return <tr key={p.id} className="border-t"><th scope="row" className="max-w-xs p-3 font-medium">{p.title}{p.active === false && <span className="ml-2 rounded bg-amber-100 px-2 text-xs">Borrador: revisar ficha</span>}<span className="block text-xs text-zinc-500">{p.sku || p.model || "Sin código confirmado"}</span>{priceConflicts.has(p.id) && <span className="block text-xs text-amber-800">Revisar precio de ficha similar</span>}</th><td className="p-3">{p.stockVerifiedAt ? p.stock : "Sin verificar"}</td><td className="p-3">{v ? money(v.purchase) : "Pendiente"}</td><td className="p-3">{money(p.retailPrice)}</td><td className="p-3">{v ? money(v.contribution) : "Sin costo"}<span className="block text-xs">{v && !v.complete ? "Gastos incompletos" : v ? "Según gastos cargados" : ""}</span></td><td className="p-3">{v ? `${v.margin.toFixed(1)}%` : "—"}</td><td className="p-3"><button className="rounded-lg border px-3 py-2" onClick={() => setSelected(p)}>Editar</button></td></tr>;})}</tbody></table></div>
    <nav aria-label="Páginas del control" className="flex items-center gap-4"><button disabled={current===1} onClick={() => setPage(current-1)} className="rounded border p-2 disabled:opacity-40">Anterior</button><span>{current} / {pages}</span><button disabled={current===pages} onClick={() => setPage(current+1)} className="rounded border p-2 disabled:opacity-40">Siguiente</button></nav>
    {selected && <Editor key={selected.id} product={selected} cost={costMap.get(selected.id)} close={() => setSelected(null)} />}
  </section>;
}
function Editor({ product, cost, close }: { product: Product; cost?: ProductCost; close: () => void }) {
  const [values,setValues]=useState({purchase:Number(cost?.origin_cost ?? 0),exchange:Number(cost?.exchange_rate ?? 1),freight:Number(cost?.freight_per_unit ?? 0),other:Number(cost?.other_landed_cost ?? 0),variable:Number(cost?.variable_cost ?? 0),fee:Number(cost?.payment_fee_percent ?? 0),minimum:Number(cost?.minimum_contribution ?? 0),sale:product.retailPrice});
  const modal=useRef<HTMLDialogElement>(null);
  useEffect(() => {const node=modal.current;node?.showModal();return () => node?.close();},[]);
  const [message,setMessage]=useState("");const [pending,setPending]=useState(false);
  const result=calculateProductProfit(values.sale,{product_id:product.id,origin_cost:values.purchase,currency:cost?.currency ?? "ARS",exchange_rate:values.exchange,freight_per_unit:values.freight,other_landed_cost:values.other,variable_cost:values.variable,payment_fee_percent:values.fee,minimum_contribution:values.minimum,expenses_confirmed:false});
  const fields:[keyof typeof values,string][]=[["purchase","Costo de compra por unidad"],["exchange","Conversión a ARS"],["freight","Transporte por unidad (ARS)"],["other","Otros costos de ingreso (ARS)"],["variable","Gastos por venta (ARS)"],["fee","Comisión de cobro (%)"],["minimum","Contribución mínima (ARS)"],["sale","Precio de venta (ARS)"]];
  return <dialog ref={modal} onCancel={close} className="fixed inset-0 m-auto max-h-[95dvh] w-[95vw] max-w-3xl overflow-y-auto rounded-2xl bg-white p-0 backdrop:bg-black/60" aria-label={`Costos de ${product.title}`}><form action={async f => {setPending(true);try{setMessage(await saveFinancialControl(f));}catch(e){setMessage(e instanceof Error?e.message:"Error al guardar");}finally{setPending(false);}}} className="mx-auto my-6 max-w-3xl space-y-4 rounded-2xl bg-white p-6"><div className="flex justify-between gap-4"><h2 className="text-xl font-bold">{product.title}</h2><button type="button" onClick={close} className="rounded border px-3 py-1">Cerrar</button></div>
    <input type="hidden" name="product_id" value={product.id}/>{cost?.source_document && <p className="text-sm text-zinc-600">Referencia de la compra inicial: {cost.source_document}, página {cost.source_page}. El transporte no está incluido en ese costo base.</p>}
    <label className="block">Moneda de compra <select name="currency" defaultValue={cost?.currency ?? "ARS"} className="rounded border p-2"><option>ARS</option><option>USD</option><option>PYG</option></select></label>
    <div className="grid gap-3 sm:grid-cols-2">{fields.map(([key,label])=><label key={key}>{label}<input required name={key} type="number" min="0" step="0.01" value={values[key]} onChange={e=>setValues({...values,[key]:Number(e.target.value)})} className="mt-1 w-full rounded border p-2"/></label>)}</div>
    {result && <p className="rounded-xl bg-sky-50 p-4">Costo puesto: {money(result.landed)} · Contribución por unidad: {money(result.contribution)} · Margen sobre venta: {result.margin.toFixed(2)}%. Resultado según los gastos ingresados.</p>}
    <label className="flex gap-2"><input type="checkbox" name="expenses_confirmed" defaultChecked={cost?.expenses_confirmed}/>Confirmé transporte, comisión y demás gastos variables.</label>
    <fieldset className="space-y-3 rounded-xl border p-4"><legend>Control de stock</legend><p>Actual: {product.stockVerifiedAt ? `${product.stock} unidades verificadas` : "cantidad histórica sin verificar"}. Dejá el campo vacío para conservarlo. Un pedido con reserva pendiente bloquea el recuento.</p><label className="block">Unidades físicas disponibles <input name="stock" type="number" min="0" max="100000" step="1" className="rounded border p-2"/></label><label className="flex gap-2"><input name="stock_confirmed" type="checkbox"/>Conté estas unidades y desconté las vendidas.</label></fieldset>
    <button disabled={pending} className="rounded-xl bg-zinc-950 px-5 py-3 text-white disabled:opacity-50">{pending?"Guardando…":"Guardar costos y precio de venta"}</button><p role="status">{message}</p>
  </form></dialog>;
}
