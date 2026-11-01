import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { WHOLESALE_MINIMUM_LABEL } from "@/lib/wholesale-policy";

export function WholesalePromo() {
  return <section aria-labelledby="wholesale-promo-title" className="mya-section bg-white"><div className="mya-container"><div className="flex flex-col gap-4 rounded-2xl border border-sky-100 bg-sky-50 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
    <div><p className="text-xs font-semibold text-sky-800">Comercios y revendedores</p><h2 id="wholesale-promo-title" className="mya-section-title mt-1">Hacé crecer tu negocio con MYA</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">Combiná rubros y consultá precios mayoristas con Máximo o Agustina. Enviamos a toda Argentina.</p><p className="mt-1 text-xs leading-5 text-zinc-600">Desde {WHOLESALE_MINIMUM_LABEL}.</p></div>
    <Link href="/mayorista" className="mya-action inline-flex shrink-0 items-center justify-center gap-2 px-4 text-sm font-semibold">Venta mayorista<ArrowRight className="size-4"/></Link>
  </div></div></section>;
}

export { WholesaleLanding } from "./wholesale-experience";
