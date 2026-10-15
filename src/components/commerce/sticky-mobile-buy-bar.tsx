"use client";

import Image from "next/image";
import { ShoppingCart, MessageCircle, ShoppingBag } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { isVerifiedStock } from "@/lib/commerce-policy";
import type { Product } from "@/lib/types";

interface Props {
  product: Product;
  price: number;
  transferPrice: number;
  added: boolean;
  onAddToCart: () => void;
  onOpenWhatsApp: () => void;
  cartCount: number;
  onOpenCart: () => void;
  visible: boolean;
}

export function StickyMobileBuyBar({
  product,
  price,
  transferPrice,
  added,
  onAddToCart,
  onOpenWhatsApp,
  cartCount,
  onOpenCart,
  visible,
}: Props) {
  if (!visible) return null;

  const inStock = isVerifiedStock(product);
  const imageUrl = product.imageUrl || "/placeholder-product.svg";

  return (
    <div
      role="region"
      aria-label="Acciones rápidas de compra"
      className="fixed bottom-0 left-0 right-0 z-40 block md:hidden bg-white/95 backdrop-blur-md border-t border-zinc-200 px-3 py-2 pb-[max(0.6rem,env(safe-area-inset-bottom))] shadow-2xl transition-all duration-300 animate-in slide-in-from-bottom"
    >
      <div className="flex items-center gap-2.5">
        {/* Thumbnail & Title/Price */}
        <div className="relative size-11 shrink-0 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50">
          <Image
            src={imageUrl}
            alt={product.title}
            fill
            sizes="44px"
            className="object-contain p-1"
          />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-bold text-zinc-900 leading-tight">
            {product.title}
          </p>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-sm font-black text-zinc-950">
              {formatCurrency(price)}
            </span>
            {transferPrice < price && (
              <span className="text-[10px] font-bold text-emerald-700">
                ({formatCurrency(transferPrice)} transf.)
              </span>
            )}
          </div>
        </div>

        {/* Cart Trigger with Badge */}
        <button
          type="button"
          onClick={onOpenCart}
          className="relative grid size-10 shrink-0 place-items-center rounded-xl border border-zinc-200 bg-white text-zinc-700 active:bg-zinc-100"
          aria-label={`Ver carrito (${cartCount} productos)`}
        >
          <ShoppingBag className="size-4" />
          {cartCount > 0 && (
            <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-sky-700 text-[9px] font-black text-white">
              {cartCount > 9 ? "9+" : cartCount}
            </span>
          )}
        </button>

        {/* WhatsApp Consultation */}
        <button
          type="button"
          onClick={onOpenWhatsApp}
          className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-600 text-white active:bg-emerald-700 shadow-xs"
          aria-label="Consultar por WhatsApp"
          title="Consultar por WhatsApp"
        >
          <MessageCircle className="size-4" />
        </button>

        {/* Add to Cart CTA */}
        <button
          type="button"
          disabled={!inStock}
          onClick={onAddToCart}
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-sky-700 px-3.5 text-xs font-bold text-white active:bg-sky-800 disabled:opacity-40 shadow-xs shrink-0"
        >
          <ShoppingCart className="size-3.5" />
          <span>{added ? "¡Agregado!" : "Comprar"}</span>
        </button>
      </div>
    </div>
  );
}
