"use client";
import { isVerifiedStock, purchasableQuantity } from "@/lib/commerce-policy";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, PackageCheck, ShoppingCart } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import type { Product, ProductChannel } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { useCommerce } from "@/components/commerce/commerce-provider";
import { getProductShippingTimeInfo } from "@/lib/shipping";

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

  const cartItem = cart.find(
    (line) => line.product.id === product.id && line.channel === channel
  );

  const shippingInfo = getProductShippingTimeInfo(product);

  return (
    <article className="group flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition-[transform,box-shadow,border-color] duration-150 hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-lg">
      <div className="relative">
      <Link
        href={`/producto/${product.slug}`}
        className="relative block aspect-[4/3] cursor-pointer overflow-hidden border-b border-zinc-100 bg-slate-50 p-3 sm:aspect-square sm:p-5"
      >
        <div className="relative h-full w-full">
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
        {product.brand && <span className="absolute left-2 top-2 max-w-[65%] truncate rounded-lg bg-white/95 px-2 py-1 text-[10px] font-bold text-slate-800 shadow-sm sm:left-3 sm:top-3">{product.brand}</span>}
      </Link>
        <button
          aria-label={favorite ? "Quitar de favoritos" : "Agregar a favoritos"}
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
              {channel === "wholesale" ? "Precio mayorista" : "Precio en pesos"}
            </p>
            <p className="text-lg font-bold tabular-nums text-zinc-950 sm:text-xl">
              {formatCurrency(price)}
            </p>
            {channel === "retail" && <p className="mt-1 text-[11px] text-emerald-800">Consultá las condiciones de compra</p>}

            {channel === "wholesale" ? (
              <p className="mt-1 text-xs text-zinc-500">
                Minimo {product.wholesaleMinQuantity} unidades
              </p>
            ) : null}
          </div>
          <span
            className={`mt-2 inline-flex rounded-md border px-2 py-0.5 text-[10px] font-semibold ${shippingInfo.badgeClass}`}
            title={shippingInfo.shippingTimeDescription}
          >
            {shippingInfo.isImmediate ? "Stock en Tandil" : isVerifiedStock(product) ? "Disponible · entrega a coordinar" : "Disponibilidad a confirmar"}
          </span>
        </div>

        {cartItem ? (
          <div className="mt-3 flex h-12 items-center justify-between rounded-lg border border-zinc-200 sm:mt-4">
            <button
              aria-label="Restar unidad"
              className="inline-flex size-11 items-center justify-center rounded-md text-zinc-650 hover:bg-zinc-100 cursor-pointer text-sm font-semibold"
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
              className="inline-flex size-11 items-center justify-center rounded-md text-zinc-650 hover:bg-zinc-100 cursor-pointer text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => updateQuantity(product.id, channel, cartItem.quantity + 1)}
              type="button"
            >
              +
            </button>
          </div>
        ) : !isVerifiedStock(product) ? <Link href={`/producto/${product.slug}`} className="mt-3 rounded-xl bg-zinc-950 p-2.5 text-center text-xs font-semibold text-white sm:mt-4 sm:p-3 sm:text-sm">Ver disponibilidad</Link> : (
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
