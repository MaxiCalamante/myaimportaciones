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

export function CheckoutPanel({ profile, checkoutEnabled, mercadoPagoEnabled }: { profile: Profile | null; checkoutEnabled: boolean; mercadoPagoEnabled: boolean }) {
  const { cart, cartTotal, clearCart, postalCode, setPostalCode, shippingCalculation, selectedShippingOption, setSelectedShippingOptionId } = useCommerce();
  const [paymentMethod, setPayment] = useState<CheckoutInput["paymentMethod"]>("transferencia");
  const [coupon, setCoupon] = useState("");
  const [quote, setQuote] = useState<OrderQuote | null>(null);
  const [quotedKey, setQuotedKey] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<Awaited<ReturnType<typeof createOrderAction>> | null>(null);
  const [pending, startTransition] = useTransition();
  const requestId = useRef("");
  const initiated = useRef(false);
  const input: CheckoutInput = { lines: cart.map(l => ({ productId: l.product.id, quantity: l.quantity, channel: l.channel })), paymentMethod, postalCode, shippingOptionId: selectedShippingOption?.id ?? "", coupon };
  const key = JSON.stringify(input);
  const validQuote = quote && key === quotedKey;
  const pickup = selectedShippingOption?.type === "pickup";
  useEffect(() => {
    if (!initiated.current && cart.length) { initiated.current = true; trackAdsEvent("InitiateCheckout", { value: cartTotal, num_items: cart.length }); }
  }, [cart.length, cartTotal]);
  const refreshQuote = () => startTransition(async () => {
    setError("");
    const response = await quoteOrderAction(input);
    if (response.ok) { setQuote(response.quote); setQuotedKey(key); if (!requestId.current || quotedKey !== key) requestId.current = crypto.randomUUID(); }
    else { setQuote(null); setError(response.error); }
  });
  const field = "mt-1 w-full rounded-xl border border-slate-300 bg-white p-3 text-slate-950";
  if (result) return <section className="mx-auto max-w-2xl space-y-5 px-4 py-12">
    <h1 className="text-3xl font-bold">Pedido registrado</h1><p>Tu pedido está pendiente de pago o confirmación. Guardá este código:</p><p className="break-all rounded-xl bg-sky-50 p-4 font-mono">{result.trackingCode}</p><p>Total: <strong>{formatCurrency(result.total)}</strong></p>
    <p>Reserva válida hasta {new Date(result.expiresAt).toLocaleString("es-AR")}. No transfieras después de ese plazo sin consultarnos.</p>
    {result.paymentError && <p role="alert" className="rounded-xl bg-amber-50 p-4">{result.paymentError}</p>}
    {result.initPoint && <a className="block rounded-xl bg-sky-700 p-4 text-center font-bold text-white" href={result.initPoint}>Continuar en Mercado Pago</a>}
    {paymentMethod === "transferencia" && <div className="rounded-xl border p-4"><p>Alias: <strong>{siteConfig.bankTransfer.alias}</strong></p><p className="break-all">CVU: {siteConfig.bankTransfer.cvu}</p><p>Titular: {siteConfig.bankTransfer.holder}</p><p className="mt-2 text-sm">La transferencia se confirma después de verificar la acreditación.</p></div>}
    <Link href={`/seguimiento?code=${result.trackingCode}`} className="block text-sky-700 underline">Consultar estado con mi email</Link><a href={getWhatsAppUrl(`Hola MYA! Consulto por mi pedido ${result.trackingCode}.`)} target="_blank" rel="noopener noreferrer" className="block text-sky-700 underline">Contactar a MYA</a>
  </section>;
  return <section className="mx-auto max-w-6xl px-4 py-10"><h1 className="text-3xl font-bold">Finalizar compra</h1><p className="mt-2 text-slate-600">Revisá entrega y total antes de confirmar. La compra es minorista.</p>
    {!checkoutEnabled && <div role="status" className="my-5 rounded-xl bg-amber-50 p-4">La compra online está en preparación. <a className="underline" href={getWhatsAppUrl("Hola MYA! Quisiera consultar disponibilidad y entrega de un producto.")} target="_blank" rel="noopener noreferrer">Consultanos por WhatsApp</a> antes de realizar un pago.</div>}
    {cart.length > 0 && <a className="mt-4 inline-block text-sky-700 underline" target="_blank" rel="noopener noreferrer" href={getWhatsAppUrl(`Hola MYA, quisiera confirmar el envío a ${postalCode || "mi destino"} de: ${cart.map(line => `${line.quantity} x ${line.product.title}`).join("; ")}.`)}>Confirmar envío de este carrito por WhatsApp</a>}
    {!cart.length ? <p className="mt-8">Tu carrito está vacío. <Link href="/catalogo" className="text-sky-700 underline">Explorar productos</Link></p> :
    <form className="mt-8 grid items-start gap-8 lg:grid-cols-[1fr_380px]" onSubmit={e => {
      e.preventDefault(); if (!validQuote || !checkoutEnabled || pending) return;
      const form = new FormData(e.currentTarget);
      startTransition(async () => {
        setError("");
        try {
          const response = await createOrderAction({ ...input, name: String(form.get("name") ?? ""), email: String(form.get("email") ?? ""), phone: String(form.get("phone") ?? ""), address: String(form.get("address") ?? ""), city: String(form.get("city") ?? ""), notes: String(form.get("notes") ?? ""), requestId: requestId.current, expectedTotal: quote!.total });
          setResult(response); clearCart(); // OrderCreated is deliberately not an advertising Purchase.
        } catch (err) { setError(err instanceof Error ? err.message : "No pudimos registrar el pedido."); }
      });
    }}>
      <div className="space-y-6 rounded-2xl border bg-white p-5"><h2 className="text-xl font-bold">Entrega y contacto</h2>
        <label className="block">Código postal<input className={field} value={postalCode} onChange={e => setPostalCode(e.target.value)} required maxLength={12} placeholder="7000" autoComplete="postal-code" /></label>
        {shippingCalculation.isValid && <label className="block">Forma de entrega<select className={field} value={selectedShippingOption?.id ?? ""} onChange={e => setSelectedShippingOptionId(e.target.value)}>{shippingCalculation.options.map(o => <option key={o.id} value={o.id}>{o.name} — {o.requiresQuote ? "A cotizar" : formatCurrency(o.price)}</option>)}</select><span className="mt-2 block text-xs text-slate-600">Tarifas de la tienda para paquetes hasta 2 kg con peso registrado. Bultos grandes requieren cotización. Plazos de transporte estimados desde el despacho.</span></label>}
        <label className="block">Nombre y apellido<input className={field} name="name" autoComplete="name" required minLength={2} maxLength={120} defaultValue={profile?.fullName} /></label>
        <label className="block">Email<input className={field} name="email" type="email" autoComplete="email" required maxLength={254} defaultValue={profile?.email} /></label>
        <label className="block">Teléfono / WhatsApp<input className={field} name="phone" type="tel" autoComplete="tel" required minLength={8} maxLength={40} /></label>
        {!pickup && <><label className="block">{selectedShippingOption?.type === "sucursal" ? "Sucursal elegida (nombre y dirección)" : "Calle, número y departamento"}<input className={field} name="address" required maxLength={300} autoComplete="street-address" /></label><label className="block">Localidad y provincia<input className={field} name="city" required maxLength={120} /></label></>}
        {pickup && <p className="text-sm text-slate-600">Coordinaremos dirección y horario de retiro en Tandil. No necesitás ingresar un domicilio de envío.</p>}
        <label className="block">Notas opcionales<textarea className={field} name="notes" maxLength={1000} /></label>
        <label className="block">Medio de pago<select className={field} value={paymentMethod} onChange={e => setPayment(e.target.value as CheckoutInput["paymentMethod"])}><option value="transferencia">Transferencia</option>{mercadoPagoEnabled && <option value="mercado_pago">Tarjetas y dinero en cuenta con Mercado Pago</option>}{pickup && <option value="efectivo">Efectivo al retirar</option>}</select></label>
        {paymentMethod === "mercado_pago" && <p className="text-sm text-slate-600">Ingresás los datos de tu tarjeta únicamente en Mercado Pago. Las cuotas y sus costos se muestran allí.</p>}
      </div>
      <aside className="space-y-4 rounded-2xl border bg-white p-5 lg:sticky lg:top-24"><h2 className="text-xl font-bold">Resumen</h2>{cart.map(l => <p key={l.product.id} className="text-sm">{l.quantity} × {l.product.title}<strong className="block">{formatCurrency(l.quantity*l.product.retailPrice)}</strong></p>)}
        <label className="block text-sm">Cupón opcional<input className={field} value={coupon} maxLength={30} onChange={e => setCoupon(e.target.value.toUpperCase())} /></label><p className="text-xs text-slate-600">Aplicamos la mejor promoción disponible, sin acumular descuentos. Su elegibilidad se verifica con el precio del producto.</p>
        <button type="button" disabled={pending || !checkoutEnabled} onClick={refreshQuote} className="w-full rounded-xl border border-sky-700 p-3 font-semibold text-sky-700 disabled:opacity-40">{pending ? "Verificando…" : "Calcular total y aplicar cupón"}</button>
        {validQuote && <div aria-live="polite" className="space-y-2"><p>Productos: {formatCurrency(quote.subtotal)}</p><p>Entrega: {formatCurrency(quote.shipping)}</p>{quote.discount > 0 && <p>Promoción ({quote.promotion}): −{formatCurrency(quote.discount)}</p>}{quote.couponMessage && <p>{quote.couponMessage}</p>}<p className="text-xl font-bold">Total: {formatCurrency(quote.total)}</p></div>}
        {!validQuote && <p className="text-sm">Calculá el total con la entrega y el medio de pago seleccionados.</p>}
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        <p className="text-xs">Al confirmar aceptás las <Link href="/condiciones" className="underline">condiciones de compra</Link>. Consultá nuestra <Link href="/privacidad" className="underline">política de privacidad</Link>.</p>
        <button type="submit" disabled={pending || !validQuote || !checkoutEnabled} className="w-full rounded-xl bg-sky-700 p-3 font-bold text-white disabled:opacity-40">{pending ? "Procesando…" : "Confirmar pedido"}</button>
      </aside>
    </form>}
  </section>;
}
