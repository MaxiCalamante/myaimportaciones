"use client";

import React, { useState, useMemo, useSyncExternalStore } from "react";
import {
  Truck,
  Building2,
  Home,
  Store,
  MapPin,
  CheckCircle2,
  Calendar,
  ExternalLink,
  ShieldCheck,
  PackageCheck,
  Zap,
  Clock,
  Info,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { useCommerce } from "@/components/commerce/commerce-provider";
import {
  calculateShipping,
  getProductShippingTimeInfo,
  type ShippingOption,
} from "@/lib/shipping";
import type { Product } from "@/lib/types";

const subscribeToHydration = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

interface ProductShippingCalculatorProps {
  product: Product;
  price: number;
  quantity?: number;
  isImmediate: boolean;
  fulfillmentMode?: string;
  className?: string;
}

const POPULAR_POSTAL_CODES = [
  { label: "Tandil", cp: "7000", tag: "Local" },
  { label: "CABA", cp: "1000", tag: "Bs.As." },
  { label: "Mar del Plata", cp: "7600", tag: "Bs.As." },
  { label: "La Plata", cp: "1900", tag: "Bs.As." },
  { label: "Rosario", cp: "2000", tag: "Santa Fe" },
  { label: "Córdoba", cp: "5000", tag: "Centro" },
  { label: "Mendoza", cp: "5500", tag: "Cuyo" },
  { label: "Neuquén", cp: "8300", tag: "Patagonia" },
];

function addBusinessDays(startDate: Date, days: number): Date {
  const result = new Date(startDate);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const dayOfWeek = result.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      added++;
    }
  }
  return result;
}

