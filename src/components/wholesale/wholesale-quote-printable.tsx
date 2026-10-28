"use client";

import Link from "next/link";
import { Printer, ArrowLeft, Download, ShieldCheck, Check, Sparkles, Building2 } from "lucide-react";
import { useCommerce } from "@/components/commerce/commerce-provider";
import { formatCurrency } from "@/lib/format";
import { siteConfig } from "@/lib/site";
import {
  calculateTieredWholesalePrice,
  validateWholesaleOrder,
  WHOLESALE_MIN_AMOUNT,
  WHOLESALE_MIN_UNITS,
} from "@/lib/wholesale-policy";
import type { Profile } from "@/lib/auth";
import type { Product } from "@/lib/types";
import type { wholesaleQuoteHeader } from "@/lib/wholesale-quote-header";

interface Props {
  profile: Profile | null;
  catalogProducts?: Product[];
  header: ReturnType<typeof wholesaleQuoteHeader>;
}

export function WholesaleQuotePrintable({ profile, catalogProducts = [], header }: Props) {
  const { cart } = useCommerce();
  const { quoteNumber, issueDate, expirationDate } = header;

  const wholesaleCartLines = cart.filter((l) => l.channel === "wholesale");
  const useCartItems = wholesaleCartLines.length > 0;

  // Si el usuario tiene productos mayoristas en carrito, cotiza su carrito.
  // De lo contrario, toma los primeros productos destacados del catálogo mayorista para muestra formal.
  const quoteItems = useCartItems
    ? wholesaleCartLines.map((line) => {
        const basePrice = line.variantPrice ?? line.product.wholesalePrice;
        const tiered = calculateTieredWholesalePrice(basePrice, line.quantity);
        return {
          id: line.product.id,
          title: line.product.title,
          sku: line.variantSku || line.product.sku || "-",
          category: line.product.categoryName,
          quantity: line.quantity,
          basePrice,
          unitPrice: tiered.unitPrice,
          discountPct: tiered.discountPct,
          tierLabel: tiered.tierLabel,
          total: tiered.total,
        };
      })
    : catalogProducts.slice(0, 8).map((p) => {
        const basePrice = p.wholesalePrice;
        const qty = Math.max(p.wholesaleMinQuantity, 4);
        const tiered = calculateTieredWholesalePrice(basePrice, qty);
        return {
          id: p.id,
          title: p.title,
          sku: p.sku || "-",
          category: p.categoryName,
          quantity: qty,
          basePrice,
          unitPrice: tiered.unitPrice,
          discountPct: tiered.discountPct,
          tierLabel: tiered.tierLabel,
          total: tiered.total,
        };
      });

  const subtotalBeforeVolume = quoteItems.reduce((acc, i) => acc + i.basePrice * i.quantity, 0);
  const totalQuote = quoteItems.reduce((acc, i) => acc + i.total, 0);
  const volumeSavings = Math.max(0, subtotalBeforeVolume - totalQuote);
  const totalUnits = quoteItems.reduce((acc, i) => acc + i.quantity, 0);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-zinc-100 py-6 px-4 sm:px-6 print:bg-white print:p-0 print:m-0">
      {/* Barra de acciones (no se imprime) */}
      <div className="mx-auto max-w-4xl mb-6 flex flex-wrap items-center justify-between gap-4 print:hidden">
        <Link
          href="/mayorista"
          className="inline-flex items-center gap-2 rounded-xl bg-white border border-zinc-300 px-4 py-2.5 text-xs sm:text-sm font-bold text-zinc-700 hover:bg-zinc-50 transition shadow-xs"
        >
          <ArrowLeft className="size-4" />
          <span>Volver al Catálogo</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 rounded-xl bg-zinc-950 px-5 py-2.5 text-xs sm:text-sm font-bold text-white hover:bg-zinc-800 transition shadow-md cursor-pointer"
          >
            <Printer className="size-4 text-amber-400" />
            <span>Imprimir o Guardar como PDF</span>
          </button>
        </div>
      </div>

      {/* Hoja de Presupuesto Formal (A4) */}
      <article className="mx-auto max-w-4xl bg-white text-zinc-900 rounded-2xl shadow-xl border border-zinc-200/80 p-8 sm:p-12 print:shadow-none print:border-none print:rounded-none print:p-6 print:max-w-none">
        {/* Cabecera / Membrete */}
        <header className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b border-zinc-200 pb-8">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-lg bg-zinc-950 text-white font-black text-sm">
                M
              </span>
              <h1 className="text-2xl font-black tracking-tight text-zinc-950 uppercase">
                MYA Importaciones
              </h1>
            </div>
            <p className="mt-1 text-xs text-zinc-500 font-semibold uppercase tracking-wider">
              Distribución Mayorista Oficial &middot; Tandil, Buenos Aires
            </p>
            <div className="mt-3 text-xs text-zinc-600 space-y-0.5">
              <p>Email: {siteConfig.email}</p>
              <p>WhatsApp Comercial: {siteConfig.phone}</p>
              <p>Sitio Web: https://myaimportaciones.com</p>
            </div>
          </div>

          <div className="rounded-xl bg-zinc-50 border border-zinc-200 p-4 text-right min-w-[220px]">
            <span className="inline-block rounded-md bg-amber-400 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-zinc-950">
              Presupuesto Formal B2B
            </span>
            <p className="mt-2 text-sm font-extrabold text-zinc-950">{quoteNumber}</p>
            <div className="mt-2 text-xs text-zinc-500 space-y-0.5">
              <p>Fecha de emisión: <strong className="text-zinc-800">{issueDate}</strong></p>
              <p>Validez de la oferta: <strong className="text-zinc-800">{expirationDate}</strong></p>
            </div>
          </div>
        </header>

        {/* Datos del Cliente / Revendedor */}
        <section className="my-6 rounded-xl bg-zinc-50/80 border border-zinc-200/80 p-4 sm:p-5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 block mb-2">
            Información del Destinatario Comercial
          </span>
          <div className="grid gap-3 sm:grid-cols-2 text-xs sm:text-sm">
            <div>
              <span className="text-zinc-500 text-xs block">Razón Social / Comercio:</span>
              <strong className="text-zinc-950 text-base">
                {profile?.businessName || profile?.fullName || "Cliente Mayorista / Revendedor"}
              </strong>
            </div>
            <div>
              <span className="text-zinc-500 text-xs block">CUIT / CUIL / DNI:</span>
              <strong className="text-zinc-950">{profile?.cuit || "A informar"}</strong>
            </div>
            <div>
              <span className="text-zinc-500 text-xs block">Correo Electrónico:</span>
              <span className="text-zinc-800">{profile?.email || "Sin registrar"}</span>
            </div>
            <div>
              <span className="text-zinc-500 text-xs block">Teléfono / WhatsApp:</span>
              <span className="text-zinc-800">{profile?.phone || "Sin registrar"}</span>
            </div>
          </div>
        </section>

        {/* Tabla de Productos Cotizados */}
        <section className="my-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-zinc-950 text-[11px] font-bold uppercase tracking-wider text-zinc-600">
                  <th className="py-2.5 pr-2">#</th>
                  <th className="py-2.5 px-2">Descripción</th>
                  <th className="py-2.5 px-2">SKU</th>
                  <th className="py-2.5 px-2 text-center">Cant.</th>
                  <th className="py-2.5 px-2 text-right">Precio Mayorista</th>
                  <th className="py-2.5 px-2 text-center">Escala</th>
                  <th className="py-2.5 pl-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 text-zinc-800">
                {quoteItems.map((item, idx) => (
                  <tr key={item.id + idx} className="hover:bg-zinc-50/50">
                    <td className="py-3 pr-2 font-mono text-zinc-400 text-xs">{idx + 1}</td>
                    <td className="py-3 px-2 font-semibold text-zinc-950 max-w-xs">
                      {item.title}
                      <span className="block text-[11px] font-normal text-zinc-500">{item.category}</span>
                    </td>
                    <td className="py-3 px-2 font-mono text-xs text-zinc-500">{item.sku}</td>
                    <td className="py-3 px-2 text-center font-bold text-zinc-950">{item.quantity}</td>
                    <td className="py-3 px-2 text-right tabular-nums">{formatCurrency(item.unitPrice)}</td>
                    <td className="py-3 px-2 text-center">
                      {item.discountPct > 0 ? (
                        <span className="inline-block rounded bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 text-[10px] font-bold text-indigo-800">
                          -{item.discountPct}% extra
                        </span>
                      ) : (
                        <span className="text-zinc-400 text-xs">-</span>
                      )}
                    </td>
                    <td className="py-3 pl-2 text-right font-bold tabular-nums text-zinc-950">
                      {formatCurrency(item.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Resumen de Totales */}
          <div className="mt-6 flex flex-col sm:flex-row justify-between items-start gap-4 border-t-2 border-zinc-950 pt-4">
            <div className="text-xs text-zinc-500 space-y-1">
              <p>Total de unidades cotizadas: <strong className="text-zinc-900">{totalUnits} unidades</strong></p>
              <p>Condición comercial: Precios cerrados por bulto mayorista</p>
              {volumeSavings > 0 && (
                <p className="text-emerald-700 font-bold">
                  ✓ Incluye ahorro por escala de volumen de {formatCurrency(volumeSavings)}
                </p>
              )}
            </div>

            <div className="w-full sm:w-72 rounded-xl bg-zinc-50 p-4 border border-zinc-200 text-right space-y-1.5">
              <div className="flex justify-between text-xs text-zinc-600">
                <span>Subtotal Bruto:</span>
                <span className="tabular-nums">{formatCurrency(subtotalBeforeVolume)}</span>
              </div>
              {volumeSavings > 0 && (
                <div className="flex justify-between text-xs text-emerald-700 font-semibold">
                  <span>Descuento por Volumen:</span>
                  <span className="tabular-nums">-{formatCurrency(volumeSavings)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-black text-zinc-950 border-t border-zinc-200 pt-2">
                <span>TOTAL FINAL:</span>
                <span className="tabular-nums text-lg text-emerald-700">{formatCurrency(totalQuote)}</span>
              </div>
              <p className="text-[10px] text-zinc-500">Valores expresados en Pesos Argentinos (ARS)</p>
            </div>
          </div>
        </section>

        {/* Términos y Condiciones Comerciales */}
        <footer className="mt-8 border-t border-zinc-200 pt-6 text-xs text-zinc-600 space-y-3">
          <h2 className="font-bold uppercase tracking-wider text-zinc-900 text-[11px]">
            Condiciones de la Operación Mayorista:
          </h2>
          <ul className="list-disc pl-5 space-y-1 leading-relaxed text-[11px] sm:text-xs">
            <li>
              <strong>Mínimo de Compra:</strong> Pedido mínimo general de ${WHOLESALE_MIN_AMOUNT.toLocaleString("es-AR")} o {WHOLESALE_MIN_UNITS} unidades combinables entre cualquier rubro.
            </li>
            <li>
              <strong>Escalas por Volumen:</strong> 12 a 23 unidades del mismo producto obtienen 5% extra. A partir de 24 unidades (Master Box) se aplica 10% extra sobre el precio mayorista base.
            </li>
            <li>
              <strong>Forma de Pago:</strong> Transferencia bancaria inmediata. CBU / Alias oficial informado al momento de confirmar la orden.
            </li>
            <li>
              <strong>Logística y Despacho:</strong> Envíos a todo el país vía Correo Argentino o expreso de tu preferencia. Despacho garantizado en 24/48 hs hábiles luego de la confirmación.
            </li>
            <li>
              <strong>Garantía de Origen:</strong> Mercadería 100% original de importación directa con embalaje y protección de carga.
            </li>
          </ul>

          <div className="mt-8 flex justify-between items-end pt-4 border-t border-zinc-100">
            <div>
              <p className="text-[10px] text-zinc-400">
                Documento generado por el sistema de cotizaciones B2B de MYA Importaciones.
              </p>
            </div>
            <div className="text-right">
              <span className="font-black text-xs text-zinc-900 uppercase block">MYA Importaciones</span>
              <span className="text-[10px] text-zinc-500">Administración Comercial · Tandil</span>
            </div>
          </div>
        </footer>
      </article>
    </div>
  );
}
