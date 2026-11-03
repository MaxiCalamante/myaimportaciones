"use client";

import { useMemo, useState, useEffect } from "react";
import {
  Search,
  SlidersHorizontal,
  X,
  ArrowUpDown,
  ChevronDown,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import type { Category, Product } from "@/lib/types";
import { isVerifiedStock } from "@/lib/commerce-policy";
import { rankProductSearch } from "@/lib/product-search";
import { ProductCard } from "@/components/commerce/product-card";
import { wholesaleDisplay } from "./public-price";
import { formatCurrency } from "@/lib/format";

export interface WholesaleFilters {
  q?: string;
  category?: string;
  brand?: string;
  availability?: string;
  min?: string;
  max?: string;
  sort?: string;
}

const QUICK_PILLS = [
  { label: "Todo el catálogo", slug: "" },
  { label: "Cosmética Coreana", slug: "cosmetica-coreana" },
  { label: "Cuidado Capilar", slug: "cuidado-capilar" },
  { label: "Perfumería", slug: "perfumeria" },
  { label: "Herramientas", slug: "herramientas-equipamiento" },
];

const SORT_OPTIONS = [
  { value: "", label: "Destacados" },
  { value: "price_asc", label: "Menor precio mayorista" },
  { value: "price_desc", label: "Mayor precio mayorista" },
  { value: "name", label: "Nombre A–Z" },
];

export function WholesaleCatalogGrid({
  products,
  categories,
  initial = {},
}: {
  products: Product[];
  categories: Category[];
  initial?: WholesaleFilters;
}) {
  const [query, setQuery] = useState(initial.q ?? "");
  const [category, setCategory] = useState(initial.category ?? "");
  const [brand, setBrand] = useState(initial.brand ?? "");
  const [availability, setAvailability] = useState(initial.availability ?? "");
  const [min, setMin] = useState(initial.min ?? "");
  const [max, setMax] = useState(initial.max ?? "");
  const [sort, setSort] = useState(initial.sort ?? "");
  const [limit, setLimit] = useState(24);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Lock background scroll when mobile filter drawer is open
  useEffect(() => {
    if (mobileDrawerOpen) {
      const original = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = original;
      };
    }
  }, [mobileDrawerOpen]);

  // Only display categories that actually contain wholesale products (excludes phones, laptops, etc.)
  const eligibleCategoryIds = useMemo(() => new Set(products.map((p) => p.categoryId)), [products]);
  const wholesaleCategories = useMemo(() => {
    const allowed = new Set(eligibleCategoryIds);
    categories.forEach((c) => {
      if (c.parentId && allowed.has(c.id)) {
        allowed.add(c.parentId);
      }
    });
    return categories.filter((c) => allowed.has(c.id));
  }, [categories, eligibleCategoryIds]);

  const brands = useMemo(
    () =>
      [...new Set(products.map((p) => p.brand).filter((b): b is string => Boolean(b)))].sort((a, b) =>
        a.localeCompare(b, "es")
      ),
    [products]
  );

  const visible = useMemo(() => {
    const ids = new Set<string>();
    const selected = categories.find((c) => c.slug === category);
    if (selected) ids.add(selected.id);
    for (let i = 0; i < categories.length; i++) {
      for (const c of categories) {
        if (c.parentId && ids.has(c.parentId)) ids.add(c.id);
      }
    }

    let rows = products.filter((p) => !category || ids.has(p.categoryId)).filter((p) => !brand || p.brand === brand);
    if (query.trim()) rows = rankProductSearch(rows, query);

    rows = rows.filter((p) => {
      const choices = p.hasVariants ? (p.variants ?? []).filter((v) => v.isActive) : [p];
      if (availability === "available" && !choices.some(isVerifiedStock)) return false;
      if (availability === "own" && !choices.some((c) => c.fulfillmentMode !== "supplier" && isVerifiedStock(c)))
        return false;
      if (availability === "supplier" && !choices.some((c) => c.fulfillmentMode === "supplier" && isVerifiedStock(c)))
        return false;
      if (availability === "review" && choices.some((c) => c.wholesaleOffer?.status === "ready")) return false;

      const price = wholesaleDisplay(p).price;
      if (min !== "" && (price === null || price < Number(min))) return false;
      if (max !== "" && (price === null || price > Number(max))) return false;
      return true;
    });

    rows.sort((a, b) => {
      const pa = wholesaleDisplay(a).price;
      const pb = wholesaleDisplay(b).price;
      if (sort === "price_asc") return (pa ?? Infinity) - (pb ?? Infinity);
      if (sort === "price_desc") return (pb ?? -Infinity) - (pa ?? -Infinity);
      if (sort === "name") return a.title.localeCompare(b.title, "es");
      return Number(b.featured) - Number(a.featured);
    });

    return rows;
  }, [products, categories, query, category, brand, availability, min, max, sort]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (category) count++;
    if (brand) count++;
    if (availability) count++;
    if (min !== "") count++;
    if (max !== "") count++;
    return count;
  }, [category, brand, availability, min, max]);

  const resetAll = () => {
    setQuery("");
    setCategory("");
    setBrand("");
    setAvailability("");
    setMin("");
    setMax("");
    setSort("");
    setLimit(24);
  };

  const selectedCategoryObj = useMemo(
    () => wholesaleCategories.find((c) => c.slug === category),
    [wholesaleCategories, category]
  );

  const field =
    "min-h-11 min-w-0 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-800 transition focus:border-sky-600 focus:outline-hidden focus:ring-2 focus:ring-sky-600/20";

  return (
    <section id="catalogo" className="scroll-mt-24 space-y-4 sm:space-y-6" aria-labelledby="wholesale-catalog-heading">
      {/* Title & Product Count */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-sky-800">Tu próximo pedido</p>
          <h2 id="wholesale-catalog-heading" className="mt-1 text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl">
            Catálogo mayorista completo
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700">
            <span className="size-2 rounded-full bg-emerald-500" />
            <strong className="font-semibold text-zinc-950">{visible.length}</strong> productos disponibles
          </span>
        </div>
      </div>

      {/* Main Filter & Search Container */}
      <div className="rounded-2xl border border-zinc-200/90 bg-zinc-50/70 p-3 shadow-2xs backdrop-blur-xs sm:p-4 space-y-3">
        {/* Search Bar */}
        <div className="relative flex items-center">
          <Search aria-hidden="true" className="absolute left-3.5 size-4 text-zinc-400 pointer-events-none" />
          <input
            aria-label="Buscar productos mayoristas por nombre, modelo o SKU"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setLimit(24);
            }}
            placeholder="Buscá por nombre, marca o modelo (ej. Serum Celimax, Llave Total)..."
            className="min-h-11 w-full rounded-xl border border-zinc-200 bg-white pl-10 pr-10 text-sm text-zinc-900 placeholder:text-zinc-400 shadow-2xs transition focus:border-sky-600 focus:outline-hidden focus:ring-2 focus:ring-sky-600/20"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Borrar búsqueda"
              className="absolute right-3 p-1 text-zinc-400 hover:text-zinc-600 cursor-pointer"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* Quick Category Navigation Pills (Horizontally scrollable on mobile) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 no-scrollbar sm:flex-wrap">
          {QUICK_PILLS.map((pill) => {
            const isSelected = category === pill.slug;
            return (
              <button
                key={pill.slug || "all"}
                type="button"
                onClick={() => {
                  setCategory(pill.slug);
                  setLimit(24);
                }}
                className={`shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                  isSelected
                    ? "bg-sky-800 text-white shadow-xs font-semibold ring-1 ring-sky-900"
                    : "border border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-100 hover:text-zinc-900"
                }`}
              >
                {pill.label}
              </button>
            );
          })}
        </div>

        {/* Mobile Filter & Sort Bar (Hidden on md+) */}
        <div className="grid grid-cols-2 gap-2 md:hidden">
          <button
            type="button"
            onClick={() => setMobileDrawerOpen(true)}
            className={`flex min-h-11 items-center justify-between rounded-xl border px-3.5 text-xs font-semibold shadow-2xs transition cursor-pointer active:scale-[0.98] ${
              activeFiltersCount > 0
                ? "border-sky-800 bg-sky-800 text-white"
                : "border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50"
            }`}
          >
            <span className="flex items-center gap-2">
              <SlidersHorizontal className={`size-3.5 ${activeFiltersCount > 0 ? "text-white" : "text-sky-800"}`} />
              Filtros
            </span>
            {activeFiltersCount > 0 && (
              <span className="flex size-5 items-center justify-center rounded-full bg-white text-[11px] font-bold text-sky-900">
                {activeFiltersCount}
              </span>
            )}
          </button>

          <div className="relative">
            <select
              aria-label="Ordenar productos mayoristas"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="min-h-11 w-full appearance-none rounded-xl border border-zinc-200 bg-white pl-8 pr-7 text-xs font-semibold text-zinc-800 shadow-2xs focus:border-sky-600 focus:outline-hidden"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ArrowUpDown className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-sky-800" />
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3 text-zinc-400" />
          </div>
        </div>

        {/* Desktop Filter Grid (Hidden on mobile) */}
        <div className="hidden md:grid md:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-1">
          <label className="space-y-1 text-xs font-medium text-zinc-600">
            Categoría
            <select
              className={field}
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setLimit(24);
              }}
            >
              <option value="">Todos los rubros</option>
              {wholesaleCategories.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.parentId ? "↳ " : ""}
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-xs font-medium text-zinc-600">
            Marca
            <select
              className={field}
              value={brand}
              onChange={(e) => {
                setBrand(e.target.value);
                setLimit(24);
              }}
            >
              <option value="">Todas las marcas</option>
              {brands.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-xs font-medium text-zinc-600">
            Disponibilidad
            <select className={field} value={availability} onChange={(e) => setAvailability(e.target.value)}>
              <option value="">Todas</option>
              <option value="available">Disponibilidad verificada</option>
              <option value="own">Stock propio verificado</option>
              <option value="supplier">Disponibilidad en catálogo</option>
              <option value="review">Precio por confirmar</option>
            </select>
          </label>

          <label className="space-y-1 text-xs font-medium text-zinc-600">
            Desde ARS
            <input
              className={field}
              aria-label="Precio mayorista mínimo"
              type="number"
              min="0"
              inputMode="numeric"
              placeholder="$ Mín"
              value={min}
              onChange={(e) => setMin(e.target.value)}
            />
          </label>

          <label className="space-y-1 text-xs font-medium text-zinc-600">
            Hasta ARS
            <input
              className={field}
              aria-label="Precio mayorista máximo"
              type="number"
              min="0"
              inputMode="numeric"
              placeholder="$ Máx"
              value={max}
              onChange={(e) => setMax(e.target.value)}
            />
          </label>

          <label className="space-y-1 text-xs font-medium text-zinc-600">
            Ordenar
            <select className={field} value={sort} onChange={(e) => setSort(e.target.value)}>
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Active Filter Badges / Chips */}
        {(query || category || brand || availability || min || max || sort) && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-zinc-200/80">
            <span className="text-[11px] font-medium text-zinc-500 mr-1">Filtros activos:</span>

            {query && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-zinc-200/70 px-2 py-1 text-xs text-zinc-800">
                Texto: &ldquo;{query}&rdquo;
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="hover:text-zinc-950 cursor-pointer p-0.5"
                  aria-label="Quitar filtro de búsqueda"
                >
                  <X className="size-3" />
                </button>
              </span>
            )}

            {category && selectedCategoryObj && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-sky-100 text-sky-900 px-2 py-1 text-xs font-medium">
                Rubro: {selectedCategoryObj.name}
                <button
                  type="button"
                  onClick={() => setCategory("")}
                  className="hover:text-sky-950 cursor-pointer p-0.5"
                  aria-label="Quitar filtro de categoría"
                >
                  <X className="size-3" />
                </button>
              </span>
            )}

            {brand && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-zinc-200/70 px-2 py-1 text-xs text-zinc-800 font-medium">
                Marca: {brand}
                <button
                  type="button"
                  onClick={() => setBrand("")}
                  className="hover:text-zinc-950 cursor-pointer p-0.5"
                  aria-label="Quitar filtro de marca"
                >
                  <X className="size-3" />
                </button>
              </span>
            )}

            {availability && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-zinc-200/70 px-2 py-1 text-xs text-zinc-800">
                Estado:{" "}
                {availability === "available"
                  ? "Disponible"
                  : availability === "own"
                  ? "Stock propio"
                  : availability === "supplier"
                  ? "En catálogo"
                  : "Por confirmar"}
                <button
                  type="button"
                  onClick={() => setAvailability("")}
                  className="hover:text-zinc-950 cursor-pointer p-0.5"
                  aria-label="Quitar filtro de disponibilidad"
                >
                  <X className="size-3" />
                </button>
              </span>
            )}

            {(min || max) && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-zinc-200/70 px-2 py-1 text-xs text-zinc-800">
                Precio: {min ? formatCurrency(Number(min)) : "$0"} - {max ? formatCurrency(Number(max)) : "sin límite"}
                <button
                  type="button"
                  onClick={() => {
                    setMin("");
                    setMax("");
                  }}
                  className="hover:text-zinc-950 cursor-pointer p-0.5"
                  aria-label="Quitar filtro de precio"
                >
                  <X className="size-3" />
                </button>
              </span>
            )}

            <button
              type="button"
              onClick={resetAll}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50 cursor-pointer transition ml-auto"
            >
              <RotateCcw className="size-3" />
              Limpiar todo
            </button>
          </div>
        )}
      </div>

      {/* Commercial Conditions Subtext */}
      <div className="flex items-center justify-between text-xs text-zinc-500">
        <p>Precios mayoristas unitarios confirmados. Podés combinar productos y rubros para alcanzar el mínimo.</p>
        <span className="hidden sm:inline-flex items-center gap-1 text-sky-800 font-medium">
          <Sparkles className="size-3" /> Descuentos por cantidad aplicables
        </span>
      </div>

      {/* Product Grid */}
      {visible.length ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
          {visible.slice(0, limit).map((p) => (
            <ProductCard key={p.id} product={p} channel="wholesale" />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 sm:p-12 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-800">
            <SlidersHorizontal className="size-6" />
          </div>
          <p className="mt-4 text-base font-bold text-zinc-900">No encontramos productos con estos filtros</p>
          <p className="mt-1.5 text-xs text-zinc-500 max-w-sm mx-auto">
            Probá modificando los términos de búsqueda o limpiá la selección para ver el catálogo mayorista completo.
          </p>
          <button
            type="button"
            onClick={resetAll}
            className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-sky-800 px-5 text-xs font-semibold text-white shadow-xs hover:bg-sky-900 transition-colors cursor-pointer"
          >
            Limpiar filtros y ver catálogo
          </button>
        </div>
      )}

      {/* Pagination: Load More */}
      {visible.length > limit && (
        <div className="pt-4 text-center">
          <button
            type="button"
            onClick={() => setLimit((n) => n + 24)}
            className="min-h-12 rounded-xl border border-zinc-300 bg-white px-6 text-sm font-semibold text-zinc-800 shadow-2xs hover:bg-zinc-50 hover:border-zinc-400 transition-all cursor-pointer"
          >
            Ver más productos ({visible.length - limit} restantes)
          </button>
        </div>
      )}

      {/* Mobile Filters Slide-over / Modal Drawer */}
      {mobileDrawerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Filtros del catálogo mayorista"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs md:hidden animate-in fade-in duration-200"
          onClick={() => setMobileDrawerOpen(false)}
        >
          <div
            className="w-full max-h-[90dvh] overflow-y-auto rounded-t-3xl sm:rounded-2xl sm:max-w-md bg-white p-5 shadow-2xl space-y-4 animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="size-4 text-sky-800" />
                <h3 className="text-base font-bold text-zinc-950">Filtros mayoristas</h3>
              </div>
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                className="rounded-full p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 cursor-pointer"
                aria-label="Cerrar filtros"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Drawer Form Fields */}
            <div className="space-y-4 py-1">
              <label className="block space-y-1.5 text-xs font-semibold text-zinc-700">
                Rubro o categoría
                <select
                  className={field}
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    setLimit(24);
                  }}
                >
                  <option value="">Todos los rubros</option>
                  {wholesaleCategories.map((c) => (
                    <option key={c.id} value={c.slug}>
                      {c.parentId ? "↳ " : ""}
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1.5 text-xs font-semibold text-zinc-700">
                Marca
                <select
                  className={field}
                  value={brand}
                  onChange={(e) => {
                    setBrand(e.target.value);
                    setLimit(24);
                  }}
                >
                  <option value="">Todas las marcas</option>
                  {brands.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1.5 text-xs font-semibold text-zinc-700">
                Disponibilidad
                <select className={field} value={availability} onChange={(e) => setAvailability(e.target.value)}>
                  <option value="">Todas</option>
                  <option value="available">Disponibilidad verificada</option>
                  <option value="own">Stock propio verificado</option>
                  <option value="supplier">Disponibilidad en catálogo</option>
                  <option value="review">Precio por confirmar</option>
                </select>
              </label>

              <div className="grid grid-cols-2 gap-2">
                <label className="space-y-1 text-xs font-semibold text-zinc-700">
                  Desde ARS
                  <input
                    className={field}
                    type="number"
                    min="0"
                    inputMode="numeric"
                    placeholder="$ 0"
                    value={min}
                    onChange={(e) => setMin(e.target.value)}
                  />
                </label>
                <label className="space-y-1 text-xs font-semibold text-zinc-700">
                  Hasta ARS
                  <input
                    className={field}
                    type="number"
                    min="0"
                    inputMode="numeric"
                    placeholder="$ Máx"
                    value={max}
                    onChange={(e) => setMax(e.target.value)}
                  />
                </label>
              </div>

              <label className="block space-y-1.5 text-xs font-semibold text-zinc-700">
                Ordenar por
                <select className={field} value={sort} onChange={(e) => setSort(e.target.value)}>
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {/* Drawer Actions */}
            <div className="flex items-center gap-2 border-t border-zinc-100 pt-3">
              <button
                type="button"
                onClick={resetAll}
                className="min-h-11 flex-1 rounded-xl border border-zinc-200 bg-white text-xs font-semibold text-zinc-700 hover:bg-zinc-50 cursor-pointer"
              >
                Limpiar
              </button>
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                className="min-h-11 flex-2 rounded-xl bg-sky-800 text-xs font-semibold text-white hover:bg-sky-900 shadow-xs cursor-pointer"
              >
                Ver {visible.length} productos
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
