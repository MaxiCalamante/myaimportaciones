import { cache } from "react";
import { getStorefrontData } from "./storefront";
import { getPublicWholesaleOffers, getPublicWholesalePolicy } from "./wholesale-v2-read";
import type { Category, Product } from "./types";
import { hasSupabaseConfig } from "./supabase/env";
import { INITIAL_PUBLIC_WHOLESALE_POLICY } from "./wholesale-v2";
import type { PublicWholesaleOffer } from "./wholesale-v2";

export function wholesaleCategoryIds(categories: Category[], slug?: string): Set<string> {
  const root=categories.find(c=>c.slug===slug);
  if(!slug)return new Set(categories.map(c=>c.id));
  if(!root)return new Set();
  const ids=new Set([root.id]);
  for(let i=0;i<categories.length;i++)for(const c of categories)if(c.parentId&&ids.has(c.parentId))ids.add(c.id);
  return ids;
}

/** Published products and a deliberately limited public quote, never acquisition costs. */
export const getWholesaleCatalog=cache(async()=>{
  const [data,policy]=await Promise.all([getStorefrontData({wholesale:true,all:true}),hasSupabaseConfig()?getPublicWholesalePolicy():Promise.resolve(INITIAL_PUBLIC_WHOLESALE_POLICY)]);
  const items=data.products.flatMap(p=>[
    ...(!p.wholesaleOffer?[{productId:p.id,variantId:null as string|null}]:[]),
    ...(p.variants??[]).filter(v=>v.isActive&&!v.wholesaleOffer).map(v=>({productId:p.id,variantId:v.id})),
  ]);
  const offers:PublicWholesaleOffer[]=[];
  for(let i=0;i<items.length;i+=500)offers.push(...await getPublicWholesaleOffers(items.slice(i,i+500)));
  const key=(p:string,v:string|null)=>`${p}:${v??'base'}`;
  const byIdentity=new Map(offers.map(o=>[key(o.productId,o.variantId),o]));
  const products:Product[]=data.products.map(p=>({...p,
    wholesaleOffer:p.wholesaleOffer??byIdentity.get(key(p.id,null)),
    variants:p.variants?.map(v=>({...v,wholesaleOffer:v.wholesaleOffer??byIdentity.get(key(p.id,v.id))})),
  }));
  return{...data,products,policy};
});

export const getWholesaleSelection=cache(async(categorySlug:string,brand?:string)=>{
  const data=await getWholesaleCatalog(),ids=wholesaleCategoryIds(data.categories,categorySlug);
  return data.products.filter(p=>ids.has(p.categoryId)&&(!brand||p.brand?.toLocaleLowerCase('es')===brand.toLocaleLowerCase('es'))).slice(0,8);
});
