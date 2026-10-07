"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef } from "react";
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { purchasableQuantity } from "@/lib/commerce-policy";
import { formatCurrency } from "@/lib/format";
import { getWhatsAppUrl } from "@/lib/site";
import { useCommerce } from "./commerce-provider";

export function CartDrawer({ checkoutEnabled }: { checkoutEnabled: boolean }) {
  const { cart, cartOpen, cartCount, cartTotal, setCartOpen, updateQuantity, removeFromCart } = useCommerce();
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!cartOpen) return;
    const previous = document.activeElement as HTMLElement;
    panel.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = overflow; previous?.focus(); };
  }, [cartOpen]);
  if (!cartOpen) return null;

  const whatsapp = getWhatsAppUrl(`Hola MYA, quisiera confirmar disponibilidad y entrega de: ${cart.map(line => `${line.quantity} × ${line.product.title}`).join("; ")}. Subtotal de referencia ${formatCurrency(cartTotal)}; entrega a cotizar.`);
  return <div className="fixed inset-0 z-50 bg-zinc-950/55" onClick={() => setCartOpen(false)}>
    <aside ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="cart-title" className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-2xl" onClick={event => event.stopPropagation()} onKeyDown={event => {
      if (event.key === "Escape") setCartOpen(false);
      if (event.key === "Tab") {
        const nodes = panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled)');
        if (!nodes?.length) return;
        const first = nodes[0], last = nodes[nodes.length - 1];
        if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) { event.preventDefault(); last.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    }}>
      <header className="flex items-start justify-between gap-3 border-b border-zinc-200 px-5 py-5 sm:px-6"><div><p className="text-xs font-bold uppercase tracking-widest text-sky-700">Tu selección</p><h2 id="cart-title" className="mt-1 text-2xl font-bold text-zinc-950">Carrito</h2><p className="mt-1 text-xs text-zinc-500">{cartCount} {cartCount === 1 ? "producto" : "productos"}</p></div><button type="button" aria-label="Cerrar carrito" onClick={() => setCartOpen(false)} className="grid size-11 shrink-0 place-items-center rounded-xl border border-zinc-200 text-zinc-700 hover:bg-zinc-50"><X className="size-5" /></button></header>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
        {!cart.length ? <div className="flex h-full min-h-80 flex-col items-center justify-center text-center"><span className="grid size-16 place-items-center rounded-2xl bg-sky-50 text-sky-700"><ShoppingBag className="size-8" /></span><h3 className="mt-5 text-xl font-bold text-zinc-950">Tu carrito está vacío</h3><p className="mt-2 max-w-xs text-sm leading-6 text-zinc-600">Explorá el catálogo y agregá los productos que te interesan. Podrás revisarlos acá antes de consultar la entrega.</p><Link href="/catalogo" onClick={() => setCartOpen(false)} className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-sky-700 px-5 text-sm font-bold text-white hover:bg-sky-800">Explorar catálogo <ArrowRight className="size-4" /></Link><Link href="/favoritos" onClick={() => setCartOpen(false)} className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-sky-700 hover:underline">Ver mis favoritos</Link></div> : <div className="space-y-3">{cart.map(line => {
          const unitPrice = line.channel === "wholesale" ? line.product.wholesalePrice : line.product.retailPrice;
          return <article key={`${line.product.id}-${line.channel}`} className="flex gap-3 rounded-2xl border border-zinc-200 p-3"><Link href={`/producto/${line.product.slug}`} onClick={() => setCartOpen(false)} className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-slate-50"><Image src={line.product.imageUrl || "/placeholder-product.svg"} alt={line.product.title} fill sizes="80px" className="object-contain p-2" /></Link><div className="min-w-0 flex-1"><Link href={`/producto/${line.product.slug}`} onClick={() => setCartOpen(false)} className="line-clamp-2 text-sm font-bold leading-5 text-zinc-950 hover:text-sky-700">{line.product.title}</Link><p className="mt-1 text-xs text-zinc-500">{formatCurrency(unitPrice)} por unidad</p><p className="mt-1 text-base font-bold tabular-nums text-zinc-950">{formatCurrency(unitPrice * line.quantity)}</p><div className="mt-3 flex items-center justify-between gap-2"><div className="flex h-11 items-center rounded-xl border border-zinc-200"><button type="button" aria-label={`Restar una unidad de ${line.product.title}`} onClick={() => updateQuantity(line.product.id, line.channel, line.quantity - 1)} className="grid size-11 place-items-center rounded-l-xl hover:bg-zinc-50"><Minus className="size-4" /></button><span className="min-w-6 text-center text-sm font-bold tabular-nums">{line.quantity}</span><button type="button" aria-label={`Sumar una unidad de ${line.product.title}`} disabled={line.quantity >= purchasableQuantity(line.product)} onClick={() => updateQuantity(line.product.id, line.channel, line.quantity + 1)} className="grid size-11 place-items-center rounded-r-xl hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"><Plus className="size-4" /></button></div><button type="button" aria-label={`Quitar ${line.product.title} del carrito`} onClick={() => removeFromCart(line.product.id, line.channel)} className="grid size-11 place-items-center rounded-xl text-zinc-500 hover:bg-red-50 hover:text-red-600"><Trash2 className="size-4" /></button></div></div></article>;
        })}</div>}
      </div>
      {cart.length > 0 && <footer className="shrink-0 border-t border-zinc-200 bg-white px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 shadow-[0_-8px_24px_rgba(0,0,0,0.04)] sm:px-6"><div className="flex items-center justify-between gap-3"><span className="text-sm font-semibold text-zinc-700">Subtotal</span><strong className="text-xl tabular-nums text-zinc-950">{formatCurrency(cartTotal)}</strong></div><p className="mt-2 text-xs leading-5 text-zinc-600">Envíos a todo el país por Correo Argentino. Consultá las opciones de entrega y su cotización antes de confirmar la compra.</p><Link href="/checkout" onClick={() => setCartOpen(false)} className="mt-4 flex min-h-12 items-center justify-center gap-2 rounded-xl bg-sky-700 px-4 text-sm font-bold text-white hover:bg-sky-800">{checkoutEnabled ? "Continuar al checkout" : "Ver cómo coordinar la compra"}<ArrowRight className="size-4" /></Link><a href={whatsapp} target="_blank" rel="noopener noreferrer" className="mt-2 flex min-h-11 items-center justify-center rounded-xl border border-zinc-200 text-sm font-semibold text-sky-700 hover:border-sky-300">Consultar este carrito por WhatsApp</a><Link href="/catalogo" onClick={() => setCartOpen(false)} className="mt-2 flex min-h-11 items-center justify-center text-sm font-semibold text-zinc-600 hover:text-sky-700">Seguir explorando</Link></footer>}
    </aside>
  </div>;
}