function formatShortDate(date: Date): string {
  const days = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
  const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${days[date.getDay()]} ${date.getDate()} de ${months[date.getMonth()]}`;
}

function resolveDeliveryDateLabel(estimatedDaysStr: string, isImmediate: boolean, isPickup: boolean): string {
  if (isPickup) {
    return isImmediate
      ? "Disponible hoy coordinando retiro"
      : "Disponible en 3 a 7 días hábiles";
  }

  if (/hoy/i.test(estimatedDaysStr)) {
    return "Llega hoy coordinando antes de las 18 hs";
  }

  if (/24 hs/i.test(estimatedDaysStr) || /en el día/i.test(estimatedDaysStr)) {
    return "Llega entre hoy y mañana";
  }

  const rangeMatch = estimatedDaysStr.match(/(\d+)\s*(?:a|-)\s*(\d+)/i);
  const now = new Date();

  // If not immediate stock, add preparation/arrival offset
  const extraPrepDays = isImmediate ? 0 : 2;

  if (rangeMatch) {
    const minDays = parseInt(rangeMatch[1], 10) + extraPrepDays;
    const maxDays = parseInt(rangeMatch[2], 10) + extraPrepDays;

    const minDate = addBusinessDays(now, minDays);
    const maxDate = addBusinessDays(now, maxDays);

    return `Llega entre el ${formatShortDate(minDate)} y el ${formatShortDate(maxDate)}`;
  }

  return `Plazo estimado: ${estimatedDaysStr}`;
}

export function ProductShippingCalculator({
  product,
  price,
  quantity = 1,
  isImmediate,
  fulfillmentMode = "own_stock",
  className = "",
}: ProductShippingCalculatorProps) {
  const {
    postalCode,
    setPostalCode,
    province,
    city,
    address,
    selectedShippingOptionId,
    setSelectedShippingOptionId,
  } = useCommerce();

  const [cpDraft, setCpDraft] = useState({ value: postalCode || "", source: postalCode });
  const inputCp = cpDraft.source === postalCode ? cpDraft.value : postalCode;
  const setInputCp = (value: string) => setCpDraft({ value, source: postalCode });
  const isClient = useSyncExternalStore(subscribeToHydration, clientSnapshot, serverSnapshot);

  const targetItem = useMemo(
    () => ({
      fulfillmentMode,
      stock: product.stock,
      stockVerifiedAt: product.stockVerifiedAt,
      supplierAvailable: product.supplierAvailable,
      tags: product.tags,
    }),
    [fulfillmentMode, product.stock, product.stockVerifiedAt, product.supplierAvailable, product.tags]
  );

  const shippingTimeInfo = useMemo(() => getProductShippingTimeInfo(targetItem), [targetItem]);

  const shippingCalculation = useMemo(() => {
    const codeToTest = inputCp.trim();
    if (!codeToTest || codeToTest.length < 4) {
      return calculateShipping("", price * quantity, isImmediate, fulfillmentMode === "supplier", province, city, address);
    }
    return calculateShipping(codeToTest, price * quantity, isImmediate, fulfillmentMode === "supplier", province, city, address);
  }, [inputCp, price, quantity, isImmediate, fulfillmentMode, province, city, address]);

  const handleApplyCp = (code: string) => {
    const clean = code.trim().toUpperCase();
    setInputCp(clean);
    setPostalCode(clean);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleApplyCp(inputCp);
  };

  const isTandil = shippingCalculation.zoneId === "local_tandil";

  return (
    <div className={`rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5 space-y-4 shadow-xs ${className}`}>
      {/* Availability / Dispatch Status Banner */}
      <div
        className={`flex items-start gap-3 p-3.5 rounded-xl border text-xs ${
          isImmediate
            ? "bg-emerald-50/80 border-emerald-200 text-emerald-950"
            : "bg-sky-50/80 border-sky-200 text-sky-950"
        }`}
      >
        <div
          className={`flex size-7 shrink-0 items-center justify-center rounded-lg mt-0.5 ${
            isImmediate ? "bg-emerald-600 text-white" : "bg-sky-600 text-white"
          }`}
        >
          {isImmediate ? <Zap className="size-4" /> : <Clock className="size-4" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-sm tracking-tight">{shippingTimeInfo.deliveryText}</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider border ${
                isImmediate
                  ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                  : "bg-sky-100 text-sky-800 border-sky-300"
              }`}
            >
              {shippingTimeInfo.badgeText}
            </span>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-zinc-600">
            {shippingTimeInfo.shippingTimeDescription}
          </p>
        </div>
      </div>

      {/* Calculator Header */}
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h3 className="font-bold text-zinc-950 text-sm flex items-center gap-2">
            <Truck className="size-4 text-sky-600 shrink-0" />
            Calcular costo y tiempo de entrega
          </h3>
          <span className="text-[11px] font-semibold text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-md">
            Correo Argentino Paq.ar
          </span>
        </div>
        <p className="text-xs text-zinc-600">
          Ingresá tu código postal para ver tarifas oficiales a domicilio o sucursal.
        </p>
      </div>

      {/* Input Form */}
      <form onSubmit={handleFormSubmit} className="space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400">
              <MapPin className="size-4" />
            </div>
            <input
              type="text"
              inputMode="numeric"
              maxLength={8}
              placeholder="Tu código postal (ej: 7000 o 1425)"
              value={inputCp}
              onChange={(e) => {
                const val = e.target.value.toUpperCase();
                setInputCp(val);
                if (val.length >= 4) {
                  setPostalCode(val);
                }
              }}
              aria-label="Código postal para calcular el envío"
              className="h-11 w-full rounded-xl border border-zinc-300 pl-9 pr-8 text-sm font-medium text-zinc-950 outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-500/20 placeholder:text-zinc-400"
            />
            {inputCp && (
              <button
                type="button"
                onClick={() => {
                  setInputCp("");
                  setPostalCode("");
                }}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-400 hover:text-zinc-700 cursor-pointer"
                aria-label="Borrar código postal"
              >
                ×
              </button>
            )}
          </div>
          <button
            type="submit"
            className="h-11 px-5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold transition active:scale-95 cursor-pointer shrink-0 inline-flex items-center gap-1.5"
          >
            <span>Calcular</span>
            <ChevronRight className="size-3.5" />
          </button>
        </div>

        {/* CPA Search Link */}
        <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-0.5 px-1">
          <a
            href="https://www.correoargentino.com.ar/formularios/cpa"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sky-700 hover:text-sky-800 hover:underline font-medium"
          >
            <span>¿No sabés tu código postal? Buscalo en Correo Argentino</span>
            <ExternalLink className="size-3" />
          </a>
        </div>
      </form>

      {/* Quick Access City Chips */}
      <div className="space-y-1.5 pt-1 border-t border-zinc-100">
        <p className="text-[11px] font-semibold text-zinc-500">Destinos frecuentes:</p>
        <div className="flex flex-wrap gap-1.5">
          {POPULAR_POSTAL_CODES.map((item) => {
            const isSelected = inputCp === item.cp;
            return (
              <button
                key={item.cp}
                type="button"
                onClick={() => handleApplyCp(item.cp)}
                className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-semibold transition cursor-pointer active:scale-95 ${
                  isSelected
                    ? "border-sky-600 bg-sky-50 text-sky-800 ring-1 ring-sky-600 shadow-2xs font-bold"
                    : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100 hover:border-zinc-300"
                }`}
              >
                <span>{item.label}</span>
                <span className="text-[10px] text-zinc-600 font-mono">({item.cp})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Calculated Shipping Options */}
      {shippingCalculation.isValid && isClient && (
        <div className="space-y-3 pt-2 animate-in fade-in slide-in-from-top-1 duration-200">
          {/* Resolved Location Header */}
          <div className="flex items-center justify-between rounded-xl bg-sky-50/70 border border-sky-100 px-3.5 py-2.5 text-xs text-sky-950">
            <div className="flex items-center gap-2 truncate">
              <MapPin className="size-4 text-sky-700 shrink-0" />
              <div className="truncate">
                <p className="font-bold truncate text-sky-950">
                  {shippingCalculation.locationName}
                </p>
                <p className="text-[10px] text-sky-700 font-medium">
                  Zona: {shippingCalculation.zoneName} · Código Postal {shippingCalculation.postalCode}
                </p>
              </div>
            </div>
            {isTandil && (
              <span className="rounded-full bg-emerald-100 border border-emerald-300 px-2 py-0.5 text-[10px] font-black text-emerald-800 uppercase tracking-wide shrink-0">
                Sede Central
              </span>
            )}
          </div>

          {/* Options List */}
          <div className="space-y-2" role="radiogroup" aria-label="Opciones de envío disponibles">
            {shippingCalculation.options.map((opt: ShippingOption) => {
              const isSelected = selectedShippingOptionId === opt.id;
              const isPickup = opt.type === "pickup";
              const isBranch = opt.type === "sucursal";
              const isHome = opt.type === "domicilio";
              const dateLabel = opt.requiresQuote ? "Costo y plazo a confirmar" : resolveDeliveryDateLabel(opt.estimatedDays, isImmediate, isPickup);

              return (
                <div
                  key={opt.id}
                  onClick={() => { handleApplyCp(inputCp); setSelectedShippingOptionId(opt.id); }}
                  role="radio"
                  aria-checked={isSelected}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === " " || e.key === "Enter") {
                      e.preventDefault();
                      handleApplyCp(inputCp);
                      setSelectedShippingOptionId(opt.id);
                    }
                  }}
                  className={`group relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border transition cursor-pointer select-none ${
                    isSelected
                      ? "border-sky-600 bg-sky-50/40 ring-1 ring-sky-600 shadow-xs"
                      : "border-zinc-200 bg-zinc-50/40 hover:bg-zinc-50 hover:border-zinc-300"
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`flex size-9 shrink-0 items-center justify-center rounded-xl transition ${
                        isSelected
                          ? "bg-sky-600 text-white shadow-2xs"
                          : "bg-white border border-zinc-200 text-zinc-600 group-hover:text-sky-700"
                      }`}
                    >
                      {isPickup ? (
                        <Store className="size-4.5" />
                      ) : isBranch ? (
                        <Building2 className="size-4.5" />
                      ) : (
                        <Home className="size-4.5" />
                      )}
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-zinc-950 text-xs sm:text-sm">
                          {opt.name}
                        </span>
                        {opt.badge && (
                          <span
                            className={`rounded-full px-2 py-0.2 text-[10px] font-extrabold uppercase tracking-wider ${
                              opt.isFree || opt.price === 0
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                : "bg-sky-100 text-sky-800 border border-sky-200"
                            }`}
                          >
                            {opt.badge}
                          </span>
                        )}
                      </div>

                      {/* Delivery Date Highlight */}
                      <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                        <Calendar className="size-3.5 shrink-0" />
                        <span>{dateLabel}</span>
                      </p>

                      <p className="text-[11px] text-zinc-500">
                        {isPickup
                          ? "Punto de entrega en Tandil · Coordinación directa por WhatsApp"
                          : isBranch
                          ? "Retirás con tu DNI en la sucursal de Correo Argentino (5 días de guarda)"
                          : "Entrega directa del cartero de Correo Argentino en tu puerta"}
                      </p>
                    </div>
                  </div>

                  {/* Price & Selection Indicator */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-200/60">
                    <div className="text-left sm:text-right">
                      {opt.requiresQuote ? (
                        <span className="text-xs font-bold text-sky-800">Tarifa a cotizar</span>
                      ) : opt.isFree ? (
                        <div className="flex flex-col sm:items-end">
                          {opt.originalPrice > 0 && (
                            <span className="text-[10px] line-through text-zinc-400">
                              {formatCurrency(opt.originalPrice)}
                            </span>
                          )}
                          <span className="text-sm sm:text-base font-black text-emerald-600 tracking-tight">
                            ¡GRATIS!
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col sm:items-end">
                          <span className="text-sm sm:text-base font-black text-zinc-950 tracking-tight">
                            {formatCurrency(opt.price)}
                          </span>
                          <span className="text-[10px] text-zinc-600">importe de referencia</span>
                        </div>
                      )}
                    </div>

                    <div
                      className={`flex size-5 shrink-0 items-center justify-center rounded-full border transition ${
                        isSelected
                          ? "border-sky-600 bg-sky-600 text-white"
                          : "border-zinc-300 bg-white"
                      }`}
                    >
                      {isSelected && <CheckCircle2 className="size-3.5 fill-current text-white" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Logistics Trust Journey */}
          <div className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-3 space-y-2 text-[11px] text-zinc-600">
            <div className="flex items-center gap-2 font-bold text-zinc-900">
              <PackageCheck className="size-3.5 text-sky-600" />
              <span>Garantía de Despacho y Envío MYA</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-zinc-600">
              <div className="flex items-center gap-1.5">
                <span className="text-emerald-600 font-bold">✓</span>
                <span>Embalaje reforzado multicapa sin costo</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-emerald-600 font-bold">✓</span>
                <span>Código Paq.ar en vivo por WhatsApp</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invalid Postal Code Warning */}
      {inputCp.trim().length >= 4 && !shippingCalculation.isValid && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 space-y-1">
          <p className="font-bold flex items-center gap-1.5">
            <Info className="size-4 text-amber-700" />
            Código postal no reconocido
          </p>
          <p className="text-[11px] text-amber-800">
            Verificá que el código postal contenga los 4 números correspondientes a tu localidad (ej: 7000 para Tandil, 1425 para Palermo CABA, 5000 para Córdoba).
          </p>
        </div>
      )}
    </div>
  );
}
