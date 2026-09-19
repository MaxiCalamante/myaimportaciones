"use client";

import Link from "next/link";
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

  const brandName = isWholesale ? "MYA Mayorista" : "MYA Importaciones";

  return (
    <footer className="border-t border-zinc-900 bg-zinc-950 text-white">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
        {/* Column 1: Info */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-sky-50 p-0.5 ring-1 ring-sky-200/50">
              <img
                src="/logo.png"
                alt="MYA Importaciones"
                className="h-full w-full object-cover rounded-lg"
              />
            </div>
            <div>
              <span className="text-sm font-black uppercase tracking-tight block">
                MYA <span className="font-semibold text-sky-400">Importaciones</span>
              </span>
              <span className="text-[10px] text-zinc-400 font-medium">Distribución Oficial</span>
            </div>
          </div>
          <p className="text-sm leading-6 text-zinc-400">
            {isWholesale
              ? "Tu distribuidor directo de confianza. Abastecemos a comercios, revendedores y profesionales con Cosmética Coreana (K-Beauty), smartphones y herramientas industriales con precios diferenciales por bulto cerrado."
              : "Importación directa sin intermediarios. Encontrá la mejor selección de Cosmética Coreana (K-Beauty original), smartphones liberados de fábrica y herramientas de equipamiento al mejor precio de Argentina."}
          </p>
          <div className="flex items-center gap-3 pt-2">
            <a
              href={siteConfig.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-pink-500/10 border border-pink-500/20 px-3 py-1.5 text-xs font-semibold text-pink-400 hover:bg-pink-500/20 transition-colors"
            >
              <InstagramIcon className="h-4 w-4" />
              {siteConfig.instagramHandle}
            </a>
            <a
              href={`https://wa.me/${siteConfig.whatsappNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 transition-colors"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </a>
          </div>
        </div>

        {/* Column 2: Rubros */}
        <div>
          <h3 className="text-sm font-semibold uppercase text-zinc-300 tracking-wider">Catálogos & Rubros</h3>
          <div className="mt-4 grid gap-2 text-sm">
            <Link className="text-zinc-400 hover:text-sky-400 transition-colors" href={isWholesale ? "/mayorista?category=cosmetica-coreana" : "/?category=cosmetica-coreana"}>
              Cosmética Coreana (K-Beauty)
            </Link>
            <Link className="text-zinc-400 hover:text-sky-400 transition-colors" href={isWholesale ? "/mayorista?category=smartphones-tecnologia" : "/?category=smartphones-tecnologia"}>
              Smartphones & Tecnología
            </Link>
            <Link className="text-zinc-400 hover:text-sky-400 transition-colors" href={isWholesale ? "/mayorista?category=herramientas-equipamiento" : "/?category=herramientas-equipamiento"}>
              Herramientas & Equipamiento
            </Link>
            <Link className="text-zinc-400 hover:text-sky-400 transition-colors" href={isWholesale ? "/mayorista?category=cuidado-capilar" : "/?category=cuidado-capilar"}>
              Cuidado Capilar & Personal
            </Link>
          </div>
        </div>

        {/* Column 3: Navigation */}
        <div>
          <h3 className="text-sm font-semibold uppercase text-zinc-300 tracking-wider">Navegación</h3>
          <div className="mt-4 grid gap-2 text-sm">
            {isWholesale ? (
              <>
                <Link className="text-zinc-400 hover:text-white transition-colors" href="/mayorista">
                  Portal Mayorista
                </Link>
                <Link className="text-zinc-400 hover:text-white transition-colors" href="/">
                  Tienda Minorista
                </Link>
              </>
            ) : (
              <>
                <Link className="text-zinc-400 hover:text-white transition-colors" href="/#catalogo">
                  Catálogo Destacado
                </Link>
                <Link className="text-zinc-400 hover:text-white transition-colors" href="/mayorista">
                  Acceso Mayorista
                </Link>
              </>
            )}
            <Link className="text-zinc-400 hover:text-white transition-colors" href="/cuenta">
              Seguimiento de Pedidos
            </Link>
            <Link className="text-zinc-400 hover:text-white transition-colors" href="/admin">
              Panel Administrativo
            </Link>
          </div>
        </div>

        {/* Column 4: Contact */}
        <div>
          <h3 className="text-sm font-semibold uppercase text-zinc-300 tracking-wider">Contacto & Envíos</h3>
          <div className="mt-4 grid gap-3 text-sm text-zinc-400">
            <span className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-sky-400" />
              {siteConfig.phone}
            </span>
            <span className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-sky-400" />
              {siteConfig.email}
            </span>
            <span className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-sky-400" />
              {siteConfig.location}
            </span>
            <div className="border-t border-zinc-900 pt-2.5 mt-1 text-xs text-zinc-500 space-y-1">
              <p>Despachos a todo el país (Correo / Expreso)</p>
              <p>Atención: Lunes a Sábados</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Copyright */}
      <div className="mx-auto max-w-7xl border-t border-zinc-900 px-4 py-6 sm:px-6 lg:px-8 text-center text-xs text-zinc-500">
        &copy; {new Date().getFullYear()} MYA Importaciones. Importación directa y distribución nacional. Todos los derechos reservados.
      </div>
    </footer>
  );
}
