"use client";

import { useCallback, useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, ClipboardCheck, RefreshCw, Search } from "lucide-react";
import type { CatalogPricingRule } from "@/lib/catalog-pricing";
import type {
  CatalogCandidate, CatalogImportFilters, CatalogImportItem, CatalogImportJob,
  CatalogImportWorkspace, CatalogPreviewResult, CatalogReview,
} from "@/lib/catalog-import-types";
import {
  controlCatalogImportAction, previewCatalogImportAction, processCatalogImportAction,
  readCatalogImportAction, readCatalogJobAction, readCatalogReviewsAction,
  reviewCatalogProductAction, saveCatalogPricingAction,
} from "@/app/admin/oportunidades/import-actions";

const input = "min-h-11 w-full min-w-0 rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200";
const button = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50";
const primary = `${button} border-sky-700 bg-sky-700 text-white hover:bg-sky-800`;
const panel = "min-w-0 rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs sm:p-6";
const activeStates = new Set(["queued", "running", "processing"]);
const stateNames: Record<string, string> = {
  preview: "Vista previa", draft: "Vista previa", queued: "En cola", running: "En proceso", processing: "En proceso",
  paused: "En pausa", cancelled: "Cancelado", completed: "Finalizado", completed_with_errors: "Finalizado con errores",
  failed: "Con error", pending: "Pendiente", imported: "Importada", created: "Creada", linked: "Vinculada",
  review: "Requiere revisión", needs_review: "Requiere revisión", skipped: "Omitida", published: "Publicado", approved: "Aprobado",
};
const actionNames: Record<string, string> = { create: "Nuevo borrador", new: "Nuevo borrador", new_draft: "Nuevo borrador", link: "Vincular", review: "Revisar", skip: "Omitir" };
const countNames: Record<string, string> = { total: "ofertas", pending: "pendientes", queued: "en cola", processing: "en proceso", imported: "importadas", created: "creadas", linked: "vinculadas", review: "para revisar", needs_review: "para revisar", skipped: "omitidas", failed: "con error", cancelled: "canceladas", completed: "completadas" };

function StateBadge({ state }: { state: string }) {
  return <span className="inline-flex rounded-full border border-zinc-200 bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-700">{stateNames[state] ?? state}</span>;
}

function date(value: string | null) {
  if (!value) return "Sin comprobación";
  const stamp = new Date(value);
  return Number.isNaN(stamp.getTime()) ? "Fecha no disponible" : stamp.toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires", dateStyle: "short", timeStyle: "short" });
}

