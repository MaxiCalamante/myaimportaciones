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
  getProvinceByCode,
  inferProvinceFromPostalCode,
} from "@/lib/correo-argentino/provinces";

export function CheckoutPanel({
  profile,
  checkoutEnabled,
  mercadoPagoEnabled,
}: {
  profile: Profile | null;
  checkoutEnabled: boolean;
  mercadoPagoEnabled: boolean;
}) {
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
    address,
    setAddress,
    shippingCost,
    shippingCalculation,
    selectedShippingOption,
    setSelectedShippingOptionId,
  } = useCommerce();

  const [paymentMethod, setPayment] = useState<CheckoutInput["paymentMethod"]>("transferencia");
  const [coupon, setCoupon] = useState("");
  const [quote, setQuote] = useState<OrderQuote | null>(null);
  const [quotedKey, setQuotedKey] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<Awaited<ReturnType<typeof createOrderAction>> | null>(null);
  const [customerEmail, setCustomerEmail] = useState(profile?.email || "");
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedBankField, setCopiedBankField] = useState<string | null>(null);
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
  const validQuote = quote !== null && key === quotedKey;
  const pickup = selectedShippingOption?.type === "pickup";

  useEffect(() => {
    if (!initiated.current && cart.length) {
      initiated.current = true;
      trackAdsEvent("InitiateCheckout", { value: cartTotal, num_items: cart.length });
    }
  }, [cart.length, cartTotal]);

  // Recotización reactiva automática en segundo plano cuando cambia cualquier dato
  useEffect(() => {
    if (!cart.length || !checkoutEnabled || !shippingCalculation.isValid) return;

    const timer = setTimeout(async () => {
      try {
        const response = await quoteOrderAction(input);
        if (response.ok) {
          setQuote(response.quote);
          setQuotedKey(JSON.stringify(input));
          if (!requestId.current) requestId.current = crypto.randomUUID();
        }
      } catch {
        // En segundo plano no bloqueamos la UI con errores temporales
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [key, cart.length, checkoutEnabled, shippingCalculation.isValid]);

  const refreshQuote = () => startTransition(async () => {
    setError("");
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

  // Pantalla de confirmación y experiencia post-venta
  if (result) return (
    <section className="mx-auto max-w-3xl space-y-6 px-4 py-12 animate-in fade-in duration-300">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-6 sm:p-8 text-center shadow-xs">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-md">
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="mt-4 text-3xl font-black text-emerald-950">¡Pedido registrado con éxito!</h1>
        <p className="mt-1 text-sm text-emerald-800">
          Guardá tu código único de seguimiento para rastrear tu paquete en todo momento:
        </p>
        <div className="mt-4 inline-flex items-center gap-3 rounded-xl bg-white px-5 py-3 border border-emerald-300 shadow-xs">
          <span className="font-mono text-2xl font-black text-sky-950 tracking-wider">{result.trackingCode}</span>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(result.trackingCode);
              setCopiedCode(true);
              setTimeout(() => setCopiedCode(false), 2500);
            }}
            className="rounded-lg bg-emerald-100 hover:bg-emerald-200 px-3 py-1.5 text-xs font-bold text-emerald-900 transition cursor-pointer"
          >
            {copiedCode ? "✓ ¡Copiado!" : "Copiar"}
          </button>
        </div>
      </div>

      {/* Detalle del Pedido y Entrega */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs space-y-4">
        <h2 className="text-lg font-bold text-zinc-950">Detalle de la Orden</h2>
        <div className="grid sm:grid-cols-2 gap-4 text-sm bg-zinc-50 rounded-xl p-4 border border-zinc-100">
          <div>
            <span className="text-xs text-zinc-500 block uppercase font-semibold">Total a abonar</span>
            <strong className="text-2xl text-zinc-950 font-black">{formatCurrency(result.total)}</strong>
          </div>
          <div>
            <span className="text-xs text-zinc-500 block uppercase font-semibold">Método de entrega</span>
            <span className="text-sm font-bold text-sky-900 block">{selectedShippingOption?.name || "Correo Argentino"} ({selectedShippingOption?.carrier || "Paq.ar"})</span>
            <span className="text-xs text-zinc-600 block mt-0.5">Plazo estimado: {selectedShippingOption?.estimatedDays || "2 a 5 días hábiles"}</span>
          </div>
          {address && (
            <div className="sm:col-span-2 border-t border-zinc-200 pt-3">
              <span className="text-xs text-zinc-500 block uppercase font-semibold">Dirección de entrega</span>
              <span className="text-sm text-zinc-800 font-medium">{address}, {city}{province ? `, Prov. ${province}` : ""}, CP {postalCode}</span>
            </div>
          )}
        </div>
      </div>

      {/* Paso a paso post-venta */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs space-y-4">
        <h2 className="text-lg font-bold text-zinc-950">¿Qué pasa ahora? (Paso a paso post-venta)</h2>
        <div className="grid gap-3 sm:grid-cols-2 text-xs">
          <div className="rounded-xl border border-sky-100 bg-sky-50/60 p-4">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-600 font-bold text-white mb-2">1</span>
            <strong className="text-zinc-900 block text-sm">Acreditación del Pago</strong>
            <p className="mt-1 text-zinc-600">
              {paymentMethod === "transferencia"
                ? "Enviás el comprobante por WhatsApp para validar el ingreso en nuestra cuenta bancaria."
                : "Se confirma de forma instantánea a través de Mercado Pago."}
            </p>
          </div>
          <div className="rounded-xl border border-sky-100 bg-sky-50/60 p-4">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-600 font-bold text-white mb-2">2</span>
            <strong className="text-zinc-900 block text-sm">Preparación y Embalaje</strong>
            <p className="mt-1 text-zinc-600">
              Embalamos tus productos en nuestro depósito central de Tandil con protección de burbuja y rotulado de seguridad.
            </p>
          </div>
          <div className="rounded-xl border border-sky-100 bg-sky-50/60 p-4">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-600 font-bold text-white mb-2">3</span>
            <strong className="text-zinc-900 block text-sm">Despacho Correo Argentino</strong>
            <p className="mt-1 text-zinc-600">
              Generamos el rótulo oficial Paq.ar y el cartero de Correo Argentino admite la encomienda para iniciar el transporte.
            </p>
          </div>
          <div className="rounded-xl border border-sky-100 bg-sky-50/60 p-4">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-600 font-bold text-white mb-2">4</span>
            <strong className="text-zinc-900 block text-sm">Seguimiento en Vivo</strong>
            <p className="mt-1 text-zinc-600">
              Obtenés el número de guía oficial para consultar el recorrido paso a paso en nuestra web o en Correo Argentino hasta la entrega.
            </p>
          </div>
        </div>
      </div>

      {/* Datos para completar el pago */}
      {paymentMethod === "transferencia" && (
        <div className="rounded-2xl border border-zinc-200 p-5 bg-zinc-50 space-y-3">
          <p className="font-bold text-sm text-zinc-900">Datos para la Transferencia Bancaria:</p>
          <div className="bg-white p-4 rounded-xl border border-zinc-200 text-xs sm:text-sm space-y-2">
            <div className="flex items-center justify-between gap-2 border-b border-zinc-100 pb-2">
              <span className="text-zinc-600">CVU: <strong className="font-mono text-zinc-950 select-all">{siteConfig.bankTransfer.cvu}</strong></span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(siteConfig.bankTransfer.cvu);
                  setCopiedBankField("cvu");
                  setTimeout(() => setCopiedBankField(null), 2000);
                }}
                className="shrink-0 px-2.5 py-1 text-xs rounded-lg border border-zinc-200 hover:bg-zinc-50 text-zinc-700 font-semibold transition cursor-pointer"
              >
                {copiedBankField === "cvu" ? "✓ Copiado" : "Copiar CVU"}
              </button>
            </div>
            <div className="flex items-center justify-between gap-2 border-b border-zinc-100 pb-2">
              <span className="text-zinc-600">Alias: <strong className="font-mono text-zinc-950 select-all">{siteConfig.bankTransfer.alias || "MYA.IMPORTACIONES"}</strong></span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(siteConfig.bankTransfer.alias || "MYA.IMPORTACIONES");
                  setCopiedBankField("alias");
                  setTimeout(() => setCopiedBankField(null), 2000);
                }}
                className="shrink-0 px-2.5 py-1 text-xs rounded-lg border border-zinc-200 hover:bg-zinc-50 text-zinc-700 font-semibold transition cursor-pointer"
              >
                {copiedBankField === "alias" ? "✓ Copiado" : "Copiar Alias"}
              </button>
            </div>
            <p className="text-zinc-600 pt-0.5">Titular: <strong className="text-zinc-900">MYA Importaciones</strong></p>
          </div>
          <a
            className="block rounded-xl bg-emerald-600 p-3.5 text-center font-bold text-white hover:bg-emerald-700 transition shadow-xs text-sm"
            href={getWhatsAppUrl(`Hola MYA, realicé la transferencia del pedido ${result.trackingCode} por ${formatCurrency(result.total)} con destino a ${city}, ${province}. Adjunto el comprobante.`)}
            target="_blank"
            rel="noopener noreferrer"
          >
            Enviar comprobante por WhatsApp →
          </a>
        </div>
      )}

      {result.initPoint && (
        <a className="block rounded-xl bg-sky-700 p-4 text-center font-bold text-white hover:bg-sky-800 transition shadow-sm" href={result.initPoint}>
          Continuar y pagar en Mercado Pago →
        </a>
      )}

      {result.paymentError && (
        <p role="alert" className="rounded-xl bg-amber-50 p-4 text-amber-900 text-sm">{result.paymentError}</p>
      )}

      {/* Enlaces de Seguimiento y Soporte */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Link
          href={`/seguimiento?code=${result.trackingCode}&email=${encodeURIComponent(customerEmail)}`}
          className="flex-1 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white p-3.5 text-center font-bold text-sm shadow-xs transition"
        >
          Ver seguimiento de mi envío en vivo →
        </Link>
        <a
          href={getWhatsAppUrl(`Hola MYA! Consulto por el estado de mi compra ${result.trackingCode}.`)}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-xl border border-zinc-300 hover:bg-zinc-100 p-3.5 text-center font-semibold text-zinc-800 text-sm transition"
        >
          Consultar por WhatsApp
        </a>
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
            if (!checkoutEnabled || pending) return;
            const form = new FormData(e.currentTarget);
            const emailInput = String(form.get("email") ?? "").trim();
            setCustomerEmail(emailInput);

            startTransition(async () => {
              setError("");
              try {
                const response = await createOrderAction({
                  ...input,
                  province,
                  city: city.trim() || String(form.get("city") ?? "").trim(),
                  address: address.trim() || String(form.get("address") ?? "").trim(),
                  name: String(form.get("name") ?? "").trim(),
                  email: emailInput,
                  phone: String(form.get("phone") ?? "").trim(),
                  notes: String(form.get("notes") ?? "").trim(),
                  acceptSeparateShipping: form.get("separate_shipping") === "on",
                  requestId: requestId.current || crypto.randomUUID(),
                  expectedTotal: quote?.total ?? (cartTotal + shippingCost),
                });
                setResult(response);
                clearCart();
              } catch (err) {
                setError(err instanceof Error ? err.message : "No pudimos registrar el pedido.");
              }
            });
          }}
        >
          <div className="space-y-6 rounded-2xl border border-zinc-200 bg-white p-5 sm:p-7 shadow-xs">
            <div>
              <h2 className="text-xl font-bold text-zinc-950">1. Datos de entrega (Correo Argentino)</h2>
              <p className="text-xs text-zinc-500 mt-1">Ingresá tu ubicación para calcular el costo de envío en tiempo real a tu domicilio o sucursal.</p>
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
                    if (code && postalCode) {
                      const prov = getProvinceByCode(code);
                      const inferred = inferProvinceFromPostalCode(postalCode);
                      if (prov && inferred && inferred.code !== code) {
                        setPostalCode(prov.defaultPostalCode || "");
                      }
                    }
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
                    const inferred = inferProvinceFromPostalCode(val);
                    if (inferred) {
                      setProvince(inferred.code);
                    }
                  }}
                  required
                  maxLength={12}
                  placeholder="Ej. 7000, 1425, 5000..."
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
                  placeholder="Ej. Tandil, CABA, Córdoba, Rosario..."
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
                <input
                  className={field}
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={254}
                  value={customerEmail}
                  onChange={e => setCustomerEmail(e.target.value)}
                  placeholder="Para enviarte el seguimiento"
                />
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
              <select aria-label="Medio de pago" className={field} value={paymentMethod} onChange={e => setPayment(e.target.value as CheckoutInput["paymentMethod"])}>
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

          <aside className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 lg:sticky lg:top-24 shadow-xs">
            <h2 className="text-xl font-bold">Resumen de compra</h2>
            <div className="divide-y divide-zinc-100 max-h-56 overflow-y-auto pr-1">
              {cart.map(l => (
                <div key={l.product.id} className="py-2 text-xs">
                  <div className="flex justify-between gap-3 font-medium text-zinc-800">
                    <span>{l.quantity} × {l.product.title}</span>
                    <span className="shrink-0 tabular-nums font-bold text-zinc-950">{formatCurrency(l.quantity * l.product.retailPrice)}</span>
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
              className="w-full rounded-xl bg-sky-50 border border-sky-600 p-3 font-bold text-sky-800 hover:bg-sky-100 transition-colors disabled:opacity-40 text-sm cursor-pointer"
            >
              {pending ? "Calculando total…" : "Calcular total con envío Correo Argentino"}
            </button>

            {/* Desglose dinámico en tiempo real */}
            <div aria-live="polite" className="space-y-2 rounded-xl bg-zinc-50 p-4 text-sm border border-zinc-200">
              <div className="flex justify-between text-zinc-600">
                <span>Productos:</span>
                <span>{formatCurrency(quote?.subtotal ?? cartTotal)}</span>
              </div>
              <div className="flex justify-between text-zinc-600">
                <span>Envío ({selectedShippingOption?.name || "Correo Argentino"}):</span>
                <span>{quote?.shippingQuotedSeparately ? "A cotizar por separado" : formatCurrency(quote?.shipping ?? shippingCost)}</span>
              </div>
              {shippingCalculation.isValid && (
                <p className="text-[11px] text-sky-800 font-medium">
                  📍 Destino: {shippingCalculation.zoneName} ({selectedShippingOption?.estimatedDays})
                </p>
              )}
              {(quote?.discount ?? 0) > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Descuento ({quote?.promotion}):</span>
                  <span>−{formatCurrency(quote!.discount)}</span>
                </div>
              )}
              {quote?.couponMessage && (
                <p className="text-xs text-amber-700">{quote.couponMessage}</p>
              )}
              <div className="border-t border-zinc-200 pt-2 flex justify-between text-lg font-black text-zinc-950">
                <span>{quote?.shippingQuotedSeparately ? "Total de productos:" : "Total final:"}</span>
                <span>{formatCurrency(quote?.total ?? (cartTotal + shippingCost))}</span>
              </div>
            </div>

            {validQuote && quote.shippingQuotedSeparately && (
              <label className="flex items-start gap-2 rounded-xl bg-sky-50 p-3 text-xs text-sky-900 border border-sky-100">
                <input className="mt-0.5" type="checkbox" name="separate_shipping" required />
                <span>Entiendo que este pago corresponde a los productos y que el envío a domicilio se cotiza y abona por separado, coordinándolo con MYA.</span>
              </label>
            )}

            {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-xs text-red-800 border border-red-200">{error}</p>}

            <p className="text-[11px] text-zinc-500 text-center">
              Al confirmar aceptás las <Link href="/condiciones" className="underline">condiciones de compra</Link> y <Link href="/privacidad" className="underline">privacidad</Link>.
            </p>

            <button
              type="submit"
              disabled={pending || !checkoutEnabled || (!validQuote && !shippingCalculation.isValid)}
              className="w-full rounded-xl bg-sky-700 p-3.5 font-bold text-white shadow-sm hover:bg-sky-800 transition-colors disabled:opacity-40 text-base cursor-pointer"
            >
              {pending ? "Procesando pedido…" : "Confirmar pedido"}
            </button>
          </aside>
        </form>
      )}
    </section>
  );
}
