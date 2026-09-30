"use client";

export default function AdminError({ reset }: { reset: () => void }) {
  return <section className="mx-auto my-10 max-w-xl rounded-2xl border border-amber-200 bg-white p-6"><h2 className="text-xl font-bold">No pudimos cargar esta sección</h2><p className="mt-2 text-sm text-zinc-600">Revisá tu conexión y acceso de administrador. Los datos no se muestran como vacíos si hubo un error de lectura.</p><button onClick={reset} className="mt-5 min-h-11 rounded-xl bg-sky-700 px-5 text-sm font-bold text-white">Reintentar</button></section>;
}
