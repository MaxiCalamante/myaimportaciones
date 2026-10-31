"use client";

import { defaultCarouselSlides, type CarouselSlide } from "@/lib/carousel";
import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgePercent, Boxes, Truck, Warehouse, ChevronLeft, ChevronRight, ShieldCheck } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import type { Category, Product, ProductChannel } from "@/lib/types";
import { ProductCard } from "@/components/commerce/product-card";
import { ButtonLink } from "@/components/ui/button";
import { WHOLESALE_MINIMUM_LABEL } from "@/lib/wholesale-policy";

export function StoreHero({ slides = defaultCarouselSlides, preview = false }: { slides?: CarouselSlide[]; preview?: boolean }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const [interacting, setInteracting] = useState(false);
  useEffect(() => {
    if (paused || interacting || preview || slides.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => setCurrentSlide(index => (index + 1) % slides.length), 6500);
    return () => clearInterval(timer);
  }, [paused, interacting, preview, slides.length]);
  if (!slides.length) return null;
  const current = currentSlide % slides.length;
  return <section aria-label={preview ? "Vista previa del carrusel" : "Carrusel de inicio"}
    onMouseEnter={() => setInteracting(true)} onMouseLeave={() => setInteracting(false)}
    onFocus={() => setInteracting(true)} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setInteracting(false); }}
    className="border-b border-zinc-200/70 bg-white">
    {!preview && <h1 className="sr-only">MYA Importaciones: catálogo de productos</h1>}
    <div className="relative mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
      {slides.map((slide, index) => <div key={slide.id} hidden={index !== current} aria-hidden={index !== current} inert={index !== current}
        className={index === current ? "grid items-center gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-12" : "hidden"}>
        <div className="order-2 min-w-0 pb-2 lg:order-1 lg:py-8">
          <p className="mb-4 inline-flex items-center gap-2 text-xs font-medium text-sky-800"><span className="h-px w-6 bg-sky-600" />{slide.eyebrow}</p>
          <h2 className="max-w-xl text-balance text-3xl font-semibold leading-tight text-zinc-950 sm:text-4xl lg:text-5xl">{slide.title}</h2>
          <p className="mt-4 max-w-lg text-pretty text-sm leading-7 text-zinc-600 sm:mt-5 sm:text-base">{slide.description}</p>
          {slide.btnText && slide.btnLink && <div className="mt-6 flex flex-wrap items-center gap-3 sm:mt-7">
            <ButtonLink href={slide.btnLink} aria-disabled={preview || undefined} onClick={preview ? event => event.preventDefault() : undefined}
              className="min-h-12 px-5" icon={<ArrowRight className="size-4" />}>{slide.btnText}</ButtonLink>
            {slide.btnLink !== "/catalogo" && <Link href="/catalogo" className="inline-flex min-h-12 items-center px-3 text-sm font-medium text-zinc-600 hover:text-zinc-950">Todo el catálogo</Link>}
          </div>}
          <p className="mt-7 text-xs text-zinc-500">MYA Importaciones <span className="mx-2 text-zinc-300">/</span> Tandil · Argentina</p>
        </div>
        <div className="relative order-1 aspect-[16/9] min-w-0 overflow-hidden rounded-2xl bg-zinc-100 sm:rounded-3xl lg:order-2 lg:aspect-[6/5]">
          {(index === 0 || index === current) && <Image src={slide.image} alt="" fill sizes="(min-width: 1024px) 600px, 100vw" quality={75} preload={index === 0} className="object-cover" />}
          <span className="absolute bottom-4 left-4 rounded-full bg-white px-3 py-1.5 text-[11px] font-medium text-zinc-700">Selección MYA</span>
        </div>
      </div>)}
      {slides.length > 1 && <div className="mt-4 flex items-center justify-between gap-3 border-t border-zinc-100 pt-3 sm:mt-5">
        <button type="button" onClick={() => setPaused(value => !value)} className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-xs text-zinc-600 hover:bg-zinc-50">{paused ? "Reanudar carrusel" : "Pausar carrusel"}</button>
        <div className="flex min-w-0 items-center gap-1 sm:gap-2">
          <button type="button" aria-label="Slide anterior" onClick={() => setCurrentSlide(value => (value - 1 + slides.length) % slides.length)} className="grid size-11 shrink-0 place-items-center rounded-full border border-zinc-200 text-zinc-700 hover:bg-zinc-50"><ChevronLeft className="size-4" /></button>
          <select aria-label="Elegir diapositiva" value={current} onChange={event => setCurrentSlide(Number(event.target.value))} className="min-h-11 rounded-lg bg-white px-2 text-xs tabular-nums text-zinc-600">
            {slides.map((_, index) => <option key={index} value={index}>{String(index + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}</option>)}
          </select>
          <button type="button" aria-label="Siguiente slide" onClick={() => setCurrentSlide(value => (value + 1) % slides.length)} className="grid size-11 shrink-0 place-items-center rounded-full border border-zinc-200 text-zinc-700 hover:bg-zinc-50"><ChevronRight className="size-4" /></button>
        </div>
      </div>}

    </div>
  </section>;
}

