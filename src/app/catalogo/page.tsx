import Link from "next/link";
import { ProductCard } from "@/components/commerce/product-card";
import { getStorefrontData, mapProduct } from "@/lib/storefront";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/supabase/env";
export const metadata = { title: "Catálogo minorista", description: "Belleza y herramientas. Consultá disponibilidad y condiciones de entrega." };
export default async function CatalogPage({ searchParams }: { searchParams: Promise<{ q?: string; category?: string; page?: string; sort?: string; brand?: string }> }) {
  const params = await searchParams;
  const q = (params.q ?? "").replace(/[%_]/g, "").trim().slice(0, 100);
  const page = Math.min(200, Math.max(1, Number.parseInt(params.page ?? "1") || 1));
  const { categories, products: fallback } = await getStorefrontData({ limit: 0 });
  const category = categories.find(c => c.slug === params.category);
  let products = fallback, count = 0, failed = false;
  let brands: { brand: string; count: number }[] = [];
  const brand = (params.brand ?? "").trim().slice(0, 80);
  if (hasSupabaseConfig()) {
    const db = await createServerSupabaseClient();
    const facets = await db.rpc("public_catalog_facets");
    brands = facets.data?.brands ?? [];
    const ids = category ? categories.filter(c => c.id === category.id || c.parentId === category.id).map(c => c.id) : categories.filter(c => !c.wholesaleOnly).map(c => c.id);
    let query = db.from("products").select("*, categories(name)", { count: "exact" }).eq("is_active", true).eq("is_wholesale_only", false).in("category_id", ids);
    if (brand) query = query.eq("brand", brand);
    if (q) query = query.ilike("title", `%${q}%`);
    query = params.sort === "price_asc" ? query.order("retail_price") : params.sort === "price_desc" ? query.order("retail_price", { ascending: false }) : query.order("is_featured", { ascending: false }).order("title");
    const result = await query.order("id").range((page - 1) * 24, page * 24 - 1);
    products = (result.data ?? []).map(p => mapProduct(p)); count = result.count ?? 0; failed = Boolean(result.error);
  }
  const pages = Math.ceil(count / 24);
  function pageUrl(n: number) { const query = new URLSearchParams({ q, brand, category: category?.slug ?? "", sort: params.sort ?? "", page: String(n) }); return `/catalogo?${query}`; }
  return <div className="mx-auto max-w-7xl px-4 py-10">
    {category?.parentId && <nav aria-label="Ubicación" className="mb-3 text-sm"><Link href="/catalogo" className="underline">Catálogo</Link> / <Link className="underline" href={`/catalogo?category=${categories.find(c => c.id === category.parentId)?.slug}`}>{categories.find(c => c.id === category.parentId)?.name}</Link> / {category.name}</nav>}
    <h1 className="text-3xl font-bold">{category?.name ?? "Catálogo minorista"}</h1>
    <p className="my-3 text-zinc-600">Precios en pesos argentinos. La disponibilidad se confirma en cada ficha.</p>
    <form className="my-6 flex flex-wrap gap-3" action="/catalogo">
      <input aria-label="Buscar productos" name="q" defaultValue={q} placeholder="Buscar producto o marca" className="min-w-0 flex-1 rounded-xl border p-3" />
      <select aria-label="Categoría y subcategoría" name="category" defaultValue={category?.slug ?? ""} className="max-w-full rounded-xl border p-3"><option value="">Todas las categorías</option>{categories.filter(c => !c.wholesaleOnly && !c.parentId).map(root => <optgroup key={root.id} label={root.name}><option value={root.slug}>Todo en {root.name}</option>{categories.filter(c => c.parentId === root.id && !c.wholesaleOnly).sort((a,b) => a.name.localeCompare(b.name, "es")).map(c => <option key={c.id} value={c.slug}>{c.name}</option>)}</optgroup>)}</select>
      <select aria-label="Marca" name="brand" defaultValue={brand} className="max-w-full rounded-xl border p-3"><option value="">Todas las marcas</option>{brands.map(b => <option key={b.brand} value={b.brand}>{b.brand} ({b.count})</option>)}</select>
      <select aria-label="Ordenar" name="sort" defaultValue={params.sort ?? ""} className="rounded-xl border p-3"><option value="">Destacados</option><option value="price_asc">Menor precio</option><option value="price_desc">Mayor precio</option></select>
      <button className="rounded-xl bg-zinc-950 px-5 py-3 text-white">Buscar</button>
    </form>
    <p className="mb-4 text-sm">{failed ? "No pudimos cargar el catálogo. Intentá nuevamente." : `${count} productos encontrados`}</p>
    {!failed && !products.length && <p>Probá otra búsqueda o categoría.</p>}
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">{products.map(p => <ProductCard key={p.id} product={p} />)}</div>
    {pages > 1 && <nav aria-label="Páginas del catálogo" className="mt-8 flex justify-center gap-5">{page > 1 && <Link href={pageUrl(page - 1)}>Anterior</Link>}<span>Página {page} de {pages}</span>{page < pages && <Link href={pageUrl(page + 1)}>Siguiente</Link>}</nav>}
  </div>;
}
