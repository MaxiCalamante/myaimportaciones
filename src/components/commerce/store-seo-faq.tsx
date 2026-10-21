import Link from "next/link";
import { ArrowRight, HelpCircle, ShieldCheck, Truck, Sparkles, MapPin, CreditCard } from "lucide-react";
import { siteConfig } from "@/lib/site";

const faqs = [
  { question: "¿Cómo comprar y recibir un pedido en Argentina?", answer: "Explorá el catálogo, revisá la disponibilidad y agregá productos al carrito. El resumen informa las condiciones de pago y entrega. Para confirmar costo y plazo de envío, podés consultar a MYA por WhatsApp antes de comprar." },
  { question: "¿Dónde consultar el modelo y la presentación?", answer: "Cada ficha informa la marca, el modelo, las fotos y las especificaciones disponibles. Si necesitás confirmar una presentación, compatibilidad o condición particular, consultanos antes de elegir. La garantía comercial adicional se informa en la ficha cuando corresponde." },
  { question: "¿Qué medios de pago están disponibles?", answer: "El resumen de compra muestra los medios habilitados y las promociones aplicables. La acreditación de un pago se confirma después de verificarlo; crear un pedido no significa que ya esté pagado." },
  { question: "¿Quién puede asesorarme?", answer: "Agustina te acompaña en cosmética y cuidado capilar. Máximo te ayuda con herramientas, tecnología y consultas de entrega. Encontrás ambos contactos en el sitio." },
  { question: "¿Hacen sorteos en MYA?", answer: "Realizamos sorteos especiales en fechas destacadas a través de nuestra cuenta oficial de Instagram @_myaimportaciones. Seguinos para participar y enterarte de los próximos eventos y novedades." },
];

const categoryLinks = [
  {
    title: "Cosmética Coreana (K-Beauty)",
    desc: "SKIN1004, Medicube, Dr. Althea, Celimax, Anua y sérums originales.",
    href: "/catalogo?category=cosmetica-coreana",
  },
  {
    title: "Cuidado Capilar Premium",
    desc: "Tratamientos Kérastase, mascarilla Shiseido Fino y colágeno Karseell.",
    href: "/catalogo?category=cuidado-capilar",
  },
  {
    title: "Herramientas Profesionales",
    desc: "Herramientas Total y Wadfow: compará modelos y especificaciones.",
    href: "/catalogo?category=herramientas-equipamiento",
  },
  {
    title: "Tecnología & Gadgets",
    desc: "Apple y Samsung: smartphones, tablets y computadoras del catálogo.",
    href: "/catalogo?category=electronica",
  },
];

const brandChips = [
  { name: "Medicube", href: "/catalogo?brand=Medicube", subtitle: "Dispositivos & Skincare" },
  { name: "Apple", href: "/catalogo?brand=Apple", subtitle: "iPhone y tecnología" },
  { name: "Total Tools", href: "/catalogo?brand=Total", subtitle: "Línea industrial" },
  { name: "SKIN1004", href: "/catalogo?brand=SKIN1004", subtitle: "Centella Madagascar" },
  { name: "Samsung", href: "/catalogo?brand=Samsung", subtitle: "Galaxy & accesorios" },
  { name: "Victoria's Secret", href: "/catalogo?brand=Victoria%27s%20Secret", subtitle: "Body mist & splash" },
  { name: "Shiseido Fino", href: "/catalogo?brand=Shiseido", subtitle: "Mascarilla Japón" },
  { name: "Kérastase", href: "/catalogo?brand=K%C3%A9rastase", subtitle: "Nutrición capilar" },
  { name: "Dr. Althea", href: "/catalogo?brand=Dr.%20Althea", subtitle: "345 Relief Cream" },
  { name: "Wadfow", href: "/catalogo?brand=Wadfow", subtitle: "Herramientas de mano" },
  { name: "Karseell", href: "/catalogo?brand=Karseell", subtitle: "Colágeno capilar" },
  { name: "Celimax", href: "/catalogo?brand=Celimax", subtitle: "Noni & antioxidantes" },
  { name: "Anua", href: "/catalogo?brand=Anua", subtitle: "Heartleaf K-Beauty" },
];

export function StoreSeoFaq() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  return (
    <section aria-labelledby="store-seo-heading" className="bg-slate-50 border-t border-slate-200/80 py-12 sm:py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, "\\u003c") }}
      />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Authority Section */}
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50/80 px-3 py-1 text-xs font-semibold text-sky-800">
            <Sparkles className="h-3.5 w-3.5 text-sky-600" />
            <span>Comprá en Argentina</span>
          </div>
          <h2 id="store-seo-heading" className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl lg:text-4xl">
            MYA Importaciones: productos y envíos a toda Argentina
          </h2>
          <p className="mt-3 text-sm sm:text-base leading-relaxed text-slate-600 max-w-3xl">
            Somos Máximo y Agustina. Desde Tandil, provincia de Buenos Aires, seleccionamos e importamos productos originales
            para el cuidado personal, el hogar y el trabajo profesional. Comprá online con precios claros en pesos argentinos,
            atención humana y condiciones de entrega claras.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {categoryLinks.map((cat) => (
              <Link
                key={cat.href}
                href={cat.href}
                className="group rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-sky-300 hover:shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-sky-700 transition">
                    {cat.title}
                  </h3>
                  <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-sky-600 group-hover:translate-x-0.5 transition" />
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                  {cat.desc}
                </p>
              </Link>
            ))}
          </div>

          {/* Brand Discovery Chips */}
          <div className="mt-8 pt-6 border-t border-slate-200/70">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Explorá las marcas del catálogo
            </p>
            <div className="flex flex-wrap gap-2">
              {brandChips.map((brand) => (
                <Link
                  key={brand.name}
                  href={brand.href}
                  className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-sky-300 hover:bg-sky-50/50 hover:text-sky-800 shadow-2xs active:scale-95"
                >
                  <span>{brand.name}</span>
                  <span className="text-[10px] font-normal text-slate-400">· {brand.subtitle}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* FAQs Section */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 lg:p-10 shadow-sm">
          <div className="flex items-center gap-2.5 text-sky-700">
            <HelpCircle className="h-5 w-5" />
            <h3 className="text-base sm:text-lg font-bold text-slate-900">
              Preguntas Frecuentes sobre Compras y Envíos
            </h3>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Todo lo que necesitás saber antes de hacer tu pedido en MYA Importaciones.
          </p>

          <div className="mt-6 divide-y divide-slate-100">
            {faqs.map((faq, index) => (
              <details
                key={faq.question}
                className="group py-4 sm:py-5 first:pt-0 last:pb-0"
                open={index === 0}
              >
                <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-4 py-1 font-semibold text-slate-900 hover:text-sky-700 transition text-sm sm:text-base focus-visible:outline-2 focus-visible:outline-sky-700 rounded-md">
                  <span>{faq.question}</span>
                  <span className="shrink-0 text-slate-400 transition group-open:rotate-180">
                    ▼
                  </span>
                </summary>
                <p className="mt-3 text-xs sm:text-sm leading-relaxed text-slate-600 pl-1 border-l-2 border-sky-100">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
