"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutGrid, ShoppingBag, Truck, MessageCircle } from "lucide-react";
import { useCommerce } from "@/components/commerce/commerce-provider";

export function MobileBottomNav({ signedIn }: { signedIn: boolean }) {
  const pathname = usePathname();
  const { cartCount, cartOpen, setCartOpen, openWhatsApp } = useCommerce();

  if (pathname?.startsWith("/admin") || pathname?.startsWith("/producto/") || pathname?.startsWith("/checkout")) return null;

  const isHome = pathname === "/";
  const isCatalog = pathname === "/catalogo" || Boolean(pathname?.startsWith("/catalogo/"));
  const orderPath = signedIn ? "/cuenta" : "/seguimiento";
  const isTracking = pathname === orderPath || Boolean(pathname?.startsWith(`${orderPath}/`));
  const itemClass = (active = false, whatsapp = false) => `flex h-12 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl text-[10px] leading-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 ${active ? "bg-sky-50 font-semibold text-sky-800" : whatsapp ? "font-medium text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800" : "font-medium text-zinc-500 hover:bg-zinc-50 hover:text-zinc-950"}`;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200/80 bg-white md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <nav aria-label="Navegación principal móvil" className="mx-auto flex h-15 max-w-lg items-center gap-1 px-2 [&_svg]:size-5 [&_svg]:stroke-[1.65]">
        <Link href="/" aria-current={isHome ? "page" : undefined} className={itemClass(isHome)}>
          <Home aria-hidden="true" /><span>Inicio</span>
        </Link>
        <Link href="/catalogo" aria-current={isCatalog ? "page" : undefined} className={itemClass(isCatalog)}>
          <LayoutGrid aria-hidden="true" /><span>Catálogo</span>
        </Link>
        <button type="button" aria-label={cartCount ? `Carrito, ${cartCount} ${cartCount === 1 ? "producto" : "productos"}` : "Carrito"}
          aria-haspopup="dialog" aria-expanded={cartOpen} onClick={() => setCartOpen(true)} className={itemClass(cartOpen)}>
          <span className="relative"><ShoppingBag aria-hidden="true" />
            {cartCount > 0 && <span aria-hidden="true" className="absolute -right-2 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-sky-700 px-1 text-[9px] font-semibold leading-none text-white">{cartCount > 99 ? "99+" : cartCount}</span>}
          </span>
          <span>Carrito</span>
        </button>
        <Link href={orderPath} aria-current={isTracking ? "page" : undefined} className={itemClass(isTracking)}>
          <Truck aria-hidden="true" /><span>Mis pedidos</span>
        </Link>
        <button type="button" onClick={() => openWhatsApp("Hola MYA Importaciones! Quisiera hacer una consulta.")}
          className={itemClass(false, true)}>
          <MessageCircle aria-hidden="true" /><span>WhatsApp</span>
        </button>
      </nav>
    </div>
  );
}
