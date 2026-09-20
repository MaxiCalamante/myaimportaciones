"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, PackageCheck, ShoppingCart } from "lucide-react";
import { formatCurrency, formatPaymentMethod } from "@/lib/format";
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
  const { cart, addToCart, updateQuantity, toggleFavorite, isFavorite, setSelectedProduct } = useCommerce();
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
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-white hover:border-zinc-300 hover:shadow-lg transition-all duration-300">
      <Link
        href={`/producto/${product.slug}`}
        className="relative aspect-square overflow-hidden bg-white p-4 sm:p-5 cursor-pointer block border-b border-zinc-100"
      >
        <div className="relative h-full w-full">
          <Image
            alt={product.title}
            className="object-contain transition-transform duration-300 group-hover:scale-105"
            fill
            sizes="(min-width: 1280px) 20vw, (min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
            src={imageSrc}
            onError={() => setImageSrc("/placeholder-product.svg")}
            quality={95}
          />
        </div>
        <button
          aria-label={favorite ? "Quitar de favoritos" : "Agregar a favoritos"}
          className={`absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200/80 bg-white/95 shadow-xs backdrop-blur transition hover:scale-110 active:scale-95 ${
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
        {product.tags[0] && !["en_stock", "en stock"].includes(product.tags[0].toLowerCase()) ? (
          <span className="absolute left-3 top-3 rounded-lg bg-zinc-950/90 backdrop-blur-xs px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-xs">
            {product.tags[0]}
          </span>
        ) : null}
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase text-sky-700 truncate">
            <PackageCheck className="h-4 w-4 shrink-0" />
            <span className="truncate">{product.categoryName}</span>
          </div>
          <span
            className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold border ${shippingInfo.badgeClass}`}
            title={shippingInfo.shippingTimeDescription}
          >
            {shippingInfo.isImmediate ? "⚡ Stock 24hs" : "✈️ Envío 3-7d"}
          </span>
        </div>
        <Link href={`/producto/${product.slug}`}>
          <h3 className="mt-2 text-base font-semibold text-zinc-950 hover:text-sky-600 transition-colors hover:underline">
            {product.title}
          </h3>
        </Link>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-zinc-600">
          {product.description}
        </p>

        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs text-zinc-500">
              {channel === "wholesale" ? "Precio mayorista" : "Precio minorista"}
            </p>
            <p className="text-xl font-bold text-zinc-950">
              {formatCurrency(price)}
            </p>
            {channel === "retail" && price > 0 ? (
              <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-zinc-400 line-through">
                  ML: {formatCurrency(Math.round((price * 1.08) / 100) * 100)}
                </span>
                <span className="rounded bg-amber-50 border border-amber-200/80 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                  -8% vs ML
                </span>
              </div>
            ) : null}
            {channel === "wholesale" ? (
              <p className="mt-1 text-xs text-zinc-500">
                Minimo {product.wholesaleMinQuantity} unidades
              </p>
            ) : null}
          </div>
          <p className="text-xs text-zinc-500">{product.stock} disp.</p>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {product.paymentMethods.slice(0, 3).map((method) => (
            <span
              className="rounded-md bg-zinc-105 px-2 py-1 text-xs text-zinc-600"
              key={method}
            >
              {formatPaymentMethod(method)}
            </span>
          ))}
        </div>

        {cartItem ? (
          <div className="mt-4 flex items-center justify-between border border-zinc-200 rounded-lg p-1 h-10">
            <button
              aria-label="Restar unidad"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-650 hover:bg-zinc-100 cursor-pointer text-sm font-semibold"
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
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-650 hover:bg-zinc-100 cursor-pointer text-sm font-semibold"
              onClick={() => updateQuantity(product.id, channel, cartItem.quantity + 1)}
              type="button"
            >
              +
            </button>
          </div>
        ) : (
          <Button
            className="mt-4 w-full cursor-pointer"
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
