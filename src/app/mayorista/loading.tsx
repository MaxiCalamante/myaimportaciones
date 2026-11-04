export default function LoadingWholesale() {
  return (
    <section className="mya-container py-8 sm:py-12" aria-busy="true">
      <p role="status" className="mb-4 text-sm font-semibold text-sky-900">Cargando catálogo mayorista…</p>
      <div aria-hidden="true" className="h-36 rounded-2xl bg-sky-50 motion-safe:animate-pulse sm:h-52" />
      <div aria-hidden="true" className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((index) => <div key={index} className="aspect-square rounded-2xl bg-zinc-100 motion-safe:animate-pulse" />)}
      </div>
    </section>
  );
}
