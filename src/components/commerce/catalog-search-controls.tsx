"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, SlidersHorizontal } from "lucide-react";
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
};

export function CatalogSearchControls({ categories, category, brands, brandsByCategory, query, brand, sort, minPrice, maxPrice }: Props) {
  const [filtersOpen, setFiltersOpen] = useState(Boolean(brand || sort || minPrice || maxPrice));
  const [advancedOpen, setAdvancedOpen] = useState(Boolean(brand || sort || minPrice || maxPrice));
  const [rootSlug, setRootSlug] = useState(category?.parentId ? categories.find(c => c.id === category.parentId)?.slug ?? "" : category?.slug ?? "");
  const [subcategorySlug, setSubcategorySlug] = useState(category?.parentId ? category.slug : "");
  const [selectedBrand, setSelectedBrand] = useState(brand);
  const roots = categories.filter(c => !c.parentId && !c.wholesaleOnly);
  const selectedRoot = roots.find(c => c.slug === rootSlug);
  const subcategories = selectedRoot ? categories.filter(c => c.parentId === selectedRoot.id && !c.wholesaleOnly).sort((a, b) => a.name.localeCompare(b.name, "es")) : [];
  const selectedCategoryId = subcategorySlug ? subcategories.find(c => c.slug === subcategorySlug)?.id : selectedRoot?.id;
  const visibleBrands = selectedCategoryId ? brandsByCategory[selectedCategoryId] ?? [] : brands;
  const showBrandCounts = !rootSlug && !query && !minPrice && !maxPrice;
  const field = "h-11 min-w-0 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100";

  return <form action="/catalogo" className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm sm:p-5">
    <div className="flex items-center gap-2 text-sm font-bold text-zinc-800"><SlidersHorizontal className="h-4 w-4 text-sky-600" /> Buscá y filtrá productos</div>
    <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-4 sm:gap-3 lg:grid-cols-12">
      <label className="col-span-2 lg:col-span-5">
        <span className="mb-1.5 block text-xs font-semibold text-zinc-600">Producto, marca o modelo</span>
        <span className="relative block"><Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-zinc-400" /><input className={`${field} pl-9`} name="q" defaultValue={query} placeholder="Ej.: taladro, Karseell, SKU" maxLength={100} /></span>
      </label>
      <button type="button" className="flex h-11 items-center justify-between rounded-xl border border-zinc-200 px-3 text-sm font-semibold text-zinc-800 sm:hidden" aria-expanded={filtersOpen} aria-controls="catalog-filter-fields" onClick={() => setFiltersOpen(!filtersOpen)}>
        <span>{filtersOpen ? "Ocultar filtros" : "Categorías y filtros"}</span>
        <SlidersHorizontal className="h-4 w-4 text-sky-700" />
      </button>
      <div id="catalog-filter-fields" className={`${filtersOpen ? "contents" : "hidden"} sm:contents`}>
      <label className="lg:col-span-3">
        <span className="mb-1.5 block text-xs font-semibold text-zinc-600">Categoría</span>
        <select className={field} value={rootSlug} onChange={event => { setRootSlug(event.target.value); setSubcategorySlug(""); setSelectedBrand(""); }}>
          <option value="">Todas las categorías</option>
          {roots.map(root => <option value={root.slug} key={root.id}>{root.name}</option>)}
        </select>
      </label>
      <label className="lg:col-span-4">
        <span className="mb-1.5 block text-xs font-semibold text-zinc-600">Subcategoría</span>
        <select className={field} value={subcategorySlug} onChange={event => { setSubcategorySlug(event.target.value); setSelectedBrand(""); }} disabled={!subcategories.length}>
          <option value="">{subcategories.length ? "Todas las subcategorías" : "Elegí una categoría"}</option>
          {subcategories.map(sub => <option value={sub.slug} key={sub.id}>{sub.name}</option>)}
        </select>
      </label>
      <input type="hidden" name="category" value={subcategorySlug || rootSlug} />
      <button type="button" className="flex h-11 items-center justify-center rounded-xl border border-zinc-200 text-sm font-semibold text-sky-700 sm:hidden" aria-expanded={advancedOpen} onClick={() => setAdvancedOpen(!advancedOpen)}>{advancedOpen ? "Ocultar marca, orden y precio" : "Marca, orden y precio"}</button>
      <label className={`${advancedOpen ? "" : "hidden"} sm:block lg:col-span-3`}>
        <span className="mb-1.5 block text-xs font-semibold text-zinc-600">Marca</span>
        <select className={field} name="brand" value={selectedBrand} onChange={event => setSelectedBrand(event.target.value)}>
          <option value="">Todas las marcas</option>
          {selectedBrand && !visibleBrands.some(b => b.brand === selectedBrand) && <option value={selectedBrand}>{selectedBrand}</option>}
          {visibleBrands.map(b => <option value={b.brand} key={b.brand}>{b.brand}{showBrandCounts ? ` (${b.count})` : ""}</option>)}
        </select>
      </label>
      <label className={`${advancedOpen ? "" : "hidden"} sm:block lg:col-span-3`}>
        <span className="mb-1.5 block text-xs font-semibold text-zinc-600">Ordenar por</span>
        <select className={field} name="sort" defaultValue={sort}>
          <option value="">Destacados</option><option value="price_asc">Menor precio</option><option value="price_desc">Mayor precio</option><option value="name_asc">Nombre A-Z</option>
        </select>
      </label>
      <label className={`${advancedOpen ? "" : "hidden"} sm:block lg:col-span-2`}><span className="mb-1.5 block text-xs font-semibold text-zinc-600">Precio desde</span><input className={field} type="number" min="0" step="1" name="min" defaultValue={minPrice} placeholder="$ mínimo" /></label>
      <label className={`${advancedOpen ? "" : "hidden"} sm:block lg:col-span-2`}><span className="mb-1.5 block text-xs font-semibold text-zinc-600">Precio hasta</span><input className={field} type="number" min="0" step="1" name="max" defaultValue={maxPrice} placeholder="$ máximo" /></label>
      </div>
      <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-2"><button className="h-11 flex-1 rounded-xl bg-sky-700 px-4 text-sm font-bold text-white transition hover:bg-sky-800">Aplicar</button></div>
    </div>
    <div className="mt-2 flex justify-end sm:mt-3"><Link href="/catalogo" className="text-xs font-semibold text-sky-700 hover:underline">Limpiar filtros</Link></div>
  </form>;
}
