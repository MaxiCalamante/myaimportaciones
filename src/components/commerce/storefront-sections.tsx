"use client";

import { defaultCarouselSlides, type CarouselSlide } from "@/lib/carousel";
import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgePercent, Boxes, Truck, Warehouse, ChevronLeft, ChevronRight, ShieldCheck, Sparkles } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import type { Category, Product, ProductChannel } from "@/lib/types";
import { ProductCard } from "@/components/commerce/product-card";
import { ButtonLink } from "@/components/ui/button";

export function StoreHero({ slides = defaultCarouselSlides, preview = false }: { slides?: CarouselSlide[]; preview?: boolean }) {
  const heroSlides = slides;
  const [currentSlide, setCurrentSlide] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || preview || heroSlides.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [paused, preview, heroSlides.length]);

  const handlePrev = () => {
    setCurrentSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);
  };

  const handleNext = () => {
    setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
  };

  if (!heroSlides.length) return null;
  const visibleIndex = currentSlide % heroSlides.length;
  return (
    <section aria-label={preview ? "Vista previa del carrusel" : "Carrusel de inicio"} className="relative overflow-hidden bg-zinc-950 text-white min-h-[520px]">
      {!preview && <h1 className="sr-only">MYA Importaciones: catálogo de productos</h1>}
      {heroSlides.length > 1 && <button type="button" className="absolute right-4 top-4 z-20 min-h-11 rounded-lg bg-black/80 px-3 py-2 text-xs text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white" onClick={() => setPaused(!paused)}>{paused ? "Reanudar carrusel" : "Pausar carrusel"}</button>}
      {/* Slides */}
      {heroSlides.map((slide, idx) => (
        <div
          key={slide.id}
          aria-hidden={idx !== visibleIndex}
          inert={idx !== visibleIndex}
          className={`inset-0 transition-opacity duration-200 ease-out ${
            idx === visibleIndex ? "relative opacity-100 z-10" : "absolute opacity-0 z-0 pointer-events-none"
          }`}
        >
          <div
            className="absolute inset-0 bg-cover bg-center opacity-50"
            style={{
              backgroundImage: `linear-gradient(90deg, rgba(9,9,11,0.95), rgba(9,9,11,0.4)), url(${JSON.stringify(slide.image)})`,
            }}
          />
          <div className="relative mx-auto grid min-h-[520px] w-full max-w-7xl content-center gap-8 px-4 py-16 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase text-sky-300 tracking-wider">
                {slide.eyebrow}
              </p>
              <h2 className="mt-4 max-w-xl text-4xl font-extrabold leading-tight text-white sm:text-5xl lg:text-6xl tracking-tight">
                {slide.title}
              </h2>
              <p className="mt-5 max-w-xl text-base leading-7 text-zinc-200 sm:text-lg">
                {slide.description}
              </p>
              {slide.btnText && slide.btnLink && <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <ButtonLink href={slide.btnLink} aria-disabled={preview || undefined} onClick={preview ? event => event.preventDefault() : undefined} icon={<ArrowRight className="h-4 w-4" />}>
                  {slide.btnText}
                </ButtonLink>
              </div>}
            </div>
          </div>
        </div>
      ))}

      {/* Navigation Arrows */}
      {heroSlides.length > 1 && <>
      <button
        aria-label="Slide anterior"
        onClick={handlePrev}
        className="absolute bottom-1 left-3 z-25 grid size-11 place-items-center rounded-full border border-white/20 bg-black/50 text-white transition-colors hover:bg-black/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        aria-label="Siguiente slide"
        onClick={handleNext}
        className="absolute bottom-1 right-3 z-25 grid size-11 place-items-center rounded-full border border-white/20 bg-black/50 text-white transition-colors hover:bg-black/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      {/* Slide Indicators */}
      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 z-25 flex w-max max-w-[calc(100%-120px)] gap-1">
        {heroSlides.map((_, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setCurrentSlide(idx)}
            className="grid h-11 w-11 min-w-0 shrink place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            aria-label={`Ir al slide ${idx + 1}`}
            aria-current={idx === visibleIndex ? "true" : undefined}
          ><span aria-hidden className={`size-2.5 rounded-full ${idx === visibleIndex ? "bg-sky-400" : "bg-white/50"}`} /></button>
        ))}
      </div>
      </>}
    </section>
  );
}

