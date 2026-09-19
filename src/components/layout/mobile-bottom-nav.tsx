"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutGrid, ShoppingBag, Truck, MessageCircle } from "lucide-react";
import { useCommerce } from "@/components/commerce/commerce-provider";
import { siteConfig, getWhatsAppUrl } from "@/lib/site";

export function MobileBottomNav() {
  const pathname = usePathname();
  const { cartCount, setCartOpen } = useCommerce();

  // Hide on admin routes
  if (pathname?.startsWith("/admin")) {
    return null;
  }

  const isHome = pathname === "/";
  const isTracking = pathname === "/seguimiento";
  const isWholesale = pathname?.startsWith("/mayorista");

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 block md:hidden bg-white/95 backdrop-blur-md border-t border-zinc-200 shadow-lg safe-area-bottom">
      <nav className="flex items-center justify-around h-16 px-2">
        {/* Home */}
        <Link
          href="/"
          className={`flex flex-col items-center justify-center flex-1 h-full transition ${
            isHome ? "text-sky-600 font-bold" : "text-zinc-600 hover:text-zinc-950"
          }`}
        >
          <Home className="h-5 w-5" />
          <span className="text-[10px] mt-1">Inicio</span>
        </Link>

        {/* Catalog */}
        <Link
          href="/#catalogo"
          className="flex flex-col items-center justify-center flex-1 h-full text-zinc-600 hover:text-zinc-950 transition"
        >
          <LayoutGrid className="h-5 w-5" />
          <span className="text-[10px] mt-1">Catálogo</span>
        </Link>

        {/* Cart Drawer Trigger */}
        <button
          type="button"
          onClick={() => setCartOpen(true)}
          className="relative flex flex-col items-center justify-center flex-1 h-full text-zinc-600 hover:text-zinc-950 transition cursor-pointer"
        >
          <div className="relative">
            <ShoppingBag className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-[9px] font-bold text-white shadow-xs animate-in zoom-in">
                {cartCount}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-1">Carrito</span>
        </button>

        {/* Order Tracking */}
        <Link
          href="/seguimiento"
          className={`flex flex-col items-center justify-center flex-1 h-full transition ${
            isTracking ? "text-sky-600 font-bold" : "text-zinc-600 hover:text-zinc-950"
          }`}
        >
          <Truck className="h-5 w-5" />
          <span className="text-[10px] mt-1">Seguimiento</span>
        </Link>

        {/* Direct WhatsApp */}
        <a
          href={getWhatsAppUrl("Hola MYA Importaciones! Quisiera hacer una consulta.")}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center justify-center flex-1 h-full text-emerald-600 font-semibold hover:text-emerald-700 transition"
        >
          <MessageCircle className="h-5 w-5" />
          <span className="text-[10px] mt-1">WhatsApp</span>
        </a>
      </nav>
    </div>
  );
}
