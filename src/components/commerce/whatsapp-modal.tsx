"use client";

import { trackAdsEvent } from "@/lib/analytics";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { X, MessageCircle, ArrowUpRight } from "lucide-react";
import { useCommerce } from "@/components/commerce/commerce-provider";
import { useModalFocus } from "@/components/ui/use-modal-focus";
import { whatsappContacts, getWhatsAppUrl } from "@/lib/site";

export function WhatsAppContactModal() {
  const pathname = usePathname();
  const { whatsappModalOpen, whatsappModalMessage, whatsappInquiry, closeWhatsApp } = useCommerce();
  const panel = useRef<HTMLDivElement>(null);
  useModalFocus(panel, whatsappModalOpen);
  useEffect(() => {
    if (!whatsappModalOpen) return;
    const dismiss = (event: KeyboardEvent) => { if (event.key === "Escape") closeWhatsApp(); };
    document.addEventListener("keydown", dismiss);
    return () => document.removeEventListener("keydown", dismiss);
  }, [whatsappModalOpen, closeWhatsApp]);
  if (!whatsappModalOpen) return null;
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/50 p-2 backdrop-blur-xs sm:items-center sm:p-6" onClick={closeWhatsApp}>
    <div ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="whatsapp-modal-title" onClick={event => event.stopPropagation()} className="relative max-h-[90dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-3xl bg-white p-5 shadow-2xl outline-none sm:p-7">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0"><p className="text-[11px] font-semibold uppercase tracking-widest text-sky-800">Atención MYA</p><h2 id="whatsapp-modal-title" className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">Hablemos de tu compra</h2></div>
        <button type="button" onClick={closeWhatsApp} aria-label="Cerrar modal de contacto" className="grid size-11 shrink-0 place-items-center rounded-full bg-zinc-100 text-zinc-600 hover:bg-zinc-200"><X className="size-5"/></button>
      </div>
      <p className="mt-3 text-sm leading-6 text-zinc-600">Elegí con quién hablar. Tu consulta se abrirá directamente en WhatsApp.</p>
      {whatsappModalMessage && <div className="mt-4 rounded-xl bg-zinc-50 p-3 text-xs leading-5 text-zinc-600"><p className="mb-1 font-medium text-zinc-900">Tu consulta</p><p className="line-clamp-3 break-words">{whatsappModalMessage}</p></div>}
      <div className="mt-5 space-y-3">
        {whatsappContacts.map(contact => <a key={contact.id} href={getWhatsAppUrl(whatsappModalMessage, contact.whatsappNumber)} target="_blank" rel="noopener noreferrer" onClick={() => {
          trackAdsEvent("Contact", { contact_type: whatsappInquiry?.type || (pathname.startsWith("/mayorista") ? "wholesale" : "retail"), contact_source: whatsappInquiry?.source || "whatsapp_selector", contact_channel: "whatsapp", advisor: contact.id, category: whatsappInquiry?.category });
          closeWhatsApp();
        }} className="group grid grid-cols-[2.75rem_minmax(0,1fr)_1.25rem] items-center gap-3 rounded-2xl border border-zinc-200 p-3.5 transition-colors hover:border-emerald-300 hover:bg-emerald-50/40">
          <span className="grid size-11 place-items-center rounded-full bg-sky-50 text-sm font-semibold text-sky-800">{contact.avatarText}</span>
          <div className="min-w-0"><p className="font-semibold text-zinc-950">{contact.name}</p><p className="mt-0.5 text-xs leading-5 text-zinc-500">{contact.specialty}</p><p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-emerald-800"><MessageCircle className="size-3.5 shrink-0"/>{contact.phone}</p></div>
          <ArrowUpRight className="size-5 text-zinc-400 transition-colors group-hover:text-emerald-700"/>
        </a>)}
      </div>
      <p className="mt-5 border-t border-zinc-100 pt-4 text-xs leading-5 text-zinc-500">Máximo y Agustina · Tandil, Buenos Aires</p>
    </div>
  </div>;
}
