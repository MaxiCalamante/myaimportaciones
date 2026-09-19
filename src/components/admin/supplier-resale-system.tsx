"use client";

import { useState, useMemo, useTransition } from "react";
import {
  Calculator,
  TrendingUp,
  DollarSign,
  Truck,
  Building2,
  Copy,
  Check,
  MessageCircle,
  ExternalLink,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Boxes,
  Percent,
  Download,
  CheckCircle2,
  AlertCircle,
  Package,
} from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { siteConfig } from "@/lib/site";
import { updateProductPricesAction } from "@/app/admin/actions";
import type { Category, Product } from "@/lib/types";

interface SupplierResaleSystemProps {
  products: Product[];
  categories: Category[];
  customSuppliers?: Array<{ id: string; name: string; categoryType?: string; url?: string }>;
}

export function SupplierResaleSystem({
  products,
  categories,
  customSuppliers = [],
}: SupplierResaleSystemProps) {
  const [isPending, startTransition] = useTransition();

  // Mode: existing catalog product vs custom simulation
  const [mode, setMode] = useState<"catalog" | "custom">("catalog");
  const [selectedProductId, setSelectedProductId] = useState<string>(products[0]?.id || "");

  // Custom product fields
  const [customTitle, setCustomTitle] = useState("Amoladora Angular 850W Total Tools");
  const [customCategory, setCustomCategory] = useState("Herramientas Eléctricas");
  const [customSupplier, setCustomSupplier] = useState("Total Tools Paraguay");

  // Currency & cost configuration
  const [currency, setCurrency] = useState<"USD" | "PYG" | "ARS">("USD");
  const [costInput, setCostInput] = useState<number>(28);
  const [exchangeUsdArs, setExchangeUsdArs] = useState<number>(1350);
  const [exchangePygArs, setExchangePygArs] = useState<number>(5.6); // 5.6 PYG = 1 ARS (approx 7.560 PYG/USD)
  
  // Logistics & Margins
  const [logisticsPercent, setLogisticsPercent] = useState<number>(12); // Flete + Aduana/Frontera
  const [myaMarkupPercent, setMyaMarkupPercent] = useState<number>(20); // Ganancia MYA sobre costo puesto
  const [retailMultiplier, setRetailMultiplier] = useState<number>(2.0); // Ecuación base: 2.0x costo
  const [mercadoLibreMarkup, setMercadoLibreMarkup] = useState<number>(8); // Referencia ML sobre PVP (5-10% sobre PVP)

  // Reseller Pack volume quantity
  const [packQuantity, setPackQuantity] = useState<number>(12);

  // Status & copy feedback
  const [copiedQuote, setCopiedQuote] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Selected product object
  const selectedProduct = useMemo(() => {
    return products.find((p) => p.id === selectedProductId) || null;
  }, [products, selectedProductId]);

  // If a catalog product is chosen, infer default cost in USD based on retail price / 2
  const activeTitle = mode === "catalog" ? selectedProduct?.title || "Producto" : customTitle;
  const activeCategory = mode === "catalog" ? selectedProduct?.categoryName || "General" : customCategory;

  // When changing selected product, update default cost
  const handleProductSelect = (prodId: string) => {
    setSelectedProductId(prodId);
    const p = products.find((x) => x.id === prodId);
    if (p) {
      // Estimated origin USD cost: retailPrice / 2.0 / exchangeUsdArs
      const estimatedUsd = Math.round((p.retailPrice / (retailMultiplier || 2.0) / exchangeUsdArs) * 10) / 10;
      setCostInput(estimatedUsd > 0 ? estimatedUsd : 25);
    }
  };

  // 1. Financial Calculations
  const calculations = useMemo(() => {
    // A. Convert origin cost to ARS
    let costInArs = 0;
    if (currency === "USD") {
      costInArs = costInput * exchangeUsdArs;
    } else if (currency === "PYG") {
      costInArs = exchangePygArs > 0 ? costInput / exchangePygArs : 0;
    } else {
      costInArs = costInput;
    }

    // B. Landed Cost in Tandil (Costo puesto con flete y frontera)
    const freightAmount = costInArs * (logisticsPercent / 100);
    const landedCost = Math.round(costInArs + freightAmount);

    // C. MYA Wholesale B2B Price (Precio al que MYA le vende al revendedor)
    const myaWholesalePrice = Math.round(landedCost * (1 + myaMarkupPercent / 100));
    const myaProfitPerUnit = myaWholesalePrice - landedCost;
    const myaProfitMargin = myaWholesalePrice > 0 ? (myaProfitPerUnit / myaWholesalePrice) * 100 : 0;

    // D. Suggested Retail Price (PVP Recomendado al público)
    // Formula: 2.0x Landed Cost
    const suggestedRetailPrice = Math.round(landedCost * retailMultiplier);

    // E. Reseller Profit Margin (Lo que gana el cliente revendedor)
    const resellerProfitPerUnit = Math.max(0, suggestedRetailPrice - myaWholesalePrice);
    const resellerMarginPercent = suggestedRetailPrice > 0 
      ? (resellerProfitPerUnit / suggestedRetailPrice) * 100 
      : 0;
    const resellerRoiPercent = myaWholesalePrice > 0 
      ? (resellerProfitPerUnit / myaWholesalePrice) * 100 
      : 0;

    // F. Mercado Libre Benchmark
    const estimatedMlPrice = Math.round(suggestedRetailPrice * (1 + mercadoLibreMarkup / 100));
    const savingVsMl = Math.max(0, estimatedMlPrice - suggestedRetailPrice);
    const savingPercentVsMl = estimatedMlPrice > 0 ? (savingVsMl / estimatedMlPrice) * 100 : 0;

    // G. Reseller Batch Packs
    const packTiers = [
      { qty: 6, label: "Pack Inicial (6 un.)" },
      { qty: 12, label: "Caja Cerrada (12 un.)" },
      { qty: 24, label: "Lote Mayorista (24 un.)" },
      { qty: packQuantity, label: `Personalizado (${packQuantity} un.)` },
    ];

    const packCalculations = packTiers.map((tier) => {
      const totalInvestment = myaWholesalePrice * tier.qty;
      const totalRevenue = suggestedRetailPrice * tier.qty;
      const totalResellerProfit = resellerProfitPerUnit * tier.qty;
      const totalMyaProfit = myaProfitPerUnit * tier.qty;
      return {
        ...tier,
        totalInvestment,
        totalRevenue,
        totalResellerProfit,
        totalMyaProfit,
      };
    });

    return {
      costInArs: Math.round(costInArs),
      landedCost,
      freightAmount: Math.round(freightAmount),
      myaWholesalePrice,
      myaProfitPerUnit,
      myaProfitMargin,
      suggestedRetailPrice,
      resellerProfitPerUnit,
      resellerMarginPercent,
      resellerRoiPercent,
      estimatedMlPrice,
      savingVsMl,
      savingPercentVsMl,
      packCalculations,
    };
  }, [
    currency,
    costInput,
    exchangeUsdArs,
    exchangePygArs,
    logisticsPercent,
    myaMarkupPercent,
    retailMultiplier,
    mercadoLibreMarkup,
    packQuantity,
  ]);

  // 2. WhatsApp B2B Pitch Message Generator
  const whatsappPitchMessage = useMemo(() => {
    return `🔥 *COTIZACIÓN MAYORISTA B2B - MYA IMPORTACIONES* 🔥
📍 Distribución directa desde Tandil para todo el país.

📦 *Producto:* ${activeTitle}
🏷️ *Rubro:* ${activeCategory}

💰 *TU PRECIO MAYORISTA (MYA):* ${formatCurrency(calculations.myaWholesalePrice)} / unidad
⚡ *PVP Sugerido al público:* ${formatCurrency(calculations.suggestedRetailPrice)}
📈 *TU GANANCIA NETA:* ${formatCurrency(calculations.resellerProfitPerUnit)} por unidad (*${calculations.resellerMarginPercent.toFixed(0)}% de margen*)

📊 *ESCALAS POR VOLUMEN:*
• Pack x6 unidades: Inversión ${formatCurrency(calculations.myaWholesalePrice * 6)} ➔ Ganás ${formatCurrency(calculations.resellerProfitPerUnit * 6)} limpios.
• Caja cerrada x12: Inversión ${formatCurrency(calculations.myaWholesalePrice * 12)} ➔ Ganás ${formatCurrency(calculations.resellerProfitPerUnit * 12)} limpios.

🛒 *COMPARATIVA MERCADO LIBRE:*
En Mercado Libre este producto ronda los *${formatCurrency(calculations.estimatedMlPrice)}*. 
¡Vendiendo a nuestro PVP sugerido, le ganás a Mercado Libre por un *${calculations.savingPercentVsMl.toFixed(0)}% DE AHORRO* y dejás a tus clientes fascinados!

✅ Stock disponible para despacho inmediato.
🚚 Envíos a todo el país (Correo Argentino / Andreani / Transporte).
📲 Respondé este mensaje para reservar tu pedido.`;
  }, [activeTitle, activeCategory, calculations]);

  // Copy WhatsApp Pitch
  const handleCopyPitch = async () => {
    try {
      await navigator.clipboard.writeText(whatsappPitchMessage);
      setCopiedQuote(true);
      setTimeout(() => setCopiedQuote(false), 3000);
    } catch {
      // fallback
    }
  };

  // Direct WhatsApp Share Link
  const whatsappShareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappPitchMessage)}`;

  // Apply to Catalog Action
  const handleApplyToCatalog = () => {
    if (mode === "catalog" && selectedProduct) {
      startTransition(async () => {
        try {
          const res = await updateProductPricesAction(
            selectedProduct.id,
            calculations.suggestedRetailPrice,
            calculations.myaWholesalePrice
          );
          if (res.success) {
            setActionSuccess(`¡Precios de "${selectedProduct.title}" actualizados exitosamente en la tienda!`);
            setTimeout(() => setActionSuccess(null), 4000);
          }
        } catch (err: any) {
          alert(err.message || "Error al actualizar.");
        }
      });
    } else {
      alert("Para guardar este producto en la base de datos, agregalo desde la pestaña 'Productos' o usa el Ajustador Masivo.");
    }
  };

  // Export CSV simulation
  const handleExportCsv = () => {
    const headers = [
      "Producto",
      "Categoria",
      "Moneda Origen",
      "Costo Origen",
      "Costo Puesto ARS",
      "Mayorista MYA ARS",
      "PVP Sugerido ARS",
      "Ganancia Revendedor ARS",
      "Margen Revendedor %",
      "Ref Mercado Libre ARS",
      "Ahorro vs ML %",
    ];

    const row = [
      `"${activeTitle.replace(/"/g, '""')}"`,
      `"${activeCategory}"`,
      currency,
      costInput,
      calculations.landedCost,
      calculations.myaWholesalePrice,
      calculations.suggestedRetailPrice,
      calculations.resellerProfitPerUnit,
      `${calculations.resellerMarginPercent.toFixed(1)}%`,
      calculations.estimatedMlPrice,
      `${calculations.savingPercentVsMl.toFixed(1)}%`,
    ];

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), row.join(",")].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `mya-cotizacion-b2b-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-900 via-zinc-900 to-zinc-950 p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/20 px-3.5 py-1 text-xs font-bold text-emerald-300">
            <Calculator className="h-3.5 w-3.5" />
            Sistema Comercial B2B & Margen de Reventa
          </div>
          <h2 className="mt-3 text-2xl md:text-3xl font-black tracking-tight text-white">
            Calculadora de Costos de Proveedor, Precios Mayoristas & Reventa Sugerida
          </h2>
          <p className="mt-2 text-sm text-zinc-300 max-w-3xl leading-relaxed">
            Determiná con precisión matemática tu costo de compra en origen (USD / Guaraníes / ARS), fletes y aduana.
            Generá automáticamente tu precio de venta mayorista y el <strong>PVP de reventa sugerido</strong> para demostrarle a tus clientes revendedores exactamente cuánto dinero van a ganar vendiendo tus productos y por qué le ganan a Mercado Libre.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => setMode("catalog")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                mode === "catalog"
                  ? "bg-emerald-500 text-zinc-950 shadow-lg shadow-emerald-500/20"
                  : "bg-white/10 hover:bg-white/20 text-white"
              }`}
            >
              Seleccionar Producto del Catálogo ({products.length})
            </button>
            <button
              onClick={() => setMode("custom")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                mode === "custom"
                  ? "bg-emerald-500 text-zinc-950 shadow-lg shadow-emerald-500/20"
                  : "bg-white/10 hover:bg-white/20 text-white"
              }`}
            >
              Simular Producto / Proveedor Personalizado
            </button>
          </div>
        </div>
      </div>

      {actionSuccess && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          {actionSuccess}
        </div>
      )}

      {/* Main Grid: Inputs (Left) & Results (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Product selection & Inputs */}
        <div className="lg:col-span-6 space-y-6">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-5">
            <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
              <Package className="h-5 w-5 text-emerald-600" />
              1. Identificación del Producto & Proveedor
            </h3>

            {mode === "catalog" ? (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 mb-1.5">
                  Producto de la Tienda
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => handleProductSelect(e.target.value)}
                  className="w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3.5 py-2.5 text-sm font-medium text-zinc-900 focus:border-emerald-500 focus:bg-white focus:outline-none"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.categoryName}] {p.title} - Actual: {formatCurrency(p.retailPrice)}
                    </option>
                  ))}
                </select>
                {selectedProduct && (
                  <div className="mt-3 p-3 bg-zinc-50 rounded-xl border border-zinc-200 text-xs text-zinc-600 flex items-center justify-between">
                    <span>Precio Minorista Actual: <strong>{formatCurrency(selectedProduct.retailPrice)}</strong></span>
                    <span>Mayorista Actual: <strong>{formatCurrency(selectedProduct.wholesalePrice)}</strong></span>
                    <span>Stock: <strong>{selectedProduct.stock} un.</strong></span>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 mb-1">
                    Nombre o Modelo del Producto
                  </label>
                  <input
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="Ej. Taladro Percutor 20V Total Tools"
                    className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm font-medium focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 mb-1">
                      Rubro / Categoría
                    </label>
                    <input
                      type="text"
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      placeholder="Ej. Herramientas Eléctricas"
                      className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm font-medium focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 mb-1">
                      Proveedor
                    </label>
                    <select
                      value={customSupplier}
                      onChange={(e) => setCustomSupplier(e.target.value)}
                      className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-medium focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="Total Tools Paraguay">Total Tools Paraguay</option>
                      <option value="Atacado USA Cosméticos">Atacado USA Cosméticos</option>
                      {customSuppliers.map((s) => (
                        <option key={s.id} value={s.name}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Cost & Currencies */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-5">
            <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-emerald-600" />
              2. Costo de Compra en Origen & Tipo de Cambio
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 mb-1.5">
                  Moneda de Compra
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(["USD", "PYG", "ARS"] as const).map((curr) => (
                    <button
                      key={curr}
                      type="button"
                      onClick={() => setCurrency(curr)}
                      className={`py-2 text-xs font-extrabold rounded-lg border transition-all ${
                        currency === curr
                          ? "bg-zinc-950 text-white border-zinc-950"
                          : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50"
                      }`}
                    >
                      {curr === "USD" ? "USD $" : curr === "PYG" ? "PYG ₲" : "ARS $"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 mb-1.5">
                  Costo Unitario en Origen ({currency})
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={costInput}
                  onChange={(e) => setCostInput(Number(e.target.value) || 0)}
                  className="w-full rounded-xl border border-zinc-300 px-3.5 py-2 text-base font-bold text-zinc-900 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Exchange rates */}
            <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200 space-y-3">
              <div className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                Cotizaciones de Conversión a ARS
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-zinc-500 block">Dólar Blue / MEP ($ ARS):</span>
                  <input
                    type="number"
                    value={exchangeUsdArs}
                    onChange={(e) => setExchangeUsdArs(Number(e.target.value) || 1)}
                    className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 font-bold"
                  />
                </div>
                <div>
                  <span className="text-zinc-500 block">Cotización Guaraní (PYG por 1 ARS):</span>
                  <input
                    type="number"
                    step="0.1"
                    value={exchangePygArs}
                    onChange={(e) => setExchangePygArs(Number(e.target.value) || 1)}
                    className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 font-bold"
                  />
                </div>
              </div>
              <div className="text-[11px] text-zinc-500 flex justify-between">
                <span>Costo equivalente en ARS: <strong>{formatCurrency(calculations.costInArs)}</strong></span>
                <span>(Base sin flete)</span>
              </div>
            </div>
          </div>

          {/* Logistics & Markup Equations */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-5">
            <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
              <Truck className="h-5 w-5 text-emerald-600" />
              3. Parámetros Comerciales & Márgenes
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-600 mb-1">
                  Flete + Frontera (%)
                </label>
                <input
                  type="number"
                  value={logisticsPercent}
                  onChange={(e) => setLogisticsPercent(Number(e.target.value) || 0)}
                  className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm font-bold"
                />
                <span className="text-[10px] text-zinc-400 mt-1 block">Tandil: +{calculations.freightAmount.toLocaleString("es-AR")}</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-600 mb-1">
                  Margen MYA B2B (%)
                </label>
                <input
                  type="number"
                  value={myaMarkupPercent}
                  onChange={(e) => setMyaMarkupPercent(Number(e.target.value) || 0)}
                  className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm font-bold"
                />
                <span className="text-[10px] text-zinc-400 mt-1 block">Tu ganancia s/costo</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-600 mb-1">
                  Mult. PVP Reventa
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={retailMultiplier}
                  onChange={(e) => setRetailMultiplier(Number(e.target.value) || 1)}
                  className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm font-bold"
                />
                <span className="text-[10px] text-zinc-400 mt-1 block">Regla: 2.0x costo</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-600 mb-1">
                  Markup Ref. ML (%)
                </label>
                <input
                  type="number"
                  value={mercadoLibreMarkup}
                  onChange={(e) => setMercadoLibreMarkup(Number(e.target.value) || 0)}
                  className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm font-bold"
                />
                <span className="text-[10px] text-zinc-400 mt-1 block">5-10% s/PVP sugerido</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Financial Results & Commercial Pitch */}
        <div className="lg:col-span-6 space-y-6">
          {/* Main Price Breakdown Card */}
          <div className="rounded-2xl border-2 border-emerald-500 bg-white p-6 shadow-md space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
              <div>
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
                  Resultados Comerciales Calculados
                </span>
                <h4 className="text-lg font-black text-zinc-950 mt-0.5">{activeTitle}</h4>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-extrabold text-emerald-800">
                <Sparkles className="h-3.5 w-3.5" />
                Rentabilidad B2B
              </span>
            </div>

            {/* Key Tiers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Costo Puesto */}
              <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200">
                <span className="text-xs text-zinc-500 font-semibold block">Costo Puesto en Tandil:</span>
                <div className="text-xl font-bold text-zinc-800 mt-1">
                  {formatCurrency(calculations.landedCost)}
                </div>
                <span className="text-[11px] text-zinc-400 mt-0.5 block">
                  Incluye origen + {logisticsPercent}% flete
                </span>
              </div>

              {/* Precio Mayorista MYA */}
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-emerald-800 font-bold block">Tu Precio Mayorista (B2B):</span>
                  <span className="text-[10px] font-extrabold bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                    MYA
                  </span>
                </div>
                <div className="text-2xl font-black text-emerald-950 mt-1">
                  {formatCurrency(calculations.myaWholesalePrice)}
                </div>
                <span className="text-[11px] text-emerald-700 font-semibold mt-0.5 block">
                  Tu Ganancia: +{formatCurrency(calculations.myaProfitPerUnit)} / un. ({calculations.myaProfitMargin.toFixed(0)}%)
                </span>
              </div>
            </div>

            {/* PVP Sugerido & Ganancia Revendedor (THE MOST IMPORTANT VALUE PROP) */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-950 text-white shadow-inner space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-extrabold text-emerald-400 uppercase tracking-wider">
                    Precio de Reventa Sugerido al Público (PVP)
                  </span>
                  <div className="text-3xl font-black text-white mt-1">
                    {formatCurrency(calculations.suggestedRetailPrice)}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-zinc-400 block">Ecuación</span>
                  <span className="text-xs font-bold text-emerald-300 bg-emerald-900/50 px-2 py-1 rounded-md">
                    {retailMultiplier}x Costo Puesto
                  </span>
                </div>
              </div>

              <div className="border-t border-zinc-800 pt-3.5 grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-zinc-400 font-medium block">
                    Ganancia Limpia para el Revendedor:
                  </span>
                  <div className="text-xl font-black text-emerald-400 mt-0.5">
                    +{formatCurrency(calculations.resellerProfitPerUnit)}
                  </div>
                  <span className="text-[11px] text-zinc-300 block">por cada unidad vendida</span>
                </div>
                <div>
                  <span className="text-xs text-zinc-400 font-medium block">
                    Margen Comercial del Cliente:
                  </span>
                  <div className="text-xl font-black text-white mt-0.5">
                    {calculations.resellerMarginPercent.toFixed(0)}% de Margen
                  </div>
                  <span className="text-[11px] text-emerald-400 font-bold block">
                    ROI: +{calculations.resellerRoiPercent.toFixed(0)}% sobre compra
                  </span>
                </div>
              </div>
            </div>

            {/* Mercado Libre Benchmark */}
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-amber-900 block">
                  Validación Competitiva Mercado Libre:
                </span>
                <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                  En Mercado Libre este producto se vende en aprox. <strong>{formatCurrency(calculations.estimatedMlPrice)}</strong>.
                  Vendiendo al PVP sugerido de {formatCurrency(calculations.suggestedRetailPrice)}, tu cliente ahorra al consumidor un <strong>{calculations.savingPercentVsMl.toFixed(0)}%</strong> ({formatCurrency(calculations.savingVsMl)} menos) y aún así mantiene su margen del {calculations.resellerMarginPercent.toFixed(0)}%.
                </p>
              </div>
              <div className="shrink-0 text-center bg-amber-200/80 px-3 py-2 rounded-xl text-amber-950">
                <span className="text-xs block font-semibold">Ahorro vs ML</span>
                <span className="text-lg font-black text-amber-950">-{calculations.savingPercentVsMl.toFixed(0)}%</span>
              </div>
            </div>

            {/* Actions for this product */}
            <div className="flex flex-wrap gap-3 pt-2">
              {mode === "catalog" && (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleApplyToCatalog}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  <Check className="h-4 w-4" />
                  {isPending ? "Guardando..." : "Aplicar Precios a la Tienda"}
                </button>
              )}
              <button
                type="button"
                onClick={handleExportCsv}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-xs font-bold text-zinc-700 hover:bg-zinc-50 transition-colors cursor-pointer"
              >
                <Download className="h-4 w-4" />
                Exportar CSV
              </button>
            </div>
          </div>

          {/* Volume Pack Simulator */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-4">
            <h4 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
              <Boxes className="h-4 w-4 text-emerald-600" />
              Simulador de Ganancias por Escala de Volumen (Para el Revendedor)
            </h4>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 text-zinc-500 uppercase tracking-wider">
                    <th className="py-2 font-bold">Escala / Pack</th>
                    <th className="py-2 font-bold">Inversión Revendedor</th>
                    <th className="py-2 font-bold">Facturación al PVP</th>
                    <th className="py-2 font-bold text-emerald-600">Ganancia Limpia Revendedor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 font-medium">
                  {calculations.packCalculations.map((tier, idx) => (
                    <tr key={idx} className="hover:bg-zinc-50">
                      <td className="py-2.5 font-bold text-zinc-900">{tier.label}</td>
                      <td className="py-2.5 text-zinc-700">{formatCurrency(tier.totalInvestment)}</td>
                      <td className="py-2.5 text-zinc-700">{formatCurrency(tier.totalRevenue)}</td>
                      <td className="py-2.5 font-extrabold text-emerald-600">
                        +{formatCurrency(tier.totalResellerProfit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* WhatsApp Pitch Generator */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-emerald-600" />
                Pitch Comercial de Reventa para WhatsApp
              </h4>
              <span className="text-[11px] text-zinc-500 font-medium">Listo para enviar a clientes</span>
            </div>

            <pre className="p-4 rounded-xl bg-zinc-900 text-zinc-200 text-xs font-mono whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto border border-zinc-800">
              {whatsappPitchMessage}
            </pre>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleCopyPitch}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 transition-colors shadow-sm cursor-pointer"
              >
                {copiedQuote ? (
                  <>
                    <Check className="h-4 w-4 text-white" />
                    ¡Mensaje Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copiar Cotización para WhatsApp
                  </>
                )}
              </button>
              <a
                href={whatsappShareUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-600 bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                Abrir en WhatsApp
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
