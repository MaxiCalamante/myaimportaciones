"use client";

import { useState, useMemo, useEffect } from "react";
import {
  SlidersHorizontal,
  ArrowUpDown,
  CircleDollarSign,
  CheckSquare,
  Square,
  X,
  Search,
  Tag,
  Sparkles,
  Layers,
  Check,
} from "lucide-react";
import type { Product, ProductChannel } from "@/lib/types";
import { formatCurrency } from "@/lib/format";
import { ProductCard } from "@/components/commerce/product-card";

interface BrandDefinition {
  id: string;
  name: string;
  match: string[];
}

const KNOWN_BRANDS: BrandDefinition[] = [
  { id: "total", name: "Total Tools", match: ["TOTAL"] },
  { id: "wadfow", name: "Wadfow", match: ["WADFOW"] },
  { id: "medicube", name: "Medicube", match: ["MEDICUBE"] },
  { id: "skin1004", name: "Skin1004", match: ["SKIN1004", "SKIN 1004"] },
  { id: "celimax", name: "Celimax", match: ["CELIMAX"] },
  { id: "dr_althea", name: "Dr. Althea", match: ["DR. ALTHEA", "DR ALTHEA"] },
  { id: "karseell", name: "Karseell", match: ["KARSEELL"] },
];

function getProductBrand(product: Product): BrandDefinition | null {
  const titleUpper = product.title.toUpperCase();
  const tagsUpper = (product.tags || []).map((t) => t.toUpperCase());
  for (const b of KNOWN_BRANDS) {
    if (b.match.some((m) => titleUpper.includes(m) || tagsUpper.some((t) => t.includes(m)))) {
      return b;
    }
  }
  return null;
}

