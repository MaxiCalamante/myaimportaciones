"use client";

import { useState, useId, useRef, useTransition } from "react";
import { useModalFocus } from "@/components/ui/use-modal-focus";
import { useRouter } from "next/navigation";
import {
  Search,
  SlidersHorizontal,
  X,
  ArrowUpDown,
  ChevronDown,
  Check,
  RotateCcw,
} from "lucide-react";
import type { Category } from "@/lib/types";

type Props = {
  categories: Category[];
  category: Category | undefined;
  brands: { brand: string; count: number }[];
  brandsByCategory: Record<string, { brand: string; count: number }[]>;
  query: string;
  brand: string;
  sort: string;
  minPrice: string;
  maxPrice: string;
  totalCount?: number;
};

const SORT_OPTIONS = [
  { value: "", label: "Destacados" },
  { value: "price_asc", label: "Menor precio" },
  { value: "price_desc", label: "Mayor precio" },
  { value: "name_asc", label: "Nombre A-Z" },
];

export function CatalogSearchControls({
  categories,
  category,
  brands,
  brandsByCategory,
  query,
  brand,
  sort,
  minPrice,
  maxPrice,
  totalCount,
}: Props) {
  const router = useRouter();
  const searchInputId = useId();
  const [pending, startTransition] = useTransition();

  // Root & Subcategory resolution
  const initialRootSlug = category?.parentId
    ? categories.find((c) => c.id === category.parentId)?.slug ?? ""
    : category?.slug ?? "";
  const initialSubcategorySlug = category?.parentId ? category.slug : "";

  // Desktop / applied state
  const [rootSlug, setRootSlug] = useState(initialRootSlug);
  const [subcategorySlug, setSubcategorySlug] = useState(initialSubcategorySlug);
  const [selectedBrand, setSelectedBrand] = useState(brand);
  const [selectedSort, setSelectedSort] = useState(sort);
  const [minVal, setMinVal] = useState(minPrice);
  const [maxVal, setMaxVal] = useState(maxPrice);
  const [searchInput, setSearchInput] = useState(query);

  // Mobile Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [draftRootSlug, setDraftRootSlug] = useState(initialRootSlug);
  const [draftSubcategorySlug, setDraftSubcategorySlug] = useState(initialSubcategorySlug);
  const [draftBrand, setDraftBrand] = useState(brand);
  const [draftSort, setDraftSort] = useState(sort);
  const [draftMin, setDraftMin] = useState(minPrice);
  const [draftMax, setDraftMax] = useState(maxPrice);
  const [brandSearch, setBrandSearch] = useState("");

  const drawerRef = useRef<HTMLDivElement>(null);
  useModalFocus(drawerRef, isDrawerOpen);

  // Sync draft state whenever drawer opens
  const openDrawer = () => {
    setDraftRootSlug(rootSlug);
    setDraftSubcategorySlug(subcategorySlug);
    setDraftBrand(selectedBrand);
    setDraftSort(selectedSort);
    setDraftMin(minVal);
    setDraftMax(maxVal);
    setBrandSearch("");
    setIsDrawerOpen(true);
  };

  // Roots and subcategories
  const roots = categories.filter((c) => !c.parentId && !c.wholesaleOnly);
  const selectedRoot = roots.find((c) => c.slug === rootSlug);
  const subcategories = selectedRoot
    ? categories
        .filter((c) => c.parentId === selectedRoot.id && !c.wholesaleOnly)
        .sort((a, b) => a.name.localeCompare(b.name, "es"))
    : [];

  const selectedCategoryId = subcategorySlug
    ? subcategories.find((c) => c.slug === subcategorySlug)?.id
    : selectedRoot?.id;
  const visibleBrands = selectedCategoryId ? brandsByCategory[selectedCategoryId] ?? [] : brands;

  // Drawer draft categories & brands
  const draftRoot = roots.find((c) => c.slug === draftRootSlug);
  const draftSubcategories = draftRoot
    ? categories
        .filter((c) => c.parentId === draftRoot.id && !c.wholesaleOnly)
        .sort((a, b) => a.name.localeCompare(b.name, "es"))
    : [];
  const draftCategoryId = draftSubcategorySlug
    ? draftSubcategories.find((c) => c.slug === draftSubcategorySlug)?.id
    : draftRoot?.id;
  const draftVisibleBrands = draftCategoryId ? brandsByCategory[draftCategoryId] ?? [] : brands;

  const filteredDraftBrands = brandSearch.trim()
    ? draftVisibleBrands.filter((b) =>
        b.brand.toLowerCase().includes(brandSearch.trim().toLowerCase())
      )
    : draftVisibleBrands;

  // Calculate active filters count (excluding category navigation)
  const activeFilterCount =
    (brand ? 1 : 0) +
    (minPrice || maxPrice ? 1 : 0) +
    (sort ? 1 : 0) +
    (query ? 1 : 0);

  // Navigate helper
  const navigateWithParams = (params: {
    q?: string;
    category?: string;
    brand?: string;
    sort?: string;
    min?: string;
    max?: string;
  }) => {
    const sp = new URLSearchParams();
    const nextQ = params.q !== undefined ? params.q.trim() : query.trim();
    const nextCategory = params.category !== undefined ? params.category : (category?.slug ?? "");
    const nextBrand = params.brand !== undefined ? params.brand : brand;
    const nextSort = params.sort !== undefined ? params.sort : sort;
    const nextMin = params.min !== undefined ? params.min : minPrice;
    const nextMax = params.max !== undefined ? params.max : maxPrice;

    if (nextQ) sp.set("q", nextQ);
    if (nextCategory) sp.set("category", nextCategory);
    if (nextBrand) sp.set("brand", nextBrand);
    if (nextSort) sp.set("sort", nextSort);
    if (nextMin) sp.set("min", nextMin);
    if (nextMax) sp.set("max", nextMax);

    setIsDrawerOpen(false);
    startTransition(() => router.push(`/catalogo${sp.size ? `?${sp.toString()}` : ""}`));
  };

  // Mobile quick sort change
  const handleMobileSortChange = (newSort: string) => {
    setSelectedSort(newSort);
    navigateWithParams({ sort: newSort });
  };

  // Submit search query
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigateWithParams({ q: searchInput });
  };

  // Clear single filter chip
  const handleRemoveChip = (key: "q" | "brand" | "price" | "sort") => {
    if (key === "q") {
      setSearchInput("");
      navigateWithParams({ q: "" });
    } else if (key === "brand") {
      setSelectedBrand("");
      navigateWithParams({ brand: "" });
    } else if (key === "price") {
      setMinVal("");
      setMaxVal("");
      navigateWithParams({ min: "", max: "" });
    } else if (key === "sort") {
      setSelectedSort("");
      navigateWithParams({ sort: "" });
    }
  };

  // Reset all filters in current category
  const handleClearAll = () => {
    setSearchInput("");
    setSelectedBrand("");
    setSelectedSort("");
    setMinVal("");
    setMaxVal("");
    // Keep category if already selected, clear refinements
    navigateWithParams({
      q: "",
      brand: "",
      sort: "",
      min: "",
      max: "",
      category: category?.slug ?? "",
    });
  };

  // Desktop apply
  const handleApplyDesktop = (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveCategory = subcategorySlug || rootSlug;
    navigateWithParams({
      q: searchInput,
      category: effectiveCategory,
      brand: selectedBrand,
      sort: selectedSort,
      min: minVal,
      max: maxVal,
    });
  };

  // Mobile drawer apply
  const handleApplyDraft = () => {
    const effectiveCategory = draftSubcategorySlug || draftRootSlug;
    navigateWithParams({
      q: searchInput,
      category: effectiveCategory,
      brand: draftBrand,
      sort: draftSort,
      min: draftMin,
      max: draftMax,
    });
  };

  // Reset drawer draft
  const handleResetDraft = () => {
    setDraftBrand("");
    setDraftSort("");
    setDraftMin("");
    setDraftMax("");
    setBrandSearch("");
  };

  const currentSortLabel =
    SORT_OPTIONS.find((s) => s.value === sort)?.label ?? "Destacados";

  return (
    <div className="catalog-controls w-full" aria-busy={pending}>
      {pending && <p role="status" className="mb-2 text-xs font-semibold text-sky-700">Actualizando productos…</p>}
      {/* ========================================================================= */}
      {/* MOBILE CONTROLS (< sm)                                                    */}
      {/* ========================================================================= */}
      <div className="sm:hidden space-y-2.5">
        {/* Mobile Search Bar */}
        <form onSubmit={handleSearchSubmit} className="relative flex items-center">
          <label htmlFor={searchInputId} className="sr-only">
            Buscar productos
          </label>
          <Search className="pointer-events-none absolute left-3.5 h-4 w-4 text-zinc-400" />
          <input
            id={searchInputId}
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={
              category?.name
                ? `Buscar en ${category.name.replace(/\s*\(.*?\)/, "")}...`
                : "Buscar producto, marca o modelo..."
            }
            className="h-11 w-full rounded-2xl border border-zinc-200/90 bg-white pl-10 pr-9 text-sm text-zinc-900 shadow-2xs outline-none transition placeholder:text-zinc-400 focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
          />
          {searchInput ? (
            <button
              type="button"
              onClick={() => {
                setSearchInput("");
                if (query) navigateWithParams({ q: "" });
              }}
              className="absolute right-0 grid size-11 place-items-center rounded-xl text-zinc-500 hover:text-zinc-700"
              aria-label="Borrar búsqueda"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </form>

        {/* Mobile Action Row: Filtros button & Ordenar por selector */}
        <div className="flex items-center gap-2">
          {/* Botón Filtros Drawer */}
          <button
            type="button"
            onClick={openDrawer}
            aria-haspopup="dialog"
            aria-expanded={isDrawerOpen}
            className={`flex h-11 flex-1 items-center justify-between rounded-xl border px-3.5 text-xs font-semibold shadow-2xs active:scale-[0.98] transition cursor-pointer ${
              activeFilterCount > 0
                ? "border-zinc-950 bg-zinc-950 text-white"
                : "border-zinc-200/90 bg-white text-zinc-800 hover:bg-zinc-50"
            }`}
          >
            <div className="flex items-center gap-2">
              <SlidersHorizontal
                className={`h-3.5 w-3.5 ${
                  activeFilterCount > 0 ? "text-white" : "text-sky-700"
                }`}
              />
              <span>Filtros</span>
            </div>
            {activeFilterCount > 0 ? (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[11px] font-bold text-zinc-950">
                {activeFilterCount}
              </span>
            ) : (
              <span className="text-[11px] font-normal text-zinc-600">Afinar</span>
            )}
          </button>

          {/* Quick Sort selector with Native Picker overlay */}
          <div className="relative flex-1 rounded-xl focus-within:ring-2 focus-within:ring-sky-600 focus-within:ring-offset-2">
            <div
              aria-hidden="true"
              className="flex h-11 w-full items-center justify-between rounded-xl border border-zinc-200/90 bg-white px-3.5 text-xs font-semibold text-zinc-800 shadow-2xs transition hover:bg-zinc-50"
            >
              <div className="flex items-center gap-1.5 truncate">
                <ArrowUpDown className="h-3.5 w-3.5 shrink-0 text-sky-700" />
                <span className="truncate text-zinc-700 font-medium">
                  {currentSortLabel}
                </span>
              </div>
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
            </div>
            <select
              value={sort}
              onChange={(e) => handleMobileSortChange(e.target.value)}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              aria-label="Ordenar productos"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  Ordenar por: {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* DESKTOP TOOLBAR (>= sm)                                                    */}
      {/* ========================================================================= */}
      <form
        onSubmit={handleApplyDesktop}
        className="hidden sm:block rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-sm"
      >
        <div className="grid grid-cols-12 gap-3 items-end">
          {/* Search */}
          <div className="col-span-12 lg:col-span-4">
            <label className="block mb-1 text-xs font-semibold text-zinc-600">
              Producto, marca o modelo
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-zinc-400" />
              <input
                aria-label="Producto, marca o modelo"
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Ej.: taladro, Medicube, SKU"
                className="h-10 w-full rounded-xl border border-zinc-200 bg-white pl-9 pr-8 text-sm outline-none transition placeholder:text-zinc-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              />
              {searchInput ? (
                <button
                  type="button"
                  onClick={() => setSearchInput("")}
                  aria-label="Borrar búsqueda"
                  className="absolute right-0 top-0 grid h-10 w-10 place-items-center rounded-xl text-zinc-500 hover:text-zinc-700"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          </div>

          {/* Categoría */}
          <div className="col-span-6 sm:col-span-3 lg:col-span-2">
            <label className="block mb-1 text-xs font-semibold text-zinc-600">
              Categoría
            </label>
            <select
              aria-label="Categoría"
              value={rootSlug}
              onChange={(e) => {
                setRootSlug(e.target.value);
                setSubcategorySlug("");
                setSelectedBrand("");
              }}
              className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            >
              <option value="">Todas</option>
              {roots.map((r) => (
                <option key={r.id} value={r.slug}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          {/* Subcategoría */}
          <div className="col-span-6 sm:col-span-3 lg:col-span-2">
            <label className="block mb-1 text-xs font-semibold text-zinc-600">
              Subcategoría
            </label>
            <select
              aria-label="Subcategoría"
              value={subcategorySlug}
              disabled={!subcategories.length}
              onChange={(e) => {
                setSubcategorySlug(e.target.value);
                setSelectedBrand("");
              }}
              className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100 disabled:bg-zinc-50 disabled:text-zinc-400"
            >
              <option value="">{subcategories.length ? "Todas" : "—"}</option>
              {subcategories.map((sub) => (
                <option key={sub.id} value={sub.slug}>
                  {sub.name}
                </option>
              ))}
            </select>
          </div>

          {/* Marca */}
          <div className="col-span-6 sm:col-span-3 lg:col-span-2">
            <label className="block mb-1 text-xs font-semibold text-zinc-600">
              Marca
            </label>
            <select
              aria-label="Marca"
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            >
              <option value="">Todas</option>
              {selectedBrand &&
                !visibleBrands.some((b) => b.brand === selectedBrand) && (
                  <option value={selectedBrand}>{selectedBrand}</option>
                )}
              {visibleBrands.map((b) => (
                <option key={b.brand} value={b.brand}>
                  {b.brand} {b.count > 0 ? `(${b.count})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Ordenar */}
          <div className="col-span-6 sm:col-span-3 lg:col-span-2">
            <label className="block mb-1 text-xs font-semibold text-zinc-600">
              Ordenar por
            </label>
            <select
              aria-label="Ordenar productos"
              value={selectedSort}
              onChange={(e) => setSelectedSort(e.target.value)}
              className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: Price Filters & Actions */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 pt-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-600">Precio:</span>
            <div className="relative w-28">
              <input
                type="number"
                min="0"
                step="1"
                placeholder="$ Mínimo"
                value={minVal}
                onChange={(e) => setMinVal(e.target.value)}
                aria-label="Precio mínimo"
                className="h-11 w-full rounded-xl border border-zinc-200 px-2.5 text-xs text-zinc-900 outline-none transition focus:border-sky-500"
              />
            </div>
            <span className="text-xs text-zinc-400">—</span>
            <div className="relative w-28">
              <input
                type="number"
                min="0"
                step="1"
                placeholder="$ Máximo"
                value={maxVal}
                onChange={(e) => setMaxVal(e.target.value)}
                aria-label="Precio máximo"
                className="h-11 w-full rounded-xl border border-zinc-200 px-2.5 text-xs text-zinc-900 outline-none transition focus:border-sky-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeFilterCount > 0 ? (
              <button
                type="button"
                onClick={handleClearAll}
                className="text-xs font-semibold text-zinc-500 hover:text-zinc-800 transition px-2"
              >
                Limpiar filtros
              </button>
            ) : null}
            <button
              type="submit"
              className="h-11 rounded-xl bg-sky-700 px-4 text-xs font-bold text-white transition hover:bg-sky-800 active:scale-95 cursor-pointer"
            >
              Aplicar filtros
            </button>
          </div>
        </div>
      </form>

      {/* ========================================================================= */}
      {/* ACTIVE FILTER CHIPS ROW (Both Mobile & Desktop)                           */}
      {/* ========================================================================= */}
      {activeFilterCount > 0 && (
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mr-0.5">
            Filtros activos:
          </span>

          {query ? (
            <button
              type="button"
              onClick={() => handleRemoveChip("q")}
              className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-800 hover:bg-sky-100 transition active:scale-95"
            >
              <span className="min-w-0 break-words">&ldquo;{query}&rdquo;</span>
              <X className="h-3 w-3" />
            </button>
          ) : null}

          {brand ? (
            <button
              type="button"
              onClick={() => handleRemoveChip("brand")}
              className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-800 hover:bg-zinc-200 transition active:scale-95"
            >
              <span>Marca: {brand}</span>
              <X className="h-3 w-3" />
            </button>
          ) : null}

          {minPrice || maxPrice ? (
            <button
              type="button"
              onClick={() => handleRemoveChip("price")}
              className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-800 hover:bg-zinc-200 transition active:scale-95"
            >
              <span>
                Precio: {minPrice ? `$${Number(minPrice).toLocaleString("es-AR")}` : "$0"} –{" "}
                {maxPrice ? `$${Number(maxPrice).toLocaleString("es-AR")}` : "máx"}
              </span>
              <X className="h-3 w-3" />
            </button>
          ) : null}

          {sort ? (
            <button
              type="button"
              onClick={() => handleRemoveChip("sort")}
              className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-800 hover:bg-zinc-200 transition active:scale-95"
            >
              <span>Orden: {currentSortLabel}</span>
              <X className="h-3 w-3" />
            </button>
          ) : null}

          <button
            type="button"
            onClick={handleClearAll}
            className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline px-1.5 py-0.5 cursor-pointer"
          >
            Limpiar todo
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MOBILE FILTER DRAWER (Bottom Sheet)                                       */}
      {/* ========================================================================= */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsDrawerOpen(false)}
            aria-hidden="true"
          />

          {/* Bottom Sheet Modal Container */}
          <div
            ref={drawerRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label="Filtros del catálogo"
            onKeyDown={event => { if (event.key === "Escape") setIsDrawerOpen(false); }}
            className="relative z-10 flex max-h-[88dvh] w-full flex-col rounded-t-3xl bg-white shadow-2xl transition-transform duration-200 animate-in slide-in-from-bottom"
          >
            {/* Top Drag Indicator */}
            <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-zinc-300" />

            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3.5">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-sky-700" />
                <h2 className="text-base font-bold text-zinc-950">Filtros y orden</h2>
                {activeFilterCount > 0 && (
                  <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-[11px] font-bold text-white">
                    {activeFilterCount}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                {(draftBrand || draftSort || draftMin || draftMax) && (
                  <button
                    type="button"
                    onClick={handleResetDraft}
                    className="flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700 active:underline cursor-pointer"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Restablecer</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  className="grid size-11 shrink-0 place-items-center rounded-full text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 active:scale-95 transition cursor-pointer"
                  aria-label="Cerrar filtros"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Drawer Scrollable Content */}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 space-y-6 scrollbar-thin">
              {/* SECTION 1: Categoría Principal */}
              <div>
                <span className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2.5">
                  Rubro / Categoría
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDraftRootSlug("");
                      setDraftSubcategorySlug("");
                      setDraftBrand("");
                    }}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition active:scale-95 cursor-pointer ${
                      !draftRootSlug
                        ? "bg-zinc-950 text-white shadow-xs"
                        : "border border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300"
                    }`}
                  >
                    Todos los rubros
                  </button>
                  {roots.map((r) => {
                    const isSelected = draftRootSlug === r.slug;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => {
                          setDraftRootSlug(r.slug);
                          setDraftSubcategorySlug("");
                          setDraftBrand("");
                        }}
                        className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition active:scale-95 cursor-pointer ${
                          isSelected
                            ? "bg-zinc-950 text-white shadow-xs"
                            : "border border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300"
                        }`}
                      >
                        {r.name.replace(/\s*\(.*?\)/, "")}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SECTION 2: Subcategoría (if applicable) */}
              {draftSubcategories.length > 0 && (
                <div className="rounded-xl border border-zinc-100 bg-zinc-50/70 p-3.5">
                  <span className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">
                    Subcategoría en {draftRoot?.name.replace(/\s*\(.*?\)/, "")}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setDraftSubcategorySlug("")}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition active:scale-95 cursor-pointer ${
                        !draftSubcategorySlug
                          ? "bg-sky-700 text-white shadow-xs"
                          : "border border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300"
                      }`}
                    >
                      Todas las subcategorías
                    </button>
                    {draftSubcategories.map((sub) => {
                      const isSubSelected = draftSubcategorySlug === sub.slug;
                      return (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => setDraftSubcategorySlug(sub.slug)}
                          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition active:scale-95 cursor-pointer ${
                            isSubSelected
                              ? "bg-sky-700 text-white shadow-xs"
                              : "border border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300"
                          }`}
                        >
                          {sub.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SECTION 3: Marcas */}
              {draftVisibleBrands.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                      Marcas ({draftVisibleBrands.length})
                    </span>
                    {draftBrand && (
                      <button
                        type="button"
                        onClick={() => setDraftBrand("")}
                        className="text-xs font-semibold text-sky-700 hover:underline cursor-pointer"
                      >
                        Quitar marca
                      </button>
                    )}
                  </div>

                  {draftVisibleBrands.length > 6 && (
                    <div className="relative mb-3">
                      <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-400" />
                      <input
                        type="text"
                        value={brandSearch}
                        onChange={(e) => setBrandSearch(e.target.value)}
                        placeholder="Filtrar marcas..."
                        className="h-9 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-8 pr-3 text-xs outline-none focus:border-sky-500 focus:bg-white"
                      />
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
                    <button
                      type="button"
                      onClick={() => setDraftBrand("")}
                      className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition active:scale-95 cursor-pointer ${
                        !draftBrand
                          ? "bg-zinc-950 text-white shadow-xs"
                          : "border border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300"
                      }`}
                    >
                      Todas las marcas
                    </button>
                    {filteredDraftBrands.map((b) => {
                      const isSelected = draftBrand === b.brand;
                      return (
                        <button
                          key={b.brand}
                          type="button"
                          onClick={() => setDraftBrand(isSelected ? "" : b.brand)}
                          className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition active:scale-95 cursor-pointer ${
                            isSelected
                              ? "bg-zinc-950 text-white shadow-xs"
                              : "border border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300"
                          }`}
                        >
                          {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                          <span>{b.brand}</span>
                          <span
                            className={`text-[10px] ${
                              isSelected ? "text-zinc-300" : "text-zinc-400"
                            }`}
                          >
                            ({b.count})
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SECTION 4: Rango de Precio */}
              <div>
                <span className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2.5">
                  Rango de precio (ARS)
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block mb-1 text-[11px] font-semibold text-zinc-500">
                      Mínimo ($)
                    </label>
                    <input
                      type="number"
                      inputMode="numeric"
                      min="0"
                      placeholder="0"
                      value={draftMin}
                      onChange={(e) => setDraftMin(e.target.value)}
                      className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-[11px] font-semibold text-zinc-500">
                      Máximo ($)
                    </label>
                    <input
                      type="number"
                      inputMode="numeric"
                      min="0"
                      placeholder="Sin tope"
                      value={draftMax}
                      onChange={(e) => setDraftMax(e.target.value)}
                      className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                    />
                  </div>
                </div>

                {/* Quick Price Presets */}
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setDraftMin("");
                      setDraftMax("25000");
                    }}
                    className="rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-medium text-zinc-700 hover:bg-zinc-100 transition active:scale-95 cursor-pointer"
                  >
                    Hasta $25.000
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDraftMin("25000");
                      setDraftMax("60000");
                    }}
                    className="rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-medium text-zinc-700 hover:bg-zinc-100 transition active:scale-95 cursor-pointer"
                  >
                    $25.000 a $60.000
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDraftMin("60000");
                      setDraftMax("");
                    }}
                    className="rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-medium text-zinc-700 hover:bg-zinc-100 transition active:scale-95 cursor-pointer"
                  >
                    Más de $60.000
                  </button>
                </div>
              </div>

              {/* SECTION 5: Ordenar por */}
              <div>
                <span className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2.5">
                  Ordenar productos
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {SORT_OPTIONS.map((opt) => {
                    const isSelected = draftSort === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setDraftSort(opt.value)}
                        className={`flex items-center justify-between rounded-xl border p-3 text-left text-xs font-semibold transition active:scale-98 cursor-pointer ${
                          isSelected
                            ? "border-sky-600 bg-sky-50/70 text-sky-900 shadow-2xs ring-1 ring-sky-600"
                            : "border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50"
                        }`}
                      >
                        <span>{opt.label}</span>
                        {isSelected && <Check className="h-4 w-4 text-sky-700" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Drawer Footer (Sticky Bottom Action) */}
            <div className="shrink-0 border-t border-zinc-100 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-lg flex items-center gap-3">
              <button
                type="button"
                onClick={handleApplyDraft}
                className="flex-1 rounded-xl bg-zinc-950 py-3.5 px-4 text-center text-sm font-bold text-white shadow-md transition hover:bg-zinc-900 active:scale-[0.99] flex flex-wrap items-center justify-center gap-2 cursor-pointer"
              >
                <span>Aplicar filtros</span>
                {totalCount !== undefined && totalCount > 0 ? (
                  <span className="rounded-md bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-300">
                    {totalCount} actuales
                  </span>
                ) : null}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
