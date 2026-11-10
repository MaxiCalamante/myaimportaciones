import { cache } from "react";
import { getStorefrontData } from "./storefront";
import { getPublicWholesaleOffers, getPublicWholesalePolicy } from "./wholesale-v2-read";
import type { Category, Product } from "./types";
import { hasSupabaseConfig } from "./supabase/env";
import { INITIAL_PUBLIC_WHOLESALE_POLICY } from "./wholesale-v2";
import type { PublicWholesaleOffer } from "./wholesale-v2";
import { catalogBrandKey } from "./catalog-facets";
import { classifyWholesaleRubro } from "./wholesale-pricing-engine";

export function wholesaleCategoryIds(categories: Category[], slug?: string): Set<string> {
  const root=categories.find(c=>c.slug===slug);
  if(!slug)return new Set(categories.map(c=>c.id));
  if(!root)return new Set();
  const ids=new Set([root.id]);
  for(let i=0;i<categories.length;i++)for(const c of categories)if(c.parentId&&ids.has(c.parentId))ids.add(c.id);
  return ids;
}

/** Published products and a deliberately limited public quote, never acquisition costs. */
export const getWholesaleCatalog=cache(async(categorySlug?: string, brand?: string, limit?: number)=>{
  const [data,policy]=await Promise.all([getStorefrontData({wholesale:true,all:true}),hasSupabaseConfig()?getPublicWholesalePolicy(undefined,{allowFallback:true}):Promise.resolve({...INITIAL_PUBLIC_WHOLESALE_POLICY,confirmed:false})]);
  const categoryMap = new Map(data.categories.map(c => [c.id, c.slug]));
  const eligibleProducts = data.products.filter(p => {
    const catSlug = categoryMap.get(p.categoryId) ?? "";
    const classification = classifyWholesaleRubro(p.title, catSlug, p.brand, p.retailPrice);
    return classification.isEligible && classification.rubro !== "ineligible";
  });
  const categoryIds = categorySlug ? wholesaleCategoryIds(data.categories, categorySlug) : null;
  const selected = eligibleProducts.filter(p =>
    (!categoryIds || categoryIds.has(p.categoryId)) && (!brand || catalogBrandKey(p.brand) === catalogBrandKey(brand))
  );
  const visible = limit === undefined ? selected : selected.slice(0, limit);
  const items=visible.flatMap(p=>[
    ...(!p.wholesaleOffer?[{productId:p.id,variantId:null as string|null}]:[]),
    ...(p.variants??[]).filter(v=>v.isActive&&!v.wholesaleOffer).map(v=>({productId:p.id,variantId:v.id})),
  ]);
  const offers:PublicWholesaleOffer[]=[];
  // Run at most two quote requests at a time. Each batch stays within the RPC's public limit.
  for (let i = 0; i < items.length; i += 200) {
    const batches = [items.slice(i, i + 100), items.slice(i + 100, i + 200)];
    for (const batch of await Promise.all(batches.map(items => getPublicWholesaleOffers(items)))) offers.push(...batch);
  }
  const key=(p:string,v:string|null)=>`${p}:${v??'base'}`;
  const byIdentity=new Map(offers.map(o=>[key(o.productId,o.variantId),o]));
  const products:Product[]=visible.map(p=>({...p,
    wholesaleOffer:p.wholesaleOffer??byIdentity.get(key(p.id,null)),
    variants:p.variants?.map(v=>({...v,wholesaleOffer:v.wholesaleOffer??byIdentity.get(key(p.id,v.id))})),
  }));
  return{...data,products,eligibleProducts,policy};
});

export const getWholesaleSelection=cache(async(categorySlug:string,brand?:string)=>{
  return (await getWholesaleCatalog(categorySlug, brand, 8)).products;
});
