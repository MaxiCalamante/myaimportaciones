"use client";

import { useState, useMemo, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Product, Category } from "@/lib/types";
import { calculateProductProfit, type ProductCost } from "@/lib/product-profit";
import { formatCurrency as money } from "@/lib/format";
import { saveFinancialControl, saveFulfillmentControl } from "@/app/admin/costos/control-actions";
import { quickUpdateProductPriceAction, quickUpdateSupplierLinkAction } from "@/app/admin/actions";
import { RealCosts } from "@/components/admin/real-costs";
import {
  Search,
  Filter,
  DollarSign,
  Percent,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Copy,
  Check,
  Link as LinkIcon,
  Edit3,
  SlidersHorizontal,
  RefreshCw,
  Package,
  Layers,
  Calculator,
  ArrowUpDown,
  X,
  Truck,
  ShieldCheck,
  Eye,
  Store,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface ProductProfitControlProps {
  products: Product[];
  categories?: Category[];
  costs: ProductCost[];
}

export function ProductProfitControl({
  products,
  categories = [],
  costs,
}: ProductProfitControlProps) {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<"catalog" | "ml_simulator">("catalog");

  // Filters & Search
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [marginFilter, setMarginFilter] = useState<
    "all" | "healthy" | "acceptable" | "low" | "critical" | "missing"
  >("all");
  const [supplierFilter, setSupplierFilter] = useState<"all" | "with_link" | "without_link">("all");
  const [fulfillmentFilter, setFulfillmentFilter] = useState<"all" | "supplier" | "own_stock">("all");
  const [sortBy, setSortBy] = useState<
    "title" | "margin_desc" | "margin_asc" | "price_desc" | "price_asc" | "cost_desc"
  >("margin_asc");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Active Modals
  const [selectedFinancialProduct, setSelectedFinancialProduct] = useState<Product | null>(null);
  const [selectedQuickPriceProduct, setSelectedQuickPriceProduct] = useState<Product | null>(null);
  const [selectedQuickSupplierProduct, setSelectedQuickSupplierProduct] = useState<Product | null>(null);

  // Notifications & Clipboard
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: "success" | "error" | "info";
  } | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [copiedSku, setCopiedSku] = useState<string | null>(null);

  const showToast = (text: string, type: "success" | "error" | "info" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const costMap = useMemo(() => new Map(costs.map((c) => [c.product_id, c])), [costs]);

  // Single-pass analytics and metrics
  const stats = useMemo(() => {
    let withCost = 0;
    let withoutCost = 0;
    let withSupplierLink = 0;
    let withoutSupplierLink = 0;
    let healthyCount = 0;
    let acceptableCount = 0;
    let lowCount = 0;
    let criticalCount = 0;
    let marginSum = 0;
    let marginValidCount = 0;

    for (const p of products) {
      const c = costMap.get(p.id);
      const hasDirectCost = Boolean(c && Number(c.origin_cost) > 0);
      const hasLiveCost = Boolean(p.supplierLivePrice && p.supplierLivePrice > 0);

      if (hasDirectCost || hasLiveCost) {
        withCost++;
      } else {
        withoutCost++;
      }

      if (p.sourceUrl && p.sourceUrl.trim().length > 0) {
        withSupplierLink++;
      } else {
        withoutSupplierLink++;
      }

      // Profit calculation
      const profit = calculateProductProfit(p.retailPrice, c);
      if (profit) {
        marginSum += profit.margin;
        marginValidCount++;

        if (profit.margin >= 30) healthyCount++;
        else if (profit.margin >= 15) acceptableCount++;
        else if (profit.margin > 0) lowCount++;
        else criticalCount++;
      } else if (hasLiveCost) {
        const estCost = p.supplierLivePrice!;
        const estMargin = ((p.retailPrice - estCost) / p.retailPrice) * 100;
        marginSum += estMargin;
        marginValidCount++;

        if (estMargin >= 30) healthyCount++;
        else if (estMargin >= 15) acceptableCount++;
        else if (estMargin > 0) lowCount++;
        else criticalCount++;
      }
    }

    const avgMargin = marginValidCount > 0 ? marginSum / marginValidCount : 0;

    return {
      total: products.length,
      withCost,
      withoutCost,
      withSupplierLink,
      withoutSupplierLink,
      healthyCount,
      acceptableCount,
      lowCount,
      criticalCount,
      avgMargin,
    };
  }, [products, costMap]);

  // Conflict detection for products sharing identical image URL with differing prices
  const priceConflicts = useMemo(() => {
    const groups = new Map<string, Product[]>();
    for (const p of products) {
      if (p.imageUrl) groups.set(p.imageUrl, [...(groups.get(p.imageUrl) ?? []), p]);
    }
    return new Set(
      [...groups.values()]
        .filter((group) => new Set(group.map((p) => p.retailPrice)).size > 1)
        .flat()
        .map((p) => p.id)
    );
  }, [products]);

  // Filtering and sorting
  const filteredProducts = useMemo(() => {
    const q = search.toLowerCase().trim();

    return products
      .filter((p) => {
        // Search text
        if (q) {
          const matchTitle = p.title.toLowerCase().includes(q);
          const matchSku = p.sku ? p.sku.toLowerCase().includes(q) : false;
          const matchModel = p.model ? p.model.toLowerCase().includes(q) : false;
          const matchBrand = p.brand ? p.brand.toLowerCase().includes(q) : false;
          const matchUrl = p.sourceUrl ? p.sourceUrl.toLowerCase().includes(q) : false;
          if (!matchTitle && !matchSku && !matchModel && !matchBrand && !matchUrl) return false;
        }

        // Category
        if (selectedCategory !== "all") {
          if (p.categoryId !== selectedCategory) return false;
        }

        // Supplier link
        if (supplierFilter === "with_link") {
          if (!p.sourceUrl || !p.sourceUrl.trim()) return false;
        } else if (supplierFilter === "without_link") {
          if (p.sourceUrl && p.sourceUrl.trim().length > 0) return false;
        }

        // Fulfillment mode
        if (fulfillmentFilter === "supplier") {
          if (p.fulfillmentMode !== "supplier") return false;
        } else if (fulfillmentFilter === "own_stock") {
          if (p.fulfillmentMode === "supplier") return false;
        }

        // Profit / Margin filter
        if (marginFilter !== "all") {
          const c = costMap.get(p.id);
          const profit = calculateProductProfit(p.retailPrice, c);
          const effectiveMargin = profit
            ? profit.margin
            : p.supplierLivePrice
            ? ((p.retailPrice - p.supplierLivePrice) / p.retailPrice) * 100
            : null;

          if (marginFilter === "missing") {
            if (c || (p.supplierLivePrice && p.supplierLivePrice > 0)) return false;
          } else if (effectiveMargin === null) {
            return false;
          } else if (marginFilter === "healthy") {
            if (effectiveMargin < 30) return false;
          } else if (marginFilter === "acceptable") {
            if (effectiveMargin < 15 || effectiveMargin >= 30) return false;
          } else if (marginFilter === "low") {
            if (effectiveMargin <= 0 || effectiveMargin >= 15) return false;
          } else if (marginFilter === "critical") {
            if (effectiveMargin > 0) return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        const costA = costMap.get(a.id);
        const costB = costMap.get(b.id);
        const profitA = calculateProductProfit(a.retailPrice, costA);
        const profitB = calculateProductProfit(b.retailPrice, costB);

        const marginA = profitA
          ? profitA.margin
          : a.supplierLivePrice
          ? ((a.retailPrice - a.supplierLivePrice) / a.retailPrice) * 100
          : -999;
        const marginB = profitB
          ? profitB.margin
          : b.supplierLivePrice
          ? ((b.retailPrice - b.supplierLivePrice) / b.retailPrice) * 100
          : -999;

        if (sortBy === "margin_desc") return marginB - marginA;
        if (sortBy === "margin_asc") return marginA - marginB;
        if (sortBy === "price_desc") return b.retailPrice - a.retailPrice;
        if (sortBy === "price_asc") return a.retailPrice - b.retailPrice;
        if (sortBy === "cost_desc") {
          const cA = profitA?.purchase || a.supplierLivePrice || 0;
          const cB = profitB?.purchase || b.supplierLivePrice || 0;
          return cB - cA;
        }
        return a.title.localeCompare(b.title);
      });
  }, [
    products,
    search,
    selectedCategory,
    supplierFilter,
    fulfillmentFilter,
    marginFilter,
    sortBy,
    costMap,
  ]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const paginatedProducts = filteredProducts.slice(
    (validCurrentPage - 1) * pageSize,
    validCurrentPage * pageSize
  );

  const handleCopy = (text: string, isSku = false) => {
    navigator.clipboard.writeText(text);
    if (isSku) {
      setCopiedSku(text);
      setTimeout(() => setCopiedSku(null), 2000);
      showToast("SKU copiado al portapapeles", "info");
    } else {
      setCopiedLink(text);
      setTimeout(() => setCopiedLink(null), 2000);
      showToast("Enlace de proveedor copiado", "info");
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl px-5 py-3.5 shadow-2xl border text-sm font-semibold transition-all animate-in fade-in slide-in-from-bottom-5 ${
            toastMessage.type === "success"
              ? "bg-emerald-950 text-emerald-100 border-emerald-800"
              : toastMessage.type === "error"
              ? "bg-red-950 text-red-100 border-red-800"
              : "bg-zinc-900 text-zinc-100 border-zinc-700"
          }`}
        >
          {toastMessage.type === "success" && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
          {toastMessage.type === "error" && <AlertTriangle className="h-4 w-4 text-red-400" />}
          {toastMessage.type === "info" && <ShieldCheck className="h-4 w-4 text-sky-400" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Main Header with Navigation Tabs */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200">
            <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
            Finanzas & Rentabilidad Comercial
          </div>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-zinc-950">
            Control de Costos, Precios y Márgenes
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Supervisá la rentabilidad unitaria, precios de lista mayorista, costos de flete, comisiones de cobro y enlaces a proveedores.
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="inline-flex rounded-xl bg-zinc-200/70 p-1 border border-zinc-300/80">
          <button
            onClick={() => setActiveTab("catalog")}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
              activeTab === "catalog"
                ? "bg-white text-zinc-950 shadow-xs"
                : "text-zinc-600 hover:text-zinc-950"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            Control de Catálogo & Márgenes
          </button>
          <button
            onClick={() => setActiveTab("ml_simulator")}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
              activeTab === "ml_simulator"
                ? "bg-white text-zinc-950 shadow-xs"
                : "text-zinc-600 hover:text-zinc-950"
            }`}
          >
            <Calculator className="h-3.5 w-3.5" />
            Simulador Mercado Libre (-8%)
          </button>
        </div>
      </div>

      {/* TAB 1: CATALOG FINANCIAL CONTROL */}
      {activeTab === "catalog" && (
        <div className="space-y-6">
          {/* KPI Analytics Cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {/* 1. Total Catálogo */}
            <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-2xs">
              <div className="flex items-center justify-between text-zinc-500">
                <span className="text-xs font-semibold uppercase tracking-wider">Catálogo Total</span>
                <Package className="h-4 w-4 text-zinc-400" />
              </div>
              <p className="mt-2 text-2xl font-black text-zinc-900">{stats.total}</p>
              <span className="text-[11px] text-zinc-500">Publicaciones registradas</span>
            </div>

            {/* 2. Margen Promedio */}
            <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-2xs">
              <div className="flex items-center justify-between text-emerald-600">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Margen Promedio
                </span>
                <TrendingUp className="h-4 w-4 text-emerald-600" />
              </div>
              <p className="mt-2 text-2xl font-black text-emerald-600">
                {stats.avgMargin > 0 ? `+${stats.avgMargin.toFixed(1)}%` : "—"}
              </p>
              <span className="text-[11px] text-zinc-500">Sobre precio de venta</span>
            </div>

            {/* 3. Con Costo Registrado */}
            <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-2xs">
              <div className="flex items-center justify-between text-zinc-500">
                <span className="text-xs font-semibold uppercase tracking-wider">Costeados</span>
                <CheckCircle2 className="h-4 w-4 text-sky-600" />
              </div>
              <p className="mt-2 text-2xl font-black text-sky-700">{stats.withCost}</p>
              <span className="text-[11px] text-zinc-500">
                {stats.total > 0 ? `${Math.round((stats.withCost / stats.total) * 100)}% del catálogo` : "0%"}
              </span>
            </div>

            {/* 4. Costos Pendientes */}
            <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-2xs">
              <div className="flex items-center justify-between text-zinc-500">
                <span className="text-xs font-semibold uppercase tracking-wider">Por Costear</span>
                <Edit3 className="h-4 w-4 text-amber-500" />
              </div>
              <p className="mt-2 text-2xl font-black text-amber-600">{stats.withoutCost}</p>
              <span className="text-[11px] text-zinc-500">Fichas sin costo asignado</span>
            </div>

            {/* 5. Con Link de Proveedor */}
            <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-2xs">
              <div className="flex items-center justify-between text-zinc-500">
                <span className="text-xs font-semibold uppercase tracking-wider">Proveedores</span>
                <LinkIcon className="h-4 w-4 text-indigo-500" />
              </div>
              <p className="mt-2 text-2xl font-black text-indigo-600">{stats.withSupplierLink}</p>
              <span className="text-[11px] text-zinc-500">
                {stats.withoutSupplierLink} pendientes de link
              </span>
            </div>

            {/* 6. Alerta de Margen Crítico */}
            <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-2xs">
              <div className="flex items-center justify-between text-zinc-500">
                <span className="text-xs font-semibold uppercase tracking-wider">Margen Crítico</span>
                <AlertTriangle className="h-4 w-4 text-rose-500" />
              </div>
              <p className="mt-2 text-2xl font-black text-rose-600">
                {stats.criticalCount + stats.lowCount}
              </p>
              <span className="text-[11px] text-rose-600 font-medium">
                {stats.criticalCount > 0 ? `${stats.criticalCount} bajo costo / pérdida` : "Márgenes < 15%"}
              </span>
            </div>
          </div>

          {/* Photo price conflict notice */}
          {priceConflicts.size > 0 && (
            <div className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50/90 p-4 text-amber-900 shadow-xs">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-bold">
                  {priceConflicts.size} publicaciones comparten fotografía con artículos que tienen un precio distinto.
                </p>
                <p className="text-amber-800">
                  Verificá si corresponden a presentaciones, kits o variaciones de potencia antes de unificar sus precios de venta.
                </p>
              </div>
            </div>
          )}

          {/* Filter Toolbar */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs space-y-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              {/* Search input */}
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Buscar por producto, SKU, marca, modelo o link de proveedor..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full rounded-xl border border-zinc-300 bg-zinc-50/50 py-2 pl-9 pr-4 text-xs font-medium text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-500 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Dropdowns */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Category filter */}
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:border-zinc-400 focus:border-emerald-500 focus:outline-hidden"
                >
                  <option value="all">Todas las Categorías</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>

                {/* Profit / Margin filter */}
                <select
                  value={marginFilter}
                  onChange={(e) => {
                    setMarginFilter(e.target.value as typeof marginFilter);
                    setCurrentPage(1);
                  }}
                  className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:border-zinc-400 focus:border-emerald-500 focus:outline-hidden"
                >
                  <option value="all">Todos los Márgenes</option>
                  <option value="healthy">🟢 Margen saludable (&gt; 30%)</option>
                  <option value="acceptable">🔵 Margen aceptable (15% a 30%)</option>
                  <option value="low">🟡 Margen bajo (0% a 15%)</option>
                  <option value="critical">🔴 Venta a pérdida / Alerta (≤ 0%)</option>
                  <option value="missing">⚪ Sin costo registrado</option>
                </select>

                {/* Supplier link filter */}
                <select
                  value={supplierFilter}
                  onChange={(e) => {
                    setSupplierFilter(e.target.value as typeof supplierFilter);
                    setCurrentPage(1);
                  }}
                  className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:border-zinc-400 focus:border-emerald-500 focus:outline-hidden"
                >
                  <option value="all">Todos los Proveedores</option>
                  <option value="with_link">🔗 Con link de proveedor</option>
                  <option value="without_link">⚠️ Sin link (por vincular)</option>
                </select>

                {/* Fulfillment mode */}
                <select
                  value={fulfillmentFilter}
                  onChange={(e) => {
                    setFulfillmentFilter(e.target.value as typeof fulfillmentFilter);
                    setCurrentPage(1);
                  }}
                  className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:border-zinc-400 focus:border-emerald-500 focus:outline-hidden"
                >
                  <option value="all">Todas las Modalidades</option>
                  <option value="supplier">🚚 Envío proveedor</option>
                  <option value="own_stock">📦 Stock propio</option>
                </select>

                {/* Sort by */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:border-zinc-400 focus:border-emerald-500 focus:outline-hidden"
                >
                  <option value="margin_asc">Menor margen primero (Riesgo)</option>
                  <option value="margin_desc">Mayor margen primero</option>
                  <option value="price_desc">Mayor precio de venta</option>
                  <option value="price_asc">Menor precio de venta</option>
                  <option value="cost_desc">Mayor costo de compra</option>
                  <option value="title">Nombre (A-Z)</option>
                </select>
              </div>
            </div>

            {/* Results counter & Reset filters */}
            <div className="flex flex-wrap items-center justify-between border-t border-zinc-100 pt-3 text-xs text-zinc-500">
              <div className="flex items-center gap-2">
                <span>
                  Mostrando <strong>{paginatedProducts.length}</strong> de{" "}
                  <strong>{filteredProducts.length}</strong> productos filtrados
                </span>
                {(search ||
                  selectedCategory !== "all" ||
                  marginFilter !== "all" ||
                  supplierFilter !== "all" ||
                  fulfillmentFilter !== "all") && (
                  <button
                    onClick={() => {
                      setSearch("");
                      setSelectedCategory("all");
                      setMarginFilter("all");
                      setSupplierFilter("all");
                      setFulfillmentFilter("all");
                      setCurrentPage(1);
                    }}
                    className="ml-2 font-semibold text-rose-600 hover:underline cursor-pointer"
                  >
                    Restablecer filtros
                  </button>
                )}
              </div>

              {/* Items per page selector */}
              <div className="flex items-center gap-1.5">
                <span>Filas por página:</span>
                {[15, 25, 50, 100].map((size) => (
                  <button
                    key={size}
                    onClick={() => {
                      setPageSize(size);
                      setCurrentPage(1);
                    }}
                    className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
                      pageSize === size
                        ? "bg-zinc-950 text-white"
                        : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left text-xs">
                {/* Table Header */}
                <thead className="border-b border-zinc-200 bg-zinc-50/90 text-zinc-600 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3.5 pl-4 pr-3">Producto / Código</th>
                    <th className="px-3 py-3.5">Enlace Proveedor & Costo Origen</th>
                    <th className="px-3 py-3.5">Costo Puesto (Landed)</th>
                    <th className="px-3 py-3.5">Precio de Venta (PVP)</th>
                    <th className="px-3 py-3.5">Contribución & Margen</th>
                    <th className="px-3 py-3.5">Modalidad / Stock</th>
                    <th className="py-3.5 pl-3 pr-4 text-right">Acciones</th>
                  </tr>
                </thead>

                {/* Table Body */}
                <tbody className="divide-y divide-zinc-200/80">
                  {paginatedProducts.length > 0 ? (
                    paginatedProducts.map((p) => {
                      const costRecord = costMap.get(p.id);
                      const profit = calculateProductProfit(p.retailPrice, costRecord);

                      // If no verified costRecord, compute provisional using supplierLivePrice if available
                      const purchasePrice = profit
                        ? profit.purchase
                        : p.supplierLivePrice
                        ? p.supplierLivePrice
                        : null;
                      const landedPrice = profit
                        ? profit.landed
                        : p.supplierLivePrice
                        ? p.supplierLivePrice
                        : null;
                      const contribution = profit
                        ? profit.contribution
                        : p.supplierLivePrice
                        ? p.retailPrice - p.supplierLivePrice
                        : null;
                      const marginPercent = profit
                        ? profit.margin
                        : p.supplierLivePrice
                        ? ((p.retailPrice - p.supplierLivePrice) / p.retailPrice) * 100
                        : null;

                      const isCritical = marginPercent !== null && marginPercent <= 0;
                      const isLow = marginPercent !== null && marginPercent > 0 && marginPercent < 15;
                      const isHealthy = marginPercent !== null && marginPercent >= 30;

                      return (
                        <tr
                          key={p.id}
                          className={`transition-colors hover:bg-zinc-50/80 ${
                            isCritical ? "bg-rose-50/40" : ""
                          }`}
                        >
                          {/* 1. Product Identity */}
                          <td className="py-3.5 pl-4 pr-3 max-w-[280px]">
                            <div className="flex items-center gap-3">
                              {/* Thumbnail */}
                              <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100">
                                {p.imageUrl ? (
                                  <Image
                                    src={p.imageUrl}
                                    alt={p.title}
                                    fill
                                    sizes="44px"
                                    className="object-cover"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-zinc-400">
                                    <Package className="h-5 w-5" />
                                  </div>
                                )}
                              </div>

                              <div className="min-w-0 flex-1">
                                <Link
                                  href={`/producto/${p.slug}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-bold text-zinc-900 hover:text-emerald-700 hover:underline line-clamp-1 flex items-center gap-1"
                                >
                                  {p.title}
                                  <ExternalLink className="h-2.5 w-2.5 text-zinc-400 shrink-0" />
                                </Link>

                                <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-zinc-500">
                                  {p.sku ? (
                                    <button
                                      type="button"
                                      onClick={() => handleCopy(p.sku!, true)}
                                      className="inline-flex items-center gap-1 rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[10px] text-zinc-700 hover:bg-zinc-200"
                                      title="Click para copiar SKU"
                                    >
                                      {copiedSku === p.sku ? (
                                        <Check className="h-2.5 w-2.5 text-emerald-600" />
                                      ) : (
                                        <Copy className="h-2.5 w-2.5 text-zinc-400" />
                                      )}
                                      {p.sku}
                                    </button>
                                  ) : (
                                    <span className="text-zinc-400 italic">Sin SKU</span>
                                  )}

                                  {p.brand && (
                                    <span className="rounded bg-sky-50 px-1.5 py-0.5 text-[10px] font-semibold text-sky-800">
                                      {p.brand}
                                    </span>
                                  )}

                                  {priceConflicts.has(p.id) && (
                                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-900">
                                      Foto compartida
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* 2. Supplier Link & Origin Cost */}
                          <td className="px-3 py-3.5 max-w-[220px]">
                            {p.sourceUrl ? (
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5">
                                  <a
                                    href={p.sourceUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 rounded-lg bg-sky-50 border border-sky-200 px-2 py-1 text-[11px] font-semibold text-sky-800 hover:bg-sky-100 transition-colors"
                                  >
                                    <ExternalLink className="h-3 w-3 text-sky-600" />
                                    Abrir mayorista
                                  </a>

                                  <button
                                    type="button"
                                    onClick={() => handleCopy(p.sourceUrl!)}
                                    className="rounded-lg border border-zinc-200 bg-white p-1 text-zinc-500 hover:bg-zinc-100"
                                    title="Copiar enlace del proveedor"
                                  >
                                    {copiedLink === p.sourceUrl ? (
                                      <Check className="h-3 w-3 text-emerald-600" />
                                    ) : (
                                      <Copy className="h-3 w-3" />
                                    )}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => setSelectedQuickSupplierProduct(p)}
                                    className="rounded-lg border border-zinc-200 bg-white p-1 text-zinc-500 hover:bg-zinc-100"
                                    title="Editar enlace / costo del proveedor"
                                  >
                                    <Edit3 className="h-3 w-3" />
                                  </button>
                                </div>

                                <div className="flex items-center gap-2 text-[11px]">
                                  {purchasePrice ? (
                                    <span className="font-semibold text-zinc-700">
                                      {money(purchasePrice)}
                                      {costRecord?.currency && costRecord.currency !== "ARS" && (
                                        <span className="text-[10px] text-zinc-400 ml-1">
                                          ({costRecord.origin_cost} {costRecord.currency})
                                        </span>
                                      )}
                                    </span>
                                  ) : (
                                    <span className="text-zinc-400 italic">Costo no cargado</span>
                                  )}

                                  <span
                                    className={`inline-block h-2 w-2 rounded-full ${
                                      p.supplierAvailable === false ? "bg-rose-500" : "bg-emerald-500"
                                    }`}
                                    title={
                                      p.supplierAvailable === false
                                        ? "Pausado en proveedor"
                                        : "Disponible en proveedor"
                                    }
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200">
                                  <AlertTriangle className="h-2.5 w-2.5 text-amber-600" />
                                  Sin vincular
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setSelectedQuickSupplierProduct(p)}
                                  className="block text-[11px] font-semibold text-sky-600 hover:underline cursor-pointer"
                                >
                                  + Vincular mayorista
                                </button>
                              </div>
                            )}
                          </td>

                          {/* 3. Costo Puesto (Landed) */}
                          <td className="px-3 py-3.5">
                            {landedPrice ? (
                              <div>
                                <span className="font-bold text-zinc-900">{money(landedPrice)}</span>
                                {costRecord && (costRecord.freight_per_unit > 0 || costRecord.other_landed_cost > 0) ? (
                                  <div className="text-[10px] text-zinc-500">
                                    Flete: {money(costRecord.freight_per_unit)}
                                    {costRecord.other_landed_cost > 0 &&
                                      ` + Ext: ${money(costRecord.other_landed_cost)}`}
                                  </div>
                                ) : (
                                  <div className="text-[10px] text-zinc-400">Sin flete añadido</div>
                                )}
                              </div>
                            ) : (
                              <span className="text-zinc-400 italic">Pendiente</span>
                            )}
                          </td>

                          {/* 4. Precio de Venta (PVP) */}
                          <td className="px-3 py-3.5">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-black text-zinc-900">
                                {money(p.retailPrice)}
                              </span>
                              <button
                                type="button"
                                onClick={() => setSelectedQuickPriceProduct(p)}
                                className="rounded-md border border-zinc-200 p-1 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100"
                                title="Modificar precio rápido"
                              >
                                <Edit3 className="h-3 w-3" />
                              </button>
                            </div>
                            {p.wholesalePrice > 0 && (
                              <div className="text-[10px] text-zinc-500">
                                May: {money(p.wholesalePrice)} ({p.wholesaleMinQuantity}+ un.)
                              </div>
                            )}
                          </td>

                          {/* 5. Contribución & Margen */}
                          <td className="px-3 py-3.5">
                            {marginPercent !== null && contribution !== null ? (
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${
                                      isCritical
                                        ? "bg-rose-100 text-rose-800 border border-rose-300"
                                        : isLow
                                        ? "bg-amber-100 text-amber-800 border border-amber-300"
                                        : isHealthy
                                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                        : "bg-sky-100 text-sky-800 border border-sky-300"
                                    }`}
                                  >
                                    {marginPercent > 0 ? (
                                      <TrendingUp className="h-3 w-3" />
                                    ) : (
                                      <TrendingDown className="h-3 w-3" />
                                    )}
                                    {marginPercent > 0 ? `+${marginPercent.toFixed(1)}%` : `${marginPercent.toFixed(1)}%`}
                                  </span>

                                  <span className="font-semibold text-zinc-900">
                                    {money(contribution)}
                                  </span>
                                </div>

                                <div className="text-[10px] text-zinc-400">
                                  {costRecord?.expenses_confirmed
                                    ? "✓ Gastos confirmados"
                                    : "Estimación provisional"}
                                </div>
                              </div>
                            ) : (
                              <div>
                                <span className="inline-block rounded bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-500">
                                  Sin calcular
                                </span>
                                <span className="block text-[10px] text-zinc-400 mt-0.5">
                                  Falta costo de compra
                                </span>
                              </div>
                            )}
                          </td>

                          {/* 6. Modalidad & Stock */}
                          <td className="px-3 py-3.5">
                            {p.fulfillmentMode === "supplier" ? (
                              <div>
                                <span className="inline-flex items-center gap-1 rounded bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-800">
                                  <Truck className="h-3 w-3" />
                                  Proveedor
                                </span>
                                <span
                                  className={`block text-[10px] font-medium mt-0.5 ${
                                    p.supplierAvailable === false ? "text-rose-600" : "text-emerald-700"
                                  }`}
                                >
                                  {p.supplierAvailable === false ? "Pausado en origen" : "Disponible"}
                                </span>
                              </div>
                            ) : (
                              <div>
                                <span className="inline-flex items-center gap-1 rounded bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-700">
                                  <Package className="h-3 w-3" />
                                  Stock propio
                                </span>
                                <span className="block text-[10px] text-zinc-500 mt-0.5">
                                  {p.stockVerifiedAt ? `${p.stock} un. verificadas` : "Sin verificar"}
                                </span>
                              </div>
                            )}
                          </td>

                          {/* 7. Actions */}
                          <td className="py-3.5 pl-3 pr-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setSelectedFinancialProduct(p)}
                                className="inline-flex items-center gap-1 rounded-xl bg-zinc-950 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-zinc-800 transition-colors"
                              >
                                <SlidersHorizontal className="h-3 w-3" />
                                Ajustar Costos
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="p-12 text-center text-zinc-500">
                        <Package className="mx-auto h-8 w-8 text-zinc-300" />
                        <p className="mt-2 text-sm font-semibold text-zinc-700">
                          No se encontraron productos con los filtros seleccionados
                        </p>
                        <p className="text-xs text-zinc-400 mt-1">
                          Probá borrando el texto de búsqueda o cambiando el filtro de margen.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination controls */}
            <div className="flex flex-wrap items-center justify-between border-t border-zinc-200 bg-zinc-50/70 px-4 py-3 text-xs text-zinc-600">
              <span>
                Página <strong>{validCurrentPage}</strong> de <strong>{totalPages}</strong>
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={validCurrentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 font-semibold text-zinc-700 shadow-2xs hover:bg-zinc-50 disabled:opacity-40 disabled:pointer-events-none"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Anterior
                </button>

                <button
                  type="button"
                  disabled={validCurrentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 font-semibold text-zinc-700 shadow-2xs hover:bg-zinc-50 disabled:opacity-40 disabled:pointer-events-none"
                >
                  Siguiente
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MERCADO LIBRE RESALE SIMULATOR */}
      {activeTab === "ml_simulator" && (
        <RealCosts
          products={products}
          costs={costs}
          onSaved={() => showToast("Costos registrados con éxito", "success")}
        />
      )}

      {/* MODAL 1: QUICK PRICE MODAL */}
      {selectedQuickPriceProduct && (
        <QuickPriceModal
          product={selectedQuickPriceProduct}
          costRecord={costMap.get(selectedQuickPriceProduct.id)}
          onClose={() => setSelectedQuickPriceProduct(null)}
          onSuccess={(msg) => {
            showToast(msg, "success");
            setSelectedQuickPriceProduct(null);
          }}
        />
      )}

      {/* MODAL 2: QUICK SUPPLIER LINK & COST MODAL */}
      {selectedQuickSupplierProduct && (
        <QuickSupplierCostModal
          product={selectedQuickSupplierProduct}
          costRecord={costMap.get(selectedQuickSupplierProduct.id)}
          onClose={() => setSelectedQuickSupplierProduct(null)}
          onSuccess={(msg) => {
            showToast(msg, "success");
            setSelectedQuickSupplierProduct(null);
          }}
        />
      )}

      {/* MODAL 3: FULL FINANCIAL CONTROL DRAWER */}
      {selectedFinancialProduct && (
        <FinancialControlModal
          product={selectedFinancialProduct}
          costRecord={costMap.get(selectedFinancialProduct.id)}
          onClose={() => setSelectedFinancialProduct(null)}
          onSuccess={(msg) => {
            showToast(msg, "success");
            setSelectedFinancialProduct(null);
          }}
        />
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// SUB-MODAL 1: Quick Price Modal
// -----------------------------------------------------------------------------
function QuickPriceModal({
  product,
  costRecord,
  onClose,
  onSuccess,
}: {
  product: Product;
  costRecord?: ProductCost;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}) {
  const [retailPrice, setRetailPrice] = useState(product.retailPrice);
  const [wholesalePrice, setWholesalePrice] = useState(product.wholesalePrice || 0);
  const [isPending, startTransition] = useTransition();

  const currentCost = costRecord?.origin_cost || product.supplierLivePrice || 0;
  const currentLanded = costRecord
    ? costRecord.origin_cost * costRecord.exchange_rate + costRecord.freight_per_unit
    : currentCost;

  const newMargin =
    currentLanded > 0 && retailPrice > 0
      ? (((retailPrice - currentLanded) / retailPrice) * 100).toFixed(1)
      : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        await quickUpdateProductPriceAction(
          product.id,
          Number(retailPrice),
          wholesalePrice ? Number(wholesalePrice) : undefined
        );
        onSuccess(`Precio de ${product.title} actualizado a ${money(retailPrice)}`);
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : "Error al actualizar precio.");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-zinc-200">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
          <h3 className="text-base font-bold text-zinc-950">Ajuste Rápido de Precios</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Producto
            </span>
            <p className="font-bold text-zinc-900 line-clamp-1">{product.title}</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700">Precio Minorista (PVP ARS)</label>
            <input
              type="number"
              required
              min="1"
              step="1"
              value={retailPrice}
              onChange={(e) => setRetailPrice(Number(e.target.value))}
              className="mt-1 w-full rounded-xl border border-zinc-300 p-2.5 text-base font-bold text-zinc-950 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-600">
              Precio Mayorista (Opcional ARS)
            </label>
            <input
              type="number"
              min="0"
              step="1"
              value={wholesalePrice}
              onChange={(e) => setWholesalePrice(Number(e.target.value))}
              className="mt-1 w-full rounded-xl border border-zinc-300 p-2.5 text-sm text-zinc-800"
            />
          </div>

          {/* Live margin preview */}
          {currentLanded > 0 && (
            <div className="rounded-xl bg-zinc-50 p-3.5 border border-zinc-200 text-xs space-y-1">
              <div className="flex justify-between text-zinc-500">
                <span>Costo de referencia (Landed):</span>
                <span className="font-semibold text-zinc-800">{money(currentLanded)}</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-zinc-200">
                <span className="font-bold text-zinc-700">Margen bruto resultante:</span>
                <span
                  className={`font-black text-sm ${
                    Number(newMargin) > 25
                      ? "text-emerald-600"
                      : Number(newMargin) > 0
                      ? "text-amber-600"
                      : "text-rose-600"
                  }`}
                >
                  {Number(newMargin) > 0 ? `+${newMargin}%` : `${newMargin}%`}
                </span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-xl bg-zinc-950 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-zinc-800 disabled:opacity-50"
            >
              {isPending ? "Guardando…" : "Guardar Precio"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// SUB-MODAL 2: Quick Supplier Link & Cost Modal
// -----------------------------------------------------------------------------
function QuickSupplierCostModal({
  product,
  costRecord,
  onClose,
  onSuccess,
}: {
  product: Product;
  costRecord?: ProductCost;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}) {
  const [sourceUrl, setSourceUrl] = useState(product.sourceUrl || "");
  const [supplierLivePrice, setSupplierLivePrice] = useState(
    product.supplierLivePrice || costRecord?.origin_cost || ""
  );
  const [supplierAvailable, setSupplierAvailable] = useState(product.supplierAvailable ?? true);
  const [fulfillmentMode, setFulfillmentMode] = useState<"own_stock" | "supplier">(
    product.fulfillmentMode ?? "supplier"
  );
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        await quickUpdateSupplierLinkAction(
          product.id,
          sourceUrl.trim(),
          supplierLivePrice ? Number(supplierLivePrice) : null,
          fulfillmentMode,
          supplierAvailable
        );
        onSuccess(`Enlace y costos de proveedor guardados para ${product.title}`);
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : "Error al guardar enlace de proveedor.");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-zinc-200">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <LinkIcon className="h-4 w-4 text-sky-600" />
            <h3 className="text-base font-bold text-zinc-950">Vincular Enlace de Proveedor</h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Producto
            </span>
            <p className="font-bold text-zinc-900 line-clamp-1">{product.title}</p>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-700">
                URL del producto en la web del mayorista
              </label>
              {sourceUrl && (
                <a
                  href={sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-sky-600 hover:underline"
                >
                  Probar enlace <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
            <input
              type="url"
              required
              placeholder="https://totalherramientasoficial.com.py/... o atacadousa..."
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-300 p-2.5 text-xs text-zinc-900 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-zinc-700">
                Costo en Proveedor (ARS)
              </label>
              <input
                type="number"
                min="0"
                step="1"
                placeholder="Ej. 18500"
                value={supplierLivePrice}
                onChange={(e) => setSupplierLivePrice(e.target.value ? Number(e.target.value) : "")}
                className="mt-1 w-full rounded-xl border border-zinc-300 p-2.5 text-sm font-bold text-zinc-950 focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700">Modalidad de entrega</label>
              <select
                value={fulfillmentMode}
                onChange={(e) => setFulfillmentMode(e.target.value as "supplier" | "own_stock")}
                className="mt-1 w-full rounded-xl border border-zinc-300 bg-white p-2.5 text-xs font-semibold text-zinc-800"
              >
                <option value="supplier">Envío directo de proveedor</option>
                <option value="own_stock">Stock físico propio</option>
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2.5 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs font-medium text-zinc-800 cursor-pointer">
            <input
              type="checkbox"
              checked={supplierAvailable}
              onChange={(e) => setSupplierAvailable(e.target.checked)}
              className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span>
              <strong>Proveedor disponible:</strong> El artículo está en stock en el mayorista y listo para despachar.
            </span>
          </label>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-xl bg-zinc-950 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-zinc-800 disabled:opacity-50"
            >
              {isPending ? "Guardando…" : "Guardar Proveedor"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// SUB-MODAL 3: Full Financial Control Modal
// -----------------------------------------------------------------------------
function FinancialControlModal({
  product,
  costRecord,
  onClose,
  onSuccess,
}: {
  product: Product;
  costRecord?: ProductCost;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState("");

  const [values, setValues] = useState({
    purchase: Number(costRecord?.origin_cost || product.supplierLivePrice || 0),
    exchange: Number(costRecord?.exchange_rate || 1),
    freight: Number(costRecord?.freight_per_unit || 0),
    other: Number(costRecord?.other_landed_cost || 0),
    variable: Number(costRecord?.variable_cost || 0),
    fee: Number(costRecord?.payment_fee_percent || 0),
    minimum: Number(costRecord?.minimum_contribution || 0),
    sale: product.retailPrice,
  });

  const [currency, setCurrency] = useState(costRecord?.currency || "ARS");
  const [sourceUrl, setSourceUrl] = useState(costRecord?.supplier_url || product.sourceUrl || "");
  const [mode, setMode] = useState<"supplier" | "own_stock">(product.fulfillmentMode || "supplier");
  const [available, setAvailable] = useState(product.supplierAvailable ?? true);
  const [stock, setStock] = useState<number | "">(product.stockVerifiedAt ? product.stock : "");
  const [stockConfirmed, setStockConfirmed] = useState(false);
  const [expensesConfirmed, setExpensesConfirmed] = useState(costRecord?.expenses_confirmed ?? false);

  // Dynamic profit calculation
  const dynamicProfit = useMemo(() => {
    return calculateProductProfit(values.sale, {
      product_id: product.id,
      origin_cost: values.purchase,
      currency,
      exchange_rate: values.exchange,
      freight_per_unit: values.freight,
      other_landed_cost: values.other,
      variable_cost: values.variable,
      payment_fee_percent: values.fee,
      minimum_contribution: values.minimum,
      expenses_confirmed: expensesConfirmed,
    });
  }, [values, currency, expensesConfirmed, product.id]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage("");

    const formData = new FormData(e.currentTarget);
    formData.set("product_id", product.id);
    formData.set("currency", currency);
    formData.set("source_url", sourceUrl);
    formData.set("mode", mode);
    if (available) formData.set("available", "on");
    if (expensesConfirmed) formData.set("expenses_confirmed", "on");
    if (stockConfirmed && stock !== "") {
      formData.set("stock", String(stock));
      formData.set("stock_confirmed", "on");
    }

    startTransition(async () => {
      try {
        const msg = await saveFinancialControl(formData);
        onSuccess(msg);
      } catch (err: unknown) {
        setErrorMessage(err instanceof Error ? err.message : "Error al guardar costos.");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-3xl flex flex-col rounded-2xl bg-white shadow-2xl border border-zinc-200 overflow-hidden max-h-[92dvh]">
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-zinc-100 bg-white shrink-0">
          <div className="min-w-0 flex-1 pr-2">
            <h2 className="text-base sm:text-lg font-bold text-zinc-950 truncate">Ajuste Integral de Costos & Ganancia</h2>
            <p className="text-xs text-zinc-500 mt-0.5 truncate">{product.title}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 shrink-0 cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Section 1: Purchase and Currency */}
          <div>
            <div className="flex items-center justify-between border-b border-zinc-100 pb-1 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-700">
                1. Proveedor & Moneda de Compra
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500">Moneda:</span>
                <select
                  value={currency}
                  onChange={(e) => {
                    setCurrency(e.target.value);
                    if (e.target.value === "ARS") setValues((v) => ({ ...v, exchange: 1 }));
                  }}
                  className="rounded-lg border border-zinc-300 bg-white px-2 py-1 text-xs font-bold text-zinc-800"
                >
                  <option value="ARS">ARS ($)</option>
                  <option value="USD">USD (U$D)</option>
                  <option value="PYG">PYG (₲)</option>
                </select>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-700">
                    URL directa del proveedor
                  </label>
                  {sourceUrl && (
                    <a
                      href={sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-sky-600 hover:underline"
                    >
                      Probar enlace <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
                <input
                  type="url"
                  placeholder="https://..."
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-zinc-300 p-2.5 text-xs text-zinc-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700">
                  Costo de compra en origen ({currency})
                </label>
                <input
                  required
                  name="purchase"
                  type="number"
                  min="0"
                  step="0.01"
                  value={values.purchase}
                  onChange={(e) => setValues({ ...values, purchase: Number(e.target.value) })}
                  className="mt-1 w-full rounded-xl border border-zinc-300 p-2.5 text-sm font-bold text-zinc-900 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700">
                  Conversión a ARS {currency === "ARS" && "(Fijo en 1)"}
                </label>
                <input
                  required
                  name="exchange"
                  type="number"
                  min="0.001"
                  step="0.01"
                  disabled={currency === "ARS"}
                  value={currency === "ARS" ? 1 : values.exchange}
                  onChange={(e) => setValues({ ...values, exchange: Number(e.target.value) })}
                  className="mt-1 w-full rounded-xl border border-zinc-300 bg-zinc-50 p-2.5 text-sm font-semibold disabled:opacity-60"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Freight and Landed Costs */}
          <div>
            <span className="block text-xs font-bold uppercase tracking-wider text-zinc-700 border-b border-zinc-100 pb-1 mb-3">
              2. Logística, Flete & Gastos de Internación
            </span>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-zinc-700">
                  Transporte / Flete unitario en ARS
                </label>
                <input
                  required
                  name="freight"
                  type="number"
                  min="0"
                  step="0.01"
                  value={values.freight}
                  onChange={(e) => setValues({ ...values, freight: Number(e.target.value) })}
                  className="mt-1 w-full rounded-xl border border-zinc-300 p-2.5 text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700">
                  Otros costos de ingreso en ARS
                </label>
                <input
                  required
                  name="other"
                  type="number"
                  min="0"
                  step="0.01"
                  value={values.other}
                  onChange={(e) => setValues({ ...values, other: Number(e.target.value) })}
                  className="mt-1 w-full rounded-xl border border-zinc-300 p-2.5 text-sm font-medium"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Fees & Commercial Sales */}
          <div>
            <span className="block text-xs font-bold uppercase tracking-wider text-zinc-700 border-b border-zinc-100 pb-1 mb-3">
              3. Gastos de Venta, Pasarela & Precio
            </span>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-zinc-700">
                  Gastos de venta / embalaje (ARS)
                </label>
                <input
                  required
                  name="variable"
                  type="number"
                  min="0"
                  step="0.01"
                  value={values.variable}
                  onChange={(e) => setValues({ ...values, variable: Number(e.target.value) })}
                  className="mt-1 w-full rounded-xl border border-zinc-300 p-2.5 text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700">
                  Comisión pasarela / cobro (%)
                </label>
                <input
                  required
                  name="fee"
                  type="number"
                  min="0"
                  max="99"
                  step="0.1"
                  value={values.fee}
                  onChange={(e) => setValues({ ...values, fee: Number(e.target.value) })}
                  className="mt-1 w-full rounded-xl border border-zinc-300 p-2.5 text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700">
                  Contribución mínima en ARS
                </label>
                <input
                  required
                  name="minimum"
                  type="number"
                  min="0"
                  step="0.01"
                  value={values.minimum}
                  onChange={(e) => setValues({ ...values, minimum: Number(e.target.value) })}
                  className="mt-1 w-full rounded-xl border border-zinc-300 p-2.5 text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-emerald-900">
                  Precio de venta al público (PVP ARS)
                </label>
                <input
                  required
                  name="sale"
                  type="number"
                  min="1"
                  step="1"
                  value={values.sale}
                  onChange={(e) => setValues({ ...values, sale: Number(e.target.value) })}
                  className="mt-1 w-full rounded-xl border border-emerald-400 bg-emerald-50/50 p-2.5 text-sm font-black text-emerald-950 focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Live Dynamic Profit Breakdown Card */}
          {dynamicProfit && (
            <div className="rounded-2xl border border-zinc-200 bg-zinc-900 p-5 text-white space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Simulación en Tiempo Real
              </span>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-xs">
                <div>
                  <span className="text-zinc-400">Costo Puesto:</span>
                  <p className="text-sm font-bold text-zinc-100">{money(dynamicProfit.landed)}</p>
                </div>
                <div>
                  <span className="text-zinc-400">Comisión cobro:</span>
                  <p className="text-sm font-bold text-zinc-100">{money(dynamicProfit.fees)}</p>
                </div>
                <div>
                  <span className="text-zinc-400">Ganancia neta:</span>
                  <p
                    className={`text-sm font-bold ${
                      dynamicProfit.contribution > 0 ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {money(dynamicProfit.contribution)}
                  </p>
                </div>
                <div>
                  <span className="text-zinc-400">Margen sobre venta:</span>
                  <p
                    className={`text-base font-black ${
                      dynamicProfit.margin > 25
                        ? "text-emerald-400"
                        : dynamicProfit.margin > 0
                        ? "text-amber-400"
                        : "text-rose-400"
                    }`}
                  >
                    {dynamicProfit.margin > 0
                      ? `+${dynamicProfit.margin.toFixed(1)}%`
                      : `${dynamicProfit.margin.toFixed(1)}%`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Section 5: Delivery Mode & Physical Stock Verification */}
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-800">
              4. Modalidad de Entrega & Stock Físico
            </span>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-zinc-700">Modalidad</label>
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value as "supplier" | "own_stock")}
                  className="mt-1 w-full rounded-xl border border-zinc-300 bg-white p-2.5 text-xs font-semibold"
                >
                  <option value="supplier">Envío directo del proveedor</option>
                  <option value="own_stock">Stock físico propio</option>
                </select>
              </div>

              {mode === "supplier" ? (
                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 text-xs font-semibold text-zinc-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={available}
                      onChange={(e) => setAvailable(e.target.checked)}
                      className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    Proveedor disponible para pedidos
                  </label>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-zinc-700">
                    Unidades físicas verificadas
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100000"
                    step="1"
                    placeholder="Dejar vacío para no modificar"
                    value={stock}
                    onChange={(e) => setStock(e.target.value === "" ? "" : Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-zinc-300 bg-white p-2.5 text-xs font-bold"
                  />
                  {stock !== "" && (
                    <label className="mt-2 flex items-center gap-2 text-[11px] font-semibold text-zinc-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={stockConfirmed}
                        onChange={(e) => setStockConfirmed(e.target.checked)}
                        className="rounded border-zinc-300 text-sky-600"
                      />
                      Conté estas unidades físicamente
                    </label>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Confirmation Checkbox */}
          <label className="flex items-center gap-2 text-xs font-medium text-zinc-700 cursor-pointer">
            <input
              type="checkbox"
              checked={expensesConfirmed}
              onChange={(e) => setExpensesConfirmed(e.target.checked)}
              className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
            />
            Confirmé los importes de flete, comisión y costos de internación.
          </label>

          {errorMessage && (
            <div className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs font-semibold text-rose-800">
              {errorMessage}
            </div>
          )}

          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2.5 p-4 sm:p-5 border-t border-zinc-200 bg-zinc-50 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto rounded-xl border border-zinc-300 px-5 py-2.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-200 transition-colors text-center cursor-pointer"
            >
              Cerrar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-950 px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-zinc-800 disabled:opacity-50 transition-colors text-center cursor-pointer"
            >
              {isPending ? "Guardando…" : "Guardar Costos y Precio"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
