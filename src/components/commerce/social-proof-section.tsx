import { ShieldCheck, Truck, Star, CheckCircle2, MessageCircle, MapPin, PackageCheck } from "lucide-react";
import Link from "next/link";
import { siteConfig } from "@/lib/site";

const testimonials = [
  {
    name: "Florencia M.",
    location: "CABA, Buenos Aires",
    product: "Sérum SKIN1004 Centella & Dr. Althea 345",
    comment:
      "Llegó en 48hs por Correo Argentino impecable y sellado de fábrica. Agustina me asesoró de diez por WhatsApp sobre qué rutina era mejor para mi piel sensible.",
    stars: 5,
  },
  {
    name: "Lucas G.",
    location: "Mar del Plata, Bs. As.",
    product: "Rotomartillo a batería Total Tools 20V",
    comment:
      "Máximo me pasó toda la ficha técnica antes de comprar y el código de seguimiento ni bien lo despachó. La máquina anda de diez, 100% recomendable.",
    stars: 5,
  },
  {
    name: "Camila R.",
    location: "Neuquén Capital",
    product: "Mascarilla Capilar Shiseido Fino",
    comment:
      "Tenía miedo de que fuera réplica como en otros sitios, pero es original posta traída de Japón. Venía súper protegida con plástico de burbujas.",
    stars: 5,
  },
  {
    name: "Martín S.",
    location: "Tandil",
    product: "Taladro percutor Wadfow & Batería",
    comment:
      "Retiré en el día en Tandil coordinando por WhatsApp sin vueltas. Excelente atención de los chicos y los mejores precios de la zona.",
    stars: 5,
  },
];

export function SocialProofSection() {
  return (
    <section aria-labelledby="social-proof-heading" className="bg-white py-14 sm:py-20 border-b border-zinc-200/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1 text-xs font-bold text-emerald-800">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>Confianza comprobada desde Tandil</span>
          </div>
          <h2 id="social-proof-heading" className="mt-3 text-2xl font-black tracking-tight text-zinc-950 sm:text-4xl">
            Envíos cuidados y clientes conformes en todo el país
          </h2>
          <p className="mt-3 text-sm sm:text-base leading-relaxed text-zinc-600">
            Cada paquete se despacha con embalaje de alta resistencia, seguro de transporte y trazabilidad online directa con Correo Argentino.
          </p>
        </div>

        {/* KPI Strip */}
        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:gap-6">
          <div className="rounded-2xl border border-zinc-200/90 bg-zinc-50/60 p-4 sm:p-5 text-center">
            <p className="text-2xl sm:text-3xl font-black text-zinc-950">+1.500</p>
            <p className="mt-1 text-xs font-semibold text-zinc-600">Envíos a todo el país</p>
          </div>
          <div className="rounded-2xl border border-zinc-200/90 bg-zinc-50/60 p-4 sm:p-5 text-center">
            <p className="text-2xl sm:text-3xl font-black text-emerald-600">100%</p>
            <p className="mt-1 text-xs font-semibold text-zinc-600">Originales sellados</p>
          </div>
          <div className="rounded-2xl border border-zinc-200/90 bg-zinc-50/60 p-4 sm:p-5 text-center">
            <p className="text-2xl sm:text-3xl font-black text-sky-600">24/48 hs</p>
            <p className="mt-1 text-xs font-semibold text-zinc-600">Despacho garantizado</p>
          </div>
          <div className="rounded-2xl border border-zinc-200/90 bg-zinc-50/60 p-4 sm:p-5 text-center">
            <p className="text-2xl sm:text-3xl font-black text-amber-500">5.0 ★</p>
            <p className="mt-1 text-xs font-semibold text-zinc-600">Atención personalizada</p>
          </div>
        </div>

        {/* Testimonials Grid */}
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {testimonials.map((t) => (
            <div
              key={t.name + t.location}
              className="flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs hover:border-sky-300 transition-colors"
            >
              <div>
                <div className="flex items-center gap-1 text-amber-400 mb-2.5">
                  {Array.from({ length: t.stars }).map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-current" />
                  ))}
                </div>
                <p className="text-xs sm:text-sm leading-relaxed text-zinc-700 italic">
                  &ldquo;{t.comment}&rdquo;
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-zinc-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-950">{t.name}</span>
                  <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500">
                    <MapPin className="h-3 w-3 text-zinc-400" />
                    {t.location}
                  </span>
                </div>
                <p className="mt-0.5 text-[10px] font-medium text-sky-700 truncate">
                  Compró: {t.product}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Reassurance Footer Banner */}
        <div className="mt-10 rounded-2xl bg-gradient-to-r from-sky-50 via-white to-emerald-50 border border-sky-100 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-2xl bg-sky-600 text-white shrink-0 shadow-xs">
              <PackageCheck className="size-6" />
            </span>
            <div>
              <p className="text-sm font-bold text-zinc-950">
                ¿Tenés dudas sobre stock o envío a tu ciudad?
              </p>
              <p className="text-xs text-zinc-600 mt-0.5">
                Escribinos directamente. Máximo y Agustina te responden al instante desde Tandil.
              </p>
            </div>
          </div>
          <a
            href={siteConfig.whatsappNumber ? `https://wa.me/${siteConfig.whatsappNumber}?text=${encodeURIComponent("Hola! Quisiera consultar sobre envíos y disponibilidad de un producto.")}` : "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-5 text-xs sm:text-sm font-bold text-white transition shadow-xs shrink-0 cursor-pointer"
          >
            <MessageCircle className="h-4 w-4" />
            Consultar por WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
}
