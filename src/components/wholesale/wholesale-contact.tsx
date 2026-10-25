"use client";

import { MessageCircle } from "lucide-react";
import { useCommerce } from "@/components/commerce/commerce-provider";
import { trackAdsEvent } from "@/lib/analytics";
import { getContactWhatsAppUrl, whatsappContacts } from "@/lib/site";
import { WHOLESALE_MINIMUM_LABEL, wholesaleProductInquiry } from "@/lib/wholesale-policy";

export function WholesaleContactLinks({ category = "Todos los rubros" }: { category?: string }) {
  const message = `Hola MYA Importaciones. Quisiera conocer los precios MAYORISTAS de ${category}. Estoy armando mi selección de productos. Entiendo que el mínimo es ${WHOLESALE_MINIMUM_LABEL}, combinando productos. ¿Me ayudan con los precios, disponibilidad y envío a mi ciudad?`;
  return <div className="flex flex-wrap gap-3">
    {whatsappContacts.map(contact => <a key={contact.id} href={getContactWhatsAppUrl(contact.id, message)} target="_blank" rel="noopener noreferrer"
      onClick={() => trackAdsEvent("Contact", { contact_type: "wholesale", contact_source: "wholesale_direct", contact_channel: "whatsapp", advisor: contact.id, category })}
      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-semibold text-zinc-900 transition-colors first:border-zinc-950 first:bg-zinc-950 first:text-white hover:border-zinc-500 hover:bg-zinc-50 first:hover:bg-zinc-800 active:translate-y-px">
      <MessageCircle className="size-4 shrink-0" /> Precios con {contact.name}
    </a>)}
  </div>;
}

export function WholesaleProductInquiry({ title, slug, category }: { title: string; slug: string; category: string }) {
  const { openWhatsApp } = useCommerce();
  return <button type="button" onClick={() => openWhatsApp(wholesaleProductInquiry({ title, slug }, 1), { type: "wholesale", source: "wholesale_product", category })}
    className="mt-4 min-h-11 w-full rounded-xl bg-sky-700 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-800">Consultar por mayor</button>;
}
