import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Sparkles, Layers } from "lucide-react";
import { getWholesaleSelection } from "@/lib/wholesale-catalog";
import type { WholesaleCategory } from "@/lib/wholesale-content";
import { WholesaleProductInquiry } from "./wholesale-contact";

export async function WholesaleProducts({ category }: { category: WholesaleCategory }) {
  const products = await getWholesaleSelection(category.categorySlug, category.brand);
  const catalogUrl = category.brand
    ? `/catalogo?brand=${encodeURIComponent(category.brand)}`
    : `/catalogo?category=${category.categorySlug}`;

  return (
    <section aria-labelledby="wholesale-products-title" className="space-y-6">
      {/* Banner de acceso directo al catálogo completo de la categoría */}
      <div className="rounded-3xl border border-sky-200 bg-gradient-to-br from-sky-50 via-white to-sky-100/50 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-600/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-sky-800">
              <Sparkles className="size-3.5" /> Todo el catálogo disponible por mayor
            </span>
            <h2 id="wholesale-products-title" className="mt-3 text-2xl sm:text-3xl font-black text-zinc-950 tracking-tight">
              {category.name}: Catálogo completo en la tienda
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-700">
              Todos los productos y marcas publicadas en la web aplican para compra mayorista (mínimo de <strong>5 unidades o $100.000 combinables</strong>). No te limites a una muestra reducida: podés elegir cualquier producto, modelo o presentación disponible en la tienda.
            </p>
          </div>
          <div className="shrink-0">
            <Link
              href={catalogUrl}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-sky-700 px-6 py-3.5 text-sm font-bold text-white shadow hover:bg-sky-800 transition"
            >
              Ver todos los productos de {category.name} <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Muestra ilustrativa para evitar que crean que solo existen 5 productos */}
      {products.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-600">
                Muestra ilustrativa de presentaciones frecuentes
              </p>
              <p className="text-xs text-zinc-500 mt-0.5">
                (En el catálogo de la tienda encontrás muchos más productos, líneas y stock para cotizar)
              </p>
            </div>
            <Link
              href={catalogUrl}
              className="hidden sm:inline-flex items-center gap-1 text-xs font-bold text-sky-700 hover:text-sky-800 underline underline-offset-4"
            >
              Explorar todo en la tienda &rarr;
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.slice(0, 4).map(product => (
              <article key={product.id} className="flex min-w-0 flex-col rounded-2xl border border-zinc-200 bg-white p-4 hover:border-sky-300 transition shadow-sm">
                <Link href={catalogUrl} className="group">
                  <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-zinc-50">
                    <Image
                      src={product.imageUrl || "/logo.png"}
                      alt={product.title}
                      fill
                      sizes="(max-width: 639px) 90vw, (max-width: 1023px) 45vw, 30vw"
                      className="object-contain p-3 group-hover:scale-105 transition-transform"
                    />
                    <span className="absolute top-2 right-2 rounded-md bg-zinc-900/70 backdrop-blur px-2 py-0.5 text-[10px] font-semibold text-white">
                      Ilustrativo
                    </span>
                  </div>
                  <h3 className="mt-4 text-sm font-semibold leading-6 text-zinc-950 group-hover:text-sky-800 line-clamp-2">
                    {product.title}
                  </h3>
                </Link>
                <div className="mt-auto pt-3">
                  <WholesaleProductInquiry title={product.title} slug={product.slug} category={category.name} />
                </div>
              </article>
            ))}

            {/* Tarjeta de redirección directa al catálogo completo */}
            <article className="flex min-w-0 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-sky-300 bg-sky-50/50 p-6 text-center hover:bg-sky-50 transition">
              <Layers className="size-10 text-sky-700 mb-3" />
              <h3 className="text-base font-bold text-zinc-900">
                Ver todo el catálogo de {category.name}
              </h3>
              <p className="mt-1 text-xs text-zinc-600 max-w-xs">
                Accedé al listado completo con filtros por marca, precio y disponibilidad para armar tu pedido mayorista.
              </p>
              <Link
                href={catalogUrl}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-sky-700 hover:bg-sky-800 text-white font-bold text-xs px-4 py-2.5 transition"
              >
                Abrir en la tienda <ArrowRight className="size-3.5" />
              </Link>
            </article>
          </div>
        </div>
      )}
    </section>
  );
}
