"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { X, Minus, Plus, Trash2 } from "lucide-react";
import { useCommerce } from "./commerce-provider";
import { formatCurrency } from "@/lib/format";
import { getWhatsAppUrl } from "@/lib/site";

export function CartDrawer() {
  const { cart, cartOpen, cartTotal, setCartOpen, updateQuantity, removeFromCart } = useCommerce();
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
  return <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setCartOpen(false)}>
    <aside ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="cart-title" className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white p-5 shadow-xl" onClick={e => e.stopPropagation()} onKeyDown={e => {
      if (e.key === "Escape") setCartOpen(false);
      if (e.key === "Tab") {
        const nodes = panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled)');
        if (!nodes?.length) return;
        const first = nodes[0], last = nodes[nodes.length-1];
        if (e.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) { e.preventDefault(); last.focus(); }
        if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }}>
      <div className="flex items-center justify-between border-b pb-4"><h2 id="cart-title" className="text-xl font-bold">Tu carrito</h2><button type="button" aria-label="Cerrar carrito" onClick={() => setCartOpen(false)} className="p-3"><X /></button></div>
      <div className="flex-1 overflow-y-auto py-4">
        {!cart.length && <p>Tu carrito está vacío. <Link href="/catalogo" onClick={() => setCartOpen(false)} className="text-sky-700 underline">Ver catálogo</Link></p>}
        {cart.map(line => <div key={`${line.product.id}-${line.channel}`} className="border-b py-4">
          <Link href={`/producto/${line.product.slug}`} onClick={() => setCartOpen(false)} className="font-semibold">{line.product.title}</Link>
          <p className="my-2">{formatCurrency(line.product.retailPrice * line.quantity)}</p>
          <div className="flex items-center gap-3"><button aria-label="Restar unidad" onClick={() => updateQuantity(line.product.id, line.channel, line.quantity-1)} className="rounded border p-3"><Minus size={16}/></button><span>{line.quantity}</span><button aria-label="Sumar unidad" disabled={line.quantity >= Math.min(line.product.stock,100)} onClick={() => updateQuantity(line.product.id,line.channel,line.quantity+1)} className="rounded border p-3 disabled:opacity-40"><Plus size={16}/></button><button aria-label="Quitar producto" onClick={() => removeFromCart(line.product.id,line.channel)} className="ml-auto p-3"><Trash2 size={18}/></button></div>
        </div>)}
      </div>
      {cart.length > 0 && <div className="space-y-3 border-t pt-4"><p className="flex justify-between font-bold"><span>Subtotal productos</span><span>{formatCurrency(cartTotal)}</span></p><p className="text-xs text-slate-600">Entrega y promociones disponibles se calculan antes de confirmar. Los descuentos no se acumulan.</p><Link href="/checkout" onClick={() => setCartOpen(false)} className="block rounded-xl bg-sky-700 p-3 text-center font-bold text-white">Continuar compra</Link><a href={getWhatsAppUrl(`Hola MYA! Quisiera consultar este pedido: ${cart.map(l => `${l.quantity} × ${l.product.title}`).join("; ")}. Subtotal de referencia ${formatCurrency(cartTotal)}; entrega a confirmar.`)} target="_blank" rel="noopener noreferrer" className="block text-center text-sm text-sky-700 underline">Consultar por WhatsApp</a></div>}
    </aside>
  </div>;
}
