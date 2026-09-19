"use client";

import Image from "next/image";
import Link from "next/link";
import { MessageCircle, Minus, Plus, ShoppingBag, Sparkles, Trash2, X } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { useCommerce } from "@/components/commerce/commerce-provider";
import { getWhatsAppUrl } from "@/lib/site";

export function CartDrawer() {
  const {
    cart,
    cartOpen,
    cartTotal,
    setCartOpen,
    updateQuantity,
    removeFromCart,
    postalCode,
    setPostalCode,
    shippingCost,
  } = useCommerce();

  // Wholesale validation
  const wholesaleTotal = cart
    .filter((line) => line.channel === "wholesale")
    .reduce((sum, line) => {
      return sum + line.product.wholesalePrice * line.quantity;
    }, 0);

  const savingsTotal = cart
    .filter((line) => line.channel === "wholesale")
    .reduce((sum, line) => {
      const retailPrice = line.product.retailPrice;
      const wholesalePrice = line.product.wholesalePrice;
      return sum + (retailPrice - wholesalePrice) * line.quantity;
    }, 0);
  
  const hasWholesale = cart.some((line) => line.channel === "wholesale");
  const minWholesaleLimit = 100000;
  const isWholesaleValid = !hasWholesale || wholesaleTotal >= minWholesaleLimit;
  const progressPercentage = Math.min((wholesaleTotal / minWholesaleLimit) * 100, 100);

  return (
    <div
      className={`fixed inset-0 z-50 transition ${
        cartOpen ? "pointer-events-auto" : "pointer-events-none"
      }`}
      aria-hidden={!cartOpen}
    >
      <button
        aria-label="Cerrar carrito"
        className={`absolute inset-0 bg-zinc-950/35 transition-opacity ${
          cartOpen ? "opacity-100" : "opacity-0"
        }`}
        onClick={() => setCartOpen(false)}
        type="button"
      />
      <aside
        className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-300 ${
          cartOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            <h2 className="text-lg font-semibold text-zinc-950">Carrito</h2>
          </div>
          <button
            aria-label="Cerrar carrito"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-zinc-600 hover:bg-zinc-100"
            onClick={() => setCartOpen(false)}
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {cart.length > 0 && hasWholesale && (
            <div className="mb-4 bg-amber-50/40 border border-amber-200/60 rounded-xl p-4">
              <div className="flex justify-between text-xs font-semibold text-zinc-700 mb-1.5">
                <span>Progreso Mínimo Mayorista</span>
                <span>{formatCurrency(wholesaleTotal)} / {formatCurrency(minWholesaleLimit)}</span>
              </div>
              <div className="h-2 w-full bg-zinc-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-600 transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              <p className="mt-2 text-[11px] text-zinc-650 leading-relaxed">
                {wholesaleTotal >= minWholesaleLimit
                  ? "¡Mínimo mayorista alcanzado! Podés finalizar tu compra."
                  : `Te faltan ${formatCurrency(minWholesaleLimit - wholesaleTotal)} en productos mayoristas para comprar a precio comercial.`}
              </p>
            </div>
          )}

          {cart.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
              <ShoppingBag className="h-10 w-10 text-zinc-400" />
              <p className="text-sm text-zinc-650">Tu carrito está vacío.</p>
              <Link
                className="text-sm font-semibold text-emerald-700 hover:text-emerald-800"
                href="/#catalogo"
                onClick={() => setCartOpen(false)}
              >
                Ver catálogo
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {cart.map((line) => {
                const price =
                  line.channel === "wholesale"
                    ? line.product.wholesalePrice
                    : line.product.retailPrice;

                return (
                  <div
                    className="grid grid-cols-[72px_1fr] gap-3 border-b border-zinc-100 pb-4"
                    key={`${line.product.id}-${line.channel}`}
                  >
                    <Image
                      alt={line.product.title}
                      className="h-[72px] w-[72px] rounded-lg object-cover"
                      height={72}
                      src={line.product.imageUrl || "/window.svg"}
                      width={72}
                    />
                    <div className="min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="line-clamp-2 text-sm font-semibold text-zinc-950">
                            {line.product.title}
                          </p>
                          <p className="mt-1 text-xs uppercase text-zinc-500 font-medium">
                            {line.channel === "wholesale" ? "Mayorista" : "Minorista"}
                          </p>
                        </div>
                        <button
                          aria-label="Quitar producto"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-red-650"
                          onClick={() => removeFromCart(line.product.id, line.channel)}
                          type="button"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex h-9 items-center rounded-lg border border-zinc-200">
                          <button
                            aria-label="Restar unidad"
                            className="inline-flex h-9 w-9 items-center justify-center text-zinc-650 hover:bg-zinc-100"
                            onClick={() =>
                              updateQuantity(
                                line.product.id,
                                line.channel,
                                line.quantity - 1,
                              )
                            }
                            type="button"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="w-8 text-center text-sm font-semibold">
                            {line.quantity}
                          </span>
                          <button
                            aria-label="Sumar unidad"
                            className="inline-flex h-9 w-9 items-center justify-center text-zinc-655 hover:bg-zinc-100"
                            onClick={() =>
                              updateQuantity(
                                line.product.id,
                                line.channel,
                                line.quantity + 1,
                              )
                            }
                            type="button"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-zinc-950">
                            {formatCurrency(price * line.quantity)}
                          </p>
                          {line.channel === "wholesale" && (
                            <p className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1 py-0.5 rounded inline-block mt-1">
                              Ahorrás {formatCurrency((line.product.retailPrice - line.product.wholesalePrice) * line.quantity)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t border-zinc-200 p-5 bg-zinc-50/50 space-y-4">
          {/* Shipping Cost Simulator */}
          {cart.length > 0 && (
            <div className="border-b border-zinc-200 pb-3">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Simular envío</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Código Postal (ej. 1425 o B1640)"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  className="h-9 w-full rounded-lg border border-zinc-300 px-3 text-xs bg-white outline-none focus:border-emerald-600 text-zinc-950"
                />
              </div>
              {postalCode && (
                <div className="mt-2 text-xs text-zinc-650 flex items-center justify-between bg-white border border-zinc-200 rounded-lg p-2">
                  <span>Costo de envío estimado:</span>
                  <span className="font-bold text-zinc-900">
                    {shippingCost === 0 ? "Bonificado" : formatCurrency(shippingCost)}
                  </span>
                </div>
              )}
            </div>
          )}

          {hasWholesale && (
            <div className="flex justify-between text-xs text-zinc-500">
              <span>Subtotal Mayorista:</span>
              <span className="font-semibold">{formatCurrency(wholesaleTotal)}</span>
            </div>
          )}
          
          <div className="space-y-1.5 text-xs text-zinc-650">
            <div className="flex justify-between">
              <span>Subtotal Productos:</span>
              <span>{formatCurrency(cartTotal)}</span>
            </div>
            {postalCode && (
              <div className="flex justify-between">
                <span>Costo de Envío:</span>
                <span>{shippingCost === 0 ? "Gratis" : formatCurrency(shippingCost)}</span>
              </div>
            )}
            {savingsTotal > 0 && (
              <div className="flex justify-between text-emerald-700 font-bold bg-emerald-50 p-2 rounded-lg">
                <span>¡Tu Ahorro Mayorista!</span>
                <span>{formatCurrency(savingsTotal)}</span>
              </div>
            )}
          </div>

          {/* Transfer discount badge */}
          {cart.length > 0 && (
            <div className="flex items-center justify-between text-xs text-emerald-800 bg-emerald-50/90 border border-emerald-200 p-2.5 rounded-xl">
              <span className="flex items-center gap-1.5 font-bold">
                <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                10% OFF pagando con Transferencia:
              </span>
              <span className="font-black text-sm text-emerald-700">
                {formatCurrency(Math.round(cartTotal * 0.90) + shippingCost)}
              </span>
            </div>
          )}

          <div className="border-t border-zinc-200 pt-3 flex items-center justify-between text-base font-bold text-zinc-950">
            <span>Total Regular</span>
            <span>{formatCurrency(cartTotal + shippingCost)}</span>
          </div>

          {!isWholesaleValid && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 leading-relaxed">
              El pedido mínimo para compra mayorista es de <strong>{formatCurrency(minWholesaleLimit)}</strong>.<br />
              Te faltan <strong>{formatCurrency(minWholesaleLimit - wholesaleTotal)}</strong> en productos mayoristas para continuar.
            </div>
          )}

          {cart.length === 0 ? (
            <button
              className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-zinc-950 px-4 text-sm font-semibold text-white opacity-40 cursor-not-allowed"
              disabled
              type="button"
            >
              Carrito Vacío
            </button>
          ) : !isWholesaleValid ? (
            <button
              className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-zinc-300 px-4 text-sm font-semibold text-zinc-500 cursor-not-allowed opacity-60"
              disabled
              type="button"
            >
              Mínimo mayorista no alcanzado
            </button>
          ) : (
            <div className="space-y-2">
              <Link
                className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-zinc-950 px-4 text-sm font-bold text-white hover:bg-zinc-800 transition-colors cursor-pointer shadow-sm"
                href="/checkout"
                onClick={() => setCartOpen(false)}
              >
                Finalizar Compra en la Web
              </Link>
              <a
                href={getWhatsAppUrl(
                  `Hola MYA Importaciones! Armé mi carrito y quisiera pedirlo por WhatsApp:\n\n${cart.map((c) => `• ${c.quantity}x ${c.product.title} (${formatCurrency(c.channel === 'wholesale' ? c.product.wholesalePrice : c.product.retailPrice)})`).join('\n')}\n\n*Total a pagar: ${formatCurrency(cartTotal + shippingCost)}*`
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 text-sm font-bold text-white transition-colors shadow-sm cursor-pointer"
              >
                <MessageCircle className="h-4 w-4" />
                Pedir por WhatsApp
              </a>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
