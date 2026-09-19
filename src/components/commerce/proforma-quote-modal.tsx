"use client";

import { useState } from "react";
import {
  Printer,
  Copy,
  Check,
  MessageCircle,
  X,
  FileText,
  Building2,
  Calendar,
  ShieldCheck,
  Landmark,
  ExternalLink,
} from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { siteConfig, getWhatsAppUrl } from "@/lib/site";
import type { CartLine } from "@/components/commerce/commerce-provider";

interface ProformaQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartLine[];
  cartTotal: number;
  shippingCost: number;
  postalCode?: string;
}

export function ProformaQuoteModal({
  isOpen,
  onClose,
  cart,
  cartTotal,
  shippingCost,
  postalCode = "",
}: ProformaQuoteModalProps) {
  const [clientName, setClientName] = useState("");
  const [clientCity, setClientCity] = useState("");
  const [clientCuit, setClientCuit] = useState("");
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const quoteNumber = `COT-${Date.now().toString().slice(-6)}`;
  const issueDate = new Date().toLocaleDateString("es-AR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const transferDiscount = Math.round(cartTotal * 0.1);
  const totalWithTransfer = Math.max(0, cartTotal - transferDiscount + shippingCost);

  const handlePrint = () => {
    window.print();
  };

  const quoteWhatsappText = `*PRESUPUESTO FORMAL B2B - MYA IMPORTACIONES*
📄 *N° de Cotización:* #${quoteNumber}
📅 *Fecha:* ${issueDate}
👤 *Cliente:* ${clientName || "Cliente Mayorista"}
📍 *Destino:* ${clientCity || "A convenir"} ${postalCode ? `(CP: ${postalCode})` : ""}

📋 *DETALLE DE MERCADERÍA:*
${cart
  .map(
    (line) =>
      `• ${line.quantity}x ${line.product.title} - ${formatCurrency(
        line.channel === "wholesale" ? line.product.wholesalePrice : line.product.retailPrice
      )} c/u = ${formatCurrency(
        (line.channel === "wholesale" ? line.product.wholesalePrice : line.product.retailPrice) *
          line.quantity
      )}`
  )
  .join("\n")}

💵 *Subtotal:* ${formatCurrency(cartTotal)}
⚡ *Bonificación Transferencia (10% OFF):* -${formatCurrency(transferDiscount)}
🚚 *Envío Estimado:* ${shippingCost > 0 ? formatCurrency(shippingCost) : "A coordinar / Por expreso"}
💰 *TOTAL FINAL:* ${formatCurrency(totalWithTransfer)}

🏦 *DATOS BANCARIOS:*
Titular: Máximo Calamante
Banco: Operaciones MYA Importaciones
Alias: MYA.IMPORTACIONES.TD

⏳ Precios válidos por 7 días corridos.`;

  const handleCopyQuote = async () => {
    try {
      await navigator.clipboard.writeText(quoteWhatsappText);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-3xl bg-white shadow-2xl border border-zinc-200 overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Top Control Bar (Hidden when printing) */}
        <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50 px-6 py-4 print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-emerald-600" />
            <h2 className="text-base font-bold text-zinc-950">
              Presupuesto Formal / Factura Proforma B2B
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white px-3.5 py-1.5 text-xs font-bold transition cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" /> Imprimir / Guardar PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700 transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Printable Invoice / Quote Body */}
        <div className="p-6 md:p-8 overflow-y-auto space-y-6 text-zinc-900 print:p-0">
          {/* Official Letterhead Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-zinc-950 pb-6">
            <div>
              <span className="text-2xl font-black tracking-tight text-zinc-950 block">
                MYA IMPORTACIONES
              </span>
              <span className="text-xs font-bold text-emerald-700 block mt-0.5">
                Importación Directa & Distribución Mayorista Nacional
              </span>
              <p className="text-[11px] text-zinc-500 mt-1">
                Tandil, Provincia de Buenos Aires, Argentina<br />
                WhatsApp: +54 9 249 463-8919 | Email: maximocalamante14@gmail.com
              </p>
            </div>

            <div className="sm:text-right bg-zinc-50 p-4 rounded-2xl border border-zinc-200 sm:border-0 sm:bg-transparent sm:p-0">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 block">
                Presupuesto Oficial
              </span>
              <span className="text-xl font-mono font-black text-zinc-950 block mt-0.5">
                #{quoteNumber}
              </span>
              <span className="text-xs text-zinc-600 block mt-1">Fecha: {issueDate}</span>
              <span className="inline-block mt-1 text-[10px] font-extrabold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
                Validez: 7 días corridos
              </span>
            </div>
          </div>

          {/* Client Details Inputs (Inputs in screen, text in print) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-zinc-50 border border-zinc-200 text-xs">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                Razón Social / Comercio:
              </label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Nombre del negocio / Cliente"
                className="w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 font-semibold text-zinc-900 focus:outline-none print:border-none print:p-0 print:font-bold"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                Ciudad / Destino:
              </label>
              <input
                type="text"
                value={clientCity}
                onChange={(e) => setClientCity(e.target.value)}
                placeholder="Ej. Mar del Plata, Tandil, CABA"
                className="w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 font-semibold text-zinc-900 focus:outline-none print:border-none print:p-0"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                CUIT / DNI (Opcional):
              </label>
              <input
                type="text"
                value={clientCuit}
                onChange={(e) => setClientCuit(e.target.value)}
                placeholder="20-XXXXXXXX-X"
                className="w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 font-semibold text-zinc-900 focus:outline-none print:border-none print:p-0"
              />
            </div>
          </div>

          {/* Quotation Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b-2 border-zinc-200 text-zinc-600 uppercase tracking-wider">
                  <th className="py-2.5 font-bold">Cant.</th>
                  <th className="py-2.5 font-bold">Descripción del Producto</th>
                  <th className="py-2.5 font-bold">Modalidad</th>
                  <th className="py-2.5 font-bold text-right">Precio Unitario</th>
                  <th className="py-2.5 font-bold text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 font-medium">
                {cart.map((line, idx) => {
                  const unitPrice =
                    line.channel === "wholesale"
                      ? line.product.wholesalePrice
                      : line.product.retailPrice;
                  const lineTotal = unitPrice * line.quantity;

                  return (
                    <tr key={idx} className="hover:bg-zinc-50">
                      <td className="py-2.5 font-bold text-zinc-950">{line.quantity}</td>
                      <td className="py-2.5">
                        <span className="font-bold text-zinc-900 block">{line.product.title}</span>
                        <span className="text-[10px] text-zinc-500">{line.product.categoryName}</span>
                      </td>
                      <td className="py-2.5">
                        <span className="inline-block rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-bold text-zinc-700">
                          {line.channel === "wholesale" ? "Mayorista" : "Minorista"}
                        </span>
                      </td>
                      <td className="py-2.5 text-right text-zinc-700">{formatCurrency(unitPrice)}</td>
                      <td className="py-2.5 text-right font-black text-zinc-900">
                        {formatCurrency(lineTotal)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Totals Breakdown */}
          <div className="border-t-2 border-zinc-200 pt-4 flex flex-col items-end space-y-2 text-xs">
            <div className="flex justify-between w-64 text-zinc-600">
              <span>Subtotal Bruto:</span>
              <span className="font-semibold text-zinc-900">{formatCurrency(cartTotal)}</span>
            </div>
            <div className="flex justify-between w-64 text-emerald-700 font-bold">
              <span>Bonificación Transferencia (-10%):</span>
              <span>-{formatCurrency(transferDiscount)}</span>
            </div>
            <div className="flex justify-between w-64 text-zinc-600">
              <span>Costo de Envío:</span>
              <span className="font-semibold text-zinc-900">
                {shippingCost > 0 ? formatCurrency(shippingCost) : "A coordinar / Por expreso"}
              </span>
            </div>
            <div className="flex justify-between w-64 border-t-2 border-zinc-950 pt-2 text-sm font-black text-zinc-950">
              <span>TOTAL A TRANSFERIR:</span>
              <span className="text-base text-emerald-700">{formatCurrency(totalWithTransfer)}</span>
            </div>
          </div>

          {/* Bank Payment Info & Legal Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-zinc-200">
            <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 text-xs space-y-1.5">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-700 flex items-center gap-1.5">
                <Landmark className="h-3.5 w-3.5 text-emerald-600" />
                Datos para Pago por Transferencia
              </span>
              <div className="space-y-0.5 text-zinc-600 pt-1">
                <p><strong>Titular:</strong> {siteConfig.bankTransfer.holder}</p>
                <p><strong>Entidad:</strong> {siteConfig.bankTransfer.bank}</p>
                <p><strong>CVU:</strong> <span className="font-mono font-bold text-zinc-900 bg-white px-1.5 py-0.5 rounded-sm border border-zinc-300">{siteConfig.bankTransfer.cvu}</span></p>
                <p><strong>Alias:</strong> <span className="font-mono font-black text-zinc-900 bg-white px-1.5 py-0.5 rounded-sm border border-zinc-300">{siteConfig.bankTransfer.alias}</span></p>
                <p className="text-[10px] text-zinc-500 pt-1">
                  Enviar comprobante vía WhatsApp al {siteConfig.phone} indicando el N° #{quoteNumber}.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 text-xs space-y-1.5">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-700 flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                Condiciones Comerciales
              </span>
              <ul className="space-y-1 text-[11px] text-zinc-500 pt-1 list-disc list-inside">
                <li>Cotización en Pesos Argentinos congelada por 7 días.</li>
                <li>Despacho garantizado en 24/48hs post confirmación del pago.</li>
                <li>Embalaje protegido con seguro de transporte oficial.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Actions Bar (Hidden when printing) */}
        <div className="border-t border-zinc-200 bg-zinc-50 p-4 px-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCopyQuote}
              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-300 bg-white hover:bg-zinc-100 text-zinc-700 px-3.5 py-2 text-xs font-bold transition cursor-pointer"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "¡Copiado!" : "Copiar Texto"}
            </button>
            <a
              href={getWhatsAppUrl(quoteWhatsappText)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 text-xs font-bold transition cursor-pointer"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              Enviar Presupuesto por WhatsApp
            </a>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-xs font-semibold text-zinc-500 hover:text-zinc-800 transition cursor-pointer"
          >
            Cerrar Ventana
          </button>
        </div>
      </div>
    </div>
  );
}
