"use client";

import { ShieldCheck, Truck, Sparkles, Award, MessageCircle, MapPin } from "lucide-react";
import { siteConfig } from "@/lib/site";

export function TrustGuaranteeBadges({ variant = "full" }: { variant?: "full" | "compact" }) {
  const guarantees = [
    {
      icon: Award,
      title: "100% Original Sellado",
      desc: "Importación directa de origen con código de lote y QR de autenticidad garantizada.",
      badge: "Garantía Oficial",
    },
    {
      icon: MapPin,
      title: "Depósito Propio en Tandil",
      desc: "Stock físico real en Argentina. Sin trámites de aduana ni demoras de importación para vos.",
      badge: "Stock Inmediato",
    },
    {
      icon: Truck,
      title: "Despacho Express en 24hs",
      desc: "Envíos asegurados a todo el país por Andreani y Correo Argentino con seguimiento en vivo.",
      badge: "Todo el País",
    },
    {
      icon: MessageCircle,
      title: "Atención Directa con Máximo",
      desc: "Asesoramiento comercial personalizado por WhatsApp. Respondemos en minutos.",
      badge: "Soporte Humano",
    },
  ];

  if (variant === "compact") {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-2 gap-3">
          {guarantees.map((item, idx) => (
            <div key={idx} className="flex items-start gap-2.5">
              <div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-emerald-100 text-emerald-700">
                <item.icon className="h-4 w-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-zinc-900 block leading-tight">{item.title}</span>
                <span className="text-[10px] text-zinc-500 leading-tight block mt-0.5">{item.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <section className="py-12 bg-zinc-950 text-white relative overflow-hidden border-y border-zinc-800">
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/20 via-zinc-950 to-zinc-950 pointer-events-none" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-bold text-emerald-400">
            <ShieldCheck className="h-3.5 w-3.5" />
            Seguridad & Respaldo Comercial
          </span>
          <h2 className="mt-3 text-2xl sm:text-3xl font-black tracking-tight text-white">
            Garantía Blindada MYA Importaciones
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-zinc-400 leading-relaxed">
            Eliminamos todos los riesgos del comercio online. Comprás directo al importador con base operativa en Tandil, Provincia de Buenos Aires.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {guarantees.map((item, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6 flex flex-col justify-between hover:border-emerald-500/40 transition-colors shadow-sm"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="grid h-12 w-12 place-items-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <item.icon className="h-6 w-6" />
                  </div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 bg-emerald-950/50 px-2.5 py-1 rounded-full border border-emerald-800/50">
                    {item.badge}
                  </span>
                </div>
                <h3 className="text-base font-bold text-white mb-2">{item.title}</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">{item.desc}</p>
              </div>

              <div className="mt-6 pt-4 border-t border-zinc-800/60 flex items-center gap-2 text-[11px] font-semibold text-emerald-400">
                <Sparkles className="h-3 w-3" />
                Compromiso de entrega garantizado
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
