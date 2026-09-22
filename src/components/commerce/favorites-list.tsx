"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useCommerce } from "./commerce-provider";
import { ProductCard } from "./product-card";
import type { Product } from "@/lib/types";

export function FavoritesList() {
  const { favoriteIds } = useCommerce();
  const [state, setState] = useState<{ products: Product[]; error: string; loading: boolean }>({ products: [], error: "", loading: true });
  useEffect(() => {
    let active = true;
    async function load() {
      setState(s => ({ ...s, loading: true, error: "" }));
      try {
        const products: Product[] = [];
        for (let offset = 0; offset < favoriteIds.length; offset += 50) {
          const response = await fetch(`/api/favorites/products?ids=${encodeURIComponent(favoriteIds.slice(offset, offset + 50).join(","))}`);
          if (!response.ok) throw new Error();
          products.push(...await response.json());
        }
        if (active) setState({ products, loading: false, error: "" });
      } catch { if (active) setState({ products: [], loading: false, error: "No pudimos cargar tus favoritos. Recargá la página para reintentar." }); }
    }
    void load(); return () => { active = false; };
  }, [favoriteIds]);
  return <section className="space-y-5" aria-label="Mis favoritos">
    {state.loading ? <p role="status">Cargando favoritos…</p> : state.error ? <p role="alert">{state.error}</p> : !state.products.length ? <p>Todavía no hay productos disponibles en tus favoritos. <Link href="/catalogo" className="underline">Explorar catálogo</Link></p> : <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{state.products.map(product => <ProductCard key={product.id} product={product} />)}</div>}
  </section>;
}
