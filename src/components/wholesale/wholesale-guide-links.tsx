import Link from "next/link";
import { WHOLESALE_CATEGORIES } from "@/lib/wholesale-content";

export function WholesaleGuideLinks({ currentSlug, dark = false }: { currentSlug?: string; dark?: boolean }) {
  return <section aria-label="Información mayorista por rubro" className={`mt-10 rounded-2xl border p-5 sm:p-7 ${dark ? "border-zinc-800 bg-zinc-900 text-white" : "border-zinc-200 bg-white text-zinc-950"}`}>
    <h2 className="text-xl font-semibold">Conocé la venta mayorista por rubro</h2>
    <p className={`mt-2 text-sm leading-6 ${dark ? "text-zinc-300" : "text-zinc-600"}`}>Revisá qué presentaciones comparar y qué datos incluir para consultar por tu comercio o emprendimiento.</p>
    <nav aria-label="Guías mayoristas" className="mt-4 flex flex-wrap gap-3">
      {WHOLESALE_CATEGORIES.filter(category => category.slug !== currentSlug).map(category => <Link key={category.slug} href={`/mayorista/${category.slug}`} prefetch={false} className={`inline-flex min-h-11 max-w-full items-center rounded-lg border px-4 py-2 text-sm font-semibold underline underline-offset-4 ${dark ? "border-zinc-700 text-sky-300 hover:border-sky-400" : "border-zinc-200 text-sky-800 hover:border-sky-600"}`}>{category.name} por mayor</Link>)}
    </nav>
  </section>;
}
