import {ProductCard} from "@/components/commerce/product-card";
import {getWholesaleSelection} from "@/lib/wholesale-catalog";
import type {WholesaleCategory} from "@/lib/wholesale-content";
export async function WholesaleProducts({category}:{category:WholesaleCategory}){
 const products=await getWholesaleSelection(category.categorySlug,category.brand);
 return <section aria-label={`Productos mayoristas de ${category.name}`}><h2 className="text-xl font-semibold">{category.name}</h2><div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">{products.map(p=><ProductCard key={p.id} product={p} channel="wholesale"/>)}</div></section>;
}
