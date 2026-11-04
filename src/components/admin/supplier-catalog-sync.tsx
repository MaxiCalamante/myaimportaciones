"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import {
  readSupplierCatalogSyncAction,
  startSupplierCatalogSyncAction,
  type CatalogSyncProduct,
  type CatalogSyncSnapshot,
} from "@/app/admin/proveedores/catalog-sync-actions";

const statusLabel: Record<CatalogSyncProduct["status"], string> = {
  running: "En lote activo",
  pending: "En cola",
  own: "Inventario propio",
  review: "Revisión manual",
  issue: "Con incidencia",
  checked: "Consultado",
};

const timeFormat = new Intl.DateTimeFormat("es-AR", {
  timeZone: "America/Argentina/Buenos_Aires",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

function ProductResult({ product }: { product: CatalogSyncProduct }) {
  return (
    <li className="min-w-0 border-t border-zinc-100 py-2.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
        <span className="min-w-0 break-words text-sm font-medium text-zinc-900">
          <span className="text-xs tabular-nums text-zinc-500">#{product.position} </span>{product.title}
        </span>
        <span className="text-xs font-semibold text-sky-800">{statusLabel[product.status]}</span>
      </div>
      <div className="mt-1 flex flex-wrap gap-x-2 text-xs text-zinc-600">
        {product.finished_at && <time dateTime={product.finished_at}>{timeFormat.format(new Date(product.finished_at))}</time>}
        {product.sources > 0 && <span>{product.verified}/{product.sources} fichas verificadas · {product.available} con disponibilidad</span>}
        {product.status === "review" && !product.message && <span>Falta una ficha compatible o el reintento sigue programado.</span>}
      </div>
      {product.missing_variants && <p className="mt-1 text-xs text-amber-800">Hay variantes sin consulta automática disponible.</p>}
      {product.message && <p className="mt-1 break-words text-xs text-amber-800">{product.message}</p>}
    </li>
  );
}

export function SupplierCatalogSync() {
  const [snapshot, setSnapshot] = useState<CatalogSyncSnapshot | null>(null);
  const [starting, setStarting] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const next = await readSupplierCatalogSyncAction(page);
        if (stopped) return;
        setSnapshot(next);
        setError(null);
        if (next && !next.finishedAt) timer = setTimeout(poll, 4500);
      } catch {
        if (stopped) return;
        setError("No se pudo actualizar el avance. Se reintentará automáticamente.");
        timer = setTimeout(poll, 10000);
      } finally {
        if (!stopped) setInitialLoading(false);
      }
    }
    void poll();
    return () => { stopped = true; clearTimeout(timer); };
  }, [page, refresh]);

  async function start() {
    setStarting(true);
    setError(null);
    try {
      setSnapshot(await startSupplierCatalogSyncAction());
      setPage(1);
      setRefresh(value => value + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo iniciar la revisión.");
    } finally {
      setStarting(false);
    }
  }

  const running = Boolean(snapshot && !snapshot.finishedAt);
  const pages = Math.max(1, Math.ceil((snapshot?.total ?? 0) / 25));
  const percent = snapshot?.total ? Math.floor(snapshot.processed * 100 / snapshot.total) : 100;

  return (
    <section className="min-w-0 self-start rounded-xl border border-sky-200/80 bg-white p-3.5 shadow-2xs" aria-label="Sincronización del catálogo con proveedores">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <span className="block text-[10px] font-bold uppercase tracking-wider text-sky-700">Seguimiento en la nube</span>
          <h4 className="mt-0.5 text-sm font-extrabold text-zinc-900">Sincronizar stock con proveedores</h4>
          <p className="mt-1 text-xs leading-5 text-zinc-600">
            Recorre el catálogo por lotes. Las fichas sin consulta disponible quedan identificadas. Podés cerrar el panel y volver a ver el avance.
          </p>
        </div>
        <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-sky-50 text-sky-700">
          <RefreshCw aria-hidden="true" className={`size-4 ${running && snapshot?.enabled ? "motion-safe:animate-spin" : ""}`} />
        </div>
      </div>
      <button type="button" onClick={start} disabled={initialLoading || starting || running}
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-sky-700 px-3 text-xs font-bold text-white hover:bg-sky-800 disabled:opacity-60">
        {starting ? "Preparando revisión…" : running ? "Revisión en curso" : "Sincronizar todo el catálogo"}
      </button>
      {error && <p className="mt-3 text-xs text-red-800" role="alert">{error}</p>}
      {snapshot && (
        <div className="mt-4 space-y-3">
          <div role="status" className="flex flex-wrap justify-between gap-2 text-xs font-semibold text-zinc-800">
            <span>{snapshot.processed} de {snapshot.total} productos procesados</span>
            <span className="tabular-nums">{percent}%</span>
          </div>
          <progress className="block h-2 w-full accent-sky-700" value={snapshot.total ? snapshot.processed : 1} max={snapshot.total || 1} aria-label="Avance de la revisión del catálogo" />
          <p className="text-xs text-zinc-700">
            {snapshot.checked} consultados · {snapshot.issues} con incidencia · {snapshot.review} para revisión · {snapshot.own} de inventario propio
          </p>
          <p className="text-xs text-zinc-600">
            {snapshot.queries} fichas de proveedor con disponibilidad confirmada.
            {" "}{snapshot.finishedAt ? "Revisión finalizada." : snapshot.enabled ? "Los resultados llegan por lotes." : "El seguimiento está desactivado."}
          </p>
          {snapshot.recent.length > 0 && (
            <div>
              <h5 className="mb-1 text-xs font-bold text-zinc-800">Últimos productos procesados</h5>
              <ul>{snapshot.recent.map(product => <ProductResult key={product.position} product={product} />)}</ul>
            </div>
          )}
          <details className="rounded-lg border border-zinc-200 px-2.5">
            <summary className="cursor-pointer py-3 text-xs font-semibold text-sky-800">Ver producto por producto</summary>
            <ul>{snapshot.rows.map(product => <ProductResult key={product.position} product={product} />)}</ul>
            {pages > 1 && (
              <nav aria-label="Páginas de la revisión" className="flex flex-wrap items-center justify-between gap-2 py-2 text-xs">
                <button type="button" disabled={page === 1} onClick={() => setPage(value => value - 1)} className="min-h-11 text-sky-800 disabled:opacity-40">Anterior</button>
                <span>{page} de {pages}</span>
                <button type="button" disabled={page >= pages} onClick={() => setPage(value => value + 1)} className="min-h-11 text-sky-800 disabled:opacity-40">Siguiente</button>
              </nav>
            )}
          </details>
        </div>
      )}
    </section>
  );
}
