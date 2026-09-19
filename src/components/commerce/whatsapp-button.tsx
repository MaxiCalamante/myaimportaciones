"use client";

import { MessageCircle } from "lucide-react";
import { siteConfig, getWhatsAppUrl } from "@/lib/site";

export function WhatsAppFloatingButton() {
  const message = "Hola MYA Importaciones! Estuve viendo su tienda online y quería hacer una consulta.";

  return (
    <a
      href={getWhatsAppUrl(message)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Contactar por WhatsApp"
      className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-emerald-500 p-3.5 text-white shadow-xl hover:bg-emerald-600 hover:scale-105 active:scale-95 transition-all duration-200 group"
    >
      <MessageCircle className="h-6 w-6" />
      <span className="max-w-0 overflow-hidden whitespace-nowrap text-xs font-bold transition-all duration-300 group-hover:max-w-xs group-hover:pr-1">
        Consultas WhatsApp
      </span>
    </a>
  );
}