export function RetailHighlights() {
  const items = [
    { 
      icon: BadgePercent, 
      title: "Medios de pago",
      desc: "Transferencia y Mercado Pago; cuotas según las condiciones del medio de pago"
    },
    { 
      icon: Truck, 
      title: "Envíos Correo Argentino",
      desc: "A domicilio o sucursal en todo el país con seguimiento en vivo"
    },
    { 
      icon: ShieldCheck, 
      title: "Atención posventa",
      desc: "Consultá las condiciones de garantía y comprobante de cada producto"
    },
    { 
      icon: Warehouse, 
      title: "Atención desde Tandil",
      desc: "Despacho directo y asesoramiento personalizado por WhatsApp"
    },
  ];

  return (
    <section className="border-b border-zinc-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
        {items.map((item) => (
          <div className="flex items-start gap-3.5" key={item.title}>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sky-50 text-sky-700 border border-sky-100">
              <item.icon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-bold text-zinc-950">{item.title}</p>
              <p className="mt-0.5 text-xs text-zinc-500 leading-snug">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function CategoryStrip({ categories }: { categories: Category[] }) {
  const visibleCategories = categories.filter((category) => !category.parentId);

  const getSubcategories = (parentId: string) =>
    categories.filter((category) => category.parentId === parentId);

  const getCategoryTheme = (slug: string) => {
    if (slug.includes("herramienta")) {
      return {
        badge: "Total Tools & Wadfow",
        tagClass: "bg-blue-600 text-white",
        count: "Para casa y taller",
        bgHover: "hover:border-blue-300 hover:shadow-blue-50/50",
      };
    }
    if (slug.includes("cosmetica")) {
      return {
        badge: "K-Beauty",
        tagClass: "bg-pink-600 text-white",
        count: "Cuidado de la piel",
        bgHover: "hover:border-pink-300 hover:shadow-pink-50/50",
      };
    }
    if (slug.includes("capilar")) {
      return {
        badge: "Karseell & Tratamientos",
        tagClass: "bg-amber-700 text-white",
        count: "Tratamientos intensivos",
        bgHover: "hover:border-amber-300 hover:shadow-amber-50/50",
      };
    }
    return {
      badge: "Importación Directa",
      tagClass: "bg-sky-600 text-white",
      count: "Consultá disponibilidad",
      bgHover: "hover:border-sky-300 hover:shadow-sky-50/50",
    };
  };

  return (
    <section id="categorias" className="bg-zinc-50/70 py-12 sm:py-16 scroll-mt-16 border-b border-zinc-200/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-zinc-200 pb-6 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-800 border border-sky-200/60">
              <Sparkles className="h-3.5 w-3.5 text-sky-600" />
              Nuestros rubros
            </div>
            <h2 className="mt-2 text-2xl sm:text-3xl font-black text-zinc-950 tracking-tight">
              ¿Qué estás buscando?
            </h2>
            <p className="mt-1 text-sm text-zinc-600 max-w-2xl">
              Elegí tu rubro y encontrá productos, precios y disponibilidad.
            </p>
          </div>
          <Link
            className="inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-white px-5 py-2.5 text-xs font-bold text-zinc-900 hover:border-zinc-900 hover:bg-zinc-900 hover:text-white shadow-xs transition-all duration-200 group shrink-0"
            href="/catalogo"
          >
            <span>Ver catálogo completo</span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visibleCategories.map((category) => {
            const subs = getSubcategories(category.id);
            const theme = getCategoryTheme(category.slug);
            const initialImg = category.imageUrl || "/placeholder-product.svg";

            return (
              <div
                key={category.id}
                className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-xs hover:shadow-xl transition-all duration-300 ${theme.bgHover}`}
              >
                <div>
                  {/* Image container */}
                  <Link
                    href={`/catalogo?category=${category.slug}`}
                    className="relative aspect-[16/10] overflow-hidden bg-zinc-100 block cursor-pointer"
                  >
                    <Image
                      alt={category.name}
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                      fill
                      sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                      src={initialImg}
                      quality={90}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                    <span className={`absolute top-3 left-3 rounded-md px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider shadow-sm ${theme.tagClass}`}>
                      {theme.badge}
                    </span>
                    <span className="absolute bottom-2.5 left-3 text-[11px] font-semibold text-white/90 drop-shadow-sm">
                      {theme.count}
                    </span>
                  </Link>

                  {/* Body Info */}
                  <div className="p-5">
                    <Link href={`/catalogo?category=${category.slug}`}>
                      <h3 className="text-lg font-black text-black group-hover:text-emerald-700 transition-colors">
                        {category.name}
                      </h3>
                    </Link>
                    <p className="mt-1.5 text-xs text-zinc-500 line-clamp-2 leading-relaxed">
                      {category.description || "Explorá productos y consultá disponibilidad y entrega."}
                    </p>

                    {/* Curated Subcategories Preview */}
                    {subs.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-zinc-100">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 mb-2">
                          Subcategorías destacadas:
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {subs.slice(0, 4).map((sub) => (
                            <Link
                              key={sub.id}
                              href={`/catalogo?category=${sub.slug}`}
                              className="inline-block rounded-md bg-zinc-100/90 hover:bg-zinc-200/80 px-2 py-0.5 text-[11px] font-medium text-zinc-700 transition"
                            >
                              {sub.name}
                            </Link>
                          ))}
                          {subs.length > 4 && (
                            <Link
                              href={`/catalogo?category=${category.slug}`}
                              className="inline-block rounded-md bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800 transition"
                            >
                              +{subs.length - 4} más
                            </Link>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Action Link */}
                <div className="px-5 pb-5 pt-0">
                  <Link
                    href={`/catalogo?category=${category.slug}`}
                    className="flex items-center justify-between w-full rounded-xl bg-zinc-50 hover:bg-zinc-900 px-3.5 py-2.5 text-xs font-bold text-zinc-800 hover:text-white border border-zinc-200 hover:border-zinc-900 transition-all duration-200 group/btn"
                  >
                    <span>Explorar catálogo</span>
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/btn:translate-x-1" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

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
    <section className="bg-white py-12" id={id}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase text-sky-700">
              {eyebrow}
            </p>
            <h2 className="mt-2 text-2xl font-bold text-zinc-950">{title}</h2>
          </div>
          {channel === "wholesale" ? (
            <p className="text-sm font-medium text-zinc-500">
              Compra mínima y precios por volumen
            </p>
          ) : <Link href="/catalogo" className="text-sm font-semibold text-sky-700 underline underline-offset-2">Ver todo el catálogo</Link>}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard channel={channel} key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
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
            Optimizá los costos de tu negocio. Comprá herramientas Total y Wadfow, cosmética coreana y tecnología por bulto cerrado con un mínimo accesible desde $100.000, Factura A oficial y envíos a toda la Argentina.
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

export function TestimonialsSection() {
  const testimonials = [
    {
      name: "Florencia Benítez",
      role: "Cliente K-Beauty & Skincare (Córdoba)",
      stars: 5,
      comment: "Compré sérums y cremas de Medicube y SKIN1004. Llegaron sellados en su empaque original con código de lote verificado. Pagué con el 10% de descuento por transferencia y el envío llegó en 48 horas.",
    },
    {
      name: "Ing. Martín Carrizo",
      role: "Taller Metalúrgico & Obras (Rosario)",
      stars: 5,
      comment: "Equipamos la cuadrilla con amoladoras y rotomartillos Total Tools y Wadfow. La durabilidad en obra es excelente y la atención mayorista con Factura A fue muy rápida y transparente.",
    },
    {
      name: "Valeria Gómez",
      role: "Salón de Belleza & Estilista (Mar del Plata)",
      stars: 5,
      comment: "Compramos mascarillas Karseell y cosmética coreana por bulto cerrado. Los productos son 100% auténticos y el margen de reventa para el salón es extraordinario.",
    },
  ];

  return (
    <section className="bg-zinc-100/60 py-16 border-t border-zinc-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <p className="text-sm font-semibold uppercase text-emerald-700 tracking-wider">Testimonios Reales</p>
          <h2 className="mt-2 text-3xl font-extrabold text-zinc-950">Qué dicen quienes compran en MYA</h2>
          <p className="mt-3 text-sm text-zinc-600 leading-relaxed">
            Garantizamos origen legítimo, atención dedicada y despachos rápidos para consumidores finales, profesionales y comercios en todo el país.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t, index) => (
            <div key={index} className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition">
              <div>
                <div className="flex items-center gap-1 mb-3">
                  {Array.from({ length: t.stars }).map((_, i) => (
                    <span key={i} className="text-amber-400 text-base">★</span>
                  ))}
                </div>
                <p className="text-sm text-zinc-600 italic leading-relaxed">&quot;{t.comment}&quot;</p>
              </div>
              <div className="mt-6 border-t border-zinc-100 pt-4">
                <p className="text-sm font-bold text-zinc-950">{t.name}</p>
                <p className="text-xs text-zinc-500">{t.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
