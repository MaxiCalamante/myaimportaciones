import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { WHOLESALE_MINIMUM_LABEL } from "@/lib/wholesale-policy";

export function WholesalePromo() {
  return <section aria-labelledby="wholesale-promo-title" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    <div className="grid gap-5 rounded-3xl border border-sky-200 bg-sky-50 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
      <div><p className="text-xs font-bold uppercase tracking-widest text-sky-800">Comercios y revendedores · Envíos a toda Argentina</p><h2 id="wholesale-promo-title" className="mt-2 text-2xl font-bold text-zinc-950">Todo el catálogo, también por mayor</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-700">Cosmética coreana, perfumería, cuidado capilar, herramientas y electrónica. Combiná productos y pedí los precios mayoristas a Máximo o Agustina por WhatsApp.</p><div className="mt-3 flex flex-wrap gap-x-5"><Link href="/catalogo?category=cosmetica-coreana" className="inline-flex min-h-11 items-center text-sm font-semibold text-sky-800 underline underline-offset-4">Skincare en la tienda</Link><Link href="/catalogo?brand=Medicube" className="inline-flex min-h-11 items-center text-sm font-semibold text-sky-800 underline underline-offset-4">Medicube en la tienda</Link></div></div>
      <div><p className="mb-3 max-w-sm text-sm font-semibold leading-6 text-sky-950">Desde {WHOLESALE_MINIMUM_LABEL}. Podés combinar productos.</p><Link href="/mayorista" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-sky-700 px-5 py-3 text-sm font-bold text-white hover:bg-sky-800">Conocer la venta mayorista <ArrowRight className="size-4" /></Link></div>
    </div>
  </section>;
}

export { WholesaleLanding } from "./wholesale-experience";