export function CatalogWithFilters({
  products,
  channel = "retail",
}: {
  products: Product[];
  channel?: ProductChannel;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBrand, setSelectedBrand] = useState<string>("all");
  const [selectedSubcategory, setSelectedSubcategory] = useState("");
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [sortBy, setSortBy] = useState<"featured" | "price-asc" | "price-desc" | "saving-desc" | "name-asc">("featured");
  const [visibleCount, setVisibleCount] = useState(24);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Dynamic brand extraction from current products
  const availableBrands = useMemo(() => {
    const counts: Record<string, { id: string; name: string; count: number }> = {};
    products.forEach((p) => {
      const b = getProductBrand(p);
      if (b) {
        if (!counts[b.id]) {
          counts[b.id] = { id: b.id, name: b.name, count: 0 };
        }
        counts[b.id].count++;
      }
    });
    return Object.values(counts).sort((a, b) => b.count - a.count);
  }, [products]);

  // Subcategories present in the current products
  const availableSubcategories = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach((p) => {
      if (p.categoryName) {
        counts[p.categoryName] = (counts[p.categoryName] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [products]);

  // Dynamic Price Presets & Boundaries
  const { minCatalogPrice, maxCatalogPrice, smartPresets } = useMemo(() => {
    const prices = products
      .map((p) => (channel === "wholesale" ? p.wholesalePrice : p.retailPrice))
      .filter((p) => p > 0);

    if (prices.length === 0) {
      return { minCatalogPrice: 0, maxCatalogPrice: 100000, smartPresets: [] };
    }

    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min;

    if (range < 5000) {
      return { minCatalogPrice: min, maxCatalogPrice: max, smartPresets: [] };
    }

    const step = range > 100000 ? 5000 : 1000;
    const p1 = Math.round((min + range * 0.25) / step) * step;
    const p2 = Math.round((min + range * 0.50) / step) * step;
    const p3 = Math.round((min + range * 0.75) / step) * step;

    const presets = [
      { label: `Hasta ${formatCurrency(p1)}`, min: "", max: String(p1) },
      { label: `${formatCurrency(p1)} a ${formatCurrency(p2)}`, min: String(p1), max: String(p2) },
      { label: `${formatCurrency(p2)} a ${formatCurrency(p3)}`, min: String(p2), max: String(p3) },
      { label: `Más de ${formatCurrency(p3)}`, min: String(p3), max: "" },
    ];

    return { minCatalogPrice: min, maxCatalogPrice: max, smartPresets: presets };
  }, [products, channel]);

  // Reset pagination when filter criteria change
  useEffect(() => {
    setVisibleCount(24);
  }, [searchQuery, selectedBrand, selectedSubcategory, minPrice, maxPrice, onlyInStock, sortBy]);

  // Filter & Sort products on client side
  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.slug.toLowerCase().includes(q) ||
          p.tags?.some((t) => t.toLowerCase().includes(q)) ||
          p.description?.toLowerCase().includes(q)
      );
    }

    // Dynamic brand filter
    if (selectedBrand !== "all") {
      const brandDef = KNOWN_BRANDS.find((b) => b.id === selectedBrand);
      if (brandDef) {
        result = result.filter((p) => {
          const titleUpper = p.title.toUpperCase();
          const tagsUpper = (p.tags || []).map((t) => t.toUpperCase());
          return brandDef.match.some(
            (m) => titleUpper.includes(m) || tagsUpper.some((t) => t.includes(m))
          );
        });
      }
    }

    // Subcategory filter
    if (selectedSubcategory) {
      result = result.filter((p) => p.categoryName === selectedSubcategory);
    }

    // Filter by stock
    if (onlyInStock) {
      result = result.filter((p) => p.stock > 0);
    }

    // Filter by price range
    const minVal = parseFloat(minPrice);
    if (!isNaN(minVal)) {
      result = result.filter((p) => {
        const price = channel === "wholesale" ? p.wholesalePrice : p.retailPrice;
        return price >= minVal;
      });
    }

    const maxVal = parseFloat(maxPrice);
    if (!isNaN(maxVal)) {
      result = result.filter((p) => {
        const price = channel === "wholesale" ? p.wholesalePrice : p.retailPrice;
        return price <= maxVal;
      });
    }

    // Sort products
    if (sortBy === "price-asc") {
      result.sort((a, b) => {
        const priceA = channel === "wholesale" ? a.wholesalePrice : a.retailPrice;
        const priceB = channel === "wholesale" ? b.wholesalePrice : b.retailPrice;
        return priceA - priceB;
      });
    } else if (sortBy === "price-desc") {
      result.sort((a, b) => {
        const priceA = channel === "wholesale" ? a.wholesalePrice : a.retailPrice;
        const priceB = channel === "wholesale" ? b.wholesalePrice : b.retailPrice;
        return priceB - priceA;
      });
    } else if (sortBy === "saving-desc") {
      result.sort((a, b) => {
        const savingA = (a.retailPrice * 1.08) - a.retailPrice;
        const savingB = (b.retailPrice * 1.08) - b.retailPrice;
        return savingB - savingA;
      });
    } else if (sortBy === "name-asc") {
      result.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === "featured") {
      result.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    }

    return result;
  }, [
    products,
    searchQuery,
    selectedBrand,
    selectedSubcategory,
    minPrice,
    maxPrice,
    onlyInStock,
    sortBy,
    channel,
  ]);

  const displayedProducts = useMemo(() => {
    return filteredProducts.slice(0, visibleCount);
  }, [filteredProducts, visibleCount]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedBrand !== "all") count++;
    if (selectedSubcategory) count++;
    if (minPrice || maxPrice) count++;
    if (onlyInStock) count++;
    if (searchQuery.trim()) count++;
    return count;
  }, [selectedBrand, selectedSubcategory, minPrice, maxPrice, onlyInStock, searchQuery]);

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedBrand("all");
    setSelectedSubcategory("");
    setMinPrice("");
    setMaxPrice("");
    setOnlyInStock(false);
    setSortBy("featured");
    setVisibleCount(24);
  };

  const selectedBrandObject = useMemo(() => {
    return availableBrands.find((b) => b.id === selectedBrand);
  }, [availableBrands, selectedBrand]);

  const filtersForm = (
    <div className="space-y-6">
      {/* Header & Reset Button */}
      <div className="flex items-center justify-between border-b pb-3 border-zinc-200">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-zinc-700" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-800">
            Filtros
          </h3>
          {activeFiltersCount > 0 && (
            <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white">
              {activeFiltersCount}
            </span>
          )}
        </div>
        {activeFiltersCount > 0 && (
          <button
            onClick={resetFilters}
            className="text-xs font-semibold text-red-600 hover:text-red-700 cursor-pointer transition-colors"
          >
            Limpiar todo
          </button>
        )}
      </div>

      {/* Search Input */}
      <div>
        <h4 className="flex items-center gap-1.5 text-xs font-bold text-zinc-700 uppercase tracking-wider mb-2">
          <Search className="h-3.5 w-3.5 text-zinc-400" />
          Buscar en catálogo
        </h4>
        <div className="relative">
          <input
            type="text"
            placeholder="Ej: Amoladora, Toner, SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 w-full rounded-xl border border-zinc-300 pl-3 pr-8 text-xs bg-white outline-none focus:border-sky-500 text-zinc-950 placeholder:text-zinc-400 font-medium"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 text-xs"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Dynamic Brand Selection */}
      {availableBrands.length > 0 && (
        <div>
          <h4 className="flex items-center gap-1.5 text-xs font-bold text-zinc-700 uppercase tracking-wider mb-2.5">
            <Tag className="h-3.5 w-3.5 text-zinc-400" />
            Marca ({availableBrands.length})
          </h4>
          <div className="flex flex-col gap-1 max-h-56 overflow-y-auto pr-1">
            <button
              type="button"
              onClick={() => setSelectedBrand("all")}
              className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition cursor-pointer text-left ${
                selectedBrand === "all"
                  ? "bg-zinc-900 text-white font-bold shadow-xs"
                  : "text-zinc-700 hover:bg-zinc-100"
              }`}
            >
              <span>Todas las marcas</span>
              <span className="text-[10px] opacity-70">({products.length})</span>
            </button>

            {availableBrands.map((brand) => {
              const isSelected = selectedBrand === brand.id;
              return (
                <button
                  key={brand.id}
                  type="button"
                  onClick={() => setSelectedBrand(brand.id)}
                  className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition cursor-pointer text-left ${
                    isSelected
                      ? "bg-sky-600 text-white font-bold shadow-xs"
                      : "text-zinc-700 hover:bg-zinc-100"
                  }`}
                >
                  <span className="truncate pr-1">{brand.name}</span>
                  <span
                    className={`text-[10px] font-bold rounded-full px-1.5 py-0.2 ${
                      isSelected ? "bg-sky-700 text-white" : "bg-zinc-100 text-zinc-500"
                    }`}
                  >
                    {brand.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Subcategory Filter */}
      {availableSubcategories.length > 1 && (
        <div>
          <h4 className="flex items-center gap-1.5 text-xs font-bold text-zinc-700 uppercase tracking-wider mb-2">
            <Layers className="h-3.5 w-3.5 text-zinc-400" />
            Subcategoría ({availableSubcategories.length})
          </h4>
          <select
            value={selectedSubcategory}
            onChange={(e) => setSelectedSubcategory(e.target.value)}
            className="h-10 w-full rounded-xl border border-zinc-300 px-3 text-xs bg-white outline-none focus:border-sky-500 text-zinc-950 cursor-pointer truncate font-medium"
          >
            <option value="">Todas las subcategorías ({products.length})</option>
            {availableSubcategories.map(({ name, count }) => (
              <option key={name} value={name}>
                {name} ({count})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Price Range Filter */}
      <div>
        <h4 className="flex items-center gap-1.5 text-xs font-bold text-zinc-700 uppercase tracking-wider mb-2.5">
          <CircleDollarSign className="h-3.5 w-3.5 text-zinc-400" />
          Rango de Precio
        </h4>
        <div className="grid grid-cols-2 gap-2">
          <label className="grid gap-1 text-[11px] font-semibold text-zinc-500">
            Mínimo ($)
            <input
              type="number"
              placeholder={`$${minCatalogPrice.toLocaleString("es-AR")}`}
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              className="h-9 w-full rounded-xl border border-zinc-300 px-2.5 text-xs bg-white outline-none focus:border-sky-500 text-zinc-950 font-bold"
            />
          </label>
          <label className="grid gap-1 text-[11px] font-semibold text-zinc-500">
            Máximo ($)
            <input
              type="number"
              placeholder={`$${maxCatalogPrice.toLocaleString("es-AR")}`}
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="h-9 w-full rounded-xl border border-zinc-300 px-2.5 text-xs bg-white outline-none focus:border-sky-500 text-zinc-950 font-bold"
            />
          </label>
        </div>

        {/* Dynamic price presets */}
        {smartPresets.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {smartPresets.map((preset) => {
              const isPresetActive = minPrice === preset.min && maxPrice === preset.max;
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    if (isPresetActive) {
                      setMinPrice("");
                      setMaxPrice("");
                    } else {
                      setMinPrice(preset.min);
                      setMaxPrice(preset.max);
                    }
                  }}
                  className={`rounded-lg px-2.5 py-1 text-[10px] font-bold transition cursor-pointer border ${
                    isPresetActive
                      ? "bg-sky-600 text-white border-sky-600 shadow-xs"
                      : "bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100"
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Stock availability */}
      <div className="pt-2 border-t border-zinc-100">
        <h4 className="text-xs font-bold text-zinc-700 uppercase tracking-wider mb-2.5">
          Disponibilidad
        </h4>
        <button
          type="button"
          onClick={() => setOnlyInStock(!onlyInStock)}
          className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
            onlyInStock
              ? "bg-emerald-50 text-emerald-900 border-emerald-300"
              : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50"
          }`}
        >
          <span className="flex items-center gap-2">
            {onlyInStock ? (
              <CheckSquare className="h-4 w-4 text-emerald-600 fill-emerald-100" />
            ) : (
              <Square className="h-4 w-4 text-zinc-400" />
            )}
            Solo con stock inmediato
          </span>
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="mt-8 space-y-6">
      {/* Top Bar: Controls & Quick Brand Chips */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-white p-3.5 border border-zinc-200 shadow-xs">
          {/* Quick Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, modelo o código..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-9 pr-8 text-xs sm:text-sm text-zinc-950 outline-none focus:border-sky-500 focus:bg-white transition font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 text-sm cursor-pointer"
              >
                ×
              </button>
            )}
          </div>

          {/* Sort, Subcategory & Mobile Filter Button */}
          <div className="flex flex-wrap items-center gap-2">
            {availableSubcategories.length > 1 && (
              <div className="relative flex items-center">
                <select
                  value={selectedSubcategory}
                  onChange={(e) => setSelectedSubcategory(e.target.value)}
                  className="h-10 rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-xs font-semibold text-zinc-800 outline-none focus:border-sky-500 cursor-pointer max-w-40 sm:max-w-56 truncate"
                >
                  <option value="">Todas las subcategorías</option>
                  {availableSubcategories.map(({ name, count }) => (
                    <option key={name} value={name}>
                      {name} ({count})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="relative flex items-center">
              <ArrowUpDown className="absolute left-3 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="h-10 rounded-xl border border-zinc-200 bg-zinc-50 pl-8 pr-7 text-xs font-semibold text-zinc-800 outline-none focus:border-sky-500 cursor-pointer"
              >
                <option value="featured">Destacados</option>
                <option value="price-asc">Menor precio</option>
                <option value="price-desc">Mayor precio</option>
                <option value="saving-desc">Mayor ahorro vs ML</option>
                <option value="name-asc">Nombre A - Z</option>
              </select>
            </div>

            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden inline-flex items-center gap-1.5 h-10 rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 text-xs font-bold text-zinc-800 hover:bg-zinc-100 transition cursor-pointer"
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-zinc-600" />
              Filtros
              {activeFiltersCount > 0 && (
                <span className="rounded-full bg-emerald-600 px-1.5 py-0.2 text-[9px] font-black text-white">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            <span className="hidden sm:inline-block text-xs font-bold text-zinc-500 pl-2">
              {filteredProducts.length} productos
            </span>
          </div>
        </div>

        {/* Quick Brand Pills (Horizontal Scroll) */}
        {availableBrands.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider shrink-0 mr-1">
              Marcas:
            </span>
            <button
              onClick={() => setSelectedBrand("all")}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition cursor-pointer ${
                selectedBrand === "all"
                  ? "bg-zinc-950 text-white shadow-xs"
                  : "bg-white text-zinc-700 border border-zinc-200 hover:bg-zinc-100"
              }`}
            >
              Todas ({products.length})
            </button>
            {availableBrands.map((brand) => (
              <button
                key={brand.id}
                onClick={() => setSelectedBrand(selectedBrand === brand.id ? "all" : brand.id)}
                className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition cursor-pointer ${
                  selectedBrand === brand.id
                    ? "bg-sky-600 text-white shadow-xs font-bold"
                    : "bg-white text-zinc-700 border border-zinc-200 hover:bg-zinc-100"
                }`}
              >
                <span>{brand.name}</span>
                <span
                  className={`text-[10px] font-bold rounded-full px-1.5 py-0.2 ${
                    selectedBrand === brand.id ? "bg-sky-700 text-white" : "bg-zinc-100 text-zinc-500"
                  }`}
                >
                  {brand.count}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Active Filters Row (Removable Tags) */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs font-semibold text-zinc-500">Filtros aplicados:</span>

            {selectedBrandObject && (
              <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 border border-sky-200 px-3 py-1 text-xs font-bold text-sky-800">
                Marca: {selectedBrandObject.name}
                <button
                  onClick={() => setSelectedBrand("all")}
                  className="hover:text-sky-950 cursor-pointer ml-1 text-sm font-black"
                >
                  ×
                </button>
              </span>
            )}

            {selectedSubcategory && (
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 border border-purple-200 px-3 py-1 text-xs font-bold text-purple-800">
                Subcategoría: {selectedSubcategory}
                <button
                  onClick={() => setSelectedSubcategory("")}
                  className="hover:text-purple-950 cursor-pointer ml-1 text-sm font-black"
                >
                  ×
                </button>
              </span>
            )}

            {(minPrice || maxPrice) && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-800">
                Precio: {minPrice ? `$${Number(minPrice).toLocaleString("es-AR")}` : "$0"} - {maxPrice ? `$${Number(maxPrice).toLocaleString("es-AR")}` : "Max"}
                <button
                  onClick={() => { setMinPrice(""); setMaxPrice(""); }}
                  className="hover:text-emerald-950 cursor-pointer ml-1 text-sm font-black"
                >
                  ×
                </button>
              </span>
            )}

            {onlyInStock && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-800">
                En stock
                <button
                  onClick={() => setOnlyInStock(false)}
                  className="hover:text-emerald-950 cursor-pointer ml-1 text-sm font-black"
                >
                  ×
                </button>
              </span>
            )}

            {searchQuery && (
              <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 border border-zinc-300 px-3 py-1 text-xs font-bold text-zinc-800">
                Búsqueda: &ldquo;{searchQuery}&rdquo;
                <button
                  onClick={() => setSearchQuery("")}
                  className="hover:text-zinc-950 cursor-pointer ml-1 text-sm font-black"
                >
                  ×
                </button>
              </span>
            )}

            <button
              onClick={resetFilters}
              className="text-xs font-bold text-red-600 hover:text-red-700 underline px-1 py-0.5 cursor-pointer ml-1"
            >
              Borrar todos
            </button>
          </div>
        )}
      </div>

      {/* Main Grid with Sidebar */}
      <div className="grid gap-6 md:grid-cols-[250px_1fr]">
        {/* Desktop Sidebar Filters */}
        <aside className="hidden md:block">
          <div className="sticky top-20 rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs">
            {filtersForm}
          </div>
        </aside>

        {/* Product Grid */}
        <div>
          {/* Results count indicator */}
          <div className="flex items-center justify-between border-b border-zinc-200 pb-3 mb-5">
            <span className="text-xs font-semibold text-zinc-500">
              Mostrando {displayedProducts.length} de {filteredProducts.length} productos
              {filteredProducts.length !== products.length && ` (de ${products.length} totales)`}
            </span>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              {channel === "wholesale" ? "Condiciones de compra mayorista" : "10% OFF en Transferencia / Efectivo"}
            </span>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-2xl border border-zinc-200 p-8">
              <Search className="h-10 w-10 text-zinc-300 mb-3" />
              <p className="text-base text-zinc-900 font-bold">No hay productos con los filtros aplicados</p>
              <p className="text-xs text-zinc-500 mt-1 max-w-sm">
                Probá cambiando la búsqueda o restableciendo los filtros de marca o precio.
              </p>
              <button
                onClick={resetFilters}
                className="mt-4 inline-flex h-10 items-center justify-center rounded-xl bg-zinc-950 px-5 text-xs font-bold text-white hover:bg-zinc-800 transition cursor-pointer"
              >
                Restablecer todos los filtros
              </button>
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:gap-5 grid-cols-2 lg:grid-cols-3">
                {displayedProducts.map((product) => (
                  <ProductCard channel={channel} key={product.id} product={product} />
                ))}
              </div>

              {/* Load More Button */}
              {visibleCount < filteredProducts.length && (
                <div className="mt-10 flex flex-col items-center justify-center gap-2">
                  <button
                    onClick={() => setVisibleCount((prev) => prev + 24)}
                    className="inline-flex h-12 items-center justify-center rounded-xl bg-zinc-950 px-8 text-sm font-bold text-white hover:bg-zinc-800 transition shadow-sm cursor-pointer"
                  >
                    Cargar más productos ({filteredProducts.length - visibleCount} restantes)
                  </button>
                  <p className="text-xs text-zinc-400">
                    Mostrando {visibleCount} de {filteredProducts.length} productos
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Mobile Filter Slide-out Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden" role="dialog" aria-modal="true">
          <div className="fixed inset-0 bg-zinc-950/40 backdrop-blur-xs" onClick={() => setMobileOpen(false)} />
          <div className="relative ml-auto flex h-full w-full max-w-xs flex-col bg-white p-6 shadow-2xl animate-in slide-in-from-right duration-250">
            <div className="flex items-center justify-between mb-6 border-b pb-3 border-zinc-100">
              <h2 className="text-base font-bold text-zinc-950 flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-zinc-700" /> Filtros del Catálogo
              </h2>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-1.5 rounded-lg text-zinc-600 hover:bg-zinc-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto pr-1">{filtersForm}</div>
            <div className="mt-4 border-t pt-4 flex gap-2">
              <button
                onClick={resetFilters}
                className="flex-1 inline-flex h-11 items-center justify-center rounded-xl border border-zinc-300 text-xs font-bold text-zinc-700 hover:bg-zinc-100 transition cursor-pointer"
              >
                Limpiar
              </button>
              <button
                onClick={() => setMobileOpen(false)}
                className="flex-2 inline-flex h-11 items-center justify-center rounded-xl bg-zinc-950 text-xs font-bold text-white hover:bg-zinc-800 transition cursor-pointer"
              >
                Ver {filteredProducts.length} productos
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
