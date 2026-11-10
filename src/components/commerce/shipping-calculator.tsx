"use client";

import { useId, useState, useMemo } from "react";
import { MapPin, Truck, CheckCircle2, Clock, MessageCircle } from "lucide-react";
import { useCommerce } from "./commerce-provider";
import { siteConfig } from "@/lib/site";
import type { Product } from "@/lib/types";
import { calculateShipping } from "@/lib/shipping";
import { formatCurrency } from "@/lib/format";

interface ProductShippingCalculatorProps {
  product: Product;
  price: number;
  quantity?: number;
  isImmediate: boolean;
  fulfillmentMode?: string;
  className?: string;
  variantTitle?: string;
}

/** Destination inquiry and postal code rate estimator */
export function ProductShippingCalculator({
  product,
  price,
  quantity = 1,
  isImmediate,
  fulfillmentMode,
  className = "",
  variantTitle,
}: ProductShippingCalculatorProps) {
  const { postalCode, setPostalCode, openWhatsApp } = useCommerce();
  const [draft, setDraft] = useState({ value: postalCode, source: postalCode });
  const [error, setError] = useState("");
  const id = useId();
  const input = draft.source === postalCode ? draft.value : postalCode;
  const canPickup = isImmediate && fulfillmentMode !== "supplier";

  const cleanCp = input.trim().toUpperCase();
  const isValidCp = /^(?:\d{4}|[A-Z]\d{4}[A-Z]{0,3})$/.test(cleanCp);

  // Compute live tariff and delivery estimate based on entered postal code
  const calculation = useMemo(() => {
    if (!isValidCp) return null;
    return calculateShipping(cleanCp, price * quantity, isImmediate, fulfillmentMode === "supplier");
  }, [cleanCp, isValidCp, price, quantity, isImmediate, fulfillmentMode]);

  function handleCalculate(event: React.FormEvent) {
    event.preventDefault();
    if (!isValidCp) {
      setError("Ingresá un código postal argentino válido (ej. 1000, 7000 o B7000).");
      return;
    }
    setError("");
    setPostalCode(cleanCp);
  }

  function handleWhatsAppInquiry() {
    const cpText = cleanCp || postalCode || "mi localidad";
    openWhatsApp(
      `Hola MYA Importaciones. Quisiera consultar costo y plazo de envío para ${quantity} unidad(es) de "${product.title}"${
        variantTitle ? ` (${variantTitle})` : ""
      } con destino al CP ${cpText}. ${siteConfig.appUrl}/producto/${product.slug}`
    );
  }

  return (
    <section aria-labelledby={`${id}-heading`} className={`min-w-0 border-t border-zinc-200 pt-5 ${className}`} data-product-delivery>
      <div className="flex items-center gap-2">
        <Truck className="size-4 text-sky-700" aria-hidden="true" />
        <h2 id={`${id}-heading`} className="text-sm font-semibold text-zinc-950">
          Calculá el envío a tu destino
        </h2>
      </div>
      <p className="mt-1 text-xs leading-5 text-zinc-600">
        Envíos asegurados desde Tandil a toda la Argentina por Correo Argentino y transportes expresos.
      </p>

      <form onSubmit={handleCalculate} className="mt-3">
        <label htmlFor={`${id}-cp`} className="mb-1.5 block text-xs font-medium text-zinc-700">
          Código postal de destino
        </label>
        <div className="flex min-w-0 gap-2">
          <div className="relative min-w-0 flex-1">
            <MapPin className="pointer-events-none absolute left-3 top-3 size-4 text-zinc-400" aria-hidden="true" />
            <input
              id={`${id}-cp`}
              value={input}
              onChange={(e) => {
                setDraft({ value: e.target.value.toUpperCase(), source: postalCode });
                setError("");
              }}
              maxLength={8}
              autoComplete="postal-code"
              placeholder="Ej. 1000 o 7000"
              aria-invalid={!!error}
              aria-describedby={`${id}-help${error ? ` ${id}-error` : ""}`}
              className="min-h-10 w-full min-w-0 rounded-xl border border-zinc-300 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-sky-700 focus:ring-2 focus:ring-sky-100"
            />
          </div>
          <button
            type="submit"
            className="min-h-10 shrink-0 rounded-xl bg-sky-700 px-3.5 text-xs font-semibold text-white shadow-xs transition hover:bg-sky-800 active:scale-[0.98] sm:px-4 sm:text-sm"
          >
            Calcular
          </button>
        </div>
        {error && (
          <p id={`${id}-error`} role="alert" className="mt-1.5 text-xs text-red-600">
            {error}
          </p>
        )}
      </form>

      {/* Live calculation results */}
      {calculation && calculation.isValid && calculation.options.length > 0 && (
        <div className="mt-3 rounded-xl border border-sky-100 bg-sky-50/60 p-3 text-xs">
          <div className="mb-2 flex items-center justify-between border-b border-sky-200/60 pb-1.5">
            <span className="font-semibold text-sky-950 flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5 text-sky-700" />
              Destino: {calculation.locationName || calculation.zoneName}
            </span>
            <span className="text-[11px] font-medium text-sky-800">CP {calculation.postalCode}</span>
          </div>
          <div className="space-y-2">
            {calculation.options.map((opt) => (
              <div key={opt.id} className="flex items-center justify-between rounded-lg bg-white/90 p-2 shadow-2xs border border-zinc-100">
                <div className="min-w-0 pr-2">
                  <p className="font-semibold text-zinc-900 leading-tight">{opt.name}</p>
                  <p className="mt-0.5 text-[11px] text-zinc-500 flex items-center gap-1">
                    <Clock className="size-3 text-zinc-400" />
                    {opt.estimatedDays}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  {opt.isFree ? (
                    <span className="font-bold text-emerald-700">Gratis</span>
                  ) : opt.requiresQuote || opt.price === 0 ? (
                    <span className="font-medium text-sky-900">A coordinar</span>
                  ) : (
                    <span className="font-bold text-zinc-900">{formatCurrency(opt.price)}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2.5 pt-2 border-t border-sky-200/50 flex items-center justify-between text-[11px] text-zinc-600">
            <span>¿Dudas con la entrega?</span>
            <button
              type="button"
              onClick={handleWhatsAppInquiry}
              className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:text-emerald-800 underline underline-offset-2"
            >
              <MessageCircle className="size-3" />
              Consultar a Máximo o Agustina
            </button>
          </div>
        </div>
      )}

      {canPickup && !calculation?.options.some((o) => o.type === "pickup") && (
        <p className="mt-2.5 text-xs leading-5 text-zinc-600">
          📍 También podés coordinar el retiro gratuito en nuestro punto de entrega en Tandil.
        </p>
      )}
    </section>
  );
}
