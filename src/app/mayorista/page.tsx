import Link from "next/link";
import { Boxes, LockKeyhole, Truck, FileSpreadsheet, MessageCircle, Sparkles } from "lucide-react";
import { CatalogWithFilters } from "@/components/commerce/catalog-with-filters";
import { ButtonLink } from "@/components/ui/button";
import { getStorefrontData } from "@/lib/storefront";
import { getWhatsAppUrl } from "@/lib/site";

import { getCurrentProfile } from "@/lib/auth";

export const metadata = {
  title: "Catálogo Mayorista | MYA Importaciones",
  description:
    "Precios directos por bulto cerrado y volumen en Cosmética Coreana (K-Beauty), herramientas Total & Wadfow y tecnología para revendedores y comercios.",
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

  const [{ categories, products }, auth] = await Promise.all([
    selectedCategory
      ? getStorefrontData({ categoryId: selectedCategory.id })
      : Promise.resolve(initialData),
    getCurrentProfile(),
  ]);

  const profile = auth.profile;
  const isApproved = profile?.isApprovedWholesale;

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
        <div className="mx-auto max-w-7xl px-4 pt-10 pb-14 sm:px-6 lg:px-8">
          
          {/* User Status Notification Banner */}
          {isApproved ? (
            <div className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-amber-400/10 border border-amber-400/30 p-4">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-400 text-zinc-950 font-black text-sm">
                  ★
                </span>
                <div>
                  <p className="text-sm font-bold text-amber-300">
                    Cuenta Mayorista Habilitada: {profile?.fullName}
                  </p>
                  <p className="text-xs text-zinc-400">
                    Operás con precios de costo por bulto cerrado y atención preferencial de importación directa.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={getWhatsAppUrl(`Hola Maxi! Soy ${profile?.fullName} y quisiera pasar un pedido mayorista.`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3.5 py-2 text-xs transition"
                >
                  <MessageCircle className="h-3.5 w-3.5" /> Enviar Pedido por WhatsApp
                </a>
              </div>
            </div>
          ) : profile ? (
            <div className="mb-8 rounded-2xl bg-amber-500/10 border border-amber-500/30 p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-500/20 text-amber-400 font-black text-sm">
                    !
                  </span>
                  <div>
                    <p className="text-sm font-bold text-white">
                      Tu usuario ({profile.email}) está registrado en modo minorista
                    </p>
                    <p className="text-xs text-zinc-400">
                      Si el administrador te compartió este link, avisale para que active tu condición mayorista en el sistema.
                    </p>
                  </div>
                </div>
                <a
                  href={getWhatsAppUrl(`Hola Maxi / MYA Importaciones! Creé mi cuenta con el email ${profile.email} y quisiera que me habilites el catálogo mayorista.`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3.5 py-2 text-xs transition shrink-0"
                >
                  <MessageCircle className="h-3.5 w-3.5" /> Solicitar Habilitación
                </a>
              </div>
            </div>
          ) : (
            <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl bg-white/5 border border-white/10 p-4">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-400/20 text-amber-400 font-bold text-xs">
                  B2B
                </span>
                <div>
                  <p className="text-sm font-bold text-white">
                    Catálogo Exclusivo de Distribución B2B
                  </p>
                  <p className="text-xs text-zinc-400">
                    Visualizá los precios mayoristas por bulto. Contactá a tu asesor para procesar tu orden o registrate en la web.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link href="/login?next=/mayorista" className="text-xs font-semibold bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-xl transition">
                  Iniciar Sesión
                </Link>
                <a
                  href={getWhatsAppUrl("Hola MYA Importaciones! Recibí el link del catálogo mayorista y quisiera hacer una consulta comercial.")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-xl transition inline-flex items-center gap-1.5"
                >
                  <MessageCircle className="h-3.5 w-3.5" /> Consultar por WhatsApp
                </a>
              </div>
            </div>
          )}

          <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
            <div>
              <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-amber-300 bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/20">
                <Sparkles className="h-3.5 w-3.5" /> Distribución Mayorista Oficial
              </span>
              <h1 className="mt-4 max-w-3xl text-4xl font-black leading-tight sm:text-5xl tracking-tight">
                Precios por bulto cerrado para ferreterías, comercios y revendedores.
              </h1>
              <p className="mt-4 max-w-2xl text-sm sm:text-base leading-relaxed text-zinc-300">
                Accedé a precios comerciales directos de importación en herramientas Total Tools, Wadfow y Cosmética Coreana (K-Beauty). 
                Mínimo de compra general de <strong>$100.000</strong> combinable entre todos los rubros.
              </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <ButtonLink href="#lista" icon={<Boxes className="h-4 w-4" />}>
                Ver catálogo mayorista
              </ButtonLink>
              <a
                href="/api/export-catalog?type=wholesale"
                download
                className="inline-flex items-center gap-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold px-4 py-3 text-xs sm:text-sm transition shadow-sm cursor-pointer"
              >
                <FileSpreadsheet className="h-4 w-4 text-zinc-950" />
                Descargar Lista Excel / CSV
              </a>
              <a
                href={getWhatsAppUrl("Hola MYA Importaciones! Quisiera solicitar la lista mayorista en PDF y consultar por compras por bulto cerrado.")}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 text-white font-semibold px-4 py-3 text-xs sm:text-sm transition cursor-pointer"
              >
                <MessageCircle className="h-4 w-4 text-emerald-400" />
                Pedir PDF por WhatsApp
              </a>
            </div>
          </div>
          <div className="grid content-center gap-3">
            {[
              { icon: LockKeyhole, text: "Canal B2B con hasta 50% de ahorro vs minorista" },
              { icon: Truck, text: "Envíos directos a depósito o expreso en 24/48 hs" },
              { icon: Boxes, text: "Cajas cerradas y combos de reposición garantizada" },
            ].map((item) => (
              <div
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4"
                key={item.text}
              >
                <item.icon className="h-5 w-5 text-amber-400" />
                <span className="text-sm font-medium text-zinc-200">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>

      {/* Main Catalog View with Filters */}
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8" id="lista">
        <div className="border-b border-zinc-200 pb-4 mb-6">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-600">Canal Comercial</span>
          <h2 className="text-2xl sm:text-3xl font-black text-zinc-950 tracking-tight">
            Catálogo de Precios Mayoristas
          </h2>
          <p className="text-xs text-zinc-500 mt-1">
            Visualizá el stock, precio unitario por bulto y cantidad mínima por producto.
          </p>
        </div>

        <CatalogWithFilters products={wholesaleProducts} channel="wholesale" />
      </div>
    </>
  );
}
