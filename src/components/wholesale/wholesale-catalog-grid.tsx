"use client";
import {useMemo,useState} from "react";
import {Search,SlidersHorizontal,X} from "lucide-react";
import type {Category,Product} from "@/lib/types";
import {isVerifiedStock} from "@/lib/commerce-policy";
import {rankProductSearch} from "@/lib/product-search";
import {ProductCard} from "@/components/commerce/product-card";
import {wholesaleDisplay} from "./public-price";

export interface WholesaleFilters {q?:string;category?:string;brand?:string;availability?:string;min?:string;max?:string;sort?:string}
export function WholesaleCatalogGrid({products,categories,initial={}}:{products:Product[];categories:Category[];initial?:WholesaleFilters}){
 const[query,setQuery]=useState(initial.q??''),[category,setCategory]=useState(initial.category??''),[brand,setBrand]=useState(initial.brand??'');
 const[availability,setAvailability]=useState(initial.availability??''),[min,setMin]=useState(initial.min??''),[max,setMax]=useState(initial.max??''),[sort,setSort]=useState(initial.sort??''),[limit,setLimit]=useState(24);
 const brands=useMemo(()=>[...new Set(products.map(p=>p.brand).filter((b):b is string=>Boolean(b)))].sort((a,b)=>a.localeCompare(b,'es')),[products]);
 const visible=useMemo(()=>{
  const ids=new Set<string>();const selected=categories.find(c=>c.slug===category);if(selected)ids.add(selected.id);
  for(let i=0;i<categories.length;i++)for(const c of categories)if(c.parentId&&ids.has(c.parentId))ids.add(c.id);
  let rows=products.filter(p=>!category||ids.has(p.categoryId)).filter(p=>!brand||p.brand===brand);
  if(query.trim())rows=rankProductSearch(rows,query);
  rows=rows.filter(p=>{const choices=p.hasVariants?(p.variants??[]).filter(v=>v.isActive):[p];
   if(availability==='available'&&!choices.some(isVerifiedStock))return false;
   if(availability==='own'&&!choices.some(c=>c.fulfillmentMode!=='supplier'&&isVerifiedStock(c)))return false;
   if(availability==='supplier'&&!choices.some(c=>c.fulfillmentMode==='supplier'&&isVerifiedStock(c)))return false;
   if(availability==='review'&&choices.some(c=>c.wholesaleOffer?.status==='ready'))return false;
   const price=wholesaleDisplay(p).price;
   if(min!==''&&(price===null||price<Number(min)))return false;
   if(max!==''&&(price===null||price>Number(max)))return false;return true;
  });
  rows.sort((a,b)=>{const pa=wholesaleDisplay(a).price,pb=wholesaleDisplay(b).price;
   if(sort==='price_asc')return(pa??Infinity)-(pb??Infinity);
   if(sort==='price_desc')return(pb??-Infinity)-(pa??-Infinity);
   if(sort==='name')return a.title.localeCompare(b.title,'es');
   return Number(b.featured)-Number(a.featured);
  });return rows;
 },[products,categories,query,category,brand,availability,min,max,sort]);
 const field='min-h-11 min-w-0 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-800 focus-visible:outline-2 focus-visible:outline-sky-700';
 const reset=()=>{setQuery('');setCategory('');setBrand('');setAvailability('');setMin('');setMax('');setSort('');setLimit(24);};
 return <section id="catalogo" className="scroll-mt-28 space-y-5" aria-labelledby="wholesale-catalog-heading">
  <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-widest text-sky-800">Tu próximo pedido</p><h2 id="wholesale-catalog-heading" className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">Catálogo mayorista completo</h2></div><p className="text-sm text-zinc-500" role="status">{visible.length} productos</p></div>
  <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3 sm:p-4">
   <label className="flex min-h-11 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3"><Search aria-hidden="true" className="size-4 shrink-0 text-zinc-500"/><input aria-label="Buscar productos mayoristas por nombre, modelo o SKU" value={query} onChange={e=>{setQuery(e.target.value);setLimit(24);}} placeholder="Buscá nombre, modelo o SKU" className="min-h-11 min-w-0 flex-1 bg-transparent text-sm outline-none"/></label>
   <details className="mt-3" open><summary className="flex min-h-10 cursor-pointer items-center gap-2 text-xs font-semibold text-zinc-700"><SlidersHorizontal aria-hidden="true" className="size-4"/>Filtrar y ordenar</summary><div className="mt-2 grid grid-cols-2 gap-3 lg:grid-cols-6">
    <label className="space-y-1 text-xs text-zinc-600">Categoría<select className={field} value={category} onChange={e=>{setCategory(e.target.value);setLimit(24);}}><option value="">Todos los rubros</option>{categories.map(c=><option key={c.id} value={c.slug}>{c.parentId?'↳ ':''}{c.name}</option>)}</select></label>
    <label className="space-y-1 text-xs text-zinc-600">Marca<select className={field} value={brand} onChange={e=>{setBrand(e.target.value);setLimit(24);}}><option value="">Todas las marcas</option>{brands.map(b=><option key={b}>{b}</option>)}</select></label>
    <label className="space-y-1 text-xs text-zinc-600">Disponibilidad<select className={field} value={availability} onChange={e=>setAvailability(e.target.value)}><option value="">Todas</option><option value="available">Disponibilidad verificada</option><option value="own">Stock propio verificado</option><option value="supplier">Bajo pedido verificado</option><option value="review">Precio por confirmar</option></select></label>
    <label className="space-y-1 text-xs text-zinc-600">Desde ARS<input className={field} aria-label="Precio mayorista mínimo" type="number" min="0" inputMode="numeric" value={min} onChange={e=>setMin(e.target.value)}/></label>
    <label className="space-y-1 text-xs text-zinc-600">Hasta ARS<input className={field} aria-label="Precio mayorista máximo" type="number" min="0" inputMode="numeric" value={max} onChange={e=>setMax(e.target.value)}/></label>
    <label className="space-y-1 text-xs text-zinc-600">Ordenar<select className={field} value={sort} onChange={e=>setSort(e.target.value)}><option value="">Destacados</option><option value="price_asc">Menor precio confirmado</option><option value="price_desc">Mayor precio confirmado</option><option value="name">Nombre A–Z</option></select></label>
   </div></details>
   {(query||category||brand||availability||min||max||sort)&&<button type="button" onClick={reset} className="mt-3 inline-flex min-h-10 items-center gap-1 text-xs font-semibold text-sky-800"><X className="size-3.5"/>Limpiar filtros</button>}
  </div>
  <p className="text-xs leading-5 text-zinc-500">Los precios confirmados se muestran por unidad. Podés combinar rubros; los productos con precio o disponibilidad pendientes se solicitan para confirmación antes del pago.</p>
  {visible.length?<div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">{visible.slice(0,limit).map(p=><ProductCard key={p.id} product={p} channel="wholesale"/>)}</div>:<p className="rounded-xl border border-zinc-200 p-6 text-sm text-zinc-600">No hay productos con estos filtros. Probá otra búsqueda o limpiá la selección.</p>}
  {visible.length>limit&&<div className="text-center"><button type="button" onClick={()=>setLimit(n=>n+24)} className="min-h-11 rounded-xl border border-zinc-300 px-5 text-sm font-semibold text-zinc-800">Ver más productos ({visible.length-limit})</button></div>}
 </section>;
}
