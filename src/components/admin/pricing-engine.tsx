"use client";

import { useState, useMemo, useTransition } from "react";
import {
  Percent,
  TrendingUp,
  Calculator,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  SlidersHorizontal,
  RefreshCw,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Boxes,
  Truck,
  FolderOpen,
  Tag,
  Download,
} from "lucide-react";
import { bulkUpdatePricesAction } from "@/app/admin/actions";
import { formatCurrency } from "@/lib/format";
import type { Category, Product } from "@/lib/types";

interface CustomSupplierItem {
  id: string;
  name: string;
  categoryType?: string;
  type?: string;
}

interface PricingEngineProps {
  products: Product[];
  categories: Category[];
  customSuppliers?: CustomSupplierItem[];
}

export function PricingEngine({
  products,
  categories,
  customSuppliers = [],
}: PricingEngineProps) {
  const [isPending, startTransition] = useTransition();

  // Scope selection
  const [scope, setScope] = useState<"all" | "supplier" | "category" | "brand">("all");
  const [scopeValue, setScopeValue] = useState<string>("");

  // Adjustment mode & targets
  const [target, setTarget] = useState<"both" | "retail" | "wholesale">("both");
  const [mode, setMode] = useState<"percentage" | "cost_multiplier">("percentage");

  // Inputs
  const [retailPercent, setRetailPercent] = useState<number>(10);
  const [wholesalePercent, setWholesalePercent] = useState<number>(10);
  const [retailMultiplier, setRetailMultiplier] = useState<number>(2.0);
  const [wholesaleMultiplier, setWholesaleMultiplier] = useState<number>(1.15);
  const [rounding, setRounding] = useState<"100" | "50" | "1000" | "none">("100");

  // Confirmation & Feedback
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Available brands in the catalog
  const availableBrands = useMemo(() => {
    return [
      "Total",
      "Wadfow",
      "Medicube",
      "Skin1004",
      "Dr. Althea",
      "Celimax",
      "Karseell",
    ];
  }, []);

  // Built-in suppliers + any custom suppliers
  const allSuppliers = useMemo(() => {
    return [
      { id: "total_tools", name: "Total Tools Oficial Paraguay", type: "Herramientas" },
      { id: "atacado_usa", name: "Atacado USA", type: "Cosméticos & K-Beauty" },
      ...customSuppliers.map((s) => ({
        id: s.id,
        name: s.name,
        type: s.type || s.categoryType || "General",
      })),
    ];
  }, [customSuppliers]);

  // Main parent categories
  const mainCategories = useMemo(() => {
    return categories.filter((c) => !c.parentId);
  }, [categories]);

  // Filter products by scope
  const targetProducts = useMemo(() => {
    return products.filter((p) => {
      if (scope === "all") return true;

      if (scope === "category" && scopeValue) {
        const isDirect = p.categoryId === scopeValue;
        const parentCat = categories.find((c) => c.id === p.categoryId);
        const isChild = parentCat?.parentId === scopeValue;
        return isDirect || isChild;
      }

      if (scope === "brand" && scopeValue) {
        const b = scopeValue.toUpperCase();
        const titleUpper = p.title.toUpperCase();
        const tagsUpper = (p.tags || []).map((t) => t.toUpperCase());
        return titleUpper.includes(b) || tagsUpper.some((t) => t.includes(b));
      }

      if (scope === "supplier" && scopeValue) {
        const supVal = scopeValue.toLowerCase();
        const titleUpper = p.title.toUpperCase();
        const tagsUpper = (p.tags || []).map((t) => t.toUpperCase());
        const cat = categories.find((c) => c.id === p.categoryId);
        const catSlug = (cat?.slug || "").toLowerCase();

        if (supVal === "total_tools") {
          return (
            titleUpper.includes("TOTAL") ||
            titleUpper.includes("WADFOW") ||
            catSlug.includes("herramienta") ||
            tagsUpper.includes("HERRAMIENTAS")
          );
        }
        if (supVal === "atacado_usa") {
          return (
            catSlug.includes("cosmet") ||
            catSlug.includes("capilar") ||
            ["MEDICUBE", "SKIN1004", "CELIMAX", "DR. ALTHEA", "DR ALTHEA", "KARSEELL"].some((b) =>
              titleUpper.includes(b)
            )
          );
        }
        return (
          titleUpper.includes(supVal.toUpperCase()) ||
          tagsUpper.some((t) => t.includes(supVal.toUpperCase()))
        );
      }

      return true;
    });
  }, [products, categories, scope, scopeValue]);

  // Rounding helper
  const applyRound = (val: number) => {
    if (rounding === "100") return Math.round(val / 100) * 100;
    if (rounding === "50") return Math.round(val / 50) * 50;
    if (rounding === "1000") return Math.round(val / 1000) * 1000;
    return Math.round(val);
  };

  // Compute simulated prices for each target product
  const simulatedProducts = useMemo(() => {
    return targetProducts.map((p) => {
      const currentRetail = p.retailPrice;
      const currentWholesale = p.wholesalePrice || Math.round(p.retailPrice * 0.75);

      // Base purchase cost: retail / 2
      const estimatedCost = Math.round(currentRetail / 2);

      let newRetail = currentRetail;
      let newWholesale = currentWholesale;

      if (mode === "percentage") {
        if (target === "retail" || target === "both") {
          newRetail = applyRound(currentRetail * (1 + retailPercent / 100));
        }
        if (target === "wholesale" || target === "both") {
          newWholesale = applyRound(currentWholesale * (1 + wholesalePercent / 100));
        }
      } else if (mode === "cost_multiplier") {
        if (target === "retail" || target === "both") {
          newRetail = applyRound(estimatedCost * retailMultiplier);
        }
        if (target === "wholesale" || target === "both") {
          newWholesale = applyRound(estimatedCost * wholesaleMultiplier);
        }
      }

      if (newWholesale > newRetail) {
        newWholesale = Math.round(newRetail * 0.85);
      }
      newRetail = Math.max(100, newRetail);
      newWholesale = Math.max(100, newWholesale);

      const mlRefPrice = Math.round((newRetail * 1.08) / 100) * 100;
      const retailProfit = newRetail - estimatedCost;
      const wholesaleProfit = newWholesale - estimatedCost;

      return {
        product: p,
        estimatedCost,
        currentRetail,
        currentWholesale,
        newRetail,
        newWholesale,
        mlRefPrice,
        retailProfit,
        wholesaleProfit,
      };
    });
  }, [
    targetProducts,
    mode,
    target,
    retailPercent,
    wholesalePercent,
    retailMultiplier,
    wholesaleMultiplier,
    rounding,
  ]);

  // Aggregated KPIs
  const currentRetailTotal = useMemo(
    () => simulatedProducts.reduce((sum, item) => sum + item.currentRetail, 0),
    [simulatedProducts]
  );
  const newRetailTotal = useMemo(
    () => simulatedProducts.reduce((sum, item) => sum + item.newRetail, 0),
    [simulatedProducts]
  );
  const currentWholesaleTotal = useMemo(
    () => simulatedProducts.reduce((sum, item) => sum + item.currentWholesale, 0),
    [simulatedProducts]
  );
  const newWholesaleTotal = useMemo(
    () => simulatedProducts.reduce((sum, item) => sum + item.newWholesale, 0),
    [simulatedProducts]
  );

  const avgRetailDiff =
    simulatedProducts.length > 0
      ? (newRetailTotal - currentRetailTotal) / simulatedProducts.length
      : 0;

  // Sample items to show in preview table
  const sampleItems = useMemo(() => {
    return simulatedProducts.slice(0, 6);
  }, [simulatedProducts]);

  // Execute update
  const handleExecuteUpdate = () => {
    setIsConfirmOpen(false);
    setErrorMessage(null);
    setSuccessMessage(null);

    startTransition(async () => {
      try {
        const res = await bulkUpdatePricesAction({
          scope,
          scopeValue,
          target,
          mode,
          retailPercent,
          wholesalePercent,
          retailMultiplier,
          wholesaleMultiplier,
          rounding,
        });
        setSuccessMessage(res.message);
        setTimeout(() => setSuccessMessage(null), 8000);
      } catch (err: any) {
        setErrorMessage(err.message || "Error al actualizar precios");
      }
    });
  };

  // Export CSV of this preview
  const handleExportCsv = () => {
    const headers = [
      "SKU / ID",
      "Producto",
      "Costo Estimado ARS",
      "Precio Minorista Actual",
      "Nuevo Precio Minorista",
      "Precio Mayorista Actual",
      "Nuevo Precio Mayorista",
      "Ref. Mercado Libre",
      "Ganancia Estimada x Unidad",
    ];

    const rows = simulatedProducts.map((item) => [
      item.product.id,
      `"${item.product.title.replace(/"/g, '""')}"`,
      item.estimatedCost,
      item.currentRetail,
      item.newRetail,
      item.currentWholesale,
      item.newWholesale,
      item.mlRefPrice,
      item.retailProfit,
    ]);

    const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ajuste_precios_${scope}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-zinc-950 p-6 sm:p-8 text-white shadow-xl border border-zinc-800">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 text-xs font-bold text-emerald-400 mb-3">
            <Sparkles className="h-3.5 w-3.5" />
            Estrategia de Precios & Rentabilidad
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Ajustador Masivo de Precios Global & por Proveedor
          </h2>
          <p className="mt-2 text-sm text-zinc-300 leading-relaxed">
            Subí los precios en porcentaje (%) o recalculalos en base a tu <strong>costo de compra de origen</strong> (Paraguay / USA).
            Podés seleccionar todo el catálogo, un proveedor específico (Total Tools, Atacado USA), un rubro o una marca.
            Revisá la simulación en vivo antes de guardar los cambios en la base de datos.
          </p>
        </div>
        <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-emerald-500/10 to-transparent pointer-events-none" />
      </div>

      {/* Messages */}
      {successMessage && (
        <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 p-4 border border-emerald-200 text-emerald-900 shadow-sm animate-in fade-in duration-200">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <div className="text-sm font-semibold">{successMessage}</div>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-3 rounded-2xl bg-red-50 p-4 border border-red-200 text-red-900 shadow-sm animate-in fade-in duration-200">
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
          <div className="text-sm font-semibold">{errorMessage}</div>
        </div>
      )}

      {/* Settings Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Step 1: Scope */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900 text-[10px] text-white">1</span>
              Alcance de Productos
            </div>
            <h3 className="text-base font-bold text-zinc-950 mb-3">
              ¿A qué productos querés aplicar el ajuste?
            </h3>

            <div className="grid grid-cols-2 gap-2 mb-4">
              {[
                { id: "all", label: "Todo el Catálogo", icon: Boxes, count: products.length },
                { id: "supplier", label: "Por Proveedor", icon: Truck },
                { id: "category", label: "Por Rubro", icon: FolderOpen },
                { id: "brand", label: "Por Marca", icon: Tag },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setScope(opt.id as any);
                    if (opt.id === "all") setScopeValue("");
                    else if (opt.id === "supplier") setScopeValue("total_tools");
                    else if (opt.id === "category" && mainCategories[0]) setScopeValue(mainCategories[0].id);
                    else if (opt.id === "brand") setScopeValue("Total");
                  }}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer ${
                    scope === opt.id
                      ? "border-zinc-900 bg-zinc-900 text-white shadow-xs font-bold"
                      : "border-zinc-200 bg-zinc-50/50 hover:bg-zinc-100 text-zinc-700 font-medium"
                  }`}
                >
                  <opt.icon className="h-4 w-4 mb-1" />
                  <span className="text-xs">{opt.label}</span>
                  {opt.count && (
                    <span className="text-[10px] opacity-80 mt-0.5">({opt.count})</span>
                  )}
                </button>
              ))}
            </div>

            {/* Scope Value Dropdown */}
            {scope === "supplier" && (
              <div className="space-y-1.5 pt-2 border-t border-zinc-100">
                <label className="text-xs font-semibold text-zinc-600">Seleccionar Proveedor:</label>
                <select
                  value={scopeValue}
                  onChange={(e) => setScopeValue(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-zinc-300 text-xs font-bold text-zinc-900 outline-none focus:border-zinc-900"
                >
                  {allSuppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.type})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {scope === "category" && (
              <div className="space-y-1.5 pt-2 border-t border-zinc-100">
                <label className="text-xs font-semibold text-zinc-600">Seleccionar Rubro:</label>
                <select
                  value={scopeValue}
                  onChange={(e) => setScopeValue(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-zinc-300 text-xs font-bold text-zinc-900 outline-none focus:border-zinc-900"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.parentId ? "↳ " : ""}{c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {scope === "brand" && (
              <div className="space-y-1.5 pt-2 border-t border-zinc-100">
                <label className="text-xs font-semibold text-zinc-600">Seleccionar Marca:</label>
                <select
                  value={scopeValue}
                  onChange={(e) => setScopeValue(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-zinc-300 text-xs font-bold text-zinc-900 outline-none focus:border-zinc-900"
                >
                  {availableBrands.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500">
            <span>Productos alcanzados:</span>
            <span className="font-extrabold text-zinc-900 text-sm">
              {targetProducts.length.toLocaleString("es-AR")}
            </span>
          </div>
        </div>

        {/* Step 2: Calculation Mode & Percentages */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900 text-[10px] text-white">2</span>
              Método de Ajuste
            </div>

            {/* Target selector: Retail, Wholesale, Both */}
            <div className="space-y-1.5 mb-4">
              <label className="text-xs font-semibold text-zinc-600">Precios a modificar:</label>
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-zinc-100 rounded-xl">
                {[
                  { id: "both", label: "Ambos" },
                  { id: "retail", label: "Minorista" },
                  { id: "wholesale", label: "Mayorista" },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTarget(t.id as any)}
                    className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      target === t.id
                        ? "bg-white text-zinc-950 shadow-xs"
                        : "text-zinc-600 hover:text-zinc-900"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Mode selector */}
            <div className="space-y-1.5 mb-4">
              <label className="text-xs font-semibold text-zinc-600">Tipo de cálculo:</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMode("percentage")}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    mode === "percentage"
                      ? "border-emerald-600 bg-emerald-50/50 text-emerald-950 font-bold"
                      : "border-zinc-200 bg-white text-zinc-600 font-medium"
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs">
                    <Percent className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Porcentaje (%)</span>
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-1">
                    Aumenta +X% sobre precio actual
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setMode("cost_multiplier")}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    mode === "cost_multiplier"
                      ? "border-emerald-600 bg-emerald-50/50 text-emerald-950 font-bold"
                      : "border-zinc-200 bg-white text-zinc-600 font-medium"
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs">
                    <Calculator className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Multiplicador Costo</span>
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-1">
                    Calcula Costo × Margen
                  </p>
                </button>
              </div>
            </div>

            {/* Inputs based on mode */}
            {mode === "percentage" ? (
              <div className="space-y-3 pt-2 border-t border-zinc-100">
                {(target === "retail" || target === "both") && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-zinc-700">
                        Aumento Minorista:
                      </label>
                      <span className="text-xs font-bold text-emerald-700">
                        +{retailPercent}%
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step={1}
                        value={retailPercent}
                        onChange={(e) => setRetailPercent(Number(e.target.value))}
                        className="w-20 h-9 px-2 text-center rounded-lg border border-zinc-300 font-bold text-xs"
                      />
                      <div className="flex gap-1 flex-1">
                        {[5, 10, 15, 20, 25].map((pct) => (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => setRetailPercent(pct)}
                            className={`flex-1 py-1 rounded-md text-[11px] font-semibold border ${
                              retailPercent === pct
                                ? "bg-emerald-600 text-white border-emerald-600"
                                : "bg-zinc-50 hover:bg-zinc-100 border-zinc-200 text-zinc-700"
                            }`}
                          >
                            +{pct}%
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {(target === "wholesale" || target === "both") && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-zinc-700">
                        Aumento Mayorista:
                      </label>
                      <span className="text-xs font-bold text-amber-700">
                        +{wholesalePercent}%
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step={1}
                        value={wholesalePercent}
                        onChange={(e) => setWholesalePercent(Number(e.target.value))}
                        className="w-20 h-9 px-2 text-center rounded-lg border border-zinc-300 font-bold text-xs"
                      />
                      <div className="flex gap-1 flex-1">
                        {[5, 10, 15, 20].map((pct) => (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => setWholesalePercent(pct)}
                            className={`flex-1 py-1 rounded-md text-[11px] font-semibold border ${
                              wholesalePercent === pct
                                ? "bg-amber-600 text-white border-amber-600"
                                : "bg-zinc-50 hover:bg-zinc-100 border-zinc-200 text-zinc-700"
                            }`}
                          >
                            +{pct}%
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3 pt-2 border-t border-zinc-100">
                {(target === "retail" || target === "both") && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-zinc-700">
                        Multiplicador Minorista (PVP):
                      </label>
                      <span className="text-xs font-bold text-emerald-700">
                        {retailMultiplier}x costo (+{Math.round((retailMultiplier - 1) * 100)}%)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step={0.05}
                        min={1}
                        value={retailMultiplier}
                        onChange={(e) => setRetailMultiplier(Number(e.target.value))}
                        className="w-20 h-9 px-2 text-center rounded-lg border border-zinc-300 font-bold text-xs"
                      />
                      <div className="flex gap-1 flex-1">
                        {[1.8, 2.0, 2.2, 2.5].map((mult) => (
                          <button
                            key={mult}
                            type="button"
                            onClick={() => setRetailMultiplier(mult)}
                            className={`flex-1 py-1 rounded-md text-[11px] font-semibold border ${
                              retailMultiplier === mult
                                ? "bg-emerald-600 text-white border-emerald-600"
                                : "bg-zinc-50 hover:bg-zinc-100 border-zinc-200 text-zinc-700"
                            }`}
                          >
                            {mult}x
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {(target === "wholesale" || target === "both") && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-zinc-700">
                        Multiplicador Mayorista (B2B):
                      </label>
                      <span className="text-xs font-bold text-amber-700">
                        {wholesaleMultiplier}x costo (+{Math.round((wholesaleMultiplier - 1) * 100)}%)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step={0.05}
                        min={1}
                        value={wholesaleMultiplier}
                        onChange={(e) => setWholesaleMultiplier(Number(e.target.value))}
                        className="w-20 h-9 px-2 text-center rounded-lg border border-zinc-300 font-bold text-xs"
                      />
                      <div className="flex gap-1 flex-1">
                        {[1.10, 1.15, 1.20, 1.25].map((mult) => (
                          <button
                            key={mult}
                            type="button"
                            onClick={() => setWholesaleMultiplier(mult)}
                            className={`flex-1 py-1 rounded-md text-[11px] font-semibold border ${
                              wholesaleMultiplier === mult
                                ? "bg-amber-600 text-white border-amber-600"
                                : "bg-zinc-50 hover:bg-zinc-100 border-zinc-200 text-zinc-700"
                            }`}
                          >
                            {mult}x
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500">
            <span>Objetivo seleccionado:</span>
            <span className="font-bold text-zinc-900 uppercase">
              {target === "both" ? "Minorista + Mayorista" : target}
            </span>
          </div>
        </div>

        {/* Step 3: Rounding & Action */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900 text-[10px] text-white">3</span>
              Redondeo & Ejecución
            </div>
            <h3 className="text-base font-bold text-zinc-950 mb-3">
              Redondeo de Precios Comerciales
            </h3>

            <div className="grid grid-cols-2 gap-2 mb-4">
              {[
                { id: "100", label: "A $100", desc: "$14.380 → $14.400" },
                { id: "50", label: "A $50", desc: "$14.320 → $14.350" },
                { id: "1000", label: "A $1.000", desc: "$14.380 → $14.000" },
                { id: "none", label: "Exacto", desc: "Sin redondear" },
              ].map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRounding(r.id as any)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    rounding === r.id
                      ? "border-zinc-900 bg-zinc-900 text-white font-bold"
                      : "border-zinc-200 bg-zinc-50/50 hover:bg-zinc-100 text-zinc-700"
                  }`}
                >
                  <p className="text-xs">{r.label}</p>
                  <p className="text-[10px] opacity-75 mt-0.5">{r.desc}</p>
                </button>
              ))}
            </div>

            <div className="rounded-xl bg-amber-50 p-3 border border-amber-200/80 mb-4">
              <div className="flex items-start gap-2">
                <ShieldAlert className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-[11px] text-amber-900 leading-relaxed">
                  Esta acción actualizará directamente los precios en la base de datos de Supabase para los{" "}
                  <strong>{targetProducts.length.toLocaleString("es-AR")} productos seleccionados</strong>.
                  La tienda y el canal mayorista se actualizarán inmediatamente.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-zinc-100">
            <button
              type="button"
              disabled={isPending || targetProducts.length === 0}
              onClick={() => setIsConfirmOpen(true)}
              className="w-full h-11 rounded-xl bg-zinc-950 text-white hover:bg-zinc-800 font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Actualizando {targetProducts.length} productos...
                </>
              ) : (
                <>
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                  Aplicar Ajuste a {targetProducts.length.toLocaleString("es-AR")} Productos
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              disabled={targetProducts.length === 0}
              className="w-full h-9 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5 text-zinc-500" />
              Descargar Simulación en CSV / Excel
            </button>
          </div>
        </div>
      </div>

      {/* Financial Impact KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Productos Alcanzados
          </span>
          <p className="mt-2 text-2xl font-black text-zinc-950">
            {targetProducts.length.toLocaleString("es-AR")}
          </p>
          <p className="text-[11px] text-zinc-500 mt-1">
            de un total de {products.length.toLocaleString("es-AR")} en el catálogo
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Valor Catálogo Minorista
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-lg font-bold text-zinc-400 line-through">
              {formatCurrency(currentRetailTotal)}
            </span>
            <span className="text-xl font-black text-emerald-700">
              {formatCurrency(newRetailTotal)}
            </span>
          </div>
          <p className="text-[11px] text-emerald-700 font-semibold mt-1">
            {newRetailTotal >= currentRetailTotal ? "+" : ""}
            {formatCurrency(newRetailTotal - currentRetailTotal)} de valuación
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Valor Catálogo Mayorista
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-lg font-bold text-zinc-400 line-through">
              {formatCurrency(currentWholesaleTotal)}
            </span>
            <span className="text-xl font-black text-amber-700">
              {formatCurrency(newWholesaleTotal)}
            </span>
          </div>
          <p className="text-[11px] text-amber-700 font-semibold mt-1">
            {newWholesaleTotal >= currentWholesaleTotal ? "+" : ""}
            {formatCurrency(newWholesaleTotal - currentWholesaleTotal)} en canal B2B
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Variación Promedio / Producto
          </span>
          <p className="mt-2 text-2xl font-black text-zinc-950">
            {avgRetailDiff >= 0 ? "+" : ""}
            {formatCurrency(Math.round(avgRetailDiff))}
          </p>
          <p className="text-[11px] text-zinc-500 mt-1">
            impacto promedio por artículo minorista
          </p>
        </div>
      </div>

      {/* Live Sample Simulation Table */}
      <div className="rounded-2xl border border-zinc-200 bg-white shadow-xs overflow-hidden">
        <div className="p-5 border-b border-zinc-200 bg-zinc-50 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm text-zinc-900 flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-emerald-600" />
              Simulación en Tiempo Real (Muestra de 6 Productos)
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Así impactará tu fórmula en los precios minoristas, mayoristas y comparativa de Mercado Libre.
            </p>
          </div>
          <span className="text-xs font-bold text-zinc-500 bg-white border border-zinc-200 px-2.5 py-1 rounded-lg">
            Redondeo: {rounding === "none" ? "Sin redondear" : `a $${rounding}`}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-xs">
            <thead className="bg-zinc-100/70 border-b border-zinc-200 text-zinc-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3">Producto</th>
                <th className="px-4 py-3">Costo Origen</th>
                <th className="px-4 py-3">Precio Minorista</th>
                <th className="px-4 py-3">Precio Mayorista (B2B)</th>
                <th className="px-4 py-3">Ref. Mercado Libre</th>
                <th className="px-4 py-3">Margen Ganancia Unit.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {sampleItems.map((item) => {
                const retailDiff = item.newRetail - item.currentRetail;
                const wholesaleDiff = item.newWholesale - item.currentWholesale;

                return (
                  <tr key={item.product.id} className="hover:bg-zinc-50/80 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <img
                          src={item.product.imageUrl || "/placeholder-product.svg"}
                          alt={item.product.title}
                          className="h-10 w-10 rounded-lg object-contain bg-white p-1 border border-zinc-200 shrink-0"
                        />
                        <div className="min-w-0 max-w-xs">
                          <p className="font-bold text-zinc-900 truncate">
                            {item.product.title}
                          </p>
                          <p className="text-[10px] text-zinc-400 truncate">
                            {item.product.categoryName || "Catálogo MYA"}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <span className="font-semibold text-zinc-600">
                        {formatCurrency(item.estimatedCost)}
                      </span>
                      <p className="text-[10px] text-zinc-400">origen est.</p>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="flex items-baseline gap-1.5">
                        <span className="line-through text-zinc-400">
                          {formatCurrency(item.currentRetail)}
                        </span>
                        <span className="font-black text-emerald-700 text-sm">
                          {formatCurrency(item.newRetail)}
                        </span>
                      </div>
                      {retailDiff !== 0 && (
                        <span className="text-[10px] font-bold text-emerald-600">
                          {retailDiff > 0 ? "+" : ""}{formatCurrency(retailDiff)}
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="flex items-baseline gap-1.5">
                        <span className="line-through text-zinc-400">
                          {formatCurrency(item.currentWholesale)}
                        </span>
                        <span className="font-black text-amber-700 text-sm">
                          {formatCurrency(item.newWholesale)}
                        </span>
                      </div>
                      {wholesaleDiff !== 0 && (
                        <span className="text-[10px] font-bold text-amber-600">
                          {wholesaleDiff > 0 ? "+" : ""}{formatCurrency(wholesaleDiff)}
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3.5">
                      <span className="text-zinc-500 line-through">
                        {formatCurrency(item.mlRefPrice)}
                      </span>
                      <span className="ml-1.5 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 border border-emerald-200">
                        -8% vs ML
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      <p className="font-bold text-emerald-700">
                        +{formatCurrency(item.retailProfit)}{" "}
                        <span className="text-[10px] text-zinc-400 font-normal">PVP</span>
                      </p>
                      <p className="text-[10px] font-semibold text-amber-700">
                        +{formatCurrency(item.wholesaleProfit)} B2B
                      </p>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Safety Modal */}
      {isConfirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-zinc-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-amber-600 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-950">Confirmar Ajuste Masivo</h3>
                <p className="text-xs text-zinc-500">Esta acción impactará en el catálogo real</p>
              </div>
            </div>

            <p className="text-xs text-zinc-650 leading-relaxed mb-4">
              ¿Estás seguro de que querés actualizar los precios de los{" "}
              <strong className="text-zinc-900">{targetProducts.length.toLocaleString("es-AR")} productos</strong>{" "}
              seleccionados?
              <br />
              <br />
              • Modo: <strong>{mode === "percentage" ? "Porcentaje (%)" : "Multiplicador de Costo"}</strong>
              <br />
              • Minorista: <strong>{mode === "percentage" ? `+${retailPercent}%` : `${retailMultiplier}x Costo`}</strong>
              <br />
              • Mayorista: <strong>{mode === "percentage" ? `+${wholesalePercent}%` : `${wholesaleMultiplier}x Costo`}</strong>
              <br />
              • Redondeo: <strong>{rounding === "none" ? "Sin redondear" : `Múltiplos de $${rounding}`}</strong>
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setIsConfirmOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 hover:bg-zinc-100 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExecuteUpdate}
                className="px-5 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-bold shadow-xs transition cursor-pointer"
              >
                Sí, aplicar actualización
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
