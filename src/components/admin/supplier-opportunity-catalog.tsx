import Link from 'next/link';
import { CatalogSyncButton } from './catalog-sync-button';
import { OpportunityInteractiveGrid, type OpportunityItem } from './opportunity-interactive-grid';

const root = '/admin/oportunidades';
export const opportunityStates: Record<string,string> = {
  discovered:'Descubierto',ready:'Listo para publicar',review:'Requiere revisión',published:'Publicado',
  out_of_stock:'Sin stock',stale:'Desactualizado',error:'Con incidencia',in_stock:'Con stock',unknown:'Disponibilidad a confirmar',new:'Nuevos (24 h)',
};
const date = new Intl.DateTimeFormat('es-AR',{ dateStyle:'short',timeStyle:'short',timeZone:'America/Argentina/Buenos_Aires' });
const num = new Intl.NumberFormat('es-AR',{ maximumFractionDigits:2 });
export const displayCatalogDate = (value: string|null) => value ? date.format(new Date(value)) : 'Pendiente';
export const displayCatalogAmount = (value: number|null, currency = 'USD') => value == null ? 'Pendiente' : currency + ' ' + num.format(value);

type Opportunity = OpportunityItem;
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
  const filterParams = (overrides: Record<string, string | null>) => {
    const next = { ...filters };
    for (const [k, v] of Object.entries(overrides)) {
      if (v === null || v === '') delete next[k];
      else next[k] = v;
    }
    delete next.page;
    const qs = new URLSearchParams(next).toString();
    return root + (qs ? '?' + qs : '');
  };

  const maxPage = Math.max(1,Math.ceil(page.total/page.size));
  const selectedSource = summary.sources.find(source => source.id === filters.sourceId);
  const runLabels: Record<string,string> = { queued:'En cola', running:'En curso', done:'Navegación finalizada', partial:'Cobertura incompleta', paused:'Pausado', error:'Error' };
  const totalStockEvidence = summary.counts.reduce((acc, c) => acc + (c.with_stock_evidence ?? 0), 0);

  const statusPills: { key: string | null; label: string; count?: number }[] = [
    { key: null, label: 'Todos' },
    { key: 'in_stock', label: '⚡ Solo en stock', count: totalStockEvidence > 0 ? totalStockEvidence : undefined },
    { key: 'new', label: 'Nuevos (24 h)' },
    { key: 'ready', label: 'Listos para publicar' },
    { key: 'published', label: 'Ya publicados' },
    { key: 'review', label: 'Requiere revisión' },
    { key: 'out_of_stock', label: 'Sin stock' },
  ];

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

    {/* Quick status filter pills */}
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mr-1">Filtro rápido:</span>
      {statusPills.map((pill) => {
        const isActive = (pill.key === null && !filters.status) || filters.status === pill.key;
        return (
          <Link
            key={pill.key ?? 'all'}
            href={filterParams({ status: pill.key })}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all ${
              isActive
                ? 'bg-sky-900 text-white shadow-sm ring-1 ring-sky-900'
                : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
            }`}
          >
            {pill.label}
            {pill.count != null && (
              <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                isActive ? 'bg-sky-800 text-sky-100' : 'bg-zinc-200 text-zinc-600'
              }`}>
                {pill.count}
              </span>
            )}
          </Link>
        );
      })}
    </div>

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

    {/* Interactive Grid with Multi-select and Batch Publishing */}
    <OpportunityInteractiveGrid items={page.items} />

    <nav aria-label="Paginación del catálogo" className="flex flex-wrap items-center justify-center gap-4 text-sm">
      {page.page > 1 && <Link href={params(page.page-1)} className="rounded-lg border px-3 py-2">Anterior</Link>}
      <span>Página {page.page} de {maxPage}</span>
      {page.page < maxPage && <Link href={params(page.page+1)} className="rounded-lg border px-3 py-2">Siguiente</Link>}
    </nav>
  </section>;
}
