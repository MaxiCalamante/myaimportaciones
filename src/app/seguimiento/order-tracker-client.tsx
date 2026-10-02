"use client";

import Link from "next/link";
import type { PaymentMethod } from "@/lib/types";
import { useState, useTransition } from "react";
import { Search, CheckCircle2, Clock, Package, Truck, Check, AlertCircle, MessageCircle, ArrowRight } from "lucide-react";
import { trackAdsEvent } from "@/lib/analytics";
import { lookupOrderAction, type TrackingOrder } from "./actions";
import { formatCurrency, formatPaymentMethod } from "@/lib/format";
import { siteConfig, getWhatsAppUrl } from "@/lib/site";

const statusSteps = [
  { id: "pending", label: "Registrado", desc: "Esperando confirmación", icon: Clock },
  { id: "paid", label: "Pago Acreditado", desc: "Transferencia validada", icon: CheckCircle2 },
  { id: "preparing", label: "En Preparación", desc: "Armando el paquete", icon: Package },
  { id: "shipped", label: "En Camino", desc: "Despachado con guía", icon: Truck },
  { id: "delivered", label: "Entregado", desc: "Pedido completado", icon: Check },
];

function getStepIndex(status: string): number {
  switch (status) {
    case "pending": return 0;
    case "paid": return 1;
    case "preparing": return 2;
    case "shipped": return 3;
    case "delivered": return 4;
    default: return 0;
  }
}

