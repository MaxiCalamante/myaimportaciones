"use client";
import { isVerifiedStock, purchasableQuantity } from "@/lib/commerce-policy";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, PackageCheck, ShoppingCart, Layers, ArrowRight, Check } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { ElectronicsPrice } from "./electronics-price";
import type { Product, ProductChannel } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { useCommerce } from "@/components/commerce/commerce-provider";
import { getProductShippingTimeInfo } from "@/lib/shipping";
import { ProductVariantPreview } from "./product-variant-preview";

export function ProductCard({
  product,
  channel = "retail",
}: {
  product: Product;
  channel?: ProductChannel;
}) {
  const { cart, addToCart, updateQuantity, toggleFavorite, isFavorite } = useCommerce();
  const favorite = isFavorite(product.id);
  const price =
    channel === "wholesale" ? product.wholesalePrice : product.retailPrice;
  const addQuantity =
    channel === "wholesale" ? Math.max(product.wholesaleMinQuantity, 1) : 1;

  const initialImage = product.imageUrl || "/placeholder-product.svg";
  const [imageSrc, setImageSrc] = useState(initialImage);

  const [justAdded, setJustAdded] = useState(false);

  const cartItem = cart.find(
    (line) => line.product.id === product.id && line.channel === channel
  );

  const shippingInfo = getProductShippingTimeInfo(product);

  return (
    <article className="group flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white transition-[box-shadow,border-color] duration-200 hover:border-zinc-300 hover:shadow-md">
      <div className="relative">
      <Link
        href={`/producto/${product.slug}`}
        className="relative block aspect-square cursor-pointer overflow-hidden border-b border-zinc-100 bg-slate-50 p-3 sm:aspect-square sm:p-5"
      >
        <div className="absolute inset-3 sm:inset-5">
          <Image
            alt={product.title}
            className="object-contain transition-transform duration-150 group-hover:scale-105"
            fill
            sizes="(min-width: 1280px) 20vw, (min-width: 1024px) 25vw, 50vw"
            src={imageSrc}
            onError={() => setImageSrc("/placeholder-product.svg")}
            quality={75}
          />
        </div>
        <div className="absolute left-2 top-2 flex max-w-[calc(100%-3.75rem)] flex-col items-start gap-1 sm:left-3 sm:top-3">
          {product.brand && (
            <span className="max-w-full truncate rounded-lg bg-white/95 px-2 py-0.5 text-[10px] font-bold text-slate-800 shadow-2xs border border-zinc-200/50">
              {product.brand}
            </span>
          )}
          {product.tags?.includes("oferta") && (
            <span className="inline-flex items-center gap-1 rounded-md bg-rose-600 text-white px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider shadow-xs">
              🔥 Oferta
            </span>
          )}
          {product.featured && !product.tags?.includes("oferta") && (
            <span className="inline-flex items-center gap-1 rounded-md bg-amber-500 text-zinc-950 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider shadow-xs">
              ⭐ Destacado
            </span>
          )}
          {product.hasVariants && (
            <span className="inline-flex items-center gap-1 rounded-md bg-sky-700/90 text-white px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider shadow-2xs">
              <Layers className="size-2.5" />
              Variantes
            </span>
          )}
        </div>
      </Link>
        <button
          aria-label={favorite ? "Quitar de favoritos" : "Agregar a favoritos"}
          aria-pressed={favorite}
          className={`absolute right-2 top-2 inline-flex size-11 items-center justify-center rounded-xl border border-zinc-200/80 bg-white/95 shadow-xs transition-transform duration-150 hover:scale-105 active:scale-95 sm:right-3 sm:top-3 ${
            favorite ? "text-red-500" : "text-zinc-500 hover:text-red-500"
          }`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleFavorite(product.id);
          }}
          type="button"
        >
          <Heart className={favorite ? "h-4.5 w-4.5 fill-current" : "h-4.5 w-4.5"} />
        </button>
      </div>

      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <div className="flex min-w-0 items-center gap-1.5 text-[11px] font-semibold text-sky-700 sm:text-xs">
          <PackageCheck className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate" title={product.categoryName}>{product.categoryName}</span>
        </div>
        <Link href={`/producto/${product.slug}`}>
          <h3 className="mt-2 line-clamp-3 min-h-15 text-sm font-semibold leading-5 text-zinc-950 transition-colors hover:text-sky-600 sm:line-clamp-2 sm:min-h-12 sm:text-base sm:leading-6">
            {product.title}
          </h3>
        </Link>
        <div className="mt-auto pt-3">
          <div>
            {channel === "wholesale" || product.wholesalePrice > 0 ? (
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-baseline gap-2">
                  {product.retailPrice > 0 && (
                    <span className="text-xs text-zinc-400 line-through tabular-nums" title="Precio minorista de referencia">
                      Minorista: {formatCurrency(product.retailPrice)}
                    </span>
                  )}
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Mayorista:</span>
                    <p data-product-price className="whitespace-nowrap text-xl sm:text-2xl font-black tracking-tight tabular-nums text-emerald-600">
                      {formatCurrency(product.wholesalePrice > 0 ? product.wholesalePrice : price)}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {product.retailPrice > product.wholesalePrice && product.wholesalePrice > 0 && (
                    <span className="inline-flex items-center rounded-md bg-emerald-50 border border-emerald-200/80 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                      Ahorro -{Math.round(((product.retailPrice - product.wholesalePrice) / product.retailPrice) * 100)}%
                    </span>
                  )}
                  <p className="text-[11px] font-semibold text-zinc-500">
                    · Mínimo {product.wholesaleMinQuantity || 1} {product.wholesaleMinQuantity === 1 ? "unidad" : "unidades"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-700 bg-indigo-50/80 rounded px-1.5 py-0.5 border border-indigo-200/60" title="Descuentos adicionales por volumen en bulto cerrado">
                    📦 12+ un: -5% · 24+ un: -10% extra
                  </span>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-[11px] text-zinc-500 sm:text-xs">
                  {product.hasVariants && product.minPrice && product.maxPrice && product.minPrice < product.maxPrice ? "Desde · precio en pesos" : "Precio en pesos"}
                </p>
                <p data-product-price className="whitespace-nowrap text-[clamp(0.95rem,4.1vw,1.125rem)] font-semibold tracking-tight tabular-nums text-zinc-950 sm:text-xl">
                  {formatCurrency(product.hasVariants && product.minPrice ? product.minPrice : price)}
                </p>
                {(product.hasVariants && product.minPrice ? product.minPrice : price) > 0 && (
                  <p className="mt-1 text-[11px] font-medium text-emerald-800">Transferencia bancaria · beneficio sujeto a confirmación en el resumen.</p>
                )}
                <ElectronicsPrice product={product} />
              </div>
            )}
            {product.hasVariants && <ProductVariantPreview slug={product.slug} variants={product.variants} />}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span
              className={`inline-flex max-w-full rounded-md border px-2 py-1 text-[10px] font-medium ${shippingInfo.badgeClass}`}
              title={shippingInfo.shippingTimeDescription}
            >
              {shippingInfo.isImmediate ? "Stock en Tandil" : isVerifiedStock(product) ? "Disponible para envío" : "Disponibilidad a confirmar"}
            </span>
            {shippingInfo.isImmediate && product.stock > 0 && product.stock <= 3 && (
              <span className="inline-flex items-center gap-1 rounded bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[9px] font-bold text-amber-900">
                <span className="size-1 rounded-full bg-amber-500 animate-pulse" />
                {product.stock === 1 ? "¡Última un.!" : `¡Últimas ${product.stock} un.!`}
              </span>
            )}
          </div>
        </div>

        {product.hasVariants ? (
          <Link
            href={`/producto/${product.slug}`}
            className="mt-3 flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-sky-700 p-2.5 text-center text-xs font-bold text-white hover:bg-sky-800 transition sm:mt-4 sm:p-3 sm:text-sm shadow-xs group/btn cursor-pointer"
          >
            <span>Elegir opciones</span>
            <ArrowRight className="size-3.5 transition-transform group-hover/btn:translate-x-0.5" />
          </Link>
        ) : cartItem ? (
          <div className="mt-3 flex h-12 items-center justify-between rounded-lg border border-zinc-200 sm:mt-4">
            <button
              aria-label="Restar unidad"
              className="inline-flex size-11 items-center justify-center rounded-md text-zinc-600 hover:bg-zinc-100 cursor-pointer text-sm font-semibold"
              onClick={() => {
                if (channel === "wholesale" && cartItem.quantity <= product.wholesaleMinQuantity) {
                  updateQuantity(product.id, channel, 0); // remove from cart
                } else {
                  updateQuantity(product.id, channel, cartItem.quantity - 1);
                }
              }}
              type="button"
            >
              -
            </button>
            <span className="text-sm font-bold text-zinc-950">{cartItem.quantity}</span>
            <button
              aria-label="Sumar unidad"
              disabled={cartItem.quantity >= purchasableQuantity(product)}
              className="inline-flex size-11 items-center justify-center rounded-md text-zinc-600 hover:bg-zinc-100 cursor-pointer text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => updateQuantity(product.id, channel, cartItem.quantity + 1)}
              type="button"
            >
              +
            </button>
          </div>
        ) : !isVerifiedStock(product) ? <Link href={`/producto/${product.slug}`} className="mt-3 flex min-h-11 items-center justify-center rounded-xl bg-zinc-950 p-2.5 text-center text-xs font-semibold text-white sm:mt-4 sm:p-3 sm:text-sm">Ver disponibilidad</Link> : (
          <Button
            disabled={!isVerifiedStock(product)}
            className="mt-3 w-full cursor-pointer sm:mt-4 transition-all"
            icon={justAdded ? <Check className="h-4 w-4 text-emerald-300" /> : <ShoppingCart className="h-4 w-4" />}
            onClick={() => {
              addToCart(product, channel, addQuantity);
              setJustAdded(true);
              setTimeout(() => setJustAdded(false), 1500);
            }}
            type="button"
          >
            {justAdded ? "¡Agregado al carrito!" : "Agregar"}
          </Button>
        )}
      </div>
    </article>
  );
}
