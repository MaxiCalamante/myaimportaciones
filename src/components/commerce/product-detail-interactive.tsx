"use client";
import { WHOLESALE_ENABLED, isVerifiedStock } from "@/lib/commerce-policy";

import React, { useState, useMemo } from "react";
import {
  CreditCard,
  Heart,
  Landmark,
  MessageCircle,
  PackageCheck,
  Receipt,
  ShoppingCart,
  Truck,
  Wallet,
  Sparkles,
  Share2,
  Copy,
  Check,
  ReceiptText,
  ShieldCheck,
  Zap,
  Clock,
} from "lucide-react";
import { formatCurrency, formatPaymentMethod } from "@/lib/format";
import { useCommerce } from "@/components/commerce/commerce-provider";
import {
  calculateShipping,
  isProductImmediateStock,
  getProductShippingTimeInfo,
} from "@/lib/shipping";
import { siteConfig, getWhatsAppUrl } from "@/lib/site";
import type { Product } from "@/lib/types";
import { trackAdsEvent } from "@/lib/analytics";
import { TrustGuaranteeBadges } from "@/components/commerce/trust-guarantee-badges";

export function ProductDetailInteractive({ product }: { product: Product }) {
  const {
    addToCart,
    toggleFavorite,
    isFavorite,
    setCartOpen,
    postalCode,
    setPostalCode,
    selectedShippingOptionId,
    setSelectedShippingOptionId,
  } = useCommerce();
  const [quantity, setQuantity] = useState(1);
  const [channel, setChannel] = useState<"retail" | "wholesale">(
    product.wholesaleOnly ? "wholesale" : "retail"
  );
  const [added, setAdded] = useState(false);
  const [copied, setCopied] = useState(false);

  const favorite = isFavorite(product.id);

  React.useEffect(() => {
    trackAdsEvent("ViewContent", {
      content_name: product.title,
      content_ids: [product.id],
      value: product.retailPrice,
    });
  }, [product.id, product.title, product.retailPrice]);

  const price = channel === "wholesale" ? product.wholesalePrice : product.retailPrice;

  const isImmediate = useMemo(() => isProductImmediateStock(product), [product]);
  const shippingTimeInfo = useMemo(() => getProductShippingTimeInfo(product), [product]);

  const shippingCalculation = useMemo(() => {
    return calculateShipping(postalCode, price * quantity, isImmediate);
  }, [postalCode, price, quantity, isImmediate]);

  const discount = useMemo(() => {
    if (product.retailPrice <= 0 || product.wholesalePrice <= 0) return 0;
    return Math.round(
      ((product.retailPrice - product.wholesalePrice) / product.retailPrice) * 100
    );
  }, [product]);

  const handleAddToCart = () => {
    addToCart(product, channel, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
    setCartOpen(true);
  };

  const handleIncrement = () => {
    setQuantity((q) => Math.max(1, Math.min(q + 1, product.stock, 100)));
  };

  const handleDecrement = () => {
    const min = channel === "wholesale" ? product.wholesaleMinQuantity : 1;
    setQuantity((q) => Math.max(min, q - 1));
  };

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(`${siteConfig.appUrl}/producto/${product.slug}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const whatsappMessage = `Hola MYA Importaciones! Me interesa el producto "${product.title}" (${channel === "wholesale" ? "precio mayorista" : "precio minorista"}). ¿Tienen disponibilidad para envío?`;

  return (
    <div className="space-y-6">
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
      <div className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-5 space-y-4">
        <div className="flex items-baseline justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-zinc-500 tracking-wider">
              {channel === "wholesale" ? "Precio por bulto cerrado" : "Precio del producto"}
            </p>
            <div className="mt-1 flex items-baseline gap-3">
              <span className="text-3xl sm:text-4xl font-black text-zinc-950 tracking-tight">
                {formatCurrency(price)}
              </span>
              {channel === "wholesale" && product.retailPrice > product.wholesalePrice && (
                <span className="text-sm font-semibold text-zinc-400 line-through">
                  {formatCurrency(product.retailPrice)}
                </span>
              )}
            </div>

          </div>
          <div className="text-right">
            <span className={`inline-flex items-center gap-1 text-xs font-bold ${
              product.stock > 0 ? "text-emerald-700" : "text-red-600"
            }`}>
              <span className={`h-2 w-2 rounded-full ${
                product.stock > 0 ? "bg-emerald-500 animate-pulse" : "bg-red-500"
              }`} />
              {product.stock > 0 ? isVerifiedStock(product) ? `${product.stock} disponibles` : "Consultar disponibilidad" : "Sin stock momentáneo"}
            </span>
            <span
              className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md border mt-1 ${shippingTimeInfo.badgeClass}`}
              title={shippingTimeInfo.shippingTimeDescription}
            >
              {isImmediate ? "Stock en Tandil" : "Disponibilidad a confirmar"}
            </span>
            {channel === "wholesale" && (
              <p className="text-[11px] font-semibold text-amber-700 mt-1">
                Mínimo: {product.wholesaleMinQuantity} unidades
              </p>
            )}
          </div>
        </div>

        {/* 10% Transfer Discount Highlight */}
        {false && channel === "retail" && (
          <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200/80 rounded-xl p-3 text-xs text-emerald-900">
            <span className="flex items-center gap-1.5 font-bold">
              <Sparkles className="h-4 w-4 text-emerald-600 shrink-0" />
              10% OFF en Transferencia / Efectivo:
            </span>
            <span className="font-black text-sm text-emerald-700">
              {formatCurrency(Math.round(price * 0.90))}
            </span>
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
        <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex items-center rounded-xl border border-zinc-300 bg-white h-12 self-start sm:self-auto">
            <button
              onClick={handleDecrement}
              className="h-full px-4 text-lg font-bold text-zinc-600 hover:text-zinc-950 transition cursor-pointer"
              type="button"
            >
              -
            </button>
            <span className="w-12 text-center text-sm font-bold text-zinc-900">
              {quantity}
            </span>
            <button
              onClick={handleIncrement}
              className="h-full px-4 text-lg font-bold text-zinc-600 hover:text-zinc-950 transition cursor-pointer"
              type="button"
            >
              +
            </button>
          </div>

          <button
            onClick={handleAddToCart}
            disabled={!isVerifiedStock(product)}
            className="flex-1 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-sky-600 px-6 text-sm font-bold text-white hover:bg-sky-700 active:scale-[0.99] transition cursor-pointer shadow-md disabled:opacity-50"
            type="button"
          >
            <ShoppingCart className="h-4 w-4" />
            {added ? "¡Agregado al carrito!" : "Agregar al Carrito"}
          </button>

          <button
            onClick={() => toggleFavorite(product.id)}
            className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border transition cursor-pointer ${
              favorite
                ? "bg-red-50 border-red-200 text-red-600"
                : "bg-white border-zinc-300 text-zinc-600 hover:text-zinc-950"
            }`}
            type="button"
            aria-label="Favorito"
          >
            <Heart className={`h-5 w-5 ${favorite ? "fill-current" : ""}`} />
          </button>
        </div>

        {/* WhatsApp Direct Order Button */}
        <div>
          <a
            href={getWhatsAppUrl(whatsappMessage)}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold transition shadow-sm"
          >
            <MessageCircle className="h-4 w-4" />
            Consultar o Pedir por WhatsApp
          </a>
        </div>

        {/* Share & Copy Link */}
        <div className="flex items-center gap-2 pt-2 border-t border-zinc-200/60">
          <button
            type="button"
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 transition cursor-pointer"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-zinc-400" />}
            {copied ? "¡Copiado!" : "Copiar enlace"}
          </button>
          <a
            href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Mirá este producto en MYA Importaciones: ${product.title} - ${siteConfig.appUrl}/producto/${product.slug}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition cursor-pointer"
          >
            <Share2 className="h-3.5 w-3.5 text-emerald-600" />
            Compartir por WhatsApp
          </a>
        </div>
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

        <div className="flex items-center justify-between pt-1">
          <span className="font-bold text-zinc-900 flex items-center gap-1.5">
            <Truck className="h-4 w-4 text-sky-600" />
            Calcular costo de envío:
          </span>
          <span className="text-[10px] text-zinc-400">Envíos a todo el país</span>
        </div>

        <div className="relative">
          <input
            type="text"
            placeholder="Ingresá tu Código Postal (ej: 7000, 1425 o B1640)"
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
            className="h-10 w-full rounded-xl border border-zinc-300 px-3 pr-8 text-xs bg-white outline-none focus:border-sky-500 text-zinc-950 placeholder:text-zinc-400 font-medium"
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
                        <span className="font-black text-zinc-900">{formatCurrency(opt.price)}</span>
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
      <div className="rounded-2xl border border-zinc-200 p-4 space-y-2.5 text-xs text-zinc-600 bg-white">
        <div className="flex items-center gap-2 font-semibold text-zinc-800">
          <ReceiptText className="h-4 w-4 text-zinc-500" />
          <span>Facturación: consultá el comprobante correspondiente a tu compra</span>
        </div>
        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-zinc-100">
          <span className="font-semibold text-zinc-500">Medios de pago:</span>
          {product.paymentMethods.map((m) => (
            <span key={m} className="rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-bold text-zinc-700 uppercase">
              {formatPaymentMethod(m)}
            </span>
          ))}
        </div>
      </div>

      {/* Trust & Guarantee Badges */}
      <TrustGuaranteeBadges variant="compact" />

      {/* Mobile Sticky Add-to-Cart Bar */}
      <div className="fixed bottom-16 left-0 right-0 z-30 block md:hidden bg-white/95 backdrop-blur-md border-t border-zinc-200 px-4 py-2.5 shadow-lg">
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="text-[10px] text-zinc-500 font-semibold uppercase block">
              {channel === "wholesale" ? "Mayorista" : "Minorista"}
            </span>
            <span className="text-base font-black text-zinc-950">{formatCurrency(price)}</span>
          </div>
          <button
            onClick={handleAddToCart}
            disabled={!isVerifiedStock(product)}
            className="flex-1 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 text-xs font-bold text-white hover:bg-sky-700 active:scale-[0.99] transition cursor-pointer shadow-md disabled:opacity-50"
            type="button"
          >
            <ShoppingCart className="h-4 w-4" />
            {added ? "¡Agregado!" : "Agregar al Carrito"}
          </button>
        </div>
      </div>
    </div>
  );
}
