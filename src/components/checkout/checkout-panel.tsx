"use client";

import { FormEvent, useMemo, useState, useTransition, useEffect } from "react";
import {
  CheckCircle2,
  CreditCard,
  Landmark,
  MessageCircle,
  Receipt,
  Wallet,
  Search,
  Sparkles,
  ShieldCheck,
  Truck,
  Copy,
  Check,
  ExternalLink,
  Lock,
  Building2,
  Calendar,
  Tag,
  Zap,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { formatCurrency, formatPaymentMethod } from "@/lib/format";
import type { PaymentMethod } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { useCommerce } from "@/components/commerce/commerce-provider";
import { createOrderAction } from "@/app/checkout/actions";
import { siteConfig, getWhatsAppUrl } from "@/lib/site";
import type { Profile } from "@/lib/auth";
import { trackAdsEvent } from "@/lib/analytics";
import { validateCoupon } from "@/lib/coupons";
import { isProductImmediateStock } from "@/lib/shipping";

const paymentOptions: Array<{ value: PaymentMethod; icon: typeof CreditCard; badge?: string; desc: string }> = [
  { value: "transferencia", icon: Landmark, badge: "10% OFF", desc: "CVU Mercado Pago / Transferencia inmediata" },
  { value: "tarjeta", icon: CreditCard, desc: "Crédito o Débito (Visa, Mastercard, Cabal, AMEX)" },
  { value: "mercado_pago", icon: Wallet, desc: "Dinero en cuenta o Mercado Crédito" },
  { value: "efectivo", icon: Receipt, badge: "10% OFF", desc: "Pago contra entrega o retiro en depósito" },
];

function detectCardBrand(number: string): string {
  const clean = number.replace(/\D/g, "");
  if (/^4/.test(clean)) return "Visa";
  if (/^(5[1-5]|2[2-7])/.test(clean)) return "Mastercard";
  if (/^3[47]/.test(clean)) return "American Express";
  if (/^(5896|6042|6043)/.test(clean)) return "Cabal";
  if (/^(5895|5031)/.test(clean)) return "Naranja X";
  return "Tarjeta";
}

export function CheckoutPanel({ profile }: { profile: Profile | null }) {
  const {
    cart,
    cartTotal,
    clearCart,
    shippingCost,
    postalCode,
    setPostalCode,
    shippingCalculation,
    isAllImmediateStock,
    selectedShippingOptionId,
    setSelectedShippingOptionId,
    selectedShippingOption,
  } = useCommerce();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("transferencia");
  const [orderCode, setOrderCode] = useState<string | null>(null);
  const [confirmedTotal, setConfirmedTotal] = useState<number>(0);
  const [mpInitPoint, setMpInitPoint] = useState<string | null>(null);

  // Card payment fields
  const [cardNumber, setCardNumber] = useState("");
  const [cardHolder, setCardHolder] = useState(profile?.fullName || "");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [cardDni, setCardDni] = useState("");
  const [installments, setInstallments] = useState("1");

  // Copy feedback states
  const [copiedCvu, setCopiedCvu] = useState(false);
  const [copiedAlias, setCopiedAlias] = useState(false);

  // Coupon states
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discount: number;
    description: string;
  } | null>(null);
  const [couponFeedback, setCouponFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

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

  // Coupon and transfer discount logic
  const couponDiscount = appliedCoupon ? appliedCoupon.discount : 0;
  const subtotalAfterCoupon = Math.max(0, cartTotal - couponDiscount);
  const transferDiscountPercentage = 10;
  const isDiscountEligible = paymentMethod === "transferencia" || paymentMethod === "efectivo";
  const discountAmount = isDiscountEligible ? Math.round(subtotalAfterCoupon * (transferDiscountPercentage / 100)) : 0;
  const total = Math.max(0, subtotalAfterCoupon - discountAmount + shipping);

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;
    const channel = cart.some((l) => l.channel === "wholesale") ? "wholesale" : "retail";
    const res = validateCoupon(couponCode, cartTotal, channel);
    if (res.valid) {
      setAppliedCoupon({
        code: res.coupon?.code || couponCode.toUpperCase(),
        discount: res.discountAmount,
        description: res.coupon?.description || "Cupón aplicado",
      });
      setCouponFeedback({ type: "success", text: res.message });
    } else {
      setCouponFeedback({ type: "error", text: res.message });
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponFeedback(null);
  };

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
        isImmediate: isProductImmediateStock(line.product),
        subtotal:
          (line.channel === "wholesale"
            ? line.product.wholesalePrice
            : line.product.retailPrice) * line.quantity,
      })),
    [cart],
  );

  const cardBrand = useMemo(() => detectCardBrand(cardNumber), [cardNumber]);

  const handleCopyCvu = () => {
    navigator.clipboard.writeText(siteConfig.bankTransfer.cvu);
    setCopiedCvu(true);
    setTimeout(() => setCopiedCvu(false), 2000);
  };

  const handleCopyAlias = () => {
    navigator.clipboard.writeText(siteConfig.bankTransfer.alias);
    setCopiedAlias(true);
    setTimeout(() => setCopiedAlias(false), 2000);
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 16);
    const formatted = raw.replace(/(\d{4})(?=\d)/g, "$1 ");
    setCardNumber(formatted);
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/\D/g, "").slice(0, 4);
    if (raw.length >= 3) {
      raw = `${raw.slice(0, 2)}/${raw.slice(2)}`;
    }
    setCardExpiry(raw);
  };

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
        const finalTotalSnapshot = total;
        const combinedNotes = [
          orderNotes || "",
          appliedCoupon ? `[Cupón: ${appliedCoupon.code} (-${formatCurrency(appliedCoupon.discount)})]` : "",
          paymentMethod === "tarjeta"
            ? `[Pago Tarjeta: ${cardBrand} **** ${cardNumber.slice(-4)} | Cuotas: ${installments} | DNI: ${cardDni}]`
            : "",
        ]
          .filter(Boolean)
          .join("\n");

        const result = await createOrderAction(
          profile?.id ?? null,
          paymentMethod,
          shippingName,
          shippingPhone,
          fullAddress,
          cartTotal,
          shipping,
          finalTotalSnapshot,
          lines,
          shippingEmail,
          combinedNotes
        );

        setOrderCode(result.trackingCode);
        setConfirmedTotal(finalTotalSnapshot);

        if (result.initPoint && !result.isDemo) {
          setMpInitPoint(result.initPoint);
        }

        // Fire Purchase conversion event for Meta Pixel, Google Ads, TikTok
        trackAdsEvent("Purchase", {
          transaction_id: result.trackingCode,
          value: finalTotalSnapshot,
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

  // Confirmation View
  if (orderCode) {
    const isBankTransfer = paymentMethod === "transferencia";
    const whatsappOrderConfirmedText = isBankTransfer
      ? `Hola Máximo! Acabo de registrar el pedido #${orderCode} por ${formatCurrency(confirmedTotal)} en la tienda de MYA Importaciones. Te escribo para enviarte el comprobante de transferencia a tu CVU ${siteConfig.bankTransfer.cvu}.`
      : `Hola Máximo! Acabo de registrar el pedido #${orderCode} por ${formatCurrency(confirmedTotal)} abonado con ${formatPaymentMethod(paymentMethod)}. Te escribo para coordinar el despacho.`;

    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8 animate-in fade-in duration-300">
        <div className="rounded-3xl border border-sky-200 bg-white p-8 sm:p-10 text-center shadow-xl">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-sky-100 ring-8 ring-sky-50">
            <CheckCircle2 className="h-10 w-10 text-sky-600" />
          </div>

          <span className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-800 border border-sky-200">
            <ShieldCheck className="h-3.5 w-3.5 text-sky-600" />
            ¡Pedido Registrado con Éxito en MYA Importaciones!
          </span>

          <h1 className="mt-3 text-3xl font-black text-zinc-950 tracking-tight sm:text-4xl">
            {isBankTransfer ? "Esperando tu Transferencia" : "¡Muchas Gracias por tu Compra!"}
          </h1>
          <p className="mt-2 text-sm text-zinc-600 max-w-lg mx-auto">
            Hemos reservado tu stock en nuestro depósito central de Tandil. Tu código de pedido y seguimiento oficial es:
          </p>

          <div className="mt-4 inline-flex items-center gap-3 rounded-2xl bg-zinc-100 border border-zinc-200 px-6 py-3 font-mono text-2xl font-black text-zinc-950 shadow-inner">
            <span>{orderCode}</span>
          </div>

          {/* If Mercado Pago External Checkout is ready */}
          {mpInitPoint && (
            <div className="mt-6 rounded-2xl bg-sky-600 text-white p-6 max-w-md mx-auto shadow-lg space-y-3">
              <p className="font-black text-lg">Pagar con Mercado Pago</p>
              <p className="text-xs text-sky-100">
                Hacé clic en el siguiente enlace seguro para abonar con tarjeta en hasta 12 cuotas:
              </p>
              <a
                href={mpInitPoint}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-white text-sky-900 font-extrabold text-sm hover:bg-sky-50 transition shadow"
              >
                <CreditCard className="h-4 w-4 text-sky-600" />
                Abrir Pasarela de Mercado Pago
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          )}

          {/* Bank Transfer Details Card (Requested with Máximo's CVU) */}
          {isBankTransfer && (
            <div className="mt-8 rounded-2xl border-2 border-sky-400/40 bg-gradient-to-br from-sky-50/70 to-blue-50/40 p-6 max-w-lg mx-auto text-left shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-sky-200 pb-3">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-sky-700" />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-sky-900">
                      Datos para Transferir (10% OFF Aplicado)
                    </p>
                    <p className="text-sm font-black text-zinc-950">
                      Monto a transferir: <span className="text-sky-700">{formatCurrency(confirmedTotal)}</span>
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-amber-500 px-2.5 py-0.5 text-[10px] font-black text-white shadow-xs">
                  10% OFF
                </span>
              </div>

              <div className="space-y-3 text-xs">
                {/* CVU Block */}
                <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-sky-200 shadow-xs">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-zinc-500 block">CVU Mercado Pago:</span>
                    <span className="font-mono font-black text-base text-zinc-950 tracking-wider">
                      {siteConfig.bankTransfer.cvu}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyCvu}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs transition cursor-pointer shadow-xs"
                  >
                    {copiedCvu ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copiedCvu ? "¡Copiado!" : "Copiar"}
                  </button>
                </div>

                {/* Alias Block */}
                <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-sky-200 shadow-xs">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-zinc-500 block">Alias:</span>
                    <span className="font-mono font-black text-sm text-zinc-950">
                      {siteConfig.bankTransfer.alias}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyAlias}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-sky-300 bg-sky-50 hover:bg-sky-100 text-sky-900 font-bold text-xs transition cursor-pointer"
                  >
                    {copiedAlias ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copiedAlias ? "¡Copiado!" : "Copiar"}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-600 pt-1">
                  <p><strong>Titular:</strong> {siteConfig.bankTransfer.holder}</p>
                  <p><strong>Entidad:</strong> {siteConfig.bankTransfer.bank}</p>
                </div>

                <p className="text-[11px] text-sky-950 bg-sky-100/70 p-2.5 rounded-lg leading-relaxed border border-sky-200/50">
                  💡 Una vez realizada la transferencia, enviá el comprobante al WhatsApp <strong>2494638919</strong> con tu código <strong>#{orderCode}</strong> para despachar tu pedido inmediatamente.
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href={getWhatsAppUrl(whatsappOrderConfirmedText)}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 text-sm font-bold text-white hover:bg-emerald-700 transition shadow-md cursor-pointer"
            >
              <MessageCircle className="h-5 w-5" />
              {isBankTransfer ? "Enviar Comprobante por WhatsApp" : "Coordinar Entrega por WhatsApp"}
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
          Compra Protegida &bull; MYA Importaciones Tandil
        </div>
        <h1 className="mt-1 text-3xl font-black text-zinc-950 tracking-tight sm:text-4xl">
          Finalizar Compra
        </h1>
        <p className="text-xs text-zinc-500 mt-1">
          Completá tus datos de entrega y elegí tu medio de pago (Transferencia con 10% OFF o Tarjeta de Crédito/Débito).
        </p>
      </div>

      <form className="grid gap-6 lg:grid-cols-[1fr_420px]" onSubmit={handleSubmit}>
        <section className="space-y-6">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs">
            {errorMsg && (
              <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-800 font-medium">
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
              1. Datos de Entrega y Contacto
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1.5 text-xs font-semibold text-zinc-700">
                Nombre y Apellido *
                <input
                  className="h-11 rounded-xl border border-zinc-300 px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 bg-white font-medium"
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
                  className="h-11 rounded-xl border border-zinc-300 px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 bg-white font-medium"
                  name="phone"
                  required
                  placeholder="Ej: 249 463-8919"
                  defaultValue=""
                  type="tel"
                />
              </label>

              <label className="grid gap-1.5 text-xs font-semibold text-zinc-700 sm:col-span-2">
                Email (para comprobante y seguimiento) *
                <input
                  className="h-11 rounded-xl border border-zinc-300 px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 bg-white font-medium"
                  name="email"
                  required
                  placeholder="ejemplo@correo.com"
                  defaultValue={profile?.email ?? ""}
                  type="email"
                />
              </label>
            </div>

            {/* Postal Code & Carrier Selection */}
            <div className="mt-5 pt-4 border-t border-zinc-200 space-y-3">
              {/* Delivery Time Policy Alert */}
              <div
                className={`rounded-xl border p-3.5 text-xs transition-all ${
                  isAllImmediateStock
                    ? "bg-emerald-50/90 border-emerald-200 text-emerald-950"
                    : "bg-sky-50/90 border-sky-200 text-sky-950"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {isAllImmediateStock ? (
                    <Zap className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <Clock className="h-4 w-4 text-sky-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="font-bold text-xs flex items-center gap-1.5 flex-wrap">
                      <span>
                        {isAllImmediateStock
                          ? "Despacho Prioritario 24 hs"
                          : "Plazo de Entrega: 3 a 7 días hábiles"}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.2 rounded-full font-extrabold uppercase tracking-wide border ${
                          isAllImmediateStock
                            ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                            : "bg-sky-100 text-sky-800 border-sky-300"
                        }`}
                      >
                        {isAllImmediateStock ? "Stock Inmediato" : "Importación Directa"}
                      </span>
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed opacity-90">
                      {isAllImmediateStock
                        ? "Todos los productos de tu pedido cuentan con stock físico en nuestro depósito central de Tandil. Se despachan de forma inmediata en 24 hs hábiles."
                        : "Tu pedido incluye artículos bajo importación directa. El plazo total estimado de entrega es de 3 a 7 días hábiles hasta tu puerta o sucursal seleccionada."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                <label className="text-xs font-bold text-zinc-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Truck className="h-4 w-4 text-emerald-600" /> Código Postal de Destino *
                </label>
                {shippingCalculation.isValid && (
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                    📍 {shippingCalculation.locationName}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 max-w-sm">
                <input
                  type="text"
                  name="postal_code"
                  required
                  placeholder="Ingresá tu CP (ej: 7000, 1425, Tandil...)"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  className="h-11 w-full rounded-xl border border-zinc-300 px-3 text-sm bg-white outline-none focus:border-emerald-500 font-medium"
                />
              </div>
              <p className="text-[11px] text-zinc-400">
                ¿No sabés tu código postal?{" "}
                <a
                  href="https://www.correoargentino.com.ar/formularios/cpa"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-700 font-semibold hover:underline"
                >
                  Consultalo en Correo Argentino
                </a>
              </p>

              {shippingCalculation.isValid && (
                <div className="space-y-2 pt-2">
                  <span className="text-xs font-bold text-zinc-700 block">
                    Seleccioná tu método de envío o retiro:
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
                              ? "border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-500/20 shadow-xs"
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
                  className="h-11 rounded-xl border border-zinc-300 px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 bg-white font-medium"
                  name="address"
                  required
                  placeholder="Calle, número, piso, depto (o sucursal de correo elegida)"
                  defaultValue=""
                  type="text"
                />
              </label>

              <label className="grid gap-1.5 text-xs font-semibold text-zinc-700">
                Localidad y Provincia *
                <input
                  className="h-11 rounded-xl border border-zinc-300 px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 bg-white font-medium"
                  name="city"
                  required
                  placeholder="Ej: Tandil, Buenos Aires"
                  defaultValue={shippingCalculation.locationName || ""}
                  type="text"
                />
              </label>

              <label className="grid gap-1.5 text-xs font-semibold text-zinc-700">
                Notas para el repartidor (Opcional)
                <input
                  className="h-11 rounded-xl border border-zinc-300 px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 bg-white"
                  name="notes"
                  placeholder="Entre calles, timbre, color de puerta..."
                  defaultValue=""
                  type="text"
                />
              </label>
            </div>
          </div>

          {/* Payment method selection */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-zinc-950 flex items-center gap-2">
                <Landmark className="h-5 w-5 text-zinc-500" />
                2. Medio de Pago
              </h2>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5" />
                10% OFF en Transferencia
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {paymentOptions.map((option) => (
                <button
                  className={`flex flex-col justify-between rounded-2xl border p-4 text-left transition cursor-pointer ${
                    paymentMethod === option.value
                      ? "border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20 shadow-xs"
                      : "border-zinc-200 hover:border-zinc-300 bg-white"
                  }`}
                  key={option.value}
                  onClick={() => setPaymentMethod(option.value)}
                  type="button"
                  disabled={isPending}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2.5">
                      <option.icon className={`h-5 w-5 ${paymentMethod === option.value ? "text-emerald-600" : "text-zinc-500"}`} />
                      <span className="text-sm font-black text-zinc-950">
                        {formatPaymentMethod(option.value)}
                      </span>
                    </div>
                    {option.badge && (
                      <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-extrabold text-white shadow-xs">
                        {option.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-2">
                    {option.desc}
                  </p>
                </button>
              ))}
            </div>
            <input name="payment_method" type="hidden" value={paymentMethod} />

            {/* Transfer Details Card */}
            {paymentMethod === "transferencia" && (
              <div className="mt-5 rounded-2xl bg-gradient-to-br from-emerald-50/80 to-teal-50/40 border border-emerald-300/80 p-5 text-xs text-zinc-900 space-y-3 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-emerald-700" />
                    <span className="font-bold text-sm text-emerald-950">
                      Datos Oficiales para Transferir (CVU Mercado Pago):
                    </span>
                  </div>
                  <span className="font-black text-xs text-emerald-700 bg-white px-2 py-0.5 rounded border border-emerald-300">
                    Total: {formatCurrency(total)}
                  </span>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="bg-white p-3 rounded-xl border border-emerald-200 flex items-center justify-between shadow-xs">
                    <div>
                      <span className="text-[10px] font-bold text-zinc-500 uppercase block">CVU Mercado Pago:</span>
                      <span className="font-mono font-black text-sm text-zinc-950">{siteConfig.bankTransfer.cvu}</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyCvu}
                      className="px-2.5 py-1 rounded-md bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition cursor-pointer"
                    >
                      {copiedCvu ? "Copiado" : "Copiar"}
                    </button>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-emerald-200 flex items-center justify-between shadow-xs">
                    <div>
                      <span className="text-[10px] font-bold text-zinc-500 uppercase block">Alias:</span>
                      <span className="font-mono font-black text-sm text-zinc-950">{siteConfig.bankTransfer.alias}</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyAlias}
                      className="px-2.5 py-1 rounded-md border border-zinc-300 bg-zinc-50 text-zinc-800 font-bold text-xs hover:bg-zinc-100 transition cursor-pointer"
                    >
                      {copiedAlias ? "Copiado" : "Copiar"}
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-600 pt-1">
                  <span>Titular: <strong>{siteConfig.bankTransfer.holder}</strong></span>
                  <span>Billetera / Banco: <strong>{siteConfig.bankTransfer.bank}</strong></span>
                  <span>WhatsApp: <strong>2494638919</strong></span>
                </div>
              </div>
            )}

            {/* Credit / Debit Card Interactive Form */}
            {paymentMethod === "tarjeta" && (
              <div className="mt-5 rounded-2xl bg-zinc-50 border border-zinc-200 p-5 space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-emerald-600" />
                    <div>
                      <p className="text-xs font-bold text-zinc-950">Pago Seguro con Tarjeta</p>
                      <p className="text-[11px] text-zinc-500">Aceptamos Visa, Mastercard, Cabal y American Express</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    <Lock className="h-3 w-3" /> SSL 256-bit
                  </span>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">
                      Número de Tarjeta
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="4500 0000 0000 0000"
                        maxLength={19}
                        value={cardNumber}
                        onChange={handleCardNumberChange}
                        className="h-11 w-full rounded-xl border border-zinc-300 px-3.5 pr-20 text-sm font-mono font-bold text-zinc-900 bg-white outline-none focus:border-emerald-500"
                      />
                      <span className="absolute right-3 top-3 text-[11px] font-black uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {cardBrand}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">
                      Nombre y Apellido del Titular (como figura en el plástico)
                    </label>
                    <input
                      type="text"
                      placeholder="JUAN PEREZ"
                      value={cardHolder}
                      onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                      className="h-11 w-full rounded-xl border border-zinc-300 px-3.5 text-sm font-medium text-zinc-900 bg-white outline-none focus:border-emerald-500 uppercase"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-zinc-700 mb-1">
                        Vencimiento
                      </label>
                      <input
                        type="text"
                        placeholder="MM/AA"
                        maxLength={5}
                        value={cardExpiry}
                        onChange={handleExpiryChange}
                        className="h-11 w-full rounded-xl border border-zinc-300 px-3 text-sm font-mono text-center font-bold text-zinc-900 bg-white outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-700 mb-1">
                        CVV / CVC
                      </label>
                      <input
                        type="password"
                        placeholder="123"
                        maxLength={4}
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                        className="h-11 w-full rounded-xl border border-zinc-300 px-3 text-sm font-mono text-center font-bold text-zinc-900 bg-white outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-700 mb-1">
                        DNI del Titular
                      </label>
                      <input
                        type="text"
                        placeholder="38123456"
                        maxLength={10}
                        value={cardDni}
                        onChange={(e) => setCardDni(e.target.value.replace(/\D/g, "").slice(0, 10))}
                        className="h-11 w-full rounded-xl border border-zinc-300 px-3 text-sm font-mono text-center font-bold text-zinc-900 bg-white outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1">
                      Planes de Cuotas
                    </label>
                    <select
                      value={installments}
                      onChange={(e) => setInstallments(e.target.value)}
                      className="h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 text-xs font-semibold text-zinc-900 outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      <option value="1">1 cuota de {formatCurrency(total)} (Precio Contado)</option>
                      <option value="3">3 cuotas de {formatCurrency(Math.round(total / 3))} con tarjeta de crédito</option>
                      <option value="6">6 cuotas fijas de {formatCurrency(Math.round((total * 1.15) / 6))}</option>
                    </select>
                  </div>
                </div>
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
                  <div className="flex-1 min-w-0 pr-1">
                    <span className="text-zinc-700 font-medium block truncate">
                      {line.quantity} × {line.title}
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-zinc-100 text-zinc-600 font-bold">
                        {line.channel === "wholesale" ? "Mayorista" : "Minorista"}
                      </span>
                      {line.isImmediate ? (
                        <span className="text-[9px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                          Stock 24hs
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold text-sky-800 bg-sky-50 px-1.5 py-0.2 rounded border border-sky-200">
                          Envío 3-7 días
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="font-bold text-zinc-950 flex-shrink-0">
                    {formatCurrency(line.subtotal)}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Coupon Code Input */}
          <div className="mt-4 border-t border-zinc-200 pt-3.5">
            {appliedCoupon ? (
              <div className="flex items-center justify-between rounded-xl bg-amber-50 border border-amber-200/80 px-3 py-2 text-xs">
                <div className="flex items-center gap-1.5 text-amber-900 font-medium">
                  <Tag className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                  <span>
                    Cupón <strong>{appliedCoupon.code}</strong> (-{formatCurrency(appliedCoupon.discount)})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveCoupon}
                  className="text-amber-800 hover:text-red-600 px-1.5 py-0.5 rounded text-[11px] font-bold cursor-pointer transition-colors"
                >
                  ✕ Quitar
                </button>
              </div>
            ) : (
              <form onSubmit={handleApplyCoupon} className="flex gap-1.5">
                <input
                  type="text"
                  placeholder="Cupón de descuento (ej: BIENVENIDO10)"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  className="h-10 flex-1 rounded-xl border border-zinc-300 bg-white px-3 text-xs uppercase font-mono font-bold text-zinc-900 placeholder:normal-case placeholder:font-sans placeholder:text-zinc-400 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20"
                />
                <button
                  type="submit"
                  className="h-10 px-3.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs transition cursor-pointer shrink-0 shadow-xs"
                >
                  Aplicar
                </button>
              </form>
            )}
            {couponFeedback && (
              <p
                className={`mt-1.5 text-[11px] font-medium ${
                  couponFeedback.type === "success" ? "text-sky-700" : "text-red-600"
                }`}
              >
                {couponFeedback.text}
              </p>
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

            {appliedCoupon && (
              <div className="flex justify-between text-amber-800 font-bold bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-200">
                <span className="flex items-center gap-1">
                  <Tag className="h-3.5 w-3.5 text-amber-600" /> Cupón ({appliedCoupon.code})
                </span>
                <span>-{formatCurrency(couponDiscount)}</span>
              </div>
            )}

            {discountAmount > 0 && (
              <div className="flex justify-between text-sky-800 font-bold bg-sky-50 px-2.5 py-1.5 rounded-lg border border-sky-200">
                <span className="flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5 text-sky-600" /> Descuento 10% Transferencia
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
                  <span className="text-sky-700 font-bold">GRATIS</span>
                ) : (
                  formatCurrency(shipping)
                )}
              </span>
            </div>

            <div className="flex justify-between text-base font-black text-zinc-950 border-t border-zinc-200 pt-3">
              <span>Total Final</span>
              <span className="text-xl text-sky-800">{formatCurrency(total)}</span>
            </div>
          </div>

          <Button 
            className="mt-6 w-full cursor-pointer flex items-center justify-center gap-2 bg-zinc-950 hover:bg-zinc-800 text-white h-12 rounded-xl text-sm font-bold shadow-md" 
            disabled={cart.length === 0 || !isWholesaleValid || isPending} 
            type="submit"
          >
            {isPending && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
            {isPending ? "Procesando pedido..." : paymentMethod === "tarjeta" ? "Pagar con Tarjeta" : "Confirmar Pedido"}
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
              Atención personalizada con Máximo Calamante (Tandil).
            </p>
          </div>
        </aside>
      </form>
    </div>
  );
}
