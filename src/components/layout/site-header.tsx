"use client";

import { WHOLESALE_ENABLED } from "@/lib/commerce-policy";
import Link from "next/link";
import Image from "next/image";
import {
  ChevronDown,
  Heart,
  Menu,
  Search,
  ShieldCheck,
  ShoppingBag,
  User,
  X,
  MessageCircle,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useCommerce } from "@/components/commerce/commerce-provider";
import type { Category } from "@/lib/types";
import type { Profile } from "@/lib/auth";
import { ProductSearch } from "./product-search";
import { CategoryNavigation } from "./category-navigation";

export function SiteHeader({
  initialCategories = [],
  profile = null,
}: {
  initialCategories?: Category[];
  profile?: Profile | null;
}) {
  const pathname = usePathname();
  const isWholesalePage = Boolean(pathname?.startsWith("/mayorista"));
  // The public wholesale section belongs to the same store; B2B account styling stays gated.
  const isWholesale = isWholesalePage && WHOLESALE_ENABLED;
  const [open, setOpen] = useState(false);
  const { cartCount, favoritesCount, setCartOpen, openWhatsApp } = useCommerce();

  // Filter categories based on channel
  const categories = initialCategories.filter((cat) => {
    if (isWholesale) {
      return true; // Show all in wholesale or we could filter by cat.wholesaleOnly
    } else {
      return !cat.wholesaleOnly; // Retail only shows non-wholesale-only
    }
  });

  const [categoriesMenuOpen, setCategoriesMenuOpen] = useState(false);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const openedByHoverRef = useRef(false);
  const headerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const categoryButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open && !categoriesMenuOpen) return;
    const dismiss = (event: PointerEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setCategoriesMenuOpen(false);
      }
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setCategoriesMenuOpen(false);
        if (open) menuButtonRef.current?.focus();
        else if (categoriesMenuOpen) categoryButtonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", escape);
    };
  }, [open, categoriesMenuOpen]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const resize = () => { if (window.innerWidth >= 1280) setOpen(false); };
    window.addEventListener("resize", resize);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("resize", resize);
    };
  }, [open]);

  const handleMouseEnterMenu = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    if (!categoriesMenuOpen) {
      openedByHoverRef.current = true;
      setCategoriesMenuOpen(true);
    }
  };

  const handleMouseLeaveMenu = () => {
    closeTimeoutRef.current = setTimeout(() => {
      setCategoriesMenuOpen(false);
    }, 220);
  };

  const brandName = isWholesale ? "MyA Mayorista" : "MyA importaciones";
  const catalogPath = isWholesale && WHOLESALE_ENABLED ? "/mayorista" : "/catalogo";
  // Classes based on channel
  const headerClass = isWholesale
    ? "sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/95 text-white backdrop-blur"
    : "sticky top-0 z-40 border-b border-zinc-200 bg-white text-zinc-950 shadow-xs";

  const linkClass = isWholesale
    ? "shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
    : "shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950 transition-colors";

  const isWholesaleAllowed = WHOLESALE_ENABLED && Boolean(
    profile?.isApprovedWholesale ||
    profile?.customerTier === "wholesale" ||
    profile?.role === "admin"
  );

  const toggleChannelLink = isWholesale ? (
    <Link
      className={linkClass}
      href="/"
    >
      Tienda
    </Link>
  ) : isWholesaleAllowed ? (
    <Link
      className="rounded-lg px-2.5 py-1 text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition-colors inline-flex items-center gap-1.5 shadow-xs"
      href="/mayorista"
      title="Acceso exclusivo al Catálogo Mayorista"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
      Canal B2B
    </Link>
  ) : null;

  const iconButtonClass = isWholesale
    ? "size-11 shrink-0 place-items-center rounded-xl text-zinc-300 hover:bg-zinc-800 hover:text-white grid transition-colors"
    : "size-11 shrink-0 place-items-center rounded-full text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950 grid transition-colors";

  return (
    <header ref={headerRef} className={`${headerClass} ${open ? "z-[46]" : ""}`}>
      <div className="border-b border-zinc-200 bg-zinc-950 text-zinc-200">
        <div className="mx-auto flex min-h-8 max-w-7xl items-center justify-between gap-4 px-3 text-[10px] sm:px-6 sm:text-xs lg:px-8">
          <p className="py-1.5 text-center leading-5 sm:text-left">Envíos a toda Argentina <span className="mx-1.5 text-zinc-600">·</span> Atención de Máximo y Agustina</p>
          <button type="button" onClick={() => openWhatsApp("Hola MYA Importaciones, quiero hacer una consulta.")} className="hidden min-h-8 shrink-0 items-center gap-1.5 text-xs text-zinc-200 hover:text-white sm:inline-flex"><MessageCircle className="size-3.5" />Hablemos por WhatsApp</button>
        </div>
      </div>

      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-2 md:h-18 px-3 sm:gap-3 sm:px-6 lg:px-8">
        <Link className="group flex shrink-0 items-center gap-1.5" href={isWholesale ? "/mayorista" : "/"} aria-label={brandName}>
          <div className="relative h-10 w-14 shrink-0 overflow-hidden sm:h-11 sm:w-20">
            <Image
              src="/mya-mark-white.png"
              alt=""
              width={80}
              height={80}
              className="absolute left-1/2 top-1/2 h-16 w-16 max-w-none -translate-x-1/2 -translate-y-1/2 object-contain sm:h-20 sm:w-20"
            />
          </div>
          <span className="ml-1 hidden min-w-0 border-l border-zinc-200 pl-3 sm:block"><span className="block text-sm font-semibold text-zinc-900">importaciones</span><span className="mt-0.5 block text-[10px] text-zinc-500">Tandil · Argentina</span></span>
          {isWholesale && <span className="hidden rounded-full border border-amber-400/40 px-2 py-1 text-[10px] font-semibold text-amber-300 xl:block">Mayorista</span>}
        </Link>



        <div className="relative ml-auto hidden w-full min-w-40 max-w-xl md:block">
          <ProductSearch catalogPath={catalogPath} />
        </div>

        <div className="ml-auto flex items-center gap-0 sm:gap-1 md:ml-2">
          {profile?.role === "admin" && (
            <Link
              aria-label="Panel admin"
              onClick={() => setOpen(false)}
              className={`${iconButtonClass} max-sm:hidden`}
              href="/admin"
              title="Panel admin"
            >
              <ShieldCheck className="h-5 w-5" />
            </Link>
          )}
          <Link
            aria-label="Cuenta"
            onClick={() => setOpen(false)}
            className={`${iconButtonClass} max-sm:hidden`}
            href={profile ? "/cuenta" : "/login"}
            title={profile ? "Mi cuenta" : "Iniciar sesión"}
          >
            <User className="h-5 w-5" />
          </Link>
          <Link
            aria-label="Favoritos"
            onClick={() => setOpen(false)}
            className={`relative ${iconButtonClass} max-sm:hidden`}
            href="/favoritos"
            title="Favoritos"
          >
            <Heart className="h-5 w-5" />
            {favoritesCount > 0 && (
              <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                {favoritesCount}
              </span>
            )}
          </Link>
          <button
            aria-label="Abrir carrito"
            className={`relative ${iconButtonClass}`}
            onClick={() => { setOpen(false); setCartOpen(true); }}
            title="Carrito"
            type="button"
          >
            <ShoppingBag className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-sky-600 px-1 text-[10px] font-bold text-white">
                {cartCount}
              </span>
            )}
          </button>
          {/* Direct Search Trigger for Mobile */}
          <button
            aria-label="Buscar productos"
            className={`md:hidden ${iconButtonClass}`}
            onClick={() => {
              setOpen(true);
              setTimeout(() => {
                const el = document.getElementById("mobile-search-input");
                el?.focus();
              }, 120);
            }}
            type="button"
            title="Buscar"
          >
            <Search className="h-5 w-5" />
          </button>

          <button
            aria-label="Abrir menu"
            aria-expanded={open}
            aria-controls="mobile-site-menu"
            ref={menuButtonRef}
            className={`xl:hidden ${iconButtonClass}`}
            onClick={() => setOpen((value) => !value)}
            type="button"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <div className="hidden border-t border-zinc-100 bg-white xl:block">
        <nav aria-label="Navegación principal" className="mx-auto flex min-h-12 w-full max-w-7xl items-center gap-2 px-4 sm:px-6 lg:px-8">
          <Link aria-current={pathname === "/" ? "page" : undefined} className={`${linkClass} ${pathname === "/" ? "bg-sky-50 text-sky-800" : ""}`} href="/">
            Inicio
          </Link>

          {/* The dropdown bridge keeps the pointer inside while reaching subcategories. */}
          <div
            className="relative"
            onMouseEnter={handleMouseEnterMenu}
            onMouseLeave={event => {
              if (!event.currentTarget.contains(document.activeElement)) handleMouseLeaveMenu();
            }}
            onBlur={event => {
              if (!event.currentTarget.contains(event.relatedTarget)) setCategoriesMenuOpen(false);
            }}
          >
            <button
              type="button"
              ref={categoryButtonRef}
              onClick={() => {
                if (openedByHoverRef.current) {
                  openedByHoverRef.current = false;
                  setCategoriesMenuOpen(true);
                } else setCategoriesMenuOpen((prev) => !prev);
              }}
              className={`flex items-center gap-1.5 ${linkClass} cursor-pointer`}
              aria-controls="desktop-category-navigation"
              aria-expanded={categoriesMenuOpen}
            >
              Categorías
              <ChevronDown
                className={`h-4 w-4 transition-transform duration-200 ${
                  categoriesMenuOpen ? "rotate-180 text-sky-600" : "text-zinc-400"
                }`}
              />
            </button>

            <div
              id="desktop-category-navigation"
              className={`absolute left-0 top-full pt-2 z-50 ${
                categoriesMenuOpen
                  ? "visible"
                  : "invisible pointer-events-none"
              }`}
            >
              <div
                className={`w-[820px] max-w-[calc(100vw-3rem)] rounded-2xl border shadow-xl overflow-hidden ${
                  isWholesale
                    ? "border-zinc-800 bg-zinc-900/98 text-zinc-100"
                    : "border-zinc-200/90 bg-white/98 text-zinc-900"
                }`}
              >
                <CategoryNavigation categories={categories} catalogPath={catalogPath} onNavigate={() => setCategoriesMenuOpen(false)} />
              </div>
            </div>
          </div>

          <Link aria-current={isWholesalePage ? "page" : undefined} className={`${linkClass} ${isWholesalePage && !isWholesale ? "bg-sky-50 text-sky-800" : ""}`} href="/mayorista">Mayoristas</Link>

          <Link className={linkClass} href="/#ofertas">
            Novedades
          </Link>

          {profile ? <Link className={`${linkClass} whitespace-nowrap`} href="/cuenta">Mis pedidos</Link> : <Link className={linkClass} href="/seguimiento">Seguimiento</Link>}
          {toggleChannelLink}
        </nav>
      </div>

      {open && (
        <div id="mobile-site-menu" className={`absolute inset-x-0 top-full border-t px-4 py-3 xl:hidden max-h-[calc(100dvh-6rem)] overflow-y-auto overscroll-contain pb-28 shadow-2xl ${
          isWholesale ? "border-zinc-800 bg-zinc-950 text-white" : "border-zinc-200 bg-white text-zinc-900"
        }`}>
          <div className="mb-4">
            <ProductSearch mobile catalogPath={catalogPath} onNavigate={() => setOpen(false)} />
          </div>
          <nav aria-label="Enlaces de la tienda" className="grid gap-1">
            <Link href="/mayorista" aria-current={isWholesalePage ? "page" : undefined} onClick={() => setOpen(false)} className={`min-h-11 rounded-lg px-3 py-3 text-sm font-semibold ${isWholesale ? "text-sky-300 hover:bg-zinc-800" : "text-sky-800 hover:bg-sky-50"}`}>Venta mayorista para comercios</Link>
            <Link
              className={`rounded-lg px-3 py-2 text-sm font-medium ${
                isWholesale ? "text-zinc-300 hover:bg-zinc-800" : "text-zinc-700 hover:bg-zinc-100"
              }`}
              href="/"
              onClick={() => setOpen(false)}
            >
              Inicio
            </Link>

            <Link
              className={`rounded-lg px-3 py-2 text-sm font-medium ${
                isWholesale ? "text-zinc-300 hover:bg-zinc-800" : "text-zinc-700 hover:bg-zinc-100"
              }`}
              href={profile ? "/cuenta" : "/seguimiento"}
              onClick={() => setOpen(false)}
            >
              {profile ? "Mis pedidos" : "Seguimiento de pedidos"}
            </Link>

            <CategoryNavigation mobile categories={categories} catalogPath={catalogPath} onNavigate={() => setOpen(false)} />

            {profile?.role === "admin" && (
              <Link
                className={`rounded-lg px-3 py-2 text-sm font-medium ${
                  isWholesale ? "text-zinc-300 hover:bg-zinc-800" : "text-zinc-700 hover:bg-zinc-100"
                }`}
                href="/admin"
                onClick={() => setOpen(false)}
              >
                Admin Panel
              </Link>
            )}

            <Link
              className={`rounded-lg px-3 py-2 text-sm font-medium ${
                isWholesale ? "text-zinc-300 hover:bg-zinc-800" : "text-zinc-700 hover:bg-zinc-100"
              }`}
              href="/#ofertas"
              onClick={() => setOpen(false)}
            >
              Descubrí más productos
            </Link>

            <button
              type="button"
              className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition cursor-pointer text-left ${
                isWholesale
                  ? "text-emerald-400 hover:bg-zinc-900"
                  : "text-emerald-700 hover:bg-emerald-50"
              }`}
              onClick={() => {
                setOpen(false);
                openWhatsApp("Hola MYA Importaciones! Quisiera hacer una consulta.");
              }}
            >
              <MessageCircle className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>Consultas por WhatsApp (Máximo o Agustina)</span>
            </button>

            {isWholesale ? (
              <div className="border-t border-zinc-800 my-2 pt-2">
                <Link
                  className="block text-center rounded-xl px-3 py-2.5 text-xs font-semibold bg-zinc-800 text-zinc-200 border border-zinc-700"
                  href="/"
                  onClick={() => setOpen(false)}
                >
                  Ver tienda
                </Link>
              </div>
            ) : isWholesaleAllowed ? (
              <div className="border-t border-zinc-200 my-2 pt-2">
                <Link
                  className="block text-center rounded-xl px-3 py-2.5 text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200"
                  href="/mayorista"
                  onClick={() => setOpen(false)}
                >
                  Acceder a mi Canal Mayorista B2B
                </Link>
              </div>
            ) : null}
          </nav>
        </div>
      )}
    </header>
  );
}
