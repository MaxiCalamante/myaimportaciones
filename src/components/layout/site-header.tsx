"use client";

import { ExchangeTicker } from "@/components/commerce/currency-provider";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Boxes,
  ChevronDown,
  ChevronRight,
  Heart,
  Menu,
  MessageCircle,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  User,
  X,
} from "lucide-react";
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
import { RUBROS_DEFINITION } from "@/lib/category-groups";

function BrandMark() {
  return (
    <span className="relative block h-10 w-[74px] shrink-0 overflow-hidden sm:w-20">
      <Image
        src="/mya-mark-white.png"
        alt=""
        width={96}
        height={96}
        className="absolute left-1/2 top-1/2 size-[86px] max-w-none -translate-x-1/2 -translate-y-1/2 object-contain sm:size-24"
      />
    </span>
  );
}

export function SiteHeader({
  initialCategories = [],
  profile = null,
}: {
  initialCategories?: Category[];
  profile?: Profile | null;
}) {
  const pathname = usePathname();
  const isWholesalePage = Boolean(pathname?.startsWith("/mayorista"));
  const isWholesale = isWholesalePage && WHOLESALE_ENABLED;
  const { cartCount, favoritesCount, cartOpen, setCartOpen, openWhatsApp } =
    useCommerce();
  const categories = initialCategories.filter(
    (category) => isWholesale || !category.wholesaleOnly
  );
  const catalogPath = isWholesale ? "/mayorista" : "/catalogo";
  const brandName = "MYA";
  const isWholesaleAllowed = WHOLESALE_ENABLED;

  const [menuState, setMenuState] = useState<{
    pathname: string | null;
    focusSearch: boolean;
  } | null>(null);
  if (menuState && menuState.pathname !== pathname) setMenuState(null);
  const open = menuState !== null && menuState.pathname === pathname;

  // Active mega menu state (null or specific rubroId)
  const [activeRubroMenu, setActiveRubroMenu] = useState<string | null>(null);
  const headerRef = useRef<HTMLElement>(null);
  const menuPanelRef = useRef<HTMLElement>(null);
  const menuOverlayRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const closeMenu = () => setMenuState(null);
  const openMenu = (focusSearch: boolean) => {
    setActiveRubroMenu(null);
    setMenuState({ pathname, focusSearch });
  };

  const handleOpenRubro = (rubroId: string) => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    setActiveRubroMenu(rubroId);
  };

  const handleScheduleClose = () => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    closeTimeoutRef.current = setTimeout(() => {
      setActiveRubroMenu(null);
    }, 250);
  };

  // Keyboard navigation & click outside for mega menu
  useEffect(() => {
    if (!activeRubroMenu) return;
    const dismiss = (event: PointerEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) {
        setActiveRubroMenu(null);
      }
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveRubroMenu(null);
      }
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", escape);
    };
  }, [activeRubroMenu]);

  // Mobile menu scroll lock & focus trap
  useEffect(() => {
    if (!open) return;
    const overlay = menuOverlayRef.current;
    const previous = new Map<HTMLElement, boolean>();
    const disableBackground = () => {
      for (const child of document.body.children) {
        if (
          !(child instanceof HTMLElement) ||
          child === overlay ||
          child.contains(overlay)
        )
          continue;
        if (!previous.has(child)) previous.set(child, child.inert);
        child.inert = true;
      }
    };
    disableBackground();
    const observer = new MutationObserver(disableBackground);
    observer.observe(document.body, { childList: true });
    const resize = () => {
      if (window.innerWidth >= 1280) setMenuState(null);
    };
    window.addEventListener("resize", resize);
    return () => {
      observer.disconnect();
      for (const [element, inert] of previous) element.inert = inert;
      window.removeEventListener("resize", resize);
    };
  }, [open]);

  useModalFocus(menuPanelRef, open);

  useEffect(() => {
    if (open && menuState?.focusSearch) {
      menuPanelRef.current
        ?.querySelector<HTMLInputElement>("#mobile-search-input")
        ?.focus();
    }
  }, [open, menuState?.focusSearch]);

  useEffect(
    () => () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    },
    []
  );

  const linkClass =
    "inline-flex min-h-11 shrink-0 items-center whitespace-nowrap rounded-lg px-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-sky-50 hover:text-sky-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600";
  const iconButtonClass =
    "grid size-11 shrink-0 place-items-center rounded-full text-zinc-700 transition-colors hover:bg-sky-50 hover:text-sky-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600";

  return (
    <>
      {/* ── 1. Top bar: shipping info, exchange ticker, WhatsApp ── */}
      <div className="bg-zinc-950 text-zinc-200 border-b border-zinc-900">
        <div className="mx-auto flex min-h-8 max-w-7xl items-center justify-between gap-3 px-3 text-[10px] tracking-[0.015em] sm:px-6 sm:text-[11px] lg:px-8">
          <div className="flex min-w-0 items-center gap-2 py-1 leading-4">
            <span className="hidden font-medium text-zinc-300 sm:inline">
              Envíos a toda Argentina
            </span>
            <span className="hidden text-zinc-600 sm:inline">·</span>
            <ExchangeTicker />
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/mayorista"
              className="inline-flex items-center gap-1 font-semibold text-amber-300 hover:text-amber-200 transition-colors"
            >
              <Store aria-hidden="true" className="size-3" />
              <span>Venta Mayorista</span>
            </Link>
            <button
              type="button"
              onClick={() =>
                openWhatsApp(
                  "Hola MYA Importaciones, quiero hacer una consulta sobre la tienda."
                )
              }
              className="hidden h-6 shrink-0 items-center gap-1.5 font-medium text-zinc-300 hover:text-white sm:inline-flex cursor-pointer transition-colors"
            >
              <MessageCircle aria-hidden="true" className="size-3 text-emerald-400" />
              <span>WhatsApp</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. Main Header: logo, prominent search, user actions ── */}
      <header
        ref={headerRef}
        className="sticky top-0 z-40 border-b border-zinc-200/90 bg-white/95 text-zinc-950 backdrop-blur-md"
      >
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-3 px-4 sm:h-20 sm:gap-6 sm:px-6 lg:px-8">
          {/* Brand Logo */}
          <Link
            className="flex min-h-11 shrink-0 items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
            href={isWholesale ? "/mayorista" : "/"}
            aria-label={brandName}
          >
            <BrandMark />
          </Link>

          {/* Desktop Search Bar (Protagonist) */}
          <div className="relative hidden w-full flex-1 max-w-2xl md:block">
            <ProductSearch catalogPath={catalogPath} />
          </div>

          {/* Right Actions */}
          <div className="ml-auto flex items-center gap-1 sm:gap-1.5">
            {/* Wholesale Pill CTA on Desktop */}
            {isWholesaleAllowed && !isWholesale && (
              <Link
                href="/mayorista"
                className="hidden lg:inline-flex min-h-10 items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-3.5 py-1.5 text-xs font-bold text-sky-900 transition-all hover:bg-sky-100 hover:border-sky-300"
              >
                <Boxes aria-hidden="true" className="size-3.5 text-sky-700" />
                <span>Precios Mayoristas</span>
              </Link>
            )}

            {profile?.role === "admin" && (
              <Link
                aria-label="Panel admin"
                className={`${iconButtonClass} max-sm:hidden`}
                href="/admin"
                title="Panel admin"
              >
                <ShieldCheck aria-hidden="true" className="size-5 text-indigo-700" />
              </Link>
            )}

            <Link
              aria-label="Cuenta"
              className={`${iconButtonClass} max-sm:hidden`}
              href={profile ? "/cuenta" : "/login"}
              title={profile ? "Mi cuenta" : "Iniciar sesión"}
            >
              <User aria-hidden="true" className="size-5" />
            </Link>

            <Link
              aria-label={
                favoritesCount
                  ? `Favoritos, ${favoritesCount} productos`
                  : "Favoritos"
              }
              className={`relative ${iconButtonClass} max-sm:hidden`}
              href="/favoritos"
              title="Favoritos"
            >
              <Heart aria-hidden="true" className="size-5" />
              {favoritesCount > 0 && (
                <span
                  aria-hidden="true"
                  className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-sky-700 px-1 text-[9px] font-semibold text-white"
                >
                  {favoritesCount > 99 ? "99+" : favoritesCount}
                </span>
              )}
            </Link>

            <button
              type="button"
              aria-label={
                cartCount
                  ? `Abrir carrito, ${cartCount} ${cartCount === 1 ? "producto" : "productos"}`
                  : "Abrir carrito"
              }
              aria-haspopup="dialog"
              aria-expanded={cartOpen}
              className={`relative ${iconButtonClass}`}
              onClick={() => setCartOpen(true)}
              title="Carrito"
            >
              <ShoppingBag aria-hidden="true" className="size-5" />
              {cartCount > 0 && (
                <span
                  aria-hidden="true"
                  className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-sky-700 px-1 text-[9px] font-semibold text-white"
                >
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </button>

            {/* Mobile Search Button */}
            <button
              type="button"
              aria-label="Buscar productos"
              aria-haspopup="dialog"
              aria-controls="mobile-site-menu"
              className={`md:hidden ${iconButtonClass}`}
              onClick={() => openMenu(true)}
              title="Buscar"
            >
              <Search aria-hidden="true" className="size-5" />
            </button>

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              aria-label="Abrir menu"
              aria-haspopup="dialog"
              aria-expanded={open}
              aria-controls="mobile-site-menu"
              className={`xl:hidden ${iconButtonClass}`}
              onClick={() => openMenu(false)}
            >
              <Menu aria-hidden="true" className="size-5" />
            </button>
          </div>
        </div>

        {/* ── 3. Desktop Navigation Bar: 3 Main Rubros + Mega Menus ── */}
        <div className="hidden border-t border-zinc-100 bg-zinc-50/50 xl:block">
          <nav
            aria-label="Navegación principal"
            className="mx-auto flex min-h-12 w-full max-w-7xl items-center gap-1 px-6 lg:px-8"
          >
            <Link
              aria-current={pathname === "/" ? "page" : undefined}
              className={`${linkClass} ${pathname === "/" ? "bg-white font-semibold text-sky-800 shadow-xs" : ""}`}
              href="/"
            >
              Inicio
            </Link>

            {/* 3 Mega-Rubro Navigation Triggers */}
            {RUBROS_DEFINITION.map((rubro) => {
              const isOpen = activeRubroMenu === rubro.id;
              return (
                <div
                  key={rubro.id}
                  className="relative"
                  onMouseEnter={() => handleOpenRubro(rubro.id)}
                  onMouseLeave={handleScheduleClose}
                  onBlur={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget)) {
                      setActiveRubroMenu(null);
                    }
                  }}
                >
                  <Link
                    href={rubro.href}
                    className={`${linkClass} gap-1.5 ${
                      isOpen ? "bg-white text-sky-900 shadow-xs font-semibold" : ""
                    }`}
                    onClick={() => setActiveRubroMenu(null)}
                  >
                    <span>{rubro.name}</span>
                    <ChevronDown
                      aria-hidden="true"
                      className={`size-3.5 text-zinc-400 transition-transform duration-200 ${
                        isOpen ? "rotate-180 text-sky-700" : ""
                      }`}
                    />
                  </Link>

                  {/* Mega Menu Dropdown */}
                  <div
                    className={`absolute left-0 top-full z-50 pt-2 transition-all duration-200 ${
                      isOpen
                        ? "visible opacity-100 translate-y-0"
                        : "invisible opacity-0 -translate-y-1 pointer-events-none"
                    }`}
                  >
                    <div className="w-[940px] max-w-[calc(100vw-3rem)] overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-2xl">
                      <CategoryNavigation
                        categories={categories}
                        catalogPath={catalogPath}
                        rubroId={rubro.id}
                        onNavigate={() => setActiveRubroMenu(null)}
                      />
                    </div>
                  </div>
                </div>
              );
            })}

            <Link className={linkClass} href="/#ofertas">
              Novedades
            </Link>

            <Link
              className={linkClass}
              href={profile ? "/cuenta" : "/seguimiento"}
            >
              Mis pedidos
            </Link>

            {isWholesale ? (
              <Link className={linkClass} href="/">
                Tienda minorista
              </Link>
            ) : (
              isWholesaleAllowed && (
                <Link
                  className="ml-auto rounded-full bg-sky-700 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-sky-800 transition"
                  href="/mayorista"
                >
                  Catálogo Mayorista
                </Link>
              )
            )}
          </nav>
        </div>
      </header>

      {/* ── 4. Mobile Drawer Menu (Accessible Portal) ── */}
      {open &&
        createPortal(
          <div
            ref={menuOverlayRef}
            className="fixed inset-0 z-[80] bg-zinc-950/45 backdrop-blur-xs"
            onClick={(event) => {
              if (event.target === event.currentTarget) closeMenu();
            }}
          >
            <aside
              id="mobile-site-menu"
              ref={menuPanelRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="mobile-menu-title"
              tabIndex={-1}
              className="absolute inset-y-0 right-0 flex h-dvh w-full flex-col bg-white text-zinc-950 shadow-2xl outline-none sm:max-w-[420px]"
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.stopPropagation();
                  closeMenu();
                }
              }}
            >
              {/* Drawer Header */}
              <div className="flex h-16 shrink-0 items-center justify-between border-b border-zinc-100 px-5 pt-[env(safe-area-inset-top)]">
                <Link
                  href={isWholesale ? "/mayorista" : "/"}
                  onClick={closeMenu}
                  aria-label={brandName}
                  className="flex min-h-11 items-center gap-2 rounded-lg focus-visible:outline-2 focus-visible:outline-sky-600"
                >
                  <BrandMark />
                  <span id="mobile-menu-title" className="sr-only">
                    Menú de la tienda
                  </span>
                </Link>
                <button
                  type="button"
                  aria-label="Cerrar menú"
                  onClick={closeMenu}
                  className={iconButtonClass}
                >
                  <X aria-hidden="true" className="size-5" />
                </button>
              </div>

              {/* Drawer Body */}
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[max(24px,env(safe-area-inset-bottom))]">
                {/* Search in Drawer */}
                <div className="pb-3 pt-4">
                  <ProductSearch
                    mobile
                    catalogPath={catalogPath}
                    onNavigate={closeMenu}
                  />
                </div>

                {/* Wholesale B2B Card */}
                <Link
                  href="/mayorista"
                  aria-current={isWholesalePage ? "page" : undefined}
                  onClick={closeMenu}
                  className="mb-3 flex min-h-13 items-center gap-3 rounded-2xl bg-gradient-to-r from-sky-50 to-blue-50 border border-sky-100 p-3.5 text-sm font-bold text-sky-950 transition-colors hover:from-sky-100 hover:to-blue-100"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-sky-700 text-white">
                    <Boxes aria-hidden="true" className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs uppercase tracking-wider text-sky-700 font-bold">
                      Canal Mayorista
                    </p>
                    <p className="text-sm font-semibold">Precios para comercios</p>
                  </div>
                  <ArrowRight aria-hidden="true" className="size-4 shrink-0 text-sky-700" />
                </Link>

                {/* Quick 3-Rubro Explorer in Mobile */}
                <div className="my-3 rounded-2xl border border-zinc-100 bg-zinc-50 p-3">
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                    Rubros Principales
                  </p>
                  <div className="grid grid-cols-1 gap-1.5">
                    {RUBROS_DEFINITION.map((rubro) => (
                      <Link
                        key={rubro.id}
                        href={rubro.href}
                        onClick={closeMenu}
                        className="flex items-center justify-between rounded-xl bg-white p-2.5 text-xs font-semibold text-zinc-800 shadow-2xs hover:bg-sky-50 hover:text-sky-900 transition"
                      >
                        <span className="flex items-center gap-2">
                          <Sparkles aria-hidden="true" className="size-4 text-sky-700" />
                          {rubro.name}
                        </span>
                        <ChevronRight aria-hidden="true" className="size-3.5 text-zinc-400" />
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Categories & Subcategories */}
                <CategoryNavigation
                  mobile
                  categories={categories}
                  catalogPath={catalogPath}
                  onNavigate={closeMenu}
                />

                {/* User & Orders Links */}
                <nav
                  aria-label="Mi cuenta"
                  className="border-t border-zinc-100 py-2"
                >
                  <Link
                    href={profile ? "/cuenta" : "/login"}
                    onClick={closeMenu}
                    className="flex min-h-12 items-center gap-3 rounded-lg px-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                  >
                    <User aria-hidden="true" className="size-5 text-zinc-400" />
                    {profile ? "Mi cuenta" : "Iniciar sesión"}
                    <ArrowRight
                      aria-hidden="true"
                      className="ml-auto size-4 text-zinc-400"
                    />
                  </Link>

                  <Link
                    href="/favoritos"
                    onClick={closeMenu}
                    className="flex min-h-12 items-center gap-3 rounded-lg px-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                  >
                    <Heart aria-hidden="true" className="size-5 text-zinc-400" />
                    Favoritos
                    {favoritesCount > 0 && (
                      <span className="text-xs text-sky-700 font-bold">
                        ({favoritesCount})
                      </span>
                    )}
                    <ArrowRight
                      aria-hidden="true"
                      className="ml-auto size-4 text-zinc-400"
                    />
                  </Link>

                  {profile?.role === "admin" && (
                    <Link
                      href="/admin"
                      onClick={closeMenu}
                      className="flex min-h-12 items-center gap-3 rounded-lg px-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                    >
                      <ShieldCheck
                        aria-hidden="true"
                        className="size-5 text-indigo-600"
                      />
                      Panel admin
                      <ArrowRight
                        aria-hidden="true"
                        className="ml-auto size-4 text-zinc-400"
                      />
                    </Link>
                  )}
                </nav>

                {/* WhatsApp Support CTA */}
                <button
                  type="button"
                  onClick={() => {
                    closeMenu();
                    openWhatsApp(
                      "Hola MYA Importaciones! Quisiera hacer una consulta."
                    );
                  }}
                  className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-xs transition-colors hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-emerald-700 cursor-pointer"
                >
                  <MessageCircle aria-hidden="true" className="size-5 shrink-0" />
                  Hablemos por WhatsApp
                </button>
                <p className="mt-2 text-center text-[11px] leading-5 text-zinc-500">
                  Atención directa de Máximo y Agustina · Tandil
                </p>
              </div>
            </aside>
          </div>,
          document.body
        )}
    </>
  );
}
