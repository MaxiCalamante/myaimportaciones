"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, Heart, ShoppingBag } from "lucide-react";
import { isVerifiedStock, purchasableQuantity } from "@/lib/commerce-policy";
import { formatCurrency } from "@/lib/format";
import { getProductShippingTimeInfo } from "@/lib/shipping";
import type { Product, ProductChannel } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { useCommerce } from "./commerce-provider";
import { ElectronicsPrice } from "./electronics-price";
import { ProductVariantPreview } from "./product-variant-preview";

export function ProductCard({ product, channel = "retail", priority = false }: {
  product: Product;
  channel?: ProductChannel;
  priority?: boolean;
}) {
  const { cart, addToCart, updateQuantity, toggleFavorite, isFavorite } = useCommerce();
  const favorite = isFavorite(product.id);
  const price = channel === "wholesale" ? product.wholesalePrice : product.retailPrice;
  const displayPrice = channel === "retail" && product.hasVariants && product.minPrice ? product.minPrice : price;
  const priceRange = channel === "retail" && product.hasVariants && product.minPrice && product.maxPrice && product.minPrice < product.maxPrice;
  const addQuantity = channel === "wholesale" ? Math.max(product.wholesaleMinQuantity, 1) : 1;
  const [imageSrc, setImageSrc] = useState(product.imageUrl || "/placeholder-product.svg");
  const [justAdded, setJustAdded] = useState(false);
  const cartItem = cart.find(line => line.product.id === product.id && line.channel === channel && !line.variantId);
  const shipping = getProductShippingTimeInfo(product);
  const available = isVerifiedStock(product);
  const href = `/producto/${product.slug}`;
  const badge = product.tags.includes("oferta") ? "Oferta" : product.featured ? "Destacado" : null;

  return <article data-product-card className="group flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-white hover:border-zinc-300 hover:shadow-sm">
    <div className="relative">
      <Link href={href} aria-label={`Ver ${product.title}`} className="relative block aspect-square overflow-hidden bg-white">
        <Image fill src={imageSrc} alt={product.title} loading={priority ? "eager" : "lazy"}
          sizes="(min-width: 1280px) 286px, (min-width: 768px) 30vw, 46vw" quality={75}
          className="object-contain p-4 sm:p-7" onError={() => setImageSrc("/placeholder-product.svg")} />
        {badge && <span className="absolute left-2.5 top-3 max-w-[calc(100%-4rem)] rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[10px] font-medium leading-4 text-zinc-700 sm:left-4 sm:top-4">{badge}</span>}
      </Link>
      <button type="button" aria-label={favorite ? "Quitar de favoritos" : "Agregar a favoritos"} aria-pressed={favorite}
        className={`absolute right-1.5 top-1.5 grid size-11 place-items-center rounded-full bg-white/95 sm:right-3 sm:top-3 ${favorite ? "text-rose-600" : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950"}`}
        onClick={() => toggleFavorite(product.id)}><Heart className={`size-5 stroke-[1.5] ${favorite ? "fill-current" : ""}`} /></button>
    </div>
    <div className="flex min-w-0 flex-1 flex-col px-3 pb-3 pt-2 sm:px-5 sm:pb-5 sm:pt-3">
      <p className="truncate text-[11px] font-medium text-zinc-500" title={product.brand || product.categoryName}>{product.brand || product.categoryName}</p>
      <Link href={href} className="mt-1.5 block rounded-sm" title={product.title}>
        <h3 className="line-clamp-3 min-h-15 text-sm font-medium leading-5 text-zinc-900 group-hover:text-sky-900 sm:text-base sm:leading-6 sm:min-h-18">{product.title}</h3>
      </Link>
      <div className="mt-4">
        <p className="text-[11px] leading-4 text-zinc-500">{channel === "wholesale" ? "Precio mayorista" : priceRange ? "Desde · en pesos" : "Precio en pesos"}</p>
        <p data-product-price className="mt-1 whitespace-nowrap text-[clamp(1rem,4.3vw,1.25rem)] font-semibold leading-7 tabular-nums text-zinc-950 sm:text-2xl">{formatCurrency(displayPrice)}</p>
        {channel === "wholesale" && <p className="mt-1 text-xs text-zinc-600">Mínimo {product.wholesaleMinQuantity || 1} unidades</p>}
        {channel === "retail" && <ElectronicsPrice product={product} />}
      </div>
      {product.hasVariants && <ProductVariantPreview slug={product.slug} variants={product.variants} />}
      <div className="mt-auto pt-4">
        <p className="mb-3 flex items-start gap-1.5 text-[10px] leading-4 text-zinc-600 sm:text-xs" title={shipping.shippingTimeDescription}>
          <span aria-hidden="true" className={`mt-1.5 size-1.5 shrink-0 rounded-full ${available ? "bg-sky-600" : "bg-zinc-400"}`} />
          <span>{shipping.isImmediate ? "Stock en Tandil" : available ? "Disponible · entrega a coordinar" : "Disponibilidad a confirmar"}</span>
        </p>
        {product.hasVariants ? <Link href={href} className="flex min-h-11 items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-xs font-semibold text-zinc-900 hover:border-sky-700 hover:bg-sky-50 sm:text-sm">
          <span>Elegir opciones</span><ArrowRight className="size-4 shrink-0" />
        </Link> : cartItem ? <div className="flex min-h-11 items-center justify-between rounded-xl border border-sky-200 bg-sky-50">
          <button type="button" aria-label="Restar unidad" className="grid size-11 shrink-0 place-items-center rounded-xl text-lg text-sky-900 hover:bg-sky-100"
            onClick={() => updateQuantity(product.id, channel, channel === "wholesale" && cartItem.quantity <= product.wholesaleMinQuantity ? 0 : cartItem.quantity - 1)}>−</button>
          <span aria-live="polite" className="text-sm font-semibold tabular-nums text-sky-950">{cartItem.quantity}</span>
          <button type="button" aria-label="Sumar unidad" disabled={cartItem.quantity >= purchasableQuantity(product)} className="grid size-11 shrink-0 place-items-center rounded-xl text-lg text-sky-900 hover:bg-sky-100 disabled:opacity-40"
            onClick={() => updateQuantity(product.id, channel, cartItem.quantity + 1)}>+</button>
        </div> : !available ? <Link href={href} className="flex min-h-11 items-center justify-center rounded-xl border border-zinc-200 px-2 py-2.5 text-center text-xs font-semibold text-zinc-800 hover:bg-zinc-50 sm:text-sm">Ver disponibilidad</Link> : <Button type="button" className="w-full gap-1.5 px-2 text-xs sm:text-sm"
          icon={justAdded ? <Check className="size-4 shrink-0" /> : <ShoppingBag className="size-4 shrink-0 stroke-[1.75]" />}
          onClick={() => { addToCart(product, channel, addQuantity); setJustAdded(true); setTimeout(() => setJustAdded(false), 1500); }}>
          <span aria-live="polite">{justAdded ? "Agregado" : "Agregar al carrito"}</span>
        </Button>}
      </div>
    </div>
  </article>;
}
