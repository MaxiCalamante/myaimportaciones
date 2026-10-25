import Image from "next/image";
import Link from "next/link";
import { getWholesaleSelection } from "@/lib/wholesale-catalog";
import { isVerifiedStock } from "@/lib/commerce-policy";
import type { WholesaleCategory } from "@/lib/wholesale-content";
import { WholesaleProductInquiry } from "./wholesale-contact";
import { ProductVariantPreview } from "@/components/commerce/product-variant-preview";

export async function WholesaleProducts({ category }: { category: WholesaleCategory }) {
  const products = await getWholesaleSelection(category.categorySlug, category.brand);
  if (!products.length) return null;
  return <section aria-labelledby="wholesale-products-title">
    <h2 id="wholesale-products-title" className="text-2xl font-bold text-zinc-950">{category.name}: productos para tu consulta</h2>
    <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-600">Estos productos forman parte del catálogo. Pedinos los precios mayoristas por WhatsApp con las cantidades que necesitás. Cada ficha permite revisar la presentación y muestra el precio minorista; la disponibilidad se confirma al cotizar.</p>
    <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {products.map(product => <article key={product.id} className="flex min-w-0 flex-col rounded-2xl border border-zinc-200 bg-white p-4">
        <Link href={`/producto/${product.slug}`} className="group">
          <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-zinc-50"><Image src={product.imageUrl || "/logo.png"} alt={product.title} fill sizes="(max-width: 639px) 90vw, (max-width: 1023px) 45vw, 30vw" className="object-contain p-3" /></div>
          <h3 className="mt-4 text-sm font-semibold leading-6 text-zinc-950 group-hover:text-sky-800">{product.title}</h3>
        </Link>
        <p className="mt-2 text-xs text-zinc-500">{isVerifiedStock(product) ? "Consultar cantidad disponible" : "Consultar disponibilidad"}</p>
        {product.hasVariants && <ProductVariantPreview slug={product.slug} variants={product.variants} />}
        <div className="mt-auto"><WholesaleProductInquiry title={product.title} slug={product.slug} category={category.name} /></div>
      </article>)}
    </div>
  </section>;
}
