"use client";

import Link from "next/link";
import { ChevronDown, Heart, Menu, Search, ShieldCheck, ShoppingBag, User, X } from "lucide-react";
import { useState } from "react";
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
  const { cartCount, favoritesCount, setCartOpen, setSelectedProduct } = useCommerce();

  // Filter search results dynamically
  const searchResults = searchQuery.trim() === ""
    ? []
    : initialProducts.filter((p) => {
        const matchesText =
          p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.description.toLowerCase().includes(searchQuery.toLowerCase());
        if (isWholesale) {
          return matchesText && (p.wholesalePrice > 0 || p.wholesaleOnly);
        } else {
          return matchesText && !p.wholesaleOnly;
        }
      }).slice(0, 5);

  // Filter categories based on channel
  const categories = initialCategories.filter((cat) => {
    if (isWholesale) {
      return true; // Show all in wholesale or we could filter by cat.wholesaleOnly
    } else {
      return !cat.wholesaleOnly; // Retail only shows non-wholesale-only
    }
  });

  const brandName = isWholesale ? "MYA Mayorista" : "MYA Importaciones";

  // Classes based on channel
  const headerClass = isWholesale
    ? "sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/95 text-white backdrop-blur"
    : "sticky top-0 z-40 border-b border-zinc-200 bg-white/95 text-zinc-950 backdrop-blur";

  const linkClass = isWholesale
    ? "rounded-lg px-3 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
    : "rounded-lg px-3 py-2 text-sm font-medium text-zinc-650 hover:bg-zinc-100 hover:text-zinc-950 transition-colors";

  const toggleChannelLink = isWholesale ? (
    <Link
      className="rounded-lg px-3 py-2 text-sm font-medium bg-emerald-950/80 text-emerald-300 hover:bg-emerald-950 border border-emerald-800/30 transition-colors"
      href="/"
    >
      Ir a Minorista
    </Link>
  ) : (
    <Link
      className="rounded-lg px-3 py-2 text-sm font-medium bg-amber-50 text-amber-700 hover:bg-amber-100/70 border border-amber-200/40 transition-colors"
      href="/mayorista"
    >
      Mayorista
    </Link>
  );

  const iconButtonClass = isWholesale
    ? "h-10 w-10 place-items-center rounded-lg text-zinc-300 hover:bg-zinc-800 hover:text-white grid transition-colors"
    : "h-10 w-10 place-items-center rounded-lg text-zinc-650 hover:bg-zinc-100 hover:text-zinc-950 grid transition-colors";

  return (
    <header className={headerClass}>
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Link className="flex items-center gap-3 group" href={isWholesale ? "/mayorista" : "/"}>
          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-sky-50 p-0.5 shadow-xs ring-1 ring-sky-200/60 transition group-hover:scale-105">
            <img
              src="/logo.png"
              alt="MYA Importaciones Logo"
              className="h-full w-full object-cover rounded-lg"
            />
          </div>
          <div className="flex flex-col">
            <span className={`text-sm font-black uppercase tracking-tight sm:text-base flex items-center gap-1 ${
              isWholesale ? "text-white" : "text-zinc-950"
            }`}>
              MYA <span className="font-semibold text-sky-600 text-xs sm:text-sm">Importaciones</span>
            </span>
            <span className={`text-[9px] font-bold tracking-wider uppercase ${
              isWholesale ? "text-amber-400" : "text-zinc-500"
            }`}>
              {isWholesale ? "Canal Mayorista" : "Venta Directa"}
            </span>
          </div>
        </Link>

        <nav className="ml-4 hidden items-center gap-1 md:flex">
          {/* El enlace de Inicio siempre lleva al inicio del sitio minorista */}
          <Link className={linkClass} href="/">
            Inicio
          </Link>

          {/* Categorías Link con Dropdown al pasar el cursor */}
          <div className="relative group">
            <Link
              href="/#categorias"
              className={`flex items-center gap-1 ${linkClass}`}
            >
              Categorías
              <ChevronDown className="h-4 w-4" />
            </Link>

            <div className={`absolute left-0 mt-2 w-56 rounded-xl border p-2 shadow-xl z-50 transition-all duration-150 transform scale-95 opacity-0 pointer-events-none group-hover:scale-100 group-hover:opacity-100 group-hover:pointer-events-auto ${
              isWholesale
                ? "border-zinc-800 bg-zinc-900 text-zinc-100"
                : "border-zinc-200 bg-white text-zinc-900"
            }`}>
              {categories.length === 0 ? (
                <p className="px-3 py-2 text-xs text-zinc-500">No hay categorías</p>
              ) : (
                categories.map((category) => (
                  <Link
                    key={category.id}
                    href={`${isWholesale ? "/mayorista" : ""}?category=${category.slug}`}
                    className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
                      isWholesale
                        ? "hover:bg-zinc-800 hover:text-white text-zinc-300"
                        : "hover:bg-zinc-100 hover:text-zinc-950 text-zinc-700"
                    }`}
                  >
                    {category.name}
                  </Link>
                ))
              )}
            </div>
          </div>

          {profile && (
            <Link className={linkClass} href="/cuenta">
              Mis pedidos
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
                    <button
                      key={product.id}
                      onClick={() => {
                        setSelectedProduct(product);
                        setSearchQuery("");
                      }}
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
                      <span className="font-bold text-xs">
                        {formatCurrency(price)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {searchQuery.trim() !== "" && searchResults.length === 0 && (
            <div className={`absolute left-0 right-0 mt-2 rounded-xl border p-3 shadow-2xl z-50 text-center text-xs text-zinc-505 ${
              isWholesale ? "border-zinc-800 bg-zinc-900" : "border-zinc-200 bg-white"
            }`}>
              No se encontraron productos.
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

            {/* Categorías en menú móvil */}
            {categories.length > 0 && (
              <div className={`py-1 pl-3 border-l my-1 ${isWholesale ? "border-zinc-800" : "border-zinc-200"}`}>
                <p className="px-3 py-1 text-xs font-semibold text-zinc-500 uppercase">Categorías</p>
                {categories.map((category) => (
                  <Link
                    key={category.id}
                    href={`${isWholesale ? "/mayorista" : ""}?category=${category.slug}`}
                    onClick={() => setOpen(false)}
                    className={`block rounded-lg px-3 py-2 text-sm ${
                      isWholesale ? "text-zinc-400 hover:bg-zinc-850 hover:text-white" : "text-zinc-650 hover:bg-zinc-100"
                    }`}
                  >
                    {category.name}
                  </Link>
                ))}
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

            <div className={`border-t my-2 pt-2 ${isWholesale ? "border-zinc-800" : "border-zinc-200"}`}>
              {isWholesale ? (
                <Link
                  className="block text-center rounded-lg px-3 py-2 text-sm font-medium bg-emerald-950 text-emerald-300 border border-emerald-900"
                  href="/"
                  onClick={() => setOpen(false)}
                >
                  Ir a Minorista
                </Link>
              ) : (
                <Link
                  className="block text-center rounded-lg px-3 py-2 text-sm font-medium bg-amber-50 text-amber-700 border border-amber-100"
                  href="/mayorista"
                  onClick={() => setOpen(false)}
                >
                  Ir a Mayorista
                </Link>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