function money(value: number | null, currency = "ARS") {
  if (value === null || !Number.isFinite(value)) return "Sin precio calculable";
  return `${currency} ${value.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function Counts({ counts }: { counts: Record<string, number> }) {
  const entries = Object.entries(counts).filter(([, value]) => Number.isFinite(value));
  return <p className="mt-2 break-words text-sm text-zinc-600">{entries.length ? entries.map(([key, value]) => `${value} ${countNames[key] ?? actionNames[key] ?? key}`).join(" · ") : "Todavía no hay resultados registrados."}</p>;
}

function CandidateCost({ candidate }: { candidate: CatalogCandidate }) {
  return <><p className="font-medium text-zinc-900">{candidate.originCost !== null && candidate.currency ? money(candidate.originCost, candidate.currency) : "Sin costo confirmado"}</p><p className="mt-1 text-xs text-zinc-500">{date(candidate.checkedAt)}</p></>;
}

function ItemTable({ items }: { items: CatalogImportItem[] }) {
  if (!items.length) return <p className="mt-4 text-sm text-zinc-600">No hay filas para mostrar.</p>;
  return <div className="mt-4 max-h-96 overflow-auto rounded-xl border border-zinc-200" tabIndex={0} role="region" aria-label="Detalle de ofertas de la importación">
    <table className="w-full min-w-[640px] text-left text-sm">
      <caption className="sr-only">Resultado por oferta y motivo registrado</caption>
      <thead className="sticky top-0 bg-zinc-50 text-xs text-zinc-600"><tr><th scope="col" className="p-3">Producto u oferta</th><th scope="col" className="p-3">Acción</th><th scope="col" className="p-3">Estado</th><th scope="col" className="p-3">Detalle</th></tr></thead>
      <tbody className="divide-y divide-zinc-100">{items.map((item) => <tr key={item.id}>
        <th scope="row" className="max-w-xs break-words p-3 font-medium">{item.payload?.product?.title ?? item.offer_id}{item.product_id && <Link className="mt-1 block text-xs text-sky-700 underline" href={`/admin?editProduct=${encodeURIComponent(item.product_id)}`}>Editar producto</Link>}</th>
        <td className="p-3">{actionNames[item.payload?.action] ?? item.payload?.action ?? "Sin decisión"}</td>
        <td className="p-3"><StateBadge state={item.state} /><p className="mt-1 text-xs text-zinc-500">{item.attempts} intentos</p></td>
        <td className="max-w-xs break-words p-3 text-zinc-600">{item.error ?? item.payload?.reason ?? "Sin observaciones"}</td>
      </tr>)}</tbody>
    </table>
  </div>;
}

export function SupplierCatalogManager({ initialData, initialReviews = [], reviewProductId }: { initialData: CatalogImportWorkspace; initialReviews?: CatalogReview[]; reviewProductId?: string }) {
  const [data, setData] = useState(initialData);
  const [filters, setFilters] = useState<CatalogImportFilters>({ page: initialData.page, pageSize: initialData.pageSize });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [allMatching, setAllMatching] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [limit, setLimit] = useState("150");
  const [preview, setPreview] = useState<CatalogPreviewResult | null>(null);
  const [detail, setDetail] = useState<{ job: CatalogImportJob; items: CatalogImportItem[] } | null>(null);
  const [reviews, setReviews] = useState(initialReviews);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const busy = useRef(false);

  const run = (operation: () => Promise<void>) => {
    if (busy.current) return;
    busy.current = true;
    setError(null); setMessage(null);
    startTransition(async () => {
      try { await operation(); }
      catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo completar la acción. Actualizá e intentá de nuevo."); }
      finally { busy.current = false; }
    });
  };

  const refresh = useCallback(async () => {
    setData(await readCatalogImportAction(filters));
    if (detail?.job.id) setDetail(await readCatalogJobAction(detail.job.id));
  }, [filters, detail]);

  const hasActiveJob = data.jobs.some((job) => activeStates.has(job.state));
  useEffect(() => {
    if (!data.installed || !hasActiveJob) return;
    let mounted = true;
    const timer = setInterval(() => {
      if (busy.current || document.visibilityState !== "visible") return;
      busy.current = true;
      startTransition(async () => {
        try {
          const next = await readCatalogImportAction(filters);
          if (mounted) setData(next);
          if (detail?.job.id) {
            const nextDetail = await readCatalogJobAction(detail.job.id);
            if (mounted) setDetail(nextDetail);
          }
        } catch (cause) {
          if (mounted) setError(cause instanceof Error ? cause.message : "No se pudo actualizar el progreso.");
        } finally { busy.current = false; }
      });
    }, 5000);
    return () => { mounted = false; clearInterval(timer); };
  }, [data.installed, hasActiveJob, filters, detail?.job.id]);

  const control = (jobId: string, action: "confirm" | "pause" | "resume" | "cancel" | "retry_failed") => run(async () => {
    await controlCatalogImportAction(jobId, action);
    if (action === "confirm") setPreview(null);
    await refresh();
    setMessage(action === "confirm" ? "Importación confirmada y en cola. Los productos nuevos se guardan como borradores." : "Estado de la importación actualizado.");
  });

  const applyFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const next: CatalogImportFilters = { page: 1, pageSize: data.pageSize, query: String(form.get("query") ?? "").trim() || undefined, supplierId: String(form.get("supplierId") ?? "") || undefined, brand: String(form.get("brand") ?? "").trim() || undefined, availability: (String(form.get("availability") ?? "") || undefined) as CatalogImportFilters["availability"] };
    if (form.get("minCost")) next.minCost = Number(form.get("minCost"));
    if (form.get("maxCost")) next.maxCost = Number(form.get("maxCost"));
    if (next.minCost !== undefined && next.maxCost !== undefined && next.minCost > next.maxCost) { setError("El costo mínimo debe ser menor o igual al máximo."); return; }
    run(async () => {
      const result = await readCatalogImportAction(next);
      setData(result); setFilters(next); setSelected(new Set()); setAllMatching(false); setPreview(null);
    });
  };

  const previewSelection = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    run(async () => {
      const result = await previewCatalogImportAction({ filters, allMatching, offerIds: allMatching ? undefined : [...selected], categoryId, limit: Number(limit) });
      setPreview(result); await refresh();
      setMessage("Vista previa guardada. Revisá cada resultado antes de confirmar la importación.");
    });
  };

  const changePage = (page: number) => run(async () => {
    const next = { ...filters, page };
    setData(await readCatalogImportAction(next)); setFilters(next);
  });
  const selectionCount = allMatching ? Math.min(data.total, Number(limit) || 0) : selected.size;
  const pageCount = Math.max(1, Math.ceil(data.total / data.pageSize));
  const previewCount = (names: string[]) => names.reduce((sum, key) => sum + (preview?.counts[key] ?? 0), 0);

  return <div className="min-w-0 space-y-6" aria-busy={pending}>
    <header className="min-w-0">
      <Link href="/admin/oportunidades" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-sky-700 hover:underline"><ArrowLeft className="h-4 w-4" aria-hidden="true" />Volver al radar mayorista</Link>
      <h1 className="mt-3 text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl">Importación de catálogos</h1>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600">Seleccioná ofertas registradas, revisá la vista previa y creá borradores. Cada publicación requiere una revisión explícita de identidad, costos y documentación.</p>
    </header>
    {error && <div role="alert" className="break-words rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
    <div role="status" aria-live="polite" aria-atomic="true" className={message ? "rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900" : "sr-only"}>{message ?? (pending ? "Actualizando información…" : "")}</div>
    {!data.installed ? <section className={`${panel} border-amber-200 bg-amber-50`}><h2 className="text-lg font-bold text-amber-950">Falta instalar la migración de catálogo</h2><p className="mt-2 text-sm leading-6 text-amber-900">La base conectada todavía no tiene las tablas y funciones de importación. Aplicá la migración correspondiente antes de usar este panel.</p><p className="mt-2 text-sm text-amber-900">La preparación local no modifica la base de producción.</p></section> : <>
      <section className={panel} aria-labelledby="catalog-offers-heading">
        <h2 id="catalog-offers-heading" className="text-lg font-bold text-zinc-900">1. Elegí las ofertas</h2>
        <form onSubmit={applyFilters} className="mt-4 grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="space-y-1 text-sm font-medium text-zinc-700">Buscar producto<input className={input} name="query" placeholder="Modelo o variante exacta" /></label>
          <label className="space-y-1 text-sm font-medium text-zinc-700">Proveedor<select className={input} name="supplierId"><option value="">Todos los proveedores</option>{data.suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></label>
          <label className="space-y-1 text-sm font-medium text-zinc-700">Marca<input className={input} name="brand" placeholder="Todas las marcas" /></label>
          <label className="space-y-1 text-sm font-medium text-zinc-700">Disponibilidad<select className={input} name="availability"><option value="">Todas</option><option value="in_stock">Disponible en proveedor</option><option value="out_of_stock">Agotado en proveedor</option><option value="unknown">Sin confirmar</option></select></label>
          <label className="space-y-1 text-sm font-medium text-zinc-700">Costo de origen mínimo<input className={input} type="number" min="0" step="0.01" name="minCost" /></label>
          <label className="space-y-1 text-sm font-medium text-zinc-700">Costo de origen máximo<input className={input} type="number" min="0" step="0.01" name="maxCost" /></label>
          <div className="flex items-end"><button className={primary} disabled={pending}><Search className="h-4 w-4" aria-hidden="true" />Aplicar filtros</button></div>
          <p className="self-end text-xs leading-5 text-zinc-500">Los costos se muestran en la moneda original de cada oferta. La disponibilidad del proveedor no representa stock propio.</p>
        </form>
        <div className="mt-5 flex flex-col gap-3 rounded-xl bg-zinc-50 p-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <label className="inline-flex min-h-11 items-center gap-2 text-sm font-medium"><input className="h-4 w-4 accent-sky-700" type="checkbox" checked={allMatching} disabled={pending || !data.total} onChange={(event) => { setAllMatching(event.target.checked); setSelected(new Set()); setPreview(null); }} />Todos los resultados filtrados ({data.total})</label>
          <span className="text-sm text-zinc-600">{selectionCount} ofertas seleccionadas{allMatching ? ` · límite ${limit || "sin definir"}` : ""}</span>
          <button type="button" className={button} disabled={pending || (!allMatching && !selected.size)} onClick={() => { setSelected(new Set()); setAllMatching(false); setPreview(null); }}>Limpiar selección</button>
        </div>
        <div className="mt-4 overflow-x-auto rounded-xl border border-zinc-200" tabIndex={0} role="region" aria-label="Ofertas disponibles para seleccionar">
          <table className="w-full min-w-[860px] text-left text-sm">
            <caption className="sr-only">Ofertas privadas con costo de origen, evidencia y precio calculado</caption>
            <thead className="bg-zinc-50 text-xs text-zinc-600"><tr>
              <th scope="col" className="p-3"><input className="h-4 w-4 accent-sky-700" type="checkbox" aria-label="Seleccionar esta página" checked={data.candidates.length > 0 && (allMatching || data.candidates.every((candidate) => selected.has(candidate.id)))} disabled={pending || allMatching || !data.candidates.length} onChange={(event) => { const checked = event.target.checked; setSelected((current) => { const next = new Set(current); data.candidates.forEach((candidate) => checked ? next.add(candidate.id) : next.delete(candidate.id)); return next; }); setPreview(null); }} /></th>
              <th scope="col" className="p-3">Producto / variante</th><th scope="col" className="p-3">Proveedor y costo</th><th scope="col" className="p-3">Disponibilidad</th><th scope="col" className="p-3">Precio y revisión</th>
            </tr></thead>
            <tbody className="divide-y divide-zinc-100">{data.candidates.map((candidate) => <tr key={candidate.id}>
              <td className="p-3"><input className="h-4 w-4 accent-sky-700" type="checkbox" aria-label={`Seleccionar ${candidate.title}`} checked={allMatching || selected.has(candidate.id)} disabled={pending || allMatching} onChange={(event) => { const checked = event.target.checked; setSelected((current) => { const next = new Set(current); if (checked) next.add(candidate.id); else next.delete(candidate.id); return next; }); setPreview(null); }} /></td>
              <th scope="row" className="max-w-xs p-3"><p className="break-words font-semibold text-zinc-900">{candidate.title}</p><p className="mt-1 text-xs font-normal text-zinc-500">{candidate.brand || "Sin marca confirmada"}{candidate.linkedProductId ? " · Ya vinculada" : " · Sin vincular"}</p></th>
              <td className="p-3"><p className="mb-1 text-xs text-zinc-500">{candidate.supplierName}</p><CandidateCost candidate={candidate} /></td>
              <td className="p-3"><span className="text-sm text-zinc-700">{candidate.availability === "in_stock" ? "Disponible en proveedor" : candidate.availability === "out_of_stock" ? "Agotado en proveedor" : "Sin confirmar"}</span><p className="mt-1 text-xs text-zinc-500">{candidate.verification === "verified" ? "Oferta verificada" : "Verificación pendiente"}</p></td>
              <td className="max-w-xs p-3"><p className="font-semibold">{money(candidate.price)}</p><p className="mt-1 text-xs text-zinc-500">{candidate.margin === null ? "Margen sin calcular" : `Margen estimado ${candidate.margin.toLocaleString("es-AR", { maximumFractionDigits: 2 })}%`}</p>{candidate.warnings.map((warning, index) => <p key={index} className="mt-1 break-words text-xs text-amber-800">{warning}</p>)}</td>
            </tr>)}</tbody>
          </table>
        </div>
        {!data.candidates.length && <p className="mt-4 text-sm text-zinc-600">No hay ofertas con estos filtros. Probá otra búsqueda o registrá una lista autorizada en proveedores.</p>}
        <nav className="mt-4 flex flex-wrap items-center justify-between gap-3" aria-label="Páginas de ofertas"><p className="text-sm text-zinc-600">Página {data.page} de {pageCount} · {data.total} ofertas</p><div className="flex gap-2"><button className={button} type="button" disabled={pending || data.page <= 1} onClick={() => changePage(data.page - 1)}>Anterior</button><button className={button} type="button" disabled={pending || data.page >= pageCount} onClick={() => changePage(data.page + 1)}>Siguiente</button></div></nav>
        <form onSubmit={previewSelection} className="mt-5 grid gap-3 border-t border-zinc-200 pt-5 sm:grid-cols-2 lg:grid-cols-3">
          <label className="space-y-1 text-sm font-medium text-zinc-700">Categoría de destino<select className={input} required value={categoryId} disabled={pending} onChange={(event) => { setCategoryId(event.target.value); setPreview(null); }}><option value="">Elegí una categoría</option>{data.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
          <label className="space-y-1 text-sm font-medium text-zinc-700">Límite de ofertas<input className={input} type="number" min="1" max="5000" step="1" required value={limit} disabled={pending} onChange={(event) => { setLimit(event.target.value); setPreview(null); }} /><span className="block text-xs font-normal text-zinc-500">Entre 1 y 5.000 por importación.</span></label>
          <div className="flex items-start pt-6"><button className={primary} disabled={pending || !selectionCount || !categoryId || Number(limit) < 1 || Number(limit) > 5000}><ClipboardCheck className="h-4 w-4" aria-hidden="true" />Generar vista previa</button></div>
        </form>
      </section>
      {preview && <section className={`${panel} border-sky-200`} aria-labelledby="catalog-preview-heading">
        <h2 id="catalog-preview-heading" className="text-lg font-bold text-zinc-900">2. Revisá antes de importar</h2>
        <p className="mt-2 text-sm text-zinc-600">{preview.total} ofertas evaluadas. Los productos nuevos se guardarán como borradores.</p>
        <dl className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">{[["Nuevos borradores", previewCount(["create", "new", "new_draft"])], ["Vinculaciones", previewCount(["link", "linked"])], ["Requieren revisión", previewCount(["review", "needs_review"])], ["Omitidas", previewCount(["skip", "skipped"])]].map(([label, value]) => <div key={label} className="rounded-xl bg-sky-50 p-3"><dt className="text-xs text-sky-900">{label}</dt><dd className="mt-1 text-2xl font-bold text-sky-950">{value}</dd></div>)}</dl>
        <ItemTable items={preview.items} />
        <button type="button" className={`${primary} mt-5`} disabled={pending || !preview.total} onClick={() => control(preview.jobId, "confirm")}>Confirmar importación de borradores</button>
      </section>}
      <section className={panel} aria-labelledby="catalog-jobs-heading">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 id="catalog-jobs-heading" className="text-lg font-bold text-zinc-900">Importaciones guardadas</h2><p className="mt-1 text-sm text-zinc-600">Podés salir y retomar después. El avance se lee de los resultados guardados.</p></div><button type="button" className={button} disabled={pending} onClick={() => run(async () => { await refresh(); setReviews(await readCatalogReviewsAction(reviewProductId)); setMessage("Información actualizada."); })}><RefreshCw className="h-4 w-4" aria-hidden="true" />Actualizar</button></div>
        {hasActiveJob && <p className="mt-3 text-xs text-zinc-500">El estado se actualiza cada 5 segundos mientras esta pestaña está visible. Cada ejecución manual procesa hasta 20 ofertas.</p>}
        {!data.jobs.length && <p className="mt-5 text-sm text-zinc-600">Todavía no hay importaciones guardadas.</p>}
        <div className="mt-4 space-y-3">{data.jobs.map((job) => <article key={job.id} className="min-w-0 rounded-xl border border-zinc-200 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold">{date(job.created_at)}</p><StateBadge state={job.state} /></div><p className="mt-2 break-all text-xs text-zinc-500">Referencia: {job.id}</p><Counts counts={job.counts} />
          <div className="mt-3 flex flex-wrap gap-2"><button type="button" className={button} disabled={pending} onClick={() => run(async () => setDetail(await readCatalogJobAction(job.id)))}>Ver detalle</button>
            {["preview", "draft"].includes(job.state) && <button type="button" className={button} disabled={pending} onClick={() => run(async () => setDetail(await readCatalogJobAction(job.id)))}>Revisar vista previa</button>}
            {activeStates.has(job.state) && <><button type="button" className={primary} disabled={pending} onClick={() => run(async () => { await processCatalogImportAction(job.id); await refresh(); setMessage("Lote procesado. Revisá los resultados registrados."); })}>Procesar hasta 20</button><button type="button" className={button} disabled={pending} onClick={() => control(job.id, "pause")}>Pausar</button></>}
            {job.state === "paused" && <button type="button" className={button} disabled={pending} onClick={() => control(job.id, "resume")}>Reanudar</button>}
            {!["cancelled", "completed"].includes(job.state) && <button type="button" className={button} disabled={pending} onClick={() => control(job.id, "cancel")}>Cancelar pendientes</button>}
            {(job.counts.failed ?? 0) > 0 && job.state !== "cancelled" && <button type="button" className={button} disabled={pending} onClick={() => control(job.id, "retry_failed")}>Reintentar solo fallidas</button>}
          </div>
        </article>)}</div>
        {detail && <div className="mt-5 min-w-0 rounded-xl border border-sky-200 bg-sky-50/40 p-3 sm:p-4"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-bold text-zinc-900">Detalle de importación</h3><button type="button" className={button} onClick={() => setDetail(null)}>Cerrar detalle</button></div><p className="mt-2 break-all text-xs text-zinc-500">{detail.job.id}</p><Counts counts={detail.job.counts} /><ItemTable items={detail.items} />{["preview", "draft"].includes(detail.job.state) && <button type="button" className={`${primary} mt-4`} disabled={pending || !detail.items.length} onClick={() => control(detail.job.id, "confirm")}>Confirmar importación de borradores</button>}</div>}
      </section>
      <PricingForm rule={data.pricing} categories={data.categories} pending={pending} onSave={(rule) => run(async () => { await saveCatalogPricingAction(rule); await refresh(); setMessage("Nueva versión de reglas comerciales guardada. Generá una nueva vista previa para aplicarla."); setPreview(null); })} onError={setError} />
      <section id="revisar-publicacion" className={`${panel} scroll-mt-24`} aria-labelledby="catalog-reviews-heading">
        <h2 id="catalog-reviews-heading" className="text-lg font-bold text-zinc-900">Revisión y publicación</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600">Completá fotos autorizadas, descripción real y costos en el editor. Registrá la evidencia que respalda cada confirmación. La importación nunca publica por su cuenta.</p>
        {!reviews.length ? <p className="mt-4 text-sm text-zinc-600">No hay productos con revisión registrada.</p> : <div className="mt-4 space-y-4">{reviews.map((review) => <ReviewCard key={`${review.product_id}:${review.state}:${review.evidence}`} review={review} pending={pending} onSave={(values, action) => run(async () => { await reviewCatalogProductAction(review.product_id, values, action); setReviews(await readCatalogReviewsAction(reviewProductId)); setMessage(action === "publish" ? "Producto publicado después de la revisión." : action === "pause" ? "Producto pausado." : "Revisión guardada."); })} />)}</div>}
      </section>
    </>}
  </div>;
}

const numericFields: { name: keyof Pick<CatalogPricingRule, "targetMarginPercent" | "minimumMarginPercent" | "wholesaleMarginPercent" | "paymentFeePercent" | "fixedUnitArs" | "roundArs">; label: string; percentage?: boolean }[] = [
  { name: "targetMarginPercent", label: "Margen minorista objetivo (%)", percentage: true },
  { name: "minimumMarginPercent", label: "Margen mínimo (%)", percentage: true },
  { name: "wholesaleMarginPercent", label: "Margen mayorista (%)", percentage: true },
  { name: "paymentFeePercent", label: "Comisiones de cobro (%)", percentage: true },
  { name: "fixedUnitArs", label: "Gastos fijos por unidad (ARS)" },
  { name: "roundArs", label: "Redondeo de precio (ARS)" },
];

function PricingForm({ rule, categories, pending, onSave, onError }: { rule: CatalogPricingRule | null; categories: CatalogImportWorkspace["categories"]; pending: boolean; onSave: (rule: CatalogPricingRule) => void; onError: (error: string) => void }) {
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const margins: unknown = JSON.parse(String(form.get("categoryMargins") || "{}"));
      if (!margins || typeof margins !== "object" || Array.isArray(margins)) throw new Error("Usá un objeto JSON para los márgenes por categoría.");
      const categoryIds = new Set(categories.map((category) => category.id));
      for (const [id, values] of Object.entries(margins)) {
        if (!categoryIds.has(id)) throw new Error(`La categoría ${id} no existe en este catálogo.`);
        const entry = values as Record<string, unknown> | null;
        if (!entry || !["target", "minimum", "wholesale"].every((key) => typeof entry[key] === "number" && Number.isFinite(entry[key]))) throw new Error("Cada categoría necesita target, minimum y wholesale numéricos.");
      }
      const numbers = Object.fromEntries(numericFields.map(({ name }) => [name, Number(form.get(name))])) as Pick<CatalogPricingRule, (typeof numericFields)[number]["name"]>;
      if (numericFields.some(({ name }) => !String(form.get(name) ?? "").trim() || !Number.isFinite(numbers[name]))) throw new Error("Completá todos los parámetros comerciales con valores confirmados.");
      onSave({ ...numbers, categoryMargins: margins as CatalogPricingRule["categoryMargins"], expensesConfirmed: form.get("expensesConfirmed") === "on", notes: String(form.get("notes") ?? "").trim() });
    } catch (cause) { onError(cause instanceof SyntaxError ? "El JSON de categorías no es válido. Revisá las comillas y los valores." : cause instanceof Error ? cause.message : "Revisá las reglas comerciales."); }
  };
  return <section className={panel} aria-labelledby="catalog-pricing-heading"><h2 id="catalog-pricing-heading" className="text-lg font-bold text-zinc-900">Reglas comerciales</h2><p className="mt-2 text-sm leading-6 text-zinc-600">Cada guardado crea una versión. El margen se calcula sobre el precio de venta; el recargo sobre el costo es otro indicador. La contribución estimada no equivale a ganancia neta.</p>{!rule && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Todavía no hay parámetros configurados. Completá valores confirmados antes de calcular precios.</p>}
    <form key={JSON.stringify(rule)} onSubmit={submit} className="mt-4 grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {numericFields.map(({ name, label, percentage }) => <label key={name} className="space-y-1 text-sm font-medium text-zinc-700">{label}<input className={input} name={name} type="number" min={name === "roundArs" ? "0.01" : "0"} max={percentage ? "99.99" : undefined} step="0.01" required defaultValue={rule?.[name] ?? ""} disabled={pending} /></label>)}
      <label className="space-y-1 text-sm font-medium text-zinc-700 sm:col-span-2 lg:col-span-3">Notas y fundamento<textarea className={`${input} min-h-24`} name="notes" defaultValue={rule?.notes ?? ""} disabled={pending} /></label>
      <details className="min-w-0 rounded-xl border border-zinc-200 p-3 sm:col-span-2 lg:col-span-3"><summary className="min-h-8 cursor-pointer text-sm font-semibold text-zinc-700">Márgenes por categoría (opcional)</summary><p className="mt-2 text-xs leading-5 text-zinc-500">Objeto JSON por ID de categoría. Cada entrada requiere target, minimum y wholesale, expresados en porcentaje. Un objeto vacío usa la regla general.</p><label className="mt-3 block space-y-1 text-sm font-medium text-zinc-700">Excepciones por categoría (JSON)<textarea className={`${input} min-h-28 font-mono`} name="categoryMargins" defaultValue={JSON.stringify(rule?.categoryMargins ?? {}, null, 2)} disabled={pending} spellCheck={false} /></label><ul className="mt-3 space-y-1 text-xs text-zinc-500">{categories.map((category) => <li key={category.id} className="break-all">{category.name}: {category.id}</li>)}</ul></details>
      <label className="flex min-h-11 items-start gap-2 text-sm text-zinc-700 sm:col-span-2 lg:col-span-3"><input className="mt-1 h-4 w-4 shrink-0 accent-sky-700" type="checkbox" name="expensesConfirmed" defaultChecked={rule?.expensesConfirmed ?? false} disabled={pending} />Confirmé los gastos y las comisiones utilizados por estas reglas.</label>
      <div className="sm:col-span-2 lg:col-span-3"><button className={primary} disabled={pending}>Guardar reglas comerciales</button></div>
    </form>
  </section>;
}

type ReviewValues = Omit<CatalogReview, "product_id" | "state" | "title" | "slug">;
function ReviewCard({ review, pending, onSave }: { review: CatalogReview; pending: boolean; onSave: (values: ReviewValues, action: "save" | "publish" | "pause") => void }) {
  const [values, setValues] = useState<ReviewValues>({ identity_confirmed: review.identity_confirmed, costs_confirmed: review.costs_confirmed, media_authorized: review.media_authorized, compliance_confirmed: review.compliance_confirmed, evidence: review.evidence });
  const checks: { name: Exclude<keyof ReviewValues, "evidence">; label: string }[] = [
    { name: "identity_confirmed", label: "Identidad y variante exacta" }, { name: "costs_confirmed", label: "Costos completos y vigentes" },
    { name: "media_authorized", label: "Derechos de fotos y material" }, { name: "compliance_confirmed", label: "Cumplimiento documental" },
  ];
  const publishReady = checks.every(({ name }) => values[name]) && values.evidence.trim().length >= 20;
  return <article className="min-w-0 rounded-xl border border-zinc-200 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="break-words font-semibold text-zinc-900">{review.title ?? "Producto pendiente de revisión"}</h3><StateBadge state={review.state} /></div><p className="mt-2 break-all text-xs text-zinc-500">Referencia: {review.product_id}</p><div className="mt-2 flex flex-wrap gap-x-4 gap-y-2"><Link className="inline-flex min-h-11 items-center text-sm font-semibold text-sky-700 underline" href={`/admin?editProduct=${encodeURIComponent(review.product_id)}`}>Editar ficha, fotos y descripción</Link><Link className="inline-flex min-h-11 items-center text-sm font-semibold text-sky-700 underline" href="/admin/costos">Revisar costos</Link><Link className="inline-flex min-h-11 items-center text-sm font-semibold text-sky-700 underline" href="/admin/proveedores/inteligencia">Verificar vínculo y seguimiento</Link></div>
    <div className="mt-3 grid gap-2 sm:grid-cols-2">{checks.map(({ name, label }) => <label key={name} className="flex min-h-11 items-center gap-2 text-sm text-zinc-700"><input className="h-4 w-4 shrink-0 accent-sky-700" type="checkbox" checked={values[name]} disabled={pending} onChange={(event) => setValues((current) => ({ ...current, [name]: event.target.checked }))} />{label}</label>)}</div>
    <label className="mt-3 block space-y-1 text-sm font-medium text-zinc-700">Evidencia y referencias<textarea className={`${input} min-h-24`} value={values.evidence} disabled={pending} onChange={(event) => setValues((current) => ({ ...current, evidence: event.target.value }))} placeholder="Fuente, fecha, comprobantes y autorización del material" /></label>
    <p className="mt-2 text-xs leading-5 text-zinc-500">Para publicar necesitás las cuatro confirmaciones, evidencia y una ficha completa. El servidor vuelve a validar los costos y el contenido.</p><div className="mt-4 flex flex-wrap gap-2"><button type="button" className={button} disabled={pending} onClick={() => onSave(values, "save")}>Guardar revisión</button><button type="button" className={primary} disabled={pending || !publishReady} onClick={() => onSave(values, "publish")}>Publicar producto revisado</button><button type="button" className={button} disabled={pending} onClick={() => onSave(values, "pause")}>Pausar producto</button></div>
  </article>;
}
