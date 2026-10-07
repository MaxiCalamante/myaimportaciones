"use client";

import { WHOLESALE_ENABLED } from "@/lib/commerce-policy";
import Link from "next/link";
import Image from "next/image";
import {
  ChevronDown,
  ChevronRight,
  Heart,
  Menu,
  Search,
  ShieldCheck,
  ShoppingBag,
  User,
  X,
  Wrench,
  Sparkles,
  Droplets,
  LayoutGrid,
  ArrowRight,
  MessageCircle,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useCommerce } from "@/components/commerce/commerce-provider";
import type { Category, Product } from "@/lib/types";
import type { Profile } from "@/lib/auth";
import { formatCurrency } from "@/lib/format";

export function SiteHeader({
  initialCategories = [],
  initialProducts = [],
  profile = null,
}: {
  initialCategories?: Category[];
  initialProducts?: Product[];
  profile?: Profile | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isWholesale = pathname?.startsWith("/mayorista");
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [apiResults, setApiResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [completedSearch, setCompletedSearch] = useState("");
  const { cartCount, favoritesCount, setCartOpen, setSelectedProduct, openWhatsApp } = useCommerce();

  // Cancel stale searches so a slower previous response cannot replace the current query.
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      const trimmed = searchQuery.trim();
      if (trimmed.length < 2) { setApiResults([]); setIsSearching(false); return; }
      setIsSearching(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, { signal: controller.signal });
        const json = res.ok ? await res.json() : { results: [] };
        if (!controller.signal.aborted) setApiResults(json.results || []);
      } catch { if (!controller.signal.aborted) setApiResults([]); }
      finally { if (!controller.signal.aborted) { setIsSearching(false); setCompletedSearch(trimmed); } }
    }, 180);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [searchQuery]);

  // Combine server results or client fallback
  const searchPending = searchQuery.trim().length >= 2 && (isSearching || completedSearch !== searchQuery.trim());
  const searchResults = apiResults.length > 0 && completedSearch === searchQuery.trim()
    ? apiResults
    : searchQuery.trim() === ""
    ? []
    : initialProducts.filter((p) => {
        const matchesText =
          p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.description?.toLowerCase().includes(searchQuery.toLowerCase());
        return isWholesale ? matchesText && (p.wholesalePrice > 0 || p.wholesaleOnly) : matchesText && !p.wholesaleOnly;
      }).slice(0, 8);

  // Filter categories based on channel
  const categories = initialCategories.filter((cat) => {
    if (isWholesale) {
      return true; // Show all in wholesale or we could filter by cat.wholesaleOnly
    } else {
      return !cat.wholesaleOnly; // Retail only shows non-wholesale-only
    }
  });

  // Main parent categories (rubros de primer nivel)
  const mainCategories = categories.filter((cat) => !cat.parentId);
  const getSubcategories = (parentId: string) => categories.filter((cat) => cat.parentId === parentId);

  const [categoriesMenuOpen, setCategoriesMenuOpen] = useState(false);
  const [hoveredParentId, setHoveredParentId] = useState<string | null>(null);
  const [expandedMobileCategory, setExpandedMobileCategory] = useState<string | null>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const headerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

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

  const activeParentCategory =
    mainCategories.find((c) => c.id === hoveredParentId) || mainCategories[0];
  const activeSubcategories = activeParentCategory
    ? getSubcategories(activeParentCategory.id)
    : [];

  const handleMouseEnterMenu = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setCategoriesMenuOpen(true);
    if (!hoveredParentId && mainCategories.length > 0) {
      setHoveredParentId(mainCategories[0].id);
    }
  };

  const handleMouseLeaveMenu = () => {
    closeTimeoutRef.current = setTimeout(() => {
      setCategoriesMenuOpen(false);
    }, 220);
  };

  const getCategoryIcon = (slug: string, className = "h-4 w-4") => {
    if (slug.includes("herramienta")) return <Wrench className={className} />;
    if (slug.includes("cosmetica")) return <Sparkles className={className} />;
    if (slug.includes("capilar")) return <Droplets className={className} />;
    return <LayoutGrid className={className} />;
  };

  const brandName = isWholesale ? "MyA Mayorista" : "MyA importaciones";
  const catalogPath = isWholesale ? "/mayorista" : "/catalogo";
  const showSearchResults = () => {
    if (!searchQuery.trim()) return;
    router.push(`${catalogPath}?q=${encodeURIComponent(searchQuery.trim())}`);
    setSearchQuery("");
    setOpen(false);
  };

  // Classes based on channel
  const headerClass = isWholesale
    ? "sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/95 text-white backdrop-blur"
    : "sticky top-0 z-40 border-b border-zinc-200 bg-white/95 text-zinc-950 backdrop-blur";

  const linkClass = isWholesale
    ? "rounded-lg px-3 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
    : "rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950 transition-colors";

  const isWholesaleAllowed = WHOLESALE_ENABLED && Boolean(
    profile?.isApprovedWholesale ||
    profile?.customerTier === "wholesale" ||
    profile?.role === "admin"
  );

  const toggleChannelLink = isWholesale ? (
    <Link
      className="rounded-lg px-2.5 py-1.5 text-xs font-semibold bg-zinc-800 text-zinc-200 hover:bg-zinc-700 border border-zinc-700 transition-colors"
      href="/"
    >
      Ir a Minorista
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
    : "size-11 shrink-0 place-items-center rounded-xl text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950 grid transition-colors";

  return (
    <header ref={headerRef} className={`${headerClass} ${open ? "z-[46]" : ""}`}>
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-2 px-3 sm:gap-3 sm:px-6 lg:px-8">
        <Link className="group flex shrink-0 items-center gap-1.5" href={isWholesale ? "/mayorista" : "/"} aria-label={brandName}>
          <div className="relative h-10 w-14 shrink-0 overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-zinc-200 transition group-hover:scale-105 sm:h-11 sm:w-20">
            <Image
              src="/mya-mark-white.png"
              alt=""
              width={80}
              height={80}
              className="absolute left-1/2 top-1/2 h-16 w-16 max-w-none -translate-x-1/2 -translate-y-1/2 object-contain sm:h-20 sm:w-20"
            />
          </div>
          <span className={`hidden text-[12px] font-bold tracking-tight min-[360px]:inline sm:text-sm ${isWholesale ? "text-white" : "text-slate-800"}`}>importaciones</span>
          {isWholesale && <span className="hidden rounded-full border border-amber-400/40 px-2 py-1 text-[10px] font-semibold text-amber-300 xl:block">Mayorista</span>}
        </Link>

        <nav aria-label="Navegación principal" className="ml-4 hidden items-center gap-1 xl:flex">
          <Link aria-current={pathname === "/" ? "page" : undefined} className={`${linkClass} ${pathname === "/" ? "bg-sky-50 text-sky-800" : ""}`} href="/">
            Inicio
          </Link>

          {/* Categorías Link con Dropdown estructurado y sin bug de cursor */}
          <div
            className="relative"
            onMouseEnter={handleMouseEnterMenu}
            onMouseLeave={handleMouseLeaveMenu}
          >
            <button
              type="button"
              onClick={() => {
                setCategoriesMenuOpen((prev) => !prev);
                if (!hoveredParentId && mainCategories.length > 0) {
                  setHoveredParentId(mainCategories[0].id);
                }
              }}
              className={`flex items-center gap-1.5 ${linkClass} cursor-pointer`}
              aria-expanded={categoriesMenuOpen}
            >
              Categorías
              <ChevronDown
                className={`h-4 w-4 transition-transform duration-200 ${
                  categoriesMenuOpen ? "rotate-180 text-sky-600" : "text-zinc-400"
                }`}
              />
            </button>

            {/* Bridge container: anclado a top-full con pt-2 de padding continuo para que no se cierre */}
            <div
              className={`absolute left-0 top-full pt-2 z-50 transition-all duration-200 ease-out ${
                categoriesMenuOpen
                  ? "opacity-100 visible translate-y-0"
                  : "opacity-0 invisible -translate-y-1 pointer-events-none"
              }`}
            >
              <div
                className={`w-[760px] rounded-2xl border shadow-2xl overflow-hidden backdrop-blur-md transition-colors ${
                  isWholesale
                    ? "border-zinc-800 bg-zinc-900/98 text-zinc-100"
                    : "border-zinc-200/90 bg-white/98 text-zinc-900"
                }`}
              >
                <div className="grid grid-cols-[250px_1fr]">
                  {/* Left Column: Categorías Principales */}
                  <div
                    className={`p-3 border-r ${
                      isWholesale
                        ? "border-zinc-800 bg-zinc-950/60"
                        : "border-zinc-100 bg-zinc-50/80"
                    }`}
                  >
                    <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      Rubros Principales
                    </p>
                    <div className="space-y-1 mt-1">
                      {mainCategories.map((category) => {
                        const isSelected = activeParentCategory?.id === category.id;
                        return (
                          <div
                            key={category.id}
                            onMouseEnter={() => setHoveredParentId(category.id)}
                            onFocus={() => setHoveredParentId(category.id)}
                            className={`group flex items-center justify-between rounded-xl px-3 py-2.5 text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                              isSelected
                                ? isWholesale
                                  ? "bg-zinc-800 text-white shadow-xs"
                                  : "bg-white text-zinc-950 shadow-xs border border-zinc-200/80"
                                : isWholesale
                                ? "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
                                : "text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100/80"
                            }`}
                          >
                            <Link
                              href={`${catalogPath}?category=${category.slug}`}
                              onClick={() => setCategoriesMenuOpen(false)}
                              className="flex items-center gap-2.5 flex-1 min-w-0"
                            >
                              <span className={isSelected ? "text-sky-600" : "text-zinc-400"}>
                                {getCategoryIcon(category.slug, "h-4 w-4 shrink-0")}
                              </span>
                              <span className={`truncate font-semibold ${isWholesale ? (isSelected ? "text-white" : "text-zinc-300") : (isSelected ? "text-black font-bold" : "text-zinc-900")}`}>
                                {category.name}
                              </span>
                            </Link>

                            <ChevronRight
                              className={`h-4 w-4 shrink-0 transition-transform ${
                                isSelected
                                  ? "text-sky-600 translate-x-0.5"
                                  : "text-zinc-300 opacity-0 group-hover:opacity-100"
                              }`}
                            />
                          </div>
                        );
                      })}
                    </div>

                    <div className={`mt-3 pt-3 border-t ${isWholesale ? "border-zinc-800" : "border-zinc-200/60"}`}>
                      <Link
                        href={catalogPath}
                        onClick={() => setCategoriesMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-sky-600 hover:text-sky-700 transition"
                      >
                        <LayoutGrid className="h-3.5 w-3.5" />
                        Ver catálogo completo
                      </Link>
                    </div>
                  </div>

                  {/* Right Column: Subcategorías del Rubro Activo */}
                  <div className="p-4 flex flex-col justify-between min-h-[320px] max-h-[440px] overflow-y-auto">
                    {activeParentCategory && (
                      <div>
                        <div className={`flex items-center justify-between border-b pb-3 mb-3 ${isWholesale ? "border-zinc-800" : "border-zinc-100"}`}>
                          <div className="min-w-0 pr-3">
                            <div className="flex items-center gap-2">
                              <span className={`flex h-6 w-6 items-center justify-center rounded-lg shrink-0 ${
                                isWholesale ? "bg-sky-950/60 text-sky-400" : "bg-sky-50 text-sky-600"
                              }`}>
                                {getCategoryIcon(activeParentCategory.slug, "h-3.5 w-3.5")}
                              </span>
                              <h4 className={`text-sm font-bold truncate ${isWholesale ? "text-white" : "text-black"}`}>
                                {activeParentCategory.name}
                              </h4>
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${
                                isWholesale
                                  ? "bg-zinc-800 text-zinc-400 border-zinc-700/60"
                                  : "bg-zinc-100 text-zinc-700 border-zinc-200/60"
                              }`}>
                                {activeSubcategories.length > 0 ? `${activeSubcategories.length} líneas` : "Línea directa"}
                              </span>
                            </div>
                            <p className={`text-[11px] line-clamp-1 mt-1 ${isWholesale ? "text-zinc-400" : "text-zinc-600"}`}>
                              {activeParentCategory.description || "Consultá disponibilidad y condiciones de cada producto."}
                            </p>
                          </div>
                          <Link
                            href={`${catalogPath}?category=${activeParentCategory.slug}`}
                            onClick={() => setCategoriesMenuOpen(false)}
                            className={`group/btn inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold shadow-xs transition shrink-0 ${
                              isWholesale
                                ? "bg-white text-zinc-950 hover:bg-zinc-200"
                                : "bg-zinc-950 text-white hover:bg-zinc-800"
                            }`}
                          >
                            <span>Ver todo</span>
                            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/btn:translate-x-0.5" />
                          </Link>
                        </div>

                        {activeSubcategories.length > 0 ? (
                          <div className="grid grid-cols-2 gap-1.5 pr-1">
                            {activeSubcategories.map((sub) => (
                              <Link
                                key={sub.id}
                                href={`${catalogPath}?category=${sub.slug}`}
                                onClick={() => setCategoriesMenuOpen(false)}
                                className={`group/sub flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium border transition-all ${
                                  isWholesale
                                    ? "bg-zinc-950/40 hover:bg-zinc-800/80 border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white"
                                    : "bg-zinc-50/70 hover:bg-zinc-100/90 border-zinc-200/60 hover:border-zinc-300 text-zinc-700 hover:text-black shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
                                }`}
                                title={sub.name}
                              >
                                <span className={`truncate pr-1 font-medium ${isWholesale ? "text-zinc-200" : "text-zinc-900"}`}>{sub.name}</span>
                                <ChevronRight className="h-3 w-3 opacity-0 -translate-x-1 group-hover/sub:opacity-100 group-hover/sub:translate-x-0 transition-all text-sky-500 shrink-0" />
                              </Link>
                            ))}
                          </div>
                        ) : (
                          <div className={`py-10 text-center text-xs ${isWholesale ? "text-zinc-400" : "text-zinc-500"}`}>
                            <p>Todos los modelos de {activeParentCategory.name} se encuentran unificados en esta sección.</p>
                            <Link
                              href={`${catalogPath}?category=${activeParentCategory.slug}`}
                              onClick={() => setCategoriesMenuOpen(false)}
                              className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-zinc-900 text-white hover:bg-zinc-800 text-xs font-semibold rounded-xl transition"
                            >
                              <span>Explorar {activeParentCategory.name}</span>
                              <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Link className={linkClass} href="/#ofertas">
            Descubrí más
          </Link>

          {profile ? <Link className={`${linkClass} whitespace-nowrap`} href="/cuenta">Mis pedidos</Link> : <Link className={linkClass} href="/seguimiento">Seguimiento</Link>}

          {toggleChannelLink}
        </nav>

        {/* Búsqueda */}
        <div className="relative ml-auto hidden w-full max-w-xs md:block">
          <div className={`flex h-11 items-center gap-2 rounded-xl border pl-3 pr-0 focus-within:ring-2 focus-within:ring-sky-500/30 ${
            isWholesale
              ? "border-zinc-800 bg-zinc-900 text-white placeholder:text-zinc-500"
              : "border-zinc-200 bg-zinc-50 text-zinc-900 placeholder:text-zinc-400"
          }`}>
            <Search className="h-4 w-4 text-zinc-500" />
            <input
              aria-label="Buscar productos"
              className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-zinc-500"
              placeholder="Buscar productos..."
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") showSearchResults(); }}
            />
            {searchQuery && (
              <button type="button" aria-label="Borrar búsqueda" onClick={() => setSearchQuery("")} className="grid size-11 shrink-0 place-items-center rounded-xl text-zinc-500 hover:text-zinc-700">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Results Dropdown */}
          {searchQuery.trim().length >= 2 && !searchPending && searchResults.length > 0 && (
            <div className={`absolute left-0 right-0 mt-2 max-h-[calc(100dvh-6rem)] overflow-y-auto rounded-xl border p-2 shadow-xl z-50 animate-in fade-in duration-100 ${
              isWholesale
                ? "border-zinc-800 bg-zinc-900 text-zinc-100"
                : "border-zinc-200 bg-white text-zinc-900"
            }`}>
              <div className="text-[10px] uppercase font-bold text-zinc-500 px-3 py-1 border-b border-zinc-100/10 mb-1">
                Resultados sugeridos
              </div>
              <div className="space-y-1">
                {searchResults.map((product) => {
                  const price = isWholesale ? product.wholesalePrice : product.retailPrice;
                  return (
                    <Link
                      key={product.id}
                      href={`/producto/${product.slug}`}
                      onClick={() => setSearchQuery("")}
                      className={`w-full flex items-center gap-3 rounded-lg px-2 py-1.5 text-left text-sm transition-colors cursor-pointer ${
                        isWholesale
                          ? "hover:bg-zinc-800 text-zinc-200"
                          : "hover:bg-zinc-100 text-zinc-800"
                      }`}
                    >
                      <Image
                        width={32}
                        height={32}
                        src={product.imageUrl || "/placeholder-product.svg"}
                        alt={product.title}
                        className="h-8 w-8 rounded object-contain p-0.5 bg-zinc-50 border border-zinc-100"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate text-xs">{product.title}</p>
                        <p className="text-[10px] text-zinc-500">{product.categoryName}</p>
                      </div>
                      <span className="font-bold text-xs text-emerald-600">
                        {formatCurrency(price)}
                      </span>
                    </Link>
                  );
                })}
              </div>
              <div className="pt-2 border-t border-zinc-100/50 text-center">
                <Link
                  href={`${isWholesale ? "/mayorista" : "/catalogo"}?q=${encodeURIComponent(searchQuery)}`}
                  onClick={() => setSearchQuery("")}
                  className="text-[11px] font-bold text-sky-600 hover:text-sky-700 block py-1"
                >
                  Ver todos los resultados en el catálogo &rarr;
                </Link>
              </div>
            </div>
          )}

          {searchPending && <p role="status" className={`absolute left-0 right-0 z-50 mt-2 rounded-xl border p-3 text-sm shadow-lg ${isWholesale ? "border-zinc-800 bg-zinc-900 text-zinc-200" : "border-zinc-200 bg-white text-zinc-600"}`}>Buscando productos…</p>}
          {searchQuery.trim().length >= 2 && searchResults.length === 0 && !searchPending && (
            <div className={`absolute left-0 right-0 mt-2 rounded-xl border p-3 shadow-2xl z-50 text-center text-xs text-zinc-500 ${
              isWholesale ? "border-zinc-800 bg-zinc-900" : "border-zinc-200 bg-white"
            }`}>
              No se encontraron productos para &quot;{searchQuery}&quot;.
            </div>
          )}
        </div>

        <div className="ml-auto flex items-center gap-0 sm:gap-1 md:ml-2">
          {profile?.role === "admin" && (
            <Link
              aria-label="Panel admin"
              onClick={() => setOpen(false)}
              className={iconButtonClass}
              href="/admin"
              title="Panel admin"
            >
              <ShieldCheck className="h-5 w-5" />
            </Link>
          )}
          <Link
            aria-label="Cuenta"
            onClick={() => setOpen(false)}
            className={iconButtonClass}
            href={profile ? "/cuenta" : "/login"}
            title={profile ? "Mi cuenta" : "Iniciar sesión"}
          >
            <User className="h-5 w-5" />
          </Link>
          <Link
            aria-label="Favoritos"
            onClick={() => setOpen(false)}
            className={`relative ${iconButtonClass}`}
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

      {open && (
        <div id="mobile-site-menu" className={`absolute inset-x-0 top-full border-t px-4 py-3 xl:hidden max-h-[calc(100dvh-8rem-env(safe-area-inset-bottom))] overflow-y-auto overscroll-contain pb-6 shadow-2xl ${
          isWholesale ? "border-zinc-800 bg-zinc-950 text-white" : "border-zinc-200 bg-white text-zinc-900"
        }`}>
          <div className="relative mb-3">
            <div className={`flex h-11 items-center gap-2 rounded-xl border pl-3 pr-0 focus-within:ring-2 focus-within:ring-sky-500/30 ${
              isWholesale ? "border-zinc-800 bg-zinc-900" : "border-zinc-200 bg-zinc-50"
            }`}>
              <Search className="h-4 w-4 text-zinc-500" />
              <input
                aria-label="Buscar productos"
                className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-zinc-500"
                placeholder="Buscar productos..."
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") showSearchResults(); }}
              />
              {searchQuery && (
                <button type="button" aria-label="Borrar búsqueda" onClick={() => setSearchQuery("")} className="grid size-11 shrink-0 place-items-center rounded-xl text-zinc-500 hover:text-zinc-700">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Results Dropdown Mobile */}
            {searchQuery.trim().length >= 2 && !searchPending && searchResults.length > 0 && (
              <div className={`absolute left-0 right-0 mt-2 rounded-xl border p-2 shadow-2xl z-50 max-h-60 overflow-y-auto ${
                isWholesale
                  ? "border-zinc-800 bg-zinc-900 text-zinc-100"
                  : "border-zinc-200 bg-white text-zinc-900"
              }`}>
                <div className="space-y-1">
                  {searchResults.map((product) => {
                    const price = isWholesale ? product.wholesalePrice : product.retailPrice;
                    return (
                      <button
                        key={product.id}
                        onClick={() => {
                          setSelectedProduct(product);
                          setSearchQuery("");
                          setOpen(false);
                          menuButtonRef.current?.focus();
                        }}
                        className={`w-full flex items-center gap-3 rounded-lg px-2 py-1.5 text-left text-sm transition cursor-pointer ${
                          isWholesale ? "hover:bg-zinc-800 text-zinc-200" : "hover:bg-zinc-200 text-zinc-800"
                        }`}
                      >
                        <Image
                          width={32}
                          height={32}
                          src={product.imageUrl || "/placeholder-product.svg"}
                          alt={product.title}
                          className="h-8 w-8 rounded object-contain p-0.5 bg-zinc-50 border border-zinc-100"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate text-xs">{product.title}</p>
                          <p className="text-[10px] text-zinc-500">{product.categoryName}</p>
                        </div>
                        <span className="font-bold text-xs">{formatCurrency(price)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {searchPending && <p role="status" className={`absolute left-0 right-0 z-50 mt-2 rounded-xl border p-3 text-sm shadow-lg ${isWholesale ? "border-zinc-800 bg-zinc-900 text-zinc-200" : "border-zinc-200 bg-white text-zinc-600"}`}>Buscando productos…</p>}
            {searchQuery.trim().length >= 2 && searchResults.length === 0 && !searchPending && (
              <div className={`absolute left-0 right-0 mt-2 rounded-xl border p-3 shadow-2xl z-50 text-center text-xs text-zinc-500 ${
                isWholesale ? "border-zinc-800 bg-zinc-900" : "border-zinc-200 bg-white"
              }`}>
                No se encontraron productos.
              </div>
            )}
          </div>
          <nav className="grid gap-1">
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

            {/* Categorías en menú móvil: 4 Rubros Principales con subcategorías desplegables al tocar */}
            {mainCategories.length > 0 && (
              <div className={`py-2 my-1.5 rounded-2xl border ${isWholesale ? "border-zinc-800 bg-zinc-900/40" : "border-zinc-200/80 bg-zinc-50/50"}`}>
                <div className="px-3 py-1 flex items-center justify-between">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    Rubros Principales
                  </p>
                  <Link
                    href={catalogPath}
                    onClick={() => setOpen(false)}
                    className="text-[11px] font-bold text-sky-600 hover:text-sky-700"
                  >
                    Ver catálogo completo
                  </Link>
                </div>
                <div className="space-y-1.5 p-2">
                  {mainCategories.map((category) => {
                    const subs = getSubcategories(category.id);
                    const isExpanded = expandedMobileCategory === category.id;

                    return (
                      <div
                        key={category.id}
                        className={`rounded-xl border transition-all ${
                          isExpanded
                            ? isWholesale
                              ? "border-zinc-700 bg-zinc-900"
                              : "border-zinc-300 bg-white shadow-xs"
                            : isWholesale
                            ? "border-zinc-800/80 bg-zinc-950/60"
                            : "border-zinc-200/60 bg-white"
                        }`}
                      >
                        {/* Al tocar la fila completa del rubro se despliegan sus subcategorías */}
                        {subs.length > 0 ? (
                          <button
                            type="button"
                            onClick={() => setExpandedMobileCategory(isExpanded ? null : category.id)}
                            className="w-full flex items-center justify-between p-3 text-left cursor-pointer select-none active:scale-[0.99] transition-transform"
                            aria-expanded={isExpanded}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 pr-2">
                              <span className={`flex h-7 w-7 items-center justify-center rounded-lg shrink-0 ${
                                isWholesale ? "bg-sky-950/60 text-sky-400" : "bg-sky-50 text-sky-600"
                              }`}>
                                {getCategoryIcon(category.slug, "h-4 w-4")}
                              </span>
                              <span className={`font-bold text-sm truncate ${
                                isWholesale ? "text-white" : "text-black"
                              }`}>
                                {category.name}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                isWholesale ? "bg-zinc-800 text-zinc-400" : "bg-zinc-100 text-zinc-700"
                              }`}>
                                {subs.length}
                              </span>
                              <ChevronDown
                                className={`h-4 w-4 transition-transform duration-200 ${
                                  isExpanded ? "rotate-180 text-sky-600" : "text-zinc-400"
                                }`}
                              />
                            </div>
                          </button>
                        ) : (
                          <Link
                            href={`${catalogPath}?category=${category.slug}`}
                            onClick={() => setOpen(false)}
                            className="flex items-center justify-between p-3 text-left active:scale-[0.99] transition-transform"
                          >
                            <div className="flex items-center gap-2.5 min-w-0 pr-2">
                              <span className={`flex h-7 w-7 items-center justify-center rounded-lg shrink-0 ${
                                isWholesale ? "bg-sky-950/60 text-sky-400" : "bg-sky-50 text-sky-600"
                              }`}>
                                {getCategoryIcon(category.slug, "h-4 w-4")}
                              </span>
                              <span className={`font-bold text-sm truncate ${
                                isWholesale ? "text-white" : "text-black"
                              }`}>
                                {category.name}
                              </span>
                            </div>
                            <ArrowRight className="h-4 w-4 text-zinc-400 shrink-0" />
                          </Link>
                        )}

                        {/* Accordion Subcategories */}
                        {isExpanded && subs.length > 0 && (
                          <div className={`px-3 pb-3 pt-1 border-t space-y-2 mt-1 ${
                            isWholesale ? "border-zinc-800/80" : "border-zinc-100"
                          }`}>
                            {/* Botón Ver todo el Rubro */}
                            <Link
                              href={`${catalogPath}?category=${category.slug}`}
                              onClick={() => setOpen(false)}
                              className={`w-full flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-bold shadow-xs active:scale-[0.99] transition ${
                                isWholesale ? "bg-white text-zinc-950" : "bg-zinc-950 text-white"
                              }`}
                            >
                              <span>Ver todo en {category.name}</span>
                              <ArrowRight className="h-3.5 w-3.5" />
                            </Link>

                            {/* Subcategorías individuales como tarjetas táctiles */}
                            <div className="grid grid-cols-1 gap-1.5 pt-1">
                              {subs.map((sub) => (
                                <Link
                                  key={sub.id}
                                  href={`${catalogPath}?category=${sub.slug}`}
                                  onClick={() => setOpen(false)}
                                  className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium border transition-colors ${
                                    isWholesale
                                      ? "bg-zinc-950/50 hover:bg-zinc-800 border-zinc-800 text-zinc-300"
                                      : "bg-zinc-50/80 hover:bg-zinc-100 border-zinc-200/60 text-zinc-800 hover:text-black font-medium"
                                  }`}
                                >
                                  <span className="truncate pr-2">{sub.name}</span>
                                  <ChevronRight className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

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
                  Ir a Tienda Minorista
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
