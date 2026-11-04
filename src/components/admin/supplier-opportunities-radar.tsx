"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Sparkles,
  TrendingUp,
  Search,
  CheckCircle2,
  ExternalLink,
  DollarSign,
  PackageCheck,
  RefreshCw,
  ShoppingBag,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
  AlertTriangle,
  Zap,
} from "lucide-react";
import type {
  SupplierOpportunity,
  OpportunitySearchResult,
  OpportunitySearchParams,
} from "@/lib/supplier-opportunities";
import {
  searchSupplierOpportunitiesAction,
  importSupplierOpportunityAction,
} from "@/app/admin/actions";
import { buildMercadoLibreSearchUrl } from "@/lib/mercadolibre-url";

interface CategoryOption {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
}

interface SupplierOption {
  id: string;
  name: string;
  officialKey: string;
}

interface Props {
  initialData: OpportunitySearchResult;
  categories: CategoryOption[];
  suppliers: SupplierOption[];
}

export function SupplierOpportunitiesRadar({
  initialData,
  categories,
  suppliers,
}: Props) {
  const [data, setData] = useState<OpportunitySearchResult>(initialData);
  const [isPending, startTransition] = useTransition();

  // Filters State
  const [query, setQuery] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [minMargin, setMinMargin] = useState<number | undefined>(undefined);
  const [sortBy, setSortBy] = useState<OpportunitySearchParams["sortBy"]>("profit_desc");

  // Import Modal State
  const [activeOpportunity, setActiveOpportunity] = useState<SupplierOpportunity | null>(null);
  const [editCategoryId, setEditCategoryId] = useState("");
  const [importActionChoice, setImportActionChoice] = useState<"link" | "new">("link");
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState<{
    productId: string;
    slug: string;
    title: string;
    isActive: boolean;
    outcome: string;
    warning?: string;
  } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  // Set of imported offer IDs in the current session
  const [importedOfferIds, setImportedOfferIds] = useState<Set<string>>(new Set());
  const [quickImportingOfferId, setQuickImportingOfferId] = useState<string | null>(null);
  const [quickImportSuccessMap, setQuickImportSuccessMap] = useState<Map<string, { productId: string; isActive: boolean; slug: string; outcome: string; warning?: string }>>(new Map());

  // Trigger search with current filters or overrides
  const applySearch = (newPage: number = 1, overrides: Partial<OpportunitySearchParams> = {}) => {
    startTransition(async () => {
      try {
        const qVal = overrides.query !== undefined ? overrides.query : (query.trim() || undefined);
        const supVal = overrides.supplierId !== undefined ? overrides.supplierId : (selectedSupplier || undefined);
        const catVal = overrides.categorySlug !== undefined ? overrides.categorySlug : (selectedCategory || undefined);
        const stockVal = overrides.onlyInStock !== undefined ? overrides.onlyInStock : (onlyInStock || undefined);
        const marginVal = overrides.minMargin !== undefined ? overrides.minMargin : (minMargin || undefined);
        const sortVal = overrides.sortBy !== undefined ? overrides.sortBy : sortBy;

        const res = await searchSupplierOpportunitiesAction({
          query: qVal,
          supplierId: supVal,
          categorySlug: catVal,
          onlyInStock: stockVal,
          minMargin: marginVal,
          sortBy: sortVal,
          page: newPage,
          pageSize: 24,
        });
        if (!res.success) { setImportError(res.error); return; }
        setImportError(null);
        setData(res.data);
      } catch (err) {
        setImportError(err instanceof Error ? err.message : "No se pudieron actualizar las oportunidades.");
      }
    });
  };

  const handleQuickImport = async (opp: SupplierOpportunity) => {
    if (!opp.matchedProductId && (opp.pricingNeedsReview || !opp.categoryId || opp.matchedStatus === "review")) {
      handleOpenImport(opp);

      return;
    }
    setQuickImportingOfferId(opp.offerId);
    setImportError(null);
    try {
      const res = await importSupplierOpportunityAction({
        offerId: opp.offerId,
        categoryId: opp.categoryId,
        linkToProductId: opp.matchedProductId || undefined,
      });

      if (res.success) {
        const product = res.data;
        setImportedOfferIds((prev) => new Set(prev).add(opp.offerId));
        setQuickImportSuccessMap((prev) => {
          const next = new Map(prev);
          next.set(opp.offerId, product);
          return next;
        });
      } else {
        setImportError(res.error);
      }
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "No se pudo agregar el producto.");
    } finally {
      setQuickImportingOfferId(null);
    }
  };

  const handleOpenImport = (opp: SupplierOpportunity) => {
    setActiveOpportunity(opp);
    setEditCategoryId(opp.categoryId);
    setImportActionChoice(opp.matchedProductId ? "link" : "new");
    setImportSuccess(null);
    setImportError(null);
  };

  const handleCloseModal = () => {
    setActiveOpportunity(null);
    setImportSuccess(null);
    setImportError(null);
  };

  const handleConfirmImport = async () => {
    if (!activeOpportunity) return;
    setIsImporting(true);
    setImportError(null);

    try {
      const res = await importSupplierOpportunityAction({
        offerId: activeOpportunity.offerId,
        categoryId: editCategoryId,
        linkToProductId: importActionChoice === "link" ? (activeOpportunity.matchedProductId || undefined) : undefined,
        forceNew: importActionChoice === "new",
      });

      if (res.success) {
        setImportSuccess({
          productId: res.data.productId,
          slug: res.data.slug,
          title: res.data.title,
          isActive: res.data.isActive,
          outcome: res.data.outcome,
          warning: res.data.warning,
        });
        setImportedOfferIds((prev) => new Set(prev).add(activeOpportunity.offerId));
      } else {
        setImportError(res.error);
      }
    } catch (err: unknown) {
      setImportError(err instanceof Error ? err.message : "Error al incorporar producto.");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {importError && !activeOpportunity && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{importError}</div>}
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl border border-sky-200/80 bg-gradient-to-br from-white via-sky-50/40 to-indigo-50/30 p-6 sm:p-8 shadow-xs">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-3xl space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-sky-100/80 px-3 py-1 text-xs font-black text-sky-800">
              <Sparkles className="h-3.5 w-3.5 text-sky-600 animate-pulse" />
              Radar de Abastecimiento & Oportunidades Mayoristas
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-zinc-950">
              Descubrí y sumá oportunidades para revisar
            </h1>
            <p className="text-sm text-zinc-600 leading-relaxed">
              El radar estima costos con las cotizaciones y tarifas configuradas. Revisá su vigencia y el precio de mercado antes de publicar. El precio sugerido es una estimación basada en márgenes, no un comparable de mercado.
            </p>
          </div>

          <div className="grid w-full min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 md:w-auto md:grid-cols-1 lg:grid-cols-3">
            <Link
              href="/admin/precios"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-amber-300 bg-amber-50 hover:bg-amber-100 px-4 text-xs font-bold text-amber-900 shadow-2xs transition-all"
            >
              <Zap className="h-4 w-4 text-amber-600 fill-amber-600" />
              Precios vs Mercado Libre
            </Link>
            <Link
              href="/admin"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 text-xs font-bold text-zinc-700 shadow-2xs hover:bg-zinc-50 transition-all"
            >
              <ChevronLeft className="h-4 w-4" />
              Volver al Panel
            </Link>
            <button
              type="button"
              onClick={() => applySearch(1)}
              disabled={isPending}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-sky-600 hover:bg-sky-700 active:scale-[0.99] px-5 text-xs font-extrabold text-white shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
              Actualizar Radar
            </button>
          </div>
        </div>

        {/* 4 Metric Cards */}
        <div className="mt-6 grid grid-cols-1 min-[380px]:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="rounded-2xl border border-sky-100 bg-white/90 backdrop-blur-xs p-4 shadow-2xs">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                Oportunidades
              </span>
              <Sparkles className="h-4 w-4 text-sky-500" />
            </div>
            <div className="mt-2 text-2xl font-black text-zinc-900 tracking-tight">
              {data.stats.totalOpportunities.toLocaleString("es-AR")}
            </div>
            <div className="text-[11px] text-zinc-500 mt-0.5">
              Productos sin publicar detectados
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-white/90 backdrop-blur-xs p-4 shadow-2xs">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                Disponibilidad proveedor
              </span>
              <PackageCheck className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="mt-2 text-2xl font-black text-emerald-700 tracking-tight">
              {data.stats.inStockCount.toLocaleString("es-AR")}
            </div>
            <div className="text-[11px] text-zinc-500 mt-0.5">
              Confirmados en stock mayorista
            </div>
          </div>

          <div className="rounded-2xl border border-indigo-100 bg-white/90 backdrop-blur-xs p-4 shadow-2xs">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">
                Margen Promedio
              </span>
              <TrendingUp className="h-4 w-4 text-indigo-500" />
            </div>
            <div className="mt-2 text-2xl font-black text-indigo-700 tracking-tight">
              {data.stats.avgMarginPercent}%
            </div>
            <div className="text-[11px] text-zinc-500 mt-0.5">
              Sobre precio de venta final
            </div>
          </div>

          <div className="rounded-2xl border border-purple-100 bg-white/90 backdrop-blur-xs p-4 shadow-2xs">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700">
                Diferencia estimada
              </span>
              <DollarSign className="h-4 w-4 text-purple-500" />
            </div>
            <div className="mt-2 text-2xl font-black text-purple-700 tracking-tight">
              +${data.stats.avgProfitArs.toLocaleString("es-AR")}
            </div>
            <div className="text-[11px] text-zinc-500 mt-0.5">
              Por cada unidad vendida (promedio)
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xs space-y-3">
        {/* Quick Filter Presets */}
        <div className="flex flex-wrap items-center gap-1.5 pb-1">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mr-1">
            Filtros rápidos:
          </span>
          {[
            {
              label: "Todas",
              active: !selectedCategory && !selectedSupplier && !onlyInStock && minMargin === undefined,
              onClick: () => {
                setSelectedCategory("");
                setSelectedSupplier("");
                setOnlyInStock(false);
                setMinMargin(undefined);
                setSortBy("profit_desc");
                applySearch(1, { categorySlug: undefined, supplierId: undefined, onlyInStock: undefined, minMargin: undefined, sortBy: "profit_desc" });
              },
            },
            {
              label: "🔥 Mayor diferencia",
              active: sortBy === "profit_desc" && minMargin === 30,
              onClick: () => {
                setSortBy("profit_desc");
                setMinMargin(30);
                applySearch(1, { sortBy: "profit_desc", minMargin: 30 });
              },
            },
            {
              label: "📦 En Stock Mayorista",
              active: onlyInStock,
              onClick: () => {
                const next = !onlyInStock;
                setOnlyInStock(next);
                applySearch(1, { onlyInStock: next });
              },
            },
            {
              label: "🇰🇷 K-Beauty",
              active: selectedCategory === "cosmetica-coreana",
              onClick: () => {
                const next = selectedCategory === "cosmetica-coreana" ? "" : "cosmetica-coreana";
                setSelectedCategory(next);
                applySearch(1, { categorySlug: next || undefined });
              },
            },
            {
              label: "🌸 Perfumes Árabes",
              active: selectedCategory === "perfumeria",
              onClick: () => {
                const next = selectedCategory === "perfumeria" ? "" : "perfumeria";
                setSelectedCategory(next);
                applySearch(1, { categorySlug: next || undefined });
              },
            },
            {
              label: "🛠️ Herramientas",
              active: selectedCategory === "herramientas-equipamiento",
              onClick: () => {
                const next = selectedCategory === "herramientas-equipamiento" ? "" : "herramientas-equipamiento";
                setSelectedCategory(next);
                applySearch(1, { categorySlug: next || undefined });
              },
            },
            {
              label: "📱 Electrónica",
              active: selectedCategory === "electronica",
              onClick: () => {
                const next = selectedCategory === "electronica" ? "" : "electronica";
                setSelectedCategory(next);
                applySearch(1, { categorySlug: next || undefined });
              },
            },
            {
              label: "💎 Margen >40%",
              active: minMargin === 40,
              onClick: () => {
                const next = minMargin === 40 ? undefined : 40;
                setMinMargin(next);
                applySearch(1, { minMargin: next });
              },
            },
          ].map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={preset.onClick}
              disabled={isPending}
              className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                preset.active
                  ? "border-sky-600 bg-sky-50 text-sky-800 shadow-2xs ring-1 ring-sky-600"
                  : "border-zinc-200 bg-zinc-50/70 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") applySearch(1);
              }}
              placeholder="Buscá por nombre, marca o modelo (ej. Chloe, Medicube, iPhone, Wadfow)..."
              className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 pl-10 pr-8 text-xs font-medium text-zinc-900 placeholder:text-zinc-400 focus:border-sky-500 focus:bg-white focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  applySearch(1, { query: undefined });
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 text-sm cursor-pointer"
                title="Limpiar búsqueda"
              >
                ×
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => applySearch(1)}
            disabled={isPending}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-zinc-900 hover:bg-black px-5 text-xs font-bold text-white shadow-2xs transition-all cursor-pointer disabled:opacity-50"
          >
            <Search className="h-3.5 w-3.5" />
            Buscar
          </button>
        </div>

        {/* Filter Dropdowns */}
        <div className="grid min-w-0 grid-cols-1 min-[380px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 pt-1">
          {/* Supplier */}
          <div>
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
              Proveedor
            </label>
            <select
              value={selectedSupplier}
              onChange={(e) => {
                setSelectedSupplier(e.target.value);
              }}
              className="h-9 w-full rounded-lg border border-zinc-200 bg-white px-2.5 text-xs font-semibold text-zinc-700 outline-none cursor-pointer focus:border-sky-500"
            >
              <option value="">Todos los Proveedores</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div>
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
              Categoría
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
              }}
              className="h-9 w-full rounded-lg border border-zinc-200 bg-white px-2.5 text-xs font-semibold text-zinc-700 outline-none cursor-pointer focus:border-sky-500"
            >
              <option value="">Todas las Categorías</option>
              <option value="perfumeria">Perfumería & Fragancias</option>
              <option value="cosmetica-coreana">Cosmética Coreana (K-Beauty)</option>
              <option value="cuidado-capilar">Cuidado Capilar</option>
              <option value="herramientas-equipamiento">Herramientas & Equipamiento</option>
              <option value="electronica">Electrónica & Smartphones</option>
            </select>
          </div>

          {/* Min Margin */}
          <div>
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
              Margen Mínimo
            </label>
            <select
              value={minMargin ?? ""}
              onChange={(e) => {
                setMinMargin(e.target.value ? Number(e.target.value) : undefined);
              }}
              className="h-9 w-full rounded-lg border border-zinc-200 bg-white px-2.5 text-xs font-semibold text-zinc-700 outline-none cursor-pointer focus:border-sky-500"
            >
              <option value="">Cualquier Margen</option>
              <option value="20">&gt; 20% Margen</option>
              <option value="30">&gt; 30% Margen</option>
              <option value="40">&gt; 40% Margen</option>
              <option value="50">&gt; 50% Margen</option>
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
                setSortBy(e.target.value as OpportunitySearchParams["sortBy"]);
              }}
              className="h-9 w-full rounded-lg border border-zinc-200 bg-white px-2.5 text-xs font-semibold text-zinc-700 outline-none cursor-pointer focus:border-sky-500"
            >
              <option value="profit_desc">Mayor diferencia ($ ARS)</option>
              <option value="margin_desc">Mayor Margen (%)</option>
              <option value="cost_asc">Menor Costo Mayorista (USD)</option>
              <option value="cost_desc">Mayor Costo Mayorista (USD)</option>
              <option value="title_asc">Nombre (A - Z)</option>
            </select>
          </div>

          {/* Stock Toggle & Apply */}
          <div className="flex flex-col justify-end">
            <button
              type="button"
              onClick={() => {
                const nextStock = !onlyInStock;
                setOnlyInStock(nextStock);
              }}
              className={`h-9 w-full inline-flex items-center justify-center gap-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                onlyInStock
                  ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                  : "bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50"
              }`}
            >
              <PackageCheck className="h-3.5 w-3.5" />
              <span>{onlyInStock ? "Solo en Stock ✓" : "Filtro: Todos"}</span>
            </button>
          </div>
        </div>

        {/* Filter Apply Action */}
        <div className="flex items-center justify-between pt-2 border-t border-zinc-100 text-xs text-zinc-500">
          <span>
            Mostrando <strong>{data.items.length}</strong> de <strong>{data.total}</strong> oportunidades encontradas
          </span>
          <button
            type="button"
            onClick={() => applySearch(1)}
            disabled={isPending}
            className="inline-flex items-center gap-1 font-bold text-sky-600 hover:text-sky-700 cursor-pointer"
          >
            <SlidersHorizontal className="h-3 w-3" />
            Aplicar Filtros
          </button>
        </div>
      </div>

      {/* Opportunities Grid */}
      {data.items.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-zinc-300 bg-white p-12 text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400">
            <Search className="h-6 w-6" />
          </div>
          <h3 className="text-base font-extrabold text-zinc-900">
            No se encontraron oportunidades con estos filtros
          </h3>
          <p className="text-xs text-zinc-500 max-w-md mx-auto">
            Probá quitando el filtro de stock confirmado o buscando otros términos como marcas o categorías.
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setSelectedSupplier("");
              setSelectedCategory("");
              setOnlyInStock(false);
              setMinMargin(undefined);
              applySearch(1, { query: "", supplierId: "", categorySlug: "", onlyInStock: false, minMargin: 0 });
            }}
            className="inline-flex h-9 items-center justify-center rounded-xl bg-zinc-900 px-4 text-xs font-bold text-white cursor-pointer"
          >
            Limpiar todos los filtros
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {data.items.map((opp) => {
            const quickResult = quickImportSuccessMap.get(opp.offerId);
          const isImported = importedOfferIds.has(opp.offerId);

            return (
              <div
                key={opp.offerId}
                className={`group relative flex flex-col justify-between rounded-2xl border transition-all duration-200 bg-white p-4 shadow-2xs hover:shadow-md ${
                  isImported
                    ? "border-emerald-300 bg-emerald-50/20"
                    : "border-zinc-200/90 hover:border-sky-300"
                }`}
              >
                <div>
                  {/* Card Top: Supplier Badge & Stock Status */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-extrabold text-zinc-700">
                      {opp.supplierName}
                    </span>

                    {opp.availability === "in_stock" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Disponible proveedor
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200/80 px-2 py-0.5 text-[10px] font-extrabold text-amber-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                        A confirmar
                      </span>
                    )}
                  </div>

                  {new URL(opp.sourceUrl).pathname === "/" && <p className="mb-2 text-xs text-amber-800">La fuente es el catálogo general; falta el enlace al producto.</p>}
                  {/* Title & Category */}
                  <h3 className="text-sm font-bold text-zinc-900 leading-snug line-clamp-2 title-hover group-hover:text-sky-700 transition-colors">
                    {opp.cleanTitle}
                  </h3>

                  <div className="mt-1 flex items-center gap-1 text-[11px] text-zinc-400">
                    <span className="rounded bg-sky-50 text-sky-700 px-1.5 py-0.5 font-semibold text-[10px]">
                      {opp.categoryName}
                    </span>
                    {opp.brand && (
                      <span className="text-zinc-500 font-medium">· {opp.brand}</span>
                    )}
                  </div>

                  {/* Pricing Breakdown Box */}
                  <div className="mt-3.5 rounded-xl border border-zinc-100 bg-zinc-50/70 p-3 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-500">Costo Mayorista:</span>
                      <span className="font-bold text-zinc-700">
                        US$ {opp.originCostUsd.toLocaleString("es-AR")}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-500" title="Estimación con cotizaciones y tarifa configuradas; revisá su vigencia">
                        Costo estimado:
                      </span>
                      <span className="font-bold text-zinc-900">
                        {opp.landedCostArs > 0 ? `$${opp.landedCostArs.toLocaleString("es-AR")}` : "A confirmar"}
                      </span>
                    </div>

                    <div className="border-t border-zinc-200/60 pt-2 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-zinc-800 block">
                          Precio Sugerido:
                        </span>
                        {opp.mlPrice ? (
                          opp.mlUrl ? (
                            <a
                              href={opp.mlUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] text-amber-800 font-semibold hover:underline inline-flex items-center gap-0.5"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <span>Ref. ML: ${opp.mlPrice.toLocaleString("es-AR")}</span>
                              <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          ) : (
                            <span className="text-[10px] text-amber-800 font-medium block">
                              Ref. ML: ${opp.mlPrice.toLocaleString("es-AR")}
                            </span>
                          )
                        ) : null}
                      </div>
                      <span className="text-sm font-black text-sky-700">
                        {opp.landedCostArs > 0 ? `$${opp.suggestedRetailPrice.toLocaleString("es-AR")}` : "A confirmar"}
                      </span>
                    </div>
                  </div>

                  {/* Profit & Margin Highlights */}
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
                        <TrendingUp className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider leading-none">
                          Diferencia estimada
                        </div>
                        <div className="text-xs font-extrabold text-emerald-700">
                          {opp.landedCostArs > 0 ? `+$${opp.profitArs.toLocaleString("es-AR")}` : "A confirmar"}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider leading-none">
                        Margen
                      </div>
                      <div
                        className={`text-xs font-extrabold ${
                          opp.marginHealth === "excelente"
                            ? "text-emerald-700"
                            : opp.marginHealth === "adecuado"
                            ? "text-sky-700"
                            : "text-amber-700"
                        }`}
                      >
                        {opp.landedCostArs > 0 ? `${opp.marginPercent}%` : "—"}
                      </div>
                    </div>
                  </div>
                </div>

                {opp.matchedProductId && opp.matchedProductTitle && (
                  <div className="mt-3 flex items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50/80 px-2.5 py-1.5 text-[11px] font-medium text-sky-950">
                    <Check className="h-3.5 w-3.5 shrink-0 text-sky-600" />
                    <span className="truncate">Coincide con: <strong>{opp.matchedProductTitle}</strong></span>
                  </div>
                )}

                {/* Card Actions */}
                <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center gap-1.5">
                  <a
                    href={opp.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-zinc-200 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
                    title={new URL(opp.sourceUrl).pathname === "/" ? "Abrir catálogo del proveedor: ficha exacta no disponible" : "Abrir enlace de proveedor; verificá que corresponda al producto"}
                    aria-label={new URL(opp.sourceUrl).pathname === "/" ? "Abrir catálogo del proveedor, ficha exacta no disponible" : "Abrir enlace de proveedor"}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>

                  <a
                    href={buildMercadoLibreSearchUrl(opp.cleanTitle, opp.brand || undefined, opp.model || undefined)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-300 bg-amber-50/70 text-amber-800 hover:bg-amber-100 transition-colors"
                    title="Buscar en Mercado Libre: verificá modelo y variante"
                    aria-label="Buscar en Mercado Libre"
                  >
                    <Zap className="h-3.5 w-3.5 text-amber-600 fill-amber-600" />
                  </a>

                  {isImported ? (
                    <div className="flex-1 inline-flex h-9 items-center justify-between gap-1 rounded-xl bg-emerald-100 px-2.5 text-emerald-950 text-xs font-bold">
                      <span className="flex items-center gap-1">
                        <Check className="h-3.5 w-3.5 text-emerald-700" />
                        Procesado
                      </span>
                      {quickResult && (
                        <Link
                          href={quickResult.isActive ? `/producto/${quickResult.slug}` : quickResult.outcome === "linked" ? `/admin?editProduct=${quickResult.productId}` : `/admin/oportunidades/importacion?producto=${quickResult.productId}#revisar-publicacion`}
                          className="text-[10px] underline text-emerald-800 hover:text-emerald-950"
                        >
                          {quickResult.isActive ? "Ver ficha" : "Revisar"}
                        </Link>
                      )}
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        disabled={quickImportingOfferId === opp.offerId}
                        onClick={() => handleQuickImport(opp)}
                        className="flex-1 inline-flex h-9 items-center justify-center gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-xs font-bold text-white shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                        title={opp.matchedProductId ? "Vincular a producto existente en catálogo" : "Crear borrador a partir de la oferta"}
                      >
                        {quickImportingOfferId === opp.offerId ? (
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Zap className="h-3.5 w-3.5" />
                        )}
                        <span>{quickImportingOfferId === opp.offerId ? "Sumando…" : (opp.matchedProductId ? "Vincular oferta" : "Crear borrador")}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenImport(opp)}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950 transition-colors cursor-pointer"
                        title="Revisar datos y elegir categoría del borrador"
                      >
                        <SlidersHorizontal className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>
                {quickResult?.warning && <p className="mt-2 text-xs text-amber-800" role="status">{quickResult.warning}</p>}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {data.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-zinc-200 pt-4">
          <div className="text-xs text-zinc-500">
            Página <strong>{data.page}</strong> de <strong>{data.totalPages}</strong> ({data.total} productos)
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={data.page <= 1 || isPending}
              onClick={() => applySearch(data.page - 1)}
              className="inline-flex h-9 items-center gap-1 rounded-xl border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </button>
            <button
              type="button"
              disabled={data.page >= data.totalPages || isPending}
              onClick={() => applySearch(data.page + 1)}
              className="inline-flex h-9 items-center gap-1 rounded-xl border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 cursor-pointer"
            >
              Siguiente
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Quick Import Modal */}
      {activeOpportunity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div role="dialog" aria-modal="true" aria-label="Crear borrador desde proveedor" className="relative max-h-[90dvh] overflow-y-auto w-full max-w-lg rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-zinc-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-zinc-900">
                    Incorporar producto desde proveedor
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Proveedor: <strong>{activeOpportunity.supplierName}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                aria-label="Cerrar importación"
                className="rounded-xl p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {importSuccess ? (
              <div className="space-y-4 py-4 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <div>
                  <h4 className="text-base font-extrabold text-zinc-900">
                    {importSuccess.outcome === "linked" ? "Oferta vinculada al producto existente" : "Borrador guardado"}
                  </h4>
                  <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                    {importSuccess.isActive
                      ? <> &ldquo;{importSuccess.title}&rdquo; ya estaba activo. Se conservó su publicación.</>
                      : <> &ldquo;{importSuccess.title}&rdquo; está guardado como borrador. Todavía no tiene una página pública.</>}
                  </p>
                </div>
                <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
                  <Link
                    href={`/admin?editProduct=${encodeURIComponent(importSuccess.productId)}`}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 text-xs font-bold text-white hover:bg-black"
                  >
                    <ShoppingBag className="h-4 w-4" />
                    Completar ficha
                  </Link>
                  {!importSuccess.isActive && importSuccess.outcome !== "linked" && (
                    <Link href={`/admin/oportunidades/importacion?producto=${importSuccess.productId}#revisar-publicacion`} className="inline-flex min-h-10 items-center rounded-xl border border-sky-200 px-3 text-xs font-bold text-sky-800">
                      Revisar y publicar
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 text-xs font-bold text-zinc-700 hover:bg-zinc-50"
                  >
                    Cerrar
                  </button>
                </div>
                {importSuccess.warning && <p className="text-xs text-amber-800" role="status">{importSuccess.warning}</p>}
              </div>
            ) : (
              <div className="space-y-4">
                {importError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800 flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                    <span>{importError}</span>
                  </div>
                )}

                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm">
                  <p className="font-bold text-zinc-900">Título de la fuente</p>
                  <p className="mt-1 break-words">{activeOpportunity.title}</p>
                  <a href={activeOpportunity.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sky-800 underline">Ver publicación del proveedor</a>
                </div>

                {activeOpportunity.matchedProductId && activeOpportunity.matchedProductTitle && (
                  <div className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-4 space-y-3">
                    <div className="flex items-start gap-2.5">
                      <Sparkles className="h-5 w-5 shrink-0 text-indigo-600 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-indigo-900">
                          Producto coincidente detectado en MYA
                        </p>
                        <p className="text-sm font-black text-zinc-950 mt-0.5">
                          {activeOpportunity.matchedProductTitle}
                        </p>
                        <p className="text-xs text-zinc-600 mt-1">
                          Esta oferta coincide con un producto existente. Podés vincularla para comparar costos de proveedores o crear una ficha independiente.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setImportActionChoice("link")}
                        className={`flex items-center justify-center gap-2 rounded-xl p-2.5 text-xs font-bold transition-all border cursor-pointer ${
                          importActionChoice === "link"
                            ? "border-indigo-600 bg-indigo-600 text-white shadow-xs"
                            : "border-indigo-200 bg-white text-indigo-900 hover:bg-indigo-100/50"
                        }`}
                      >
                        <Check className="h-4 w-4" />
                        Vincular (Recomendado)
                      </button>
                      <button
                        type="button"
                        onClick={() => setImportActionChoice("new")}
                        className={`flex items-center justify-center gap-2 rounded-xl p-2.5 text-xs font-bold transition-all border cursor-pointer ${
                          importActionChoice === "new"
                            ? "border-zinc-900 bg-zinc-900 text-white shadow-xs"
                            : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100"
                        }`}
                      >
                        Crear como nuevo
                      </button>
                    </div>
                  </div>
                )}

                {(!activeOpportunity.matchedProductId || importActionChoice === "new") && (
                  <label className="block text-xs font-bold text-zinc-700">
                    Categoría en MYA
                    <select value={editCategoryId} onChange={(e) => setEditCategoryId(e.target.value)} className="mt-1 h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm">
                      <option value="">Elegí una categoría</option>
                      {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </label>
                )}

                <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm leading-6 text-sky-950">
                  {importActionChoice === "link" && activeOpportunity.matchedProductId
                    ? "Se vinculará la oferta al producto existente conservando su título, fotos autorizadas y precios vigentes. El proveedor se sumará para seguimiento de stock y costos."
                    : "Se guarda el título, el enlace y los datos comprobables de la oferta. Revisá las fotos, la descripción, el costo y la disponibilidad antes de publicar."}
                </div>
                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    disabled={isImporting}
                    className="h-10 rounded-xl border border-zinc-200 bg-white px-4 text-xs font-bold text-zinc-700 hover:bg-zinc-50 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmImport}
                    disabled={isImporting || (importActionChoice === "new" && !editCategoryId)}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-sky-600 hover:bg-sky-700 px-5 text-xs font-extrabold text-white shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {isImporting ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Procesando...
                      </>
                    ) : importActionChoice === "link" && activeOpportunity.matchedProductId ? (
                      <>
                        <Check className="h-4 w-4" />
                        Vincular oferta
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Guardar borrador
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
