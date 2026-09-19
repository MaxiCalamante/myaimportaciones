"use client";

import { useState, useMemo } from "react";
import { SlidersHorizontal, ArrowUpDown, CircleDollarSign, CheckSquare, Square, X } from "lucide-react";
import type { Product, ProductChannel } from "@/lib/types";
import { ProductCard } from "@/components/commerce/product-card";
import { formatCurrency } from "@/lib/format";

export function CatalogWithFilters({
  products,
  channel = "retail",
}: {
  products: Product[];
  channel?: ProductChannel;
}) {
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [sortBy, setSortBy] = useState<"featured" | "price-asc" | "price-desc">("featured");
  const [mobileOpen, setMobileOpen] = useState(false);

  // Compute pricing boundaries
  const prices = products.map((p) => (channel === "wholesale" ? p.wholesalePrice : p.retailPrice));
  const absoluteMaxPrice = prices.length > 0 ? Math.max(...prices) : 100000;

  // Filter & Sort products on client side
  const filteredProducts = useMemo(() => {
    let result = [...products];

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
  }, [products, minPrice, maxPrice, onlyInStock, sortBy, channel]);

  const resetFilters = () => {
    setMinPrice("");
    setMaxPrice("");
    setOnlyInStock(false);
    setSortBy("featured");
  };

  const isDark = channel === "wholesale";

  const filtersForm = (
    <div className="space-y-6">
      {/* Reset Button */}
      <div className="flex items-center justify-between border-b pb-4 border-zinc-200">
        <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500">Filtros</h3>
        <button
          onClick={resetFilters}
          className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 cursor-pointer"
        >
          Limpiar todos
        </button>
      </div>

      {/* Price Range Filter */}
      <div>
        <h4 className="flex items-center gap-1.5 text-xs font-semibold text-zinc-750 uppercase tracking-wider mb-3">
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
              className="h-9 w-full rounded-lg border border-zinc-300 px-2.5 text-xs bg-white outline-none focus:border-emerald-600 text-zinc-950"
            />
          </label>
          <label className="grid gap-1.5 text-xs text-zinc-500">
            Max
            <input
              type="number"
              placeholder={`$${absoluteMaxPrice}`}
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="h-9 w-full rounded-lg border border-zinc-300 px-2.5 text-xs bg-white outline-none focus:border-emerald-600 text-zinc-950"
            />
          </label>
        </div>
      </div>

      {/* Stock availability */}
      <div>
        <h4 className="text-xs font-semibold text-zinc-750 uppercase tracking-wider mb-3">Disponibilidad</h4>
        <button
          onClick={() => setOnlyInStock(!onlyInStock)}
          className="flex items-center gap-2 text-sm text-zinc-700 hover:text-zinc-950 cursor-pointer"
        >
          {onlyInStock ? (
            <CheckSquare className="h-4.5 w-4.5 text-emerald-600 fill-emerald-50" />
          ) : (
            <Square className="h-4.5 w-4.5 text-zinc-400" />
          )}
          <span>Solo en stock</span>
        </button>
      </div>

      {/* Sorting */}
      <div>
        <h4 className="flex items-center gap-1.5 text-xs font-semibold text-zinc-750 uppercase tracking-wider mb-3">
          <ArrowUpDown className="h-4 w-4 text-zinc-400" />
          Ordenar por
        </h4>
        <select
          value={sortBy}
          onChange={(e: any) => setSortBy(e.target.value)}
          className="h-9 w-full rounded-lg border border-zinc-350 bg-white px-2.5 text-xs text-zinc-850 outline-none focus:border-emerald-600 cursor-pointer"
        >
          <option value="featured">Destacados</option>
          <option value="price-asc">Menor precio</option>
          <option value="price-desc">Mayor precio</option>
        </select>
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Mobile Filter Toggle */}
      <div className="flex items-center justify-between gap-4 md:hidden mb-6">
        <button
          onClick={() => setMobileOpen(true)}
          className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition ${
            isDark
              ? "border-zinc-800 bg-zinc-900 text-white hover:bg-zinc-800"
              : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100"
          }`}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filtros
        </button>
        <span className="text-xs font-medium text-zinc-500">
          {filteredProducts.length} productos
        </span>
      </div>

      <div className="grid gap-8 md:grid-cols-[240px_1fr]">
        {/* Desktop Sidebar Filters */}
        <aside className="hidden md:block">
          <div className="sticky top-20 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            {filtersForm}
          </div>
        </aside>

        {/* Product Grid */}
        <div>
          {/* Results count (Desktop) */}
          <div className="hidden items-center justify-between border-b border-zinc-200 pb-3 mb-6 md:flex">
            <span className="text-sm font-medium text-zinc-500">
              Mostrando {filteredProducts.length} de {products.length} productos
            </span>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-base text-zinc-500">No hay productos que coincidan con los filtros aplicados.</p>
              <button
                onClick={resetFilters}
                className="mt-4 inline-flex h-9 items-center justify-center rounded-lg bg-emerald-600 px-4 text-xs font-semibold text-white hover:bg-emerald-700 transition"
              >
                Restablecer filtros
              </button>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filteredProducts.map((product) => (
                <ProductCard channel={channel} key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Filter Slide-out Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden" role="dialog" aria-modal="true">
          <div className="fixed inset-0 bg-zinc-950/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="relative ml-auto flex h-full w-full max-w-xs flex-col bg-white p-6 shadow-2xl animate-in slide-in-from-right duration-250">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-zinc-950">Filtros</h2>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-1.5 rounded-lg text-zinc-650 hover:bg-zinc-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto pr-1">{filtersForm}</div>
            <div className="mt-6 border-t pt-4">
              <button
                onClick={() => setMobileOpen(false)}
                className="w-full inline-flex h-11 items-center justify-center rounded-lg bg-emerald-600 text-sm font-semibold text-white hover:bg-emerald-700 transition cursor-pointer"
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
