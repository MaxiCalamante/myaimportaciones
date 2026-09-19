"use client";

import { FormEvent, useMemo, useState, useTransition, useEffect } from "react";
import { CheckCircle2, CreditCard, Landmark, MessageCircle, Receipt, Wallet, Search, Sparkles, ShieldCheck, Truck } from "lucide-react";
import Link from "next/link";
import { formatCurrency, formatPaymentMethod } from "@/lib/format";
import type { PaymentMethod } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { useCommerce } from "@/components/commerce/commerce-provider";
import { createOrderAction } from "@/app/checkout/actions";
import { siteConfig, getWhatsAppUrl } from "@/lib/site";
import type { Profile } from "@/lib/auth";
import { trackAdsEvent } from "@/lib/analytics";

const paymentOptions: Array<{ value: PaymentMethod; icon: typeof CreditCard; badge?: string }> = [
  { value: "transferencia", icon: Landmark, badge: "10% OFF" },
  { value: "efectivo", icon: Receipt, badge: "10% OFF" },
  { value: "mercado_pago", icon: Wallet },
  { value: "tarjeta", icon: CreditCard },
];

export function CheckoutPanel({ profile }: { profile: Profile | null }) {
  const {
    cart,
    cartTotal,
    clearCart,
    shippingCost,
    postalCode,
    setPostalCode,
    shippingCalculation,
    selectedShippingOptionId,
    setSelectedShippingOptionId,
    selectedShippingOption,
  } = useCommerce();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("transferencia");
  const [orderCode, setOrderCode] = useState<string | null>(null);
  
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const shipping = shippingCost;

  // Track InitiateCheckout on panel mount
  useEffect(() => {
    if (cart.length > 0) {
      trackAdsEvent("InitiateCheckout", {
        value: cartTotal,
        num_items: cart.length,
        items: cart.map((l) => ({
          id: l.product.id,
          title: l.product.title,
          quantity: l.quantity,
          price: l.channel === "wholesale" ? l.product.wholesalePrice : l.product.retailPrice,
        })),
      });
    }
  }, []); // Run once on mount

  // 10% discount for bank transfer / cash
  const transferDiscountPercentage = 10;
  const isDiscountEligible = paymentMethod === "transferencia" || paymentMethod === "efectivo";
  const discountAmount = isDiscountEligible ? Math.round(cartTotal * (transferDiscountPercentage / 100)) : 0;
  const total = Math.max(0, cartTotal - discountAmount + shipping);

  // Wholesale validation
  const wholesaleTotal = useMemo(() => {
    return cart
      .filter((line) => line.channel === "wholesale")
      .reduce((sum, line) => sum + line.product.wholesalePrice * line.quantity, 0);
  }, [cart]);

  const hasWholesale = useMemo(() => {
    return cart.some((line) => line.channel === "wholesale");
  }, [cart]);

  const minWholesaleLimit = 100000;
  const isWholesaleValid = !hasWholesale || wholesaleTotal >= minWholesaleLimit;

  const orderLines = useMemo(
    () =>
      cart.map((line) => ({
        title: line.product.title,
        quantity: line.quantity,
        channel: line.channel,
        subtotal:
          (line.channel === "wholesale"
            ? line.product.wholesalePrice
            : line.product.retailPrice) * line.quantity,
      })),
    [cart],
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isWholesaleValid) return;

    const formData = new FormData(event.currentTarget);
    const shippingName = formData.get("name") as string;
    const shippingEmail = formData.get("email") as string;
    const shippingPhone = formData.get("phone") as string;
    const shippingAddress = formData.get("address") as string;
    const shippingCity = (formData.get("city") as string) || "";
    const shippingCp = (formData.get("postal_code") as string) || postalCode || "";
    const orderNotes = formData.get("notes") as string;

    const fullAddress = `${shippingAddress}${shippingCity ? `, ${shippingCity}` : ""}${shippingCp ? ` (CP: ${shippingCp})` : ""}${selectedShippingOption ? ` - [${selectedShippingOption.name} / ${selectedShippingOption.carrier}]` : ""}`;

    const lines = cart.map((line) => ({
      productId: line.product.id,
      quantity: line.quantity,
      channel: line.channel,
    }));

    setErrorMsg(null);
    startTransition(async () => {
      try {
        const result = await createOrderAction(
          profile?.id ?? null,
          paymentMethod,
          shippingName,
          shippingPhone,
          fullAddress,
          cartTotal,
          shipping,
          total,
          lines,
          shippingEmail,
          orderNotes
        );
        setOrderCode(result.trackingCode);

        // Fire Purchase conversion event for Meta Pixel, Google Ads, TikTok
        trackAdsEvent("Purchase", {
          transaction_id: result.trackingCode,
          value: total,
          currency: "ARS",
          items: cart.map((l) => ({
            id: l.product.id,
            title: l.product.title,
            quantity: l.quantity,
            price: l.channel === "wholesale" ? l.product.wholesalePrice : l.product.retailPrice,
          })),
        });

        clearCart();
      } catch (err: any) {
        setErrorMsg(err.message || "Error al registrar el pedido.");
      }
    });
  }

  if (orderCode) {
    const whatsappOrderConfirmedText = `Hola MYA Importaciones! Acabo de registrar el pedido #${orderCode}. Les escribo para coordinar la entrega y enviar el comprobante de pago.`;

    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8 animate-in fade-in duration-300">
        <div className="rounded-2xl border border-emerald-200 bg-white p-8 text-center shadow-lg">
          <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-600" />
          <h1 className="mt-4 text-3xl font-extrabold text-zinc-950">
            ¡Pedido Confirmado en MYA Importaciones!
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            Tu código de pedido y seguimiento oficial es:
          </p>
          <p className="mt-3 inline-block rounded-xl bg-zinc-100 border border-zinc-200 px-6 py-3 font-mono text-2xl font-black text-zinc-950 shadow-inner">
            {orderCode}
          </p>

          <div className="mt-6 rounded-xl bg-sky-50 border border-sky-200 p-5 max-w-md mx-auto text-left text-xs text-sky-950 space-y-1.5">
            <p className="font-bold text-sm text-sky-900">Datos para la Transferencia Bancaria:</p>
            <p><strong>Banco:</strong> {siteConfig.bankTransfer.bank}</p>
            <p><strong>Alias:</strong> <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-sky-300">{siteConfig.bankTransfer.alias}</span></p>
            <p><strong>CBU:</strong> <span className="font-mono">{siteConfig.bankTransfer.cbu}</span></p>
            <p><strong>Titular:</strong> {siteConfig.bankTransfer.holder}</p>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href={getWhatsAppUrl(whatsappOrderConfirmedText)}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 text-sm font-bold text-white hover:bg-emerald-700 transition shadow-md cursor-pointer"
            >
              <MessageCircle className="h-5 w-5" />
              Enviar Comprobante por WhatsApp
            </a>
            <Link
              className="w-full sm:w-auto inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-white px-6 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 transition"
              href={`/seguimiento?code=${orderCode}`}
            >
              <Search className="h-4 w-4 text-zinc-500" />
              Rastrear Pedido en Vivo
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700">
          <ShieldCheck className="h-4 w-4" />
          Compra Protegida &bull; MYA Importaciones
        </div>
        <h1 className="mt-1 text-3xl font-black text-zinc-950 tracking-tight sm:text-4xl">
          Finalizar Compra
        </h1>
        <p className="text-xs text-zinc-500 mt-1">
          Podés completar tus datos como invitado o con tu cuenta sin necesidad de contraseñas.
        </p>
      </div>

      <form className="grid gap-6 lg:grid-cols-[1fr_420px]" onSubmit={handleSubmit}>
        <section className="space-y-6">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs">
            {errorMsg && (
              <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-800">
                {errorMsg}
              </div>
            )}

            {!isWholesaleValid && (
              <div className="mb-6 rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900 leading-relaxed">
                El pedido mínimo para compra mayorista es de <strong>{formatCurrency(minWholesaleLimit)}</strong>.<br />
                Tu subtotal mayorista actual es <strong>{formatCurrency(wholesaleTotal)}</strong>. Por favor, vuelve a la tienda para añadir más productos mayoristas o remueve los artículos mayoristas de tu carrito.
              </div>
            )}

            <h2 className="text-base font-bold text-zinc-950 flex items-center gap-2">
              <Truck className="h-5 w-5 text-zinc-500" />
              Datos de entrega y contacto
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1.5 text-xs font-semibold text-zinc-700">
                Nombre y Apellido *
                <input
                  className="h-11 rounded-xl border border-zinc-300 px-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 bg-white"
                  name="name"
                  required
                  placeholder="Ej: Juan Pérez"
                  defaultValue={profile?.fullName ?? ""}
                  type="text"
                />
              </label>

              <label className="grid gap-1.5 text-xs font-semibold text-zinc-700">
                WhatsApp / Teléfono *
                <input
                  className="h-11 rounded-xl border border-zinc-300 px-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 bg-white"
                  name="phone"
                  required
                  placeholder="Ej: 11 2345-6789"
                  defaultValue=""
                  type="tel"
                />
              </label>

              <label className="grid gap-1.5 text-xs font-semibold text-zinc-700 sm:col-span-2">
                Email (para comprobante y seguimiento)
                <input
                  className="h-11 rounded-xl border border-zinc-300 px-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 bg-white"
                  name="email"
                  placeholder="ejemplo@correo.com"
                  defaultValue={profile?.email ?? ""}
                  type="email"
                />
              </label>
            </div>

            {/* Postal Code & Carrier Selection */}
            <div className="mt-5 pt-4 border-t border-zinc-200 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="text-xs font-bold text-zinc-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Truck className="h-4 w-4 text-sky-600" /> Código Postal de Envío *
                </label>
                {shippingCalculation.isValid && (
                  <span className="text-xs font-bold text-sky-700 bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-200">
                    📍 {shippingCalculation.locationName}
                  </span>
                )}
              </div>

              <div className="flex gap-2 max-w-sm">
                <input
                  type="text"
                  name="postal_code"
                  required
                  placeholder="Ingresá tu CP (ej: 7000, 1425 o B1640)"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  className="h-11 w-full rounded-xl border border-zinc-300 px-3 text-sm bg-white outline-none focus:border-sky-500 font-medium"
                />
              </div>

              {shippingCalculation.isValid && (
                <div className="space-y-2 pt-2">
                  <span className="text-xs font-bold text-zinc-700 block">
                    Seleccioná el método de transporte:
                  </span>
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {shippingCalculation.options.map((opt) => {
                      const isSelected = selectedShippingOptionId === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setSelectedShippingOptionId(opt.id)}
                          className={`flex items-start justify-between p-3.5 rounded-xl border text-left transition cursor-pointer ${
                            isSelected
                              ? "border-sky-500 bg-sky-50/70 ring-2 ring-sky-500/20 shadow-xs"
                              : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50"
                          }`}
                        >
                          <div className="space-y-0.5 pr-2 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-xs text-zinc-950">{opt.name}</span>
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
                            <p className="text-[11px] text-zinc-500">{opt.carrier}</p>
                            <p className="text-[10px] text-zinc-400">Plazo: {opt.estimatedDays}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            {opt.isFree ? (
                              <div className="flex flex-col items-end">
                                {opt.originalPrice > 0 && (
                                  <span className="text-[10px] line-through text-zinc-400">
                                    {formatCurrency(opt.originalPrice)}
                                  </span>
                                )}
                                <span className="font-black text-xs text-emerald-700">GRATIS</span>
                              </div>
                            ) : (
                              <span className="font-black text-xs text-zinc-950">
                                {formatCurrency(opt.price)}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Address fields */}
            <div className="mt-5 pt-4 border-t border-zinc-200 grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1.5 text-xs font-semibold text-zinc-700 sm:col-span-2">
                Dirección de entrega (Calle y número) *
                <input
                  className="h-11 rounded-xl border border-zinc-300 px-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 bg-white"
                  name="address"
                  required
                  placeholder="Calle, número, piso, depto (o retiro en sucursal si elegiste correo)"
                  defaultValue=""
                  type="text"
                />
              </label>

              <label className="grid gap-1.5 text-xs font-semibold text-zinc-700">
                Localidad y Provincia
                <input
                  className="h-11 rounded-xl border border-zinc-300 px-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 bg-white"
                  name="city"
                  placeholder="Ej: Tandil, Buenos Aires"
                  defaultValue={shippingCalculation.locationName || ""}
                  type="text"
                />
              </label>

              <label className="grid gap-1.5 text-xs font-semibold text-zinc-700">
                Notas adicionales para el repartidor (Opcional)
                <input
                  className="h-11 rounded-xl border border-zinc-300 px-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 bg-white"
                  name="notes"
                  placeholder="Entre calles, timbre, color de reja..."
                  defaultValue=""
                  type="text"
                />
              </label>
            </div>
          </div>

          {/* Payment method selection */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-zinc-950 flex items-center gap-2">
                <Landmark className="h-5 w-5 text-zinc-500" />
                Medio de pago
              </h2>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                10% OFF en Transferencia / Efectivo
              </span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {paymentOptions.map((option) => (
                <button
                  className={`flex items-center justify-between rounded-xl border p-4 text-left transition cursor-pointer ${
                    paymentMethod === option.value
                      ? "border-sky-500 bg-sky-50/50 ring-2 ring-sky-500/20"
                      : "border-zinc-200 hover:border-zinc-300 bg-white"
                  }`}
                  key={option.value}
                  onClick={() => setPaymentMethod(option.value)}
                  type="button"
                  disabled={isPending}
                >
                  <div className="flex items-center gap-3">
                    <option.icon className={`h-5 w-5 ${paymentMethod === option.value ? "text-sky-600" : "text-zinc-500"}`} />
                    <span className="text-sm font-semibold text-zinc-950">
                      {formatPaymentMethod(option.value)}
                    </span>
                  </div>
                  {option.badge && (
                    <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-xs">
                      {option.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <input name="payment_method" type="hidden" value={paymentMethod} />

            {paymentMethod === "transferencia" && (
              <div className="mt-5 rounded-xl bg-sky-50 border border-sky-200 p-4 text-xs text-sky-950 space-y-1.5 animate-in fade-in duration-200">
                <p className="font-bold text-sm text-sky-900">Datos para la transferencia:</p>
                <p><strong>Banco:</strong> {siteConfig.bankTransfer.bank}</p>
                <p><strong>Alias:</strong> <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-sky-300">{siteConfig.bankTransfer.alias}</span></p>
                <p><strong>CBU:</strong> <span className="font-mono">{siteConfig.bankTransfer.cbu}</span></p>
                <p><strong>Titular:</strong> {siteConfig.bankTransfer.holder}</p>
                <p className="text-[11px] text-zinc-500 pt-1">
                  Al confirmar el pedido se reservará tu stock y podrás enviar el comprobante directamente por WhatsApp con tu número de orden.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Order Summary Sidebar */}
        <aside className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs h-fit sticky top-20">
          <h2 className="text-base font-bold text-zinc-950">Resumen del Pedido</h2>
          <div className="mt-4 divide-y divide-zinc-100 max-h-64 overflow-y-auto">
            {orderLines.length === 0 ? (
              <p className="text-xs text-zinc-500 py-3">No hay productos en el carrito.</p>
            ) : (
              orderLines.map((line) => (
                <div
                  className="flex items-start justify-between gap-3 text-xs py-2.5"
                  key={`${line.title}-${line.channel}`}
                >
                  <span className="text-zinc-650 flex-1">
                    {line.quantity} × {line.title}
                    <span className="ml-1 text-[9px] uppercase px-1 py-0.2 rounded bg-zinc-100 text-zinc-600 font-bold">
                      {line.channel === "wholesale" ? "May" : "Min"}
                    </span>
                  </span>
                  <span className="font-bold text-zinc-950">
                    {formatCurrency(line.subtotal)}
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="mt-4 space-y-2 border-t border-zinc-200 pt-4 text-xs text-zinc-600">
            {hasWholesale && (
              <div className="flex justify-between text-zinc-500">
                <span>Subtotal Mayorista</span>
                <span>{formatCurrency(wholesaleTotal)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Subtotal Productos</span>
              <span className="font-semibold text-zinc-900">{formatCurrency(cartTotal)}</span>
            </div>

            {discountAmount > 0 && (
              <div className="flex justify-between text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200">
                <span className="flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5" /> Descuento 10% Transferencia
                </span>
                <span>-{formatCurrency(discountAmount)}</span>
              </div>
            )}

            <div className="flex justify-between items-center">
              <div>
                <span>Envío</span>
                {selectedShippingOption && (
                  <p className="text-[10px] text-zinc-400 font-medium">
                    {selectedShippingOption.name} ({selectedShippingOption.carrier})
                  </p>
                )}
              </div>
              <span className="font-semibold text-zinc-900">
                {shipping === 0 ? (
                  <span className="text-emerald-700 font-bold">GRATIS</span>
                ) : (
                  formatCurrency(shipping)
                )}
              </span>
            </div>

            <div className="flex justify-between text-base font-black text-zinc-950 border-t border-zinc-200 pt-3">
              <span>Total Final</span>
              <span className="text-xl text-zinc-950">{formatCurrency(total)}</span>
            </div>
          </div>

          <Button 
            className="mt-6 w-full cursor-pointer flex items-center justify-center gap-2 bg-zinc-950 hover:bg-zinc-800 text-white h-12 rounded-xl text-sm font-bold shadow-md" 
            disabled={cart.length === 0 || !isWholesaleValid || isPending} 
            type="submit"
          >
            {isPending && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
            {isPending ? "Procesando pedido..." : "Confirmar Pedido"}
          </Button>

          <div className="mt-4 pt-4 border-t border-zinc-100 text-center">
            <a
              href={getWhatsAppUrl(
                `Hola MYA Importaciones! Armé mi pedido en la web y quisiera gestionarlo directamente por WhatsApp:\n\n${cart.map((c) => `• ${c.quantity}x ${c.product.title} (${formatCurrency(c.channel === 'wholesale' ? c.product.wholesalePrice : c.product.retailPrice)})`).join('\n')}\n\n*Total estimado: ${formatCurrency(total)}* (${paymentMethod === 'transferencia' ? 'Con 10% OFF por Transferencia' : 'Precio regular'})`
              )}
              target="_blank"
              rel="noopener noreferrer"
              className={`w-full inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs cursor-pointer ${
                cart.length === 0 || !isWholesaleValid ? "opacity-50 pointer-events-none" : ""
              }`}
            >
              <MessageCircle className="h-4 w-4" />
              Pedir directo por WhatsApp
            </a>
            <p className="text-[10px] text-zinc-400 mt-2">
              Atención personalizada de lunes a sábados.
            </p>
          </div>
        </aside>
      </form>
    </div>
  );
}
