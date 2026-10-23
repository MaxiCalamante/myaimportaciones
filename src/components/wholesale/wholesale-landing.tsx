import Link from "next/link";
import { ArrowRight, Boxes, MapPin, MessageCircle } from "lucide-react";
import { WHOLESALE_CATEGORIES, wholesaleServiceData, type WholesaleCategory } from "@/lib/wholesale-content";
import { breadcrumbData, jsonLd } from "@/lib/seo";
import { WholesaleInquiry } from "./wholesale-inquiry";
import { WHOLESALE_MINIMUM_LABEL, WHOLESALE_MINIMUM_DETAILS } from "@/lib/wholesale-policy";

export function WholesalePromo() {
  return <section aria-labelledby="wholesale-promo-title" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    <div className="grid gap-5 rounded-3xl border border-sky-200 bg-sky-50 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
      <div><p className="text-xs font-bold uppercase tracking-widest text-sky-800">Comercios y revendedores</p><h2 id="wholesale-promo-title" className="mt-2 text-2xl font-bold text-zinc-950">¿Buscás productos importados por mayor?</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-700">Cotizá cosmética coreana, perfumería, cuidado capilar, herramientas y electrónica por cantidad. Te atendemos desde Tandil para coordinar tu propuesta y entrega.</p></div>
      <div><p className="mb-3 max-w-sm text-sm font-semibold leading-6 text-sky-950">Desde {WHOLESALE_MINIMUM_LABEL}. Podés combinar productos.</p><Link href="/mayorista" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-sky-700 px-5 py-3 text-sm font-bold text-white hover:bg-sky-800">Conocer la venta mayorista <ArrowRight className="size-4" /></Link></div>
    </div>
  </section>;
}

const generalFaq = [
  { question: "¿MYA vende por mayor y por menor?", answer: "Sí. Podés comprar por menor en el catálogo público y consultar propuestas por cantidad para comercios y revendedores en esta sección. La cotización mayorista se confirma con tu selección de productos y destino." },
  { question: "¿Cuál es la compra mínima mayorista?", answer: WHOLESALE_MINIMUM_DETAILS },
  { question: "¿Puedo combinar productos para llegar a las 5 unidades?", answer: "Sí. Podés pedir 5 unidades del mismo producto o combinar distintos productos; por ejemplo, 2 unidades de uno y 3 de otro. También podés comprar menos de 5 unidades si el importe de los productos alcanza $100.000. El importe final se confirma en la cotización mayorista." },
  { question: "¿Los precios públicos ya son mayoristas?", answer: "Los precios del catálogo son minoristas. La propuesta por volumen se cotiza aparte; no hay un descuento único garantizado para todos los productos." },
  { question: "¿Puedo consultar desde otra ciudad de Argentina?", answer: "Sí. Indicanos ciudad y código postal para revisar la entrega. El costo y el plazo de envío se confirman junto con la propuesta; consultar no asegura despacho inmediato ni envío gratuito." },
  { question: "¿Cómo elijo el surtido para mi comercio?", answer: "Podés compartir enlaces del catálogo, marcas, modelos y cantidades. Te ayudamos a identificar las presentaciones y verificar opciones; cualquier alternativa se consulta antes de reemplazar un artículo." },
];

