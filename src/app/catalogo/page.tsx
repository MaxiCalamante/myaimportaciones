import { PUBLIC_PRODUCT_COLUMNS } from "@/lib/catalog-data";
import { EmptyCatalog } from "@/components/commerce/empty-catalog";
import Link from "next/link";
import { CatalogSearchControls } from "@/components/commerce/catalog-search-controls";
import { ProductCard } from "@/components/commerce/product-card";
import { getStorefrontData, getPublicFacetProducts, mapProduct } from "@/lib/storefront";
import { deriveCatalogFacets, type BrandFacet } from "@/lib/catalog-facets";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import type { Product } from "@/lib/types";

export const metadata = { title: "Catálogo minorista", description: "Encontrá productos por categoría, marca y precio. Consultá disponibilidad y entrega." };
type CatalogParams = { q?: string; category?: string; page?: string; sort?: string; brand?: string; min?: string; max?: string };
const pageSize = 24;

export default async function CatalogPage({ searchParams }: { searchParams: Promise<CatalogParams> }) {
  const params = await searchParams;
  const q = (params.q ?? "").replace(/[^\p{L}\p{N}\s-]/gu, " ").trim().replace(/\s+/g, " ").slice(0, 100);
  const brand = (params.brand ?? "").trim().slice(0, 80);
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

  if (hasSupabaseConfig()) {
    const db = await createServerSupabaseClient();
    try {
      const facets = deriveCatalogFacets(visibleCategories, await getPublicFacetProducts());
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
      if (q && ![product.title, product.brand, product.model, product.sku, product.description].some(value => value?.toLocaleLowerCase("es").includes(q.toLocaleLowerCase("es")))) return false;
      if (minPrice && product.retailPrice < Number(minPrice)) return false;
      if (maxPrice && product.retailPrice > Number(maxPrice)) return false;
      return true;
    });
    matching.sort((a, b) => sort === "price_asc" ? a.retailPrice - b.retailPrice : sort === "price_desc" ? b.retailPrice - a.retailPrice : sort === "name_asc" ? a.title.localeCompare(b.title, "es") : Number(b.featured) - Number(a.featured) || a.title.localeCompare(b.title, "es"));
    count = matching.length;
    products = matching.slice((page - 1) * pageSize, page * pageSize);
    const facets = deriveCatalogFacets(visibleCategories, fallback.map(p => ({ category_id: p.categoryId, brand: p.brand ?? null })));
    visibleCategories = facets.categories;
    brands = facets.brands;
    brandsByCategory = facets.brandsByCategory;
  }

  const pages = Math.ceil(count / pageSize);
  const subcategories = root ? visibleCategories.filter(c => c.parentId === root.id) : [];
  function catalogUrl(next: { category?: string; page?: number }) {
    const query = new URLSearchParams();
    if (q) query.set("q", q);
    if (brand && next.category === category?.slug) query.set("brand", brand);
    if (next.category) query.set("category", next.category);
    if (sort) query.set("sort", sort);
    if (minPrice) query.set("min", minPrice);
    if (maxPrice) query.set("max", maxPrice);
    if (next.page && next.page > 1) query.set("page", String(next.page));
    return `/catalogo${query.size ? `?${query}` : ""}`;
  }

  return <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
    <nav aria-label="Ubicación" className="mb-4 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
      <Link href="/" className="hover:text-sky-700">Inicio</Link><span>/</span><Link href="/catalogo" className="hover:text-sky-700">Catálogo</Link>
      {root && <><span>/</span><Link href={catalogUrl({ category: root.slug })} className="hover:text-sky-700">{root.name}</Link></>}
      {category?.parentId && <><span>/</span><span className="font-semibold text-zinc-800">{category.name}</span></>}
    </nav>
    <div className="mb-4 flex flex-wrap items-end justify-between gap-2 sm:mb-6 sm:gap-3">
      <div><p className="hidden text-xs font-bold uppercase tracking-widest text-sky-700 sm:block">Explorá la tienda</p><h1 className="text-2xl font-bold tracking-tight text-zinc-950 sm:mt-1 sm:text-4xl">{category?.name ?? "Todos los productos"}</h1><p className="mt-2 hidden text-sm text-zinc-600 sm:block">Elegí un rubro y afiná tu búsqueda. Precios en pesos argentinos.</p></div>
      <span className="rounded-full border border-sky-100 bg-sky-50 px-3 py-1.5 text-sm font-semibold text-sky-800">{count} {count === 1 ? "producto" : "productos"}</span>
    </div>
    <CatalogSearchControls key={JSON.stringify([category?.slug, q, brand, sort, minPrice, maxPrice])} categories={visibleCategories} category={category} brands={brands} brandsByCategory={brandsByCategory} query={q} brand={brand} sort={sort} minPrice={minPrice} maxPrice={maxPrice} />
    <nav aria-label={root ? "Subcategorías" : "Categorías"} className="mt-4 flex gap-2 overflow-x-auto pb-2 sm:mt-6">
      <Link href={catalogUrl({ category: root?.slug })} className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition ${!category?.parentId ? "border-sky-700 bg-sky-700 text-white" : "border-zinc-200 bg-white text-zinc-700 hover:border-sky-300"}`}>{root ? `Todo en ${root.name}` : "Todos los rubros"}</Link>
      {(root ? [...subcategories].sort((a, b) => Number(b.id === category?.id) - Number(a.id === category?.id)) : visibleCategories.filter(c => !c.parentId)).map(item => <Link key={item.id} href={catalogUrl({ category: item.slug })} className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition ${category?.id === item.id ? "border-sky-700 bg-sky-700 text-white" : "border-zinc-200 bg-white text-zinc-700 hover:border-sky-300 hover:text-sky-800"}`}>{item.name}</Link>)}
    </nav>
    <div className="mt-5 flex items-center justify-between border-b border-zinc-200 pb-3 text-sm text-zinc-600"><span>{failed ? "No pudimos cargar el catálogo" : count ? `Mostrando ${Math.min((page - 1) * pageSize + 1, count)}–${Math.min(page * pageSize, count)} de ${count}` : "Sin resultados"}</span><span className="hidden sm:inline">Disponibilidad y entrega en cada producto</span></div>
    {(!count && !q && !category && !brand && !minPrice && !maxPrice) || failed ? <EmptyCatalog error={failed ? "No pudimos cargar el catálogo. Probá nuevamente o consultanos por WhatsApp." : undefined} /> : products.length ? <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">{products.map(product => <ProductCard key={product.id} product={product} />)}</div> : <div className="mt-5 rounded-2xl border border-zinc-200 bg-white px-6 py-12 text-center"><h2 className="text-lg font-semibold">No encontramos productos con esos filtros</h2><p className="mt-2 text-sm text-zinc-600">Probá otra palabra, subcategoría o rango de precio.</p><Link href="/catalogo" className="mt-5 inline-flex rounded-xl bg-zinc-950 px-5 py-3 text-sm font-semibold text-white">Ver todo el catálogo</Link></div>}
    {pages > 1 && <nav aria-label="Páginas del catálogo" className="mt-9 flex items-center justify-center gap-3 text-sm"><Link aria-disabled={page <= 1} className={`rounded-xl border px-4 py-2 ${page <= 1 ? "pointer-events-none opacity-40" : "bg-white hover:border-sky-400"}`} href={catalogUrl({ category: category?.slug, page: page - 1 })}>Anterior</Link><span className="px-2 font-semibold">Página {page} de {pages}</span><Link aria-disabled={page >= pages} className={`rounded-xl border px-4 py-2 ${page >= pages ? "pointer-events-none opacity-40" : "bg-white hover:border-sky-400"}`} href={catalogUrl({ category: category?.slug, page: page + 1 })}>Siguiente</Link></nav>}
  </div>;
}
