import Link from "next/link";
import { ChevronDown } from "lucide-react";

const faqs = [
  { question: "¿MYA vende por mayor y por menor con envíos a toda Argentina?", answer: "Sí. Comprá por menor desde una unidad en el catálogo, con precios en pesos. Para comprar por mayor, el mínimo es 5 productos en total o $100.000 en productos; podés combinar marcas y rubros. El catálogo mayorista es público, con precios confirmados visibles y productos pendientes identificados antes del pago. Hacemos envíos a toda Argentina; el envío se cotiza por separado." },
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

  return <section aria-labelledby="store-seo-heading" className="mya-section border-t border-zinc-100 bg-zinc-50"><div className="mya-container">
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(faqJsonLd).replace(/</g,"\\u003c")}}/>
    <h2 id="store-seo-heading" className="mya-section-title">Comprá con información clara</h2>
    <div className="mt-4 grid gap-x-8 lg:grid-cols-2">{faqs.map(faq=><details key={faq.question} className="group border-b border-zinc-200 py-1"><summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-zinc-800 [&::-webkit-details-marker]:hidden">{faq.question}<ChevronDown className="size-4 shrink-0 text-zinc-500 group-open:rotate-180"/></summary><p className="pb-4 text-sm leading-6 text-zinc-600">{faq.answer}</p></details>)}</div>
    <details className="mt-4"><summary className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-xs font-semibold text-sky-800">Conocé MYA y explorá nuestras marcas<ChevronDown className="size-4"/></summary><p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600">Somos Máximo y Agustina. Desde Tandil, provincia de Buenos Aires, seleccionamos productos para el cuidado personal, el hogar y el trabajo. Precios en pesos, atención humana y condiciones de entrega claras.</p><div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">{categoryLinks.map(cat=><Link key={cat.href} href={cat.href} className="inline-flex min-h-11 items-center text-xs font-medium text-sky-800">{cat.title}</Link>)}</div><div className="mt-2 flex flex-wrap gap-2">{brandChips.map(brand=><Link key={brand.name} href={brand.href} className="inline-flex min-h-11 items-center rounded-lg border border-zinc-200 bg-white px-3 text-xs text-zinc-700">{brand.name}</Link>)}</div></details>
  </div></section>;
}