export function WholesaleLanding({ category }: { category?: WholesaleCategory }) {
  const crumbs = [{ name: "Inicio", path: "/" }, { name: "Venta mayorista", path: "/mayorista" }, ...(category ? [{ name: category.name, path: `/mayorista/${category.slug}` }] : [])];
  const faq = category ? [...category.faq, ...generalFaq.slice(1, 5)] : generalFaq;
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(wholesaleServiceData(category)) }} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbData(crumbs)) }} />
    <div className="mx-auto max-w-7xl space-y-10 px-4 py-7 sm:px-6 sm:py-10 lg:px-8">
      <nav aria-label="Ubicación mayorista" className="flex flex-wrap gap-2 text-xs text-zinc-600">{crumbs.map((crumb, index) => <span key={crumb.path}>{index > 0 && <span aria-hidden="true" className="mr-2">/</span>}<Link href={crumb.path} className="underline underline-offset-2">{crumb.name}</Link></span>)}</nav>
      <header className="rounded-3xl bg-zinc-950 p-6 text-white sm:p-10 lg:p-12">
        <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-sky-300"><Boxes className="size-4" /> MYA Importaciones · Mayorista</p>
        <h1 className="mt-5 max-w-4xl text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl">{category?.title || "Productos importados por mayor para comercios y revendedores"}</h1>
        <p className="mt-5 max-w-3xl text-sm leading-7 text-zinc-200 sm:text-base">{category?.introduction || "Hacé crecer el surtido de tu comercio con una propuesta por cantidad. En MYA Importaciones recibimos consultas mayoristas de cosmética coreana, perfumes, cuidado capilar, herramientas y electrónica. Máximo y Agustina te atienden desde Tandil para definir productos, unidades y destino, con las condiciones de la operación confirmadas antes de comprar."}</p>
        <div className="mt-6 max-w-3xl rounded-2xl border border-sky-300/30 bg-sky-400/10 p-4"><h2 className="text-base font-bold text-sky-200">Mínimo mayorista: {WHOLESALE_MINIMUM_LABEL}</h2><p className="mt-2 text-sm leading-6 text-zinc-200">{WHOLESALE_MINIMUM_DETAILS}</p><p className="mt-2 text-xs leading-5 text-zinc-300">Ejemplos: 2 unidades de un producto + 3 de otro, o un pedido de menos unidades que alcance $100.000. El precio mayorista se confirma en tu cotización.</p></div>
        <div className="mt-7 flex flex-wrap gap-3"><a href="#cotizar" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-sky-500 px-5 py-3 text-sm font-bold text-zinc-950 hover:bg-sky-400"><MessageCircle className="size-4" /> Solicitar cotización mayorista</a><Link href={category ? `/catalogo?category=${category.categorySlug}` : "/catalogo"} className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/30 px-5 py-3 text-sm font-semibold hover:bg-white/10">Ver productos y precios minoristas</Link></div>
        <p className="mt-5 inline-flex items-center gap-2 text-xs text-zinc-300"><MapPin className="size-4" /> Desde Tandil · Consultas de toda Argentina</p>
      </header>

      {category ? <section className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6"><h2 className="text-2xl font-bold text-zinc-950">Cómo preparar tu pedido de {category.name.toLowerCase()}</h2>{category.buyingGuide.map(item => <article key={item.title}><h3 className="text-lg font-semibold text-zinc-950">{item.title}</h3><p className="mt-2 text-sm leading-7 text-zinc-700">{item.text}</p></article>)}</div>
        <aside className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6"><h2 className="text-lg font-bold text-zinc-950">Qué incluir en la consulta</h2><ul className="mt-4 list-disc space-y-3 pl-5 text-sm leading-6 text-zinc-700">{category.checklist.map(item => <li key={item}>{item}</li>)}</ul><p className="mt-5 text-xs leading-6 text-zinc-600">Para: {category.audience}</p></aside>
        <div className="lg:col-span-2"><h2 className="text-xl font-bold text-zinc-950">Explorá las marcas del catálogo</h2><p className="mt-2 text-sm text-zinc-600">Usá las fichas como referencia para indicar modelos y presentaciones.</p><div className="mt-4 flex flex-wrap gap-3">{category.brands.map(brand => <Link key={brand} href={`/catalogo?brand=${encodeURIComponent(brand)}`} className="inline-flex min-h-11 items-center rounded-xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-sky-800 hover:border-sky-400">{brand}</Link>)}</div></div>
      </section> : <section><h2 className="text-2xl font-bold text-zinc-950">Elegí el rubro para tu negocio</h2><div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{WHOLESALE_CATEGORIES.map(item => <Link key={item.slug} href={`/mayorista/${item.slug}`} className="group rounded-2xl border border-zinc-200 bg-white p-5 hover:border-sky-500"><h3 className="text-lg font-bold text-zinc-950">{item.name} por mayor</h3><p className="mt-3 text-sm leading-6 text-zinc-600">{item.audience}</p><span className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-sky-800">Ver cómo cotizar <ArrowRight className="size-4" /></span></Link>)}</div></section>}

      <section className="rounded-3xl border border-zinc-200 bg-white p-5 sm:p-8"><h2 className="text-2xl font-bold text-zinc-950">De la selección a la propuesta</h2><ol className="mt-5 grid list-inside list-decimal gap-5 text-sm leading-6 text-zinc-700 md:grid-cols-3"><li><strong className="text-zinc-950">Elegí productos.</strong> Indicá modelo o presentación y unidades; podés usar enlaces del catálogo.</li><li><strong className="text-zinc-950">Consultá la cotización.</strong> Revisamos disponibilidad, cantidad, pago y costo de entrega para tu destino.</li><li><strong className="text-zinc-950">Confirmá las condiciones.</strong> Evaluá la propuesta completa antes de registrar la compra y pagar.</li></ol></section>
      <WholesaleInquiry category={category?.name} />
      <section><h2 className="text-2xl font-bold text-zinc-950">Preguntas sobre compras por mayor</h2><div className="mt-5 divide-y divide-zinc-200 rounded-2xl border border-zinc-200 bg-white px-5">{faq.map(item => <details key={item.question} className="py-4"><summary className="cursor-pointer text-sm font-semibold leading-6 text-zinc-950">{item.question}</summary><p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-700">{item.answer}</p></details>)}</div></section>
      {category && <section><h2 className="text-xl font-bold text-zinc-950">Otros rubros mayoristas</h2><div className="mt-4 flex flex-wrap gap-3">{WHOLESALE_CATEGORIES.filter(item => item.slug !== category.slug).map(item => <Link key={item.slug} href={`/mayorista/${item.slug}`} className="inline-flex min-h-11 items-center rounded-xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-sky-800">{item.name}</Link>)}</div></section>}
      <p className="text-sm leading-6 text-zinc-600">Si buscás una compra individual, <Link href="/catalogo" className="font-semibold text-sky-800 underline">el catálogo minorista sigue disponible</Link>. Consultá también las <Link href="/condiciones" className="text-sky-800 underline">condiciones de compra y entrega</Link>.</p>
    </div>
  </>;
}
