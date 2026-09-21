import Link from "next/link";
import { MapPin, MessageCircle, PackageCheck, Truck } from "lucide-react";

export function TrustGuaranteeBadges({ variant = "full" }: { variant?: "full" | "compact" }) {
  const items = [
    { icon: MapPin, title: "Atención desde Tandil", text: "Retiro coordinado y consultas antes de comprar." },
    { icon: PackageCheck, title: "Disponibilidad clara", text: "Diferenciamos stock confirmado de productos a consultar." },
    { icon: Truck, title: "Entrega según tu destino", text: "Revisá costos y condiciones antes de confirmar." },
    { icon: MessageCircle, title: "Atención personal", text: "Te ayudamos a elegir y acompañamos tu compra." },
  ];
  return <section className={variant === "compact" ? "rounded-2xl border p-4" : "bg-slate-100 py-12"}>
    <div className="mx-auto max-w-7xl px-4"><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {items.map(item => <div key={item.title}><item.icon className="mb-2 h-6 w-6 text-sky-700" /><h3 className="font-bold">{item.title}</h3><p className="mt-1 text-sm text-slate-600">{item.text}</p></div>)}
    </div><Link className="mt-5 inline-block text-sm text-sky-700 underline" href="/condiciones">Condiciones de compra, envíos y devoluciones</Link></div>
  </section>;
}