export function RetailHighlights() {
  const items = [
    { icon: BadgePercent, title: "Precios en pesos", desc: "Condiciones de pago claras antes de comprar." },
    { icon: Truck, title: "Envíos a Argentina", desc: "Consultá entrega y seguimiento para tu destino." },
    { icon: ShieldCheck, title: "Elegí con información", desc: "Fotos, versiones y características en cada ficha." },
    { icon: Warehouse, title: "Atención personal", desc: "Hablá con Máximo y Agustina por WhatsApp." },
  ];
  return <section aria-label="Comprar en MYA" className="border-b border-zinc-200/70 bg-white">
    <div className="mx-auto grid max-w-7xl grid-cols-2 gap-x-5 gap-y-6 px-4 py-6 sm:px-6 lg:grid-cols-4 lg:px-8 lg:py-7">
      {items.map(({ icon: Icon, title, desc }) => <div key={title} className="flex min-w-0 items-start gap-3">
        <Icon className="mt-0.5 size-5 shrink-0 stroke-[1.5] text-sky-800" />
        <div><p className="text-xs font-semibold leading-5 text-zinc-900 sm:text-sm">{title}</p><p className="mt-1 text-pretty text-[11px] leading-5 text-zinc-500 sm:text-xs">{desc}</p></div>
      </div>)}
    </div>
  </section>;
}

export function CategoryStrip({ categories }: { categories: Category[] }) {
  const roots = categories.filter(category => !category.parentId);
  return <section id="categorias" className="scroll-mt-40 border-b border-zinc-200/70 bg-zinc-50 py-10 sm:py-14">
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4 sm:mb-8">
        <div><p className="text-xs font-medium text-sky-800">Un mundo para elegir</p><h2 className="mt-2 text-balance text-2xl font-semibold text-zinc-950 sm:text-3xl">Encontrá tu próximo favorito</h2></div>
        <Link href="/catalogo" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-zinc-700 hover:text-sky-800">Ver todo el catálogo<ArrowRight className="size-4" /></Link>
      </div>
      <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 scrollbar-thin sm:grid sm:snap-none sm:grid-cols-2 sm:overflow-visible sm:pb-0 lg:grid-cols-3 xl:grid-cols-5">
        {roots.map(category => {
          const subs = categories.filter(child => child.parentId === category.id);
          const href = `/catalogo?category=${encodeURIComponent(category.slug)}`;
          return <article key={category.id} className="w-[min(16rem,80vw)] shrink-0 snap-start overflow-hidden rounded-2xl border border-zinc-200/80 bg-white sm:w-auto">
            <Link href={href} className="relative block aspect-[4/3] overflow-hidden bg-zinc-100" aria-label={`Explorar ${category.name}`}>
              <Image src={category.imageUrl || "/placeholder-product.svg"} alt={category.name} fill sizes="(min-width: 1280px) 230px, (min-width: 640px) 40vw, 260px" quality={75}
                className={category.slug === "electronica" ? "object-contain p-5" : "object-cover"} />
            </Link>
            <div className="p-4">
              <Link href={href} className="flex min-h-12 items-start justify-between gap-2 text-sm font-semibold leading-6 text-zinc-900 hover:text-sky-800"><h3>{category.name}</h3><ArrowRight className="mt-1 size-4 shrink-0 text-zinc-400" /></Link>
              {subs.length > 0 && <details className="mt-3 border-t border-zinc-100 pt-1">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 text-xs font-medium text-zinc-500 [&::-webkit-details-marker]:hidden">{subs.length} subcategorías<ChevronRight className="size-3.5 shrink-0" /></summary>
                <div className="grid gap-1 pb-1">{subs.map(sub => <Link key={sub.id} href={`/catalogo?category=${encodeURIComponent(sub.slug)}`} className="flex min-h-11 items-center rounded-lg bg-zinc-50 px-2.5 py-2 text-xs leading-5 text-zinc-700 hover:bg-sky-50 hover:text-sky-900">{sub.name}</Link>)}</div>
              </details>}
            </div>
          </article>;
        })}
      </div>
      <p className="mt-2 text-xs text-zinc-500 sm:hidden">Deslizá para explorar los rubros →</p>
    </div>
  </section>;
}

