"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import { CreditCard, Heart, Landmark, Receipt, ShoppingCart, Wallet, X } from "lucide-react";
import { formatCurrency, formatPaymentMethod } from "@/lib/format";
import { useCommerce } from "@/components/commerce/commerce-provider";
import { Button } from "@/components/ui/button";
import { trackAdsEvent } from "@/lib/analytics";

export function ProductDetailsModal() {
  const {
    selectedProduct,
    setSelectedProduct,
    addToCart,
    toggleFavorite,
    isFavorite,
  } = useCommerce();

  const [quantity, setQuantity] = useState(1);
  const [channel, setChannel] = useState<"retail" | "wholesale">("retail");
  const [zoomStyle, setZoomStyle] = useState<React.CSSProperties>({
    transformOrigin: "center center",
    transform: "scale(1)",
  });

  const favorite = selectedProduct ? isFavorite(selectedProduct.id) : false;

  // Reset local state when product changes
  React.useEffect(() => {
    if (selectedProduct) {
      setQuantity(channel === "wholesale" ? Math.max(selectedProduct.wholesaleMinQuantity, 1) : 1);
    }
  }, [selectedProduct, channel]);

  // Adjust default channel based on product settings and track ViewContent
  React.useEffect(() => {
    if (selectedProduct) {
      if (selectedProduct.wholesaleOnly) {
        setChannel("wholesale");
      } else {
        setChannel("retail");
      }
      trackAdsEvent("ViewContent", {
        content_name: selectedProduct.title,
        content_ids: [selectedProduct.id],
        value: selectedProduct.retailPrice,
      });
    }
  }, [selectedProduct]);

  const discount = useMemo(() => {
    if (!selectedProduct) return 0;
    if (selectedProduct.retailPrice <= 0 || selectedProduct.wholesalePrice <= 0) return 0;
    return Math.round(
      ((selectedProduct.retailPrice - selectedProduct.wholesalePrice) /
        selectedProduct.retailPrice) *
        100
    );
  }, [selectedProduct]);

  if (!selectedProduct) return null;

  const imageSrc = selectedProduct.imageUrl || "/placeholder-product.svg";
  const price = channel === "wholesale" ? selectedProduct.wholesalePrice : selectedProduct.retailPrice;

  // Zoom logic
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setZoomStyle({
      transformOrigin: `${x}% ${y}%`,
      transform: "scale(1.5)",
    });
  };

  const handleMouseLeave = () => {
    setZoomStyle({
      transformOrigin: "center center",
      transform: "scale(1)",
    });
  };

  const handleAddToCart = () => {
    addToCart(selectedProduct, channel, quantity);
    setSelectedProduct(null); // Close modal
  };

  const handleIncrement = () => {
    setQuantity((q) => q + 1);
  };

  const handleDecrement = () => {
    const min = channel === "wholesale" ? selectedProduct.wholesaleMinQuantity : 1;
    setQuantity((q) => Math.max(min, q - 1));
  };

  const isWholesaleAllowed = selectedProduct.wholesalePrice > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm transition-opacity"
      role="dialog"
      aria-modal="true"
    >
      {/* Background close click */}
      <div className="absolute inset-0" onClick={() => setSelectedProduct(null)} />

      {/* Modal Content */}
      <div className="relative flex flex-col md:flex-row w-full max-w-4xl max-h-[92dvh] md:max-h-[85vh] bg-white rounded-2xl shadow-2xl overflow-y-auto md:overflow-hidden border border-zinc-200 animate-in fade-in-50 zoom-in-95 duration-200">
        
        {/* Close Button */}
        <button
          aria-label="Cerrar modal"
          className="absolute right-3.5 top-3.5 z-20 p-2 rounded-full bg-white/90 border border-zinc-200 text-zinc-700 hover:bg-zinc-100 transition-colors shadow-sm cursor-pointer"
          onClick={() => setSelectedProduct(null)}
        >
          <X className="h-5 w-5" />
        </button>

        {/* Left: Image with Zoom */}
        <div className="relative w-full md:w-1/2 bg-white border-b md:border-b-0 md:border-r border-zinc-100 overflow-hidden min-h-[220px] sm:min-h-[280px] md:min-h-[400px] p-4 sm:p-6 flex items-center justify-center shrink-0">
          <div
            className="w-full h-full relative cursor-zoom-in"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <Image
              alt={selectedProduct.title}
              className="object-contain p-3 sm:p-4 transition-transform duration-100 ease-out"
              fill
              priority
              sizes="(min-width: 768px) 50vw, 100vw"
              src={imageSrc}
              style={zoomStyle}
              quality={95}
            />
          </div>
          <button
            aria-label={favorite ? "Quitar de favoritos" : "Agregar a favoritos"}
            className={`absolute left-3.5 top-3.5 inline-flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg border border-zinc-200 bg-white/90 shadow-sm transition hover:scale-105 ${
              favorite ? "text-red-600" : "text-zinc-600 hover:text-red-600"
            }`}
            onClick={() => toggleFavorite(selectedProduct.id)}
            type="button"
          >
            <Heart className={favorite ? "h-4.5 w-4.5 sm:h-5 sm:w-5 fill-current" : "h-4.5 w-4.5 sm:h-5 sm:w-5"} />
          </button>
          {selectedProduct.tags[0] ? (
            <span className="absolute left-3.5 bottom-3.5 rounded-md bg-zinc-950/90 backdrop-blur-xs px-2.5 py-1 text-[10px] sm:text-xs font-semibold uppercase text-white">
              {selectedProduct.tags[0]}
            </span>
          ) : null}
        </div>

        {/* Right: Info and Pricing */}
        <div className="flex-1 flex flex-col p-5 sm:p-6 md:p-8 md:overflow-y-auto md:max-h-[85vh]">
          {/* Header */}
          <span className="text-xs font-semibold uppercase text-emerald-700">
            {selectedProduct.categoryName}
          </span>
          <h2 className="mt-1 text-2xl font-extrabold text-zinc-950 tracking-tight leading-tight">
            {selectedProduct.title}
          </h2>
          <p className="mt-4 text-sm text-zinc-655 leading-relaxed">
            {selectedProduct.description}
          </p>

          {/* Pricing Comparison Table */}
          <div className="mt-6 border border-zinc-200 rounded-xl overflow-hidden">
            <div className="bg-zinc-50 border-b border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Tabla de Precios por Volumen
            </div>
            <div className="divide-y divide-zinc-200 text-sm">
              {/* Ref Mercado Libre Row */}
              {selectedProduct.retailPrice > 0 && (
                <div className="flex items-center justify-between px-4 py-2 bg-zinc-50/70 text-xs">
                  <span className="text-zinc-500">Ref. Mercado Libre (aprox.)</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-zinc-400 line-through font-medium">
                      {formatCurrency(Math.round((selectedProduct.retailPrice * 1.08) / 100) * 100)}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1 rounded">
                      -8% vs ML
                    </span>
                  </div>
                </div>
              )}
              {/* Minorista Row */}
              <div className="flex items-center justify-between px-4 py-2.5">
                <span className="text-zinc-700">1 - {selectedProduct.wholesaleMinQuantity - 1} u. (Minorista)</span>
                <span className="font-bold text-zinc-900">{formatCurrency(selectedProduct.retailPrice)}</span>
              </div>
              {/* Mayorista Row */}
              {isWholesaleAllowed && (
                <div className="flex items-center justify-between px-4 py-2.5 bg-emerald-50/50">
                  <span className="text-emerald-900 font-medium">
                    {selectedProduct.wholesaleMinQuantity}+ u. (Mayorista)
                  </span>
                  <div className="flex items-center gap-2">
                    {discount > 0 && (
                      <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                        -{discount}%
                      </span>
                    )}
                    <span className="font-bold text-emerald-700">{formatCurrency(selectedProduct.wholesalePrice)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Channel Selector */}
          {isWholesaleAllowed && !selectedProduct.wholesaleOnly && (
            <div className="mt-6">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Canal de compra</span>
              <div className="mt-2 grid grid-cols-2 gap-2 bg-zinc-100 p-1 rounded-xl">
                <button
                  className={`py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                    channel === "retail" ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-650 hover:text-zinc-950"
                  }`}
                  onClick={() => setChannel("retail")}
                >
                  Minorista
                </button>
                <button
                  className={`py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                    channel === "wholesale" ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-650 hover:text-zinc-950"
                  }`}
                  onClick={() => setChannel("wholesale")}
                >
                  Mayorista
                </button>
              </div>
            </div>
          )}

          {/* Stock & Minimums */}
          <div className="mt-6 flex flex-wrap gap-4 text-xs font-medium text-zinc-500">
            <div>
              Estado: <span className={selectedProduct.stock > 0 ? "text-emerald-700" : "text-red-650"}>
                {selectedProduct.stock > 0 ? `En Stock (${selectedProduct.stock} disp.)` : "Sin Stock"}
              </span>
            </div>
            {channel === "wholesale" && (
              <div>
                Mínimo de compra: <span className="text-zinc-900">{selectedProduct.wholesaleMinQuantity} unidades</span>
              </div>
            )}
          </div>

          {/* Add to Cart Actions */}
          <div className="mt-6 flex items-center gap-4">
            <div className="flex items-center rounded-xl border border-zinc-200 bg-white">
              <button
                aria-label="Restar unidad"
                className="inline-flex h-11 w-11 items-center justify-center text-zinc-650 hover:bg-zinc-100 rounded-l-xl border-r border-zinc-200 cursor-pointer"
                onClick={handleDecrement}
              >
                -
              </button>
              <span className="w-12 text-center text-sm font-bold text-zinc-900">
                {quantity}
              </span>
              <button
                aria-label="Sumar unidad"
                className="inline-flex h-11 w-11 items-center justify-center text-zinc-650 hover:bg-zinc-100 rounded-r-xl border-l border-zinc-200 cursor-pointer"
                onClick={handleIncrement}
              >
                +
              </button>
            </div>

            <Button
              className="flex-1 h-11 cursor-pointer flex items-center justify-center gap-2"
              onClick={handleAddToCart}
              disabled={selectedProduct.stock <= 0}
              icon={<ShoppingCart className="h-4 w-4" />}
            >
              Agregar ({formatCurrency(price * quantity)})
            </Button>
          </div>

          {/* Payments Accepted */}
          <div className="mt-8 border-t border-zinc-250 pt-5">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">Métodos de pago aceptados</span>
            <div className="mt-3 flex flex-wrap gap-2">
              {selectedProduct.paymentMethods.map((method) => {
                let Icon = CreditCard;
                if (method === "transferencia") Icon = Landmark;
                else if (method === "efectivo") Icon = Receipt;
                else if (method === "mercado_pago") Icon = Wallet;

                return (
                  <span
                    className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-700"
                    key={method}
                  >
                    <Icon className="h-3.5 w-3.5 text-zinc-650" />
                    {formatPaymentMethod(method)}
                  </span>
                );
              })}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
