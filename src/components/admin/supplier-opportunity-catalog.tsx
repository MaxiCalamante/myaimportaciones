import Link from 'next/link';
import Image from 'next/image';
import { CatalogSyncButton } from './catalog-sync-button';
import { OpportunityCardActions } from './opportunity-card-actions';

const root = '/admin/oportunidades';
export const opportunityStates: Record<string,string> = {
  discovered:'Descubierto',ready:'Listo para publicar',review:'Requiere revisión',published:'Publicado',
  out_of_stock:'Sin stock',stale:'Desactualizado',error:'Con incidencia',in_stock:'Con stock',unknown:'Disponibilidad a confirmar',new:'Nuevos (24 h)',
};
const date = new Intl.DateTimeFormat('es-AR',{ dateStyle:'short',timeStyle:'short',timeZone:'America/Argentina/Buenos_Aires' });
const num = new Intl.NumberFormat('es-AR',{ maximumFractionDigits:2 });
export const displayCatalogDate = (value: string|null) => value ? date.format(new Date(value)) : 'Pendiente';
export const displayCatalogAmount = (value: number|null, currency = 'USD') => value == null ? 'Pendiente' : currency + ' ' + num.format(value);

type Opportunity = {
  id:string; title:string; brand:string; sku:string; model:string; url:string; image_url:string|null;
  origin_cost:number|null; currency:string|null; last_success_at:string|null; last_error:string|null; supplier:string;
  state:string; availability:string; displayed_retail_usd:number|null; displayed_wholesale_usd:number|null;
  displayed_retail_ars:number|null; displayed_wholesale_ars:number|null;
  cost_usd:number|null; margin:number|null; active:boolean; slug:string|null;
};
export type CatalogSummary = {
  suppliers:{ id:string; name:string; enabled:boolean; last_success_at:string|null; next_run_at:string|null }[];
  sources:{ id:string; supplier_id:string; label:string; enabled:boolean; items:number }[];
  runs:{ id:string; supplier_id:string; label:string; state:string; started_at:string; pages:number; new_items:number; items:number;
    detected:number; completed:number; pending:number; errors:number; last_error:string|null; error:string|null;
    report:{ blockedPages?:number; repeatedPages?:number; previousItems?:number; excluded?:number } }[];
  counts:{ supplier_id:string; total:number; with_price:number; with_stock_evidence:number; item_errors:number; linked:number }[];
};
export type CatalogPageData = { total:number; page:number; size:number; items:Opportunity[] };

