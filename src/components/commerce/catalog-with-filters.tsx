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
} from "lucide-react";
import type { Product, ProductChannel } from "@/lib/types";
import { ProductCard } from "@/components/commerce/product-card";

type BrandFilter = "all" | "total" | "wadfow" | "k-beauty" | "apple";

const brandOptions: Array<{ id: BrandFilter; label: string; icon?: string }> = [
  { id: "all", label: "Todas las marcas" },
  { id: "total", label: "Total Tools" },
  { id: "wadfow", label: "Wadfow Industrial" },
  { id: "k-beauty", label: "K-Beauty Coreana" },
  { id: "apple", label: "Apple" },
];

export function CatalogWithFilters({
  products,
  channel = "retail",
}: {
  products: Product[];
  channel?: ProductChannel;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBrand, setSelectedBrand] = useState<BrandFilter>("all");
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [sortBy, setSortBy] = useState<"featured" | "price-asc" | "price-desc">("featured");
  const [visibleCount, setVisibleCount] = useState(24);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Reset pagination when filter criteria change
  useEffect(() => {
    setVisibleCount(24);
  }, [searchQuery, selectedBrand, minPrice, maxPrice, onlyInStock, sortBy]);

  // Compute pricing boundaries
  const prices = products.map((p) => (channel === "wholesale" ? p.wholesalePrice : p.retailPrice));
  const absoluteMaxPrice = prices.length > 0 ? Math.max(...prices) : 100000;

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
          p.description?.toLowerCase().includes(q),
      );
    }

    // Brand filter
    if (selectedBrand !== "all") {
      if (selectedBrand === "total") {
        result = result.filter(
          (p) => p.title.toLowerCase().includes("total") || p.description?.toLowerCase().includes("total")
        );
      } else if (selectedBrand === "wadfow") {
        result = result.filter(
          (p) => p.title.toLowerCase().includes("wadfow") || p.description?.toLowerCase().includes("wadfow")
        );
      } else if (selectedBrand === "k-beauty") {
        result = result.filter(
          (p) =>
            p.categoryName?.toLowerCase().includes("corean") ||
            p.categoryName?.toLowerCase().includes("beauty") ||
            ["medicube", "skin1004", "dr. althea", "dr althea", "celimax", "karseell"].some((b) =>
              p.title.toLowerCase().includes(b)
            )
        );
      } else if (selectedBrand === "apple") {
        result = result.filter(
          (p) => p.title.toLowerCase().includes("iphone") || p.title.toLowerCase().includes("apple")
        );
      }
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
    } else if (sortBy === "featured") {
      result.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    }

    return result;
  }, [products, searchQuery, selectedBrand, minPrice, maxPrice, onlyInStock, sortBy, channel]);

  const displayedProducts = useMemo(() => {
    return filteredProducts.slice(0, visibleCount);
  }, [filteredProducts, visibleCount]);

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedBrand("all");
    setMinPrice("");
    setMaxPrice("");
    setOnlyInStock(false);
    setSortBy("featured");
    setVisibleCount(24);
  };

  const isDark = channel === "wholesale";

  const filtersForm = (
    <div className="space-y-6">
      {/* Reset Button */}
      <div className="flex items-center justify-between border-b pb-4 border-zinc-200">
        <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500">Filtros</h3>
        <button
          onClick={resetFilters}
          className="text-xs font-semibold text-sky-600 hover:text-sky-700 cursor-pointer"
        >
          Limpiar todos
        </button>
      </div>

      {/* Search Input */}
      <div>
        <h4 className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-2">
          <Search className="h-4 w-4 text-zinc-400" />
          Buscar en catálogo
        </h4>
        <input
          type="text"
          placeholder="Ej: Amoladora, Taladro, SKU..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-10 w-full rounded-xl border border-zinc-300 px-3 text-xs bg-white outline-none focus:border-sky-500 text-zinc-950 placeholder:text-zinc-400"
        />
      </div>

      {/* Brand Selection */}
      <div>
        <h4 className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-2.5">
          <Tag className="h-4 w-4 text-zinc-400" />
          Filtrar por marca
        </h4>
        <div className="flex flex-col gap-1.5">
          {brandOptions.map((brand) => (
            <button
              key={brand.id}
              onClick={() => setSelectedBrand(brand.id)}
              className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition cursor-pointer text-left ${
                selectedBrand === brand.id
                  ? "bg-sky-500 text-white font-bold shadow-xs"
                  : "text-zinc-700 hover:bg-zinc-100"
              }`}
            >
              <span>{brand.label}</span>
              {selectedBrand === brand.id && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
            </button>
          ))}
        </div>
      </div>

      {/* Price Range Filter */}
      <div>
        <h4 className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-3">
          <CircleDollarSign className="h-4 w-4 text-zinc-400" />
          Rango de precio
        </h4>
        <div className="grid grid-cols-2 gap-2">
          <label className="grid gap-1.5 text-xs text-zinc-500">
            Min
            <input
              type="number"
              placeholder="$0"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              className="h-9 w-full rounded-lg border border-zinc-300 px-2.5 text-xs bg-white outline-none focus:border-sky-500 text-zinc-950"
            />
          </label>
          <label className="grid gap-1.5 text-xs text-zinc-500">
            Max
            <input
              type="number"
              placeholder={`$${absoluteMaxPrice}`}
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="h-9 w-full rounded-lg border border-zinc-300 px-2.5 text-xs bg-white outline-none focus:border-sky-500 text-zinc-950"
            />
          </label>
        </div>

        {/* Quick price presets */}
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => { setMinPrice(""); setMaxPrice("25000"); }}
            className="rounded-md bg-zinc-100 px-2 py-1 text-[10px] font-medium text-zinc-700 hover:bg-zinc-200 transition cursor-pointer"
          >
            Hasta $25k
          </button>
          <button
            type="button"
            onClick={() => { setMinPrice("25000"); setMaxPrice("100000"); }}
            className="rounded-md bg-zinc-100 px-2 py-1 text-[10px] font-medium text-zinc-700 hover:bg-zinc-200 transition cursor-pointer"
          >
            $25k - $100k
          </button>
          <button
            type="button"
            onClick={() => { setMinPrice("100000"); setMaxPrice(""); }}
            className="rounded-md bg-zinc-100 px-2 py-1 text-[10px] font-medium text-zinc-700 hover:bg-zinc-200 transition cursor-pointer"
          >
            +$100k
          </button>
        </div>
      </div>

      {/* Stock availability */}
      <div>
        <h4 className="text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-3">Disponibilidad</h4>
        <button
          onClick={() => setOnlyInStock(!onlyInStock)}
          className="flex items-center gap-2 text-sm text-zinc-700 hover:text-zinc-950 cursor-pointer"
        >
          {onlyInStock ? (
            <CheckSquare className="h-4.5 w-4.5 text-sky-600 fill-sky-50" />
          ) : (
            <Square className="h-4.5 w-4.5 text-zinc-400" />
          )}
          Solo productos con stock
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
              className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-9 pr-8 text-xs sm:text-sm text-zinc-950 outline-none focus:border-sky-500 focus:bg-white transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Sort & Mobile Filter Button */}
          <div className="flex items-center gap-2">
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
              </select>
            </div>

            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden inline-flex items-center gap-1.5 h-10 rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-xs font-bold text-zinc-800 hover:bg-zinc-100 transition cursor-pointer"
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-zinc-600" />
              Filtros
            </button>

            <span className="hidden sm:inline-block text-xs font-bold text-zinc-500 pl-2">
              {filteredProducts.length} items
            </span>
          </div>
        </div>

        {/* Quick Brand Pills (Horizontal Scroll) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {brandOptions.map((brand) => (
            <button
              key={brand.id}
              onClick={() => setSelectedBrand(brand.id)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition cursor-pointer ${
                selectedBrand === brand.id
                  ? "bg-zinc-950 text-white shadow-xs"
                  : "bg-white text-zinc-700 border border-zinc-200 hover:bg-zinc-100"
              }`}
            >
              {brand.label}
            </button>
          ))}
          {(selectedBrand !== "all" || searchQuery || minPrice || maxPrice || onlyInStock) && (
            <button
              onClick={resetFilters}
              className="shrink-0 text-xs font-bold text-red-600 hover:text-red-700 px-2 py-1 cursor-pointer"
            >
              Limpiar filtros ×
            </button>
          )}
        </div>
      </div>

      {/* Main Grid with Sidebar */}
      <div className="grid gap-6 md:grid-cols-[240px_1fr]">
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
              {filteredProducts.length !== products.length && ` (filtrado de ${products.length} totales)`}
            </span>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              10% OFF pagando con Transferencia
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
                className="mt-4 inline-flex h-9 items-center justify-center rounded-xl bg-zinc-950 px-4 text-xs font-bold text-white hover:bg-zinc-800 transition cursor-pointer"
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
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-base font-bold text-zinc-950">Filtros del Catálogo</h2>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-1.5 rounded-lg text-zinc-600 hover:bg-zinc-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto pr-1">{filtersForm}</div>
            <div className="mt-6 border-t pt-4">
              <button
                onClick={() => setMobileOpen(false)}
                className="w-full inline-flex h-11 items-center justify-center rounded-xl bg-zinc-950 text-sm font-bold text-white hover:bg-zinc-800 transition cursor-pointer"
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
