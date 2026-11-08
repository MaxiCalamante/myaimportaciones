"use client";

import {ProductPrice} from './currency-provider';
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, Heart, ShoppingBag } from "lucide-react";
import { MAX_ORDER_QUANTITY, isVerifiedStock, purchasableQuantity } from "@/lib/commerce-policy";
import { formatCurrency } from "@/lib/format";
import { getProductShippingTimeInfo } from "@/lib/shipping";
import type { Product, ProductChannel } from "@/lib/types";
import { productVariantHref } from "@/lib/variant-preview";
import { Button } from "@/components/ui/button";
import { useCommerce } from "./commerce-provider";
import { ElectronicsPrice } from "./electronics-price";
import { ProductVariantPreview } from "./product-variant-preview";
import { wholesaleDisplay } from "@/components/wholesale/public-price";

export function ProductCard({ product, channel = "retail", priority = false }: {
  product: Product;
  channel?: ProductChannel;
  priority?: boolean;
}) {
  const { cart, addToCart, updateQuantity, toggleFavorite, isFavorite } = useCommerce();
  const favorite = isFavorite(product.id);
  const wholesale=wholesaleDisplay(product);
  const price = channel === "wholesale" ? wholesale.price : product.retailPrice;
  const requestable=channel==='wholesale'&&wholesale.offer?.status!=='unavailable';
  const pending=channel==='wholesale'&&price===null;
  const maxQty=pending?MAX_ORDER_QUANTITY:purchasableQuantity(product);
  const displayPrice = channel === "retail" && product.hasVariants && product.minPrice ? product.minPrice : price;
  const priceRange = channel === "retail" && product.hasVariants && product.minPrice && product.maxPrice && product.minPrice < product.maxPrice;
  const addQuantity = 1;
  const [imageSrc, setImageSrc] = useState(product.imageUrl || "/placeholder-product.svg");
  const [justAdded, setJustAdded] = useState(false);
  const cartItem = cart.find(line => line.product.id === product.id && line.channel === channel && !line.variantId);
  const stockChoices = product.hasVariants ? (product.variants || []).filter(variant => variant.isActive) : [product];
  const ownStockChoices = stockChoices.filter(choice => choice.fulfillmentMode !== "supplier" && isVerifiedStock(choice));
  const supplierChoices = stockChoices.filter(choice => choice.fulfillmentMode === "supplier" && isVerifiedStock(choice));
  const available = ownStockChoices.length > 0 || supplierChoices.length > 0;
  const availabilityText = ownStockChoices.length > 0
    ? ownStockChoices.length === stockChoices.length ? "Stock en Tandil" : "Stock según opción"
    : supplierChoices.length > 0 ? "Disponible" : "Disponibilidad a confirmar";
  const shipping = getProductShippingTimeInfo(stockChoices.find(isVerifiedStock) || product);
  const baseHref = productVariantHref(product.slug);
  const href = channel === "wholesale" ? `${baseHref}${baseHref.includes("?") ? "&" : "?"}canal=mayorista` : baseHref;
  const badge = product.tags.includes("oferta") ? "Oferta" : product.featured ? "Destacado" : null;
  const actionClassName = "flex min-h-11 items-center justify-center gap-1.5 rounded-lg bg-sky-700 px-2 py-2 text-center text-xs font-semibold text-white transition-colors hover:bg-sky-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 sm:text-sm";

  return <article data-product-card className="group flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white transition-shadow hover:border-sky-200 hover:shadow-sm">
    <div className="relative">
      <Link href={href} aria-label={`Ver ${product.title}`} className="relative block aspect-square overflow-hidden bg-white">
        <Image fill src={imageSrc} alt={product.title} loading={priority ? "eager" : "lazy"}
          sizes="(min-width: 1280px) 286px, (min-width: 768px) 30vw, 46vw" quality={75}
          className="object-contain p-3 sm:p-5" onError={() => setImageSrc("/placeholder-product.svg")} />
        {badge && <span className="absolute left-2 top-2.5 max-w-[calc(100%-3.5rem)] truncate rounded-md bg-sky-50 px-2 py-1 text-[10px] font-semibold leading-3 text-sky-800">{badge}</span>}
      </Link>
      <button type="button" aria-label={favorite ? "Quitar de favoritos" : "Agregar a favoritos"} aria-pressed={favorite}
        className={`absolute right-0.5 top-0.5 grid size-11 place-items-center rounded-full bg-white/95 focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-sky-700 ${favorite ? "text-rose-600" : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950"}`}
        onClick={() => toggleFavorite(product.id)}><Heart className={`size-5 stroke-[1.5] ${favorite ? "fill-current" : ""}`} /></button>
    </div>
    <div className="flex min-w-0 flex-col px-2.5 pb-2.5 pt-1 sm:px-3 sm:pb-3">
      <p className="truncate text-[10px] font-medium leading-3 text-zinc-500 sm:text-[11px]" title={product.brand || product.categoryName}>{product.brand || product.categoryName}</p>
      <Link href={href} className="mt-1 block rounded-sm focus-visible:outline-2 focus-visible:outline-sky-700" title={product.title}>
        <h3 className="line-clamp-2 min-h-9 text-[13px] font-medium leading-[18px] text-zinc-900 group-hover:text-sky-900 sm:min-h-10 sm:text-sm sm:leading-5">{product.title}</h3>
      </Link>
      <div className="mt-1.5">
        <p data-product-price className="flex flex-wrap items-baseline gap-x-1 text-[clamp(0.9375rem,4.4vw,1.2rem)] font-bold leading-6 tracking-tight tabular-nums text-zinc-950 sm:text-xl">
          {(priceRange||(channel==='wholesale'&&wholesale.from)) && <span className="text-[10px] font-normal tracking-normal text-zinc-500">Desde</span>}<span className="whitespace-nowrap">{<ProductPrice product={product} channel={channel} ars={displayPrice}/>}</span>
        </p>
        {channel === "wholesale" && <p className="text-[10px] leading-4 text-zinc-600">{pending?'Solicitud sin cobro previo':'Por unidad · combinable con otros productos'}</p>}
        {channel==='wholesale'&&price!==null&&product.retailPrice>price&&!product.hasVariants&&<p className="text-[10px] leading-4 text-zinc-500">Minorista: <span className="line-through">{formatCurrency(product.retailPrice)}</span><span className="ml-1 font-semibold text-emerald-700">· Ahorro {Math.round((1 - price / product.retailPrice) * 100)}%</span></p>}
        {channel === "retail" && <ElectronicsPrice product={product} />}
      </div>
      <div className="mt-0.5 h-4 min-w-0">{product.hasVariants && <ProductVariantPreview slug={product.slug} variants={product.variants} />}</div>
      <div className="mt-1.5">
        <p className="mb-2 flex items-start gap-1 text-[10px] leading-4 text-zinc-600 sm:text-[11px]" title={availabilityText === "Stock según opción" ? "Disponibilidad y entrega según la opción elegida." : shipping.shippingTimeDescription}>
          <span aria-hidden="true" className={`mt-[5px] size-1.5 shrink-0 rounded-full ${available ? "bg-sky-600" : "bg-zinc-400"}`} />
          <span>{availabilityText}</span>
        </p>
        {product.hasVariants ? <Link href={href} className={actionClassName}>
          <span>Elegir opciones</span><ArrowRight className="size-3.5 shrink-0" />
        </Link> : cartItem ? <div className="flex min-h-11 items-center justify-between rounded-lg border border-sky-200 bg-sky-50">
          <button type="button" aria-label="Restar unidad" className="grid size-11 shrink-0 place-items-center rounded-lg text-lg text-sky-900 hover:bg-sky-100 focus-visible:outline-2 focus-visible:outline-sky-700"
            onClick={() => updateQuantity(product.id, channel, cartItem.quantity - 1)}>−</button>
          <span aria-live="polite" className="text-sm font-semibold tabular-nums text-sky-950">{cartItem.quantity}</span>
          <button type="button" aria-label="Sumar unidad" disabled={cartItem.quantity >= maxQty} className="grid size-11 shrink-0 place-items-center rounded-lg text-lg text-sky-900 hover:bg-sky-100 focus-visible:outline-2 focus-visible:outline-sky-700 disabled:opacity-40"
            onClick={() => updateQuantity(product.id, channel, cartItem.quantity + 1)}>+</button>
        </div> : !(pending&&requestable)&&(!available||(channel==='wholesale'&&wholesale.offer?.status==='unavailable')) ? <Link href={href} className={actionClassName}>Ver disponibilidad</Link> : <Button type="button" aria-label={justAdded ? "Agregado al carrito" : pending?"Solicitar confirmación":"Agregar al carrito"} className="w-full gap-1.5 rounded-lg px-2 py-2 text-xs sm:text-sm"
          icon={justAdded ? <Check className="size-3.5 shrink-0" /> : <ShoppingBag className="size-3.5 shrink-0 stroke-[1.75]" />}
          onClick={() => { addToCart(product, channel, addQuantity); setJustAdded(true); setTimeout(() => setJustAdded(false), 1500); }}>
          <span aria-live="polite">{justAdded ? "Agregado" : pending?"Solicitar confirmación":"Agregar"}</span>
        </Button>}
      </div>
    </div>
  </article>;
}
