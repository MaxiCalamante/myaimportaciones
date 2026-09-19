"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import { CheckCircle2, CreditCard, Landmark, MessageCircle, Receipt, Wallet } from "lucide-react";
import { formatCurrency, formatPaymentMethod } from "@/lib/format";
import type { PaymentMethod } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { useCommerce } from "@/components/commerce/commerce-provider";
import { createOrderAction } from "@/app/checkout/actions";
import { siteConfig, getWhatsAppUrl } from "@/lib/site";
import type { Profile } from "@/lib/auth";

const paymentOptions: Array<{ value: PaymentMethod; icon: typeof CreditCard }> = [
  { value: "transferencia", icon: Landmark },
  { value: "tarjeta", icon: CreditCard },
  { value: "mercado_pago", icon: Wallet },
  { value: "efectivo", icon: Receipt },
];

export function CheckoutPanel({ profile }: { profile: Profile | null }) {
  const { cart, cartTotal, clearCart, shippingCost } = useCommerce();
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("transferencia");
  const [orderCode, setOrderCode] = useState<string | null>(null);
  
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const shipping = shippingCost;
  const total = cartTotal + shipping;

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
    if (!profile) {
      setErrorMsg("Debe iniciar sesión para realizar un pedido.");
      return;
    }

    const formData = new FormData(event.currentTarget);
    const shippingName = formData.get("name") as string;
    const shippingEmail = formData.get("email") as string;
    const shippingPhone = formData.get("phone") as string;
    const shippingAddress = formData.get("address") as string;

    const lines = cart.map((line) => ({
      productId: line.product.id,
      quantity: line.quantity,
      channel: line.channel,
    }));

    setErrorMsg(null);
    startTransition(async () => {
      try {
        const result = await createOrderAction(
          profile.id,
          paymentMethod,
          shippingName,
          shippingPhone,
          shippingAddress,
          cartTotal,
          shipping,
          total,
          lines
        );
        setOrderCode(result.trackingCode);
        clearCart();
      } catch (err: any) {
        setErrorMsg(err.message || "Error al registrar el pedido.");
      }
    });
  }

  if (orderCode) {
    const whatsappOrderConfirmedText = `Hola MYA Importaciones! Acabo de registrar el pedido #${orderCode}. Les escribo para coordinar la entrega y enviar el comprobante de pago.`;

    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-emerald-200 bg-white p-8 text-center shadow-lg">
          <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-600" />
          <h1 className="mt-4 text-3xl font-extrabold text-zinc-950">
            ¡Pedido Confirmado en MYA Importaciones!
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            Tu código de pedido y seguimiento oficial es:
          </p>
          <p className="mt-3 inline-block rounded-xl bg-zinc-100 border border-zinc-200 px-5 py-2.5 font-mono text-2xl font-black text-zinc-950">
            {orderCode}
          </p>

          <div className="mt-6 rounded-xl bg-sky-50 border border-sky-200 p-4 max-w-md mx-auto text-left text-xs text-sky-950 space-y-1">
            <p className="font-bold text-sky-900">Transferencia Bancaria:</p>
            <p><strong>Alias:</strong> <span className="font-mono font-bold bg-white px-1.5 py-0.5 rounded">{siteConfig.bankTransfer.alias}</span></p>
            <p><strong>Titular:</strong> {siteConfig.bankTransfer.holder}</p>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href={getWhatsAppUrl(whatsappOrderConfirmedText)}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 text-sm font-bold text-white hover:bg-emerald-700 transition shadow-md"
            >
              <MessageCircle className="h-5 w-5" />
              Enviar Comprobante por WhatsApp
            </a>
            <a
              className="w-full sm:w-auto inline-flex h-12 items-center justify-center rounded-xl border border-zinc-300 bg-white px-6 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 transition"
              href="/cuenta"
            >
              Ver en Mi Cuenta
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase text-emerald-700">
          Checkout
        </p>
        <h1 className="mt-2 text-3xl font-bold text-zinc-950">
          Finalizar compra
        </h1>
      </div>

      <form className="grid gap-6 lg:grid-cols-[1fr_420px]" onSubmit={handleSubmit}>
        <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
          {errorMsg && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800">
              {errorMsg}
            </div>
          )}

          {!isWholesaleValid && (
            <div className="mb-6 rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900 leading-relaxed">
              El pedido mínimo para compra mayorista es de <strong>{formatCurrency(minWholesaleLimit)}</strong>.<br />
              Tu subtotal mayorista actual es <strong>{formatCurrency(wholesaleTotal)}</strong>. Por favor, vuelve a la tienda para añadir más productos mayoristas o remueve los artículos mayoristas de tu carrito.
            </div>
          )}

          <h2 className="text-lg font-bold text-zinc-950">Datos de entrega</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {[
              { label: "Nombre", name: "name", type: "text", defaultValue: profile?.fullName ?? "" },
              { label: "Email", name: "email", type: "email", defaultValue: profile?.email ?? "" },
              { label: "Teléfono", name: "phone", type: "tel", defaultValue: "" },
              { label: "Dirección", name: "address", type: "text", defaultValue: "" },
            ].map((field) => (
              <label className="grid gap-2 text-sm font-medium text-zinc-700" key={field.name}>
                {field.label}
                <input
                  className="h-11 rounded-lg border border-zinc-300 px-3 outline-none focus:border-emerald-600 bg-white"
                  name={field.name}
                  required
                  defaultValue={field.defaultValue}
                  type={field.type}
                />
              </label>
            ))}
          </div>

          <h2 className="mt-8 text-lg font-bold text-zinc-950">Pago</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {paymentOptions.map((option) => (
              <button
                className={`flex items-center gap-3 rounded-lg border p-4 text-left transition ${
                  paymentMethod === option.value
                    ? "border-emerald-600 bg-emerald-50"
                    : "border-zinc-200 hover:border-zinc-300"
                }`}
                key={option.value}
                onClick={() => setPaymentMethod(option.value)}
                type="button"
                disabled={isPending}
              >
                <option.icon className="h-5 w-5 text-emerald-700" />
                <span className="text-sm font-semibold text-zinc-950">
                  {formatPaymentMethod(option.value)}
                </span>
              </button>
            ))}
          </div>
          <input name="payment_method" type="hidden" value={paymentMethod} />

          {paymentMethod === "transferencia" && (
            <div className="mt-4 rounded-xl bg-sky-50 border border-sky-200 p-4 text-xs text-sky-950 space-y-1.5">
              <p className="font-bold text-sm text-sky-900">Datos para la transferencia bancaria:</p>
              <p><strong>Banco:</strong> {siteConfig.bankTransfer.bank}</p>
              <p><strong>Alias:</strong> <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-sky-300">{siteConfig.bankTransfer.alias}</span></p>
              <p><strong>CBU:</strong> <span className="font-mono">{siteConfig.bankTransfer.cbu}</span></p>
              <p><strong>Titular:</strong> {siteConfig.bankTransfer.holder}</p>
              <p className="text-[11px] text-zinc-500 pt-1">
                Al confirmar el pedido se reservará tu stock y podrás enviar el comprobante directamente por WhatsApp con tu número de orden.
              </p>
            </div>
          )}
        </section>

        <aside className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-zinc-950">Resumen</h2>
          <div className="mt-5 grid gap-3">
            {orderLines.length === 0 ? (
              <p className="text-sm text-zinc-500">No hay productos en el carrito.</p>
            ) : (
              orderLines.map((line) => (
                <div
                  className="flex items-start justify-between gap-3 text-sm"
                  key={`${line.title}-${line.channel}`}
                >
                  <span className="text-zinc-650">
                    {line.quantity} x {line.title}
                    <span className="ml-1.5 text-[10px] uppercase px-1 py-0.5 rounded bg-zinc-105 text-zinc-500 font-medium">
                      {line.channel === "wholesale" ? "May" : "Min"}
                    </span>
                  </span>
                  <span className="font-semibold text-zinc-950">
                    {formatCurrency(line.subtotal)}
                  </span>
                </div>
              ))
            )}
          </div>
          <div className="mt-5 space-y-2 border-t border-zinc-200 pt-5 text-sm">
            {hasWholesale && (
              <div className="flex justify-between text-xs text-zinc-500">
                <span>Subtotal Mayorista</span>
                <span>{formatCurrency(wholesaleTotal)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-zinc-500">Subtotal General</span>
              <span className="font-semibold">{formatCurrency(cartTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Envío</span>
              <span className="font-semibold">
                {shipping === 0 ? "Bonificado" : formatCurrency(shipping)}
              </span>
            </div>
            <div className="flex justify-between text-base font-bold text-zinc-950 border-t border-zinc-100 pt-2">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
          <Button 
            className="mt-5 w-full cursor-pointer flex items-center justify-center gap-2 bg-zinc-950 hover:bg-zinc-800 text-white" 
            disabled={cart.length === 0 || !isWholesaleValid || isPending} 
            type="submit"
          >
            {isPending && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
            {isPending ? "Procesando pedido..." : "Confirmar pedido en la Web"}
          </Button>

          <div className="mt-3 pt-3 border-t border-zinc-100 text-center">
            <a
              href={getWhatsAppUrl(
                `Hola MYA Importaciones! Armé mi carrito y quisiera confirmar el pedido por WhatsApp:\n\n${cart.map((c) => `• ${c.quantity}x ${c.product.title} (${formatCurrency(c.channel === 'wholesale' ? c.product.wholesalePrice : c.product.retailPrice)})`).join('\n')}\n\n*Total a pagar: ${formatCurrency(total)}*`
              )}
              target="_blank"
              rel="noopener noreferrer"
              className={`w-full inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold transition shadow-sm ${
                cart.length === 0 || !isWholesaleValid ? "opacity-50 pointer-events-none" : ""
              }`}
            >
              <MessageCircle className="h-4 w-4" />
              Pedir directo por WhatsApp
            </a>
          </div>
        </aside>
      </form>
    </div>
  );
}
