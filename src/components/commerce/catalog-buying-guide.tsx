import Link from "next/link";
import type { RetailContent } from "@/lib/retail-content";
import { WHOLESALE_MINIMUM_LABEL } from "@/lib/wholesale-policy";

export function CatalogBuyingGuide({ content }: { content: RetailContent }) {
  return <section aria-labelledby="catalog-guide-title" className="mt-10 rounded-3xl border border-zinc-200 bg-white p-5 sm:p-8">
    <h2 id="catalog-guide-title" className="text-xl font-bold text-zinc-950 sm:text-2xl">{content.heading}</h2>
    <p className="mt-3 max-w-4xl text-sm leading-7 text-zinc-700">{content.guide}</p>
    <div className="mt-6 grid gap-5 sm:grid-cols-2">
      <div><h3 className="font-semibold text-zinc-950">¿Hacen envíos a toda Argentina?</h3><p className="mt-2 text-sm leading-7 text-zinc-700">Sí, enviamos a todas las provincias desde Tandil. Indicá tu ciudad y código postal para conocer las opciones, el costo y el plazo de entrega de tu selección.</p></div>
      <div><h3 className="font-semibold text-zinc-950">¿Puedo comprar para revender?</h3><p className="mt-2 text-sm leading-7 text-zinc-700">Sí. El mínimo mayorista es {WHOLESALE_MINIMUM_LABEL}; podés combinar marcas y rubros. Pedí los precios mayoristas a Máximo o Agustina por WhatsApp.</p><Link href={content.wholesalePath} className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-sky-800 underline underline-offset-4">Consultar venta mayorista</Link></div>
    </div>
  </section>;
}
