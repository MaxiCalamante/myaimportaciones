"use client";

import Link from "next/link";
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
  Smartphone,
  Droplets,
  LayoutGrid,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { siteConfig } from "@/lib/site";
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
  const isWholesale = pathname?.startsWith("/mayorista");
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [apiResults, setApiResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const { cartCount, favoritesCount, setCartOpen, setSelectedProduct } = useCommerce();

  // Debounced server search across all 3,506 products
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      setApiResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}&channel=${isWholesale ? "wholesale" : "retail"}`);
        if (res.ok) {
          const json = await res.json();
          setApiResults(json.results || []);
        }
      } catch {
        // Fallback to local
      } finally {
        setIsSearching(false);
      }
    }, 180);

    return () => clearTimeout(timer);
  }, [searchQuery, isWholesale]);

  // Combine server results or client fallback
  const searchResults = apiResults.length > 0
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
    if (slug.includes("smartphone") || slug.includes("tecnologia")) return <Smartphone className={className} />;
    if (slug.includes("capilar")) return <Droplets className={className} />;
    return <LayoutGrid className={className} />;
  };

  const brandName = isWholesale ? "MYA Mayorista" : "MYA Importaciones";

  // Classes based on channel
  const headerClass = isWholesale
    ? "sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/95 text-white backdrop-blur"
    : "sticky top-0 z-40 border-b border-zinc-200 bg-white/95 text-zinc-950 backdrop-blur";

  const linkClass = isWholesale
    ? "rounded-lg px-3 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
    : "rounded-lg px-3 py-2 text-sm font-medium text-zinc-650 hover:bg-zinc-100 hover:text-zinc-950 transition-colors";

  const isWholesaleAllowed = Boolean(
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
    ? "h-10 w-10 place-items-center rounded-xl text-zinc-300 hover:bg-zinc-800 hover:text-white grid transition-colors"
    : "h-10 w-10 place-items-center rounded-xl text-zinc-650 hover:bg-zinc-100 hover:text-zinc-950 grid transition-colors";

  return (
    <header className={headerClass}>
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Link className="flex items-center gap-2.5 sm:gap-3 group shrink-0" href={isWholesale ? "/mayorista" : "/"}>
          <div className="relative h-10 w-10 sm:h-11 sm:w-11 shrink-0 overflow-hidden rounded-xl bg-white p-0.5 shadow-xs ring-1 ring-zinc-200 transition group-hover:scale-105">
            <img
              src="/logo.png"
              alt="MYA Importaciones Logo"
              className="h-full w-full object-contain rounded-lg"
            />
          </div>
          <div className="flex flex-col">
            <span className={`text-sm sm:text-base font-black tracking-tight leading-none ${
              isWholesale ? "text-white" : "text-zinc-950"
            }`}>
              MYA <span className="font-semibold text-sky-600">Importaciones</span>
            </span>
            <span className={`text-[10px] font-medium tracking-wide mt-0.5 ${
              isWholesale ? "text-amber-400 font-semibold uppercase text-[9px]" : "text-zinc-500"
            }`}>
              {isWholesale ? "Canal Mayorista Oficial" : "Distribución Oficial"}
            </span>
          </div>
        </Link>

        <nav className="ml-4 hidden items-center gap-1 lg:flex">
          <Link className={linkClass} href="/">
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
                className={`w-[660px] rounded-2xl border shadow-2xl overflow-hidden backdrop-blur-md transition-colors ${
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
                            className={`group flex items-center justify-between rounded-xl px-3 py-2.5 text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                              isSelected
                                ? isWholesale
                                  ? "bg-zinc-800 text-white shadow-xs"
                                  : "bg-white text-zinc-950 shadow-xs border border-zinc-200/80"
                                : isWholesale
                                ? "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
                                : "text-zinc-650 hover:text-zinc-950 hover:bg-zinc-100/80"
                            }`}
                          >
                            <Link
                              href={`${isWholesale ? "/mayorista" : ""}?category=${category.slug}#catalogo`}
                              onClick={() => setCategoriesMenuOpen(false)}
                              className="flex items-center gap-2.5 flex-1 min-w-0"
                            >
                              <span className={isSelected ? "text-sky-600" : "text-zinc-400"}>
                                {getCategoryIcon(category.slug, "h-4 w-4 shrink-0")}
                              </span>
                              <span className="truncate">{category.name}</span>
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

                    <div className="mt-3 pt-3 border-t border-zinc-200/60 dark:border-zinc-800">
                      <Link
                        href="/#catalogo"
                        onClick={() => setCategoriesMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-sky-600 hover:text-sky-700 transition"
                      >
                        <LayoutGrid className="h-3.5 w-3.5" />
                        Ver catálogo completo
                      </Link>
                    </div>
                  </div>

                  {/* Right Column: Subcategorías del Rubro Activo */}
                  <div className="p-4 flex flex-col justify-between min-h-[300px] max-h-[420px] overflow-y-auto">
                    {activeParentCategory && (
                      <div>
                        <div className="flex items-center justify-between border-b pb-3 mb-3 border-zinc-100 dark:border-zinc-800">
                          <div>
                            <h4 className="text-sm font-extrabold text-zinc-950 dark:text-white flex items-center gap-2">
                              {getCategoryIcon(activeParentCategory.slug, "h-4 w-4 text-sky-600")}
                              {activeParentCategory.name}
                            </h4>
                            <p className="text-[11px] text-zinc-500 line-clamp-1 mt-0.5">
                              {activeParentCategory.description || "Línea completa disponible con stock inmediato"}
                            </p>
                          </div>
                          <Link
                            href={`${isWholesale ? "/mayorista" : ""}?category=${activeParentCategory.slug}#catalogo`}
                            onClick={() => setCategoriesMenuOpen(false)}
                            className="text-xs font-bold text-sky-600 hover:text-sky-700 bg-sky-50 dark:bg-sky-950/50 hover:bg-sky-100 px-2.5 py-1.5 rounded-lg shrink-0 transition"
                          >
                            Ver todo &rarr;
                          </Link>
                        </div>

                        {activeSubcategories.length > 0 ? (
                          <div className="grid grid-cols-2 gap-1">
                            {activeSubcategories.map((sub) => (
                              <Link
                                key={sub.id}
                                href={`${isWholesale ? "/mayorista" : ""}?category=${sub.slug}#catalogo`}
                                onClick={() => setCategoriesMenuOpen(false)}
                                className={`block rounded-lg px-2.5 py-1.5 text-xs transition truncate ${
                                  isWholesale
                                    ? "text-zinc-300 hover:bg-zinc-800 hover:text-white"
                                    : "text-zinc-650 hover:bg-zinc-100 hover:text-zinc-950"
                                }`}
                                title={sub.name}
                              >
                                &bull; {sub.name}
                              </Link>
                            ))}
                          </div>
                        ) : (
                          <div className="py-10 text-center text-xs text-zinc-400">
                            <p>Todos los modelos de {activeParentCategory.name} se encuentran unificados en esta sección.</p>
                            <Link
                              href={`${isWholesale ? "/mayorista" : ""}?category=${activeParentCategory.slug}#catalogo`}
                              onClick={() => setCategoriesMenuOpen(false)}
                              className="inline-block mt-3 px-4 py-2 bg-zinc-900 text-white text-xs font-semibold rounded-xl"
                            >
                              Explorar {activeParentCategory.name} &rarr;
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
            Ofertas
          </Link>

          <Link className={linkClass} href="/seguimiento">
            Seguimiento
          </Link>

          {profile && (
            <Link className={linkClass} href="/cuenta">
              Mis Pedidos
            </Link>
          )}

          {toggleChannelLink}
        </nav>

        {/* Búsqueda */}
        <div className="relative ml-auto hidden w-full max-w-xs md:block">
          <div className={`flex h-10 items-center gap-2 rounded-lg border px-3 ${
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
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="text-zinc-400 hover:text-zinc-650 cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Results Dropdown */}
          {searchQuery.trim() !== "" && searchResults.length > 0 && (
            <div className={`absolute left-0 right-0 mt-2 rounded-xl border p-2 shadow-2xl z-50 animate-in fade-in duration-100 ${
              isWholesale
                ? "border-zinc-850 bg-zinc-900 text-zinc-100"
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
                      <img
                        src={product.imageUrl || "/window.svg"}
                        alt={product.title}
                        className="h-8 w-8 rounded object-cover bg-zinc-100"
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
                  href={`${isWholesale ? "/mayorista" : ""}?q=${encodeURIComponent(searchQuery)}`}
                  onClick={() => setSearchQuery("")}
                  className="text-[11px] font-bold text-sky-600 hover:text-sky-700 block py-1"
                >
                  Ver todos los resultados en el catálogo &rarr;
                </Link>
              </div>
            </div>
          )}

          {searchQuery.trim() !== "" && searchResults.length === 0 && !isSearching && (
            <div className={`absolute left-0 right-0 mt-2 rounded-xl border p-3 shadow-2xl z-50 text-center text-xs text-zinc-500 ${
              isWholesale ? "border-zinc-800 bg-zinc-900" : "border-zinc-200 bg-white"
            }`}>
              No se encontraron productos para "{searchQuery}".
            </div>
          )}
        </div>

        <div className="ml-auto flex items-center gap-1 md:ml-2">
          {profile?.role === "admin" && (
            <Link
              aria-label="Panel admin"
              className={iconButtonClass}
              href="/admin"
              title="Panel admin"
            >
              <ShieldCheck className="h-5 w-5" />
            </Link>
          )}
          <Link
            aria-label="Cuenta"
            className={iconButtonClass}
            href={profile ? "/cuenta" : "/login"}
            title={profile ? "Mi cuenta" : "Iniciar sesión"}
          >
            <User className="h-5 w-5" />
          </Link>
          <Link
            aria-label="Favoritos"
            className={`relative ${iconButtonClass}`}
            href="/cuenta"
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
            onClick={() => setCartOpen(true)}
            title="Carrito"
            type="button"
          >
            <ShoppingBag className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-emerald-600 px-1 text-[10px] font-bold text-white">
                {cartCount}
              </span>
            )}
          </button>
          <button
            aria-label="Abrir menu"
            className={`md:hidden ${iconButtonClass}`}
            onClick={() => setOpen((value) => !value)}
            type="button"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className={`border-t px-4 py-3 md:hidden ${
          isWholesale ? "border-zinc-800 bg-zinc-950 text-white" : "border-zinc-200 bg-white text-zinc-900"
        }`}>
          <div className="relative mb-3">
            <div className={`flex h-10 items-center gap-2 rounded-lg border px-3 ${
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
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="text-zinc-500 hover:text-zinc-700 cursor-pointer">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Results Dropdown Mobile */}
            {searchQuery.trim() !== "" && searchResults.length > 0 && (
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
                        }}
                        className={`w-full flex items-center gap-3 rounded-lg px-2 py-1.5 text-left text-sm transition cursor-pointer ${
                          isWholesale ? "hover:bg-zinc-800 text-zinc-200" : "hover:bg-zinc-150 text-zinc-800"
                        }`}
                      >
                        <img
                          src={product.imageUrl || "/window.svg"}
                          alt={product.title}
                          className="h-8 w-8 rounded object-cover bg-zinc-100"
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

            {searchQuery.trim() !== "" && searchResults.length === 0 && (
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
              href="/seguimiento"
              onClick={() => setOpen(false)}
            >
              Seguimiento de Pedidos
            </Link>

            {/* Categorías en menú móvil: 4 Rubros Principales con subcategorías desplegables */}
            {mainCategories.length > 0 && (
              <div className={`py-2 pl-3 border-l my-1.5 ${isWholesale ? "border-zinc-800" : "border-zinc-200"}`}>
                <p className="px-2 py-1 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  Rubros Principales
                </p>
                <div className="space-y-1 mt-1">
                  {mainCategories.map((category) => {
                    const subs = getSubcategories(category.id);
                    const isExpanded = expandedMobileCategory === category.id;

                    return (
                      <div key={category.id} className="space-y-1">
                        <div className="flex items-center justify-between rounded-xl pr-2">
                          <Link
                            href={`${isWholesale ? "/mayorista" : ""}?category=${category.slug}#catalogo`}
                            onClick={() => setOpen(false)}
                            className={`flex items-center gap-2 px-2.5 py-2 text-xs sm:text-sm font-semibold flex-1 ${
                              isWholesale ? "text-zinc-300 hover:text-white" : "text-zinc-800 hover:text-zinc-950"
                            }`}
                          >
                            <span className="text-sky-600">
                              {getCategoryIcon(category.slug, "h-4 w-4 shrink-0")}
                            </span>
                            <span>{category.name}</span>
                          </Link>

                          {subs.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setExpandedMobileCategory(isExpanded ? null : category.id)}
                              className="p-1.5 text-zinc-400 hover:text-zinc-600 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                              aria-label={`Ver subcategorías de ${category.name}`}
                            >
                              <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180 text-sky-600" : ""}`} />
                            </button>
                          )}
                        </div>

                        {/* Accordion Subcategories */}
                        {isExpanded && subs.length > 0 && (
                          <div className="pl-6 pr-2 py-1 space-y-1 border-l-2 border-zinc-200 dark:border-zinc-800 ml-3">
                            <Link
                              href={`${isWholesale ? "/mayorista" : ""}?category=${category.slug}#catalogo`}
                              onClick={() => setOpen(false)}
                              className="block py-1 text-xs font-bold text-sky-600 hover:underline"
                            >
                              Ver todo {category.name} &rarr;
                            </Link>
                            {subs.map((sub) => (
                              <Link
                                key={sub.id}
                                href={`${isWholesale ? "/mayorista" : ""}?category=${sub.slug}#catalogo`}
                                onClick={() => setOpen(false)}
                                className={`block py-1 text-xs ${
                                  isWholesale ? "text-zinc-400 hover:text-zinc-200" : "text-zinc-600 hover:text-zinc-900"
                                }`}
                              >
                                &bull; {sub.name}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {profile && (
              <Link
                className={`rounded-lg px-3 py-2 text-sm font-medium ${
                  isWholesale ? "text-zinc-300 hover:bg-zinc-800" : "text-zinc-700 hover:bg-zinc-100"
                }`}
                href="/cuenta"
                onClick={() => setOpen(false)}
              >
                Mis pedidos
              </Link>
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
              Ofertas Especiales
            </Link>

            {isWholesale ? (
              <div className="border-t border-zinc-800 my-2 pt-2">
                <Link
                  className="block text-center rounded-xl px-3 py-2.5 text-xs font-semibold bg-zinc-850 text-zinc-200 border border-zinc-700"
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
