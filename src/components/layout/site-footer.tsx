"use client";

import Link from "next/link";
import Image from "next/image";
import { MapPin, MessageCircle, Truck } from "lucide-react";
import { usePathname } from "next/navigation";
import { siteConfig, getWhatsAppUrl } from "@/lib/site";
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
      <div className="mx-auto grid w-full max-w-7xl grid-cols-2 gap-x-6 gap-y-10 px-4 py-12 sm:px-6 md:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1.2fr] lg:px-8 lg:py-16">
        {/* Column 1: Info & Brand */}
        <div className="col-span-2 space-y-4 md:col-span-1">
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
              <span className="mt-1 block text-[10px] font-medium text-zinc-400">Mayorista y minorista</span>
            </div>
          </div>
          <p className="text-sm leading-6 text-zinc-400">
            {isWholesale
              ? "Explorá productos importados y precios mayoristas confirmados para tu negocio. Combiná rubros y armá tu pedido; las presentaciones o importes pendientes se confirman antes del pago."
              : "Tu tienda de confianza en importaciones. Belleza y cuidado personal, tecnología y electrónica, y herramientas industriales. Atención directa de Máximo y Agustina desde Tandil con envíos a toda la Argentina."}
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <a
              href={siteConfig.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white/5 border border-white/15 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-white/10 transition-colors"
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

        {/* Column 2: Los 3 Rubros Principales */}
        <div>
          <h2 className="text-sm font-semibold uppercase text-zinc-300 tracking-wider">Catálogos & Rubros</h2>
          <div className="mt-4 grid text-sm [&_a]:inline-flex [&_a]:min-h-11 [&_a]:items-center">
            <Link className="text-zinc-400 hover:text-sky-400 transition-colors font-medium" href="/catalogo?category=cosmetica-coreana">
              Belleza: K-Beauty, Capilar & Perfumes
            </Link>
            <Link className="text-zinc-400 hover:text-sky-400 transition-colors" href="/catalogo?category=cosmetica-coreana">
              · Cosmética Coreana (SKIN1004, Medicube)
            </Link>
            <Link className="text-zinc-400 hover:text-sky-400 transition-colors" href="/catalogo?category=cuidado-capilar">
              · Cuidado Capilar (Karseell, Kérastase)
            </Link>
            <Link className="text-zinc-400 hover:text-sky-400 transition-colors" href="/catalogo?category=perfumeria">
              · Perfumería & Fragancias Árabes
            </Link>
            <Link className="text-zinc-400 hover:text-sky-400 transition-colors font-medium" href="/catalogo?category=electronica">
              Tecnología & Electrónica
            </Link>
            <Link className="text-zinc-400 hover:text-sky-400 transition-colors font-medium" href="/catalogo?category=herramientas-equipamiento">
              Herramientas Total Tools & Wadfow
            </Link>
            <Link className="text-zinc-400 hover:text-sky-400 transition-colors" href={isWholesale ? "/mayorista" : "/catalogo"}>
              Explorar catálogo completo
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
                  Novedades y Ofertas
                </Link>
                <Link className="text-sky-300 hover:text-white font-medium" href="/mayorista">
                  Venta mayorista para comercios
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

        {/* Column 4: Contact & Location */}
        <div className="col-span-2 md:col-span-1">
          <h2 className="text-sm font-semibold text-zinc-200">Hablemos de tu próxima compra</h2>
          <div className="mt-4 grid gap-3 text-sm text-zinc-400">
            {siteConfig.whatsappContacts.map(contact => (
              <a
                key={contact.id}
                href={getWhatsAppUrl(`Hola ${contact.name}, quiero hacer una consulta sobre MYA Importaciones.`, contact.whatsappNumber)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-16 items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 hover:bg-white/10 transition-colors"
              >
                <MessageCircle className="size-5 shrink-0 stroke-[1.5] text-zinc-200" />
                <span className="min-w-0">
                  <span className="block text-xs font-medium text-white">WhatsApp de {contact.name}</span>
                  <span className="mt-0.5 block text-xs tabular-nums text-zinc-400">{contact.phone}</span>
                </span>
              </a>
            ))}
            <p className="flex items-center gap-2 pt-2 text-xs leading-5">
              <MapPin className="size-4 shrink-0 text-sky-400" />
              {siteConfig.location}
            </p>
            <p className="text-xs leading-5 flex items-center gap-2">
              <Truck className="size-4 shrink-0 text-emerald-400" />
              Envíos a toda Argentina por Correo Argentino.
            </p>
          </div>
        </div>
      </div>

      {/* Guarantees bar & Copyright */}
      <div className="mx-auto max-w-7xl border-t border-zinc-900 px-4 pt-6 pb-24 sm:px-6 md:pb-6 lg:px-8 text-center text-xs text-zinc-400 space-y-2">
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
