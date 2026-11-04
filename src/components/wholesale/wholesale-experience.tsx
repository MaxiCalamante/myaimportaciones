import Image from "next/image";
import Link from "next/link";
import {ArrowRight,Boxes,Check,Layers3,Truck} from "lucide-react";
import {WHOLESALE_CATEGORIES,wholesaleServiceData,type WholesaleCategory,type WholesaleFilters} from "@/lib/wholesale-content";
import {getWholesaleCatalog,wholesaleCategoryIds} from "@/lib/wholesale-catalog";
import {formatCurrency} from "@/lib/format";
import {breadcrumbData,jsonLd,publicUrl} from "@/lib/seo";
import {ProductCard} from "@/components/commerce/product-card";
import {WholesaleCatalogGrid} from "./wholesale-catalog-grid";
import { productVariantHref } from "@/lib/variant-preview";
import type {Product} from "@/lib/types";

function ProductSelection({title,products,href}:{title:string;products:Product[];href:string}){
 if(!products.length)return null;
 return <section className="mt-12" aria-label={title}><div className="mb-5 flex flex-wrap items-end justify-between gap-3"><h2 className="text-xl font-semibold tracking-tight text-zinc-950 sm:text-2xl">{title}</h2><Link href={href} className="inline-flex min-h-11 items-center gap-2 text-xs font-semibold text-sky-800">Ver categoría<ArrowRight className="size-3.5"/></Link></div><div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">{products.slice(0,4).map(p=><ProductCard key={p.id} product={p} channel="wholesale"/>)}</div></section>;
}

