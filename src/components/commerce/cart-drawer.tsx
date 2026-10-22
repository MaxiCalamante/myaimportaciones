"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef } from "react";
import { ArrowRight, ShoppingBag, Trash2, X, ShieldCheck, Truck, Check, Smartphone, Sparkles, Gem, Wrench } from "lucide-react";
import { purchasableQuantity } from "@/lib/commerce-policy";
import { formatCurrency } from "@/lib/format";
import { QuantityStepper } from "./quantity-stepper";
import { useCommerce } from "./commerce-provider";

export function CartDrawer({ checkoutEnabled }: { checkoutEnabled: boolean }) {
  const { cart, cartReady, cartOpen, cartCount, cartTotal, setCartOpen, updateQuantity, removeFromCart, openWhatsApp } = useCommerce();
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

  const whatsappMessage = `Hola MYA, quisiera confirmar disponibilidad y entrega de: ${cart.map(line => `${line.quantity} × ${line.product.title}${line.variantTitle ? ` (${line.variantTitle})` : ""}`).join("; ")}. Subtotal de referencia ${formatCurrency(cartTotal)}; entrega a cotizar.`;
  return <div className="fixed inset-0 z-50 bg-zinc-950/55" onClick={() => setCartOpen(false)}>
    <aside ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="cart-title" className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-2xl rounded-none overflow-hidden sm:rounded-l-3xl" onClick={event => event.stopPropagation()} onKeyDown={event => {
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
      <div className="flex items-center justify-around border-b border-zinc-100 bg-zinc-50/90 px-4 py-2 text-[11px] text-zinc-600 font-semibold">
        <span className="flex items-center gap-1">
          <ShieldCheck className="size-3.5 text-emerald-600 shrink-0" />
          Compra 100% Segura
        </span>
        <span className="text-zinc-300">•</span>
        <span className="flex items-center gap-1">
          <Truck className="size-3.5 text-sky-600 shrink-0" />
          Correo Argentino
        </span>
        <span className="text-zinc-300">•</span>
        <span className="flex items-center gap-1">
          <Check className="size-3.5 text-indigo-600 shrink-0" />
          Garantía Tandil
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6">
        {!cartReady ? <div role="status" className="space-y-4"><p className="text-sm text-zinc-500">Recuperando tu carrito…</p><div className="h-32 animate-pulse rounded-xl bg-zinc-100 motion-reduce:animate-none" aria-hidden="true"/></div> : !cart.length ? (
          <div className="flex h-full min-h-80 flex-col items-center justify-center text-center px-2 py-6">
            <span className="grid size-16 place-items-center rounded-2xl bg-sky-50 text-sky-700 shadow-xs">
              <ShoppingBag className="size-8" />
            </span>
            <h3 className="mt-4 text-xl font-bold text-zinc-950">Tu carrito está vacío</h3>
            <p className="mt-2 max-w-xs text-xs sm:text-sm leading-5 text-zinc-600">
              Explorá nuestros rubros principales y agregá tus productos preferidos:
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2 w-full max-w-xs text-left">
              <Link
                href="/catalogo?category=electronica"
                onClick={() => setCartOpen(false)}
                className="flex items-center gap-2 p-2.5 rounded-xl border border-zinc-200 hover:border-sky-300 hover:bg-sky-50/50 transition text-xs font-bold text-zinc-800"
              >
                <Smartphone className="size-4 text-sky-600 shrink-0" />
                <span>Electrónica</span>
              </Link>
              <Link
                href="/catalogo?category=cosmetica"
                onClick={() => setCartOpen(false)}
                className="flex items-center gap-2 p-2.5 rounded-xl border border-zinc-200 hover:border-pink-300 hover:bg-pink-50/50 transition text-xs font-bold text-zinc-800"
              >
                <Sparkles className="size-4 text-pink-600 shrink-0" />
                <span>K-Beauty</span>
              </Link>
              <Link
                href="/catalogo?category=perfumeria"
                onClick={() => setCartOpen(false)}
                className="flex items-center gap-2 p-2.5 rounded-xl border border-zinc-200 hover:border-purple-300 hover:bg-purple-50/50 transition text-xs font-bold text-zinc-800"
              >
                <Gem className="size-4 text-purple-600 shrink-0" />
                <span>Perfumería</span>
              </Link>
              <Link
                href="/catalogo?category=herramientas"
                onClick={() => setCartOpen(false)}
                className="flex items-center gap-2 p-2.5 rounded-xl border border-zinc-200 hover:border-blue-300 hover:bg-blue-50/50 transition text-xs font-bold text-zinc-800"
              >
                <Wrench className="size-4 text-blue-600 shrink-0" />
                <span>Herramientas</span>
              </Link>
            </div>
            <Link
              href="/catalogo"
              onClick={() => setCartOpen(false)}
              className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-sky-700 px-6 text-xs sm:text-sm font-bold text-white hover:bg-sky-800 shadow-xs"
            >
              Ver catálogo completo <ArrowRight className="size-4" />
            </Link>
          </div>
        ) : <div className="space-y-3">{cart.map(line => {
          const unitPrice = line.variantPrice != null ? line.variantPrice : (line.channel === "wholesale" ? line.product.wholesalePrice : line.product.retailPrice);
          const lineKey = `${line.product.id}-${line.channel}-${line.variantId || "base"}`;
          const imageSrc = line.variantImage || line.product.imageUrl || "/placeholder-product.svg";
          const targetItem = line.variantId ? line.product.variants?.find(v => v.id === line.variantId) || line.product : line.product;
          const maxQty = purchasableQuantity(targetItem);
          return <article key={lineKey} className="flex gap-3 rounded-2xl border border-zinc-200 p-3"><Link href={`/producto/${line.product.slug}`} onClick={() => setCartOpen(false)} className="relative size-16 shrink-0 sm:size-20 overflow-hidden rounded-xl bg-slate-50"><Image src={imageSrc} alt={line.variantTitle ? `${line.product.title} (${line.variantTitle})` : line.product.title} fill sizes="80px" className="object-contain p-2" /></Link><div className="min-w-0 flex-1"><Link href={`/producto/${line.product.slug}`} onClick={() => setCartOpen(false)} className="line-clamp-2 text-sm font-bold leading-5 text-zinc-950 hover:text-sky-700">{line.product.title}</Link>{line.variantTitle && <div className="mt-1 flex flex-wrap items-center gap-1.5"><span className="inline-flex items-center gap-1 rounded-md max-w-full break-words bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-800 border border-sky-200/80"><span className="size-1.5 rounded-full bg-sky-600"></span>{line.variantTitle}</span>{line.variantSku && <span className="break-all text-[10px] text-zinc-400">{line.variantSku}</span>}</div>}<p className="mt-1 text-xs text-zinc-500">{formatCurrency(unitPrice)} por unidad</p><p className="mt-1 text-base font-bold tabular-nums text-zinc-950">{formatCurrency(unitPrice * line.quantity)}</p><div className="mt-3 flex flex-wrap items-center justify-between gap-2"><QuantityStepper quantity={line.quantity} min={line.channel === "wholesale" ? line.product.wholesaleMinQuantity : 1} max={maxQty} onChange={value => updateQuantity(line.product.id, line.channel, value, line.variantId)} label={`Cantidad de ${line.product.title}`}/><button type="button" aria-label={`Quitar ${line.product.title} del carrito`} onClick={() => removeFromCart(line.product.id, line.channel, line.variantId)} className="grid size-11 place-items-center rounded-xl text-zinc-500 hover:bg-red-50 hover:text-red-600"><Trash2 className="size-4" /></button></div></div></article>;
        })}</div>}
      </div>
      {cart.length > 0 && <footer className="shrink-0 border-t border-zinc-200 bg-white px-4 pt-4 shadow-[0_-8px_24px_rgba(0,0,0,0.04)] sm:px-6" style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}><div className="flex items-center justify-between gap-3"><span className="text-sm font-semibold text-zinc-700">Subtotal</span><strong className="text-xl tabular-nums text-zinc-950 font-black">{formatCurrency(cartTotal)}</strong></div><div className="mt-2.5 flex items-center justify-between gap-2 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 px-3.5 py-2.5 text-xs text-emerald-950 font-medium"><div><span className="flex items-center gap-1.5 font-extrabold text-emerald-900"><span className="size-2 rounded-full bg-emerald-600 animate-pulse" />Abonando por transferencia:</span><span className="text-[11px] font-bold text-emerald-700 block mt-0.5">¡Ahorrás {formatCurrency(Math.round(cartTotal * 0.03))} en tu compra!</span></div><span className="tabular-nums font-black text-emerald-900 text-base">{formatCurrency(Math.round(cartTotal * 0.97))}</span></div><p className="mt-2 text-xs leading-5 text-zinc-500">Envíos a todo el país por Correo Argentino y retiros en Tandil.</p><Link href="/checkout" onClick={() => setCartOpen(false)} className="mt-4 flex min-h-12 items-center justify-center gap-2 rounded-xl bg-sky-700 px-4 text-sm font-bold text-white hover:bg-sky-800 active:scale-98 transition shadow-xs"><ShieldCheck className="size-4.5 text-sky-200" /><span>{checkoutEnabled ? "Iniciar Compra Segura" : "Coordinar mi compra"}</span><ArrowRight className="size-4" /></Link><button type="button" onClick={() => { setCartOpen(false); openWhatsApp(whatsappMessage); }} className="mt-2.5 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50/60 text-sm font-bold text-emerald-800 hover:bg-emerald-100/70 transition cursor-pointer"><span>Consultar disponibilidad por WhatsApp</span></button><Link href="/catalogo" onClick={() => setCartOpen(false)} className="mt-2 flex min-h-10 items-center justify-center text-xs font-semibold text-zinc-500 hover:text-sky-700 transition">Seguir explorando productos</Link></footer>}
    </aside>
  </div>;
}