export function OrderTrackerClient({ initialCode = "", initialEmail = "" }: { initialCode?: string; initialEmail?: string }) {
  const [code, setCode] = useState(initialCode);
  const [email, setEmail] = useState(initialEmail);
  const [order, setOrder] = useState<TrackingOrder | null>(null);
  const [searched, setSearched] = useState(false);
  const [copiedGuide, setCopiedGuide] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSearch = (searchCode: string, searchEmail: string = email) => {
    const trimmed = searchCode.trim();
    const trimmedEmail = searchEmail.trim();
    if (!trimmed) return;

    setSearched(true);
    startTransition(async () => {
      const res = await lookupOrderAction(trimmed, trimmedEmail);
      setOrder(res);
      if (res && ["paid", "preparing", "shipped", "delivered"].includes(res.status)) {
        try {
          const key = `mya_paid_${res.id}`;
          if (localStorage.getItem("mya_analytics_consent") === "granted" && !localStorage.getItem(key)) {
            trackAdsEvent("Purchase", { transaction_id: res.id, value: res.total_amount, currency: "ARS", items: res.items.map(i => ({ id: i.product_id, title: i.product_title, quantity: i.quantity, price: i.unit_price })) });
            localStorage.setItem(key, "1");
          }
        } catch {}
      }
    });
  };

  // Auto-search on mount if both code and email are provided (e.g. from checkout redirect)
  useState(() => {
    if (initialCode.trim() && initialEmail.trim()) {
      handleSearch(initialCode.trim(), initialEmail.trim());
    }
  });

  const currentStep = order ? getStepIndex(order.status) : 0;
  const isCancelled = order?.status === "cancelled";

  const whatsappInquiryUrl = order
    ? getWhatsAppUrl(
        `Hola MYA Importaciones! Consulto por el estado de mi pedido #${order.tracking_code} a nombre de ${order.shipping_name}.`
      )
    : getWhatsAppUrl("Hola MYA Importaciones! Quisiera consultar por el estado de mi compra.");

  return (
    <div className="mt-8 space-y-6">
      {/* Search Input Box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSearch(code);
        }}
        className="flex flex-col gap-2 max-w-xl mx-auto"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
          <input
            aria-label="Codigo de pedido" required type="text"
            placeholder="Ej: ORD-49521"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="h-12 w-full rounded-xl border border-zinc-300 bg-white pl-11 pr-4 text-sm font-mono font-medium text-zinc-950 placeholder:font-sans placeholder:text-zinc-400 shadow-xs outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
          />
        </div>
        <input aria-label="Email de la compra" required type="email" placeholder="Email de la compra" value={email} onChange={e => setEmail(e.target.value)} className="h-12 rounded-xl border p-3" />
        <button
          type="submit"
          disabled={isPending || !code.trim()}
          className="h-12 px-6 rounded-xl bg-zinc-950 hover:bg-zinc-800 disabled:opacity-50 text-white text-sm font-semibold shadow-xs transition flex items-center gap-2 cursor-pointer"
        >
          {isPending ? "Buscando..." : "Consultar"}
          <ArrowRight className="h-4 w-4" />
        </button>
      </form>

      {/* Result Display */}
      {searched && !isPending && !order && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-6 text-center max-w-xl mx-auto">
          <AlertCircle className="mx-auto h-8 w-8 text-amber-600" />
          <h3 className="mt-2 text-base font-bold text-amber-950">
            No encontramos el pedido &quot;{code}&quot;
          </h3>
          <p className="mt-1 text-xs text-amber-800 leading-relaxed">
            Asegurate de incluir el prefijo completo (ejemplo: <strong>ORD-12345</strong>).
            Si realizaste la compra hace instantes o pagaste por WhatsApp, podés consultarnos directamente con tu comprobante.
          </p>
          <a
            href={getWhatsAppUrl(`Hola MYA Importaciones! Necesito ayuda para rastrear mi compra: ${code}`)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition"
          >
            <MessageCircle className="h-4 w-4" />
            Consultar a soporte por WhatsApp
          </a>
        </div>
      )}

      {order && (
        <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden animate-in fade-in duration-300">
          {/* Header */}
          <div className="bg-zinc-950 text-white p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-sky-400">
                  {order.customer_tier === "wholesale" ? "Pedido Mayorista" : "Pedido Minorista"}
                </span>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-0.5">
                  Pedido #{order.tracking_code}
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Fecha: {new Date(order.created_at).toLocaleDateString("es-AR", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })} hs
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs text-zinc-400">Total</span>
                <p className="text-2xl sm:text-3xl font-black text-sky-400">
                  {formatCurrency(order.total_amount)}
                </p>
                <span className="text-[11px] text-zinc-400">
                  {formatPaymentMethod(order.payment_method as PaymentMethod)}
                </span>
              </div>
            </div>

            {/* Visual Timeline Tracker */}
            {!isCancelled ? (
              <div className="mt-8 pt-6 border-t border-zinc-800">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-2">
                  {statusSteps.map((step, idx) => {
                    const isCompleted = idx <= currentStep;
                    const isCurrent = idx === currentStep;
                    const Icon = step.icon;

                    return (
                      <div
                        key={step.id}
                        className={`flex flex-col items-center text-center p-3 rounded-xl border transition ${
                          isCurrent
                            ? "bg-sky-950/80 border-sky-400 text-sky-200 shadow-sm"
                            : isCompleted
                            ? "bg-zinc-900 border-zinc-700 text-zinc-300"
                            : "bg-zinc-950/50 border-zinc-800/60 text-zinc-600"
                        }`}
                      >
                        <div
                          className={`h-8 w-8 rounded-full flex items-center justify-center mb-2 ${
                            isCurrent
                              ? "bg-sky-500 text-white ring-4 ring-sky-500/20"
                              : isCompleted
                              ? "bg-sky-600 text-white"
                              : "bg-zinc-800 text-zinc-500"
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className="text-xs font-bold">{step.label}</span>
                        <span className="text-[10px] opacity-80 hidden sm:block mt-0.5">
                          {step.desc}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="mt-6 rounded-xl bg-red-950/50 border border-red-800 p-4 text-center">
                <p className="text-sm font-bold text-red-300">Este pedido fue cancelado.</p>
              </div>
            )}
          </div>

          {/* Details & Items */}
          <div className="p-6 sm:p-8 space-y-6">
            {/* Courier quick tracking if guide is available */}
            {order.carrier_tracking_code ? (
              <div className="rounded-2xl border-2 border-sky-300 bg-sky-50/90 p-5 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center rounded-md bg-sky-700 px-2.5 py-1 text-xs font-black uppercase tracking-wider text-white">
                        Correo Argentino Paq.ar
                      </span>
                      <span className="text-xs font-semibold text-sky-900">Despacho Oficial</span>
                    </div>
                    <p className="mt-2 text-xs text-sky-800">
                      Tu paquete fue admitido y despachado por <strong>Correo Argentino</strong> desde Tandil hacia tu localidad.
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="text-xs text-zinc-600">Número de Guía (TN):</span>
                      <span className="rounded-lg bg-white px-3 py-1 font-mono text-sm font-black text-sky-950 border border-sky-200">
                        {order.carrier_tracking_code}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if (order.carrier_tracking_code) {
                            navigator.clipboard.writeText(order.carrier_tracking_code);
                            setCopiedGuide(true);
                            setTimeout(() => setCopiedGuide(false), 2000);
                          }
                        }}
                        className="rounded-lg bg-sky-100 hover:bg-sky-200 px-3 py-1 text-xs font-bold text-sky-800 transition cursor-pointer"
                      >
                        {copiedGuide ? "✓ ¡Copiado!" : "Copiar Guía"}
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 shrink-0">
                    <a
                      href="https://www.correoargentino.com.ar/formularios/e-commerce"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-700 hover:bg-sky-800 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition"
                    >
                      <Truck className="h-4 w-4" />
                      Rastrear en Correo Argentino
                    </a>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-xs text-zinc-700 flex items-start gap-3">
                <Package className="h-5 w-5 text-sky-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-zinc-900">Preparación y Despacho por Correo Argentino</p>
                  <p className="mt-0.5 text-zinc-600">
                    Estamos embalando tus productos con protección anti-impacto en nuestro depósito central de Tandil. En cuanto Correo Argentino retire la encomienda, se generará tu número de guía oficial para que sigas el viaje en tiempo real.
                  </p>
                </div>
              </div>
            )}

            {/* Customer & Shipping Summary */}
            <div className="grid sm:grid-cols-2 gap-4 rounded-xl bg-zinc-50 p-4 border border-zinc-100 text-xs">
              <div>
                <p className="font-semibold text-zinc-500 uppercase tracking-wider">Destinatario</p>
                <p className="font-bold text-zinc-900 text-sm mt-0.5">{order.shipping_name}</p>
                <p className="text-zinc-600 mt-0.5">Tel: {order.shipping_phone}</p>
              </div>
              <div>
                <p className="font-semibold text-zinc-500 uppercase tracking-wider">Entrega</p>
                <p className="text-zinc-800 font-medium mt-0.5">{order.shipping_address}</p>
                <p className="text-sky-700 font-semibold mt-0.5">
                  Envío: {order.shipping_option === "delivery_quote_separately" ? "A cotizar y abonar por separado. El total corresponde a los productos." : order.shipping_amount === 0 ? "Bonificado / Retiro en depósito" : formatCurrency(order.shipping_amount)}
                </p>
              </div>
            </div>

            {/* Products List */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-3">
                Productos en el Pedido ({order.items?.length || 0})
              </h4>
              <div className="divide-y divide-zinc-100 border border-zinc-200 rounded-xl overflow-hidden">
                {order.items?.map((item) => (
                  <div key={item.id} className="p-3.5 flex items-center justify-between text-xs sm:text-sm">
                    <div className="flex-1 pr-4">
                      <p className="font-semibold text-zinc-900">{item.product_title}</p>
                      <p className="text-zinc-500 text-xs mt-0.5">
                        {item.quantity} {item.quantity === 1 ? "unidad" : "unidades"} × {formatCurrency(item.unit_price)}
                      </p>
                    </div>
                    <div className="font-bold text-zinc-950">
                      {formatCurrency(item.unit_price * item.quantity)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t border-zinc-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <a
                href={whatsappInquiryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-5 py-3 text-xs font-bold text-white shadow-xs transition"
              >
                <MessageCircle className="h-4 w-4" />
                Consultar a MYA por WhatsApp
              </a>

              <Link
                href="/"
                className="text-xs font-semibold text-zinc-600 hover:text-zinc-950 transition"
              >
                ← Seguir navegando la tienda
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
