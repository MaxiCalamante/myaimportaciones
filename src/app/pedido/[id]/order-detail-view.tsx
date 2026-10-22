"use client";

import Link from "next/link";
import { useState } from "react";
import {
  CheckCircle2,
  Clock,
  Package,
  Truck,
  Check,
  Copy,
  Printer,
  ArrowRight,
  ExternalLink,
  ShoppingBag,
  MessageCircle,
  HelpCircle,
  ShieldCheck,
} from "lucide-react";
import { formatCurrency, formatPaymentMethod } from "@/lib/format";
import { siteConfig, getWhatsAppUrl } from "@/lib/site";

export interface PublicOrderItem {
  id: string;
  product_title: string;
  variant_title?: string | null;
  quantity: number;
  unit_price: number;
}

export interface PublicOrder {
  id: string;
  tracking_code: string;
  status: string;
  created_at: string;
  payment_method: string;
  payment_url?: string | null;
  subtotal_amount: number;
  discount_amount: number;
  shipping_amount: number;
  shipping_option: string | null;
  total_amount: number;
  shipping_name: string;
  shipping_phone?: string | null;
  shipping_address: string;
  carrier_tracking_code?: string | null;
  order_notes?: string | null;
  order_items: PublicOrderItem[];
}

const statusSteps = [
  { id: "pending", label: "Registrado", desc: "Esperando pago", icon: Clock },
  { id: "paid", label: "Pago Acreditado", desc: "Transferencia validada", icon: CheckCircle2 },
  { id: "preparing", label: "En Preparación", desc: "Armando en Tandil", icon: Package },
  { id: "shipped", label: "En Camino", desc: "Despachado por Correo Argentino", icon: Truck },
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

export function OrderDetailView({ order }: { order: PublicOrder }) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const currentStep = getStepIndex(order.status);
  const isCancelled = order.status === "cancelled";

  const formattedDate = new Date(order.created_at).toLocaleDateString("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const whatsappMessage = `Hola MYA Importaciones! Realicé el pedido #${order.tracking_code} por un total de ${formatCurrency(order.total_amount)} a nombre de ${order.shipping_name}.`;
  const whatsappTransferMessage = `Hola MYA Importaciones! Realicé la transferencia para el pedido #${order.tracking_code} por ${formatCurrency(order.total_amount)} a nombre de ${order.shipping_name}. Adjunto el comprobante.`;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Print-Only Official Invoice / Packing Header */}
      <div className="hidden print:block border-b-2 border-zinc-950 pb-5 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-zinc-950 uppercase">
              MYA IMPORTACIONES
            </h1>
            <p className="text-xs text-zinc-600 mt-0.5">
              Comprobante Oficial de Pedido · Depósito Central Tandil
            </p>
            <p className="text-xs text-zinc-600">
              WhatsApp: +54 9 249 463-8919 · www.myaimportaciones.com
            </p>
          </div>
          <div className="text-right">
            <span className="text-[11px] text-zinc-500 uppercase font-bold block">
              Comprobante N°
            </span>
            <span className="font-mono text-xl font-black text-zinc-950 block">
              #{order.tracking_code}
            </span>
            <span className="text-xs text-zinc-600 block mt-0.5">{formattedDate}</span>
          </div>
        </div>
      </div>

      {/* Header & Status Banner */}
      <div className="rounded-3xl border border-zinc-200 bg-white p-6 sm:p-8 shadow-xs space-y-6 print:border-none print:shadow-none print:p-0">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-100 pb-6 print:border-zinc-200">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-800 ring-1 ring-inset ring-sky-600/20 print:hidden">
              <ShoppingBag className="size-3.5" /> Comprobante Oficial MYA
            </span>
            <h1 className="mt-2 text-2xl sm:text-3xl font-black text-zinc-950">
              Pedido #{order.tracking_code}
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-zinc-500">
              Registrado el {formattedDate}
            </p>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 px-3.5 py-2.5 text-xs font-bold text-zinc-800 transition cursor-pointer shadow-2xs"
            >
              <Printer className="size-4 text-zinc-600" />
              <span>Imprimir / PDF</span>
            </button>
            <button
              type="button"
              onClick={() => copyToClipboard(order.tracking_code, "tracking")}
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 px-3.5 py-2.5 text-xs font-bold text-zinc-800 transition cursor-pointer shadow-2xs"
            >
              {copiedField === "tracking" ? (
                <>
                  <Check className="size-4 text-emerald-600" />
                  <span>¡Código Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="size-4 text-zinc-500" />
                  <span>Copiar Código</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Stepper Timeline */}
        <div className="print:hidden">
          <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4">
            Estado del Pedido
          </h2>
          {isCancelled ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
              Este pedido ha sido cancelado. Si creés que se trata de un error o deseás reactivarlo, por favor contactanos por WhatsApp.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
              {statusSteps.map((step, idx) => {
                const Icon = step.icon;
                const isPassed = currentStep > idx;
                const isCurrent = currentStep === idx;

                return (
                  <div
                    key={step.id}
                    className={`flex flex-col items-center text-center p-3 rounded-2xl border transition-all ${
                      isCurrent
                        ? "border-sky-500 bg-sky-50/70 shadow-xs ring-1 ring-sky-500"
                        : isPassed
                        ? "border-emerald-200 bg-emerald-50/60"
                        : "border-zinc-200 bg-zinc-50/50 opacity-60"
                    }`}
                  >
                    <div
                      className={`flex size-8 items-center justify-center rounded-full mb-2 ${
                        isCurrent
                          ? "bg-sky-600 text-white shadow-xs"
                          : isPassed
                          ? "bg-emerald-600 text-white"
                          : "bg-zinc-200 text-zinc-500"
                      }`}
                    >
                      <Icon className="size-4" />
                    </div>
                    <span className="text-xs font-bold text-zinc-900 block leading-tight">
                      {step.label}
                    </span>
                    <span className="text-[10px] text-zinc-500 block mt-0.5 leading-tight">
                      {step.desc}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Transfer Information Box (if pending payment or bank transfer) */}
      {order.payment_method === "transferencia" && (
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50/40 p-6 sm:p-7 shadow-xs space-y-4 print:border print:border-emerald-200 print:p-4">
          <div className="flex items-center gap-2 font-bold text-emerald-950 text-base">
            <ShieldCheck className="size-5 text-emerald-700" />
            <span>Datos para la Transferencia Bancaria Directa</span>
          </div>
          <p className="text-xs sm:text-sm text-emerald-900 leading-relaxed print:text-xs">
            Para validar tu compra y despachar tu encomienda desde nuestro depósito central de Tandil, realizá la transferencia por el total exacto:
          </p>

          <div className="rounded-2xl border border-emerald-200 bg-white p-4 sm:p-5 space-y-3 shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 pb-3">
              <div>
                <span className="text-xs text-zinc-500 block">Total a transferir</span>
                <strong className="text-2xl font-black text-emerald-950">
                  {formatCurrency(order.total_amount)}
                </strong>
              </div>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-900">
                -3% OFF Aplicado
              </span>
            </div>

            <div className="flex items-center justify-between gap-3 border-b border-zinc-100 pb-2.5">
              <div>
                <span className="text-[11px] text-zinc-500 block uppercase font-medium">CVU</span>
                <span className="font-mono text-sm sm:text-base font-bold text-zinc-900 select-all">
                  {siteConfig.bankTransfer.cvu}
                </span>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(siteConfig.bankTransfer.cvu, "cvu")}
                className="shrink-0 rounded-lg border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 px-3 py-1.5 text-xs font-bold text-zinc-800 transition cursor-pointer print:hidden"
              >
                {copiedField === "cvu" ? "✓ Copiado" : "Copiar CVU"}
              </button>
            </div>

            <div className="flex items-center justify-between gap-3 border-b border-zinc-100 pb-2.5">
              <div>
                <span className="text-[11px] text-zinc-500 block uppercase font-medium">Alias</span>
                <span className="font-mono text-sm sm:text-base font-bold text-zinc-900 select-all">
                  {siteConfig.bankTransfer.alias}
                </span>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(siteConfig.bankTransfer.alias, "alias")}
                className="shrink-0 rounded-lg border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 px-3 py-1.5 text-xs font-bold text-zinc-800 transition cursor-pointer print:hidden"
              >
                {copiedField === "alias" ? "✓ Copiado" : "Copiar Alias"}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs text-zinc-600 pt-1">
              <div>
                <span className="text-zinc-400 block text-[11px]">Banco / Billetera</span>
                <strong className="text-zinc-900 font-semibold">{siteConfig.bankTransfer.bank}</strong>
              </div>
              <div>
                <span className="text-zinc-400 block text-[11px]">Titular</span>
                <strong className="text-zinc-900 font-semibold">{siteConfig.bankTransfer.holder}</strong>
              </div>
            </div>
          </div>

          <a
            href={getWhatsAppUrl(whatsappTransferMessage)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white p-4 font-bold text-sm shadow-xs transition cursor-pointer print:hidden"
          >
            <MessageCircle className="size-4" />
            <span>Enviar Comprobante por WhatsApp →</span>
          </a>
        </div>
      )}

      {/* Mercado Pago payment recovery button */}
      {order.payment_method === "mercado_pago" && order.status === "pending" && order.payment_url && (
        <div className="rounded-3xl border border-sky-200 bg-sky-50/60 p-6 shadow-xs space-y-3 print:hidden">
          <h3 className="font-bold text-sky-950 text-base">Completá tu pago con Mercado Pago</h3>
          <p className="text-xs sm:text-sm text-sky-900 leading-relaxed">
            Tu pedido está reservado. Si aún no completaste el pago, podés acceder directamente a la pasarela segura de Mercado Pago:
          </p>
          <a
            href={order.payment_url}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white px-6 py-3.5 font-bold text-sm shadow-xs transition"
          >
            <span>Ir a Mercado Pago →</span>
          </a>
        </div>
      )}

      {/* Carrier Tracking Code (Correo Argentino) */}
      {order.carrier_tracking_code && (
        <div className="rounded-3xl border border-amber-300 bg-amber-50/70 p-6 shadow-xs space-y-3 print:border print:border-amber-300">
          <div className="flex items-center gap-2 font-bold text-amber-950 text-base">
            <Truck className="size-5 text-amber-700" />
            <span>Guía Oficial de Correo Argentino</span>
          </div>
          <p className="text-xs sm:text-sm text-amber-900">
            Tu paquete ya cuenta con código oficial de admisión en Correo Argentino:
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-lg font-black text-amber-950 bg-white px-4 py-2 rounded-xl border border-amber-200">
              {order.carrier_tracking_code}
            </span>
            <a
              href={`https://www.correoargentino.com.ar/formularios/e-commerce?id=${encodeURIComponent(order.carrier_tracking_code)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 text-xs font-bold shadow-2xs transition print:hidden"
            >
              <span>Rastrear en Correo Argentino</span>
              <ExternalLink className="size-3.5" />
            </a>
          </div>
        </div>
      )}

      {/* Items Breakdown */}
      <div className="rounded-3xl border border-zinc-200 bg-white p-6 sm:p-8 shadow-xs space-y-5 print:border print:border-zinc-300 print:shadow-none print:p-4">
        <h2 className="text-lg font-bold text-zinc-950">Artículos del Pedido</h2>
        <div className="divide-y divide-zinc-100 print:divide-zinc-200">
          {order.order_items.map((item) => (
            <div key={item.id} className="py-3.5 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="font-semibold text-sm text-zinc-900 break-words">
                  {item.product_title}
                </h3>
                {item.variant_title && !item.product_title.includes(item.variant_title) && (
                  <p className="text-xs text-zinc-500 mt-0.5">{item.variant_title}</p>
                )}
                <span className="text-xs text-zinc-500 mt-1 block">
                  {item.quantity} × {formatCurrency(item.unit_price)}
                </span>
              </div>
              <strong className="text-sm font-bold text-zinc-950 tabular-nums shrink-0">
                {formatCurrency(item.quantity * item.unit_price)}
              </strong>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="border-t border-zinc-100 pt-4 space-y-2 text-sm print:border-zinc-200">
          <div className="flex justify-between text-zinc-600 text-xs sm:text-sm">
            <span>Subtotal</span>
            <span className="tabular-nums font-medium">{formatCurrency(order.subtotal_amount)}</span>
          </div>
          {order.discount_amount > 0 && (
            <div className="flex justify-between text-emerald-700 text-xs sm:text-sm font-semibold">
              <span>Descuento aplicado (-3% Transferencia)</span>
              <span className="tabular-nums">-{formatCurrency(order.discount_amount)}</span>
            </div>
          )}
          <div className="flex justify-between text-zinc-600 text-xs sm:text-sm">
            <span>Envío ({order.shipping_option === "pickup_tandil" ? "Retiro en Tandil" : "Correo Argentino"})</span>
            <span className="tabular-nums font-medium">
              {order.shipping_amount === 0 ? "Gratis / Retiro" : formatCurrency(order.shipping_amount)}
            </span>
          </div>
          <div className="flex justify-between border-t border-zinc-200 pt-3 text-lg font-black text-zinc-950">
            <span>Total</span>
            <span className="tabular-nums text-2xl">{formatCurrency(order.total_amount)}</span>
          </div>
        </div>
      </div>

      {/* Shipping & Delivery Details */}
      <div className="rounded-3xl border border-zinc-200 bg-white p-6 sm:p-8 shadow-xs space-y-4 print:border print:border-zinc-300 print:shadow-none print:p-4">
        <h2 className="text-lg font-bold text-zinc-950">Destino y Entrega</h2>
        <div className="grid sm:grid-cols-2 gap-4 text-xs sm:text-sm bg-zinc-50 p-4 rounded-2xl border border-zinc-100 print:bg-white print:border-none print:p-0">
          <div>
            <span className="text-[11px] text-zinc-500 block uppercase font-semibold">Destinatario</span>
            <strong className="text-zinc-900 block font-semibold">{order.shipping_name}</strong>
            {order.shipping_phone && <span className="text-zinc-600 block mt-0.5">{order.shipping_phone}</span>}
          </div>
          <div>
            <span className="text-[11px] text-zinc-500 block uppercase font-semibold">Dirección de Entrega</span>
            <span className="text-zinc-800 font-medium block">{order.shipping_address}</span>
          </div>
          <div className="sm:col-span-2 border-t border-zinc-200/80 pt-3 print:border-zinc-200">
            <span className="text-[11px] text-zinc-500 block uppercase font-semibold">Medio de Pago</span>
            <span className="text-zinc-800 font-medium block">
              {formatPaymentMethod(order.payment_method)}
            </span>
          </div>
        </div>
      </div>

      {/* Print Footer */}
      <div className="hidden print:block mt-8 pt-4 border-t border-zinc-200 text-center text-[11px] text-zinc-500">
        <p>Comprobante de compra emitido por MYA Importaciones · Depósito Central Tandil · Despachos oficiales Correo Argentino.</p>
        <p className="mt-0.5">¡Gracias por tu compra! Ante cualquier duda comunicate con nosotros indicando tu código #{order.tracking_code}.</p>
      </div>

      {/* Footer Support & Navigation */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2 print:hidden">
        <button
          type="button"
          onClick={handlePrint}
          className="rounded-2xl border border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-800 p-3.5 text-center font-bold text-sm shadow-2xs transition flex items-center justify-center gap-2 cursor-pointer"
        >
          <Printer className="size-4 text-zinc-600" />
          <span>Imprimir / Guardar en PDF</span>
        </button>
        <Link
          href="/"
          className="flex-1 rounded-2xl border border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-800 p-3.5 text-center font-bold text-sm shadow-2xs transition"
        >
          Volver a la Tienda
        </Link>
        <a
          href={getWhatsAppUrl(whatsappMessage)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 rounded-2xl bg-zinc-950 hover:bg-zinc-800 text-white p-3.5 text-center font-bold text-sm shadow-xs transition flex items-center justify-center gap-2"
        >
          <MessageCircle className="size-4" />
          <span>Consultar por WhatsApp</span>
        </a>
      </div>
    </div>
  );
}
