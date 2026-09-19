"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgePercent, Boxes, Truck, Warehouse, ChevronLeft, ChevronRight } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import type { Category, Product, ProductChannel } from "@/lib/types";
import { ProductCard } from "@/components/commerce/product-card";
import { ButtonLink } from "@/components/ui/button";

const heroSlides = [
  {
    image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1800&q=80",
    eyebrow: "Tendencia Mundial en Skincare",
    title: "Cosmética Coreana 100% Original",
    description: "Sérums virales, cremas reparadoras y protectores de SKIN1004, Medicube, Dr. Althea y Celimax importados directamente para vos.",
    btnText: "Ver K-Beauty",
    btnLink: "/?category=cosmetica-coreana",
  },
  {
    image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=1800&q=80",
    eyebrow: "Equipos Liberados con Garantía",
    title: "Smartphones Apple iPhone & Tecnología",
    description: "Dispositivos de alta gama importados, probados y garantizados con los mejores precios contado y transferencia de Argentina.",
    btnText: "Ver Smartphones",
    btnLink: "/?category=smartphones-tecnologia",
  },
  {
    image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1800&q=80",
    eyebrow: "Importación Directa & Distribución",
    title: "Precios Mayoristas para Tu Negocio",
    description: "Abastecé tu comercio o emprendimiento con precios diferenciales por bulto cerrado en cosmética, herramientas industriales y tecnología.",
    btnText: "Portal Mayorista",
    btnLink: "/mayorista",
  },
];

