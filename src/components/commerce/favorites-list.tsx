"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Heart, RefreshCw, ShoppingBag } from "lucide-react";
import { useCommerce } from "./commerce-provider";
import { ProductCard } from "./product-card";
import type { Product } from "@/lib/types";

export function FavoritesList() {
  const { favoriteIds, favoritesReady } = useCommerce();
  const [retry, setRetry] = useState(0);
  const [state, setState] = useState<{ products: Product[]; error: string; loading: boolean }>({ products: [], error: "", loading: true });

  useEffect(() => {
    if (!favoritesReady) return;
    let active = true;
    async function load() {
      if (!favoriteIds.length) { setState({ products: [], loading: false, error: "" }); return; }
      setState(s => ({ ...s, loading: true, error: "" }));
      try {
        const products: Product[] = [];
        for (let offset = 0; offset < favoriteIds.length; offset += 50) {
          const response = await fetch(`/api/favorites/products?ids=${encodeURIComponent(favoriteIds.slice(offset, offset + 50).join(","))}`, { cache: "no-store" });
          if (!response.ok) throw new Error();
          products.push(...await response.json());
        }
        const order = new Map(favoriteIds.map((id, index) => [id, index]));
        products.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
        if (active) setState({ products, loading: false, error: "" });
      } catch { if (active) setState({ products: [], loading: false, error: "No pudimos cargar tus favoritos. Revisá tu conexión e intentá nuevamente." }); }
    }
    void load();
    return () => { active = false; };
  }, [favoriteIds, favoritesReady, retry]);

  return <section aria-label="Mis favoritos">
    {!favoritesReady || state.loading ? <div role="status" className="rounded-2xl border border-zinc-200 bg-white p-6"><p className="text-sm font-semibold text-zinc-700">Cargando favoritos…</p><div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">{[0, 1, 2, 3].map(item => <div key={item} className="h-48 animate-pulse rounded-xl bg-zinc-100 motion-reduce:animate-none" />)}</div></div> : state.error ? <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-6"><p className="text-sm text-amber-900">{state.error}</p><button type="button" onClick={() => setRetry(value => value + 1)} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-amber-900 ring-1 ring-amber-200"><RefreshCw className="size-4" /> Reintentar</button></div> : !state.products.length ? <div className="rounded-2xl border border-dashed border-sky-200 bg-sky-50/60 p-7 text-center sm:p-10"><span className="mx-auto grid size-14 place-items-center rounded-2xl bg-white text-sky-700 shadow-sm"><Heart className="size-7" /></span><h3 className="mt-4 text-xl font-bold text-zinc-950">Tu lista de favoritos está lista para empezar</h3><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-zinc-600">Tocá el corazón de un producto para guardarlo acá y encontrarlo fácilmente después.</p><Link href="/catalogo" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-sky-700 px-5 text-sm font-bold text-white hover:bg-sky-800"><ShoppingBag className="size-4" /> Explorar productos <ArrowRight className="size-4" /></Link></div> : <><div className="mb-4 flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold text-zinc-700">{state.products.length} {state.products.length === 1 ? "producto guardado" : "productos guardados"}</p><Link href="/catalogo" className="inline-flex min-h-11 items-center gap-1 text-sm font-bold text-sky-700 hover:underline">Seguir explorando <ArrowRight className="size-4" /></Link></div><div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">{state.products.map(product => <ProductCard key={product.id} product={product} />)}</div></>}
  </section>;
}
