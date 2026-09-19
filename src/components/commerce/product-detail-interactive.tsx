"use client";

import React, { useState, useMemo } from "react";
import { CreditCard, Heart, Landmark, MessageCircle, PackageCheck, Receipt, ShoppingCart, Truck, Wallet } from "lucide-react";
import { formatCurrency, formatPaymentMethod } from "@/lib/format";
import { useCommerce } from "@/components/commerce/commerce-provider";
import { siteConfig, getWhatsAppUrl } from "@/lib/site";
import type { Product } from "@/lib/types";

export function ProductDetailInteractive({ product }: { product: Product }) {
  const { addToCart, toggleFavorite, isFavorite, setCartOpen } = useCommerce();
  const [quantity, setQuantity] = useState(1);
  const [channel, setChannel] = useState<"retail" | "wholesale">(
    product.wholesaleOnly ? "wholesale" : "retail"
  );
  const [added, setAdded] = useState(false);

  const favorite = isFavorite(product.id);

  React.useEffect(() => {
    setQuantity(channel === "wholesale" ? Math.max(product.wholesaleMinQuantity, 1) : 1);
  }, [channel, product.wholesaleMinQuantity]);

  const price = channel === "wholesale" ? product.wholesalePrice : product.retailPrice;

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
    setQuantity((q) => q + 1);
  };

  const handleDecrement = () => {
    const min = channel === "wholesale" ? product.wholesaleMinQuantity : 1;
    setQuantity((q) => Math.max(min, q - 1));
  };

  const whatsappMessage = `Hola MYA Importaciones! Me interesa el producto "${product.title}" (${channel === "wholesale" ? "precio mayorista" : "precio minorista"}). ¿Tienen disponibilidad para envío?`;

  return (
    <div className="space-y-6">
      {/* Channel Switcher */}
      <div className="flex rounded-xl bg-zinc-100 p-1 border border-zinc-200">
        <button
          type="button"
          disabled={product.wholesaleOnly}
          onClick={() => setChannel("retail")}
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
          onClick={() => setChannel("wholesale")}
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

      {/* Price Section */}
      <div className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-5">
        <div className="flex items-baseline justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-zinc-500 tracking-wider">
              {channel === "wholesale" ? "Precio por bulto cerrado" : "Precio unitario contado / transf."}
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
              {product.stock > 0 ? `${product.stock} disponibles` : "Sin stock momentáneo"}
            </span>
            {channel === "wholesale" && (
              <p className="text-[11px] font-semibold text-amber-700 mt-1">
                Mínimo: {product.wholesaleMinQuantity} unidades
              </p>
            )}
          </div>
        </div>

        {/* Quantity and Actions */}
        <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
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
            disabled={product.stock <= 0}
            className="flex-1 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-zinc-950 px-6 text-sm font-bold text-white hover:bg-zinc-800 transition cursor-pointer shadow-md disabled:opacity-50"
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
        <div className="mt-3">
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
      </div>

      {/* Payment methods & Shipping perks */}
      <div className="rounded-xl border border-zinc-200 p-4 space-y-3 text-xs text-zinc-600">
        <div className="flex items-center gap-2 font-semibold text-zinc-800">
          <Truck className="h-4 w-4 text-sky-600" />
          <span>Envíos a todo el país por Correo y Expreso</span>
        </div>
        <div className="flex flex-wrap gap-2 pt-1 border-t border-zinc-100">
          <span className="font-semibold text-zinc-500">Medios de pago:</span>
          {product.paymentMethods.map((m) => (
            <span key={m} className="rounded bg-zinc-100 px-2 py-0.5 text-[10px] font-bold text-zinc-700 uppercase">
              {formatPaymentMethod(m)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
