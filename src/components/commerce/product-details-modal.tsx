"use client";
import { WHOLESALE_ENABLED, isVerifiedStock, purchasableQuantity } from "@/lib/commerce-policy";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import { Heart, ShoppingCart, X } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { useCommerce } from "@/components/commerce/commerce-provider";
import { Button } from "@/components/ui/button";
import { trackAdsEvent } from "@/lib/analytics";
import { useModalFocus } from "@/components/ui/use-modal-focus";

export function ProductDetailsModal() {
  const { selectedProduct } = useCommerce();
  return selectedProduct ? <ProductDetailsModalContent key={selectedProduct.id} /> : null;
}
function ProductDetailsModalContent() {
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
  const panel = React.useRef<HTMLDivElement>(null);
  useModalFocus(panel, Boolean(selectedProduct));

  React.useEffect(() => {
    if (selectedProduct) {
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
    setQuantity((q) => Math.max(1, Math.min(q + 1, purchasableQuantity(selectedProduct))));
  };

  const handleDecrement = () => {
    const min = channel === "wholesale" ? selectedProduct.wholesaleMinQuantity : 1;
    setQuantity((q) => Math.max(min, q - 1));
  };

  const isWholesaleAllowed = WHOLESALE_ENABLED && selectedProduct.wholesalePrice > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm transition-opacity"
    >
      {/* Background close click */}
      <div className="absolute inset-0" onClick={() => setSelectedProduct(null)} />

      {/* Modal Content */}
      <div ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="product-preview-title" onKeyDown={event => { if (event.key === "Escape") setSelectedProduct(null); }} className="relative flex flex-col md:flex-row w-full max-w-4xl max-h-[92dvh] md:max-h-[85dvh] bg-white rounded-2xl shadow-2xl overflow-y-auto md:overflow-hidden border border-zinc-200 animate-in fade-in-50 zoom-in-95 duration-200">
        
        {/* Close Button */}
        <button
          aria-label="Cerrar modal"
          type="button"
          className="absolute right-3.5 top-3.5 z-20 grid size-11 place-items-center rounded-full bg-white/90 border border-zinc-200 text-zinc-700 hover:bg-zinc-100 transition-colors shadow-sm cursor-pointer"
          onClick={() => setSelectedProduct(null)}
        >
          <X className="h-5 w-5" />
        </button>

        {/* Left: Image with Zoom */}
        <div className="relative w-full md:w-1/2 bg-white border-b md:border-b-0 md:border-r border-zinc-100 overflow-hidden min-h-[220px] sm:min-h-[280px] md:min-h-[400px] p-4 sm:p-6 flex items-center justify-center shrink-0">
          <div
            className="w-full h-52 sm:h-64 md:h-full relative cursor-zoom-in"
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
            aria-pressed={favorite}
            className={`absolute left-3.5 top-3.5 inline-flex size-11 items-center justify-center rounded-xl border border-zinc-200 bg-white/90 shadow-sm transition hover:scale-105 ${
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
        <div className="min-w-0 flex-1 flex flex-col p-5 sm:p-6 md:p-8 md:overflow-y-auto md:max-h-[85dvh]">
          {/* Header */}
          <span className="text-xs font-semibold uppercase text-emerald-700">
            {selectedProduct.categoryName}
          </span>
          <h2 id="product-preview-title" className="mt-1 break-words text-2xl font-extrabold text-zinc-950 tracking-tight leading-tight">
            {selectedProduct.title}
          </h2>
          <p className="mt-4 text-sm text-zinc-600 leading-relaxed">
            {selectedProduct.description}
          </p>

          {/* Pricing Comparison Table */}
          <div className="mt-6 border border-zinc-200 rounded-xl overflow-hidden">
            <div className="bg-zinc-50 border-b border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Precio del producto
            </div>
            <div className="divide-y divide-zinc-200 text-sm">
              {/* Ref Mercado Libre Row */}

              {/* Minorista Row */}
              <div className="flex items-center justify-between px-4 py-2.5">
                <span className="text-zinc-700">Precio por unidad</span>
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
                    channel === "retail" ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-600 hover:text-zinc-950"
                  }`}
                  onClick={() => { setChannel("retail"); setQuantity(1); }}
                >
                  Minorista
                </button>
                <button
                  className={`py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                    channel === "wholesale" ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-600 hover:text-zinc-950"
                  }`}
                  onClick={() => { setChannel("wholesale"); setQuantity(selectedProduct.wholesaleMinQuantity); }}
                >
                  Mayorista
                </button>
              </div>
            </div>
          )}

          {/* Stock & Minimums */}
          <div className="mt-6 flex flex-wrap gap-4 text-xs font-medium text-zinc-500">
            <div>
              Estado: <span className={isVerifiedStock(selectedProduct) ? "text-emerald-700" : "text-red-650"}>
                {isVerifiedStock(selectedProduct) ? "Disponible" : "Consultar disponibilidad"}
              </span>
            </div>
            {channel === "wholesale" && (
              <div>
                Mínimo de compra: <span className="text-zinc-900">{selectedProduct.wholesaleMinQuantity} unidades</span>
              </div>
            )}
          </div>

          {/* Add to Cart Actions */}
          <div className="mt-6 grid gap-3">
            <div className="flex items-center rounded-xl border border-zinc-200 bg-white">
              <button
                aria-label="Restar unidad"
                className="inline-flex h-11 w-11 items-center justify-center text-zinc-600 hover:bg-zinc-100 rounded-l-xl border-r border-zinc-200 cursor-pointer"
                onClick={handleDecrement}
              >
                -
              </button>
              <span aria-live="polite" className="flex-1 text-center text-sm font-bold text-zinc-900">
                {quantity}
              </span>
              <button
                aria-label="Sumar unidad"
                disabled={quantity >= purchasableQuantity(selectedProduct)}
                className="inline-flex h-11 w-11 items-center justify-center text-zinc-600 hover:bg-zinc-100 rounded-r-xl border-l border-zinc-200 cursor-pointer"
                onClick={handleIncrement}
              >
                +
              </button>
            </div>

            <Button
              className="min-h-12 w-full cursor-pointer flex items-center justify-center gap-2"
              onClick={handleAddToCart}
              disabled={!isVerifiedStock(selectedProduct)}
              icon={<ShoppingCart className="h-4 w-4" />}
            >
              Agregar ({formatCurrency(price * quantity)})
            </Button>
          </div>

        </div>

      </div>
    </div>
  );
}
