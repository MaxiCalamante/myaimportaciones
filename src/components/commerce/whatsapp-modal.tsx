"use client";

import { useEffect, useRef } from "react";
import { X, MessageCircle, ArrowUpRight, Sparkles, Wrench } from "lucide-react";
import { useCommerce } from "@/components/commerce/commerce-provider";
import { whatsappContacts, getWhatsAppUrl } from "@/lib/site";

export function WhatsAppContactModal() {
  const { whatsappModalOpen, whatsappModalMessage, closeWhatsApp } = useCommerce();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!whatsappModalOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeWhatsApp();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    panelRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [whatsappModalOpen, closeWhatsApp]);

  if (!whatsappModalOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/70 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      aria-labelledby="whatsapp-modal-title"
      aria-modal="true"
      role="dialog"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 cursor-pointer"
        onClick={closeWhatsApp}
        aria-hidden="true"
      />

      {/* Modal Dialog Content */}
      <div
        ref={panelRef}
        tabIndex={-1}
        className="relative w-full max-w-lg rounded-3xl border border-zinc-200 bg-white p-6 sm:p-7 shadow-2xl z-10 animate-in zoom-in-95 duration-200 focus:outline-none"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={closeWhatsApp}
          className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-950 transition cursor-pointer"
          aria-label="Cerrar modal de contacto"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="flex items-start gap-3.5 pr-8">
          <div className="relative grid size-12 shrink-0 place-items-center rounded-2xl bg-[#128C7E] text-white shadow-md shadow-emerald-900/10">
            <MessageCircle className="h-6 w-6" />
            <span className="absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full border-2 border-white bg-emerald-400" />
          </div>
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700">
              Atención Directa · MYA Importaciones
            </span>
            <h2
              id="whatsapp-modal-title"
              className="mt-0.5 text-xl sm:text-2xl font-black tracking-tight text-zinc-950"
            >
              ¿Con quién querés hablar?
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-zinc-600 leading-snug">
              En MYA te atendemos nosotros mismos. Elegí con quién comunicarte para brindarte la mejor respuesta:
            </p>
          </div>
        </div>

        {/* Message preview snippet if specific */}
        {whatsappModalMessage && (
          <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/70 p-3 text-xs text-emerald-950">
            <span className="font-bold block text-[11px] uppercase tracking-wide text-emerald-800 mb-0.5">
              Tu consulta:
            </span>
            <p className="italic line-clamp-2 text-zinc-700 font-medium">
              &quot;{whatsappModalMessage}&quot;
            </p>
          </div>
        )}

        {/* Contact Options Cards */}
        <div className="mt-5 space-y-3">
          {whatsappContacts.map((contact) => {
            const isAgustina = contact.id === "agustina";
            const targetUrl = getWhatsAppUrl(whatsappModalMessage, contact.whatsappNumber);

            return (
              <a
                key={contact.id}
                href={targetUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={closeWhatsApp}
                className={`group relative flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 rounded-2xl border p-4 transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md ${
                  isAgustina
                    ? "border-pink-200/80 bg-gradient-to-r from-pink-50/40 via-white to-pink-50/20 hover:border-pink-300 hover:bg-pink-50/70"
                    : "border-sky-200/80 bg-gradient-to-r from-sky-50/40 via-white to-sky-50/20 hover:border-sky-300 hover:bg-sky-50/70"
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className={`grid size-11 shrink-0 place-items-center rounded-xl font-black text-base shadow-xs text-white ${
                      isAgustina ? "bg-pink-600" : "bg-sky-700"
                    }`}
                  >
                    {contact.avatarText}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-extrabold text-base text-zinc-950">
                        {contact.name}
                      </span>
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                          isAgustina
                            ? "bg-pink-100 text-pink-800 border border-pink-200"
                            : "bg-sky-100 text-sky-800 border border-sky-200"
                        }`}
                      >
                        {isAgustina ? (
                          <span className="inline-flex items-center gap-1">
                            <Sparkles className="size-3" />
                            {contact.badge}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1">
                            <Wrench className="size-3" />
                            {contact.badge}
                          </span>
                        )}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-zinc-600 leading-snug">
                      {contact.specialty}
                    </p>
                    <p className="mt-1 text-[11px] font-semibold text-zinc-500 font-mono">
                      {contact.phone}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 self-end sm:self-center">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold shadow-xs transition-colors ${
                      isAgustina
                        ? "bg-[#128C7E] text-white group-hover:bg-[#0e7569]"
                        : "bg-[#128C7E] text-white group-hover:bg-[#0e7569]"
                    }`}
                  >
                    <span>Hablar con {contact.name}</span>
                    <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </span>
                </div>
              </a>
            );
          })}
        </div>

        {/* Footer Note */}
        <div className="mt-5 border-t border-zinc-100 pt-3.5 text-center text-[11px] text-zinc-500">
          <p>
            Canales oficiales de WhatsApp · Desde Tandil a todo el país · Respondemos a la brevedad
          </p>
        </div>
      </div>
    </div>
  );
}
