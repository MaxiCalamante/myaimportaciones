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
  ChevronDown,
  ShieldCheck,
  Wrench,
  Sparkles,
  Gem,
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
import { QuantityStepper } from "./quantity-stepper";
import { getColorSwatch } from "@/lib/variant-swatches";

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
    if (activeVariants.length > 0) {
      const firstAvailable = activeVariants.find((v) => isVerifiedStock(v)) || activeVariants[0];
      return { ...firstAvailable.options };
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
      <div data-product-purchase className="space-y-5 rounded-2xl border border-zinc-200 bg-white p-4 sm:p-6">
        <div className="min-w-0">
          <p className="text-xs font-medium text-zinc-500">{channel === "wholesale" ? "Precio por bulto cerrado" : "Precio por unidad"}</p>
          <p className="mt-1 break-words text-[clamp(1.75rem,7vw,2.5rem)] font-bold leading-tight tracking-tight tabular-nums text-zinc-950">
            {hasPriceRange && <span className="mr-2 text-sm font-medium text-zinc-500">Desde</span>}{formatCurrency(price)}
          </p>
          {channel === "retail" && price > 0 && <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm text-emerald-800">
            <strong className="font-semibold tabular-nums">{formatCurrency(transferPrice)}</strong><span>por transferencia</span>
            <span className="text-xs text-zinc-500">Ahorrás {formatCurrency(transferSavings)} · 3%</span>
          </div>}
          {channel === "retail" && <ElectronicsPrice product={{ ...product, retailPrice: price }} detail />}
          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
            <span className={`inline-flex items-center gap-1.5 font-medium ${inStock ? "text-emerald-800" : "text-amber-800"}`}><span className={`size-1.5 shrink-0 rounded-full ${inStock ? "bg-emerald-600" : "bg-amber-500"}`}/>{inStock ? "Disponible" : "Disponibilidad a confirmar"}</span>
            <span className="text-zinc-500">{isImmediate ? "Stock en Tandil" : shippingTimeInfo.deliveryText}</span>
            {inStock && isImmediate && targetItem.stock > 0 && targetItem.stock <= 3 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-300 px-2.5 py-0.5 text-xs font-bold text-amber-900 shadow-2xs">
                <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
                {targetItem.stock === 1 ? "¡Última unidad disponible!" : `¡Últimas ${targetItem.stock} unidades en stock!`}
              </span>
            )}
          </div>
          {channel === "wholesale" && <p className="mt-2 text-xs text-zinc-500">Mínimo {product.wholesaleMinQuantity} unidades</p>}
        </div>

        {/* Dimension & Options Selector */}
        {isVariantMode && (
          <div id="variant-options-section" className="min-w-0 space-y-5 border-t border-zinc-100 pt-5 scroll-mt-24">
            {dimensions.map((dim) => {
              const currentVal = selectedOptions[dim.name];
              return (
                <div key={dim.name} className="space-y-2.5">
                  <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-md">
                        {dim.name}
                      </span>
                      {currentVal ? (
                        <span className="text-xs sm:text-sm font-bold text-zinc-900 flex items-center gap-1.5">
                          {currentVal}
                          <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-zinc-500">
                          Seleccioná una opción
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    {dim.values.map((val) => {
                      const isSelected = currentVal === val;
                      const matchingVariants = activeVariants.filter((v) => v.options[dim.name] === val);
                      const exists = matchingVariants.length > 0;
                      const hasStock = matchingVariants.some((v) => isVerifiedStock(v));
                      const variantForVal = dimensions.length === 1 ? matchingVariants[0] : null;
                      const hasCustomPrice = Boolean(variantForVal && variantForVal.retailPrice > 0 && hasPriceRange);
                      const isColorDim = dim.name.toLowerCase().includes("color");
                      const swatch = isColorDim ? getColorSwatch(val) : null;

                      return (
                        <button
                          key={val}
                          type="button"
                          onClick={() => {
                            const next = { ...selectedOptions, [dim.name]: val };
                            setSelectedOptions(next);
                            const nextVariant = activeVariants.find(v => dimensions.every(d => v.options[d.name] === next[d.name]));
                            setQuantity(q => Math.max(1, Math.min(q, purchasableQuantity(nextVariant || product))));
                          }}
                          aria-pressed={isSelected}
                          className={`group relative flex min-h-11 max-w-full flex-wrap items-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-semibold transition-all cursor-pointer active:scale-98 ${
                            isSelected
                              ? "border-sky-700 bg-sky-50 text-sky-950 ring-2 ring-sky-600/25 shadow-xs font-bold"
                              : !hasStock
                              ? "border-zinc-200/80 bg-zinc-50/80 text-zinc-400 opacity-60 hover:opacity-80"
                              : "border-zinc-200 bg-white text-zinc-800 hover:border-zinc-300 hover:bg-zinc-50/80 hover:shadow-2xs"
                          }`}
                        >
                          {swatch && (
                            <span
                              className={`size-3.5 rounded-full border shadow-2xs shrink-0 transition-transform ${
                                isSelected ? "ring-2 ring-sky-600 ring-offset-1 scale-110" : "group-hover:scale-110"
                              }`}
                              style={{
                                backgroundColor: swatch.bg,
                                borderColor: swatch.border || "rgba(0,0,0,0.18)",
                              }}
                            />
                          )}
                          {isSelected && !swatch && (
                            <span className="flex size-4 items-center justify-center rounded-full bg-sky-700 text-white shrink-0">
                              <Check className="h-2.5 w-2.5 stroke-[3]" />
                            </span>
                          )}
                          <span className="min-w-0 break-words">{val}</span>
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
                          {hasStock && variantForVal && isProductImmediateStock(variantForVal) && variantForVal.stock > 0 && variantForVal.stock <= 3 && !isSelected && (
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

        {isVariantMode && matchedVariant && <div className="flex min-w-0 items-start gap-2 text-xs text-zinc-600">
          <Check className="mt-0.5 size-4 shrink-0 text-sky-700"/>
          <p className="min-w-0 break-words"><span className="font-medium text-zinc-900">{matchedVariant.title}</span>{matchedVariant.sku && <span className="mt-1 block text-[11px] text-zinc-500">Código: {matchedVariant.sku}</span>}</p>
        </div>}

        {channel === "retail" && <details className="border-t border-zinc-100 pt-3 text-xs text-zinc-600">
          <summary className="flex min-h-11 cursor-pointer items-center gap-2 font-medium text-zinc-800"><CreditCard className="size-4 shrink-0 text-sky-700"/>Medios de pago y cuotas<ChevronDown className="ml-auto size-4 shrink-0 text-zinc-400"/></summary>
          <p className="pb-2 leading-6">Tarjeta de crédito, débito, saldo en cuenta o transferencia. Las cuotas y promociones disponibles se informan antes de confirmar tu compra.</p>
        </details>}

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

        <div ref={mainCtaRef} data-product-actions className="space-y-3 border-t border-zinc-100 pt-4">
          <div className="flex min-w-0 items-center justify-between gap-3 pb-1">
            <span className="text-sm font-medium text-zinc-800">Cantidad</span>
            <QuantityStepper quantity={quantity} min={channel === "wholesale" ? product.wholesaleMinQuantity : 1} max={purchasableQuantity(targetItem)} onChange={setQuantity}/>
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_3rem] gap-2">
            <button type="button" onClick={handleAddToCart} disabled={ctaState.disabled} className="inline-flex min-h-12 min-w-0 items-center justify-center gap-2 rounded-xl bg-sky-700 px-3 py-3 text-sm font-semibold leading-snug text-white transition-colors hover:bg-sky-800 active:scale-[0.98] disabled:bg-zinc-100 disabled:text-zinc-500">
              <ShoppingCart className="size-4 shrink-0"/><span>{ctaState.text}</span>
            </button>
            <button type="button" onClick={() => toggleFavorite(product.id)} aria-label={favorite ? "Quitar de favoritos" : "Agregar a favoritos"} aria-pressed={favorite} className={`grid size-12 place-items-center rounded-xl border transition-colors ${favorite ? "border-rose-200 bg-rose-50 text-rose-600" : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"}`}><Heart className={`size-5 ${favorite ? "fill-current" : ""}`}/></button>
          </div>
          <button type="button" onClick={() => openWhatsApp(whatsappMessage)} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white px-3 text-sm font-semibold text-emerald-800 transition-colors hover:bg-emerald-50 active:scale-[0.98]">
            <MessageCircle className="size-4 shrink-0"/><span>Consultar por WhatsApp</span>
          </button>
        </div>

        {/* Share & Copy Link */}
        <div className="grid grid-cols-2 gap-2 border-t border-zinc-100 pt-3">
          <button
            type="button"
            onClick={handleCopyLink}
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-xs font-medium text-zinc-600 transition hover:bg-zinc-50"
            aria-live="polite"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-zinc-400" />}
            {copied ? "¡Copiado!" : "Copiar enlace"}
          </button>
          <a
            href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Mirá este producto en MYA Importaciones: ${product.title} - ${siteConfig.appUrl}/producto/${product.slug}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Compartir producto por WhatsApp"
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-xs font-medium text-zinc-600 transition hover:bg-zinc-50"
          >
            <Share2 className="h-3.5 w-3.5 text-emerald-600" />
            Compartir
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

        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <span className="text-[11px] text-zinc-500 font-medium">Cotización en 1 clic:</span>
          {[
            { label: "CABA", cp: "1000" },
            { label: "Tandil", cp: "7000" },
            { label: "Córdoba", cp: "5000" },
            { label: "Rosario", cp: "2000" },
            { label: "Mar del Plata", cp: "7600" },
          ].map((c) => (
            <button
              key={c.cp}
              type="button"
              onClick={() => setPostalCode(c.cp)}
              className={`rounded-lg border px-2 py-0.5 text-[11px] font-semibold transition cursor-pointer ${
                postalCode === c.cp
                  ? "border-sky-600 bg-sky-50 text-sky-800 font-bold shadow-2xs"
                  : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100"
              }`}
            >
              {c.label} ({c.cp})
            </button>
          ))}
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

      {/* Category-Specific Trust & Origin Banner */}
      {(() => {
        const isElectronics = /electr[oó]nica|smartphone|apple|samsung|celular|tablet|notebook/i.test(product.categoryName) || /iphone|macbook|ipad|galaxy/i.test(product.title);
        const isTools = /herramienta/i.test(product.categoryName) || /total|wadfow/i.test(product.brand || "") || /rotomartillo|amoladora|taladro|atornillador|llave de impacto|ingleteadora/i.test(product.title);
        const isCosmetics = /cosm[eé]tica|k-beauty|facial|corporal|skincare|serum|t[oó]nico|limpieza|solar/i.test(product.categoryName) || /skin1004|medicube|dr\.?\s*althea|anua|celimax|numbuzin|round lab|beauty of joseon|torriden|cosrx|tree hut/i.test(product.brand || "");
        const isPerfume = /perfum|fragancia|mist|bruma/i.test(product.categoryName) || /lattafa|asdaf|victoria'?s secret/i.test(product.brand || "");

        if (isElectronics) {
          return (
            <div className="rounded-2xl border border-sky-200 bg-sky-50/60 p-4 space-y-2.5 text-xs text-sky-950 shadow-2xs">
              <div className="flex items-center gap-2 font-bold text-sky-900 border-b border-sky-200/80 pb-2">
                <ShieldCheck className="size-4 text-sky-700 shrink-0" />
                <span>Garantía Oficial y Origen · Electrónica MYA</span>
              </div>
              <ul className="space-y-1.5 text-sky-900/90 leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="font-bold text-sky-700 shrink-0">✓</span>
                  <span><strong>100% Nuevos y Sellados:</strong> Equipos en empaque original sellado con número de serie oficial verificado ante el fabricante.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-sky-700 shrink-0">✓</span>
                  <span><strong>Despacho Protegido:</strong> Embalaje reforzado y despacho oficial por Correo Argentino con código de seguimiento nacional.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-sky-700 shrink-0">✓</span>
                  <span><strong>Garantía de Funcionamiento:</strong> Comprobante de compra y respaldo directo de MYA Importaciones desde Tandil.</span>
                </li>
              </ul>
            </div>
          );
        }

        if (isTools) {
          return (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 space-y-2.5 text-xs text-amber-950 shadow-2xs">
              <div className="flex items-center gap-2 font-bold text-amber-950 border-b border-amber-200/80 pb-2">
                <Wrench className="size-4 text-amber-700 shrink-0" />
                <span>Herramientas Profesionales Certificadas · Total Tools & Wadfow</span>
              </div>
              <ul className="space-y-1.5 text-amber-950/90 leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="font-bold text-amber-700 shrink-0">✓</span>
                  <span><strong>Accesorios y Baterías Declarados:</strong> Detalle explícito de baterías 20V, cargador inteligente y maletín incluidos en cada kit.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-amber-700 shrink-0">✓</span>
                  <span><strong>Plataforma P20S Compartida:</strong> Baterías de litio 20V compatibles entre todas las herramientas inalámbricas del sistema.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-amber-700 shrink-0">✓</span>
                  <span><strong>Inspección Técnica:</strong> Control de integridad de embalaje antes de salir de nuestro depósito central en Tandil.</span>
                </li>
              </ul>
            </div>
          );
        }

        if (isPerfume) {
          return (
            <div className="rounded-2xl border border-purple-200 bg-purple-50/60 p-4 space-y-2.5 text-xs text-purple-950 shadow-2xs">
              <div className="flex items-center gap-2 font-bold text-purple-900 border-b border-purple-200/80 pb-2">
                <Gem className="size-4 text-purple-700 shrink-0" />
                <span>Perfumería Exclusiva y Esencias de Dubai · MYA Importaciones</span>
              </div>
              <ul className="space-y-1.5 text-purple-900/90 leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="font-bold text-purple-700 shrink-0">✓</span>
                  <span><strong>Fragancias 100% Auténticas:</strong> Frascos originales importados directamente de Emiratos Árabes en celofán sellado con holograma y batch code verificable.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-purple-700 shrink-0">✓</span>
                  <span><strong>Alta Concentración y Fijación:</strong> Fórmulas Eau de Parfum de larga estela con duración superior a 8-12 horas en piel y textiles.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-purple-700 shrink-0">✓</span>
                  <span><strong>Embalaje Especial Anti-Impacto:</strong> Acondicionado con triple capa de burbuja de alta densidad y seguro nacional por Correo Argentino.</span>
                </li>
              </ul>
            </div>
          );
        }

        if (isCosmetics) {
          return (
            <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-4 space-y-2.5 text-xs text-rose-950 shadow-2xs">
              <div className="flex items-center gap-2 font-bold text-rose-900 border-b border-rose-200/80 pb-2">
                <Sparkles className="size-4 text-rose-600 shrink-0" />
                <span>Autenticidad K-Beauty Certificada · Cosmética Coreana</span>
              </div>
              <ul className="space-y-1.5 text-rose-900/90 leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="font-bold text-rose-600 shrink-0">✓</span>
                  <span><strong>100% Originales de Corea del Sur:</strong> Productos legítimos en empaque sellado de fábrica con número de lote y fecha de vencimiento visible.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-rose-600 shrink-0">✓</span>
                  <span><strong>Activos Puros Protegidos:</strong> Embalaje con aislación térmica desde Tandil para conservar la estabilidad de principios activos (Centella, PDRN, Niacinamida, Retinal).</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-rose-600 shrink-0">✓</span>
                  <span><strong>Fórmulas Seguras e Hipoalergénicas:</strong> Productos Cruelty-Free certificados, testeados dermatológicamente y no comedogénicos.</span>
                </li>
              </ul>
            </div>
          );
        }

        return null;
      })()}

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
        price={price}
        quantity={quantity}
        added={added}
        onAddToCart={handleAddToCart}
        onOpenWhatsApp={() => openWhatsApp(whatsappMessage)}
        cartCount={cartCount}
        onOpenCart={() => setCartOpen(true)}
        visible={isStickyVisible}
        disabled={ctaState.disabled}
        needsSelection={isVariantMode && (!allDimensionsSelected || !matchedVariant)}
        variantTitle={matchedVariant?.title || undefined}
      />
    </div>
  );
}