export function StoreHero() {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const handlePrev = () => {
    setCurrentSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);
  };

  const handleNext = () => {
    setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
  };

  return (
    <section className="relative overflow-hidden bg-zinc-950 text-white min-h-[520px]">
      {/* Slides */}
      {heroSlides.map((slide, idx) => (
        <div
          key={idx}
          className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
            idx === currentSlide ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
          }`}
        >
          <div
            className="absolute inset-0 bg-cover bg-center opacity-50"
            style={{
              backgroundImage: `linear-gradient(90deg, rgba(9,9,11,0.95), rgba(9,9,11,0.4)), url(${slide.image})`,
            }}
          />
          <div className="relative mx-auto grid min-h-[520px] w-full max-w-7xl content-center gap-8 px-4 py-16 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase text-emerald-300 tracking-wider">
                {slide.eyebrow}
              </p>
              <h1 className="mt-4 max-w-xl text-4xl font-extrabold leading-tight text-white sm:text-5xl lg:text-6xl tracking-tight">
                {slide.title}
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-zinc-150 sm:text-lg">
                {slide.description}
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <ButtonLink href={slide.btnLink} icon={<ArrowRight className="h-4 w-4" />}>
                  {slide.btnText}
                </ButtonLink>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Navigation Arrows */}
      <button
        aria-label="Slide anterior"
        onClick={handlePrev}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-25 p-2 rounded-full border border-white/20 bg-white/5 hover:bg-white/15 transition cursor-pointer"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        aria-label="Siguiente slide"
        onClick={handleNext}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-25 p-2 rounded-full border border-white/20 bg-white/5 hover:bg-white/15 transition cursor-pointer"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      {/* Slide Indicators */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-25 flex gap-2">
        {heroSlides.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentSlide(idx)}
            className={`h-2.5 rounded-full transition-all duration-300 ${
              idx === currentSlide ? "w-8 bg-emerald-400" : "w-2.5 bg-white/40 hover:bg-white/60"
            }`}
            aria-label={`Ir al slide ${idx + 1}`}
          />
        ))}
      </div>
    </section>
  );
}

export function RetailHighlights() {
  const items = [
    { icon: BadgePercent, label: "Importación directa con garantía y calidad certificada" },
    { icon: Truck, label: "Envíos asegurados a todo el país (Correo y Expresos)" },
    { icon: Warehouse, label: "Precios por menor y escala por bulto cerrado para revendedores" },
  ];


  return (
    <section className="border-b border-zinc-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-4 px-4 py-5 sm:px-6 md:grid-cols-3 lg:px-8">
        {items.map((item) => (
          <div className="flex items-center gap-3" key={item.label}>
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
              <item.icon className="h-5 w-5" />
            </span>
            <p className="text-sm font-medium text-zinc-700">{item.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function CategoryStrip({ categories }: { categories: Category[] }) {
  const visibleCategories = categories.filter((category) => !category.parentId);

  return (
    <section id="categorias" className="bg-zinc-50 py-10 scroll-mt-16">

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase text-emerald-700">
              Categorias
            </p>
            <h2 className="mt-2 text-2xl font-bold text-zinc-950">
              Compra por rubro
            </h2>
          </div>
          <Link
            className="hidden text-sm font-semibold text-zinc-700 hover:text-emerald-700 sm:block"
            href="#catalogo"
          >
            Ver todo
          </Link>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {visibleCategories.map((category) => (
            <a
              className="group overflow-hidden rounded-lg border border-zinc-200 bg-white"
              href={`#${category.slug}`}
              key={category.id}
            >
              <div className="relative aspect-[5/3] overflow-hidden bg-zinc-100">
                <Image
                  alt={category.name}
                  className="object-cover transition duration-500 group-hover:scale-105"
                  fill
                  sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                  src={category.imageUrl || "/globe.svg"}
                />
              </div>
              <div className="p-4">
                <h3 className="text-base font-semibold text-zinc-950">
                  {category.name}
                </h3>
                <p className="mt-1 line-clamp-2 text-sm leading-6 text-zinc-600">
                  {category.description}
                </p>
              </div>
            </a>
          ))}
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
  return (
    <section className="bg-white py-12" id={id}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase text-emerald-700">
              {eyebrow}
            </p>
            <h2 className="mt-2 text-2xl font-bold text-zinc-950">{title}</h2>
          </div>
          {channel === "wholesale" ? (
            <p className="text-sm font-medium text-zinc-500">
              Compra minima y precios por volumen
            </p>
          ) : null}
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
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
    <section className="bg-zinc-950 py-12 text-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[1fr_420px] lg:px-8">
        <div className="flex flex-col justify-center">
          <p className="text-sm font-semibold uppercase text-amber-300">
            Canal mayorista
          </p>
          <h2 className="mt-2 max-w-xl text-3xl font-bold">
            Precios por volumen sin mezclar el recorrido minorista.
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-300">
            El acceso mayorista queda disponible desde el navbar y permite comprar
            por caja, minimo de unidades y metodos de pago comerciales.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/mayorista" icon={<Boxes className="h-4 w-4" />}>
              Entrar a mayorista
            </ButtonLink>
            <ButtonLink href="/login" variant="secondary">
              Crear cuenta
            </ButtonLink>
          </div>
        </div>
        <div className="rounded-lg border border-white/15 bg-white/10 p-5">
          <p className="text-sm font-semibold text-zinc-200">Ejemplo de ahorro</p>
          {bestPrice ? (
            <div className="mt-5">
              <p className="text-xl font-bold">{bestPrice.title}</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-white p-4 text-zinc-950">
                  <p className="text-xs uppercase text-zinc-500">Minorista</p>
                  <p className="mt-1 text-lg font-bold">
                    {formatCurrency(bestPrice.retailPrice)}
                  </p>
                </div>
                <div className="rounded-lg bg-emerald-500 p-4 text-zinc-950">
                  <p className="text-xs uppercase">Mayorista</p>
                  <p className="mt-1 text-lg font-bold">
                    {formatCurrency(bestPrice.wholesalePrice)}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-sm text-zinc-300">
                Minimo {bestPrice.wholesaleMinQuantity} unidades
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
      name: "María Clara Rodríguez",
      role: "Consumidora Final",
      stars: 5,
      comment: "Excelente atención y variedad de productos. Los precios minoristas son los mejores de la zona, y el envío a domicilio es súper rápido y confiable."
    },
    {
      name: "Juan Manuel Gómez",
      role: "Dueño de 'Almacén del Parque'",
      stars: 5,
      comment: "Compro todo el stock de bebidas y limpieza para mi negocio acá. La compra mayorista con el mínimo de $100.000 me permite ahorrar muchísimo y el proceso es comodísimo."
    },
    {
      name: "Estela Maris Ferreyra",
      role: "Consumidora Final",
      stars: 5,
      comment: "Me encanta la facilidad de comprar packs familiares. Las ofertas y promociones son reales, siempre ahorro en las compras del mes."
    }
  ];

  return (
    <section className="bg-zinc-100/40 py-16 border-t border-zinc-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <p className="text-sm font-semibold uppercase text-emerald-700 tracking-wider">Opiniones</p>
          <h2 className="mt-2 text-3xl font-bold text-zinc-950">Qué dicen nuestros clientes</h2>
          <p className="mt-3 text-sm text-zinc-650 leading-relaxed">Nuestra prioridad es brindar el mejor servicio y calidad tanto a consumidores finales como a comerciantes de la zona.</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t, index) => (
            <div key={index} className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition">
              <div>
                <div className="flex items-center gap-1 mb-4">
                  {Array.from({ length: t.stars }).map((_, i) => (
                    <span key={i} className="text-amber-400 text-lg">★</span>
                  ))}
                </div>
                <p className="text-sm text-zinc-655 italic leading-relaxed">"{t.comment}"</p>
              </div>
              <div className="mt-6 border-t border-zinc-100 pt-4">
                <p className="text-sm font-bold text-zinc-950">{t.name}</p>
                <p className="text-xs text-zinc-550">{t.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
