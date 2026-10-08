import { PUBLIC_PRODUCT_COLUMNS } from "@/lib/catalog-data";
import { EmptyCatalog } from "@/components/commerce/empty-catalog";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { CatalogSearchControls } from "@/components/commerce/catalog-search-controls";
import { ProductCard } from "@/components/commerce/product-card";
import { getStorefrontData, getPublicFacetProducts, mapProduct } from "@/lib/storefront";
import { deriveCatalogFacets, type BrandFacet, type CatalogFacetProduct } from "@/lib/catalog-facets";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import type { Product } from "@/lib/types";

export const metadata = {
  title: "Catálogo de productos | MyA importaciones",
  description:
    "Explorá electrónica Apple y Samsung, cosmética coreana, cuidado capilar, fragancias y herramientas. Encontrá modelos, colores y precios en MyA importaciones.",
};
type CatalogParams = { q?: string; category?: string; page?: string; sort?: string; brand?: string; family?: string; min?: string; max?: string };
const pageSize = 24;

export default async function CatalogPage({ searchParams }: { searchParams: Promise<CatalogParams> }) {
  const params = await searchParams;
  const q = (params.q ?? "").replace(/[^\p{L}\p{N}\s-]/gu, " ").trim().replace(/\s+/g, " ").slice(0, 100);
  const brand = (params.brand ?? "").trim().slice(0, 80);
  const family = (params.family ?? "").trim().slice(0, 100);
  const sort = ["price_asc", "price_desc", "name_asc"].includes(params.sort ?? "") ? params.sort! : "";
  const minPrice = /^\d{1,12}$/.test(params.min ?? "") ? params.min! : "";
  const maxPrice = /^\d{1,12}$/.test(params.max ?? "") ? params.max! : "";
  const page = Math.min(200, Math.max(1, Number.parseInt(params.page ?? "1") || 1));
  const { categories, products: fallback, error: catalogError } = await getStorefrontData({ limit: 0 });
  let visibleCategories = categories.filter(c => !c.wholesaleOnly);
  const category = visibleCategories.find(c => c.slug === params.category);
  const root = category?.parentId ? visibleCategories.find(c => c.id === category.parentId) : category;
  let products: Product[] = [], count = 0, failed = Boolean(catalogError);
  let brands: { brand: string; count: number }[] = [];
  let brandsByCategory: Record<string, BrandFacet[]> = {};
  let facetProducts: CatalogFacetProduct[] = [];

  if (hasSupabaseConfig()) {
    const db = await createServerSupabaseClient();
    try {
      facetProducts = await getPublicFacetProducts();
      const facets = deriveCatalogFacets(visibleCategories, facetProducts);
      visibleCategories = facets.categories;
      brands = facets.brands;
      brandsByCategory = facets.brandsByCategory;
    } catch {
      failed = true;
    }
    const ids = category
      ? visibleCategories.filter(c => c.id === category.id || c.parentId === category.id).map(c => c.id)
      : visibleCategories.map(c => c.id);
    if (ids.length) {
      let query = db.from("products").select(`${PUBLIC_PRODUCT_COLUMNS}, categories(name)`, { count: "exact" }).eq("is_active", true).eq("is_wholesale_only", false).in("category_id", ids);
      if (brand) query = query.eq("brand", brand);
      if (family) query = query.eq("model", family);
      if (q) query = query.or(`title.ilike.%${q}%,brand.ilike.%${q}%,model.ilike.%${q}%,sku.ilike.%${q}%`);
      if (minPrice) query = query.gte("retail_price", Number(minPrice));
      if (maxPrice) query = query.lte("retail_price", Number(maxPrice));
      query = sort === "price_asc" ? query.order("retail_price") : sort === "price_desc" ? query.order("retail_price", { ascending: false }) : sort === "name_asc" ? query.order("title") : query.order("is_featured", { ascending: false }).order("title");
      const result = await query.order("id").range((page - 1) * pageSize, page * pageSize - 1);
      products = (result.data ?? []).map(p => mapProduct(p));
      count = result.count ?? 0;
      failed = failed || Boolean(result.error);
    }
  } else {
    const matching = fallback.filter(product => {
      if (category && product.categoryId !== category.id && !visibleCategories.some(c => c.id === product.categoryId && c.parentId === category.id)) return false;
      if (brand && product.brand !== brand) return false;
      if (family && product.model !== family) return false;
      if (q && ![product.title, product.brand, product.model, product.sku, product.description].some(value => value?.toLocaleLowerCase("es").includes(q.toLocaleLowerCase("es")))) return false;
      if (minPrice && product.retailPrice < Number(minPrice)) return false;
      if (maxPrice && product.retailPrice > Number(maxPrice)) return false;
      return true;
    });
    matching.sort((a, b) => sort === "price_asc" ? a.retailPrice - b.retailPrice : sort === "price_desc" ? b.retailPrice - a.retailPrice : sort === "name_asc" ? a.title.localeCompare(b.title, "es") : Number(b.featured) - Number(a.featured) || a.title.localeCompare(b.title, "es"));
    count = matching.length;
    products = matching.slice((page - 1) * pageSize, page * pageSize);
    facetProducts = fallback.map(p => ({ category_id: p.categoryId, brand: p.brand ?? null, model: p.model }));
    const facets = deriveCatalogFacets(visibleCategories, facetProducts);
    visibleCategories = facets.categories;
    brands = facets.brands;
    brandsByCategory = facets.brandsByCategory;
  }

  const pages = Math.ceil(count / pageSize);
  const subcategories = root ? visibleCategories.filter(c => c.parentId === root.id) : [];
  const electronics = root?.slug === "electronica";
  const familyIds = new Set(category ? visibleCategories.filter(c => c.id === category.id || c.parentId === category.id).map(c => c.id) : []);
  const families = electronics ? [...new Set(facetProducts.filter(p => familyIds.has(p.category_id) && (!brand || p.brand === brand)).map(p => p.model).filter((value): value is string => Boolean(value)))].sort((a, b) => a.localeCompare(b, "es", { numeric: true })) : [];
  function catalogUrl(next: { category?: string; page?: number; family?: string; brand?: string }) {
    const query = new URLSearchParams();
    if (q) query.set("q", q);
    const nextBrand = next.brand ?? (next.category === category?.slug ? brand : "");
    if (nextBrand) query.set("brand", nextBrand);
    const nextFamily = next.family ?? (next.category === category?.slug && next.brand === undefined ? family : "");
    if (nextFamily) query.set("family", nextFamily);
    if (next.category) query.set("category", next.category);
    if (sort) query.set("sort", sort);
    if (minPrice) query.set("min", minPrice);
    if (maxPrice) query.set("max", maxPrice);
    if (next.page && next.page > 1) query.set("page", String(next.page));
    return `/catalogo${query.size ? `?${query}` : ""}`;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-8 lg:px-8">
      {/* Breadcrumbs */}
      <nav
        aria-label="Ubicación"
        className="mb-3 flex items-center gap-1.5 text-xs text-zinc-500 overflow-x-auto no-scrollbar whitespace-nowrap py-0.5"
      >
        <Link href="/" className="hover:text-sky-700 transition">
          Inicio
        </Link>
        <ChevronRight className="h-3 w-3 text-zinc-400 shrink-0" />
        <Link href="/catalogo" className="hover:text-sky-700 transition">
          Catálogo
        </Link>
        {root && (
          <>
            <ChevronRight className="h-3 w-3 text-zinc-400 shrink-0" />
            <Link
              href={catalogUrl({ category: root.slug })}
              className={!category?.parentId ? "font-semibold text-zinc-900" : "hover:text-sky-700 transition"}
            >
              {root.name}
            </Link>
          </>
        )}
        {category?.parentId && (
          <>
            <ChevronRight className="h-3 w-3 text-zinc-400 shrink-0" />
            <span className="font-semibold text-zinc-900">{category.name}</span>
          </>
        )}
      </nav>

      {/* Category Header */}
      <div className="mb-4 sm:mb-6 flex flex-col gap-1.5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-sky-700">
            {root && root.id !== category?.id ? root.name : "Catálogo oficial"}
          </p>
          <h1 className="text-2xl font-extrabold tracking-tight text-zinc-950 sm:text-3xl lg:text-4xl">
            {category?.name ?? "Todos los productos"}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-zinc-500 max-w-2xl">
            {category?.description || "Encontrá productos 100% auténticos importados con envíos a todo el país y atención personalizada desde Tandil."}
          </p>
        </div>
        <div className="mt-1 sm:mt-0 flex items-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-800">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-600"></span>
            {count} {count === 1 ? "producto" : "productos"}
          </span>
        </div>
      </div>

      {/* Horizontal Subcategory / Category quick chips */}
      {(root || visibleCategories.length > 0) && (
        <div className="mb-3 sm:mb-5">
          <nav
            aria-label={root ? "Subcategorías" : "Categorías"}
            className="flex items-center gap-2 overflow-x-auto pb-1.5 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0"
          >
            <Link
              href={catalogUrl({ category: root?.slug })}
              className={`shrink-0 rounded-full px-4 py-2 text-xs sm:text-sm font-semibold transition-all duration-150 active:scale-95 ${
                !category?.parentId
                  ? "bg-zinc-950 text-white shadow-xs"
                  : "border border-zinc-200/90 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50"
              }`}
            >
              {root ? `Todo en ${root.name.replace(/\s*\(.*?\)/, "")}` : "Todos los rubros"}
            </Link>

            {(root
              ? [...subcategories].sort(
                  (a, b) => Number(b.id === category?.id) - Number(a.id === category?.id)
                )
              : visibleCategories.filter((c) => !c.parentId)
            ).map((item) => {
              const isSelected = category?.id === item.id;
              return (
                <Link
                  key={item.id}
                  href={catalogUrl({ category: item.slug })}
                  className={`shrink-0 rounded-full px-4 py-2 text-xs sm:text-sm font-semibold transition-all duration-150 active:scale-95 ${
                    isSelected
                      ? "bg-zinc-950 text-white shadow-xs"
                      : "border border-zinc-200/90 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50"
                  }`}
                >
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      )}

      {/* Search and Filters Controls */}
      {electronics && (
        <div className="mb-4 space-y-3 rounded-2xl border border-sky-100 bg-sky-50/40 p-3 sm:p-4">
          <nav aria-label="Marcas de electrónica" className="flex flex-wrap gap-2">
            {["", "Apple", "Samsung"].map(value => (
              <Link key={value} href={catalogUrl({ category: category?.slug, brand: value, family: "" })} aria-current={brand === value ? "page" : undefined} className={`rounded-full px-4 py-2 text-xs font-semibold ${brand === value ? "bg-zinc-950 text-white" : "border border-zinc-200 bg-white text-zinc-700"}`}>{value || "Todas las marcas"}</Link>
            ))}
          </nav>
          <nav aria-label="Modelos y gamas" className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap">
            <Link href={catalogUrl({ category: category?.slug, family: "" })} aria-current={!family ? "page" : undefined} className={`shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold ${!family ? "bg-sky-700 text-white" : "border border-zinc-200 bg-white text-zinc-700"}`}>Todos los modelos</Link>
            {families.map(value => <Link key={value} href={catalogUrl({ category: category?.slug, family: value })} aria-current={family === value ? "page" : undefined} className={`shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold ${family === value ? "bg-sky-700 text-white" : "border border-zinc-200 bg-white text-zinc-700"}`}>{value}</Link>)}
          </nav>
          {family && <p className="text-sm font-semibold text-sky-900">Modelo: {family}</p>}
        </div>
      )}
      <CatalogSearchControls
        key={JSON.stringify([category?.slug, q, brand, family, sort, minPrice, maxPrice])}
        categories={visibleCategories}
        category={category}
        brands={brands}
        brandsByCategory={brandsByCategory}
        query={q}
        brand={brand}
        family={family}
        sort={sort}
        minPrice={minPrice}
        maxPrice={maxPrice}
        totalCount={count}
      />

      {/* Results Header */}
      <div className="mt-4 sm:mt-6 flex items-center justify-between border-b border-zinc-200/80 pb-3 text-xs sm:text-sm text-zinc-600">
        <span>
          {failed
            ? "No pudimos cargar el catálogo"
            : count
            ? `Mostrando ${Math.min((page - 1) * pageSize + 1, count)}–${Math.min(
                page * pageSize,
                count
              )} de ${count} productos`
            : "Sin resultados"}
        </span>
        <span className="hidden sm:inline text-xs text-zinc-500">
          Envíos por Correo Argentino a todo el país · Atención Máximo & Agustina
        </span>
      </div>

      {/* Catalog Grid / Empty State */}
      {(!count && !q && !category && !brand && !minPrice && !maxPrice) || failed ? (
        <EmptyCatalog
          error={
            failed
              ? "No pudimos cargar el catálogo. Probá nuevamente o consultanos por WhatsApp."
              : undefined
          }
        />
      ) : products.length ? (
        <div className="mt-4 sm:mt-6 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-zinc-200 bg-white px-6 py-12 text-center">
          <h2 className="text-lg font-bold text-zinc-950">
            No encontramos productos con esos filtros
          </h2>
          <p className="mt-2 text-sm text-zinc-600">
            Probá ajustando el término de búsqueda, la marca o el rango de precio.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {root ? (
              <Link
                href={catalogUrl({ category: root.slug, page: 1 })}
                className="inline-flex rounded-xl bg-zinc-950 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-zinc-900 transition"
              >
                Ver todo en {root.name.replace(/\s*\(.*?\)/, "")}
              </Link>
            ) : null}
            <Link
              href="/catalogo"
              className="inline-flex rounded-xl border border-zinc-200 bg-white px-5 py-2.5 text-xs sm:text-sm font-semibold text-zinc-700 hover:border-zinc-300 transition"
            >
              Ver todo el catálogo
            </Link>
          </div>
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <nav
          aria-label="Páginas del catálogo"
          className="mt-8 sm:mt-10 flex items-center justify-center gap-3 text-sm"
        >
          <Link
            aria-disabled={page <= 1}
            className={`rounded-xl border px-4 py-2 text-xs sm:text-sm font-medium transition ${
              page <= 1
                ? "pointer-events-none opacity-40"
                : "border-zinc-200 bg-white text-zinc-800 hover:border-sky-400"
            }`}
            href={catalogUrl({ category: category?.slug, page: page - 1 })}
          >
            Anterior
          </Link>
          <span className="px-2 text-xs sm:text-sm font-semibold text-zinc-700">
            Página {page} de {pages}
          </span>
          <Link
            aria-disabled={page >= pages}
            className={`rounded-xl border px-4 py-2 text-xs sm:text-sm font-medium transition ${
              page >= pages
                ? "pointer-events-none opacity-40"
                : "border-zinc-200 bg-white text-zinc-800 hover:border-sky-400"
            }`}
            href={catalogUrl({ category: category?.slug, page: page + 1 })}
          >
            Siguiente
          </Link>
        </nav>
      )}
    </div>
  );
}
