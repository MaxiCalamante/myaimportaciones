import Link from "next/link";
import { MapPin, MessageCircle, PackageCheck, Truck } from "lucide-react";

export function TrustGuaranteeBadges({ variant = "full" }: { variant?: "full" | "compact" }) {
  const items = [
    { icon: MapPin, title: "Desde Tandil, cerca tuyo", text: "Coordiná tu retiro en Tandil y consultanos antes de elegir." },
    { icon: PackageCheck, title: "Productos originales", text: "Importación directa y disponibilidad confirmada antes de comprar." },
    { icon: Truck, title: "Llegamos a todo el país", text: "Enviamos por Correo Argentino. Seguí tu envío online con el código de seguimiento." },
    { icon: MessageCircle, title: "Hablá con Máximo y Agustina", text: "Te acompañamos por WhatsApp antes y después de tu compra." },
  ];
  const compact = variant === "compact";
  return (
    <section aria-label="Comprá con confianza" data-trust-badges={variant} className={compact ? "rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5" : "border-y border-slate-200/70 bg-slate-100/70 py-8 sm:py-12"}>
      <div className={compact ? "min-w-0" : "mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"}>
        <div className={compact ? "grid gap-5 sm:grid-cols-2" : "grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4"}>
          {items.map(item => (
            <div key={item.title} className={`flex min-w-0 items-start gap-3 ${compact ? "" : "rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 lg:flex-col lg:gap-4"}`}>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700"><item.icon aria-hidden="true" className="h-5 w-5" /></span>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold leading-5 text-slate-950 sm:text-base sm:leading-6">{item.title}</h3>
                <p className="mt-1.5 text-sm leading-6 text-slate-600">{item.text}</p>
              </div>
            </div>
          ))}
        </div>
        <div className={compact ? "mt-5 border-t border-slate-200 pt-3" : "mt-5 text-center sm:mt-6"}>
          <Link className="inline-flex min-h-11 items-center rounded-lg py-2 text-sm font-medium leading-6 text-sky-800 underline decoration-sky-300 underline-offset-4 transition hover:text-sky-950 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-700" href="/condiciones">Condiciones de compra, envíos y devoluciones</Link>
        </div>
      </div>
    </section>
  );
}
