"use client";

import { useCommerce } from "@/components/commerce/commerce-provider";
import { WHOLESALE_MINIMUM_LABEL, WHOLESALE_MINIMUM_DETAILS } from "@/lib/wholesale-policy";
import styles from "./wholesale-experience.module.css";

export function WholesaleInquiry({ category = "Productos del catálogo" }: { category?: string }) {
  const { openWhatsApp } = useCommerce();
  const field = "mt-2 min-h-12 w-full rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-base font-normal text-zinc-950 focus:outline-2 focus:outline-sky-700";
  return <section id="cotizar" className={styles.inquiry}>
    <div className={styles.inquiryIntro}><span className={styles.eyebrow}>Hablemos de tu pedido</span><h2>Pedí tu cotización mayorista.</h2><p>Contanos qué productos y cantidades buscás. Elegí a Máximo o Agustina para continuar por WhatsApp y recibir los precios de tu selección.</p><p className={styles.terms}>{WHOLESALE_MINIMUM_DETAILS}</p><p>Enviamos a toda Argentina. Si todavía estás eligiendo tu surtido, también podemos ayudarte.</p></div>
    <form className="grid content-start gap-5 sm:grid-cols-2" onSubmit={event => {
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
        <button type="submit" className="min-h-12 w-full rounded-xl bg-zinc-950 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 active:translate-y-px">Preparar consulta por WhatsApp</button>
        <p className="mt-3 text-xs leading-5 text-zinc-500">La consulta se abre al elegir un contacto; vos decidís cuándo enviarla. No reserva stock ni registra una compra. El precio mayorista, la disponibilidad y la entrega se confirman en la propuesta.</p>
      </div>
    </form>
  </section>;
}
