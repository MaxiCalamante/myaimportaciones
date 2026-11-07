'use client';

import { useState, useTransition } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, CheckSquare, Square, Zap, Loader2, AlertCircle, ExternalLink, X } from 'lucide-react';
import { quickPublishOpportunity } from '@/app/admin/oportunidades/catalog-actions';
import { OpportunityCardActions } from './opportunity-card-actions';

export const opportunityStates: Record<string, string> = {
  discovered: 'Descubierto',
  ready: 'Listo para publicar',
  review: 'Requiere revisión',
  published: 'Publicado',
  out_of_stock: 'Sin stock',
  stale: 'Desactualizado',
  error: 'Con incidencia',
  in_stock: 'Con stock',
  unknown: 'Disponibilidad a confirmar',
  new: 'Nuevos (24 h)',
};

const date = new Intl.DateTimeFormat('es-AR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'America/Argentina/Buenos_Aires',
});
const num = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 });
export const displayCatalogDate = (value: string | null) =>
  value ? date.format(new Date(value)) : 'Pendiente';
export const displayCatalogAmount = (value: number | null, currency = 'USD') =>
  value == null ? 'Pendiente' : currency + ' ' + num.format(value);

export type OpportunityItem = {
  id: string;
  title: string;
  brand: string;
  sku: string;
  model: string;
  url: string;
  image_url: string | null;
  origin_cost: number | null;
  currency: string | null;
  last_success_at: string | null;
  last_error: string | null;
  supplier: string;
  state: string;
  availability: string;
  displayed_retail_usd: number | null;
  displayed_wholesale_usd: number | null;
  displayed_retail_ars: number | null;
  displayed_wholesale_ars: number | null;
  cost_usd: number | null;
  margin: number | null;
  active: boolean;
  slug: string | null;
  product_id?: string | null;
};

type BatchItemStatus = 'idle' | 'publishing' | 'success' | 'error';

interface BatchProgressItem {
  id: string;
  title: string;
  status: BatchItemStatus;
  slug?: string;
  error?: string;
}

