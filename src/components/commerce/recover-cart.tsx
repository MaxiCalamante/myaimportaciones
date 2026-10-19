"use client";
import { useState } from "react";
import Link from "next/link";
import { useCommerce } from "./commerce-provider";
import type { Product } from "@/lib/types";
import { reconcileCart } from "@/lib/cart-reconcile";
export function RecoverCart() {
  const { clearCart, addToCart, cartCount } = useCommerce();
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  async function recover() {
    setBusy(true); setStatus("");
    try {
      const response = await fetch("/api/account/reminder-cart", { cache: "no-store" });
      if (!response.ok) throw new Error();
      const { items } = await response.json() as { items: { id: string; variant_id: string | null; quantity: number }[] };
      if (!items.length) { setStatus("No hay una selección guardada. Podés volver al catálogo."); return; }
      const catalog = await fetch(`/api/favorites/products?ids=${[...new Set(items.map(i => i.id))].join(",")}`, { cache: "no-store" });
      if (!catalog.ok) throw new Error();
      const products = await catalog.json() as Product[];
      const lines = reconcileCart(items.flatMap(i => { const product = products.find(p => p.id === i.id); return product ? [{ product, variantId: i.variant_id, quantity: i.quantity, channel: "retail" as const }] : []; }), products);
      if (!lines.length) { setStatus("Los productos guardados ya no están disponibles. Podés consultar el catálogo actualizado."); return; }
      clearCart();
      for (const l of lines) addToCart(l.product, "retail", l.quantity, l.variantId ? l.product.variants?.find(v => v.id === l.variantId) : null);
      setDone(true); setStatus("Recuperamos tu selección con los precios y la disponibilidad actuales. Revisá el carrito antes de comprar.");
    } catch { setStatus("No pudimos recuperar tu selección. Volvé a intentarlo."); }
    finally { setBusy(false); }
  }
  return <section className="space-y-5 rounded-2xl border bg-white p-6"><h1 className="text-balance text-3xl font-bold">Retomá tu compra</h1><p className="text-pretty text-zinc-600">Recuperá los productos guardados en tu cuenta. Vamos a revisar precios y stock antes de agregarlos.</p>{cartCount > 0 && !done && <p className="rounded-xl bg-amber-50 p-3 text-sm">Tenés {cartCount} productos en este dispositivo. Recuperar la selección guardada reemplazará este carrito.</p>}
    {!done && <button onClick={recover} disabled={busy} className="min-h-11 rounded-xl bg-sky-800 px-5 py-3 font-semibold text-white disabled:opacity-50">{busy ? "Revisando productos…" : "Recuperar selección guardada"}</button>}
    {status && <p role="status" className="text-pretty text-sm">{status}</p>}
    <Link href={done ? "/checkout" : "/catalogo"} className="inline-flex min-h-11 items-center font-semibold text-sky-800">{done ? "Continuar con mi compra →" : "Explorar catálogo →"}</Link>
  </section>;
}
