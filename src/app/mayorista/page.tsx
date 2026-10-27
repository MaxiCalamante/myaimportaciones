import Link from "next/link";
import {
  Boxes,
  LockKeyhole,
  Truck,
  FileSpreadsheet,
  MessageCircle,
  Sparkles,
  Clock,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  UserCheck,
  Building2,
  Store,
  LogIn,
  AlertCircle,
  Phone,
  FileText,
} from "lucide-react";
import { wholesaleMetadata } from "@/lib/wholesale-content";
import { CatalogWithFilters } from "@/components/commerce/catalog-with-filters";
import { ButtonLink } from "@/components/ui/button";
import { getStorefrontData } from "@/lib/storefront";
import { getWhatsAppUrl } from "@/lib/site";
import { getCurrentProfile } from "@/lib/auth";
import { ResellerStarterKits } from "@/components/commerce/reseller-starter-kits";
import { TrustGuaranteeBadges } from "@/components/commerce/trust-guarantee-badges";
import { WholesaleApplicationForm } from "@/components/wholesale/wholesale-application-form";

export const metadata = wholesaleMetadata();

export default async function WholesalePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const params = await searchParams;
  const selectedCategorySlug = params.category;

  const auth = await getCurrentProfile();
  const user = auth.user;
  const profile = auth.profile;
  const isApproved = Boolean(profile?.isApprovedWholesale);
  const isPending = Boolean(profile?.isWholesalePending);

  // --------------------------------------------------------------------------
  // CASO 1: CLIENTE MAYORISTA APROBADO -> ACCESO COMPLETO AL CATÁLOGO MAYORISTA
  // --------------------------------------------------------------------------
  if (isApproved) {
    const initialData = await getStorefrontData({ wholesale: true, all: true });
    const selectedCategory = selectedCategorySlug
      ? initialData.categories.find((c) => c.slug === selectedCategorySlug)
      : null;

    const { categories, products } = selectedCategory
      ? await getStorefrontData({ wholesale: true, all: true, categoryId: selectedCategory.id })
      : initialData;

    const wholesaleProducts = products.filter(
      (product) => product.wholesalePrice > 0 || product.wholesaleOnly
    );

    if (selectedCategory) {
      return (
        <div id="catalogo" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 scroll-mt-20">
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

          <div className="mt-8">
            <CatalogWithFilters products={wholesaleProducts} channel="wholesale" />
          </div>
        </div>
      );
    }

    return (
      <>
        <section className="bg-zinc-950 text-white">
          <div className="mx-auto max-w-7xl px-4 pt-10 pb-14 sm:px-6 lg:px-8">
            {/* Banner de Usuario Mayorista Habilitado */}
            <div className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-4">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500 text-zinc-950 font-black text-base shadow-sm">
                  ★
                </span>
                <div>
                  <p className="text-sm font-bold text-emerald-400">
                    Cuenta Mayorista Verificada: {profile?.businessName || profile?.fullName}
                  </p>
                  <p className="text-xs text-zinc-300">
                    Tenés desbloqueados los precios mayoristas por bulto con descuento directo sobre el PVP minorista.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={getWhatsAppUrl(`Hola Maxi y Agustina! Soy ${profile?.fullName || profile?.businessName} (Mayorista) y quisiera coordinar un pedido.`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3.5 py-2 text-xs transition shadow-sm"
                >
                  <MessageCircle className="h-3.5 w-3.5" /> Enviar Pedido por WhatsApp
                </a>
              </div>
            </div>

            <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
              <div>
                <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-amber-300 bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/20">
                  <Sparkles className="h-3.5 w-3.5" /> Distribución Mayorista Oficial
                </span>
                <h1 className="mt-4 max-w-3xl text-4xl font-black leading-tight sm:text-5xl tracking-tight">
                  Precios por bulto cerrado para ferreterías, comercios y revendedores.
                </h1>
                <p className="mt-4 max-w-2xl text-sm sm:text-base leading-relaxed text-zinc-300">
                  Accedé a precios comerciales directos de importación en cosmética coreana (K-Beauty), cuidado capilar y herramientas Total Tools / Wadfow.
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
                  <Link
                    href="/mayorista/presupuesto"
                    className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold px-4 py-3 text-xs sm:text-sm transition shadow-sm cursor-pointer"
                  >
                    <FileText className="h-4 w-4 text-amber-400" />
                    Presupuesto Formal PDF
                  </Link>
                  <a
                    href={getWhatsAppUrl("Hola MYA Importaciones! Quisiera consultar por compras por bulto cerrado y stock disponible.")}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 text-white font-semibold px-4 py-3 text-xs sm:text-sm transition cursor-pointer"
                  >
                    <MessageCircle className="h-4 w-4 text-emerald-400" />
                    Consultar por WhatsApp
                  </a>
                </div>
              </div>
              <div className="grid content-center gap-3">
                {[
                  { icon: LockKeyhole, text: "Canal B2B con hasta 50% de ahorro vs precio minorista" },
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

        {/* Reseller Starter Kits */}
        <ResellerStarterKits products={products} />

        {/* Main Catalog View with Filters */}
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8" id="lista">
          <div className="border-b border-zinc-200 pb-4 mb-6">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600">Canal Comercial</span>
            <h2 className="text-2xl sm:text-3xl font-black text-zinc-950 tracking-tight">
              Catálogo de Precios Mayoristas
            </h2>
            <p className="text-xs text-zinc-500 mt-1">
              Visualizá el precio minorista de referencia (PVP) y al lado el precio mayorista en bulto con su ahorro y cantidad mínima.
            </p>
          </div>

          <CatalogWithFilters products={wholesaleProducts} channel="wholesale" />
        </div>

        {/* Trust & Guarantee Badges */}
        <TrustGuaranteeBadges />
      </>
    );
  }

  // --------------------------------------------------------------------------
  // CASO 2: CLIENTE REGISTRADO CON POSTULACIÓN EN REVISIÓN (PENDIENTE)
  // --------------------------------------------------------------------------
  if (user && isPending) {
    const formattedDate = profile?.wholesaleRequestedAt
      ? new Date(profile.wholesaleRequestedAt).toLocaleDateString("es-AR", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : "Reciente";

    return (
      <section className="bg-zinc-950 text-white min-h-[80vh] flex flex-col justify-center py-16 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl w-full">
          {/* Header de Estado */}
          <div className="text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/10 border border-amber-400/30 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-amber-300">
              <Clock className="h-3.5 w-3.5 animate-spin" /> Solicitud en Evaluación
            </span>
            <h1 className="mt-4 text-3xl sm:text-4xl font-black text-white tracking-tight">
              Tu Postulación Mayorista está en Revisión
            </h1>
            <p className="mt-3 text-sm sm:text-base text-zinc-300 max-w-xl mx-auto">
              ¡Hola <strong className="text-white">{profile?.fullName || "Cliente"}</strong>! Recibimos correctamente tu solicitud para operar en el canal mayorista de MYA Importaciones.
            </p>
          </div>

          {/* Tarjeta con los datos enviados */}
          <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/90 p-6 sm:p-8 shadow-2xl backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <Building2 className="h-4 w-4 text-amber-400" />
                <span>Datos del Comercio / Solicitud</span>
              </div>
              <span className="text-xs text-zinc-400">Enviada el {formattedDate}</span>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 text-sm">
              <div className="rounded-xl bg-zinc-950 p-3.5 border border-zinc-800/80">
                <span className="text-xs text-zinc-500 font-medium">Nombre Comercial / Negocio:</span>
                <p className="font-bold text-white mt-0.5">{profile?.businessName || "No indicado"}</p>
              </div>

              <div className="rounded-xl bg-zinc-950 p-3.5 border border-zinc-800/80">
                <span className="text-xs text-zinc-500 font-medium">CUIT / CUIL o DNI:</span>
                <p className="font-bold text-white mt-0.5">{profile?.cuit || "No indicado"}</p>
              </div>

              <div className="rounded-xl bg-zinc-950 p-3.5 border border-zinc-800/80">
                <span className="text-xs text-zinc-500 font-medium">Teléfono / WhatsApp:</span>
                <p className="font-bold text-white mt-0.5">{profile?.phone || "No indicado"}</p>
              </div>

              <div className="rounded-xl bg-zinc-950 p-3.5 border border-zinc-800/80">
                <span className="text-xs text-zinc-500 font-medium">Email Registrado:</span>
                <p className="font-bold text-white mt-0.5">{profile?.email}</p>
              </div>
            </div>

            {profile?.wholesaleNotes && (
              <div className="mt-4 rounded-xl bg-zinc-950 p-3.5 border border-zinc-800/80 text-sm">
                <span className="text-xs text-zinc-500 font-medium">Notas / Rubro:</span>
                <p className="text-zinc-300 mt-0.5">{profile.wholesaleNotes}</p>
              </div>
            )}

            <div className="mt-6 rounded-xl bg-amber-400/5 border border-amber-400/20 p-4 text-xs text-zinc-300 space-y-1">
              <p className="font-bold text-amber-300">¿Cómo continúa el proceso?</p>
              <p>
                Nuestro equipo comercial revisa los datos de los nuevos comercios y revendedores habitualmente en 24 a 48 hs hábiles.
                Una vez aprobada tu cuenta por el administrador, al ingresar a esta sección tendrás acceso directo a todos los precios mayoristas y compras por bulto cerrado.
              </p>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-zinc-800 pt-5">
              <span className="text-xs text-zinc-400">
                ¿Necesitás agilizar la habilitación de tu cuenta?
              </span>
              <a
                href={getWhatsAppUrl(`Hola Maxi y Agustina! Envié mi postulación mayorista con el email ${profile?.email} (Comercio: ${profile?.businessName || profile?.fullName}) y quisiera coordinar para que me habiliten el catálogo mayorista.`)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2.5 text-xs transition shadow-sm"
              >
                <MessageCircle className="h-4 w-4" /> Acelerar por WhatsApp
              </a>
            </div>
          </div>

          <div className="mt-8 text-center">
            <Link href="/" className="text-xs text-zinc-400 hover:text-white transition underline underline-offset-4">
              &larr; Volver a la tienda minorista mientras tanto
            </Link>
          </div>
        </div>
      </section>
    );
  }

  // --------------------------------------------------------------------------
  // CASO 3: CLIENTE REGISTRADO (MINORISTA) -> FORMULARIO DE POSTULACIÓN
  // --------------------------------------------------------------------------
  if (user && !isApproved && !isPending) {
    return (
      <section className="bg-zinc-950 text-white py-14 px-4 sm:px-6 lg:px-8 min-h-[85vh]">
        <div className="mx-auto max-w-4xl">
          {/* Header */}
          <div className="text-center max-w-2xl mx-auto">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/10 border border-amber-400/20 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-amber-300">
              <Store className="h-3.5 w-3.5" /> Portal Mayorista B2B
            </span>
            <h1 className="mt-3 text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight">
              Postulate para Acceder a Precios Mayoristas
            </h1>
            <p className="mt-3 text-sm sm:text-base text-zinc-300 leading-relaxed">
              Tu cuenta actual opera en modo minorista. Para desbloquear el catálogo con precios por bulto cerrado y descuentos directos, completá los datos de tu comercio o actividad comercial.
            </p>
          </div>

          {/* Ventajas Mayoristas */}
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
              <div className="flex items-center gap-2.5 text-amber-400 text-sm font-bold">
                <LockKeyhole className="h-4 w-4" />
                <span>Precios por Bulto</span>
              </div>
              <p className="mt-1.5 text-xs text-zinc-400">
                Ahorrá hasta un 50% frente al precio minorista con descuentos por escala y márgenes para tu negocio.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
              <div className="flex items-center gap-2.5 text-amber-400 text-sm font-bold">
                <Boxes className="h-4 w-4" />
                <span>Mínimo Combinable</span>
              </div>
              <p className="mt-1.5 text-xs text-zinc-400">
                Mínimo general de $100.000 combinable entre cosmética coreana, capilar y herramientas.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
              <div className="flex items-center gap-2.5 text-amber-400 text-sm font-bold">
                <Truck className="h-4 w-4" />
                <span>Envíos a Todo el País</span>
              </div>
              <p className="mt-1.5 text-xs text-zinc-400">
                Despachos en 24/48 hs a depósito, expreso o transporte de tu confianza con embalaje reforzado.
              </p>
            </div>
          </div>

          {/* Formulario de Postulación */}
          <div className="mt-8">
            <WholesaleApplicationForm
              userEmail={profile?.email || user.email || ""}
              userFullName={profile?.fullName || ""}
              initialPhone={profile?.phone || ""}
              initialBusinessName={profile?.businessName || ""}
              initialCuit={profile?.cuit || ""}
            />
          </div>

          {/* Contacto Directo */}
          <div className="mt-6 text-center text-xs text-zinc-400">
            ¿Preferís coordinar directamente por WhatsApp?{" "}
            <a
              href={getWhatsAppUrl(`Hola Maxi y Agustina! Estoy registrado con el mail ${profile?.email} y quisiera consultar por la postulación mayorista.`)}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-emerald-400 hover:text-emerald-300 transition underline underline-offset-4"
            >
              Escribinos acá
            </a>
          </div>
        </div>
      </section>
    );
  }

  // --------------------------------------------------------------------------
  // CASO 4: USUARIO NO AUTENTICADO (INVITADO) -> GATEWAY B2B CON LOGIN / REGISTRO
  // --------------------------------------------------------------------------
  return (
    <section className="bg-zinc-950 text-white min-h-[85vh] py-14 px-4 sm:px-6 lg:px-8 flex flex-col justify-center">
      <div className="mx-auto max-w-4xl w-full">
        <div className="text-center max-w-2xl mx-auto">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/10 border border-amber-400/20 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-amber-300">
            <ShieldCheck className="h-3.5 w-3.5" /> Canal Mayorista B2B Exclusivo
          </span>
          <h1 className="mt-4 text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
            Portal Mayorista & Revendedores
          </h1>
          <p className="mt-3 text-sm sm:text-base text-zinc-300 leading-relaxed">
            Para proteger los márgenes de comercios y revendedores, los precios mayoristas por bulto cerrado están reservados a cuentas comerciales verificadas.
          </p>
        </div>

        {/* Pasos para acceder */}
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 flex flex-col justify-between">
            <div>
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-amber-400 text-zinc-950 font-black text-xs">
                1
              </span>
              <h3 className="mt-3 text-base font-bold text-white">Creá tu Cuenta</h3>
              <p className="mt-1 text-xs text-zinc-400 leading-relaxed">
                Registrate en la plataforma con tu correo electrónico en menos de un minuto.
              </p>
            </div>
            <span className="mt-4 text-[11px] font-semibold text-amber-400 flex items-center gap-1">
              Paso inicial <ArrowRight className="h-3 w-3" />
            </span>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 flex flex-col justify-between">
            <div>
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-amber-400 text-zinc-950 font-black text-xs">
                2
              </span>
              <h3 className="mt-3 text-base font-bold text-white">Postulate como Mayorista</h3>
              <p className="mt-1 text-xs text-zinc-400 leading-relaxed">
                Ingresá los datos de tu comercio, actividad o CUIT para que validemos tu perfil comercial.
              </p>
            </div>
            <span className="mt-4 text-[11px] font-semibold text-amber-400 flex items-center gap-1">
              Validación rápida <ArrowRight className="h-3 w-3" />
            </span>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 flex flex-col justify-between">
            <div>
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-500 text-zinc-950 font-black text-xs">
                3
              </span>
              <h3 className="mt-3 text-base font-bold text-white">Acceso al Catálogo</h3>
              <p className="mt-1 text-xs text-zinc-400 leading-relaxed">
                Una vez aprobada tu cuenta, visualizás en vivo todos los precios mayoristas y comprás directamente.
              </p>
            </div>
            <span className="mt-4 text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
              Desbloqueo directo <CheckCircle2 className="h-3 w-3" />
            </span>
          </div>
        </div>

        {/* Acciones principales */}
        <div className="mt-8 rounded-2xl border border-amber-400/30 bg-gradient-to-r from-amber-400/10 via-zinc-900 to-zinc-900 p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              ¿Ya tenés cuenta o querés comenzar?
            </h2>
            <p className="text-xs sm:text-sm text-zinc-300 mt-1 max-w-md">
              Iniciá sesión para postularte o ver el estado de tu cuenta mayorista. Si no tenés cuenta, podés crearla ahora mismo.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link
              href="/login?next=/mayorista"
              className="inline-flex items-center gap-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold px-5 py-3 text-sm transition shadow-lg"
            >
              <LogIn className="h-4 w-4" />
              <span>Iniciar Sesión / Crear Cuenta</span>
            </Link>
            <a
              href={getWhatsAppUrl("Hola MYA Importaciones! Quisiera consultar por la apertura de cuenta mayorista para mi negocio.")}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 text-white font-semibold px-4 py-3 text-sm transition"
            >
              <MessageCircle className="h-4 w-4 text-emerald-400" />
              <span>Consultar por WhatsApp</span>
            </a>
          </div>
        </div>

        {/* Condiciones Generales */}
        <div className="mt-8 grid gap-3 sm:grid-cols-3 text-center text-xs text-zinc-400 border-t border-zinc-800 pt-6">
          <div>
            <strong className="text-zinc-200 block text-sm">Mínimo de Compra</strong>
            $100.000 combinables entre cualquier rubro del catálogo.
          </div>
          <div>
            <strong className="text-zinc-200 block text-sm">Marcas Oficiales</strong>
            Medicube, Celimax, Anua, Skin1004, Karseell, Total Tools y Wadfow.
          </div>
          <div>
            <strong className="text-zinc-200 block text-sm">Despachos Seguros</strong>
            Envíos diarios a todo el país con seguimiento y seguro de carga.
          </div>
        </div>
      </div>
    </section>
  );
}
