"use client";

import { ProductPrice } from "./currency-provider";
import { defaultCarouselSlides, type CarouselSlide } from "@/lib/carousel";
import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Boxes,
  CheckCircle2,
  ChevronRight,
  Headphones,
  Package,
  Pause,
  Play,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Store,
  Truck,
  Wrench,
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
        <div className="relative overflow-hidden rounded-2xl bg-zinc-900 sm:rounded-3xl shadow-sm">
          {slides.map((slide, index) => (
            <div
              key={slide.id}
              hidden={index !== current}
              aria-hidden={index !== current}
              inert={index !== current}
              className={
                index === current
                  ? "relative isolate min-h-[17rem] sm:min-h-[22rem] lg:min-h-[28rem] flex items-center"
                  : "hidden"
              }
            >
              {(index === 0 || index === current) && (
                <Image
                  src={slide.image}
                  alt=""
                  fill
                  sizes="(min-width:1280px) 1216px, 100vw"
                  quality={80}
                  preload={index === 0}
                  className="-z-20 object-cover object-[65%_center]"
                />
              )}
              <div
                aria-hidden="true"
                className="absolute inset-0 -z-10 bg-gradient-to-r from-black/85 via-black/50 to-transparent"
              />
              <div className="w-full max-w-2xl px-5 pb-14 pt-6 sm:px-10 sm:pb-16 sm:pt-10 lg:px-14 lg:pb-16 lg:pt-14">
                <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur-md px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white sm:mb-3 sm:text-xs border border-white/20">
                  <Sparkles className="size-3 text-amber-300" />
                  {slide.eyebrow}
                </span>
                <h2 className="max-w-[85%] text-balance text-[clamp(1.5rem,6.5vw,2.25rem)] font-extrabold leading-[1.12] tracking-tight text-white sm:max-w-md sm:text-4xl lg:text-5xl">
                  {slide.title}
                </h2>
                <p className="mt-3 line-clamp-2 max-w-[85%] text-pretty text-xs leading-5 text-zinc-200 sm:max-w-sm sm:text-sm sm:leading-6">
                  {slide.description}
                </p>
                <div className="mt-5 flex flex-wrap items-center gap-2.5 sm:mt-8">
                  {slide.btnText && slide.btnLink && (
                    <Link
                      href={slide.btnLink}
                      aria-disabled={preview || undefined}
                      onClick={
                        preview
                          ? (event) => event.preventDefault()
                          : undefined
                      }
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-sky-700 px-5 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-sky-800 active:scale-[0.99] sm:text-sm"
                    >
                      <span>{slide.btnText}</span>
                      <ArrowRight className="size-4" />
                    </Link>
                  )}
                  {!preview && (
                    <Link
                      href="/mayorista"
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-white/20 bg-white/95 px-4 text-xs font-bold text-zinc-900 backdrop-blur-md transition hover:bg-white sm:text-sm"
                    >
                      <Store className="size-4 text-sky-700" />
                      Precios Mayoristas
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
                    className={`h-1.5 rounded-full transition-[width] duration-300 ${
                      index === current ? "w-6 bg-white" : "w-1.5 bg-white/50"
                    }`}
                  />
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPaused((v) => !v)}
                aria-label={paused ? "Reanudar carrusel" : "Pausar carrusel"}
                className="pointer-events-auto ml-1 grid size-11 place-items-center rounded-full bg-black/30 text-white backdrop-blur-xs hover:bg-black/50"
              >
                {paused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
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
    {
      icon: Truck,
      title: "Envíos a toda Argentina",
      subtitle: "Correo Argentino con código Paq.ar en vivo",
    },
    {
      icon: Package,
      title: "Minorista y mayorista",
      subtitle: "Comprá desde 1 unidad o lote para reventa",
    },
    {
      icon: Headphones,
      title: "Atención personalizada",
      subtitle: "Máximo y Agustina directos por WhatsApp",
    },
    {
      icon: ShieldCheck,
      title: "Condiciones y garantía",
      subtitle: "Garantía oficial y punto de retiro en Tandil",
    },
  ];

  return (
    <section aria-label="Beneficios de comprar en MYA" className="mya-container">
      <div className="grid grid-cols-2 gap-2.5 py-4 sm:grid-cols-4 sm:gap-4 sm:py-6">
        {items.map(({ icon: Icon, title, subtitle }) => (
          <div
            key={title}
            className="flex items-start gap-3 rounded-2xl border border-zinc-200/70 bg-gradient-to-b from-white to-zinc-50/60 p-3.5 sm:p-4 shadow-2xs"
          >
            <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-sky-50 text-sky-700 border border-sky-100">
              <Icon className="size-4.5 stroke-[1.75]" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold leading-4 text-zinc-900 sm:text-sm">
                {title}
              </p>
              <p className="mt-0.5 text-[10px] leading-3.5 text-zinc-500 sm:text-[11px] sm:leading-4">
                {subtitle}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── CategoryStrip — Three Main Rubros ── */
const RUBRO_CONFIG = [
  {
    name: "Belleza y Cuidado",
    shortName: "Belleza",
    slug: "cosmetica-coreana",
    description: "Cosmética coreana, cuidado capilar y perfumería importada.",
    cta: "Explorar belleza",
    icon: Sparkles,
    badge: "K-Beauty & Fragancias",
    gradient: "from-rose-50/70 via-pink-50/30 to-white",
    accent: "text-rose-950",
    border: "border-rose-200/80 hover:border-rose-300",
  },
  {
    name: "Tecnología y Electrónica",
    shortName: "Tecnología",
    slug: "electronica",
    description: "Smartphones, accesorios originales, audio y gadgets.",
    cta: "Ver tecnología",
    icon: Smartphone,
    badge: "Apple, Samsung & Audio",
    gradient: "from-sky-50/70 via-blue-50/30 to-white",
    accent: "text-sky-950",
    border: "border-sky-200/80 hover:border-sky-300",
  },
  {
    name: "Herramientas y Equipamiento",
    shortName: "Herramientas",
    slug: "herramientas-equipamiento",
    description: "Líneas profesionales e industriales Total Tools y Wadfow.",
    cta: "Comprar herramientas",
    icon: Wrench,
    badge: "Total Tools & Wadfow",
    gradient: "from-amber-50/70 via-orange-50/30 to-white",
    accent: "text-amber-950",
    border: "border-amber-200/80 hover:border-amber-300",
  },
];

export function CategoryStrip({ categories }: { categories: Category[] }) {
  const roots = categories.filter((c) => !c.parentId);
  return (
    <section id="categorias" className="bg-white py-5 sm:py-8">
      <div className="mya-container">
        <div className="mb-4 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-1.5">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-sky-700">
              Catálogo principal
            </p>
            <h2 className="mya-section-title mt-0.5">Explorá por rubro</h2>
          </div>
          <Link
            href="/catalogo"
            className="inline-flex items-center gap-1 text-xs font-semibold text-sky-800 hover:text-sky-950 sm:text-sm"
          >
            Ver catálogo completo <ArrowRight className="size-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3 sm:gap-5">
          {RUBRO_CONFIG.map((rubro) => {
            const cat = roots.find(
              (c) =>
                c.slug === rubro.slug ||
                c.slug.includes(rubro.slug.split("-")[0])
            );
            const Icon = rubro.icon;
            return (
              <Link
                key={rubro.slug}
                href={`/catalogo?category=${encodeURIComponent(rubro.slug)}`}
                className={`group flex flex-col justify-between overflow-hidden rounded-2xl border bg-gradient-to-br p-5 transition-all duration-200 hover:shadow-lg sm:p-6 ${rubro.gradient} ${rubro.border}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/90 border border-zinc-200/70 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-700">
                      <Icon className="size-3 text-sky-700" />
                      {rubro.badge}
                    </span>
                    <h3 className={`mt-2.5 text-lg font-bold tracking-tight sm:text-xl ${rubro.accent}`}>
                      {rubro.name}
                    </h3>
                    <p className="mt-1 text-xs leading-4.5 text-zinc-600">
                      {rubro.description}
                    </p>
                  </div>
                  {cat?.imageUrl && (
                    <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-white/90 p-1.5 shadow-2xs sm:size-20">
                      <Image
                        src={cat.imageUrl}
                        alt=""
                        fill
                        sizes="80px"
                        quality={75}
                        className="object-contain p-1 mix-blend-multiply transition-transform duration-200 group-hover:scale-105"
                      />
                    </div>
                  )}
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-zinc-200/60 pt-3">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-800 group-hover:text-sky-950">
                    {rubro.cta}
                    <ArrowRight className="size-3.5 transition-transform duration-150 group-hover:translate-x-1" />
                  </span>
                  <span className="text-[10px] font-medium text-zinc-500">
                    Envíos a todo el país
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
  href,
}: {
  id?: string;
  eyebrow: string;
  title: string;
  products: Product[];
  channel?: ProductChannel;
  href?: string;
}) {
  if (!products.length) return null;
  const targetHref = href ?? (channel === "wholesale" ? "/mayorista" : "/catalogo");

  return (
    <section className="bg-white py-5 sm:py-8" id={id}>
      <div className="mya-container">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-sky-700">
              {eyebrow}
            </p>
            <h2 className="mya-section-title mt-0.5">{title}</h2>
          </div>
          <Link
            href={targetHref}
            className="inline-flex min-h-11 shrink-0 items-center gap-1 text-[11px] font-bold text-sky-800 hover:text-sky-950 sm:text-sm"
          >
            Ver más
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
