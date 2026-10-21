import { MessageCircle, PackageCheck, Truck, CreditCard, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { getWhatsAppUrl } from "@/lib/site";

const steps = [
  { icon: PackageCheck, title: "Información del producto", text: "Revisá la presentación, el modelo y las especificaciones de cada ficha." },
  { icon: CreditCard, title: "Precios en pesos", text: "El carrito informa los productos y los medios de pago disponibles antes de confirmar." },
  { icon: Truck, title: "Envíos a Argentina", text: "Consultá el costo, el transporte y el plazo de entrega para tu domicilio." },
  { icon: MessageCircle, title: "Atención personalizada", text: "Máximo y Agustina te acompañan por WhatsApp antes y después de tu compra." },
];
export function SocialProofSection() {
  return <section aria-labelledby="social-proof-heading" className="border-b border-zinc-200/80 bg-white py-14 sm:py-20"><div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
    <div className="mx-auto max-w-3xl text-center"><span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1 text-xs font-bold text-emerald-800"><ShieldCheck className="h-4 w-4"/>Comprá con información clara</span><h2 id="social-proof-heading" className="mt-3 text-2xl font-black tracking-tight text-zinc-950 sm:text-4xl">Te acompañamos en cada paso de tu compra</h2><p className="mt-3 text-sm leading-relaxed text-zinc-600 sm:text-base">Conocé los detalles del producto y las condiciones de entrega antes de elegir.</p></div>
    <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{steps.map(({ icon: Icon, title, text }) => <div key={title} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs"><Icon className="mb-3 h-6 w-6 text-sky-700"/><h3 className="text-sm font-bold text-zinc-950">{title}</h3><p className="mt-2 text-sm leading-relaxed text-zinc-600">{text}</p></div>)}</div>
    <div className="mt-10 flex flex-col items-center justify-between gap-4 rounded-2xl border border-sky-100 bg-sky-50 p-6 sm:flex-row"><Link href="/condiciones" className="text-sm font-semibold text-sky-900 underline text-center sm:text-left">Condiciones de compra, envíos y devoluciones</Link><a href={getWhatsAppUrl("Hola, quisiera consultar disponibilidad y envío de un producto.")} target="_blank" rel="noreferrer" className="inline-flex min-h-11 w-full sm:w-auto justify-center items-center gap-2 rounded-xl bg-emerald-700 px-5 text-sm font-bold text-white shadow-xs transition active:scale-95 hover:bg-emerald-800"><MessageCircle className="h-4 w-4"/>Consultar por WhatsApp</a></div>
  </div></section>;
}
