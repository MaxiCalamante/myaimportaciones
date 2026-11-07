"use client";

import {ProductPrice} from './currency-provider';
import { defaultCarouselSlides, type CarouselSlide } from "@/lib/carousel";
import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Boxes, Truck, ShieldCheck, Headphones, Pause, Play, Store } from "lucide-react";
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
    onFocus={() => setInteracting(true)} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setInteracting(false); }} className="bg-white">
    {!preview && <h1 className="sr-only">MYA Importaciones: tecnología, cosmética, perfumería y herramientas</h1>}
    <div className="mya-container pt-3 sm:pt-5">
      <div className="relative overflow-hidden rounded-2xl bg-zinc-800">
      {slides.map((slide,index)=><div key={slide.id} hidden={index!==current} aria-hidden={index!==current} inert={index!==current} className={index===current?'relative isolate min-h-56 sm:min-h-80 lg:min-h-100':'hidden'}>
        {(index===0||index===current)&&<Image src={slide.image} alt="" fill sizes="(min-width:1280px) 1216px, 100vw" quality={75} preload={index===0} className="-z-20 object-cover object-[65%_center]"/>}
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-linear-to-r from-black/75 via-black/35 to-transparent"/>
        <div className="w-full max-w-2xl px-4 pt-4 pb-16 sm:px-8 sm:pt-10 sm:pb-16 lg:px-12 lg:pt-14 lg:pb-16">
          <p className="mb-2 truncate text-[10px] font-medium tracking-wide text-white/90 sm:mb-3 sm:text-xs">{slide.eyebrow}</p>
          <h2 className="max-w-[78%] text-balance sm:max-w-md text-[clamp(1.5rem,6.5vw,2rem)] font-bold leading-[1.12] tracking-tight text-white sm:text-4xl lg:text-5xl">{slide.title}</h2>
          <p className="mt-3 max-w-[78%] line-clamp-2 text-pretty sm:max-w-sm text-xs leading-5 text-white/95 sm:text-sm sm:leading-6">{slide.description}</p>
          <div className="mt-4 flex flex-wrap items-center gap-2 sm:mt-6">
            {slide.btnText&&slide.btnLink&&<Link href={slide.btnLink} aria-disabled={preview||undefined} onClick={preview?event=>event.preventDefault():undefined} className="mya-action inline-flex items-center gap-2 px-2 text-[11px] font-semibold sm:px-5 sm:text-sm">{slide.btnText}<ArrowRight className="size-4"/></Link>}
            {!preview&&<Link href="/mayorista" className="inline-flex min-h-11 items-center gap-1.5 rounded-[var(--mya-radius-control)] bg-white px-2 text-[11px] font-semibold text-sky-900 sm:px-4 sm:text-sm"><Store className="size-4"/>Mayorista</Link>}
          </div>
        </div>
      </div>)}
      {slides.length>1&&<div className="pointer-events-none absolute inset-x-0 bottom-2 flex items-center justify-center gap-0.5">
        {slides.map((slide,index)=><button key={slide.id} type="button" onClick={()=>setCurrentSlide(index)} aria-label={`Ver diapositiva ${index+1}`} aria-pressed={index===current} className="pointer-events-auto grid size-11 place-items-center rounded-full focus-visible:outline-white"><span className={`h-1.5 rounded-full transition-[width] ${index===current?'w-5 bg-white':'w-1.5 bg-white/60'}`}/></button>)}
        <button type="button" onClick={()=>setPaused(v=>!v)} aria-label={paused?'Reanudar carrusel':'Pausar carrusel'} className="pointer-events-auto ml-1 grid size-11 place-items-center rounded-full bg-black/25 text-white hover:bg-black/50">{paused?<Play className="size-3.5"/>:<Pause className="size-3.5"/>}</button>
      </div>}
      </div>
    </div>
  </section>;
}

