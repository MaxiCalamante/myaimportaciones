"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Search,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ShoppingBag,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Link as LinkIcon,
  X,
  Check,
  ShieldCheck,
  ArrowUpDown,
  Zap,
} from "lucide-react";
import type {
  ProductMarketComparison,
  MarketPricingStats,
  MarketComparisonFilterParams,
  PriceStrategyAction,
} from "@/lib/mercadolibre-pricing";
import {
  getProductMarketComparisonsAction,
  applyCompetitivePriceAction,
  bulkApplyRecommendedRaisesAction,
  linkMercadoLibreReferenceAction,
} from "@/app/admin/actions";

interface Props {
  initialItems: ProductMarketComparison[];
  initialTotal: number;
  initialStats: MarketPricingStats;
  initialPage: number;
  initialTotalPages: number;
  categories: Array<{ id: string; name: string; slug: string }>;
}

export function MercadoLibrePricingManager({
  initialItems,
  initialTotal,
  initialStats,
  initialPage,
  initialTotalPages,
  categories,
}: Props) {
  const [items, setItems] = useState<ProductMarketComparison[]>(initialItems);
  const [total, setTotal] = useState(initialTotal);
  const [stats, setStats] = useState<MarketPricingStats>(initialStats);
  const [page, setPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [isPending, startTransition] = useTransition();

  // Filters
  const [query, setQuery] = useState("");
  const [actionFilter, setActionFilter] = useState<PriceStrategyAction | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState<MarketComparisonFilterParams["sortBy"]>("gain_desc");

  // Single Item Action States
  const [applyingProductId, setApplyingProductId] = useState<string | null>(null);
  const [appliedProductIds, setAppliedProductIds] = useState<Set<string>>(new Set());

  // Link ML Modal State
  const [linkingProduct, setLinkingProduct] = useState<ProductMarketComparison | null>(null);
  const [inputMlUrl, setInputMlUrl] = useState("");
  const [inputMlPrice, setInputMlPrice] = useState<number>(0);
  const [isSavingRef, setIsSavingRef] = useState(false);

  // Bulk Raise State
  const [isBulkApplying, setIsBulkApplying] = useState(false);
  const [bulkSuccessMessage, setBulkSuccessMessage] = useState<string | null>(null);

  // Search / Filter execution
  const applyFilters = (newPage: number = 1, overrides: Partial<MarketComparisonFilterParams> = {}) => {
    setPage(newPage);
    startTransition(async () => {
      try {
        const qVal = overrides.query !== undefined ? overrides.query : (query.trim() || undefined);
        const actVal = overrides.action !== undefined ? overrides.action : actionFilter;
        const catVal = overrides.categorySlug !== undefined ? overrides.categorySlug : categoryFilter;
        const sortVal = overrides.sortBy !== undefined ? overrides.sortBy : sortBy;

        const res = await getProductMarketComparisonsAction({
          query: qVal,
          action: actVal,
          categorySlug: catVal,
          sortBy: sortVal,
          page: newPage,
          pageSize: 25,
        });
        setItems(res.items);
        setTotal(res.total);
        setStats(res.stats);
        setTotalPages(res.totalPages);
      } catch (err) {
        console.error("Error filtrando comparativas:", err);
      }
    });
  };

  // Apply single recommended price
  const handleApplySinglePrice = async (item: ProductMarketComparison) => {
    setApplyingProductId(item.productId);
    try {
      const res = await applyCompetitivePriceAction(item.productId, item.targetPrice);
      if (res.success) {
        setAppliedProductIds((prev) => new Set(prev).add(item.productId));
        // Update item in local state
        setItems((prev) =>
          prev.map((i) =>
            i.productId === item.productId
              ? {
                  ...i,
                  currentPrice: item.targetPrice,
                  action: "optimal",
                  actionLabel: "Precio óptimo aplicado ✓",
                  potentialGainArs: 0,
                  priceDifferenceArs: item.targetPrice - (item.mlPrice || 0),
                  priceDifferencePercent: item.mlPrice
                    ? Math.round(((item.targetPrice - item.mlPrice) / item.mlPrice) * 1000) / 10
                    : 0,
                }
              : i
          )
        );
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al aplicar precio.");
    } finally {
      setApplyingProductId(null);
    }
  };

  // Bulk Apply Raises
  const handleBulkApplyRaises = async () => {
    if (
      !confirm(
        `¿Confirmás aplicar los aumentos de precio recomendados a los ${stats.canRaiseCount} productos?\n\nEsto sumará un estimado de +$${stats.potentialExtraProfitArs.toLocaleString("es-AR")} de ganancia neta manteniendo los precios más baratos que Mercado Libre.`
      )
    ) {
      return;
    }

    setIsBulkApplying(true);
    setBulkSuccessMessage(null);

    try {
      const res = await bulkApplyRecommendedRaisesAction();
      setBulkSuccessMessage(
        `¡Se actualizaron con éxito los precios de ${res.updatedCount} productos! Ganancia extra proyectada: +$${res.extraProfitArs.toLocaleString("es-AR")}.`
      );
      applyFilters(page);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al aplicar aumentos masivos.");
    } finally {
      setIsBulkApplying(false);
    }
  };

  // Save ML Reference Modal
  const handleOpenLinkModal = (item: ProductMarketComparison) => {
    setLinkingProduct(item);
    setInputMlUrl(item.mlUrl || "");
    setInputMlPrice(item.mlPrice || 0);
  };

  const handleSaveMlReference = async () => {
    if (!linkingProduct) return;
    if (!inputMlPrice || inputMlPrice <= 0) {
      alert("Ingresá un precio válido de Mercado Libre.");
      return;
    }

    setIsSavingRef(true);
    try {
      await linkMercadoLibreReferenceAction(
        linkingProduct.productId,
        inputMlUrl.trim() || linkingProduct.mlSearchUrl,
        Number(inputMlPrice)
      );
      setLinkingProduct(null);
      applyFilters(page);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al guardar referencia de Mercado Libre.");
    } finally {
      setIsSavingRef(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner / Hero Header */}
      <div className="relative overflow-hidden rounded-3xl border border-sky-200/80 bg-gradient-to-br from-white via-sky-50/40 to-indigo-50/30 p-6 sm:p-8 shadow-xs">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-3xl space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-100/90 px-3 py-1 text-xs font-black text-amber-900 border border-amber-300/50">
              <Zap className="h-3.5 w-3.5 text-amber-600 fill-amber-600" />
              Sistema 4: Monitor de Precios Mercado Libre & Precios Dinámicos
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-zinc-950">
              Maximizá Ganancias y Asegurá Precios Competitivos
            </h1>
            <p className="text-sm text-zinc-600 leading-relaxed">
              Monitoreá los precios de Mercado Libre para todo tu catálogo. Identificá qué productos tienen
              margen para <strong>subir de precio</strong> y ganar más plata, y en cuáles conviene <strong>bajar un poco</strong>{" "}
              para que el comprador diga <em>&ldquo;¡uuu más barato!&rdquo;</em> y te elija a vos.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <Link
              href="/admin"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 text-xs font-bold text-zinc-700 shadow-2xs hover:bg-zinc-50 transition-all"
            >
              <ChevronLeft className="h-4 w-4" />
              Panel Admin
            </Link>
            <button
              type="button"
              onClick={() => applyFilters(1)}
              disabled={isPending}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-zinc-900 hover:bg-black px-5 text-xs font-extrabold text-white shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
              Actualizar Monitor
            </button>
          </div>
        </div>

        {/* 4 Actionable KPI Metric Cards */}
        <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Card 1: Subir Precio (Maximizar Ganancia) */}
          <button
            type="button"
            onClick={() => {
              setActionFilter("raise_price");
              applyFilters(1, { action: "raise_price" });
            }}
            className="text-left rounded-2xl border border-emerald-200 bg-white/95 backdrop-blur-xs p-4 shadow-2xs hover:border-emerald-400 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800">
                Podés Subir Precio
              </span>
              <TrendingUp className="h-4 w-4 text-emerald-600 group-hover:scale-110 transition-transform" />
            </div>
            <div className="mt-2 text-2xl font-black text-emerald-700 tracking-tight">
              {stats.canRaiseCount} productos
            </div>
            <div className="text-[11px] font-bold text-emerald-800 mt-0.5">
              +${stats.potentialExtraProfitArs.toLocaleString("es-AR")} ganancia extra
            </div>
          </button>

          {/* Card 2: Bajar Precio (Ser Competitivo) */}
          <button
            type="button"
            onClick={() => {
              setActionFilter("lower_price");
              applyFilters(1, { action: "lower_price" });
            }}
            className="text-left rounded-2xl border border-amber-200 bg-white/95 backdrop-blur-xs p-4 shadow-2xs hover:border-amber-400 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-800">
                Conviene Bajar Precio
              </span>
              <TrendingDown className="h-4 w-4 text-amber-600 group-hover:scale-110 transition-transform" />
            </div>
            <div className="mt-2 text-2xl font-black text-amber-700 tracking-tight">
              {stats.canLowerCount} productos
            </div>
            <div className="text-[11px] text-zinc-500 mt-0.5">
              Más caros que ML · Bajando ganás la venta
            </div>
          </button>

          {/* Card 3: Precios Óptimos */}
          <button
            type="button"
            onClick={() => {
              setActionFilter("optimal");
              applyFilters(1, { action: "optimal" });
            }}
            className="text-left rounded-2xl border border-sky-200 bg-white/95 backdrop-blur-xs p-4 shadow-2xs hover:border-sky-400 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-sky-800">
                Precios Óptimos
              </span>
              <ShieldCheck className="h-4 w-4 text-sky-600 group-hover:scale-110 transition-transform" />
            </div>
            <div className="mt-2 text-2xl font-black text-sky-700 tracking-tight">
              {stats.optimalCount} productos
            </div>
            <div className="text-[11px] text-zinc-500 mt-0.5">
              Más baratos que ML con excelente margen
            </div>
          </button>

          {/* Card 4: Sin Referencia */}
          <button
            type="button"
            onClick={() => {
              setActionFilter("missing_benchmark");
              applyFilters(1, { action: "missing_benchmark" });
            }}
            className="text-left rounded-2xl border border-zinc-200 bg-white/95 backdrop-blur-xs p-4 shadow-2xs hover:border-zinc-400 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-600">
                Sin Referencia ML
              </span>
              <Search className="h-4 w-4 text-zinc-500 group-hover:scale-110 transition-transform" />
            </div>
            <div className="mt-2 text-2xl font-black text-zinc-800 tracking-tight">
              {stats.missingCount} productos
            </div>
            <div className="text-[11px] text-zinc-500 mt-0.5">
              Buscá y vinculá en 1 clic
            </div>
          </button>
        </div>
      </div>

      {/* Bulk Action Callout when there is money on the table */}
      {stats.canRaiseCount > 0 && (
        <div className="rounded-2xl border border-emerald-300 bg-gradient-to-r from-emerald-50 via-emerald-100/40 to-teal-50 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white">
                <Sparkles className="h-3.5 w-3.5" />
              </span>
              <h3 className="text-sm font-black text-emerald-950">
                Oportunidad de Maximización de Ganancias Detectada
              </h3>
            </div>
            <p className="text-xs text-emerald-900 leading-relaxed max-w-2xl">
              Hay <strong>{stats.canRaiseCount} productos</strong> con precio muy por debajo de Mercado Libre. Podés
              capturar un estimado de <strong>+${stats.potentialExtraProfitArs.toLocaleString("es-AR")} de ganancia neta</strong>{" "}
              sin perder competitividad (quedan exactamente un 8% más baratos que Mercado Libre).
            </p>
          </div>

          <button
            type="button"
            onClick={handleBulkApplyRaises}
            disabled={isBulkApplying || isPending}
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-[0.99] px-5 text-xs font-black text-white shadow-xs transition-all cursor-pointer disabled:opacity-50"
          >
            {isBulkApplying ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Aplicando Aumentos...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 fill-white" />
                Aplicar Aumentos Sugeridos ({stats.canRaiseCount})
              </>
            )}
          </button>
        </div>
      )}

      {bulkSuccessMessage && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-xs font-bold text-emerald-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-700" />
            <span>{bulkSuccessMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setBulkSuccessMessage(null)}
            className="text-emerald-700 hover:text-emerald-950"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Filter and Control Bar */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") applyFilters(1);
              }}
              placeholder="Buscá por producto, marca o modelo para ver comparativa de Mercado Libre..."
              className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 pl-10 pr-9 text-xs font-medium text-zinc-900 placeholder:text-zinc-400 focus:border-sky-500 focus:bg-white focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  applyFilters(1, { query: "" });
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 p-0.5 rounded-full"
                title="Limpiar búsqueda"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => applyFilters(1)}
            disabled={isPending}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-zinc-900 hover:bg-black px-5 text-xs font-bold text-white shadow-2xs transition-all cursor-pointer disabled:opacity-50"
          >
            <Search className="h-3.5 w-3.5" />
            Buscar
          </button>
        </div>

        {/* Filter Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
          {/* Action Filter */}
          <div>
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
              Estado / Acción Recomendada
            </label>
            <select
              value={actionFilter}
              onChange={(e) => {
                const val = e.target.value as PriceStrategyAction | "all";
                setActionFilter(val);
                applyFilters(1, { action: val });
              }}
              className="h-9 w-full rounded-lg border border-zinc-200 bg-white px-2.5 text-xs font-semibold text-zinc-700 outline-none cursor-pointer focus:border-sky-500"
            >
              <option value="all">Todas las Oportunidades ({stats.totalEvaluated})</option>
              <option value="raise_price">🟢 Subir Precio / Maximizar ({stats.canRaiseCount})</option>
              <option value="lower_price">🟡 Bajar Precio / Competir ({stats.canLowerCount})</option>
              <option value="optimal">🔵 Precios Óptimos ({stats.optimalCount})</option>
              <option value="missing_benchmark">⚪ Sin Referencia ML ({stats.missingCount})</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
              Categoría
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => {
                const val = e.target.value;
                setCategoryFilter(val);
                applyFilters(1, { categorySlug: val });
              }}
              className="h-9 w-full rounded-lg border border-zinc-200 bg-white px-2.5 text-xs font-semibold text-zinc-700 outline-none cursor-pointer focus:border-sky-500"
            >
              <option value="all">Todas las Categorías</option>
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div>
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
              Ordenar por
            </label>
            <select
              value={sortBy}
              onChange={(e) => {
                const val = e.target.value as MarketComparisonFilterParams["sortBy"];
                setSortBy(val);
                applyFilters(1, { sortBy: val });
              }}
              className="h-9 w-full rounded-lg border border-zinc-200 bg-white px-2.5 text-xs font-semibold text-zinc-700 outline-none cursor-pointer focus:border-sky-500"
            >
              <option value="gain_desc">Mayor Ganancia Extra ($ ARS)</option>
              <option value="diff_desc">Más Caro vs ML (Urgente Bajar)</option>
              <option value="diff_asc">Más Barato vs ML (Espacio para Subir)</option>
              <option value="price_desc">Mayor Precio de Venta</option>
              <option value="title_asc">Nombre (A - Z)</option>
            </select>
          </div>
        </div>

        {/* Apply Trigger */}
        <div className="flex items-center justify-between pt-2 border-t border-zinc-100 text-xs text-zinc-500">
          <span>
            Mostrando <strong>{items.length}</strong> de <strong>{total}</strong> productos evaluados
          </span>
          <button
            type="button"
            onClick={() => applyFilters(1)}
            disabled={isPending}
            className="inline-flex items-center gap-1 font-bold text-sky-600 hover:text-sky-700 cursor-pointer"
          >
            <SlidersHorizontal className="h-3 w-3" />
            Aplicar Filtros
          </button>
        </div>
      </div>

      {/* Comparisons Table / List */}
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 uppercase font-black text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Producto</th>
                <th className="py-3 px-3">Costo Puesto en Mano</th>
                <th className="py-3 px-3">Nuestro Precio</th>
                <th className="py-3 px-3">Mercado Libre</th>
                <th className="py-3 px-3">Diferencia</th>
                <th className="py-3 px-4">Estrategia Recomendada</th>
                <th className="py-3 px-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-400">
                    No se encontraron productos con estos filtros.
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const isApplied = appliedProductIds.has(item.productId);
                  const isApplying = applyingProductId === item.productId;

                  return (
                    <tr
                      key={item.productId}
                      className={`hover:bg-zinc-50/70 transition-colors ${
                        item.action === "raise_price" ? "bg-emerald-50/20" : ""
                      }`}
                    >
                      {/* Product column */}
                      <td className="py-3 px-4 max-w-xs">
                        <div className="flex items-center gap-3">
                          {item.imageUrl ? (
                            <Image
                              src={item.imageUrl}
                              alt={item.title}
                              width={40}
                              height={40}
                              className="h-10 w-10 shrink-0 rounded-lg object-cover border border-zinc-100"
                            />
                          ) : (
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-400">
                              <ShoppingBag className="h-4 w-4" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <Link
                              href={`/producto/${item.slug}`}
                              target="_blank"
                              className="font-bold text-zinc-900 hover:text-sky-600 line-clamp-1 block transition-colors"
                            >
                              {item.title}
                            </Link>
                            <span className="text-[10px] text-zinc-400 block mt-0.5">
                              {item.categoryName} {item.brand ? `· ${item.brand}` : ""}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Landed Cost */}
                      <td className="py-3 px-3 font-semibold text-zinc-600">
                        {item.landedCostArs > 0
                          ? `$${item.landedCostArs.toLocaleString("es-AR")}`
                          : "—"}
                      </td>

                      {/* Current MYA Price */}
                      <td className="py-3 px-3">
                        <div className="font-extrabold text-zinc-900">
                          ${item.currentPrice.toLocaleString("es-AR")}
                        </div>
                        {item.wholesalePrice && item.wholesalePrice > 0 ? (
                          <div className="text-[10px] font-bold text-sky-700 mt-0.5">
                            Mayorista: ${item.wholesalePrice.toLocaleString("es-AR")}
                          </div>
                        ) : null}
                        {item.currentMarginPercent > 0 && (
                          <span className="text-[10px] font-semibold text-zinc-400">
                            Margen: {item.currentMarginPercent}%
                          </span>
                        )}
                      </td>

                      {/* Mercado Libre Benchmark */}
                      <td className="py-3 px-3">
                        {item.mlPrice ? (
                          <div>
                            <div className="font-extrabold text-zinc-800">
                              ${item.mlPrice.toLocaleString("es-AR")}
                            </div>
                            <div className="flex items-center gap-1 mt-0.5">
                              {item.mlUrl ? (
                                <a
                                  href={item.mlUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-0.5 text-[10px] font-bold text-sky-600 hover:underline"
                                  title="Ver publicación de referencia en Mercado Libre"
                                >
                                  Ver en ML
                                  <ExternalLink className="h-2.5 w-2.5" />
                                </a>
                              ) : (
                                <span className="text-[10px] text-zinc-400">Ref. ML</span>
                              )}
                              <button
                                type="button"
                                onClick={() => handleOpenLinkModal(item)}
                                className="text-[10px] text-zinc-400 hover:text-zinc-600 ml-1 cursor-pointer"
                                title="Editar precio o link de Mercado Libre"
                              >
                                (editar)
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <a
                              href={item.mlSearchUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-[10px] font-bold text-zinc-700 hover:bg-zinc-100"
                              title="Buscar producto en Mercado Libre Argentina"
                            >
                              <Search className="h-3 w-3" />
                              Buscar en ML
                            </a>
                            <button
                              type="button"
                              onClick={() => handleOpenLinkModal(item)}
                              className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-[10px] font-bold text-sky-600 hover:bg-sky-50 cursor-pointer"
                              title="Cargar precio observado de Mercado Libre"
                            >
                              Vincular
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Difference vs ML */}
                      <td className="py-3 px-3">
                        {item.mlPrice ? (
                          <span
                            className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                              item.priceDifferencePercent < -8
                                ? "bg-emerald-100 text-emerald-800"
                                : item.priceDifferencePercent > 0
                                ? "bg-amber-100 text-amber-900"
                                : "bg-sky-100 text-sky-800"
                            }`}
                          >
                            {item.priceDifferencePercent > 0 ? "+" : ""}
                            {item.priceDifferencePercent}% vs ML
                          </span>
                        ) : (
                          <span className="text-zinc-300">—</span>
                        )}
                      </td>

                      {/* Strategy / Recommendation */}
                      <td className="py-3 px-4">
                        {item.action === "raise_price" && (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-700">
                              <TrendingUp className="h-3.5 w-3.5" />
                              Sugerido: ${item.targetPrice.toLocaleString("es-AR")}
                            </span>
                            <span className="text-[10px] font-bold text-emerald-800 block">
                              +${item.potentialGainArs.toLocaleString("es-AR")} más ganancia por unidad
                            </span>
                          </div>
                        )}

                        {item.action === "lower_price" && (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 text-xs font-black text-amber-700">
                              <TrendingDown className="h-3.5 w-3.5" />
                              Sugerido: ${item.targetPrice.toLocaleString("es-AR")}
                            </span>
                            <span className="text-[10px] text-zinc-500 block">
                              8% más barato que ML para ganar la venta
                            </span>
                          </div>
                        )}

                        {item.action === "optimal" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-0.5 text-[10px] font-bold text-sky-800 border border-sky-200/60">
                            <Check className="h-3 w-3 text-sky-600" />
                            Precio Óptimo (Más barato que ML)
                          </span>
                        )}

                        {item.action === "cost_constrained" && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700">
                            <AlertTriangle className="h-3 w-3 text-rose-500" />
                            Costo de origen elevado vs ML
                          </span>
                        )}

                        {item.action === "missing_benchmark" && (
                          <span className="text-[10px] text-zinc-400">
                            Sin comparable para evaluar
                          </span>
                        )}
                      </td>

                      {/* Action Button */}
                      <td className="py-3 px-4 text-right">
                        {isApplied ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                            <Check className="h-3.5 w-3.5" />
                            Aplicado ✓
                          </span>
                        ) : item.action === "raise_price" || item.action === "lower_price" ? (
                          <button
                            type="button"
                            onClick={() => handleApplySinglePrice(item)}
                            disabled={isApplying}
                            className={`inline-flex h-8 items-center justify-center gap-1 rounded-lg px-3 text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                              item.action === "raise_price"
                                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                : "bg-zinc-900 hover:bg-black text-white"
                            }`}
                          >
                            {isApplying ? (
                              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <>
                                <Zap className="h-3 w-3 fill-current" />
                                <span>Aplicar ${item.targetPrice.toLocaleString("es-AR")}</span>
                              </>
                            )}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenLinkModal(item)}
                            className="inline-flex h-8 items-center justify-center rounded-lg border border-zinc-200 bg-white px-2.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 cursor-pointer"
                          >
                            {item.mlPrice ? "Actualizar ML" : "Vincular"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-zinc-200 px-4 py-3 bg-zinc-50/50">
            <span className="text-xs text-zinc-500">
              Página <strong>{page}</strong> de <strong>{totalPages}</strong> ({total} productos)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1 || isPending}
                onClick={() => applyFilters(page - 1)}
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Anterior
              </button>
              <button
                type="button"
                disabled={page >= totalPages || isPending}
                onClick={() => applyFilters(page + 1)}
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 cursor-pointer"
              >
                Siguiente
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Vincular / Editar Referencia de Mercado Libre */}
      {linkingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between gap-3 border-b border-zinc-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-zinc-900">
                  Referencia de Mercado Libre
                </h3>
                <p className="text-xs text-zinc-500 line-clamp-1 mt-0.5">
                  {linkingProduct.title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLinkingProduct(null)}
                className="text-zinc-400 hover:text-zinc-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-extrabold text-zinc-700 block mb-1">
                  Precio Observado en Mercado Libre (ARS)
                </label>
                <input
                  type="number"
                  value={inputMlPrice || ""}
                  onChange={(e) => setInputMlPrice(Number(e.target.value))}
                  placeholder="ej. 89900"
                  className="h-10 w-full rounded-xl border border-zinc-200 px-3 text-xs font-bold text-zinc-900 focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-extrabold text-zinc-700 block mb-1">
                  Enlace de la Publicación de Mercado Libre
                </label>
                <input
                  type="url"
                  value={inputMlUrl}
                  onChange={(e) => setInputMlUrl(e.target.value)}
                  placeholder="https://articulo.mercadolibre.com.ar/MLA-..."
                  className="h-10 w-full rounded-xl border border-zinc-200 px-3 text-xs text-zinc-900 focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div className="rounded-xl border border-sky-100 bg-sky-50/70 p-3 flex items-center justify-between">
                <div>
                  <span className="font-bold text-sky-900 block">
                    ¿No tenés la publicación a mano?
                  </span>
                  <span className="text-[11px] text-sky-700">
                    Abrí la búsqueda directa en Mercado Libre Argentina
                  </span>
                </div>
                <a
                  href={linkingProduct.mlSearchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg bg-sky-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-sky-700"
                >
                  Buscar en ML
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setLinkingProduct(null)}
                className="h-9 rounded-xl border border-zinc-200 px-3 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveMlReference}
                disabled={isSavingRef || !inputMlPrice || inputMlPrice <= 0}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-zinc-900 hover:bg-black px-4 text-xs font-bold text-white disabled:opacity-50"
              >
                {isSavingRef ? (
                  <>
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  "Guardar Referencia"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
