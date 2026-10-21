"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { calculateImport, classifyImport, type ImportInput, type ImportLine, type ImportPolicy, type SharedExpense } from "@/lib/import-costs";
import { offerEvidence, type SupplierOffer } from "@/lib/supplier-intelligence";
import type { SupplierWorkspaceData } from "@/lib/supplier-workspace";
import { approveImportPurchaseAction, configureSupplierQueryAction, importOffersAction, previewOffersAction, probeSupplierOfferAction, reviewSupplierProposalAction, saveImportPolicyAction, saveImportSimulationAction, saveOfferAction } from "@/app/admin/proveedores/intelligence-actions";
import { formatCurrency } from "@/lib/format";
import{SupplierAutomationPanel}from'./supplier-automation-panel';
import{SupplierProductLinks}from'./supplier-product-links';

const field = "min-h-11 w-full min-w-0 rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900";
const button = "min-h-11 rounded-xl bg-zinc-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40";
const secondary = "min-h-11 rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-800 disabled:opacity-40";
function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="block min-w-0 space-y-1 text-xs font-semibold text-zinc-700"><span>{label}</span>{children}</label>; }
function Amount({ value }: { value: number | null | undefined }) { return <>{value === null || value === undefined ? "Pendiente" : formatCurrency(value)}</>; }
function Percent({ value }: { value: number | null }) { return <>{value === null ? "—" : `${value.toFixed(1)}%`}</>; }
const emptyLine = (): ImportLine => ({ id: crypto.randomUUID(), title: "", quantity: 1, currency: "USD", origin: 0, acquisitionArsPerUnit: 0, originUnitsPerUsd: 1, kind: "general", sourceConfirmed: false });
const emptyInput = (): ImportInput => ({ lines: [], expenses: [], expensesConfirmed: false, targetMargin: 30 });
const tabs = ["Productos y proveedores", "Seguimiento", "Proveedores", "Comparador", "Simulador", "Pasador y logística", "Precios y stock", "Nuevos productos", "Historial"] as const;
export function SupplierWorkspace({ data }: { data: SupplierWorkspaceData }) {
  const router = useRouter();
  const [tab, setTab] = useState<string>("Productos y proveedores");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [input, setInput] = useState<ImportInput>(emptyInput);
  const [title, setTitle] = useState("");
  const [policyId, setPolicyId] = useState(data.policies[0]?.id ?? "");
  const activePolicy = data.policies.find(p => p.id === policyId);
  const [policy, setPolicy] = useState<ImportPolicy>(data.policies[0].config);
  const [query, setQuery] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("");
  const [offerLimit,setOfferLimit]=useState(40);
  const [fx, setFx] = useState(data.automation?.config.acquisitionArsPerUsd??0), [unitsPerUsd, setUnitsPerUsd] = useState(0);
  const [extra, setExtra] = useState(0);
  const [csvSupplier, setCsvSupplier] = useState(data.suppliers[0]?.id ?? "");
  const [csv, setCsv] = useState("");
  const [csvPreview, setCsvPreview] = useState<Awaited<ReturnType<typeof previewOffersAction>>>([]);
  const [csvApproved, setCsvApproved] = useState(false);
  const [manualProduct, setManualProduct] = useState("");
  const act = (work: () => Promise<unknown>, success: string) => {
    setMessage(""); startTransition(async () => { try { const result = await work(); setMessage(typeof result === "string" ? result : success); router.refresh(); } catch (e) { setMessage(e instanceof Error ? e.message : "No se pudo completar la operación."); } });
  };
  function patchLine(id: string, values: Partial<ImportLine>) { setInput(i => ({ ...i, lines: i.lines.map(l => l.id === id ? { ...l, ...values } : l) })); }
  function addOffer(offer: SupplierOffer) {
    setInput(i => ({ ...i, lines: [...i.lines, { ...emptyLine(), title: `${offer.title} · ${offer.variant_key}`, offerId: offer.id, productId: offer.product_id ?? undefined,
      currency: offer.currency ?? "USD", origin: Number(offer.origin_cost ?? 0), kind: classifyImport(offer.title, offer.brand),
      acquisitionArsPerUnit: offer.currency === "ARS" ? 1 : fx, originUnitsPerUsd: offer.currency === "USD" ? 1 : unitsPerUsd,
      saleArs: offer.product_id ? data.variants.find(v => v.id === offer.variant_id)?.retail_price ?? data.products.find(p => p.id === offer.product_id)?.retail_price : undefined,
      sourceReference: offer.source_url, observedAt: offer.cost_checked_at ?? undefined,
      sourceConfirmed: offerEvidence(offer, data.suppliers.find(s => s.id === offer.supplier_id)!).usable }] }));
    setTab("Simulador");
  }
  const calculation = useMemo(() => {
    try { return { value: activePolicy && input.lines.length ? calculateImport(input, activePolicy.config) : null, error: "" }; }
    catch (e) { return { value: null, error: e instanceof Error ? e.message : "Revisá la compra." }; }
  }, [input, activePolicy]);
  const compared = useMemo(() => data.offers.filter(o => (!supplierFilter || o.supplier_id === supplierFilter) && `${o.title} ${o.brand} ${o.model} ${o.external_id} ${o.variant_key}`.toLowerCase().includes(query.toLowerCase())).map(o => {
    const supplier = data.suppliers.find(s => s.id === o.supplier_id)!;
    const evidence = offerEvidence(o, supplier);
    let result: ReturnType<typeof calculateImport>["lines"][number] | null = null;
    try {
      if (o.origin_cost && o.currency && activePolicy) result = calculateImport({ lines: [{ ...emptyLine(), title: o.title, productId: o.product_id ?? undefined, quantity: 1, origin: Number(o.origin_cost), currency: o.currency,
        acquisitionArsPerUnit: o.currency === "ARS" ? 1 : fx, originUnitsPerUsd: o.currency === "USD" ? 1 : unitsPerUsd,
        kind: classifyImport(o.title, o.brand), sourceConfirmed: evidence.usable,
        saleArs: data.variants.find(v => v.id === o.variant_id)?.retail_price ?? data.products.find(p => p.id === o.product_id)?.retail_price }],
        expenses: [{ label: "Otros gastos estimados por unidad", amountArs: extra, method: "quantity" }], expensesConfirmed: false, targetMargin: input.targetMargin }, activePolicy.config).lines[0];
    } catch { /* Missing FX remains pending. */ }
    return { o, supplier, evidence, result };
  }).sort((a, b) => Number(b.evidence.usable) - Number(a.evidence.usable) || (a.result?.landedArs ?? Infinity) - (b.result?.landedArs ?? Infinity)), [data, supplierFilter, query, activePolicy, fx, unitsPerUsd, extra, input.targetMargin]);

  return <div className="min-w-0 space-y-6">
    <nav aria-label="Herramientas de proveedores" className="flex flex-wrap gap-2">{tabs.map(t => <button key={t} aria-current={tab === t ? "page" : undefined} onClick={() => setTab(t)} className={tab === t ? button : secondary}>{t}</button>)}</nav>
    <div role="status" aria-live="polite" className={message ? "break-words rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950" : "sr-only"}>{pending ? "Procesando…" : message}</div>
    {tab==='Productos y proveedores'&&<SupplierProductLinks data={data}/>}
    {tab==='Seguimiento'&&<SupplierAutomationPanel data={data}/>}

    {tab === "Proveedores" && <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{data.suppliers.map(s => <article key={s.id} className="min-w-0 rounded-2xl border border-zinc-200 bg-white p-5">
        <h2 className="font-bold">{s.name}</h2><p className="mt-2 text-sm text-zinc-600">{s.capabilities.details ?? "Capacidades pendientes de revisión."}</p>
        {s.website && <a className="mt-3 block break-all text-sm text-sky-800 underline" href={s.website} target="_blank" rel="noreferrer">Consultar sitio ↗</a>}
        <p className="mt-2 text-xs text-zinc-600">Método: {s.query_mode === "product_page" ? "Ficha individual con identidad verificada" : s.query_mode === "public_browser" ? "Catálogo público mediante navegador" : s.query_mode === "csv" ? "CSV / carga manual" : "Carga manual"} · Revisión: {s.capabilities.reviewed_on ?? "Pendiente"}</p>
        <form className="mt-4 space-y-3" onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); act(() => configureSupplierQueryAction(s.id, f.get("authorized") === "on", Number(f.get("freshness"))), "Configuración guardada."); }}>
          <Field label="Vigencia máxima de evidencia (horas)"><input name="freshness" className={field} type="number" min="1" max="720" defaultValue={s.freshness_hours} required /></Field>
          {['product_page','public_browser'].includes(s.query_mode) && <label className="flex items-start gap-2 text-xs"><input name="authorized" type="checkbox" defaultChecked={s.automation_authorized} className="mt-1" />Habilitar seguimiento del catálogo público respetando las restricciones de esta fuente.</label>}
          <button disabled={pending} className={secondary}>Guardar configuración</button>
        </form>
      </article>)}</div>
      <section className="rounded-2xl border border-zinc-200 bg-white p-5">
        <h2 className="text-lg font-bold">Registrar una oferta o candidato</h2><p className="mt-2 text-sm text-zinc-600">Usá el identificador del proveedor y la variante exacta: capacidad, color, presentación, condición y accesorios. Vinculá sólo coincidencias verificadas. Sin vínculo se guarda como candidato privado.</p>
        <form className="mt-4 space-y-4" onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); const raw = Object.fromEntries(f.entries()); act(() => saveOfferAction(String(f.get("supplier_id")), raw, f.get("confirmed") === "on"), "Oferta guardada con historial; catálogo sin cambios."); }}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Proveedor"><select name="supplier_id" className={field}>{data.suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
            <Field label="Producto MYA (opcional)"><select name="product_id" value={manualProduct} onChange={e => setManualProduct(e.target.value)} className={field}><option value="">Nuevo candidato sin vínculo</option>{data.products.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}</select></Field>
            <Field label="Variante MYA (si corresponde)"><select key={manualProduct} name="variant_id" className={field}><option value="">Sin variante</option>{data.variants.filter(v => v.product_id === manualProduct).map(v => <option key={v.id} value={v.id}>{v.title}</option>)}</select></Field>
            {[['external_id','SKU o ID verificable'],['variant_key','Variante exacta'],['title','Nombre completo'],['brand','Marca'],['model','Modelo'],['gtin','EAN / GTIN (opcional)'],['source_url','URL de la ficha']].map(([name,label]) => <Field key={name} label={label}><input name={name} required={['external_id','variant_key','title','source_url'].includes(name)} type={name === 'source_url' ? 'url' : 'text'} maxLength={name === 'source_url' ? 2000 : 500} className={field} /></Field>)}
            <Field label="Costo original (si está documentado)"><input name="origin_cost" className={field} type="number" min="0.01" step="0.01" /></Field>
            <Field label="Moneda original"><select name="currency" className={field}><option>USD</option><option>ARS</option><option>PYG</option></select></Field>
            <Field label="Disponibilidad observada"><select name="availability" className={field}><option value="unknown">Pendiente de confirmación</option><option value="in_stock">Disponible en proveedor</option><option value="out_of_stock">Agotado confirmado</option></select></Field>
            <Field label="Identidad y fuente"><select name="verification" className={field}><option value="pending">Pendiente</option><option value="verified">Verificadas</option></select></Field>
            <Field label="Fecha de evidencia (con zona horaria)"><input name="observed_at" className={field} placeholder="2026-10-20T12:00:00-03:00" required /></Field>
          </div>
          <label className="flex gap-2 text-sm"><input name="confirmed" type="checkbox" required />Revisé la fuente, el producto y su variante.</label><button disabled={pending} className={button}>Guardar oferta privada</button>
        </form>
      </section>
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-4">
        <h2 className="text-lg font-bold">Importar CSV con vista previa</h2>
        <p className="text-sm text-zinc-600">Exportá Excel a CSV UTF-8. Hasta 200 filas por lote. Separador coma o punto y coma; decimales con punto. La importación guarda ofertas, nunca cambia precios o stock propios.</p>
        <p className="break-words text-xs text-zinc-600">Columnas obligatorias: external_id, variant_key, title, source_url, availability, verification, observed_at. Opcionales: product_id, variant_id, brand, model, gtin, origin_cost, currency.</p>
        <select aria-label="Proveedor del CSV" className={field} value={csvSupplier} onChange={e => { setCsvSupplier(e.target.value); setCsvPreview([]); setCsvApproved(false); }}>{data.suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
        <Field label="Archivo CSV"><input type="file" accept=".csv,text/csv" className={field} onChange={e => { const file = e.target.files?.[0]; if (file) { if (file.size > 500000) { setMessage("CSV demasiado grande."); return; } void file.text().then(t => { setCsv(t); setCsvPreview([]); setCsvApproved(false); }); } }} /></Field>
        <Field label="Contenido CSV"><textarea className={field} rows={5} value={csv} onChange={e => { setCsv(e.target.value); setCsvPreview([]); setCsvApproved(false); }} /></Field>
        <button className={secondary} disabled={pending || !csv} onClick={() => act(async () => { setCsvPreview(await previewOffersAction(csvSupplier, csv)); }, "Vista previa preparada. Revisá todas las filas antes de importar.")}>Validar y mostrar vista previa</button>
        {!!csvPreview.length && <><div className="max-h-80 overflow-auto rounded-xl border p-3">{csvPreview.map((r,i) => <p className="break-words py-2 text-xs" key={i}>{i + 1}. {r.title} · {r.external_id} · {r.variant_key} · {r.origin_cost ?? "Sin costo"} {r.currency} · {r.availability} · {r.observed_at}</p>)}</div>
          <label className="flex gap-2 text-sm"><input type="checkbox" checked={csvApproved} onChange={e => setCsvApproved(e.target.checked)} />Apruebo registrar estas {csvPreview.length} ofertas privadas.</label>
          <button className={button} disabled={pending || !csvApproved} onClick={() => act(async () => { const r = await importOffersAction(csvSupplier, csv, csvApproved); setCsvPreview([]); setCsvApproved(false); return `${r.count} ofertas registradas.`; }, "Importación completada.")}>Importar lote revisado</button></>}
      </section>
    </>}

    {tab === "Comparador" && <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Buscar modelo, marca o variante"><input className={field} value={query} onChange={e => setQuery(e.target.value)} placeholder="iPhone 16, Medicube, JBL…" /></Field>
        <Field label="Proveedor"><select className={field} value={supplierFilter} onChange={e => setSupplierFilter(e.target.value)}><option value="">Todos los proveedores</option>{data.suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
        <Field label="ARS por unidad de moneda de compra"><input className={field} type="number" min="0" step="0.0001" value={fx || ""} onChange={e => setFx(Number(e.target.value))} /></Field>
        <Field label="Unidades de moneda por USD (ARS / PYG)"><input className={field} type="number" min="0" step="0.0001" value={unitsPerUsd || ""} onChange={e => setUnitsPerUsd(Number(e.target.value))} /></Field>
        <Field label="Otros gastos estimados ARS por unidad"><input className={field} type="number" min="0" value={extra} onChange={e => setExtra(Number(e.target.value))} /></Field>
      </div>
      <p className="text-sm text-amber-900">Orden por costo parcial calculable y evidencia vigente. Confirmá igualdad de variante antes de comparar. Los gastos pendientes y el volumen real pueden cambiar el resultado; no es una recomendación de compra.</p>
      <p className="text-sm text-zinc-600">{data.suppliers.map(s => `${s.name}: ${data.offers.filter(o => o.supplier_id === s.id).length} ofertas`).join(" · ")}</p>
      {!compared.length && <p className="rounded-xl border p-5 text-sm">Sin ofertas registradas que coincidan. Solicitá una búsqueda desde Seguimiento o cargá una fuente real desde Proveedores.</p>}
      <div className="grid gap-4 md:grid-cols-2">{compared.slice(0,offerLimit).map(({ o, supplier, evidence, result }) => <article key={o.id} className="min-w-0 rounded-2xl border bg-white p-5 space-y-3">
        <div><h2 className="font-bold">{o.title}</h2><p className="break-words text-sm text-zinc-600">{supplier.name} · {o.variant_key} · ID {o.external_id}</p></div>
        <p className="text-sm">Origen: {o.origin_cost ?? "Pendiente"} {o.currency} · {evidence.label}</p>
        <p className="text-xs text-zinc-600">Costo: {o.cost_checked_at ?? "Sin verificar"} · Disponibilidad: {o.availability_checked_at ?? "Sin verificar"}</p>
        <dl className="grid grid-cols-2 gap-2 text-sm"><dt>Pasador (ARS)</dt><dd><Amount value={result?.carrierArs} /></dd><dt>Costo parcial Tandil</dt><dd><Amount value={result?.landedArs} /></dd><dt>Venta MYA</dt><dd><Amount value={result?.saleArs} /></dd><dt>Contribución estimada</dt><dd><Amount value={result?.profit} /></dd><dt>Margen / recargo</dt><dd><Percent value={result?.margin ?? null} /> / <Percent value={result?.markup ?? null} /></dd></dl>
        {o.product_id && <p className="text-xs text-zinc-600">Stock propio MYA: consultar inventario verificado en Stock y costos. Disponibilidad del proveedor separada.</p>}
        <a href={o.source_url} target="_blank" rel="noreferrer" className="block text-sm text-sky-800 underline">Ficha de origen ↗</a>
        <div className="flex flex-wrap gap-2"><button className={button} disabled={!o.origin_cost || pending} onClick={() => addOffer(o)}>Agregar a simulación</button><button className={secondary} disabled={pending || !supplier.automation_authorized || supplier.query_mode !== "product_page"} onClick={() => act(() => probeSupplierOfferAction(o.id), "Consulta registrada.")}>Verificar ficha</button></div>
      </article>)}</div>
      {compared.length>offerLimit&&<button className={secondary} onClick={()=>setOfferLimit(n=>n+40)}>Mostrar más ofertas ({offerLimit} de {compared.length})</button>}
      <details className="rounded-2xl border bg-white p-5"><summary className="cursor-pointer font-bold">Costos del catálogo ya documentados ({data.costs.length})</summary>
        <p className="mt-3 text-sm text-zinc-600">Referencias históricas del control de costos existente. No certifican disponibilidad actual ni comparaciones entre proveedores. Se reutiliza sólo el costo de origen; los gastos y las tarifas se revisan en el simulador.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">{data.costs.filter(c => { const p = data.products.find(p => p.id === c.product_id); return p && `${p.title} ${p.brand} ${p.model}`.toLowerCase().includes(query.toLowerCase()); }).map(c => { const p = data.products.find(p => p.id === c.product_id)!; return <article key={p.id} className="min-w-0 rounded-xl border p-4 text-sm space-y-2"><h2 className="font-semibold">{p.title}</h2><p>{c.origin_cost} {c.currency} · Evidencia {c.verified_at ?? "Sin fecha"}</p><p>Venta MYA: <Amount value={p.retail_price} /> · Disponibilidad a confirmar.</p>{c.supplier_url && <a className="block text-sky-800 underline" href={c.supplier_url} target="_blank" rel="noreferrer">Fuente documentada ↗</a>}<button className={secondary} disabled={!['USD','ARS','PYG'].includes(c.currency)} onClick={() => { setInput(i => ({ ...i, lines: [...i.lines, { ...emptyLine(), title: p.title, productId: p.id, origin: Number(c.origin_cost), currency: c.currency as ImportLine['currency'], acquisitionArsPerUnit: Number(c.exchange_rate), originUnitsPerUsd: c.currency === 'USD' ? 1 : 0, kind: classifyImport(p.title,p.brand), saleArs: p.retail_price, sourceReference: c.supplier_url ?? c.source_document ?? '', observedAt: c.verified_at ?? '', sourceConfirmed: false }] })); setTab('Simulador'); }}>Simular costo histórico</button></article>; })}</div>
      </details>
    </>}

    {tab === "Simulador" && <>
      <div className="grid gap-3 sm:grid-cols-3"><Field label="Nombre de simulación"><input className={field} value={title} onChange={e => setTitle(e.target.value)} placeholder="Compra para revisar" maxLength={200} /></Field>
        <Field label="Versión de tarifas"><select className={field} value={policyId} onChange={e => setPolicyId(e.target.value)}>{data.policies.map(p => <option key={p.id} value={p.id}>{p.config.effectiveFrom} · {p.created_at}</option>)}</select></Field>
        <Field label="Margen objetivo sobre venta (%)"><input className={field} type="number" min="0" max="99" value={input.targetMargin} onChange={e => setInput(i => ({ ...i, targetMargin: Number(e.target.value) }))} /></Field>
      </div>
      <p className="text-sm text-zinc-600">Precio sugerido por margen: estimación sin referencia de mercado. Para fijar el precio comercial, revisá el comparable exacto y la política de MYA en <Link className="underline text-sky-800" href="/admin/costos">Stock y costos</Link>. Contribución después de los gastos cargados; no implica ganancia neta.</p>
      <div className="flex flex-wrap gap-2"><button className={secondary} onClick={() => setInput(i => ({ ...i, lines: [...i.lines, emptyLine()] }))}>Agregar artículo manual</button><button className={secondary} onClick={() => setTab("Comparador")}>Seleccionar oferta de proveedor</button></div>
      {input.lines.map((l,index) => <section key={l.id} className="min-w-0 rounded-2xl border bg-white p-5 space-y-3">
        <div className="flex items-start justify-between gap-3"><h2 className="break-words font-bold">{index + 1}. {l.title || "Nuevo artículo"}</h2><button className={secondary} onClick={() => setInput(i => ({ ...i, lines: i.lines.filter(row => row.id !== l.id) }))}>Quitar</button></div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Producto / variante exacta"><input className={field} value={l.title} readOnly={!!l.offerId} onChange={e => patchLine(l.id, { title: e.target.value, kind: classifyImport(e.target.value) })} /></Field>
          {!l.offerId && <><Field label="Fuente del costo (URL o documento)"><input className={field} maxLength={2000} value={l.sourceReference ?? ""} onChange={e => patchLine(l.id, { sourceReference: e.target.value, sourceConfirmed: false })} /></Field><Field label="Fecha de evidencia (con zona horaria)"><input className={field} value={l.observedAt ?? ""} placeholder="2026-10-20T12:00:00-03:00" onChange={e => patchLine(l.id, { observedAt: e.target.value, sourceConfirmed: false })} /></Field></>}
          <Field label="Cantidad"><input className={field} type="number" min="1" max="10000" value={l.quantity} onChange={e => patchLine(l.id, { quantity: Number(e.target.value) })} /></Field>
          <Field label="Costo unitario original"><input className={field} type="number" step="0.01" min="0.01" value={l.origin || ""} readOnly={!!l.offerId} onChange={e => patchLine(l.id, { origin: Number(e.target.value) })} /></Field>
          <Field label="Moneda"><select className={field} value={l.currency} disabled={!!l.offerId} onChange={e => patchLine(l.id, { currency: e.target.value as ImportLine['currency'], acquisitionArsPerUnit: e.target.value === 'ARS' ? 1 : 0, originUnitsPerUsd: e.target.value === 'USD' ? 1 : 0 })}><option>USD</option><option>ARS</option><option>PYG</option></select></Field>
          <Field label="ARS por unidad de moneda (adquisición)"><input className={field} type="number" step="0.0001" min="0.0001" value={l.acquisitionArsPerUnit || ""} onChange={e => patchLine(l.id, { acquisitionArsPerUnit: Number(e.target.value) })} /></Field>
          <Field label="Unidades de moneda por USD"><input className={field} type="number" step="0.0001" min="0.0001" value={l.originUnitsPerUsd || ""} onChange={e => patchLine(l.id, { originUnitsPerUsd: Number(e.target.value) })} /></Field>
          <Field label="Clasificación corregible"><select className={field} value={l.kind} onChange={e => patchLine(l.id, { kind: e.target.value as ImportLine['kind'] })}><option value="general">General</option><option value="iphone">iPhone (equipo)</option><option value="tv">Televisor</option></select></Field>
          {l.kind === "tv" && <Field label="Pulgadas exactas"><input className={field} type="number" min="1" value={l.inches ?? ""} onChange={e => patchLine(l.id, { inches: e.target.value ? Number(e.target.value) : undefined })} /></Field>}
          <Field label="Venta unitaria MYA (ARS)"><input className={field} type="number" min="0" step="0.01" value={l.saleArs ?? ""} onChange={e => patchLine(l.id, { saleArs: e.target.value ? Number(e.target.value) : undefined })} /></Field>
          <Field label="Peso por unidad (kg, opcional)"><input className={field} type="number" step="0.001" min="0" value={l.weight ?? ""} onChange={e => patchLine(l.id, { weight: e.target.value ? Number(e.target.value) : undefined })} /></Field>
          <Field label="Volumen por unidad (m³, opcional)"><input className={field} type="number" step="0.001" min="0" value={l.volume ?? ""} onChange={e => patchLine(l.id, { volume: e.target.value ? Number(e.target.value) : undefined })} /></Field>
          <Field label="Cotización especial USD / unidad"><input className={field} type="number" step="0.01" min="0" value={l.specialUsd ?? ""} onChange={e => patchLine(l.id, { specialUsd: e.target.value ? Number(e.target.value) : undefined, specialConfirmed: false })} /></Field>
        </div>
        {l.specialUsd !== undefined && <label className="flex gap-2 text-sm"><input type="checkbox" checked={!!l.specialConfirmed} onChange={e => patchLine(l.id, { specialConfirmed: e.target.checked })} />Cotización particular confirmada; reemplaza las demás tarifas.</label>}
        {!l.offerId && <label className="flex gap-2 text-sm"><input type="checkbox" checked={l.sourceConfirmed} onChange={e => patchLine(l.id, { sourceConfirmed: e.target.checked })} />Costo, variante y fuente confirmados para esta simulación manual.</label>}
      </section>)}
      <section className="rounded-2xl border bg-white p-5 space-y-4">
        <h2 className="font-bold">Gastos compartidos del envío</h2><p className="text-sm text-zinc-600">Registrá transporte hasta Tandil, tributos, comisiones, seguro y otros gastos aplicables. Se distribuyen una sola vez entre los artículos.</p>
        {input.expenses.map((expense,index) => <div key={index} className="space-y-3 rounded-xl border p-3">
          <div className="grid gap-3 sm:grid-cols-3"><Field label="Concepto"><input className={field} value={expense.label} onChange={e => setInput(i => ({ ...i, expenses: i.expenses.map((v,n) => n === index ? { ...v, label: e.target.value } : v) }))} /></Field>
            <Field label="Total del gasto ARS"><input className={field} type="number" min="0" step="0.01" value={expense.amountArs} onChange={e => setInput(i => ({ ...i, expenses: i.expenses.map((v,n) => n === index ? { ...v, amountArs: Number(e.target.value) } : v) }))} /></Field>
            <Field label="Distribución"><select className={field} value={expense.method} onChange={e => setInput(i => ({ ...i, expenses: i.expenses.map((v,n) => n === index ? { ...v, method: e.target.value as SharedExpense['method'] } : v) }))}><option value="value">Por valor de mercadería</option><option value="quantity">Por cantidad</option><option value="weight">Por peso</option><option value="volume">Por volumen</option><option value="manual">Asignación manual</option></select></Field>
          </div>
          {expense.method === "manual" && <div className="grid gap-3 sm:grid-cols-2">{input.lines.map(l => <Field key={l.id} label={`${l.title || 'Artículo'}: ARS asignados al total de unidades`}><input className={field} type="number" min="0" step="0.01" value={expense.manual?.[l.id] ?? 0} onChange={e => setInput(i => ({ ...i, expenses: i.expenses.map((v,n) => n === index ? { ...v, manual: { ...v.manual, [l.id]: Number(e.target.value) } } : v) }))} /></Field>)}</div>}
          <button className={secondary} onClick={() => setInput(i => ({ ...i, expenses: i.expenses.filter((_,n) => n !== index) }))}>Quitar gasto</button>
        </div>)}
        <button className={secondary} onClick={() => setInput(i => ({ ...i, expenses: [...i.expenses, { label: "", amountArs: 0, method: "value" }] }))}>Agregar gasto</button>
        <div className="grid gap-3 sm:grid-cols-2"><Field label="Cotización especial del envío completo (USD, opcional)"><input className={field} type="number" min="0" step="0.01" value={input.shipmentSpecialUsd ?? ""} onChange={e => setInput(i => ({ ...i, shipmentSpecialUsd: e.target.value ? Number(e.target.value) : undefined, shipmentSpecialConfirmed: false }))} /></Field>
          {input.shipmentSpecialUsd !== undefined && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!input.shipmentSpecialConfirmed} onChange={e => setInput(i => ({ ...i, shipmentSpecialConfirmed: e.target.checked }))} />Cotización del envío confirmada</label>}</div>
        <label className="flex gap-2 text-sm"><input type="checkbox" checked={input.expensesConfirmed} onChange={e => setInput(i => ({ ...i, expensesConfirmed: e.target.checked }))} />Confirmé todos los gastos aplicables, incluidos los que no corresponden a esta operación.</label>
      </section>
      {calculation.error && <p role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">{calculation.error}</p>}
      {calculation.value && <section className="rounded-2xl border bg-white p-5 space-y-4"><h2 className="text-lg font-bold">{calculation.value.approvable ? "Costo calculado con datos confirmados" : "Proyección parcial / pendientes"}</h2>
        {calculation.value.warnings.map(w => <p key={w} className="text-sm text-amber-900">• {w}</p>)}
        {calculation.value.lines.map(l => <div key={l.id} className="rounded-xl bg-zinc-50 p-4 text-sm space-y-1"><h3 className="font-semibold">{l.title} × {l.quantity}</h3><p className="break-words text-xs text-zinc-600">Fuente: {l.sourceReference || "Pendiente"} · Evidencia: {l.observedAt || "Sin fecha"}</p><p>{l.rule} · Pasador USD {l.carrierUsd ?? "Pendiente"} / <Amount value={l.carrierArs} /></p><p>Mercadería: <Amount value={l.goodsArs} /> · Gastos asignados: <Amount value={l.sharedArs} /></p><p>Total artículo: <Amount value={l.landedArs} /> · Unitario: <Amount value={l.unitArs} /> · Venta por margen: <Amount value={l.suggestedArs} /></p><p>Contribución: <Amount value={l.profit} /> · Margen: <Percent value={l.margin} /> · Recargo: <Percent value={l.markup} /></p></div>)}
        <p className="font-bold">Mercadería USD {calculation.value.goodsUsd} · Pasador USD {calculation.value.carrierUsd ?? "Pendiente"} · Total: <Amount value={calculation.value.totalArs} /></p>
      </section>}
      <button className={button} disabled={pending || !calculation.value || !title.trim()} onClick={() => act(async () => { await saveImportSimulationAction(title, input, policyId); }, "Simulación guardada. Revisala en Historial; no modifica stock ni realiza una compra.")}>Guardar simulación</button>
    </>}

    {tab === "Pasador y logística" && <section className="rounded-2xl border bg-white p-5 space-y-4">
      <h2 className="text-lg font-bold">Nueva versión de tarifas</h2><p className="text-sm text-zinc-600">Cada guardado conserva la versión anterior. La cotización ARS 1.600 fue informada el 16/10/2026; actualizá sólo con lo informado por el pasador. No acredita tributos ni transporte nacional.</p>
      <form className="space-y-4" onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); act(() => saveImportPolicyAction(policy, f.get("confirmed_change") === "on"), "Nueva versión de tarifas guardada. Seleccionala en el simulador."); }}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {([['generalPercent','Comisión general (%)'],['volumePercent','Comisión por volumen (%)'],['thresholdUsd','Umbral USD (superación estricta)'],['carrierArsPerUsd','ARS por USD del pasador'],['iphoneUsd','iPhone: USD por unidad']] as const).map(([key,label]) => <Field key={key} label={label}><input className={field} type="number" min="0" step="0.01" value={policy[key]} onChange={e => setPolicy(p => ({ ...p, [key]: Number(e.target.value) }))} required /></Field>)}
          <Field label="Vigencia de las tarifas"><input className={field} type="date" value={policy.effectiveFrom} onChange={e => setPolicy(p => ({ ...p, effectiveFrom: e.target.value }))} required /></Field>
          <Field label="Fecha informada de la cotización"><input className={field} type="date" value={policy.carrierFxDate} onChange={e => setPolicy(p => ({ ...p, carrierFxDate: e.target.value }))} required /></Field>
          <Field label="Base del umbral"><select className={field} value={policy.thresholdBase} onChange={e => setPolicy(p => ({ ...p, thresholdBase: e.target.value as ImportPolicy['thresholdBase'] }))}><option value="shipment">Toda la mercadería del envío</option><option value="eligible">Sólo mercadería general elegible</option></select></Field>
          <Field label="Base de la comisión reducida"><select className={field} value={policy.reducedBase} onChange={e => setPolicy(p => ({ ...p, reducedBase: e.target.value as ImportPolicy['reducedBase'] }))}><option value="all_eligible">Toda la mercadería elegible</option><option value="excess">Sólo excedente del umbral, prorrateado</option></select></Field>
        </div>
        {([['confirmed','Tarifas confirmadas'],['volumeConfirmed','Interpretación del umbral y base de volumen confirmada'],['mixedConfirmed','Aplicación de volumen en pedidos mixtos confirmada']] as const).map(([key,label]) => <label key={key} className="flex gap-2 text-sm"><input type="checkbox" checked={policy[key]} onChange={e => setPolicy(p => ({ ...p, [key]: e.target.checked }))} />{label}</label>)}
        <h3 className="font-semibold">TV: tarifa exacta por unidad</h3><div className="grid gap-3 sm:grid-cols-3">{Object.entries(policy.tvUsd).map(([size,rate]) => <Field key={size} label={`${size} pulgadas (USD)`}><div className="flex gap-2"><input className={field} aria-label={`Tarifa USD ${size} pulgadas`} type="number" min="0" step="0.01" required value={Number.isFinite(rate) ? rate : ""} onChange={e => setPolicy(p => ({ ...p, tvUsd: { ...p.tvUsd, [size]: Number(e.target.value) } }))} /><button type="button" aria-label={`Quitar tarifa de ${size} pulgadas`} className={secondary} onClick={() => setPolicy(p => ({ ...p, tvUsd: Object.fromEntries(Object.entries(p.tvUsd).filter(([k]) => k !== size)) }))}>×</button></div></Field>)}</div>
        <Field label="Agregar tamaño (pulgadas)"><input className={field} type="number" min="1" name="new_size" /></Field><button className={secondary} type="button" onClick={e => { const size = Number(new FormData(e.currentTarget.form!).get("new_size")); if (size > 0 && Number.isInteger(size)) setPolicy(p => ({ ...p, tvUsd: { ...p.tvUsd, [size]: p.tvUsd[String(size)] ?? Number.NaN } })); }}>Agregar tamaño para cotizar</button>
        <h3 className="font-semibold">Excepciones por producto</h3>
        {Object.entries(policy.productUsd).map(([id,rate]) => <Field key={id} label={data.products.find(p => p.id === id)?.title ?? id}><div className="flex gap-2"><input className={field} type="number" min="0" step="0.01" required value={Number.isFinite(rate) ? rate : ""} onChange={e => setPolicy(p => ({ ...p, productUsd: { ...p.productUsd, [id]: Number(e.target.value) } }))} /><button type="button" className={secondary} onClick={() => setPolicy(p => ({ ...p, productUsd: Object.fromEntries(Object.entries(p.productUsd).filter(([k]) => k !== id)) }))}>Quitar</button></div></Field>)}
        <Field label="Agregar producto con tarifa particular"><select className={field} defaultValue="" onChange={e => { if (e.target.value) setPolicy(p => ({ ...p, productUsd: { ...p.productUsd, [e.target.value]: p.productUsd[e.target.value] ?? Number.NaN } })); }}><option value="">Seleccionar…</option>{data.products.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}</select></Field>
        <Field label="Observaciones y fuente de confirmación"><textarea className={field} rows={3} value={policy.notes} maxLength={5000} onChange={e => setPolicy(p => ({ ...p, notes: e.target.value }))} /></Field>
        <label className="flex gap-2 text-sm"><input type="checkbox" required name="confirmed_change" />Apruebo guardar esta nueva versión de condiciones comerciales.</label><button className={button} disabled={pending}>Guardar versión de tarifas</button>
      </form>
    </section>}

    {(tab === "Precios y stock" || tab === "Nuevos productos") && <section className="space-y-4">
      <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">Aprobar aquí registra la revisión privada. La aplicación al catálogo se realiza desde el editor existente, con su propia confirmación. Los borradores no se publican automáticamente.</p>
      <Link href="/admin/costos" className="inline-block text-sm text-sky-800 underline">Abrir revisión de costos y precios MYA</Link>
      {data.proposals.filter(p => tab === "Nuevos productos" ? p.kind === "new_candidate" && !p.after_value.product_id : p.kind !== "new_candidate" || !!p.after_value.product_id).map(p => <article key={p.id} className="rounded-2xl border bg-white p-5 space-y-3"><h2 className="font-bold">{p.after_value.title ?? data.offers.find(o => o.id === p.offer_id)?.title ?? "Oferta"}</h2><p className="text-sm">{p.kind} · {p.status} · {p.created_at}</p>
        <div className="grid gap-3 sm:grid-cols-2"><div className="text-sm"><strong>Anterior</strong><p>{p.before_value?.origin_cost ?? "Sin costo"} {p.before_value?.currency} · {p.before_value?.availability ?? "Sin evidencia"}</p></div><div className="text-sm"><strong>Propuesto</strong><p>{p.after_value.origin_cost ?? "Sin costo"} {p.after_value.currency} · {p.after_value.availability ?? "Revisión requerida"}</p><p className="break-words">{p.after_value.variant_key}</p></div></div>
        {p.status === "pending" && <div className="flex flex-wrap gap-2"><button className={button} disabled={pending} onClick={() => act(() => reviewSupplierProposalAction(p.id, "approved"), "Revisión aprobada; catálogo sin cambios.")}>Aprobar revisión</button><button className={secondary} disabled={pending} onClick={() => act(() => reviewSupplierProposalAction(p.id, "rejected"), "Propuesta rechazada.")}>Rechazar</button></div>}
      </article>)}
      {!data.proposals.length && <p className="text-sm text-zinc-600">Todavía no hay propuestas. Se generan a partir de ofertas y consultas registradas.</p>}
    </section>}

    {tab === "Historial" && <div className="space-y-5">
      <h2 className="text-lg font-bold">Simulaciones guardadas (últimas 50)</h2>
      <div className="grid gap-4 md:grid-cols-2">{data.simulations.map(s => <article key={s.id} className="min-w-0 rounded-2xl border bg-white p-5 space-y-3"><h3 className="font-bold">{s.title}</h3><p className="text-xs text-zinc-600">{s.created_at} · Tarifa {data.policies.find(p => p.id === s.policy_id)?.config.effectiveFrom ?? s.policy_id}</p><p className="text-sm">Mercadería USD {s.result.goodsUsd} · Pasador USD {s.result.carrierUsd ?? "Pendiente"} · Total <Amount value={s.result.totalArs} /></p>{s.result.warnings.map(w => <p key={w} className="text-xs text-amber-900">{w}</p>)}
        <button className={secondary} onClick={() => { setTitle(`${s.title} (revisión)`); setInput(s.input); setPolicyId(s.policy_id); setTab("Simulador"); }}>Abrir copia para comparar</button>
        {data.purchases.some(p => p.simulation_id === s.id) ? <p className="text-sm font-semibold text-emerald-800">Compra registrada administrativamente</p> : <form className="space-y-3" onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); act(() => approveImportPurchaseAction(s.id, String(f.get("notes")), f.get("approved") === "on"), "Compra registrada administrativamente. No se realizó ningún encargo, pago ni ingreso de stock."); }}>
          <Field label="Referencia de aprobación / observaciones"><input className={field} name="notes" required maxLength={2000} /></Field><label className="flex gap-2 text-xs"><input type="checkbox" name="approved" required />Apruebo convertir esta simulación en registro administrativo de compra.</label><button className={button} disabled={pending || !s.result.approvable}>Registrar compra aprobada</button>
        </form>}
      </article>)}</div>
      {!data.simulations.length && <p className="text-sm text-zinc-600">Sin simulaciones guardadas.</p>}
      <details className="rounded-2xl border bg-white p-5"><summary className="cursor-pointer font-semibold">Versiones de tarifas (últimas 100)</summary>{data.policies.map(p => <p key={p.id} className="mt-3 break-words text-sm">{p.created_at} · {p.config.generalPercent}% / {p.config.volumePercent}% · USD/ARS pasador {p.config.carrierArsPerUsd} ({p.config.carrierFxDate}) · {p.config.notes}</p>)}</details>
      <details className="rounded-2xl border bg-white p-5"><summary className="cursor-pointer font-semibold">Consultas y cambios (últimos 100)</summary>{data.observations.map(o => <p key={o.id} className="mt-3 break-words text-sm">{o.recorded_at} · {data.offers.find(offer => offer.id === o.offer_id)?.title ?? o.offer_id} · {o.kind} · Evidencia {o.observed_at}</p>)}</details>
    </div>}
  </div>;
}
