"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutGrid, ShoppingBag, Truck, MessageCircle } from "lucide-react";
import { useCommerce } from "@/components/commerce/commerce-provider";

export function MobileBottomNav({ signedIn }: { signedIn: boolean }) {
  const pathname = usePathname();
  const { cartCount, setCartOpen, openWhatsApp } = useCommerce();

  // Hide on admin routes, product detail (handled by StickyMobileBuyBar) and checkout (frictionless tunnel)
  if (
    pathname?.startsWith("/admin") ||
    pathname?.startsWith("/producto/") ||
    pathname?.startsWith("/checkout")
  ) {
    return null;
  }

  const isHome = pathname === "/";
  const isCatalog = pathname === "/catalogo";
  const orderPath = signedIn ? "/cuenta" : "/seguimiento";
  const isTracking = pathname?.startsWith(orderPath);

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 block md:hidden bg-white/95 backdrop-blur-md border-t border-zinc-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <nav aria-label="Navegación principal móvil" className="flex items-center justify-around h-16 px-2">
        {/* Home */}
        <Link
          href="/"
          aria-current={isHome ? "page" : undefined}
          className={`flex flex-col items-center justify-center flex-1 h-full transition active:scale-95 ${
            isHome ? "text-sky-600 font-bold" : "text-zinc-600 hover:text-zinc-950"
          }`}
        >
          <Home className="h-5 w-5" />
          <span className="text-[10px] mt-1">Inicio</span>
        </Link>

        {/* Catalog */}
        <Link
          href="/catalogo"
          aria-current={isCatalog ? "page" : undefined}
          className={`flex flex-col items-center justify-center flex-1 h-full transition active:scale-95 ${isCatalog ? "text-sky-700 font-bold" : "text-zinc-600 hover:text-zinc-950"}`}
        >
          <LayoutGrid className="h-5 w-5" />
          <span className="text-[10px] mt-1">Catálogo</span>
        </Link>

        {/* Cart Drawer Trigger */}
        <button
          type="button"
          onClick={() => setCartOpen(true)}
          className="relative flex flex-col items-center justify-center flex-1 h-full text-zinc-600 hover:text-zinc-950 transition active:scale-95 cursor-pointer"
        >
          <div className="relative">
            <ShoppingBag className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-2 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-sky-700 text-[9px] font-black text-white shadow-xs">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-1">Carrito</span>
        </button>

        {/* Order Tracking */}
        <Link
          href={orderPath}
          aria-current={isTracking ? "page" : undefined}
          className={`flex flex-col items-center justify-center flex-1 h-full transition active:scale-95 ${
            isTracking ? "text-sky-600 font-bold" : "text-zinc-600 hover:text-zinc-950"
          }`}
        >
          <Truck className="h-5 w-5" />
          <span className="text-[10px] mt-1">{signedIn ? "Mis pedidos" : "Seguimiento"}</span>
        </Link>

        {/* WhatsApp Modal Trigger (Máximo o Agustina) */}
        <button
          type="button"
          onClick={() => openWhatsApp("Hola MYA Importaciones! Quisiera hacer una consulta.")}
          className="flex flex-col items-center justify-center flex-1 h-full text-emerald-700 font-semibold hover:text-emerald-800 transition active:scale-95 cursor-pointer"
        >
          <MessageCircle className="h-5 w-5" />
          <span className="text-[10px] mt-1">WhatsApp</span>
        </button>
      </nav>
    </div>
  );
}