const field = 'min-h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm';
export function SupplierOpportunityCatalog({ summary, page, filters }: {
  summary:CatalogSummary; page:CatalogPageData; filters:Record<string,string>;
}) {
  const params = (next: number) => root + '?' + new URLSearchParams({ ...filters, page:String(next) });
  const maxPage = Math.max(1,Math.ceil(page.total/page.size));
  const selectedSource = summary.sources.find(source => source.id === filters.sourceId);
  const runLabels: Record<string,string> = { queued:'En cola', running:'En curso', done:'Navegación finalizada', partial:'Cobertura incompleta', paused:'Pausado', error:'Error' };
  return <section className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="text-2xl font-bold">Catálogo de oportunidades</h1><p className="mt-1 text-sm text-zinc-600">Referencias privadas de los cuatro proveedores autorizados.</p></div>
      <CatalogSyncButton label="Sincronizar todos" />
    </div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {summary.suppliers.map(supplier => {
        const count = summary.counts.find(c => c.supplier_id === supplier.id);
        return <article key={supplier.id} className="min-w-0 rounded-xl border p-4 text-sm">
          <h2 className="font-semibold">{supplier.name}</h2>
          <p>{num.format(count?.total ?? 0)} referencias · {num.format(count?.with_price ?? 0)} con precio</p>
          <p>{count?.with_stock_evidence ?? 0} con evidencia de stock · {count?.item_errors ?? 0} incidencias</p>
          <p className="my-2 text-xs text-zinc-600">Último recorrido finalizado {displayCatalogDate(supplier.last_success_at)}</p>
          {supplier.enabled && <CatalogSyncButton label="Sincronizar proveedor" supplierId={supplier.id} />}
        </article>;
      })}
    </div>
    <details className="rounded-xl border p-4" open={summary.runs.some(run => run.state === 'running')}>
      <summary className="cursor-pointer font-semibold">Avance y resultados de sincronización</summary>
      <p className="my-2 text-sm text-zinc-600">Los recorridos se procesan en segundo plano. Actualizá la página para ver el último avance. La navegación completa acredita las páginas públicas recorridas.</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {summary.runs.map(run => <div key={run.id} className="rounded-lg bg-zinc-50 p-3 text-sm">
          <p className="font-semibold">{summary.suppliers.find(s => s.id === run.supplier_id)?.name} · {run.label}</p>
          <p>{runLabels[run.state] ?? run.state} · {displayCatalogDate(run.started_at)}</p>
          <p>{run.completed}/{run.detected} categorías · {run.pages} páginas · {run.pending} pendientes</p>
          <p>{run.items} únicas · {run.new_items} nuevas · {run.report.excluded ?? '—'} excluidas · {run.errors} errores de página</p>
          {(run.error || run.last_error) && <p className="mt-1 break-words text-red-800">{run.error ?? run.last_error}</p>}
          {!!run.report.repeatedPages && <p>Se detectó contenido repetido en {run.report.repeatedPages} páginas.</p>}
          {!!run.report.previousItems && run.items < run.report.previousItems * 0.6 && <p>Caída frente a la ejecución anterior de {run.report.previousItems} referencias.</p>}
          {run.state !== 'queued' && <Link className="mt-1 inline-block text-sky-800 underline" href={root + '/recorridos/' + run.id}>Detalle por categoría</Link>}
        </div>)}
      </div>
    </details>
    <form action={root} className="grid gap-3 rounded-xl border bg-zinc-50 p-4 sm:grid-cols-2 lg:grid-cols-4">
      <label className="text-sm">Nombre, SKU, marca o modelo<input className={field} name="q" type="search" maxLength={120} defaultValue={filters.q} /></label>
      <label className="text-sm">Proveedor<select className={field} name="supplierId" defaultValue={filters.supplierId ?? ''}>
        <option value="">Todos</option>{summary.suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select></label>
      <label className="text-sm">Categoría o subcategoría<select className={field} name="sourceId" defaultValue={filters.sourceId ?? ''}>
        <option value="">Todas</option>{summary.suppliers.map(supplier => <optgroup key={supplier.id} label={supplier.name}>
          {summary.sources.filter(s => s.supplier_id===supplier.id).map(s => <option key={s.id} value={s.id}>{s.label} ({s.items})</option>)}
        </optgroup>)}
      </select></label>
      <label className="text-sm">Estado<select className={field} name="status" defaultValue={filters.status ?? ''}>
        <option value="">Todos</option>{Object.entries(opportunityStates).map(([key,label]) => <option key={key} value={key}>{label}</option>)}
      </select></label>
      <label className="text-sm">Moneda de origen<select className={field} name="currency" defaultValue={filters.currency ?? ''}>
        <option value="">Todas</option>{['USD','ARS','PYG','BRL'].map(v => <option key={v}>{v}</option>)}
      </select></label>
      {Object.entries({ minOrigin:'Precio de origen desde',maxOrigin:'Precio de origen hasta',minCost:'Costo total desde (USD)',minMargin:'Margen minorista mínimo (%)' }).map(([name,label]) => (
        <label key={name} className="text-sm">{label}<input className={field} name={name} type="number" min="0" step="any" defaultValue={filters[name]} /></label>
      ))}
      <label className="text-sm">Verificado desde<input className={field} name="checkedFrom" type="date" defaultValue={filters.checkedFrom} /></label>
      <label className="text-sm">Orden<select className={field} name="sort" defaultValue={filters.sort ?? 'new'}>
        <option value="new">Novedad</option><option value="price">Precio por moneda</option><option value="margin">Stock y margen calculado</option><option value="checked">Última verificación</option>
      </select></label>
      <div className="flex flex-wrap items-end gap-3"><button type="submit" className="min-h-10 rounded-lg bg-sky-900 px-4 text-sm font-semibold text-white">Aplicar filtros</button><Link className="py-2 text-sm underline" href={root}>Limpiar</Link></div>
    </form>
    {selectedSource?.enabled && <CatalogSyncButton label="Sincronizar categoría" sourceId={selectedSource.id} />}
    <p className="text-sm font-medium">{num.format(page.total)} resultados</p>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {page.items.map(item => {
        const costEstimated = item.cost_usd ?? (item.origin_cost != null && (!item.currency || item.currency === 'USD') ? Math.round(item.origin_cost * 1.2 * 100) / 100 : null);
        const retailEstimated = item.displayed_retail_usd ?? (costEstimated != null ? Math.round((costEstimated / 0.7) * 100) / 100 : null);
        const wholesaleEstimated = item.displayed_wholesale_usd ?? (costEstimated != null ? Math.round((costEstimated / 0.82) * 100) / 100 : null);
        return (
          <article key={item.id} className="min-w-0 rounded-xl border bg-white p-4 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-start gap-3">
                {item.image_url && <Image unoptimized width={64} height={64} src={item.image_url} alt="" loading="lazy" className="size-16 shrink-0 rounded-lg object-contain bg-zinc-50 border border-zinc-100" />}
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-zinc-500 font-medium">{item.supplier} · {opportunityStates[item.state]}</p>
                  <h2 className="break-words font-semibold text-zinc-900 leading-snug line-clamp-2">{item.title}</h2>
                  <p className="break-words text-xs text-zinc-500 mt-0.5">{[item.brand,item.model,item.sku].filter(Boolean).join(' · ')}</p>
                </div>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-sm bg-zinc-50/70 p-2.5 rounded-lg border border-zinc-100">
                <div><dt className="text-[11px] font-medium text-zinc-500">Origen</dt><dd className="font-semibold text-zinc-900">{displayCatalogAmount(item.origin_cost,item.currency ?? '')}</dd></div>
                <div><dt className="text-[11px] font-medium text-zinc-500">Costo total (+20% pasero)</dt><dd className="font-semibold text-zinc-900">{displayCatalogAmount(item.cost_usd ?? costEstimated)}</dd></div>
                <div><dt className="text-[11px] font-medium text-zinc-500">Minorista MYA (30%)</dt><dd className="font-semibold text-emerald-700">{item.displayed_retail_usd!=null?displayCatalogAmount(item.displayed_retail_usd):retailEstimated!=null?displayCatalogAmount(retailEstimated):displayCatalogAmount(item.displayed_retail_ars,'ARS')}</dd></div>
                <div><dt className="text-[11px] font-medium text-zinc-500">Mayorista MYA (18%)</dt><dd className="font-semibold text-sky-700">{item.displayed_wholesale_usd!=null?displayCatalogAmount(item.displayed_wholesale_usd):wholesaleEstimated!=null?displayCatalogAmount(wholesaleEstimated):displayCatalogAmount(item.displayed_wholesale_ars,'ARS')}</dd></div>
              </dl>
              <p className="mt-2.5 text-xs text-zinc-500">{opportunityStates[item.availability]} · Verificado {displayCatalogDate(item.last_success_at)}</p>
              {item.margin != null && <p className="text-xs font-medium text-emerald-700 mt-0.5">Margen minorista calculado: {num.format(item.margin)}%</p>}
              {item.last_error && <p className="mt-1 line-clamp-2 text-xs text-red-700 bg-red-50 p-1.5 rounded">{item.last_error}</p>}
            </div>
            <OpportunityCardActions item={item} />
          </article>
        );
      })}
    </div>
    <nav aria-label="Paginación del catálogo" className="flex flex-wrap items-center justify-center gap-4 text-sm">
      {page.page > 1 && <Link href={params(page.page-1)} className="rounded-lg border px-3 py-2">Anterior</Link>}
      <span>Página {page.page} de {maxPage}</span>
      {page.page < maxPage && <Link href={params(page.page+1)} className="rounded-lg border px-3 py-2">Siguiente</Link>}
    </nav>
  </section>;
}
