import Link from "next/link";
import { Sparkles, ArrowRight, MessageCircle, HeartHandshake, ShieldCheck, Truck } from "lucide-react";
import { siteConfig } from "@/lib/site";

export function GiveawayStoreBridge() {
  const agustinaWhatsApp = siteConfig.whatsappNumberAgustina || siteConfig.whatsappNumber;
  const whatsappUrl = `https://wa.me/${agustinaWhatsApp}?text=${encodeURIComponent("Hola Agustina! Vi el sorteo de MYA y quisiera consultar por el Travel Kit de SKIN1004 y productos de cosmética coreana.")}`;

  return (
    <section aria-label="Productos del sorteo en la tienda" className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="overflow-hidden rounded-3xl border border-sky-100 bg-gradient-to-br from-white via-sky-50/40 to-pink-50/30 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-bold text-sky-800">
              <Sparkles className="h-3.5 w-3.5 text-sky-600" />
              <span>Disponible en la tienda con entrega inmediata</span>
            </div>

            <h2 className="mt-3 text-xl sm:text-2xl font-black tracking-tight text-zinc-950">
              ¿No querés esperar al sorteo? Llevate tu Kit SKIN1004 hoy
            </h2>

            <p className="mt-2 text-xs sm:text-sm leading-relaxed text-zinc-600">
              El Travel Kit de SKIN1004 Madagascar Centella original (5 pasos de rutina coreana completa) y los mejores productos de K-Beauty, Shiseido Fino y Kérastase están disponibles con stock real en Tandil y despacho a todo el país.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-zinc-600">
              <span className="flex items-center gap-1 font-semibold text-emerald-700">
                <ShieldCheck className="h-4 w-4" /> 100% Original sellado
              </span>
              <span className="flex items-center gap-1 font-semibold text-sky-700">
                <Truck className="h-4 w-4" /> Despacho en 24hs por Correo Argentino
              </span>
              <span className="flex items-center gap-1 font-semibold text-pink-700">
                <HeartHandshake className="h-4 w-4" /> Asesoramiento con Agustina
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 shrink-0">
            <Link
              href="/catalogo?q=SKIN1004"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-sky-700 hover:bg-sky-800 px-5 text-xs sm:text-sm font-bold text-white transition shadow-xs"
            >
              <span>Ver Kit SKIN1004</span>
              <ArrowRight className="h-4 w-4" />
            </Link>

            <Link
              href="/catalogo?category=cosmetica-coreana"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 px-5 text-xs sm:text-sm font-bold text-zinc-800 transition shadow-2xs"
            >
              <span>Ver toda la Cosmética Coreana</span>
            </Link>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 px-5 text-xs sm:text-sm font-bold text-white transition shadow-xs"
            >
              <MessageCircle className="h-4 w-4" />
              <span>Consultar a Agustina</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
