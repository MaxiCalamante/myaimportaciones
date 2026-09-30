import Link from "next/link";
import { PackageSearch } from "lucide-react";
import { getWhatsAppUrl } from "@/lib/site";

export function EmptyCatalog({ error }: { error?: string }) {
  return <section className="mx-auto my-8 max-w-3xl rounded-3xl border border-sky-100 bg-white px-5 py-10 text-center shadow-sm sm:px-10" role={error ? "alert" : undefined}>
    <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-sky-50 text-sky-700"><PackageSearch className="size-8" /></span>
    <h2 className="mt-5 text-2xl font-bold text-zinc-950">{error ? "El catálogo no está disponible en este momento" : "Estamos preparando nuestro catálogo"}</h2>
    <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-zinc-600">{error || "Pronto vas a encontrar nuestros productos acá. Mientras tanto, contanos qué estás buscando y te confirmamos disponibilidad, precio y entrega."}</p>
    <div className="mt-6 flex flex-wrap justify-center gap-3"><a href={getWhatsAppUrl("Hola MyA, estoy buscando un producto. ¿Me ayudan a consultar disponibilidad, precio y entrega?")} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center rounded-xl bg-sky-700 px-5 text-sm font-bold text-white">Consultar por WhatsApp</a><Link href="/condiciones" className="inline-flex min-h-12 items-center rounded-xl border border-zinc-200 px-5 text-sm font-semibold text-zinc-700">Ver condiciones de compra</Link></div>
  </section>;
}