export async function WholesaleLanding({category,filters={}}:{category?:WholesaleCategory;filters?:WholesaleFilters}){
 const data=await getWholesaleCatalog(category?.categorySlug, category?.brand);
 const departments=WHOLESALE_CATEGORIES.filter(d=>!d.brand);
 const products=data.products.map(product => ({
   ...product,
   // The grid and the cart only need card data. The detail page reads the full ficha.
   description: "",
   specifications: undefined,
   imageUrls: undefined,
   warrantyTerms: undefined,
 }));
 const categoryProducts=(slug:string)=>{const ids=wholesaleCategoryIds(data.categories,slug);return products.filter(p=>ids.has(p.categoryId));};
 const visibleDepartments=departments.map(department=>{
   const ids=wholesaleCategoryIds(data.categories,department.categorySlug);
   return {department,products:data.eligibleProducts.filter(p=>ids.has(p.categoryId))};
 }).filter(d=>d.products.length);
 const crumbs=[{name:'Inicio',path:'/'},{name:'Mayorista',path:'/mayorista'},...(category?[{name:category.name,path:`/mayorista/${category.slug}`}]:[])];
 const minimum=`${data.policy.minUnits} unidades combinables o ${formatCurrency(data.policy.minAmountArs)} en productos`;
 const faq=[
  category?.faq[0] ?? {question:'¿Necesito una cuenta mayorista aprobada?',answer:'No. El catálogo y sus precios confirmados son públicos. Podés armar tu pedido sin aprobación comercial ni CUIT. Una cuenta normal sirve para consultar tu historial.'},
  {question:'¿Cuál es el mínimo y puedo combinar productos?',answer:`El mínimo es ${minimum}. Basta cumplir una de las dos condiciones; podés combinar marcas y rubros. El envío se calcula aparte.`},
  {question:'¿Qué significa precio por confirmar?',answer:'La ficha está disponible para armar tu selección, pero necesita una confirmación de precio o disponibilidad. La solicitud se revisa antes de habilitar el pago; no se realiza un cobro definitivo por un importe pendiente.'},
  {question:'¿Los productos están físicamente en Argentina?',answer:'Cada ficha diferencia el stock con entrega inmediata en Tandil de los productos disponibles en catálogo. Los plazos y el envío se confirman según tu selección y destino.'},
 ];
 const listedProducts = !Object.keys(filters).length
   ? products.slice().sort((a,b) => Number(b.featured) - Number(a.featured)).slice(0,24)
   : [];
 const itemList = {
   "@context": "https://schema.org",
   "@type": "ItemList",
   name: category?.title ?? "Catálogo mayorista de MYA Importaciones",
   itemListElement: listedProducts.map((product, index) => ({
     "@type": "ListItem", position: index + 1, name: product.title,
     url: publicUrl(productVariantHref(product.slug) + "?canal=mayorista"),
   })),
 };
 return <div className="mx-auto max-w-7xl px-4 pb-16 pt-6 text-zinc-950 sm:px-6 lg:px-8">
  <script type="application/ld+json" dangerouslySetInnerHTML={{__html:jsonLd(wholesaleServiceData(category))}}/>
  <script type="application/ld+json" dangerouslySetInnerHTML={{__html:jsonLd(breadcrumbData(crumbs))}}/>
  {listedProducts.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{__html:jsonLd(itemList)}}/>}
  <nav aria-label="Ubicación mayorista" className="flex flex-wrap gap-2 text-xs text-zinc-500">{crumbs.map((c,i)=><span key={c.path}>{i>0&&<span aria-hidden="true" className="mr-2">/</span>}<Link href={c.path} aria-current={i===crumbs.length-1?'page':undefined}>{c.name}</Link></span>)}</nav>
  <header className="grid gap-7 py-9 sm:py-12 lg:grid-cols-[1.15fr_.85fr] lg:items-center lg:gap-12">
   <div><p className="text-xs font-semibold uppercase tracking-[.18em] text-sky-800">MYA · Catálogo mayorista público</p><h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-[1.08] tracking-[-.04em] sm:text-5xl">{category?category.title:<>Catálogo mayorista<br/><span className="text-sky-800">para comercios y revendedores</span></>}</h1>
    <p className="mt-5 max-w-xl text-sm leading-7 text-zinc-600 sm:text-base">{category?category.introduction:'Cosmética, perfumes, herramientas, tecnología y mucho más a precios mayoristas. Explorá nuestro catálogo, compará precios y armá tu pedido desde cualquier lugar de Argentina.'}</p>
    <div className="mt-6 flex flex-wrap gap-2"><a href="#catalogo" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-sky-800 px-5 text-sm font-semibold text-white hover:bg-sky-900">Explorar catálogo mayorista<ArrowRight className="size-4"/></a>{!category&&<><Link href="/mayorista/cosmetica-coreana#catalogo" className="inline-flex min-h-12 items-center rounded-xl border border-zinc-300 px-4 text-sm font-semibold">Ver cosmética</Link><Link href="/mayorista/herramientas#catalogo" className="inline-flex min-h-12 items-center rounded-xl border border-zinc-300 px-4 text-sm font-semibold">Ver herramientas</Link></>}</div>
    <p className="mt-4 text-xs leading-6 text-zinc-500">Mínimo: <strong className="font-medium text-zinc-800">{minimum}</strong>. Envío aparte.</p>
   </div>
   <div className="grid grid-cols-3 gap-2 sm:gap-3" aria-label="Rubros del catálogo mayorista">{visibleDepartments.slice(0,category?3:6).map(({department:d,products:rows})=>{const product=rows.find(p=>p.imageUrl);return<Link key={d.slug} href={`/mayorista/${d.slug}#catalogo`} className="group min-w-0 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 p-2 sm:p-3"><div className="relative aspect-square overflow-hidden rounded-lg bg-white">{product&&<Image src={product.imageUrl} alt={product.title} fill sizes="(min-width:1024px) 140px, 28vw" className="object-contain p-2 transition-transform group-hover:scale-105"/>}</div><p className="mt-2 text-xs font-semibold leading-5 text-zinc-700">{d.name}</p><p className="text-[10px] text-zinc-500">{rows.length} productos</p></Link>;})}</div>
  </header>
  <div className="mb-10 grid gap-4 border-y border-zinc-200 py-5 sm:grid-cols-3">{[
   {icon:Check,title:'Precios visibles',text:'Sin registro ni aprobación comercial.'},
   {icon:Layers3,title:'Combiná marcas y rubros',text:'Un mínimo para todo tu pedido mayorista.'},
   {icon:Truck,title:'Envíos a toda Argentina',text:'Costo y plazo según selección y destino.'},
  ].map(({icon:Icon,title,text})=><div key={title} className="flex items-start gap-3"><Icon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-sky-800"/><div><p className="text-sm font-semibold">{title}</p><p className="mt-1 text-xs leading-5 text-zinc-500">{text}</p></div></div>)}</div>
  {data.error&&<p role="alert" className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">{data.error}</p>}
  <WholesaleCatalogGrid products={products} categories={data.categories} initial={{...filters,...(category?.brand?{brand:category.brand}:{})}}/>
  {!category&&<>
   <ProductSelection title="Productos destacados" products={products.filter(p=>p.featured)} href="#catalogo"/>
   <ProductSelection title="Cosmética y skincare" products={categoryProducts('cosmetica-coreana')} href="/mayorista/cosmetica-coreana#catalogo"/>
   <ProductSelection title="Perfumería y fragancias" products={categoryProducts('perfumeria')} href="/mayorista/perfumeria#catalogo"/>
   <ProductSelection title="Herramientas para tu negocio" products={categoryProducts('herramientas-equipamiento')} href="/mayorista/herramientas#catalogo"/>
   <ProductSelection title="Ofertas mayoristas" products={products.filter(p=>p.tags.includes('oferta')&&p.wholesaleOffer?.status==='ready')} href="#catalogo"/>
  </>}
  {category&&<section className="mt-12 grid gap-6 border-t border-zinc-200 pt-8 md:grid-cols-2"><div><h2 className="text-2xl font-semibold tracking-tight">Elegí la presentación exacta</h2>{category.buyingGuide.map(item=><article key={item.title} className="mt-5"><h3 className="text-sm font-semibold">{item.title}</h3><p className="mt-2 text-sm leading-7 text-zinc-600">{item.text}</p></article>)}</div><aside className="self-start rounded-2xl border border-zinc-200 bg-zinc-50 p-5"><Boxes aria-hidden="true" className="size-5 text-sky-800"/><h2 className="mt-3 text-base font-semibold">Antes de confirmar</h2><ul className="mt-3 space-y-3 text-sm text-zinc-600">{category.checklist.map(item=><li key={item}>{item}</li>)}</ul></aside></section>}
  <section className="mt-12 border-t border-zinc-200 pt-8"><h2 className="text-2xl font-semibold tracking-tight">Cómo comprar por mayor</h2><ol className="mt-5 grid gap-5 sm:grid-cols-3">{[['Explorá y compará','Revisá marca, presentación, fotos y precio confirmado.'],['Armá tu pedido','Sumá unidades de distintas categorías. El carrito te indica si alcanzaste el mínimo.'],['Confirmá pago y entrega','El servidor valida precios y disponibilidad. Los pendientes se confirman antes del pago.']].map(([title,text],i)=><li key={title} className="border-t border-zinc-200 pt-4"><p className="text-xs text-sky-800">0{i+1}</p><h3 className="mt-2 text-sm font-semibold">{title}</h3><p className="mt-2 text-xs leading-6 text-zinc-500">{text}</p></li>)}</ol></section>
  <section className="mt-12 grid gap-6 border-t border-zinc-200 pt-8 md:grid-cols-[.7fr_1.3fr]"><h2 className="text-2xl font-semibold tracking-tight">Preguntas frecuentes</h2><div>{faq.map(f=><details key={f.question} className="border-b border-zinc-200 py-4"><summary className="cursor-pointer text-sm font-semibold">{f.question}</summary><p className="mt-3 text-sm leading-7 text-zinc-600">{f.answer}</p></details>)}</div></section>
  <nav aria-label="Más rubros mayoristas" className="mt-8 flex flex-wrap gap-2">{WHOLESALE_CATEGORIES.filter(d=>d.slug!==category?.slug).map(d=><Link key={d.slug} href={`/mayorista/${d.slug}`} className="inline-flex min-h-11 items-center rounded-lg border border-zinc-200 px-3 text-xs text-zinc-600">{d.name}</Link>)}</nav>
  <p className="mt-8 text-xs leading-6 text-zinc-500">¿Buscás una compra individual? <Link href="/catalogo" className="text-sky-800 underline">Ir a la tienda minorista</Link>. Revisá las <Link href="/condiciones" className="text-sky-800 underline">condiciones de compra y entrega</Link>.</p>
 </div>;
}