export function ProductSection({ id, eyebrow, title, products, channel = "retail" }: {
  id?: string; eyebrow: string; title: string; products: Product[]; channel?: ProductChannel;
}) {
  if (!products.length) return null;
  return <section className="bg-white py-10 sm:py-14" id={id}>
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-zinc-100 pb-5">
        <div><p className="text-xs font-medium text-sky-800">{eyebrow}</p><h2 className="mt-2 text-balance text-2xl font-semibold text-zinc-950 sm:text-3xl">{title}</h2></div>
        {channel === "wholesale" ? <p className="text-sm text-zinc-500">Compra mínima y precios por volumen</p> : <Link href="/catalogo" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-zinc-700 hover:text-sky-800">Ver catálogo<ArrowRight className="size-4" /></Link>}
      </div>
      <div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-5 sm:gap-5 lg:grid-cols-4">{products.map(product => <ProductCard channel={channel} key={product.id} product={product} />)}</div>
    </div>
  </section>;
}

export function WholesaleTeaser({
  products,
}: {
  products: Product[];
}) {
  const bestPrice = products
    .filter((product) => product.wholesalePrice > 0)
    .sort((a, b) => a.wholesalePrice - b.wholesalePrice)[0];

  return (
    <section className="bg-zinc-950 py-14 text-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[1fr_420px] lg:px-8">
        <div className="flex flex-col justify-center">
          <span className="inline-flex w-fit items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-300 bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/20">
            Canal Mayorista B2B & Distribución
          </span>
          <h2 className="mt-3 max-w-xl text-3xl font-extrabold sm:text-4xl tracking-tight">
            Precios directos de importación para revendedores y comercios.
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-300">
            Optimizá los costos de tu negocio. Comprá herramientas Total y Wadfow, cosmética coreana y tecnología por bulto cerrado con un mínimo de {WHOLESALE_MINIMUM_LABEL}, Factura A oficial y envíos a toda la Argentina.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/mayorista" icon={<Boxes className="h-4 w-4" />}>
              Explorar Catálogo Mayorista
            </ButtonLink>
            <ButtonLink href="/login" variant="secondary">
              Crear Cuenta Comercial
            </ButtonLink>
          </div>
        </div>
        <div className="rounded-2xl border border-white/15 bg-white/5 p-6 backdrop-blur-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-300">Ejemplo de Margen Mayorista</p>
          {bestPrice ? (
            <div className="mt-4">
              <p className="text-lg font-bold text-white line-clamp-2">{bestPrice.title}</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-zinc-900/80 border border-zinc-750 p-3.5 text-white">
                  <p className="text-xs font-medium uppercase text-zinc-400">PVP Minorista</p>
                  <p className="mt-1 text-base sm:text-lg font-bold">
                    {formatCurrency(bestPrice.retailPrice)}
                  </p>
                </div>
                <div className="rounded-xl bg-emerald-600/90 border border-emerald-500 p-3.5 text-white">
                  <p className="text-xs font-medium uppercase text-emerald-100">Costo Mayorista</p>
                  <p className="mt-1 text-base sm:text-lg font-bold">
                    {formatCurrency(bestPrice.wholesalePrice)}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-xs text-zinc-400">
                Lote mínimo: {bestPrice.wholesaleMinQuantity} unidades. Margen de ganancia directo de importación.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

// Reviews are displayed only after their source and permission have been verified.
