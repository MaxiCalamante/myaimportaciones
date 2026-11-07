"use client";

import { ProductPrice } from "./currency-provider";
import { defaultCarouselSlides, type CarouselSlide } from "@/lib/carousel";
import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Boxes,
  ChevronRight,
  Headphones,
  Package,
  Pause,
  Play,
  ShieldCheck,
  Store,
  Truck,
} from "lucide-react";
import type { Category, Product, ProductChannel } from "@/lib/types";
import { ProductCard } from "@/components/commerce/product-card";
import { ButtonLink } from "@/components/ui/button";
import { WHOLESALE_MINIMUM_LABEL } from "@/lib/wholesale-policy";

/* ── StoreHero ── */
export function StoreHero({
  slides = defaultCarouselSlides,
  preview = false,
}: {
  slides?: CarouselSlide[];
  preview?: boolean;
}) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const [interacting, setInteracting] = useState(false);
  useEffect(() => {
    if (
      paused ||
      interacting ||
      preview ||
      slides.length < 2 ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const timer = setInterval(
      () => setCurrentSlide((index) => (index + 1) % slides.length),
      6500
    );
    return () => clearInterval(timer);
  }, [paused, interacting, preview, slides.length]);
  if (!slides.length) return null;
  const current = currentSlide % slides.length;
  return (
    <section
      aria-label={
        preview ? "Vista previa del carrusel" : "Carrusel de inicio"
      }
      onMouseEnter={() => setInteracting(true)}
      onMouseLeave={() => setInteracting(false)}
      onFocus={() => setInteracting(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setInteracting(false);
      }}
      className="bg-white"
    >
      {!preview && (
        <h1 className="sr-only">
          MYA Importaciones: belleza, tecnología y herramientas
        </h1>
      )}
      <div className="mya-container pt-3 sm:pt-5">
        <div className="relative overflow-hidden rounded-2xl bg-zinc-800 sm:rounded-3xl">
          {slides.map((slide, index) => (
            <div
              key={slide.id}
              hidden={index !== current}
              aria-hidden={index !== current}
              inert={index !== current}
              className={
                index === current
                  ? "relative isolate min-h-56 sm:min-h-80 lg:min-h-[26rem]"
                  : "hidden"
              }
            >
              {(index === 0 || index === current) && (
                <Image
                  src={slide.image}
                  alt=""
                  fill
                  sizes="(min-width:1280px) 1216px, 100vw"
                  quality={75}
                  preload={index === 0}
                  className="-z-20 object-cover object-[65%_center]"
                />
              )}
              <div
                aria-hidden="true"
                className="absolute inset-0 -z-10 bg-gradient-to-r from-black/80 via-black/40 to-transparent"
              />
              <div className="w-full max-w-2xl px-5 pb-16 pt-6 sm:px-8 sm:pb-16 sm:pt-12 lg:px-12 lg:pb-16 lg:pt-16">
                <p className="mb-2 truncate text-[10px] font-semibold uppercase tracking-wider text-white/80 sm:mb-3 sm:text-xs">
                  {slide.eyebrow}
                </p>
                <h2 className="max-w-[78%] text-balance text-[clamp(1.5rem,6.5vw,2rem)] font-bold leading-[1.12] tracking-tight text-white sm:max-w-md sm:text-4xl lg:text-5xl">
                  {slide.title}
                </h2>
                <p className="mt-3 line-clamp-2 max-w-[78%] text-pretty text-xs leading-5 text-white/95 sm:max-w-sm sm:text-sm sm:leading-6">
                  {slide.description}
                </p>
                <div className="mt-5 flex flex-wrap items-center gap-2 sm:mt-7">
                  {slide.btnText && slide.btnLink && (
                    <Link
                      href={slide.btnLink}
                      aria-disabled={preview || undefined}
                      onClick={
                        preview
                          ? (event) => event.preventDefault()
                          : undefined
                      }
                      className="mya-action inline-flex items-center gap-2 px-4 text-[11px] font-semibold sm:px-5 sm:text-sm"
                    >
                      {slide.btnText}
                      <ArrowRight className="size-4" />
                    </Link>
                  )}
                  {!preview && (
                    <Link
                      href="/mayorista"
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-[var(--mya-radius-control)] bg-white/95 px-4 text-[11px] font-semibold text-zinc-900 backdrop-blur-sm sm:px-4 sm:text-sm"
                    >
                      <Store className="size-4" />
                      Mayorista
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
          {slides.length > 1 && (
            <div className="pointer-events-none absolute inset-x-0 bottom-3 flex items-center justify-center gap-1">
              {slides.map((slide, index) => (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => setCurrentSlide(index)}
                  aria-label={`Ver diapositiva ${index + 1}`}
                  aria-pressed={index === current}
                  className="pointer-events-auto grid size-11 place-items-center rounded-full focus-visible:outline-white"
                >
                  <span
                    className={`h-1.5 rounded-full transition-[width] ${index === current ? "w-6 bg-white" : "w-1.5 bg-white/50"}`}
                  />
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPaused((v) => !v)}
                aria-label={
                  paused ? "Reanudar carrusel" : "Pausar carrusel"
                }
                className="pointer-events-auto ml-1 grid size-11 place-items-center rounded-full bg-black/25 text-white hover:bg-black/50"
              >
                {paused ? (
                  <Play className="size-3.5" />
                ) : (
                  <Pause className="size-3.5" />
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* ── RetailHighlights ── */
export function RetailHighlights() {
  const items = [
    { icon: Truck, title: "Envíos a toda Argentina", subtitle: "Correo Argentino con seguimiento" },
    { icon: Package, title: "Minorista y mayorista", subtitle: "Desde 1 unidad o por bulto" },
    { icon: Headphones, title: "Atención personalizada", subtitle: "Máximo y Agustina por WhatsApp" },
    { icon: ShieldCheck, title: "Condiciones claras", subtitle: "Garantía y devoluciones" },
  ];
  return (
    <section aria-label="Beneficios de comprar en MYA" className="mya-container">
      <div className="grid grid-cols-2 gap-2 py-4 sm:grid-cols-4 sm:gap-4 sm:py-6">
        {items.map(({ icon: Icon, title, subtitle }) => (
          <div
            key={title}
            className="flex items-start gap-3 rounded-xl border border-zinc-100 bg-zinc-50/50 p-3 sm:p-4"
          >
            <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg bg-sky-50 text-sky-700">
              <Icon className="size-4.5 stroke-[1.6]" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold leading-4 text-zinc-900 sm:text-sm">
                {title}
              </p>
              <p className="mt-0.5 text-[10px] leading-3 text-zinc-500 sm:text-[11px] sm:leading-4">
                {subtitle}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── CategoryStrip — Three main rubros ── */
const RUBRO_CONFIG = [
  {
    name: "Belleza y Cuidado",
    shortName: "Belleza",
    slug: "cosmetica-coreana",
    description: "Cosmética, capilar y perfumería",
    gradient: "from-rose-50 to-pink-50",
    accent: "text-rose-700",
    border: "border-rose-100 hover:border-rose-200",
  },
  {
    name: "Tecnología y Electrónica",
    shortName: "Tecnología",
    slug: "electronica",
    description: "Smartphones y accesorios",
    gradient: "from-blue-50 to-sky-50",
    accent: "text-blue-700",
    border: "border-blue-100 hover:border-blue-200",
  },
  {
    name: "Herramientas y Equipamiento",
    shortName: "Herramientas",
    slug: "herramientas-equipamiento",
    description: "Profesionales e industriales",
    gradient: "from-amber-50 to-orange-50",
    accent: "text-amber-700",
    border: "border-amber-100 hover:border-amber-200",
  },
];

export function CategoryStrip({ categories }: { categories: Category[] }) {
  const roots = categories.filter((c) => !c.parentId);
  return (
    <section id="categorias" className="bg-white py-4 sm:py-8">
      <div className="mya-container">
        <h2 className="mya-section-title mb-4">Explorá por categoría</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
          {RUBRO_CONFIG.map((rubro) => {
            const cat = roots.find(
              (c) =>
                c.slug === rubro.slug ||
                c.slug.includes(rubro.slug.split("-")[0])
            );
            return (
              <Link
                key={rubro.slug}
                href={`/catalogo?category=${encodeURIComponent(rubro.slug)}`}
                className={`group flex items-center gap-4 overflow-hidden rounded-2xl border bg-gradient-to-br p-4 transition-shadow hover:shadow-md sm:flex-col sm:items-start sm:p-5 ${rubro.gradient} ${rubro.border}`}
              >
                {cat?.imageUrl && (
                  <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-white/80 sm:h-32 sm:w-full">
                    <Image
                      src={cat.imageUrl}
                      alt=""
                      fill
                      sizes="(min-width:640px) 300px, 64px"
                      quality={75}
                      className="object-contain p-2 mix-blend-multiply"
                    />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h3
                    className={`text-base font-bold leading-5 sm:text-lg ${rubro.accent}`}
                  >
                    {rubro.name}
                  </h3>
                  <p className="mt-1 text-xs leading-4 text-zinc-600">
                    {rubro.description}
                  </p>
                  <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-zinc-900 group-hover:text-sky-800">
                    Explorar
                    <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ── ProductSection ── */
export function ProductSection({
  id,
  eyebrow,
  title,
  products,
  channel = "retail",
}: {
  id?: string;
  eyebrow: string;
  title: string;
  products: Product[];
  channel?: ProductChannel;
}) {
  if (!products.length) return null;
  return (
    <section className="bg-white py-5 sm:py-8" id={id}>
      <div className="mya-container">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-sky-700">
              {eyebrow}
            </p>
            <h2 className="mya-section-title mt-0.5">{title}</h2>
          </div>
          <Link
            href={channel === "wholesale" ? "/mayorista" : "/catalogo"}
            className="inline-flex min-h-11 shrink-0 items-center gap-1 text-[11px] font-semibold text-sky-800 sm:text-sm"
          >
            Ver catálogo
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
        <div className="grid grid-cols-2 items-start gap-2.5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {products.map((product, index) => (
            <ProductCard
              key={product.id}
              product={product}
              channel={channel}
              priority={id === "catalogo" && index < 2}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── WholesaleTeaser ── */
export function WholesaleTeaser({ products }: { products: Product[] }) {
  const bestPrice = products
    .filter((product) => product.wholesalePrice > 0)
    .sort((a, b) => a.wholesalePrice - b.wholesalePrice)[0];

  return (
    <section className="bg-zinc-950 py-14 text-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[1fr_420px] lg:px-8">
        <div className="flex flex-col justify-center">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-300">
            Canal Mayorista B2B &amp; Distribución
          </span>
          <h2 className="mt-3 max-w-xl text-3xl font-extrabold tracking-tight sm:text-4xl">
            Precios directos de importación para revendedores y comercios.
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-300">
            Optimizá los costos de tu negocio. Comprá herramientas Total y
            Wadfow, cosmética coreana y tecnología por bulto cerrado con un
            mínimo de {WHOLESALE_MINIMUM_LABEL}, Factura A oficial y envíos
            a toda la Argentina.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <ButtonLink
              href="/mayorista"
              icon={<Boxes className="h-4 w-4" />}
            >
              Explorar Catálogo Mayorista
            </ButtonLink>
            <ButtonLink href="/login" variant="secondary">
              Crear Cuenta Comercial
            </ButtonLink>
          </div>
        </div>
        <div className="rounded-2xl border border-white/15 bg-white/5 p-6 backdrop-blur-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-300">
            Ejemplo de Margen Mayorista
          </p>
          {bestPrice ? (
            <div className="mt-4">
              <p className="line-clamp-2 text-lg font-bold text-white">
                {bestPrice.title}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-zinc-750 bg-zinc-900/80 p-3.5 text-white">
                  <p className="text-xs font-medium uppercase text-zinc-400">
                    PVP Minorista
                  </p>
                  <p className="mt-1 text-base font-bold sm:text-lg">
                    <ProductPrice
                      product={bestPrice}
                      ars={bestPrice.retailPrice}
                    />
                  </p>
                </div>
                <div className="rounded-xl border border-emerald-500 bg-emerald-600/90 p-3.5 text-white">
                  <p className="text-xs font-medium uppercase text-emerald-100">
                    Costo Mayorista
                  </p>
                  <p className="mt-1 text-base font-bold sm:text-lg">
                    <ProductPrice
                      product={bestPrice}
                      channel="wholesale"
                      ars={bestPrice.wholesalePrice}
                    />
                  </p>
                </div>
              </div>
              <p className="mt-3 text-xs text-zinc-400">
                Lote mínimo: {bestPrice.wholesaleMinQuantity} unidades.
                Margen de ganancia directo de importación.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

// Reviews are displayed only after their source and permission have been verified.
