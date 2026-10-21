export default function CatalogLoading() {
  return <div role="status" aria-label="Cargando productos" className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
    <span className="sr-only">Cargando productos…</span>
    <div aria-hidden="true" className="animate-pulse motion-reduce:animate-none"><div className="h-3 w-28 rounded bg-zinc-200"/><div className="mt-4 h-8 w-56 rounded bg-zinc-200"/><div className="my-6 h-24 rounded-2xl border border-zinc-200 bg-white"/><div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">{Array.from({length:8},(_,i)=><div key={i} className="overflow-hidden rounded-2xl border border-zinc-200 bg-white"><div className="aspect-square bg-zinc-100"/><div className="space-y-3 p-4"><div className="h-3 w-2/3 rounded bg-zinc-100"/><div className="h-4 rounded bg-zinc-100"/><div className="h-5 w-1/2 rounded bg-zinc-100"/><div className="h-11 rounded-xl bg-zinc-100"/></div></div>)}</div></div>
  </div>;
}
