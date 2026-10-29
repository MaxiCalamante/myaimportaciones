"use client";

import { useId, useState } from "react";
import { MapPin, Truck } from "lucide-react";
import { useCommerce } from "./commerce-provider";
import { siteConfig } from "@/lib/site";
import type { Product } from "@/lib/types";

interface ProductShippingCalculatorProps {
  product: Product;
  price: number;
  quantity?: number;
  isImmediate: boolean;
  fulfillmentMode?: string;
  className?: string;
  variantTitle?: string;
}

/** Destination inquiry only. Zone tariffs do not quote this parcel and dispatch point. */
export function ProductShippingCalculator({ product, quantity = 1, isImmediate, fulfillmentMode, className = "", variantTitle }: ProductShippingCalculatorProps) {
  const { postalCode, setPostalCode, openWhatsApp } = useCommerce();
  const [draft, setDraft] = useState({ value: postalCode, source: postalCode });
  const [error, setError] = useState("");
  const id = useId();
  const input = draft.source === postalCode ? draft.value : postalCode;
  const canPickup = isImmediate && fulfillmentMode !== "supplier";

  function requestQuote(event: React.FormEvent) {
    event.preventDefault();
    const cp = input.trim().toUpperCase();
    if (!/^(?:\d{4}|[A-Z]\d{4}[A-Z]{0,3})$/.test(cp)) { setError("Ingresá un código postal válido, por ejemplo 1000 o B7000."); return; }
    setError(""); setPostalCode(cp);
    openWhatsApp(`Hola MYA Importaciones. Quiero consultar el costo y plazo de envío de ${quantity} unidad(es) de "${product.title}"${variantTitle ? ` (${variantTitle})` : ""} al código postal ${cp}. ${siteConfig.appUrl}/producto/${product.slug}`);
  }

  return <section aria-labelledby={`${id}-heading`} className={`min-w-0 border-t border-zinc-200 pt-5 ${className}`} data-product-delivery>
    <div className="flex items-center gap-2"><Truck className="size-4 text-sky-700" aria-hidden="true"/><h2 id={`${id}-heading`} className="text-sm font-semibold text-zinc-950">Envío a tu destino</h2></div>
    <p className="mt-2 text-sm leading-6 text-zinc-600">Envíos a todo el país. Confirmamos costo, disponibilidad y plazo antes del pago.</p>
    <form onSubmit={requestQuote} className="mt-3">
      <label htmlFor={`${id}-cp`} className="mb-1.5 block text-xs font-medium text-zinc-700">Código postal de destino</label>
      <div className="flex min-w-0 gap-2">
        <div className="relative min-w-0 flex-1"><MapPin className="pointer-events-none absolute left-3 top-3.5 size-4 text-zinc-400" aria-hidden="true"/><input id={`${id}-cp`} value={input} onChange={e => { setDraft({ value: e.target.value.toUpperCase(), source: postalCode }); setError(""); }} maxLength={8} autoComplete="postal-code" placeholder="Ej. 1000" aria-invalid={!!error} aria-describedby={`${id}-help${error ? ` ${id}-error` : ""}`} className="min-h-11 w-full min-w-0 rounded-xl border border-zinc-300 bg-white pl-9 pr-3 text-sm outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-100"/></div>
        <button type="submit" className="min-h-11 shrink-0 rounded-xl border border-zinc-300 bg-white px-3 text-xs font-semibold text-zinc-900 transition hover:border-sky-700 hover:text-sky-800 active:scale-[0.98] sm:px-4 sm:text-sm">Consultar envío</button>
      </div>
      {error && <p id={`${id}-error`} role="alert" className="mt-2 text-xs text-red-700">{error}</p>}
      <p id={`${id}-help`} className="mt-2 text-xs leading-5 text-zinc-500">El envío se cotiza según tu pedido y destino. Te respondemos por WhatsApp.</p>
    </form>
    {canPickup && <p className="mt-3 text-xs leading-5 text-zinc-600">También podés coordinar el retiro en Tandil.</p>}
  </section>;
}
