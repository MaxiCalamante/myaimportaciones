"use client";
import { isVerifiedStock, purchasableQuantity } from "@/lib/commerce-policy";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, PackageCheck, ShoppingCart, Layers, ArrowRight } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { ElectronicsPrice } from "./electronics-price";
import type { Product, ProductChannel } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { useCommerce } from "@/components/commerce/commerce-provider";
import { getProductShippingTimeInfo } from "@/lib/shipping";
import { getColorSwatch } from "@/lib/variant-swatches";

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

  const colorDim = product.hasVariants
    ? product.optionsConfig?.find((d) => /color|tono|acabado/i.test(d.name))
    : undefined;
  const otherDims = product.hasVariants
    ? product.optionsConfig?.filter((d) => !/color|tono|acabado/i.test(d.name))
    : [];
  const [activeColor, setActiveColor] = useState<string | null>(null);

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
            <p className="text-[11px] text-zinc-500 sm:text-xs">
              {channel === "wholesale" ? "Precio mayorista" : product.hasVariants && product.minPrice && product.maxPrice && product.minPrice < product.maxPrice ? "Desde · precio en pesos" : "Precio en pesos"}
            </p>
            <p data-product-price className="whitespace-nowrap text-[clamp(0.95rem,4.1vw,1.125rem)] font-semibold tracking-tight tabular-nums text-zinc-950 sm:text-xl">
              {formatCurrency(product.hasVariants && product.minPrice ? product.minPrice : price)}
            </p>
            {channel === "retail" && <ElectronicsPrice product={product} />}


            {channel === "wholesale" ? (
              <p className="mt-1 text-xs text-zinc-500">
                Minimo {product.wholesaleMinQuantity} unidades
              </p>
            ) : null}
            {product.hasVariants && (
              <div className="mt-2 space-y-1.5">
                {colorDim && colorDim.values.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1" aria-label="Colores disponibles">
                    {colorDim.values.slice(0, 6).map((col) => {
                      const swatch = getColorSwatch(col);
                      const isSelected = activeColor === col;
                      const variantWithImg = product.variants?.find(
                        (v) => v.options[colorDim.name] === col && v.imageUrl
                      );
                      return (
                        <button
                          key={col}
                          type="button"
                          aria-label={`Ver en color ${col}`}
                          title={col}
                          onMouseEnter={() => {
                            if (variantWithImg?.imageUrl) {
                              setImageSrc(variantWithImg.imageUrl);
                              setActiveColor(col);
                            }
                          }}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (variantWithImg?.imageUrl) {
                              setImageSrc(variantWithImg.imageUrl);
                              setActiveColor(col);
                            }
                          }}
                          aria-pressed={isSelected}
                          className={`size-6 rounded-full border-[5px] border-white shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)] transition-transform duration-150 hover:scale-110 cursor-pointer ${
                            isSelected
                              ? "ring-2 ring-sky-600 ring-offset-1 scale-110"
                              : "hover:ring-1 hover:ring-zinc-400"
                          }`}
                          style={{
                            backgroundColor: swatch?.bg || "#cbd5e1",
                            borderColor: swatch?.border || "rgba(0,0,0,0.15)",
                          }}
                        />
                      );
                    })}
                    {colorDim.values.length > 6 && (
                      <span className="text-[10px] font-bold text-zinc-400">
                        +{colorDim.values.length - 6}
                      </span>
                    )}
                  </div>
                )}
                {otherDims && otherDims.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1">
                    {otherDims.map((opt) => (
                      <span
                        key={opt.name}
                        className="inline-flex items-center gap-1 rounded bg-sky-50 px-1.5 py-0.5 text-[10px] font-bold text-sky-800 border border-sky-200/70"
                      >
                        {opt.values.length} {opt.name.toLowerCase()}s
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <span
            className={`mt-2 inline-flex max-w-full rounded-md border px-2 py-1 text-[10px] font-medium ${shippingInfo.badgeClass}`}
            title={shippingInfo.shippingTimeDescription}
          >
            {shippingInfo.isImmediate ? "Stock en Tandil" : isVerifiedStock(product) ? "Disponible para envío" : "Disponibilidad a confirmar"}
          </span>
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
            className="mt-3 w-full cursor-pointer sm:mt-4"
            icon={<ShoppingCart className="h-4 w-4" />}
            onClick={() => addToCart(product, channel, addQuantity)}
            type="button"
          >
            Agregar
          </Button>
        )}
      </div>
    </article>
  );
}
