import Link from "next/link";
import { Boxes, LockKeyhole, Truck } from "lucide-react";
import { ProductSection } from "@/components/commerce/storefront-sections";
import { CatalogWithFilters } from "@/components/commerce/catalog-with-filters";
import { ButtonLink } from "@/components/ui/button";
import { getStorefrontData } from "@/lib/storefront";

export const metadata = {
  title: "Catálogo Mayorista | MYA Importaciones",
  description:
    "Precios directos por bulto cerrado y volumen en Cosmética Coreana (K-Beauty), smartphones y herramientas para revendedores y comercios.",
};

export default async function WholesalePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const params = await searchParams;
  const selectedCategorySlug = params.category;

  const initialData = await getStorefrontData();
  const selectedCategory = selectedCategorySlug
    ? initialData.categories.find((c) => c.slug === selectedCategorySlug)
    : null;

  const { categories, products } = selectedCategory
    ? await getStorefrontData({ categoryId: selectedCategory.id })
    : initialData;

  const wholesaleProducts = products.filter(
    (product) => product.wholesalePrice > 0 || product.wholesaleOnly,
  );

  if (selectedCategory) {
    const categoryProducts = wholesaleProducts;

    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-2xl bg-zinc-950 text-white p-8 md:p-12 shadow-xl border border-zinc-800">
          <div className="relative z-10 max-w-2xl">
            <Link
              href="/mayorista"
              className="inline-flex items-center text-xs font-semibold uppercase tracking-wider text-amber-400 hover:text-amber-300 transition-colors"
            >
              &larr; Volver al inicio mayorista
            </Link>
            <h1 className="mt-4 text-3xl font-extrabold sm:text-4xl md:text-5xl tracking-tight text-white">
              {selectedCategory.name} <span className="text-amber-400 text-2xl font-bold">(Mayorista)</span>
            </h1>
            {selectedCategory.description && (
              <p className="mt-4 text-sm text-zinc-300 leading-relaxed max-w-xl">
                {selectedCategory.description}
              </p>
            )}
          </div>
          {selectedCategory.imageUrl && (
            <div
              className="absolute inset-0 bg-cover bg-center opacity-20 pointer-events-none"
              style={{ backgroundImage: `url(${selectedCategory.imageUrl})` }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/80 to-transparent pointer-events-none" />
        </div>

        <CatalogWithFilters products={categoryProducts} channel="wholesale" />
      </div>
    );
  }

  return (
    <>
      <section className="bg-zinc-950 text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_360px] lg:px-8">
          <div>
            <p className="text-sm font-semibold uppercase text-amber-300">
              Acceso mayorista
            </p>
            <h1 className="mt-3 max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">
              Lista por volumen para comercios, oficinas y reventa.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-300">
              Los productos muestran minimo de compra, precio por unidad
              mayorista y metodos de pago comerciales.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="#lista" icon={<Boxes className="h-4 w-4" />}>
                Ver lista
              </ButtonLink>
              <ButtonLink href="/login" variant="secondary">
                Solicitar cuenta
              </ButtonLink>
            </div>
          </div>
          <div className="grid content-center gap-3">
            {[
              { icon: LockKeyhole, text: "Canal separado del recorrido minorista" },
              { icon: Truck, text: "Pedidos grandes con seguimiento" },
              { icon: Boxes, text: "Cajas cerradas y combos de reposicion" },
            ].map((item) => (
              <div
                className="flex items-center gap-3 rounded-lg border border-white/15 bg-white/10 p-4"
                key={item.text}
              >
                <item.icon className="h-5 w-5 text-emerald-300" />
                <span className="text-sm font-medium text-zinc-100">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
      <ProductSection
        channel="wholesale"
        eyebrow="Lista comercial"
        id="lista"
        products={wholesaleProducts}
        title="Productos mayoristas"
      />
    </>
  );
}