export function OpportunityInteractiveGrid({ items }: { items: OpportunityItem[] }) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [publishedMap, setPublishedMap] = useState<Map<string, { slug: string; id: string }>>(new Map());

  // Batch execution modal state
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState<BatchProgressItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filter unpublished items eligible for selection
  const unpublishedItems = items.filter(
    (item) => !item.active && !item.slug && !publishedMap.has(item.id)
  );

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(unpublishedItems.map((item) => item.id)));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleStartBatchPublish = async () => {
    if (selectedIds.size === 0) return;

    const list: BatchProgressItem[] = Array.from(selectedIds).map((id) => {
      const item = items.find((i) => i.id === id);
      return {
        id,
        title: item?.title || 'Producto',
        status: 'idle',
      };
    });

    setBatchProgress(list);
    setIsBatchRunning(true);
    setIsModalOpen(true);

    const newPublished = new Map(publishedMap);

    for (let i = 0; i < list.length; i++) {
      const current = list[i];
      // Mark current as publishing
      setBatchProgress((prev) =>
        prev.map((item, idx) => (idx === i ? { ...item, status: 'publishing' } : item))
      );

      try {
        const res = await quickPublishOpportunity(current.id);
        if (res.success) {
          newPublished.set(current.id, { slug: res.data.slug, id: res.data.id });
          setPublishedMap(new Map(newPublished));

          setBatchProgress((prev) =>
            prev.map((item, idx) =>
              idx === i
                ? { ...item, status: 'success', slug: res.data.slug }
                : item
            )
          );
        } else {
          setBatchProgress((prev) =>
            prev.map((item, idx) =>
              idx === i
                ? { ...item, status: 'error', error: res.error || 'Error desconocido' }
                : item
            )
          );
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error inesperado';
        setBatchProgress((prev) =>
          prev.map((item, idx) =>
            idx === i ? { ...item, status: 'error', error: message } : item
          )
        );
      }
    }

    setIsBatchRunning(false);
    setSelectedIds(new Set());
  };

  const completedCount = batchProgress.filter(
    (p) => p.status === 'success' || p.status === 'error'
  ).length;
  const successCount = batchProgress.filter((p) => p.status === 'success').length;
  const errorCount = batchProgress.filter((p) => p.status === 'error').length;
  const percent = batchProgress.length
    ? Math.round((completedCount / batchProgress.length) * 100)
    : 0;

  return (
    <div className="space-y-4">
      {/* Batch toolbar: selection helpers */}
      {unpublishedItems.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-xs text-zinc-700 shadow-2xs">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={selectedIds.size === unpublishedItems.length ? clearSelection : selectAll}
              className="inline-flex items-center gap-1.5 font-semibold text-sky-800 hover:text-sky-950 transition-colors"
            >
              {selectedIds.size === unpublishedItems.length ? (
                <>
                  <CheckSquare className="size-4 text-sky-700" />
                  Deseleccionar todos ({unpublishedItems.length})
                </>
              ) : (
                <>
                  <Square className="size-4 text-zinc-400" />
                  Seleccionar pendientes de esta página ({unpublishedItems.length})
                </>
              )}
            </button>
            {selectedIds.size > 0 && (
              <span className="font-medium text-zinc-500">
                · {selectedIds.size} de {unpublishedItems.length} seleccionados
              </span>
            )}
          </div>

          {selectedIds.size > 0 && (
            <button
              type="button"
              onClick={handleStartBatchPublish}
              className="inline-flex items-center gap-1.5 rounded-lg bg-sky-900 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-sky-800 transition-colors"
            >
              <Zap className="size-3.5 fill-amber-300 text-amber-300" />
              Publicar lote ({selectedIds.size})
            </button>
          )}
        </div>
      )}

      {/* Grid of opportunities */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => {
          const isPublishedLocally = publishedMap.has(item.id);
          const publishedInfo = publishedMap.get(item.id);
          const isItemPublished = (item.active && !!item.slug) || isPublishedLocally;
          const isSelected = selectedIds.has(item.id);

          const costEstimated =
            item.cost_usd ??
            (item.origin_cost != null && (!item.currency || item.currency === 'USD')
              ? Math.round(item.origin_cost * 1.2 * 100) / 100
              : null);
          const retailEstimated =
            item.displayed_retail_usd ??
            (costEstimated != null ? Math.round((costEstimated / 0.7) * 100) / 100 : null);
          const wholesaleEstimated =
            item.displayed_wholesale_usd ??
            (costEstimated != null ? Math.round((costEstimated / 0.82) * 100) / 100 : null);

          return (
            <article
              key={item.id}
              className={`relative min-w-0 rounded-xl border p-4 shadow-sm flex flex-col justify-between transition-all ${
                isSelected
                  ? 'border-sky-500 bg-sky-50/30 ring-2 ring-sky-500/20'
                  : isItemPublished
                  ? 'border-emerald-200 bg-emerald-50/15'
                  : 'border-zinc-200 bg-white hover:border-zinc-300'
              }`}
            >
              <div>
                <div className="flex items-start gap-3">
                  {/* Select Checkbox (only if not published) */}
                  {!isItemPublished ? (
                    <button
                      type="button"
                      onClick={() => toggleSelect(item.id)}
                      aria-label={`Seleccionar ${item.title}`}
                      className="mt-0.5 shrink-0 text-zinc-400 hover:text-sky-700 transition-colors"
                    >
                      {isSelected ? (
                        <CheckSquare className="size-5 text-sky-700" />
                      ) : (
                        <Square className="size-5" />
                      )}
                    </button>
                  ) : (
                    <span className="mt-0.5 inline-grid size-5 place-items-center rounded bg-emerald-100 text-emerald-800">
                      <Check className="size-3.5 stroke-[3]" />
                    </span>
                  )}

                  {item.image_url && (
                    <Image
                      unoptimized
                      width={64}
                      height={64}
                      src={item.image_url}
                      alt=""
                      loading="lazy"
                      className="size-16 shrink-0 rounded-lg object-contain bg-zinc-50 border border-zinc-100"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-zinc-500 font-medium">
                      {item.supplier} · {opportunityStates[item.state]}
                    </p>
                    <h2 className="break-words font-semibold text-zinc-900 leading-snug line-clamp-2">
                      {item.title}
                    </h2>
                    <p className="break-words text-xs text-zinc-500 mt-0.5">
                      {[item.brand, item.model, item.sku].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                </div>

                <dl className="mt-3 grid grid-cols-2 gap-2 text-sm bg-zinc-50/70 p-2.5 rounded-lg border border-zinc-100">
                  <div>
                    <dt className="text-[11px] font-medium text-zinc-500">Origen</dt>
                    <dd className="font-semibold text-zinc-900">
                      {displayCatalogAmount(item.origin_cost, item.currency ?? '')}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-medium text-zinc-500">Costo total (+20% pasero)</dt>
                    <dd className="font-semibold text-zinc-900">
                      {displayCatalogAmount(item.cost_usd ?? costEstimated)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-medium text-zinc-500">Minorista MYA (30%)</dt>
                    <dd className="font-semibold text-emerald-700">
                      {item.displayed_retail_usd != null
                        ? displayCatalogAmount(item.displayed_retail_usd)
                        : retailEstimated != null
                        ? displayCatalogAmount(retailEstimated)
                        : displayCatalogAmount(item.displayed_retail_ars, 'ARS')}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-medium text-zinc-500">Mayorista MYA (18%)</dt>
                    <dd className="font-semibold text-sky-700">
                      {item.displayed_wholesale_usd != null
                        ? displayCatalogAmount(item.displayed_wholesale_usd)
                        : wholesaleEstimated != null
                        ? displayCatalogAmount(wholesaleEstimated)
                        : displayCatalogAmount(item.displayed_wholesale_ars, 'ARS')}
                    </dd>
                  </div>
                </dl>

                <p className="mt-2.5 text-xs text-zinc-500">
                  {opportunityStates[item.availability]} · Verificado {displayCatalogDate(item.last_success_at)}
                </p>
                {item.margin != null && (
                  <p className="text-xs font-medium text-emerald-700 mt-0.5">
                    Margen minorista calculado: {num.format(item.margin)}%
                  </p>
                )}
                {item.last_error && (
                  <p className="mt-1 line-clamp-2 text-xs text-red-700 bg-red-50 p-1.5 rounded">
                    {item.last_error}
                  </p>
                )}
              </div>

              <OpportunityCardActions
                item={{
                  ...item,
                  active: isItemPublished,
                  slug: publishedInfo?.slug ?? item.slug,
                  product_id: publishedInfo?.id ?? item.product_id,
                }}
              />
            </article>
          );
        })}
      </div>

      {/* Floating Bottom Action Dock when items are selected */}
      {selectedIds.size > 0 && !isModalOpen && (
        <aside
          aria-label="Acciones por lote"
          className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 flex items-center gap-3 rounded-full border border-zinc-800 bg-zinc-950/95 px-5 py-3 text-white shadow-2xl backdrop-blur-md transition-all animate-in fade-in slide-in-from-bottom-4"
        >
          <span className="text-xs font-semibold text-zinc-300">
            <strong className="text-white">{selectedIds.size}</strong> seleccionados
          </span>
          <span className="h-4 w-px bg-zinc-700" />
          <button
            type="button"
            onClick={handleStartBatchPublish}
            className="inline-flex items-center gap-1.5 rounded-full bg-sky-600 px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-sky-500 active:scale-95 transition-all"
          >
            <Zap className="size-3.5 fill-amber-300 text-amber-300" />
            Publicar seleccionados
          </button>
          <button
            type="button"
            onClick={clearSelection}
            className="rounded-full px-2.5 py-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
          >
            Cancelar
          </button>
        </aside>
      )}

      {/* Modal / Dialog for Batch Publishing Progress */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="batch-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in"
        >
          <div className="w-full max-w-xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <Zap className="size-5 text-sky-700 fill-amber-300" />
                <h3 id="batch-modal-title" className="text-lg font-bold text-zinc-950">
                  {isBatchRunning ? 'Publicando productos seleccionados…' : 'Proceso de publicación finalizado'}
                </h3>
              </div>
              {!isBatchRunning && (
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    router.refresh();
                  }}
                  className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                >
                  <X className="size-5" />
                </button>
              )}
            </div>

            {/* Progress Bar & Counter */}
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-xs font-medium text-zinc-600">
                <span>
                  {completedCount} de {batchProgress.length} procesados
                </span>
                <span className="font-bold text-zinc-900">{percent}%</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-zinc-100 border border-zinc-200">
                <div
                  className="h-full bg-sky-600 transition-all duration-300 rounded-full"
                  style={{ width: `${percent}%` }}
                />
              </div>
              <div className="flex items-center gap-4 text-xs font-medium pt-1">
                <span className="text-emerald-700">✓ {successCount} publicados</span>
                {errorCount > 0 && <span className="text-amber-800">⚠️ {errorCount} con incidencias</span>}
              </div>
            </div>

            {/* Item list with status */}
            <div className="mt-4 flex-1 overflow-y-auto divide-y divide-zinc-100 rounded-xl border border-zinc-100 p-2 text-xs space-y-1">
              {batchProgress.map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-3 py-2 px-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-zinc-900 line-clamp-1">{item.title}</p>
                    {item.error && (
                      <p className="text-[11px] text-amber-900 mt-0.5">{item.error}</p>
                    )}
                  </div>
                  <div className="shrink-0 flex items-center gap-1.5">
                    {item.status === 'idle' && (
                      <span className="text-zinc-400">En espera</span>
                    )}
                    {item.status === 'publishing' && (
                      <span className="inline-flex items-center gap-1 font-semibold text-sky-700">
                        <Loader2 className="size-3.5 animate-spin" /> Publicando…
                      </span>
                    )}
                    {item.status === 'success' && (
                      <div className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                        <Check className="size-3.5 stroke-[2.5]" />
                        <span>Publicado</span>
                        {item.slug && (
                          <Link
                            href={`/producto/${item.slug}`}
                            target="_blank"
                            className="ml-1 inline-flex items-center text-sky-700 hover:underline"
                          >
                            <ExternalLink className="size-3" />
                          </Link>
                        )}
                      </div>
                    )}
                    {item.status === 'error' && (
                      <span className="inline-flex items-center gap-1 font-semibold text-amber-800">
                        <AlertCircle className="size-3.5" /> Omitido
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-end gap-3">
              {isBatchRunning ? (
                <p className="text-xs text-zinc-500 animate-pulse">
                  Por favor no cierres esta ventana mientras se procesan los productos…
                </p>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    router.refresh();
                  }}
                  className="rounded-xl bg-sky-900 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-sky-800 transition-colors"
                >
                  Finalizar y actualizar catálogo
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
