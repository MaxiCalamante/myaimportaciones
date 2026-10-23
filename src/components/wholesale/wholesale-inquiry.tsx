"use client";

import { useCommerce } from "@/components/commerce/commerce-provider";
import { WHOLESALE_MINIMUM_LABEL, WHOLESALE_MINIMUM_DETAILS } from "@/lib/wholesale-policy";

export function WholesaleInquiry({ category = "Productos del catálogo" }: { category?: string }) {
  const { openWhatsApp } = useCommerce();
  const field = "mt-2 min-h-12 w-full rounded-xl border border-zinc-300 bg-white p-3 text-base font-normal text-zinc-950 focus:outline-2 focus:outline-sky-700";
  return <section id="cotizar" className="scroll-mt-24 rounded-3xl border border-sky-200 bg-white p-5 sm:p-8">
    <h2 className="text-2xl font-bold text-zinc-950">Pedí tu cotización mayorista</h2>
    <p className="mt-3 rounded-xl bg-sky-50 p-4 text-sm font-semibold leading-6 text-sky-950">{WHOLESALE_MINIMUM_DETAILS}</p>
    <p className="mt-3 text-sm leading-6 text-zinc-600">Contanos qué buscás y elegí a Máximo o Agustina para abrir la consulta en WhatsApp. Revisamos disponibilidad, precio por cantidad, pago y entrega antes de confirmar.</p>
    <form className="mt-6 grid gap-5 sm:grid-cols-2" onSubmit={event => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const message = `Hola MYA Importaciones. Quisiera una cotización MAYORISTA.\nRubro: ${category}.\nProductos/modelos: ${String(form.get("products")).trim()}.\nCantidades: ${String(form.get("quantities")).trim()}.\nDestino: ${String(form.get("destination")).trim()}.\nMínimo mayorista: ${WHOLESALE_MINIMUM_LABEL}, combinables entre productos.\nPor favor, confirmen disponibilidad, precio mayorista, pago y entrega.`;
      openWhatsApp(message, { type: "wholesale", source: "wholesale_quote", category });
    }}>
      <label className="block text-sm font-semibold text-zinc-800 sm:col-span-2">Productos, marcas o modelos
        <textarea className={field} name="products" required minLength={3} maxLength={800} rows={3} placeholder="Ej.: enlaces de las fichas o modelos y presentaciones exactas" />
      </label>
      <label className="block text-sm font-semibold text-zinc-800">Cantidades aproximadas
        <input className={field} name="quantities" required maxLength={120} placeholder="Ej.: 2 de un producto y 3 de otro" />
      </label>
      <label className="block text-sm font-semibold text-zinc-800">Ciudad y código postal
        <input className={field} name="destination" required minLength={2} maxLength={120} placeholder="Ej.: Tandil, CP 7000" />
      </label>
      <div className="sm:col-span-2">
        <button type="submit" className="min-h-12 w-full rounded-xl bg-sky-700 px-5 py-3 text-sm font-bold text-white hover:bg-sky-800 sm:w-auto">Preparar consulta por WhatsApp</button>
        <p className="mt-3 text-xs leading-5 text-zinc-500">La consulta se abre al elegir un contacto; vos decidís cuándo enviarla. No reserva stock ni registra una compra. El precio mayorista, la disponibilidad y la entrega se confirman en la propuesta.</p>
      </div>
    </form>
  </section>;
}
