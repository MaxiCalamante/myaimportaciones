"use client";

import { Check, MessageCircle, ShoppingBag, ShoppingCart } from "lucide-react";
import { formatCurrency } from "@/lib/format";

interface Props {
  price: number;
  quantity: number;
  added: boolean;
  onAddToCart: () => void;
  onOpenWhatsApp: () => void;
  cartCount: number;
  onOpenCart: () => void;
  visible: boolean;
  disabled?: boolean;
  needsSelection?: boolean;
  variantTitle?: string;
}

export function StickyMobileBuyBar({ price, quantity, added, onAddToCart, onOpenWhatsApp, cartCount, onOpenCart, visible, disabled, needsSelection, variantTitle }: Props) {
  if (!visible) return null;
  const label = added ? "Agregado" : disabled ? needsSelection ? "Elegir" : "Consultar" : "Agregar";
  const Icon = added ? Check : disabled ? MessageCircle : ShoppingCart;
  function purchase() {
    if (!disabled) return onAddToCart();
    if (!needsSelection) return onOpenWhatsApp();
    const options = document.getElementById("variant-options-section");
    options?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "center" });
    options?.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true });
  }
  return (
    <section aria-label="Acciones rápidas de compra" className="product-buy-bar fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/95 px-4 pt-3 backdrop-blur-lg md:hidden">
      <div className="mx-auto grid max-w-xl grid-cols-[minmax(0,1fr)_auto_2.75rem] items-center gap-2 pb-3">
        <div className="min-w-0 pr-1">
          <p className="truncate text-[11px] font-medium text-zinc-500">{needsSelection ? "Elegí una opción" : `Total · ${quantity} ${quantity === 1 ? "unidad" : "unidades"}`}</p>
          <p className="whitespace-nowrap text-[clamp(0.95rem,4.5vw,1.125rem)] font-bold leading-tight tracking-tight tabular-nums text-zinc-950">{formatCurrency(price * quantity)}</p>
          {price > 0 && <p className="truncate text-[10px] font-bold text-emerald-700 leading-tight">{formatCurrency(Math.round(price * quantity * 0.97))} transf. (-3%)</p>}
          {variantTitle && <p className="truncate text-[10px] text-zinc-500" title={variantTitle}>{variantTitle}</p>}
        </div>
        <button type="button" onClick={purchase} aria-label={disabled ? needsSelection ? "Elegir opciones del producto" : "Consultar disponibilidad por WhatsApp" : "Agregar al carrito desde el resumen"} className="inline-flex h-12 min-w-24 items-center justify-center gap-2 rounded-xl bg-sky-700 px-3 text-sm font-semibold text-white transition-colors hover:bg-sky-800 active:scale-[0.98] sm:min-w-28">
          <Icon className="size-4 shrink-0"/><span>{label}</span>
        </button>
        <button type="button" onClick={onOpenCart} aria-label={`Ver carrito (${cartCount} productos)`} className="relative grid size-11 place-items-center rounded-xl border border-zinc-200 text-zinc-700 transition-colors hover:bg-zinc-50">
          <ShoppingBag className="size-5"/>
          {cartCount > 0 && <span className="absolute -right-1 -top-1 grid min-w-4 place-items-center rounded-full bg-zinc-950 px-1 text-[10px] leading-4 text-white">{cartCount > 99 ? "99+" : cartCount}</span>}
        </button>
      </div>
    </section>
  );
}
