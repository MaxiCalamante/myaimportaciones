"use client";

import Link from "next/link";
import Image from "next/image";
import { Mail, MapPin, Phone, MessageCircle } from "lucide-react";
import { usePathname } from "next/navigation";
import { siteConfig } from "@/lib/site";
import { useCommerce } from "@/components/commerce/commerce-provider";

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

export function SiteFooter() {
  const pathname = usePathname();
  const { openWhatsApp } = useCommerce();
  const isWholesale = pathname?.startsWith("/mayorista");

  return (
    <footer className="border-t border-zinc-900 bg-zinc-950 text-white">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
        {/* Column 1: Info */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative h-12 w-20 shrink-0 overflow-hidden rounded-lg bg-white ring-1 ring-white/30">
              <Image
                src="/mya-mark-white.png"
                alt={siteConfig.brandName}
                width={80}
                height={80}
                className="absolute left-1/2 top-1/2 h-20 w-20 max-w-none -translate-x-1/2 -translate-y-1/2 object-contain"
              />
            </div>
            <div className="leading-tight">
              <span className="block text-base font-bold text-white">importaciones</span>
              {isWholesale && <span className="mt-1 block text-[10px] font-semibold text-amber-300">Mayorista</span>}
            </div>
          </div>
          <p className="text-sm leading-6 text-zinc-400">
            {isWholesale
              ? "Tu distribuidor directo de confianza. Abastecemos a comercios, ferreterías y revendedores con Cosmética Coreana (K-Beauty original), tratamientos capilares Karseell y herramientas industriales Total y Wadfow con precios diferenciales por bulto cerrado."
              : "Tu tienda de confianza en importaciones. Electrónica Apple y Samsung, cosmética coreana, cuidado capilar, fragancias y herramientas. Atención de Máximo y Agustina desde Tandil con envíos a toda la Argentina."}
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <a
              href={siteConfig.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-pink-500/10 border border-pink-500/20 px-3 py-1.5 text-xs font-semibold text-pink-400 hover:bg-pink-500/20 transition-colors"
            >
              <InstagramIcon className="h-4 w-4" />
              {siteConfig.instagramHandle}
            </a>
            <button
              type="button"
              onClick={() => openWhatsApp("Hola MYA Importaciones! Quisiera hacer una consulta.")}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 transition-colors cursor-pointer"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp (Máximo o Agustina)
            </button>
          </div>
        </div>

        {/* Column 2: Rubros */}
        <div>
          <h2 className="text-sm font-semibold uppercase text-zinc-300 tracking-wider">Catálogos & Rubros</h2>
          <div className="mt-4 grid text-sm [&_a]:inline-flex [&_a]:min-h-11 [&_a]:items-center">
            <Link className="text-zinc-400 hover:text-sky-400 transition-colors" href={isWholesale ? "/mayorista?category=cosmetica-coreana" : "/catalogo?category=cosmetica-coreana"}>
              Cosmética Coreana (K-Beauty)
            </Link>
            <Link className="text-zinc-400 hover:text-sky-400 transition-colors" href={isWholesale ? "/mayorista?category=herramientas-equipamiento" : "/catalogo?category=herramientas-equipamiento"}>
              Herramientas Total Tools & Wadfow
            </Link>
            <Link className="text-zinc-400 hover:text-sky-400 transition-colors" href={isWholesale ? "/mayorista?category=cuidado-capilar" : "/catalogo?category=cuidado-capilar"}>
              Tratamientos Capilares & Karseell
            </Link>
            <Link className="text-zinc-400 hover:text-sky-400 transition-colors" href={isWholesale ? "/mayorista" : "/catalogo"}>
              Explorar productos
            </Link>
            {!isWholesale && <Link className="text-zinc-400 hover:text-sky-400 transition-colors" href="/catalogo?category=electronica">Electrónica Apple & Samsung</Link>}
          </div>
        </div>

        {/* Column 3: Navigation */}
        <div>
          <h2 className="text-sm font-semibold uppercase text-zinc-300 tracking-wider">Navegación & Ayuda</h2>
          <div className="mt-4 grid text-sm [&_a]:inline-flex [&_a]:min-h-11 [&_a]:items-center">
            {isWholesale ? (
              <>
                <Link className="text-zinc-400 hover:text-white transition-colors" href="/mayorista">
                  Catálogo Mayorista
                </Link>
                <Link className="text-zinc-400 hover:text-white transition-colors" href="/">
                  Tienda Minorista
                </Link>
              </>
            ) : (
              <>
                <Link className="text-zinc-400 hover:text-white transition-colors" href="/catalogo">
                  Catálogo de Productos
                </Link>
                <Link className="text-zinc-400 hover:text-white transition-colors" href="/#ofertas">
                  Más para descubrir
                </Link>
                <button
                  type="button"
                  onClick={() => openWhatsApp("Hola MYA Importaciones! Quisiera consultar por un producto.")}
                  className="inline-flex min-h-11 items-center text-left text-amber-400/90 hover:text-amber-300 transition-colors cursor-pointer"
                >
                  Consultas sobre productos
                </button>
              </>
            )}
            <Link className="text-zinc-400 hover:text-white" href="/condiciones">Condiciones, envíos y devoluciones</Link>
            <Link className="text-zinc-400 hover:text-white" href="/privacidad">Privacidad</Link>
            <Link className="text-amber-300 hover:text-white" href="/arrepentimiento">Botón de arrepentimiento</Link>
            <Link className="text-zinc-400 hover:text-white transition-colors" href="/seguimiento">
              Seguimiento de Pedidos
            </Link>
            <Link className="text-zinc-400 hover:text-white transition-colors" href="/cuenta">
              Mi cuenta
            </Link>
          </div>
        </div>

        {/* Column 4: Contact */}
        <div>
          <h2 className="text-sm font-semibold uppercase text-zinc-300 tracking-wider">Contacto & Envíos</h2>
          <div className="mt-4 grid gap-3 text-sm text-zinc-400">
            <div>
              <p className="text-xs font-bold text-zinc-300">Máximo (Ventas & Envíos)</p>
              <div className="flex items-center gap-2 mt-0.5">
                <Phone className="h-3.5 w-3.5 text-sky-400" />
                <a href={`tel:${siteConfig.phone.replace(/[^+0-9]/g, "")}`} className="hover:text-white text-xs">{siteConfig.phone}</a>
                <button
                  type="button"
                  onClick={() => openWhatsApp("Hola Máximo! Quería hacerte una consulta.")}
                  className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded hover:bg-emerald-500/30 font-semibold cursor-pointer ml-1"
                >
                  Wpp
                </button>
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-zinc-300">Agustina (Ventas & Asesoramiento)</p>
              <div className="flex items-center gap-2 mt-0.5">
                <Phone className="h-3.5 w-3.5 text-pink-400" />
                <a href={`tel:${siteConfig.phoneAgustina.replace(/[^+0-9]/g, "")}`} className="hover:text-white text-xs">{siteConfig.phoneAgustina}</a>
                <button
                  type="button"
                  onClick={() => openWhatsApp("Hola Agustina! Quería hacerte una consulta sobre skincare o cosmética.")}
                  className="text-[10px] bg-pink-500/20 text-pink-400 px-1.5 py-0.5 rounded hover:bg-pink-500/30 font-semibold cursor-pointer ml-1"
                >
                  Wpp
                </button>
              </div>
            </div>

            <span className="flex items-center gap-2 pt-1 border-t border-zinc-900">
              <Mail className="h-4 w-4 text-sky-400" />
              <a href={`mailto:${siteConfig.email}`} className="inline-flex min-h-11 break-all items-center hover:text-white">{siteConfig.email}</a>
            </span>
            <span className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-sky-400" />
              {siteConfig.location}
            </span>
            <div className="border-t border-zinc-900 pt-2.5 mt-1 text-xs text-zinc-400 space-y-1">
              <p>Despachos por Correo Argentino a todo el país.</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Guarantees bar & Copyright */}
      <div className="mx-auto max-w-7xl border-t border-zinc-900 px-4 py-6 sm:px-6 lg:px-8 text-center text-xs text-zinc-400 space-y-2">
        <p className="text-zinc-400 font-medium">
          Precios en pesos argentinos · Consultá entrega y condiciones de compra
        </p>
        <p>
          &copy; {new Date().getFullYear()} MyA importaciones. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
}