export function RetailHighlights(){
 const items=[{icon:Truck,title:'Envíos a toda Argentina'},{icon:ShieldCheck,title:'Condiciones claras'},{icon:Headphones,title:'Atención personalizada'}];
 return <section aria-label="Comprar en MYA" className="mya-container"><div className="grid grid-cols-3 divide-x divide-zinc-200 border-b border-zinc-100 py-2 sm:py-5">{items.map(({icon:Icon,title})=><div key={title} className="flex flex-col items-center gap-1.5 px-2 text-center sm:flex-row sm:justify-center sm:gap-3"><Icon className="size-5 shrink-0 stroke-[1.6] text-sky-700"/><p className="max-w-28 text-[10px] font-medium leading-4 text-zinc-700 sm:max-w-none sm:text-xs">{title}</p></div>)}</div></section>;
}

export function CategoryStrip({categories}:{categories:Category[]}){
 const roots=categories.filter(c=>!c.parentId);
 return <section id="categorias" className="bg-white py-4 sm:py-8"><div className="mya-container">
 <h2 className="mya-section-title mb-3">Explorá por categoría</h2>
 <div className="grid grid-cols-6 gap-2 sm:grid-cols-5 sm:gap-3">{roots.map((category,index)=><Link key={category.id} href={`/catalogo?category=${encodeURIComponent(category.slug)}`} className={`group min-w-0 overflow-hidden rounded-xl border border-zinc-100 bg-zinc-50 p-1.5 sm:p-2 hover:border-sky-200 hover:bg-sky-50 ${roots.length===5&&index>2?'col-span-3':'col-span-2'} sm:col-span-1`}>
 <div className="relative mx-auto h-12 w-full sm:h-28 lg:h-32"><Image src={category.imageUrl||'/placeholder-product.svg'} alt="" fill sizes="(min-width:1024px) 200px, 30vw" quality={75} className="object-contain p-1 mix-blend-multiply"/></div>
 <div className="mt-1 flex min-h-6 items-center justify-between gap-1 text-[11px] font-semibold leading-4 text-zinc-900 sm:text-sm"><span>{/cosm[eé]tica/i.test(category.name)?"Cosmética":/herramientas/i.test(category.name)?"Herramientas":/cabello|capilar/i.test(category.name)?"Cuidado capilar":category.name}</span><ArrowRight className="size-3.5 shrink-0 text-zinc-600 group-hover:text-sky-700"/></div>
 </Link>)}</div></div></section>;
}

export function ProductSection({id,eyebrow,title,products,channel='retail'}:{id?:string;eyebrow:string;title:string;products:Product[];channel?:ProductChannel}){
 if(!products.length)return null;
 return <section className="bg-white py-4 sm:py-8" id={id}><div className="mya-container"><div className="mb-3 flex items-center justify-between gap-3"><h2 className="mya-section-title">{title}</h2><span className="sr-only">{eyebrow}</span><Link href={channel==='wholesale'?'/mayorista':'/catalogo'} className="inline-flex min-h-11 shrink-0 items-center gap-1 text-[11px] font-semibold text-sky-800 sm:text-sm">Ver catálogo<ArrowRight className="size-3.5"/></Link></div><div className="grid grid-cols-2 items-start gap-2.5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">{products.map((product,index)=><ProductCard key={product.id} product={product} channel={channel} priority={id==='catalogo'&&index<2}/>)}</div></div></section>;
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
                    {<ProductPrice product={bestPrice} ars={bestPrice.retailPrice}/>}
                  </p>
                </div>
                <div className="rounded-xl bg-emerald-600/90 border border-emerald-500 p-3.5 text-white">
                  <p className="text-xs font-medium uppercase text-emerald-100">Costo Mayorista</p>
                  <p className="mt-1 text-base sm:text-lg font-bold">
                    {<ProductPrice product={bestPrice} channel="wholesale" ars={bestPrice.wholesalePrice}/>}
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
