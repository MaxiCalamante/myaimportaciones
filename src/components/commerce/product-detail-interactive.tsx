"use client";
import { WHOLESALE_ENABLED, isVerifiedStock, purchasableQuantity } from "@/lib/commerce-policy";

import React, { useState, useMemo } from "react";
import {
  Heart,
  MessageCircle,
  ShoppingCart,
  Truck,
  Share2,
  Copy,
  Check,
  ReceiptText,
  Zap,
  Clock,
  CreditCard,
} from "lucide-react";
import { formatCurrency, formatPaymentMethod } from "@/lib/format";
import { ElectronicsPrice } from "./electronics-price";
import { useCommerce } from "@/components/commerce/commerce-provider";
import {
  calculateShipping,
  isProductImmediateStock,
  getProductShippingTimeInfo,
} from "@/lib/shipping";
import { siteConfig } from "@/lib/site";
import type { Product, ProductVariant } from "@/lib/types";
import { trackAdsEvent } from "@/lib/analytics";
import { TrustGuaranteeBadges } from "@/components/commerce/trust-guarantee-badges";
import { StickyMobileBuyBar } from "./sticky-mobile-buy-bar";

export function ProductDetailInteractive({
  product,
  onVariantChange,
}: {
  product: Product;
  onVariantChange?: (variant: ProductVariant | null) => void;
}) {
  const {
    addToCart,
    toggleFavorite,
    isFavorite,
    cartCount,
    setCartOpen,
    postalCode,
    setPostalCode,
    province,
    city,
    address,
    selectedShippingOptionId,
    setSelectedShippingOptionId,
    openWhatsApp,
  } = useCommerce();
  const [quantity, setQuantity] = useState(1);
  const [channel, setChannel] = useState<"retail" | "wholesale">(
    product.wholesaleOnly ? "wholesale" : "retail"
  );
  const [added, setAdded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const [isStickyVisible, setIsStickyVisible] = useState(false);
  const mainCtaRef = React.useRef<HTMLDivElement>(null);

  const favorite = isFavorite(product.id);

  const dimensions = useMemo(() => product.optionsConfig || [], [product.optionsConfig]);
  const activeVariants = useMemo(() => product.variants?.filter((v) => v.isActive) || [], [product.variants]);
  const isVariantMode = Boolean(product.hasVariants && dimensions.length > 0);

  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(() => {
    if (activeVariants.length === 1) {
      return { ...activeVariants[0].options };
    }
    return {};
  });

  const allDimensionsSelected = dimensions.length > 0 && dimensions.every((dim) => Boolean(selectedOptions[dim.name]));

  const matchedVariant = useMemo(() => {
    if (!isVariantMode || !allDimensionsSelected) return null;
    return (
      activeVariants.find((v) =>
        dimensions.every((dim) => v.options[dim.name] === selectedOptions[dim.name])
      ) || null
    );
  }, [isVariantMode, allDimensionsSelected, activeVariants, dimensions, selectedOptions]);

  React.useEffect(() => {
    onVariantChange?.(matchedVariant);
  }, [matchedVariant, onVariantChange]);

  const price = matchedVariant
    ? (channel === "wholesale" ? (matchedVariant.wholesalePrice ?? matchedVariant.retailPrice) : matchedVariant.retailPrice)
    : (isVariantMode && product.minPrice ? product.minPrice : (channel === "wholesale" ? product.wholesalePrice : product.retailPrice));

  const hasPriceRange = isVariantMode && !matchedVariant && product.minPrice && product.maxPrice && product.minPrice < product.maxPrice;

  const targetItem = matchedVariant || product;
  const inStock = isVariantMode
    ? (allDimensionsSelected ? Boolean(matchedVariant && isVerifiedStock(matchedVariant)) : Boolean(product.stock > 0 && isVerifiedStock(product)))
    : isVerifiedStock(product);

  React.useEffect(() => {
    trackAdsEvent("ViewContent", {
      content_name: matchedVariant ? `${product.title} (${matchedVariant.title})` : product.title,
      content_ids: [matchedVariant ? `${product.id}:${matchedVariant.id}` : product.id],
      value: price,
    });
  }, [product.id, product.title, matchedVariant, price]);

  React.useEffect(() => {
    if (!mainCtaRef.current || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsStickyVisible(!entry.isIntersecting && entry.boundingClientRect.top < 0);
      },
      { threshold: 0 }
    );
    observer.observe(mainCtaRef.current);
    return () => observer.disconnect();
  }, []);

  const transferPrice = channel === "retail" && price > 0 ? Math.round(price * 0.97) : price;
  const transferSavings = price - transferPrice;

  const isImmediate = useMemo(() => {
    if (matchedVariant) {
      return matchedVariant.fulfillmentMode === "own_stock" && Boolean(matchedVariant.stockVerifiedAt) && matchedVariant.stock > 0;
    }
    return isProductImmediateStock(product);
  }, [matchedVariant, product]);

  const shippingTimeInfo = useMemo(() => getProductShippingTimeInfo(targetItem), [targetItem]);

  const shippingCalculation = useMemo(() => {
    return calculateShipping(
      postalCode,
      price * quantity,
      isImmediate,
      targetItem.fulfillmentMode === "supplier",
      province,
      city,
      address
    );
  }, [postalCode, price, quantity, isImmediate, targetItem.fulfillmentMode, province, city, address]);

  const discount = useMemo(() => {
    if (product.retailPrice <= 0 || product.wholesalePrice <= 0) return 0;
    return Math.round(
      ((product.retailPrice - product.wholesalePrice) / product.retailPrice) * 100
    );
  }, [product]);

  const getCtaState = () => {
    if (!isVariantMode) {
      if (!isVerifiedStock(product)) return { text: "Disponibilidad a confirmar", disabled: true };
      return { text: added ? "¡Agregado al carrito!" : "Agregar al carrito", disabled: false };
    }
    if (!allDimensionsSelected) {
      const firstMissing = dimensions.find((d) => !selectedOptions[d.name]);
      return { text: `Elegí tu ${firstMissing?.name || "opción"}`, disabled: true };
    }
    if (!matchedVariant) {
      return { text: "Combinación no disponible", disabled: true };
    }
    if (!isVerifiedStock(matchedVariant)) {
      return { text: "Opción agotada", disabled: true };
    }
    return { text: added ? "¡Agregado al carrito!" : "Agregar al carrito", disabled: false };
  };

  const ctaState = getCtaState();

  const handleAddToCart = () => {
    if (isVariantMode && (!allDimensionsSelected || !matchedVariant)) return;
    addToCart(product, channel, quantity, matchedVariant);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
    setCartOpen(true);
  };

  const handleIncrement = () => {
    const max = purchasableQuantity(matchedVariant || product);
    setQuantity((q) => Math.max(1, Math.min(q + 1, max)));
  };

  const handleDecrement = () => {
    const min = channel === "wholesale" ? product.wholesaleMinQuantity : 1;
    setQuantity((q) => Math.max(min, q - 1));
  };

  const handleCopyLink = async () => {
    setCopyError(false);
    try {
      await navigator.clipboard.writeText(`${siteConfig.appUrl}/producto/${product.slug}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyError(true);
    }
  };

  const whatsappMessage = matchedVariant
    ? `Hola MYA Importaciones! Me interesa el producto "${product.title}" (${matchedVariant.title}) (${channel === "wholesale" ? "precio mayorista" : "precio minorista"}). ¿Tienen disponibilidad para envío?`
    : `Hola MYA Importaciones! Me interesa el producto "${product.title}" (${channel === "wholesale" ? "precio mayorista" : "precio minorista"}). ¿Tienen disponibilidad para envío?`;

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      {/* Channel Switcher */}
      {WHOLESALE_ENABLED && <div className="flex rounded-xl bg-zinc-100 p-1 border border-zinc-200">
        <button
          type="button"
          disabled={product.wholesaleOnly}
          onClick={() => { setChannel("retail"); setQuantity(1); }}
          className={`flex-1 rounded-lg py-2 text-xs sm:text-sm font-semibold transition cursor-pointer ${
            channel === "retail"
              ? "bg-white text-zinc-950 shadow-xs"
              : "text-zinc-500 hover:text-zinc-800 disabled:opacity-40"
          }`}
        >
          Compra Minorista
        </button>
        <button
          type="button"
          onClick={() => { setChannel("wholesale"); setQuantity(product.wholesaleMinQuantity); }}
          className={`flex-1 rounded-lg py-2 text-xs sm:text-sm font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 ${
            channel === "wholesale"
              ? "bg-amber-400 text-zinc-950 shadow-xs"
              : "text-zinc-500 hover:text-zinc-800"
          }`}
        >
          Compra Mayorista
          {discount > 0 && (
            <span className="rounded-full bg-red-600 px-1.5 py-0.2 text-[10px] text-white font-bold">
              -{discount}%
            </span>
          )}
        </button>
      </div>

      }
      {/* Price Section */}
      <div className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4 sm:p-5 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase text-zinc-500 tracking-wider">
              {channel === "wholesale" ? "Precio por bulto cerrado" : "Precio en pesos"}
            </p>
            <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-3xl sm:text-4xl font-black text-zinc-950 tracking-tight">
                {hasPriceRange ? (
                  <>
                    <span className="text-base sm:text-lg font-semibold text-zinc-500 mr-1.5 font-sans">Desde</span>
                    {formatCurrency(price)}
                  </>
                ) : (
                  formatCurrency(price)
                )}
              </span>
              {channel === "wholesale" && product.retailPrice > product.wholesalePrice && (
                <span className="text-sm font-semibold text-zinc-400 line-through">
                  {formatCurrency(product.retailPrice)}
                </span>
              )}
            </div>
            {channel === "retail" && price > 0 && (
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-100/90 px-2.5 py-1 text-xs font-black text-emerald-900 border border-emerald-300 shadow-2xs">
                  <span>{formatCurrency(transferPrice)}</span>
                  <span className="text-[10px] font-bold text-emerald-700">con Transferencia (-3% OFF)</span>
                </div>
                <span className="text-[11px] font-medium text-zinc-500">Ahorrás {formatCurrency(transferSavings)}</span>
              </div>
            )}
            {channel === "retail" && <ElectronicsPrice product={product} detail />}
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:max-w-[12rem] sm:justify-end sm:text-right">
            {matchedVariant?.sku && (
              <span className="w-full text-right text-[11px] font-medium text-zinc-500">
                SKU: <span className="font-mono font-bold text-zinc-800">{matchedVariant.sku}</span>
              </span>
            )}
            {targetItem.stock > 0 && targetItem.stock <= 3 && isVerifiedStock(targetItem) && (
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 text-amber-900 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide border border-amber-300">
                <Zap className="h-3 w-3 text-amber-600 shrink-0" />
                ¡Últimas {targetItem.stock} {targetItem.stock === 1 ? "unidad" : "unidades"}!
              </span>
            )}
            <span className={`inline-flex items-center gap-1 text-xs font-bold ${
              inStock ? "text-emerald-700" : "text-amber-600"
            }`}>
              <span className={`h-2 w-2 shrink-0 rounded-full ${
                inStock ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
              }`} />
              {inStock ? "Disponible" : "Consultar disponibilidad"}
            </span>
            <span
              className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md border ${shippingTimeInfo.badgeClass}`}
              title={shippingTimeInfo.shippingTimeDescription}
            >
              {isImmediate
                ? "Stock en Tandil"
                : inStock
                ? "Envío Correo Argentino"
                : "Disponibilidad a confirmar"}
            </span>
            {channel === "wholesale" && (
              <p className="text-[11px] font-semibold text-amber-700 mt-1">
                Mínimo: {product.wholesaleMinQuantity} unidades
              </p>
            )}
          </div>
        </div>

        {/* Dimension & Options Selector */}
        {isVariantMode && (
          <div className="space-y-4 rounded-2xl border border-zinc-200/90 bg-white p-4 sm:p-5 shadow-xs">
            {dimensions.map((dim) => {
              const currentVal = selectedOptions[dim.name];
              return (
                <div key={dim.name} className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-md">
                        {dim.name}
                      </span>
                      {currentVal ? (
                        <span className="text-xs sm:text-sm font-bold text-zinc-900 flex items-center gap-1.5">
                          {currentVal}
                          <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-sky-700 animate-pulse">
                          Seleccioná una opción
                        </span>
                      )}
                    </div>
                    {matchedVariant && dimensions.length === 1 && (
                      <span className="text-[11px] font-mono text-zinc-500">
                        {matchedVariant.stock > 0 ? (
                          matchedVariant.stock <= 3 ? (
                            <span className="text-amber-700 font-bold">¡Últimas {matchedVariant.stock} un.!</span>
                          ) : (
                            <span className="text-emerald-700 font-semibold">{matchedVariant.stock} disponibles</span>
                          )
                        ) : (
                          <span className="text-zinc-400">Agotado</span>
                        )}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    {dim.values.map((val) => {
                      const isSelected = currentVal === val;
                      const matchingVariants = activeVariants.filter((v) => v.options[dim.name] === val);
                      const exists = matchingVariants.length > 0;
                      const hasStock = matchingVariants.some((v) => isVerifiedStock(v));
                      const variantForVal = dimensions.length === 1 ? matchingVariants[0] : null;
                      const hasCustomPrice = Boolean(variantForVal && variantForVal.retailPrice > 0 && hasPriceRange);

                      return (
                        <button
                          key={val}
                          type="button"
                          onClick={() => {
                            setSelectedOptions((prev) => ({
                              ...prev,
                              [dim.name]: val,
                            }));
                          }}
                          className={`group relative flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-semibold transition-all cursor-pointer ${
                            isSelected
                              ? "border-sky-700 bg-sky-50 text-sky-950 ring-2 ring-sky-600/25 shadow-xs font-bold"
                              : !hasStock
                              ? "border-zinc-200/80 bg-zinc-50/80 text-zinc-400 opacity-60 hover:opacity-80"
                              : "border-zinc-200 bg-white text-zinc-800 hover:border-zinc-300 hover:bg-zinc-50/80 hover:shadow-2xs"
                          }`}
                        >
                          {isSelected && (
                            <span className="flex size-4 items-center justify-center rounded-full bg-sky-700 text-white shrink-0">
                              <Check className="h-2.5 w-2.5 stroke-[3]" />
                            </span>
                          )}
                          <span>{val}</span>
                          {hasCustomPrice && variantForVal && (
                            <span className={`text-[11px] font-mono font-bold ${isSelected ? "text-sky-800" : "text-zinc-500"}`}>
                              {formatCurrency(variantForVal.retailPrice)}
                            </span>
                          )}
                          {!hasStock && exists && (
                            <span className="rounded bg-zinc-200/80 px-1.5 py-0.5 text-[9px] font-bold text-zinc-500 uppercase tracking-tight">
                              Agotado
                            </span>
                          )}
                          {hasStock && variantForVal && variantForVal.stock > 0 && variantForVal.stock <= 3 && !isSelected && (
                            <span className="rounded bg-amber-100 px-1.5 py-0.2 text-[9px] font-extrabold text-amber-800">
                              ¡Últimas {variantForVal.stock}!
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Selected Variant Confirmation Card */}
        {isVariantMode && matchedVariant && (
          <div className="flex items-center justify-between rounded-xl border border-sky-200/90 bg-gradient-to-r from-sky-50/70 via-white to-sky-50/30 p-3 sm:p-3.5 shadow-2xs">
            <div className="flex items-center gap-3 min-w-0">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-sky-700 text-white font-bold shadow-2xs">
                <Check className="size-4 stroke-[2.5]" />
              </span>
              <div className="min-w-0">
                <p className="font-bold text-zinc-950 text-xs sm:text-sm truncate">
                  {matchedVariant.title}
                </p>
                <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                  {matchedVariant.sku && (
                    <span>SKU: <span className="font-mono text-zinc-700 font-bold">{matchedVariant.sku}</span></span>
                  )}
                  {matchedVariant.sku && <span>•</span>}
                  <span className={matchedVariant.stock > 0 ? "text-emerald-700 font-bold" : "text-zinc-500"}>
                    {matchedVariant.stock > 0 ? `${matchedVariant.stock} disponibles` : "Sin stock inmediato"}
                  </span>
                </div>
              </div>
            </div>
            <div className="text-right shrink-0 pl-2">
              <span className="text-sm sm:text-base font-black text-zinc-950 font-mono">
                {formatCurrency(matchedVariant.retailPrice)}
              </span>
            </div>
          </div>
        )}

        {channel === "retail" && (
          <div className="rounded-xl bg-gradient-to-r from-emerald-50/90 to-sky-50/70 border border-emerald-200/70 p-3 space-y-1.5 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-1 text-emerald-950 font-bold">
              <span className="flex items-center gap-1.5">
                <CreditCard className="h-4 w-4 text-emerald-700" />
                Cuotas según tu medio de pago
              </span>
              <span className="text-[10px] font-extrabold uppercase tracking-wide bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">
                Todas las tarjetas
              </span>
            </div>
            <p className="text-zinc-600 text-[11px] leading-relaxed">
              Aboná con tarjeta de crédito, débito o saldo en cuenta. También podés elegir transferencia bancaria. Si tu pedido tiene una promoción disponible, la verás en el resumen antes de confirmar.
            </p>
          </div>
        )}

        {/* Wholesale Reseller Profit Demonstration */}
        {channel === "wholesale" && product.retailPrice > product.wholesalePrice && (
          <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 text-xs space-y-1.5">
            <div className="flex items-center justify-between font-bold text-amber-950">
              <span>PVP Sugerido de Reventa al Público:</span>
              <span className="font-black text-sm">{formatCurrency(product.retailPrice)}</span>
            </div>
            <div className="flex items-center justify-between text-emerald-800 font-extrabold text-[11px] pt-1 border-t border-amber-200/60">
              <span>Diferencia bruta antes de gastos:</span>
              <span className="bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-md">
                +{formatCurrency(product.retailPrice - product.wholesalePrice)} / un. ({Math.round(((product.retailPrice - product.wholesalePrice) / product.retailPrice) * 100)}% de margen)
              </span>
            </div>
          </div>
        )}

        {/* Quantity and Actions */}
        <div ref={mainCtaRef} className="space-y-3">
          <div className="grid grid-cols-[minmax(0,1fr)_3rem] items-center gap-3 pt-2 sm:grid-cols-[auto_minmax(0,1fr)_3rem]">
            <div className="col-span-2 flex items-center justify-between sm:col-span-1 sm:block">
              <span className="text-xs font-semibold text-zinc-600 sm:hidden">Cantidad</span>
            <div className="flex h-12 shrink-0 items-center rounded-xl border border-zinc-300 bg-white">
              <button
                onClick={handleDecrement}
                className="h-full min-w-11 px-3 text-lg font-bold text-zinc-600 hover:text-zinc-950 transition cursor-pointer disabled:cursor-default disabled:opacity-40"
                type="button"
                aria-label="Reducir cantidad"
                disabled={quantity <= (channel === "wholesale" ? product.wholesaleMinQuantity : 1)}
              >
                -
              </button>
              <span aria-live="polite" aria-atomic="true" className="w-9 text-center text-sm font-bold text-zinc-900">
                {quantity}
              </span>
              <button
                onClick={handleIncrement}
                className="h-full min-w-11 px-3 text-lg font-bold text-zinc-600 hover:text-zinc-950 transition cursor-pointer disabled:cursor-default disabled:opacity-40"
                type="button"
                aria-label="Aumentar cantidad"
                disabled={quantity >= purchasableQuantity(targetItem)}
              >
                +
              </button>
            </div>
            </div>

            <button
              onClick={handleAddToCart}
              disabled={ctaState.disabled}
              className="inline-flex min-h-12 min-w-0 items-center justify-center gap-2 rounded-xl bg-sky-700 px-3 py-3 text-sm font-bold leading-snug text-white hover:bg-sky-800 active:scale-[0.99] transition cursor-pointer shadow-sm disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
              type="button"
            >
              <ShoppingCart className="h-4 w-4 shrink-0" />
              {ctaState.text}
            </button>

            <button
              onClick={() => toggleFavorite(product.id)}
              className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border transition cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 ${
                favorite
                  ? "bg-red-50 border-red-200 text-red-600"
                  : "bg-white border-zinc-300 text-zinc-600 hover:text-zinc-950"
              }`}
              type="button"
              aria-label={favorite ? "Quitar de favoritos" : "Agregar a favoritos"}
              aria-pressed={favorite}
              title={favorite ? "Quitar de favoritos" : "Agregar a favoritos"}
            >
              <Heart className={`h-5 w-5 ${favorite ? "fill-current" : ""}`} />
            </button>
          </div>

          {/* WhatsApp Direct Order Button */}
          <div>
            <button
              type="button"
              onClick={() => openWhatsApp(whatsappMessage)}
              className="w-full inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 px-3 py-2.5 text-white text-xs sm:text-sm font-bold transition shadow-sm cursor-pointer"
            >
              <MessageCircle className="h-4 w-4" />
              Consultar o Pedir por WhatsApp
            </button>
          </div>
        </div>

        {/* Share & Copy Link */}
        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-zinc-200/60">
          <button
            type="button"
            onClick={handleCopyLink}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 transition cursor-pointer"
            aria-live="polite"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-zinc-400" />}
            {copied ? "¡Copiado!" : "Copiar enlace"}
          </button>
          <a
            href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Mirá este producto en MYA Importaciones: ${product.title} - ${siteConfig.appUrl}/producto/${product.slug}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition cursor-pointer"
          >
            <Share2 className="h-3.5 w-3.5 text-emerald-600" />
            Compartir por WhatsApp
          </a>
        </div>
        {copyError && <p role="status" className="mt-2 text-xs leading-5 text-zinc-600">No pudimos copiar el enlace. Podés copiar la dirección del navegador o compartir por WhatsApp.</p>}
      </div>

      {/* Shipping Cost Simulator */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 space-y-3 text-xs shadow-xs">
        {/* Delivery Time Info Alert */}
        <div
          className={`flex items-start gap-2.5 p-3 rounded-xl border ${
            isImmediate
              ? "bg-emerald-50/90 border-emerald-200 text-emerald-950"
              : "bg-sky-50/90 border-sky-200 text-sky-950"
          }`}
        >
          {isImmediate ? (
            <Zap className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <Clock className="h-4 w-4 text-sky-600 shrink-0 mt-0.5" />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-xs">{shippingTimeInfo.deliveryText}</span>
              <span
                className={`text-[10px] px-2 py-0.2 rounded-full font-extrabold uppercase tracking-wide border ${
                  isImmediate
                    ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                    : "bg-sky-100 text-sky-800 border-sky-300"
                }`}
              >
                {shippingTimeInfo.badgeText}
              </span>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed opacity-90">
              {shippingTimeInfo.shippingTimeDescription}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <span className="font-bold text-zinc-900 flex items-center gap-1.5">
            <Truck className="h-4 w-4 text-sky-600" />
            Calcular costo de envío:
          </span>
          <span className="text-[10px] text-zinc-600">Envíos a todo el país</span>
        </div>

        <div className="relative">
          <input
            type="text"
            placeholder="Ingresá tu Código Postal (ej: 7000, 1425 o B1640)"
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
            aria-label="Código postal para calcular el envío"
            className="h-11 w-full rounded-xl border border-zinc-300 px-3 pr-8 text-base sm:text-xs bg-white outline-none focus:border-sky-500 text-zinc-950 placeholder:text-zinc-400 font-medium"
          />
          {postalCode && (
            <button
              type="button"
              onClick={() => setPostalCode("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer"
            >
              ×
            </button>
          )}
        </div>

        {shippingCalculation.isValid && (
          <div className="space-y-2 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-1.5">
              <span className="text-[11px] font-bold text-zinc-700">
                📍 {shippingCalculation.locationName}
              </span>
              {shippingCalculation.freeShippingQualified && (
                <span className="rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800">
                  ¡Envío Gratis! 🎉
                </span>
              )}
            </div>

            <div className="space-y-1.5">
              {shippingCalculation.options.map((opt) => {
                const isSelected = selectedShippingOptionId === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSelectedShippingOptionId(opt.id)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition cursor-pointer ${
                      isSelected
                        ? "border-sky-500 bg-sky-50/60 ring-1 ring-sky-500/30"
                        : "border-zinc-200 bg-zinc-50/50 hover:bg-zinc-100/70"
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-zinc-900 truncate">{opt.name}</span>
                        {opt.badge && (
                          <span
                            className={`rounded-full px-1.5 py-0.2 text-[9px] font-bold ${
                              opt.isFree
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {opt.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-500">{opt.carrier} • {opt.estimatedDays}</p>
                    </div>

                    <div className="text-right flex-shrink-0">
                      {opt.isFree ? (
                        <div className="flex flex-col items-end">
                          {opt.originalPrice > 0 && (
                            <span className="text-[10px] line-through text-zinc-400">
                              {formatCurrency(opt.originalPrice)}
                            </span>
                          )}
                          <span className="font-black text-emerald-700">GRATIS</span>
                        </div>
                      ) : (
                        <span className="font-black text-zinc-900">{opt.requiresQuote ? "A cotizar" : formatCurrency(opt.price)}</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Payment methods & Invoicing perks */}
      <div className="rounded-2xl border border-zinc-200 p-4 space-y-3 text-xs text-zinc-600 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 font-semibold text-zinc-800">
          <div className="flex items-center gap-2">
            <ReceiptText className="h-4 w-4 text-zinc-500" />
            <span>Consultá el comprobante disponible para tu compra</span>
          </div>
          <span className="text-[11px] text-zinc-600 font-medium">IVA incluido</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-zinc-100">
          <span className="font-semibold text-zinc-500">Medios aceptados:</span>
          {product.paymentMethods.map((m) => (
            <span key={m} className="rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-bold text-zinc-700 uppercase">
              {formatPaymentMethod(m)}
            </span>
          ))}
          {!product.paymentMethods.includes("mercado_pago") && <span className="rounded-md bg-sky-50 text-sky-800 px-2 py-0.5 text-[10px] font-bold uppercase border border-sky-100">
            Mercado Pago
          </span>}
        </div>
      </div>

      {/* Trust & Guarantee Badges */}
      <TrustGuaranteeBadges variant="compact" />

      {/* Quick Buyer Confidence FAQ */}
      <div className="rounded-2xl border border-zinc-200/90 bg-white p-4 space-y-3 text-xs shadow-xs">
        <p className="font-bold text-zinc-900 uppercase tracking-wider text-[11px]">
          Preguntas frecuentes sobre tu compra
        </p>
        <div className="divide-y divide-zinc-100">
          <details className="group py-2.5" open>
            <summary className="flex cursor-pointer list-none items-center justify-between font-semibold text-zinc-800 hover:text-sky-700">
              <span>¿Cómo se realiza el envío y cuánto tarda?</span>
              <span className="text-zinc-400 group-open:rotate-180 transition">▼</span>
            </summary>
            <p className="mt-1.5 text-zinc-600 leading-relaxed pl-1 border-l-2 border-sky-300">
              Despachamos desde Tandil hacia toda la Argentina mediante Correo Argentino (a domicilio o sucursal). Te enviamos el código de seguimiento apenas el paquete ingresa al correo para que sigas el trayecto en tiempo real.
            </p>
          </details>

          <details className="group py-2.5">
            <summary className="flex cursor-pointer list-none items-center justify-between font-semibold text-zinc-800 hover:text-sky-700">
              <span>¿Cuál es la condición y presentación del producto?</span>
              <span className="text-zinc-400 group-open:rotate-180 transition">▼</span>
            </summary>
            <p className="mt-1.5 text-zinc-600 leading-relaxed pl-1 border-l-2 border-sky-300">
              Revisá la condición, el modelo y la presentación informados en esta ficha. Si necesitás confirmar un detalle o la garantía aplicable, consultanos antes de comprar.
            </p>
          </details>

          <details className="group py-2.5">
            <summary className="flex cursor-pointer list-none items-center justify-between font-semibold text-zinc-800 hover:text-sky-700">
              <span>¿Cómo aprovecho el 3% de descuento por transferencia?</span>
              <span className="text-zinc-400 group-open:rotate-180 transition">▼</span>
            </summary>
            <p className="mt-1.5 text-zinc-600 leading-relaxed pl-1 border-l-2 border-sky-300">
              Al finalizar tu compra en el checkout o al coordinar por WhatsApp, elegí la opción de Transferencia Bancaria y el descuento se aplica automáticamente sobre tu total.
            </p>
          </details>
        </div>
      </div>

      {/* Modern Sticky Mobile Buy Bar */}
      <StickyMobileBuyBar
        product={product}
        price={price}
        transferPrice={transferPrice}
        added={added}
        onAddToCart={handleAddToCart}
        onOpenWhatsApp={() => openWhatsApp(whatsappMessage)}
        cartCount={cartCount}
        onOpenCart={() => setCartOpen(true)}
        visible={isStickyVisible}
        disabled={ctaState.disabled}
        buttonText={ctaState.text}
        imageUrl={matchedVariant?.imageUrl || undefined}
        variantTitle={matchedVariant?.title || undefined}
      />
    </div>
  );
}
