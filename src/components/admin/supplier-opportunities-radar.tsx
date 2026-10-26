"use client";

import { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import {
  Sparkles,
  TrendingUp,
  Search,
  Filter,
  CheckCircle2,
  ExternalLink,
  ArrowUpDown,
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
  Info,
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
import { calculateCommercialMargin } from "@/lib/supplier-commercial";
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
  const [page, setPage] = useState(1);

  // Import Modal State
  const [activeOpportunity, setActiveOpportunity] = useState<SupplierOpportunity | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCategoryId, setEditCategoryId] = useState("");
  const [editRetailPrice, setEditRetailPrice] = useState<number>(0);
  const [editWholesalePrice, setEditWholesalePrice] = useState<number>(0);
  const [editIsActive, setEditIsActive] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState<{
    productId: string;
    slug: string;
    title: string;
  } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  // Set of imported offer IDs in the current session
  const [importedOfferIds, setImportedOfferIds] = useState<Set<string>>(new Set());

  // Trigger search with current filters
  const applySearch = (newPage: number = 1) => {
    setPage(newPage);
    startTransition(async () => {
      try {
        const res = await searchSupplierOpportunitiesAction({
          query: query.trim() || undefined,
          supplierId: selectedSupplier || undefined,
          categorySlug: selectedCategory || undefined,
          onlyInStock: onlyInStock || undefined,
          minMargin: minMargin || undefined,
          sortBy,
          page: newPage,
          pageSize: 24,
        });
        setData(res);
      } catch (err) {
        console.error("Error buscando oportunidades:", err);
      }
    });
  };

  const handleOpenImport = (opp: SupplierOpportunity) => {
    setActiveOpportunity(opp);
    setEditTitle(opp.cleanTitle);
    setEditCategoryId(opp.categoryId);
    setEditRetailPrice(opp.suggestedRetailPrice);

    // Calcular sugerido mayorista según elegibilidad
    const isExcluded =
      /iphone|macbook|ipad|galaxy|smartphone|notebook|computadora/i.test(opp.cleanTitle) ||
      opp.categorySlug.includes("smartphone") ||
      opp.categorySlug.includes("notebook");

    if (!isExcluded) {
      const discount = opp.categorySlug.includes("herramienta") ? 0.20 : 0.28;
      const suggestedWholesale = Math.round((opp.suggestedRetailPrice * (1 - discount)) / 100) * 100;
      setEditWholesalePrice(suggestedWholesale);
    } else {
      setEditWholesalePrice(0);
    }

    setEditIsActive(true);
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
        title: editTitle.trim(),
        categoryId: editCategoryId,
        retailPrice: Number(editRetailPrice),
        wholesalePrice: Number(editWholesalePrice),
        isActive: editIsActive,
      });

      if (res.success) {
        setImportSuccess({
          productId: res.productId,
          slug: res.slug,
          title: res.title,
        });
        setImportedOfferIds((prev) => new Set(prev).add(activeOpportunity.offerId));
      }
    } catch (err: unknown) {
      setImportError(err instanceof Error ? err.message : "Error al importar oportunidad.");
    } finally {
      setIsImporting(false);
    }
  };

  // Live margin calculation inside modal as retail price changes
  const modalLiveMargin = useMemo(() => {
    if (!activeOpportunity || !editRetailPrice) return null;
    return calculateCommercialMargin(Number(editRetailPrice), activeOpportunity.landedCostArs);
  }, [activeOpportunity, editRetailPrice]);

  return (
    <div className="space-y-6 pb-12">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl border border-sky-200/80 bg-gradient-to-br from-white via-sky-50/40 to-indigo-50/30 p-6 sm:p-8 shadow-xs">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-3xl space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-sky-100/80 px-3 py-1 text-xs font-black text-sky-800">
              <Sparkles className="h-3.5 w-3.5 text-sky-600 animate-pulse" />
              Radar de Abastecimiento & Oportunidades Mayoristas
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-zinc-950">
              Descubrí y sumá productos con margen garantizado
            </h1>
            <p className="text-sm text-zinc-600 leading-relaxed">
              El radar evalúa más de 1.500 ofertas de los 7 mayoristas oficiales. Calcula automáticamente el
              costo real puesto en mano (<strong>Dólar x $1.600 + 20% pasero</strong>), aplica el benchmark de
              ganancia de la categoría y sugiere el precio minorista con terminación psicológica.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-3">
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
        <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
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
                Stock Inmediato
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
                Ganancia Estimada
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
              className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 pl-10 pr-4 text-xs font-medium text-zinc-900 placeholder:text-zinc-400 focus:border-sky-500 focus:bg-white focus:outline-none"
            />
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 pt-1">
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
              <option value="profit_desc">Mayor Ganancia ($ ARS)</option>
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
              applySearch(1);
            }}
            className="inline-flex h-9 items-center justify-center rounded-xl bg-zinc-900 px-4 text-xs font-bold text-white cursor-pointer"
          >
            Limpiar todos los filtros
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {data.items.map((opp) => {
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
                        En Stock
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200/80 px-2 py-0.5 text-[10px] font-extrabold text-amber-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                        A confirmar
                      </span>
                    )}
                  </div>

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
                      <span className="text-zinc-500" title="Dólar x $1.600 + 20% pasero">
                        Costo Puesto en Mano:
                      </span>
                      <span className="font-bold text-zinc-900">
                        ${opp.landedCostArs.toLocaleString("es-AR")}
                      </span>
                    </div>

                    <div className="border-t border-zinc-200/60 pt-2 flex items-center justify-between">
                      <span className="text-xs font-bold text-zinc-800">
                        Precio Sugerido:
                      </span>
                      <span className="text-sm font-black text-sky-700">
                        ${opp.suggestedRetailPrice.toLocaleString("es-AR")}
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
                          Ganancia Neta
                        </div>
                        <div className="text-xs font-extrabold text-emerald-700">
                          +${opp.profitArs.toLocaleString("es-AR")}
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
                        {opp.marginPercent}%
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center gap-2">
                  <a
                    href={opp.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-zinc-200 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
                    title="Ver publicación oficial en el mayorista"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>

                  {isImported ? (
                    <div className="flex-1 inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-emerald-100 text-emerald-900 text-xs font-bold">
                      <Check className="h-3.5 w-3.5 text-emerald-700" />
                      ¡Sumado a la Tienda!
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleOpenImport(opp)}
                      className="flex-1 inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 active:scale-[0.99] text-xs font-bold text-white shadow-2xs transition-all cursor-pointer"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Agregar a la Tienda</span>
                    </button>
                  )}
                </div>
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
          <div className="relative w-full max-w-lg rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-zinc-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-zinc-900">
                    Agregar Producto al Catálogo
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Proveedor: <strong>{activeOpportunity.supplierName}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
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
                    ¡Producto agregado exitosamente!
                  </h4>
                  <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                    &ldquo;{importSuccess.title}&rdquo; ya está disponible en la tienda con abastecimiento vinculado.
                  </p>
                </div>
                <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
                  <Link
                    href={`/producto/${importSuccess.slug}`}
                    target="_blank"
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 text-xs font-bold text-white hover:bg-black"
                  >
                    <ShoppingBag className="h-4 w-4" />
                    Ver en Tienda
                  </Link>
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 text-xs font-bold text-zinc-700 hover:bg-zinc-50"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {importError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800 flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                    <span>{importError}</span>
                  </div>
                )}

                {/* Title */}
                <div>
                  <label className="text-xs font-extrabold text-zinc-700 block mb-1">
                    Título Comercial
                  </label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3 text-xs font-medium text-zinc-900 focus:border-sky-500 focus:bg-white focus:outline-none"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="text-xs font-extrabold text-zinc-700 block mb-1">
                    Categoría en MYA
                  </label>
                  <select
                    value={editCategoryId}
                    onChange={(e) => setEditCategoryId(e.target.value)}
                    className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-800 focus:border-sky-500 focus:outline-none cursor-pointer"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Cost Breakdown */}
                <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-3 text-xs space-y-1.5">
                  <div className="flex justify-between text-zinc-500">
                    <span>Costo Mayorista Origen:</span>
                    <span className="font-bold text-zinc-800">
                      US$ {activeOpportunity.originCostUsd}
                    </span>
                  </div>
                  <div className="flex justify-between text-zinc-500">
                    <span>Costo Puesto en Mano (USD x 1.600 + 20% pasero):</span>
                    <span className="font-extrabold text-zinc-900">
                      ${activeOpportunity.landedCostArs.toLocaleString("es-AR")}
                    </span>
                  </div>
                </div>

                {/* Mercado Libre Benchmark Verification Link */}
                <div className="rounded-xl border border-amber-200/80 bg-amber-50/70 p-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-extrabold text-amber-950 block">
                      ¿A cuánto se vende en el mercado?
                    </span>
                    <span className="text-[11px] text-amber-800">
                      Compará precios con Mercado Libre Argentina
                    </span>
                  </div>
                  <a
                    href={buildMercadoLibreSearchUrl(editTitle, activeOpportunity.brand || undefined, activeOpportunity.model || undefined)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg bg-amber-600 hover:bg-amber-700 px-2.5 py-1 text-xs font-bold text-white shadow-2xs"
                  >
                    <span>Ver en ML</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>

                {/* Retail Price and Live Margin */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-extrabold text-zinc-700 block mb-1">
                      Precio de Venta (ARS)
                    </label>
                    <input
                      type="number"
                      value={editRetailPrice}
                      onChange={(e) => setEditRetailPrice(Number(e.target.value))}
                      className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-xs font-bold text-sky-700 focus:border-sky-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-extrabold text-zinc-700 block mb-1">
                      Precio Mayorista (ARS)
                    </label>
                    <input
                      type="number"
                      value={editWholesalePrice}
                      onChange={(e) => setEditWholesalePrice(Number(e.target.value))}
                      className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-xs font-bold text-indigo-700 focus:border-sky-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Live Margin Calculation */}
                {modalLiveMargin && (
                  <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/60 p-3 text-xs flex items-center justify-between">
                    <div>
                      <span className="text-emerald-900 font-bold block">
                        Margen Comercial: {modalLiveMargin.marginPercent}%
                      </span>
                      <span className="text-[11px] text-emerald-700">
                        Ganancia por unidad: +${modalLiveMargin.profitArs.toLocaleString("es-AR")}
                      </span>
                    </div>
                    <span className="rounded-full bg-emerald-200/80 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-900">
                      Markup {modalLiveMargin.markupPercent}%
                    </span>
                  </div>
                )}

                {/* Active Toggle */}
                <div className="flex items-center justify-between rounded-xl border border-zinc-200 p-3">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-zinc-900 block">
                      Publicar inmediatamente en tienda
                    </span>
                    <span className="text-[11px] text-zinc-500 block">
                      Visible en el catálogo público para comprar
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={editIsActive}
                    onChange={(e) => setEditIsActive(e.target.checked)}
                    className="h-4 w-4 rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
                  />
                </div>

                {/* Modal Buttons */}
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
                    disabled={isImporting || !editRetailPrice || editRetailPrice <= 0}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-sky-600 hover:bg-sky-700 px-5 text-xs font-extrabold text-white shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {isImporting ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Confirmar y Sumar a la Tienda
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
