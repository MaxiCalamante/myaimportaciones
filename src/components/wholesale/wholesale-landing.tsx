import Link from "next/link";
import { ArrowRight, Boxes, Store } from "lucide-react";
import { WHOLESALE_MINIMUM_LABEL } from "@/lib/wholesale-policy";

export function WholesalePromo() {
  return (
    <section aria-labelledby="wholesale-promo-title" className="mya-section bg-white">
      <div className="mya-container">
        <div className="flex flex-col gap-6 rounded-3xl border border-sky-200/80 bg-gradient-to-br from-sky-50 via-blue-50/40 to-white p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8 lg:p-10 shadow-xs">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-300/60 bg-sky-100/60 px-3 py-1 text-xs font-bold uppercase tracking-wider text-sky-800">
              <Store aria-hidden="true" className="size-3.5" />
              Venta Mayorista B2B
            </span>
            <h2 id="wholesale-promo-title" className="mt-3 text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl">
              ¿Tenés un negocio o querés empezar a revender?
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600 sm:text-base">
              Encontrá productos importados para tu emprendimiento. Explorá precios mayoristas y combiná productos de diferentes rubros en un mismo pedido.
            </p>
            <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-sky-900 bg-white/80 border border-sky-200/60 px-3 py-1 rounded-lg">
              <Boxes aria-hidden="true" className="size-3.5 text-sky-700" />
              Compra mínima flexible: {WHOLESALE_MINIMUM_LABEL}.
            </p>
          </div>
          <div className="flex flex-col gap-2.5 sm:shrink-0">
            <Link
              href="/mayorista"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-sky-700 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-sky-800 focus-visible:outline-2 focus-visible:outline-sky-700 active:scale-[0.99]"
            >
              <span>Ver catálogo mayorista</span>
              <ArrowRight className="size-4" />
            </Link>
            <p className="text-center text-[11px] text-zinc-500">
              Precios públicos · Envíos a todo el país
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export { WholesaleLanding } from "./wholesale-experience";
