import Link from "next/link";
import { ArrowRight, HelpCircle, ShieldCheck, Truck, Sparkles, MapPin, CreditCard } from "lucide-react";
import { siteConfig } from "@/lib/site";

const faqs = [
  {
    question: "¿Cómo comprar en MYA Importaciones y cómo son los envíos a todo el país?",
    answer:
      "Podés explorar nuestro catálogo online, sumar productos al carrito y coordinar tu pedido de forma directa con nosotros por WhatsApp. Despachamos a toda la Argentina mediante Correo Argentino y transportes expresos desde Tandil. Cada envío cuenta con código de seguimiento en tiempo real para que sepas exactamente cuándo llega a tu domicilio o sucursal.",
  },
  {
    question: "¿Los productos de cosmética coreana, capilares y herramientas son 100% originales?",
    answer:
      "Sí, garantizamos autenticidad absoluta en cada artículo. Trabajamos con importación directa de marcas líderes globales: K-Beauty coreano original (SKIN1004, Medicube, Dr. Althea, Celimax, Anua, Beauty of Joseon), cuidado capilar de alta gama (Kérastase, Shiseido Fino, Karseell Collagen), herramientas profesionales Total Tools y Wadfow, y tecnología con garantía oficial.",
  },
  {
    question: "¿Cuáles son los medios de pago disponibles?",
    answer:
      "Aceptamos transferencia bancaria inmediata (con descuentos y promociones especiales), Mercado Pago (dinero en cuenta y tarjetas de débito/crédito) y efectivo para retiros locales en Tandil. La confirmación es instantánea y emitimos comprobante para tu total tranquilidad.",
  },
  {
    question: "¿Cómo es la atención personalizada de Máximo y Agustina?",
    answer:
      "En MYA Importaciones no hablás con un bot genérico: te atendemos directamente nosotros desde Tandil. Agustina te asesora en rutinas de skincare coreano, tipo de piel, cuidado capilar y fragancias; Máximo te acompaña en herramientas industriales, especificaciones técnicas de tecnología y logística de envíos.",
  },
  {
    question: "¿Se puede retirar personalmente en Tandil?",
    answer:
      "¡Por supuesto! Si estás en Tandil o la zona, podés seleccionar la opción de retiro al comunicarte con nosotros y pasar a retirar tu pedido sin costo de envío coordinando día y horario por WhatsApp.",
  },
  {
    question: "¿Cómo participar de los sorteos oficiales de MYA?",
    answer:
      "Realizamos sorteos en vivo periódicamente para premiar a nuestra comunidad. Podés seguir la transmisión y verificar ganadores en tiempo real en nuestra sección oficial de Sorteo (/sorteo) y en nuestro Instagram @_myaimportaciones con total transparencia auditada.",
  },
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
    desc: "Línea completa Total Tools y Wadfow a batería, eléctricas e industriales.",
    href: "/catalogo?category=herramientas-equipamiento",
  },
  {
    title: "Tecnología & Gadgets",
    desc: "Apple, Samsung, tablets, smartwatches y accesorios garantizados.",
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
            <span>Tienda Oficial en Argentina</span>
          </div>
          <h2 id="store-seo-heading" className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl lg:text-4xl">
            MYA Importaciones: Calidad, Autenticidad y Envíos a todo el País
          </h2>
          <p className="mt-3 text-sm sm:text-base leading-relaxed text-slate-600 max-w-3xl">
            Somos Máximo y Agustina. Desde Tandil, provincia de Buenos Aires, seleccionamos e importamos productos originales
            para el cuidado personal, el hogar y el trabajo profesional. Comprá online con precios claros en pesos argentinos,
            atención humana y envíos protegidos a cada rincón del país.
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
              Marcas destacadas con stock y garantía oficial
            </p>
            <div className="flex flex-wrap gap-2">
              {brandChips.map((brand) => (
                <Link
                  key={brand.name}
                  href={brand.href}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-sky-300 hover:bg-sky-50/50 hover:text-sky-800 shadow-2xs"
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
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-slate-900 hover:text-sky-700 transition text-sm sm:text-base focus-visible:outline-2 focus-visible:outline-sky-700 rounded-md">
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
