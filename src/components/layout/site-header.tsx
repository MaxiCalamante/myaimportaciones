"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ChevronDown, Heart, Menu, MessageCircle, Search, ShieldCheck, ShoppingBag, Store, User, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { useCommerce } from "@/components/commerce/commerce-provider";
import { useModalFocus } from "@/components/ui/use-modal-focus";
import { WHOLESALE_ENABLED } from "@/lib/commerce-policy";
import type { Category } from "@/lib/types";
import type { Profile } from "@/lib/auth";
import { ProductSearch } from "./product-search";
import { CategoryNavigation } from "./category-navigation";

function BrandMark() {
  return <span className="relative block h-10 w-[74px] shrink-0 overflow-hidden sm:w-20">
    <Image src="/mya-mark-white.png" alt="" width={96} height={96}
      className="absolute left-1/2 top-1/2 size-[86px] max-w-none -translate-x-1/2 -translate-y-1/2 object-contain sm:size-24" />
  </span>;
}

export function SiteHeader({ initialCategories = [], profile = null }: {
  initialCategories?: Category[];
  profile?: Profile | null;
}) {
  const pathname = usePathname();
  const isWholesalePage = Boolean(pathname?.startsWith("/mayorista"));
  const isWholesale = isWholesalePage && WHOLESALE_ENABLED;
  const { cartCount, favoritesCount, cartOpen, setCartOpen, openWhatsApp } = useCommerce();
  const categories = initialCategories.filter(category => isWholesale || !category.wholesaleOnly);
  const catalogPath = isWholesale ? "/mayorista" : "/catalogo";
  const brandName = "MYA";
  const isWholesaleAllowed = WHOLESALE_ENABLED && Boolean(profile?.isApprovedWholesale || profile?.customerTier === "wholesale" || profile?.role === "admin");
  const [menuState, setMenuState] = useState<{ pathname: string | null; focusSearch: boolean } | null>(null);
  // Layouts persist between routes; a navigation always dismisses the current drawer.
  if (menuState && menuState.pathname !== pathname) setMenuState(null);
  const open = menuState !== null && menuState.pathname === pathname;
  const [categoriesMenuOpen, setCategoriesMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const menuPanelRef = useRef<HTMLElement>(null);
  const menuOverlayRef = useRef<HTMLDivElement>(null);
  const categoryButtonRef = useRef<HTMLButtonElement>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openedByHoverRef = useRef(false);
  const closeMenu = () => setMenuState(null);
  const openMenu = (focusSearch: boolean) => {
    setCategoriesMenuOpen(false);
    setMenuState({ pathname, focusSearch });
  };

  useEffect(() => {
    if (!categoriesMenuOpen) return;
    const dismiss = (event: PointerEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) setCategoriesMenuOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setCategoriesMenuOpen(false);
        categoryButtonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", escape);
    };
  }, [categoriesMenuOpen]);

  // The portal keeps the drawer outside the page we make inert, including its bottom navigation.
  // Restore inert before useModalFocus restores focus to the original trigger.
  useEffect(() => {
    if (!open) return;
    const overlay = menuOverlayRef.current;
    const previous = new Map<HTMLElement, boolean>();
    const disableBackground = () => {
      for (const child of document.body.children) {
        if (!(child instanceof HTMLElement) || child === overlay || child.contains(overlay)) continue;
        if (!previous.has(child)) previous.set(child, child.inert);
        child.inert = true;
      }
    };
    disableBackground();
    const observer = new MutationObserver(disableBackground);
    observer.observe(document.body, { childList: true });
    const resize = () => { if (window.innerWidth >= 1280) setMenuState(null); };
    window.addEventListener("resize", resize);
    return () => {
      observer.disconnect();
      for (const [element, inert] of previous) element.inert = inert;
      window.removeEventListener("resize", resize);
    };
  }, [open]);
  useModalFocus(menuPanelRef, open);
  useEffect(() => {
    if (open && menuState?.focusSearch) menuPanelRef.current?.querySelector<HTMLInputElement>("#mobile-search-input")?.focus();
  }, [open, menuState?.focusSearch]);
  useEffect(() => () => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
  }, []);

  const handleMouseEnterMenu = () => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    if (!categoriesMenuOpen) {
      openedByHoverRef.current = true;
      setCategoriesMenuOpen(true);
    }
  };
  const handleMouseLeaveMenu = () => {
    closeTimeoutRef.current = setTimeout(() => setCategoriesMenuOpen(false), 220);
  };
  const linkClass = "inline-flex min-h-11 shrink-0 items-center whitespace-nowrap rounded-lg px-3 text-sm font-medium text-zinc-600 transition-colors hover:bg-sky-50 hover:text-sky-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600";
  const iconButtonClass = "grid size-11 shrink-0 place-items-center rounded-full text-zinc-700 transition-colors hover:bg-sky-50 hover:text-sky-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600";

  return <>
      <div className="bg-zinc-950 text-zinc-200">
        <div className="mx-auto flex h-6 max-w-7xl items-center justify-center gap-4 px-3 text-[9px] tracking-[0.015em] sm:justify-between sm:px-6 sm:text-[10px] lg:px-8">
          <p className="truncate">Envíos a toda Argentina <span className="mx-1.5 text-zinc-600">·</span> Atención de Máximo y Agustina</p>
          <button type="button" onClick={() => openWhatsApp("Hola MYA Importaciones, quiero hacer una consulta.")}
            className="hidden h-6 shrink-0 items-center gap-1.5 text-[10px] hover:text-white sm:inline-flex"><MessageCircle aria-hidden="true" className="size-3" />Hablemos por WhatsApp</button>
        </div>
      </div>
    <header ref={headerRef} className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white text-zinc-950">
      <div className="mx-auto flex h-15 w-full max-w-7xl items-center gap-2 px-4 sm:h-19 sm:gap-4 sm:px-6 lg:px-8">
        <Link className="flex min-h-11 shrink-0 items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600" href={isWholesale ? "/mayorista" : "/"} aria-label={brandName}>
          <BrandMark />
        </Link>
        <div className="relative ml-auto hidden w-full min-w-40 max-w-xl md:block"><ProductSearch catalogPath={catalogPath} /></div>
        <div className="ml-auto flex items-center gap-0 sm:gap-1 md:ml-2">
          {profile?.role === "admin" && <Link aria-label="Panel admin" className={`${iconButtonClass} max-sm:hidden`} href="/admin" title="Panel admin"><ShieldCheck aria-hidden="true" className="size-5" /></Link>}
          <Link aria-label="Cuenta" className={`${iconButtonClass} max-sm:hidden`} href={profile ? "/cuenta" : "/login"} title={profile ? "Mi cuenta" : "Iniciar sesión"}><User aria-hidden="true" className="size-5" /></Link>
          <Link aria-label={favoritesCount ? `Favoritos, ${favoritesCount} productos` : "Favoritos"} className={`relative ${iconButtonClass} max-sm:hidden`} href="/favoritos" title="Favoritos">
            <Heart aria-hidden="true" className="size-5" />
            {favoritesCount > 0 && <span aria-hidden="true" className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-sky-700 px-1 text-[9px] font-semibold text-white">{favoritesCount > 99 ? "99+" : favoritesCount}</span>}
          </Link>
          <button type="button" aria-label={cartCount ? `Abrir carrito, ${cartCount} ${cartCount === 1 ? "producto" : "productos"}` : "Abrir carrito"} aria-haspopup="dialog" aria-expanded={cartOpen}
            className={`relative ${iconButtonClass}`} onClick={() => setCartOpen(true)} title="Carrito">
            <ShoppingBag aria-hidden="true" className="size-5" />
            {cartCount > 0 && <span aria-hidden="true" className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-sky-700 px-1 text-[9px] font-semibold text-white">{cartCount > 99 ? "99+" : cartCount}</span>}
          </button>
          <button type="button" aria-label="Buscar productos" aria-haspopup="dialog" aria-controls="mobile-site-menu" className={`md:hidden ${iconButtonClass}`} onClick={() => openMenu(true)} title="Buscar"><Search aria-hidden="true" className="size-5" /></button>
          <button type="button" aria-label="Abrir menu" aria-haspopup="dialog" aria-expanded={open} aria-controls="mobile-site-menu" className={`xl:hidden ${iconButtonClass}`} onClick={() => openMenu(false)}><Menu aria-hidden="true" className="size-5" /></button>
        </div>
      </div>
      <div className="hidden border-t border-zinc-100 xl:block">
        <nav aria-label="Navegación principal" className="mx-auto flex min-h-12 w-full max-w-7xl items-center gap-2 px-6 lg:px-8">
          <Link aria-current={pathname === "/" ? "page" : undefined} className={`${linkClass} ${pathname === "/" ? "bg-sky-50 text-sky-800" : ""}`} href="/">Inicio</Link>
          <div className="relative" onMouseEnter={handleMouseEnterMenu}
            onMouseLeave={event => { if (!event.currentTarget.contains(document.activeElement)) handleMouseLeaveMenu(); }}
            onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setCategoriesMenuOpen(false); }}>
            <button type="button" ref={categoryButtonRef} aria-controls="desktop-category-navigation" aria-expanded={categoriesMenuOpen}
              className={`${linkClass} gap-1.5`} onClick={() => {
                if (openedByHoverRef.current) { openedByHoverRef.current = false; setCategoriesMenuOpen(true); }
                else setCategoriesMenuOpen(value => !value);
              }}>
              Categorías<ChevronDown aria-hidden="true" className={`size-4 text-zinc-400 transition-transform ${categoriesMenuOpen ? "rotate-180 text-sky-700" : ""}`} />
            </button>
            <div id="desktop-category-navigation" className={`absolute left-0 top-full z-50 pt-2 ${categoriesMenuOpen ? "visible" : "invisible pointer-events-none"}`}>
              <div className="w-[820px] max-w-[calc(100vw-3rem)] overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-xl">
                <CategoryNavigation categories={categories} catalogPath={catalogPath} onNavigate={() => setCategoriesMenuOpen(false)} />
              </div>
            </div>
          </div>
          <Link aria-current={isWholesalePage ? "page" : undefined} className={`${linkClass} ${isWholesalePage ? "bg-sky-50 text-sky-800" : ""}`} href="/mayorista">Mayoristas</Link>
          <Link className={linkClass} href="/#ofertas">Novedades</Link>
          <Link className={linkClass} href={profile ? "/cuenta" : "/seguimiento"}>Mis pedidos</Link>
          {isWholesale ? <Link className={linkClass} href="/">Tienda</Link> : isWholesaleAllowed && <Link className="ml-auto rounded-full bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-800" href="/mayorista">Canal B2B</Link>}
        </nav>
      </div>
    </header>
    {open && createPortal(
      <div ref={menuOverlayRef} className="fixed inset-0 z-[80] bg-zinc-950/35" onClick={event => { if (event.target === event.currentTarget) closeMenu(); }}>
        <aside id="mobile-site-menu" ref={menuPanelRef} role="dialog" aria-modal="true" aria-labelledby="mobile-menu-title" tabIndex={-1}
          className="absolute inset-y-0 right-0 flex h-dvh w-full flex-col bg-white text-zinc-950 shadow-2xl outline-none sm:max-w-[420px]"
          onKeyDown={event => { if (event.key === "Escape") { event.stopPropagation(); closeMenu(); } }}>
          <div className="flex h-17 shrink-0 items-center justify-between border-b border-zinc-100 px-5 pt-[env(safe-area-inset-top)]">
            <Link href={isWholesale ? "/mayorista" : "/"} onClick={closeMenu} aria-label={brandName} className="flex min-h-11 items-center gap-2 rounded-lg focus-visible:outline-2 focus-visible:outline-sky-600"><BrandMark /><span id="mobile-menu-title" className="sr-only">Menú de la tienda</span></Link>
            <button type="button" aria-label="Cerrar menú" onClick={closeMenu} className={iconButtonClass}><X aria-hidden="true" className="size-5" /></button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[max(24px,env(safe-area-inset-bottom))]">
            <div className="pb-4 pt-5"><ProductSearch mobile catalogPath={catalogPath} onNavigate={closeMenu} /></div>
            <Link href="/mayorista" aria-current={isWholesalePage ? "page" : undefined} onClick={closeMenu}
              className="flex min-h-13 items-center gap-3 rounded-xl bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-900 transition-colors hover:bg-sky-100 focus-visible:outline-2 focus-visible:outline-sky-600">
              <Store aria-hidden="true" className="size-5 shrink-0 text-sky-700" /><span className="flex-1">Venta mayorista para comercios</span><ArrowRight aria-hidden="true" className="size-4 shrink-0" />
            </Link>
            <CategoryNavigation mobile categories={categories} catalogPath={catalogPath} onNavigate={closeMenu} />
            <nav aria-label="Mi cuenta" className="border-t border-zinc-100 py-2">
              <Link href={profile ? "/cuenta" : "/login"} onClick={closeMenu} className="flex min-h-12 items-center gap-3 rounded-lg px-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50"><User aria-hidden="true" className="size-5 text-zinc-400" />{profile ? "Mi cuenta" : "Iniciar sesión"}<ArrowRight aria-hidden="true" className="ml-auto size-4 text-zinc-400" /></Link>
              <Link href="/favoritos" onClick={closeMenu} className="flex min-h-12 items-center gap-3 rounded-lg px-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50"><Heart aria-hidden="true" className="size-5 text-zinc-400"/>Favoritos{favoritesCount>0&&<span className="text-xs">({favoritesCount})</span>}<ArrowRight aria-hidden="true" className="ml-auto size-4 text-zinc-400"/></Link>
              {profile?.role === "admin" && <Link href="/admin" onClick={closeMenu} className="flex min-h-12 items-center gap-3 rounded-lg px-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50"><ShieldCheck aria-hidden="true" className="size-5 text-zinc-400" />Panel admin<ArrowRight aria-hidden="true" className="ml-auto size-4 text-zinc-400" /></Link>}
            </nav>
            <button type="button" onClick={() => { closeMenu(); openWhatsApp("Hola MYA Importaciones! Quisiera hacer una consulta."); }}
              className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-50 px-3 py-3 text-sm font-semibold text-emerald-800 transition-colors hover:bg-emerald-100 focus-visible:outline-2 focus-visible:outline-emerald-700">
              <MessageCircle aria-hidden="true" className="size-5 shrink-0" />Hablemos por WhatsApp
            </button>
            <p className="mt-2 text-center text-[11px] leading-5 text-zinc-500">Te atienden Máximo y Agustina</p>
          </div>
        </aside>
      </div>, document.body)}
  </>;
}
