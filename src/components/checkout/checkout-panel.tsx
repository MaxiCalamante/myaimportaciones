"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import type { Profile } from "@/lib/auth";
import type { OrderQuote } from "@/lib/order-pricing";
import { createOrderAction, quoteOrderAction, type CheckoutInput } from "@/app/checkout/actions";
import { useCommerce } from "@/components/commerce/commerce-provider";
import { formatCurrency } from "@/lib/format";
import { siteConfig, getWhatsAppUrl } from "@/lib/site";
import { trackAdsEvent } from "@/lib/analytics";
import {
  CORREO_ARGENTINO_PROVINCES,
  inferProvinceFromPostalCode,
} from "@/lib/correo-argentino/provinces";

export function CheckoutPanel({ profile, checkoutEnabled, mercadoPagoEnabled }: { profile: Profile | null; checkoutEnabled: boolean; mercadoPagoEnabled: boolean }) {
  const {
    cart,
    cartTotal,
    clearCart,
    postalCode,
    setPostalCode,
    province,
    setProvince,
    city,
    setCity,
    shippingCalculation,
    selectedShippingOption,
    setSelectedShippingOptionId,
  } = useCommerce();

  const [address, setAddress] = useState("");
  const [paymentMethod, setPayment] = useState<CheckoutInput["paymentMethod"]>("transferencia");
  const [coupon, setCoupon] = useState("");
  const [quote, setQuote] = useState<OrderQuote | null>(null);
  const [quotedKey, setQuotedKey] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<Awaited<ReturnType<typeof createOrderAction>> | null>(null);
  const [pending, startTransition] = useTransition();
  const requestId = useRef("");
  const initiated = useRef(false);

  const input: CheckoutInput = {
    lines: cart.map(l => ({ productId: l.product.id, quantity: l.quantity, channel: l.channel })),
    paymentMethod,
    postalCode,
    province,
    city,
    address,
    shippingOptionId: selectedShippingOption?.id ?? "",
    coupon,
  };

  const key = JSON.stringify(input);
  const validQuote = quote && key === quotedKey;
  const pickup = selectedShippingOption?.type === "pickup";

  useEffect(() => {
    if (!initiated.current && cart.length) {
      initiated.current = true;
      trackAdsEvent("InitiateCheckout", { value: cartTotal, num_items: cart.length });
    }
  }, [cart.length, cartTotal]);

  const refreshQuote = () => startTransition(async () => {
    setError("");
    setQuote(null);
    try {
      const response = await quoteOrderAction(input);
      if (response.ok) {
        setQuote(response.quote);
        setQuotedKey(key);
        if (!requestId.current || quotedKey !== key) requestId.current = crypto.randomUUID();
      } else {
        setError(response.error);
      }
    } catch {
      setError("No pudimos calcular el total. Revisá tu conexión e intentá nuevamente.");
    }
  });

  const field = "mt-1 w-full rounded-xl border border-slate-300 bg-white p-3 text-slate-950 focus:border-sky-600 focus:outline-none focus:ring-1 focus:ring-sky-600 text-sm";

  if (result) return (
    <section className="mx-auto max-w-2xl space-y-5 px-4 py-12">
      <h1 className="text-3xl font-bold">Pedido registrado</h1>
      <p>Tu pedido está pendiente de pago o confirmación. Guardá este código:</p>
      <p className="break-all rounded-xl bg-sky-50 p-4 font-mono font-bold text-sky-950 text-lg">{result.trackingCode}</p>
      <p>Total a abonar: <strong className="text-xl text-zinc-950">{formatCurrency(result.total)}</strong></p>
      <p className="text-sm text-zinc-600">Reserva válida hasta {new Date(result.expiresAt).toLocaleString("es-AR")}. No transfieras después de ese plazo sin consultarnos.</p>
      {quote?.shippingQuotedSeparately && (
        <p className="rounded-xl bg-sky-50 p-4 text-sm text-sky-900">
          El total corresponde a los productos. Enviamos a todo el país: MYA coordinará con vos el costo y plazo del envío, que se abona por separado.
        </p>
      )}
      {result.paymentError && <p role="alert" className="rounded-xl bg-amber-50 p-4 text-amber-900">{result.paymentError}</p>}
      {result.initPoint && (
        <a className="block rounded-xl bg-sky-700 p-4 text-center font-bold text-white hover:bg-sky-800 transition-colors shadow-sm" href={result.initPoint}>
          Continuar y pagar en Mercado Pago
        </a>
      )}
      {paymentMethod === "transferencia" && (
        <div className="rounded-xl border p-4 bg-zinc-50/50">
          <p className="break-all">CVU: <strong>{siteConfig.bankTransfer.cvu}</strong></p>
          <p className="mt-2 text-sm text-zinc-600">La transferencia se confirma después de verificar la acreditación.</p>
          <a
            className="mt-4 block rounded-xl bg-emerald-600 p-3 text-center font-bold text-white hover:bg-emerald-700 transition-colors"
            href={getWhatsAppUrl(`Hola MYA, hice la transferencia del pedido ${result.trackingCode} por ${formatCurrency(result.total)}. Adjunto el comprobante para que verifiquen la acreditación.`)}
            target="_blank"
            rel="noopener noreferrer"
          >
            Enviar comprobante por WhatsApp
          </a>
          <p className="mt-2 text-xs text-zinc-600">Se abrirá el chat con el pedido escrito. Adjuntá la foto o PDF del comprobante antes de enviar. El pedido seguirá pendiente hasta que confirmemos el ingreso del dinero.</p>
        </div>
      )}
      <div className="pt-2 flex flex-col sm:flex-row gap-3">
        <Link href={`/seguimiento?code=${result.trackingCode}`} className="block text-sky-700 font-semibold underline">Consultar estado con mi email</Link>
        <span className="hidden sm:inline text-zinc-300">•</span>
        <a href={getWhatsAppUrl(`Hola MYA! Consulto por mi pedido ${result.trackingCode}.`)} target="_blank" rel="noopener noreferrer" className="block text-sky-700 font-semibold underline">Contactar a MYA</a>
      </div>
    </section>
  );

  return (
    <section className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold">Finalizar compra</h1>
      <p className="mt-2 text-slate-600">Completá tus datos de entrega por Correo Argentino y calculá el total antes de pagar.</p>

      {!checkoutEnabled && (
        <div role="status" className="my-5 rounded-xl bg-amber-50 p-4 text-amber-900 border border-amber-200">
          La compra online está en preparación. <a className="underline font-bold" href={getWhatsAppUrl("Hola MYA! Quisiera consultar disponibilidad y entrega de un producto.")} target="_blank" rel="noopener noreferrer">Consultanos por WhatsApp</a> antes de realizar un pago.
        </div>
      )}

      {!cart.length ? (
        <p className="mt-8">Tu carrito está vacío. <Link href="/catalogo" className="text-sky-700 underline font-semibold">Explorar productos</Link></p>
      ) : !checkoutEnabled ? (
        <div className="mt-8 grid items-start gap-6 lg:grid-cols-[1fr_340px]">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-7">
            <h2 className="text-xl font-bold text-zinc-950">Coordiná tu compra</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600">Confirmamos disponibilidad, costo y plazo de entrega por Correo Argentino según tu destino antes de indicarte cómo pagar.</p>
            <a className="mt-6 block rounded-xl bg-emerald-600 px-5 py-3 text-center font-bold text-white hover:bg-emerald-700" target="_blank" rel="noopener noreferrer" href={getWhatsAppUrl(`Hola MYA, quisiera confirmar disponibilidad y entrega de: ${cart.map(line => `${line.quantity} x ${line.product.title}`).join("; ")}. Subtotal de referencia ${formatCurrency(cartTotal)}.`)}>Consultar este carrito por WhatsApp</a>
            <Link href="/catalogo" className="mt-4 inline-block text-sm font-semibold text-sky-700 underline underline-offset-2">Seguir viendo productos</Link>
          </div>
          <aside className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-7">
            <h2 className="text-xl font-bold">Resumen del carrito</h2>
            <div className="mt-4 space-y-4">{cart.map(l => <p key={`${l.product.id}-${l.channel}`} className="border-b border-zinc-100 pb-3 text-sm text-zinc-700">{l.quantity} × {l.product.title}<strong className="mt-1 block text-zinc-950">{formatCurrency(l.quantity * (l.channel === "wholesale" ? l.product.wholesalePrice : l.product.retailPrice))}</strong></p>)}</div>
            <p className="mt-4 flex justify-between font-bold"><span>Subtotal de referencia</span><span>{formatCurrency(cartTotal)}</span></p>
            <p className="mt-2 text-xs text-zinc-500">Entrega y precio final sujetos a confirmación.</p>
          </aside>
        </div>
      ) : (
        <form
          className="mt-8 grid items-start gap-8 lg:grid-cols-[1fr_380px]"
          onSubmit={e => {
            e.preventDefault();
            if (!validQuote || !checkoutEnabled || pending) return;
            const form = new FormData(e.currentTarget);
            startTransition(async () => {
              setError("");
              try {
                const response = await createOrderAction({
                  ...input,
                  province,
                  city: city.trim() || String(form.get("city") ?? "").trim(),
                  address: address.trim() || String(form.get("address") ?? "").trim(),
                  name: String(form.get("name") ?? "").trim(),
                  email: String(form.get("email") ?? "").trim(),
                  phone: String(form.get("phone") ?? "").trim(),
                  notes: String(form.get("notes") ?? "").trim(),
                  acceptSeparateShipping: form.get("separate_shipping") === "on",
                  requestId: requestId.current,
                  expectedTotal: quote!.total,
                });
                setResult(response);
                clearCart();
              } catch (err) {
                setError(err instanceof Error ? err.message : "No pudimos registrar el pedido.");
              }
            });
          }}
        >
          <div className="space-y-6 rounded-2xl border bg-white p-5 sm:p-7 shadow-xs">
            <div>
              <h2 className="text-xl font-bold text-zinc-950">1. Datos de entrega (Correo Argentino)</h2>
              <p className="text-xs text-zinc-500 mt-1">Ingresá tu ubicación para calcular el costo de envío a tu domicilio o sucursal.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block">
                <span className="font-semibold text-xs text-zinc-700">Provincia</span>
                <select
                  className={field}
                  value={province}
                  onChange={e => {
                    const code = e.target.value;
                    setProvince(code);
                  }}
                  required
                >
                  <option value="">Seleccioná tu provincia...</option>
                  {CORREO_ARGENTINO_PROVINCES.map(p => (
                    <option key={p.code} value={p.code}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="font-semibold text-xs text-zinc-700">Código Postal</span>
                <input
                  className={field}
                  value={postalCode}
                  onChange={e => {
                    const val = e.target.value;
                    setPostalCode(val);
                    if (!province) {
                      const inferred = inferProvinceFromPostalCode(val);
                      if (inferred) setProvince(inferred.code);
                    }
                  }}
                  required
                  maxLength={12}
                  placeholder="Ej. 7000 o 1425"
                  autoComplete="postal-code"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block">
                <span className="font-semibold text-xs text-zinc-700">Ciudad / Localidad</span>
                <input
                  className={field}
                  name="city"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  required
                  maxLength={120}
                  placeholder="Ej. Tandil, Córdoba, Rosario..."
                />
              </label>

              {!pickup && (
                <label className="block">
                  <span className="font-semibold text-xs text-zinc-700">
                    {selectedShippingOption?.type === "sucursal"
                      ? "Sucursal Correo Argentino / Barrio"
                      : "Calle y altura (domicilio)"}
                  </span>
                  <input
                    className={field}
                    name="address"
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    required
                    maxLength={300}
                    placeholder={
                      selectedShippingOption?.type === "sucursal"
                        ? "Ej. Sucursal Centro o dirección"
                        : "Ej. San Martín 450, Piso 2 B"
                    }
                    autoComplete="street-address"
                  />
                </label>
              )}
            </div>

            {shippingCalculation.isValid && (
              <label className="block">
                <span className="font-semibold text-xs text-zinc-700">Modalidad de entrega</span>
                <select
                  className={field}
                  value={selectedShippingOption?.id ?? ""}
                  onChange={e => setSelectedShippingOptionId(e.target.value)}
                >
                  {shippingCalculation.options.map(o => (
                    <option key={o.id} value={o.id}>
                      {o.name} ({o.carrier}) — {o.requiresQuote ? "A cotizar" : formatCurrency(o.price)}
                    </option>
                  ))}
                </select>
                <span className="mt-2 block text-xs text-slate-600">
                  📦 <strong>{selectedShippingOption?.name}:</strong> {selectedShippingOption?.estimatedDays}. Despacho oficial por Correo Argentino con código de seguimiento nacional.
                </span>
              </label>
            )}

            {pickup && (
              <div className="rounded-xl bg-sky-50 border border-sky-100 p-3 text-xs text-sky-900">
                Coordinaremos dirección y horario de retiro en nuestro depósito de Tandil. No necesitás ingresar un domicilio de envío.
              </div>
            )}

            <div className="border-t border-zinc-100 pt-5">
              <h2 className="text-xl font-bold text-zinc-950">2. Datos de contacto</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block sm:col-span-2">
                <span className="font-semibold text-xs text-zinc-700">Nombre y apellido</span>
                <input className={field} name="name" autoComplete="name" required minLength={2} maxLength={120} defaultValue={profile?.fullName} placeholder="Como figura en tu DNI" />
              </label>
              <label className="block">
                <span className="font-semibold text-xs text-zinc-700">Email</span>
                <input className={field} name="email" type="email" autoComplete="email" required maxLength={254} defaultValue={profile?.email} placeholder="Para enviarte el seguimiento" />
              </label>
              <label className="block">
                <span className="font-semibold text-xs text-zinc-700">Teléfono / WhatsApp</span>
                <input className={field} name="phone" type="tel" autoComplete="tel" required minLength={8} maxLength={40} placeholder="Ej. 2494638919" />
              </label>
            </div>

            <label className="block">
              <span className="font-semibold text-xs text-zinc-700">Notas u observaciones (opcional)</span>
              <textarea className={field} name="notes" maxLength={1000} placeholder="Indicaciones para el cartero, horarios de entrega o aclaraciones." rows={2} />
            </label>

            <div className="border-t border-zinc-100 pt-5">
              <h2 className="text-xl font-bold text-zinc-950">3. Medio de pago</h2>
              <select className={field} value={paymentMethod} onChange={e => setPayment(e.target.value as CheckoutInput["paymentMethod"])}>
                <option value="transferencia">Transferencia bancaria directa (con descuento extra)</option>
                <option value="mercado_pago" disabled={!mercadoPagoEnabled}>Tarjetas y dinero en cuenta con Mercado Pago{!mercadoPagoEnabled ? " — próximamente" : ""}</option>
              </select>
              {paymentMethod === "transferencia" && (
                <p className="mt-2 text-xs text-slate-600">Al confirmar verás el alias, CVU y el importe exacto para transferir. Verificamos la acreditación antes de preparar tu paquete.</p>
              )}
              {paymentMethod === "mercado_pago" && (
                <p className="mt-2 text-xs text-slate-600">Ingresás los datos de tu tarjeta únicamente en Mercado Pago. Podés pagar en cuotas según las promociones de tu banco.</p>
              )}
            </div>
          </div>

          <aside className="space-y-4 rounded-2xl border bg-white p-5 lg:sticky lg:top-24 shadow-xs">
            <h2 className="text-xl font-bold">Resumen de compra</h2>
            <div className="divide-y divide-zinc-100 max-h-56 overflow-y-auto pr-1">
              {cart.map(l => (
                <div key={l.product.id} className="py-2 text-xs">
                  <div className="flex justify-between font-medium text-zinc-800">
                    <span>{l.quantity} × {l.product.title}</span>
                    <span className="font-bold text-zinc-950">{formatCurrency(l.quantity * l.product.retailPrice)}</span>
                  </div>
                </div>
              ))}
            </div>

            <label className="block text-xs font-semibold text-zinc-700">
              Cupón de descuento (opcional)
              <input className={field} value={coupon} maxLength={30} onChange={e => setCoupon(e.target.value.toUpperCase())} placeholder="Ej. MYA5" />
            </label>

            <button
              type="button"
              disabled={pending || !checkoutEnabled}
              onClick={refreshQuote}
              className="w-full rounded-xl bg-sky-50 border border-sky-600 p-3 font-bold text-sky-800 hover:bg-sky-100 transition-colors disabled:opacity-40 text-sm"
            >
              {pending ? "Calculando total…" : "Calcular total con envío Correo Argentino"}
            </button>

            {validQuote && (
              <div aria-live="polite" className="space-y-2 rounded-xl bg-zinc-50 p-4 text-sm border border-zinc-200">
                <div className="flex justify-between text-zinc-600">
                  <span>Productos:</span>
                  <span>{formatCurrency(quote.subtotal)}</span>
                </div>
                <div className="flex justify-between text-zinc-600">
                  <span>Envío ({selectedShippingOption?.name || "Correo Argentino"}):</span>
                  <span>{quote.shippingQuotedSeparately ? "A cotizar por separado" : formatCurrency(quote.shipping)}</span>
                </div>
                {quote.discount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Descuento ({quote.promotion}):</span>
                    <span>−{formatCurrency(quote.discount)}</span>
                  </div>
                )}
                {quote.couponMessage && (
                  <p className="text-xs text-amber-700">{quote.couponMessage}</p>
                )}
                <div className="border-t border-zinc-200 pt-2 flex justify-between text-lg font-black text-zinc-950">
                  <span>{quote.shippingQuotedSeparately ? "Total de productos:" : "Total final:"}</span>
                  <span>{formatCurrency(quote.total)}</span>
                </div>
              </div>
            )}

            {validQuote && quote.shippingQuotedSeparately && (
              <label className="flex items-start gap-2 rounded-xl bg-sky-50 p-3 text-xs text-sky-900 border border-sky-100">
                <input className="mt-0.5" type="checkbox" name="separate_shipping" required />
                <span>Entiendo que este pago corresponde a los productos y que el envío a domicilio se cotiza y abona por separado, coordinándolo con MYA.</span>
              </label>
            )}

            {!validQuote && (
              <p className="text-xs text-zinc-500 text-center">
                Completá tu provincia y domicilio, y presioná &quot;Calcular total&quot; para obtener el importe final.
              </p>
            )}

            {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-xs text-red-800 border border-red-200">{error}</p>}

            <p className="text-[11px] text-zinc-500 text-center">
              Al confirmar aceptás las <Link href="/condiciones" className="underline">condiciones de compra</Link> y <Link href="/privacidad" className="underline">privacidad</Link>.
            </p>

            <button
              type="submit"
              disabled={pending || !validQuote || !checkoutEnabled}
              className="w-full rounded-xl bg-sky-700 p-3.5 font-bold text-white shadow-sm hover:bg-sky-800 transition-colors disabled:opacity-40 text-base"
            >
              {pending ? "Procesando pedido…" : "Confirmar pedido"}
            </button>
          </aside>
        </form>
      )}
    </section>
  );
}
