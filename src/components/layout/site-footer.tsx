"use client";

import Link from "next/link";
import Image from "next/image";
import { Mail, MapPin, Phone, MessageCircle } from "lucide-react";
import { usePathname } from "next/navigation";
import { siteConfig } from "@/lib/site";

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
              : "Cosmética coreana, cuidado capilar y herramientas. Atención desde Tandil y opciones de entrega según tu compra."}
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
            <a
              href={`https://wa.me/${siteConfig.whatsappNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 transition-colors"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </a>
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
                <a
                  className="text-amber-400/90 hover:text-amber-300 transition-colors"
                  href={`https://wa.me/${siteConfig.whatsappNumber}?text=${encodeURIComponent(
                    "Hola MYA Importaciones! Quisiera consultar por un producto."
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Consultas sobre productos
                </a>
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
            <span className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-sky-400" />
              <a href={`tel:${siteConfig.phone.replace(/[^+0-9]/g, "")}`} className="inline-flex min-h-11 items-center hover:text-white">{siteConfig.phone}</a>
            </span>
            <span className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-sky-400" />
              <a href={`mailto:${siteConfig.email}`} className="inline-flex min-h-11 break-all items-center hover:text-white">{siteConfig.email}</a>
            </span>
            <span className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-sky-400" />
              {siteConfig.location}
            </span>
            <div className="border-t border-zinc-900 pt-2.5 mt-1 text-xs text-zinc-400 space-y-1">
              <p>Consultá las opciones de entrega disponibles para tu destino.</p>
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
