import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Boxes, Layers3, Truck } from "lucide-react";
import { WHOLESALE_CATEGORIES, wholesaleServiceData, type WholesaleCategory } from "@/lib/wholesale-content";
import { getWholesaleSelection } from "@/lib/wholesale-catalog";
import { WHOLESALE_MINIMUM_DETAILS } from "@/lib/wholesale-policy";
import { breadcrumbData, jsonLd } from "@/lib/seo";
import { WholesaleContactLinks } from "./wholesale-contact";
import { WholesaleInquiry } from "./wholesale-inquiry";
import { WholesaleProducts } from "./wholesale-products";
import { WholesaleGuideLinks } from "./wholesale-guide-links";
import styles from "./wholesale-experience.module.css";

const generalFaq = [
  { question: "¿Qué productos venden por mayor?", answer: "Podés consultar por mayor todos los rubros del catálogo MYA: cosmética coreana y skincare, perfumería, cuidado capilar, electrónica y tecnología, herramientas y equipamiento. Medicube es una de las marcas disponibles para cotizar, junto con las demás marcas publicadas. Podés combinar productos entre rubros." },
  { question: "¿MYA vende por mayor y por menor?", answer: "Sí. Podés comprar por menor en el catálogo público y consultar propuestas por cantidad para comercios y revendedores en esta sección. La cotización mayorista se confirma con tu selección de productos y destino." },
  { question: "¿Cuál es la compra mínima mayorista?", answer: WHOLESALE_MINIMUM_DETAILS },
  { question: "¿Puedo combinar productos para llegar a las 5 unidades?", answer: "Sí. Podés pedir 5 unidades del mismo producto o combinar distintos productos, marcas y rubros. También podés comprar menos de 5 unidades si el importe de los productos alcanza $100.000. Basta con cumplir una de las dos condiciones; el importe final se confirma en la cotización mayorista." },
  { question: "¿Cómo pido los precios mayoristas?", answer: "Escribile a Máximo o Agustina por WhatsApp con los productos y las cantidades que te interesan. Los precios mayoristas se cotizan por privado. El catálogo público muestra precios minoristas; podés usar sus fichas para elegir tu selección." },
  { question: "¿Hacen envíos mayoristas a toda Argentina?", answer: "Sí, hacemos envíos a toda Argentina, tanto por mayor como por menor. Indicanos ciudad y código postal para cotizar el costo y plazo de entrega junto con tu pedido. El envío se calcula aparte del mínimo mayorista." },
];

export async function WholesaleLanding({ category }: { category?: WholesaleCategory }) {
  const departments = WHOLESALE_CATEGORIES.filter(item => !item.brand);
  const crumbs = [{ name: "Inicio", path: "/" }, { name: "Mayoristas", path: "/mayorista" }, ...(category ? [{ name: category.name, path: `/mayorista/${category.slug}` }] : [])];
  const faq = category ? [...category.faq, ...generalFaq.slice(2)] : generalFaq;
  const catalogPath = category?.brand ? `/catalogo?brand=${encodeURIComponent(category.brand)}` : category ? `/catalogo?category=${category.categorySlug}` : "/catalogo";
  const [selections, medicube] = await Promise.all([
    category ? getWholesaleSelection(category.categorySlug, category.brand).then(products => products.slice(0, 5).map(product => ({ label: product.brand || category.name, title: product.title, image: product.imageUrl, href: catalogPath })))
      : Promise.all(departments.map(async department => {
        const products = await getWholesaleSelection(department.categorySlug);
        const product = products.find(item => Boolean(item.imageUrl));
        return { label: department.name, title: product?.title || department.name, image: product?.imageUrl, href: `/catalogo?category=${department.categorySlug}` };
      })),
    !category || category.slug === "cosmetica-coreana" ? getWholesaleSelection("cosmetica-coreana", "Medicube") : Promise.resolve([]),
  ]);
  const visuals = selections.filter(item => Boolean(item.image));
  const medicubeImage = medicube.find(product => Boolean(product.imageUrl));

  return <div className={styles.page}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(wholesaleServiceData(category)) }} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbData(crumbs)) }} />
    <div className={styles.wrap}>
      <nav aria-label="Ubicación mayorista" className={styles.crumbs}>{crumbs.map((crumb, index) => <span key={crumb.path}>{index > 0 && <span aria-hidden="true" className="mr-2 text-zinc-300">/</span>}<Link href={crumb.path} aria-current={index === crumbs.length - 1 ? "page" : undefined}>{crumb.name}</Link></span>)}</nav>

      <header className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>MYA Importaciones · Mayoristas</p>
          <h1 className={styles.title}>{category?.title || <>Productos importados por mayor.<span>Para tu negocio.</span></>}</h1>
          <p className={styles.intro}>{category?.introduction || "Cosmética, perfumes, cuidado capilar, electrónica y herramientas. Armá tu selección, combiná rubros y recibí una cotización con atención de Máximo y Agustina."}</p>
          <p className={styles.minimum}><strong>5 productos o $100.000</strong><span>Podés combinar · Envío aparte</span></p>
          <WholesaleContactLinks category={category?.name} />
          <p className={styles.contactNote}>Precios mayoristas por WhatsApp. Consultanos aunque todavía no tengas tu selección lista.</p>
          <div className={styles.heroLinks}><a href="#rubros">{category ? "Cómo preparar tu pedido" : "Explorar rubros"}<ArrowRight size={14} /></a><a href="#cotizar">Armar una consulta detallada<ArrowUpRight size={14} /></a></div>
        </div>
        {visuals.length ? <div className={styles.visuals} aria-label={category ? `Selección del catálogo de ${category.name}` : "Explorá los rubros mayoristas"}>
          {visuals.map((visual, index) => <Link key={visual.href} href={visual.href} className={styles.visual}>
            <span className={styles.visualLabel}><span>{visual.label}</span><ArrowUpRight size={13} className="shrink-0" /></span>
            <Image src={visual.image!} alt={visual.title} fill sizes="(max-width: 767px) 45vw, 22vw" loading={index === 0 ? "eager" : "lazy"} className="object-contain" />
          </Link>)}
        </div> : <div className={styles.visualFallback}><p>Tu selección.<br />Nuestra atención personal.</p><Link href={catalogPath} className={styles.featureLink}>Explorar el catálogo <ArrowRight size={16} /></Link></div>}
      </header>

      <div className={styles.strip}>
        <div className={styles.stripItem}><Boxes /><div><strong>Un mínimo, muchas posibilidades</strong><p>5 unidades en total o $100.000 en productos.</p></div></div>
        <div className={styles.stripItem}><Layers3 /><div><strong>Tu pedido, a tu medida</strong><p>Combiná productos, marcas y rubros.</p></div></div>
        <div className={styles.stripItem}><Truck /><div><strong>Envíos a toda Argentina</strong><p>Desde Tandil. Cotizamos según tu destino.</p></div></div>
      </div>

      <section id="rubros" className={`${styles.section} scroll-mt-32`}>
        {category ? <>
          <div className={styles.guide}>
            <div><p className={styles.eyebrow}>Prepará tu selección</p><h2 className={`${styles.heading} mt-4`}>Cómo comprar {category.name.toLowerCase()} por mayor</h2>{category.buyingGuide.map(item => <article key={item.title}><h3>{item.title}</h3><p>{item.text}</p></article>)}</div>
            <aside className={styles.checklist}><h2>Qué incluir en la consulta</h2><ul className="mt-3">{category.checklist.map(item => <li key={item}>{item}</li>)}</ul><p>Para {category.audience.charAt(0).toLowerCase() + category.audience.slice(1)}</p></aside>
          </div>
          <nav aria-label="Marcas del catálogo" className={styles.brands}>{category.brands.map(brand => <Link key={brand} href={`/catalogo?brand=${encodeURIComponent(brand)}`}>{brand}<ArrowUpRight size={13} className="ml-3" /></Link>)}</nav>
        </> : <>
          <div className={styles.sectionHead}>
            <div>
              <p className={styles.eyebrow}>Todo MYA, también por mayor</p>
              <h2 className="mt-3">Elegí la categoría en la tienda</h2>
            </div>
            <p>Todo el catálogo de la tienda está disponible para compras y cotizaciones mayoristas. Mínimo de 5 unidades o $100.000 combinables entre cualquier rubro.</p>
          </div>
          <div className={styles.directory}>
            {departments.map((item, index) => {
              const targetUrl = item.brand ? `/catalogo?brand=${encodeURIComponent(item.brand)}` : `/catalogo?category=${item.categorySlug}`;
              return (
                <Link key={item.slug} href={targetUrl} className={styles.category} title={`Ver ${item.name} en la tienda`}>
                  <span className={styles.categoryNumber}>0{index + 1}</span>
                  <div>
                    <h3>{item.name}</h3>
                    <p>{item.brands.join(" · ")}</p>
                    <span className="mt-2 inline-flex items-center text-xs font-semibold text-sky-700">
                      Ver catálogo completo en la tienda &rarr;
                    </span>
                  </div>
                  <span className={styles.categoryArrow}><ArrowUpRight size={17} /></span>
                </Link>
              );
            })}
          </div>
        </>}
      </section>

      {category && <div className={styles.section}><WholesaleProducts category={category} /></div>}

      {(!category || category.slug === "cosmetica-coreana") && <section className={styles.feature}>
        <div>
          <p className={styles.eyebrow}>Skincare para revendedores</p>
          <h2>Medicube, también por mayor.</h2>
          <p>Prepará tu primer pedido o reponé tu tienda de skincare coreano. Todo el catálogo de Medicube está disponible para combinar con cualquier otro rubro.</p>
          <Link href="/catalogo?brand=Medicube" className={styles.featureLink}>
            Ver todos los productos Medicube en la tienda <ArrowRight size={16} />
          </Link>
        </div>
        {medicubeImage && <div className={styles.featureImage}><Image src={medicubeImage.imageUrl} alt={medicubeImage.title} fill sizes="(max-width: 767px) 80vw, 25vw" /></div>}
      </section>}

      <section className={styles.section}>
        <p className={styles.eyebrow}>Atención de principio a fin</p><h2 className={`${styles.heading} mt-3`}>De tu selección a la propuesta.</h2>
        <ol className={styles.steps}>{[
          ["Elegí tus productos", "Usá el catálogo como referencia. Indicá modelo, presentación y unidades, combinando los rubros que necesites."],
          ["Conversemos por WhatsApp", "Máximo o Agustina te pasan los precios mayoristas y confirman disponibilidad, pago y entrega."],
          ["Confirmá tu pedido", "Revisá la propuesta completa y el costo del envío a tu ciudad antes de comprar y pagar."],
        ].map(([title, text], index) => <li className={styles.step} key={title}><span className={styles.stepNumber}>0{index + 1}</span><h3>{title}</h3><p>{text}</p></li>)}</ol>
      </section>

      <div className={styles.section}><WholesaleInquiry category={category?.name} /></div>

      <section className={`${styles.section} ${styles.faq}`}>
        <div className={styles.faqIntro}><p className={styles.eyebrow}>Antes de empezar</p><h2 className={`${styles.heading} mt-3`}>Lo que necesitás saber.</h2><p>Mínimos, precios y envíos. Y si te queda alguna duda, estamos del otro lado de WhatsApp.</p></div>
        <div className={styles.questions}>{faq.map(item => <details key={item.question}><summary>{item.question}</summary><p>{item.answer}</p></details>)}</div>
      </section>

      {category && <section className={styles.section}><h2 className={styles.heading}>Más categorías de la tienda para revender.</h2><nav aria-label="Más opciones mayoristas" className={styles.brands}>{WHOLESALE_CATEGORIES.filter(item => item.slug !== category.slug).map(item => <Link key={item.slug} href={item.brand ? `/catalogo?brand=${encodeURIComponent(item.brand)}` : `/catalogo?category=${item.categorySlug}`}>{item.name}<ArrowUpRight size={13} className="ml-3" /></Link>)}</nav></section>}
      <WholesaleGuideLinks currentSlug={category?.slug} />
      <p className={styles.footnote}>¿Buscás una compra individual? <Link href={catalogPath}>Explorá el catálogo de la tienda</Link>, con precios minoristas. También podés revisar las <Link href="/condiciones">condiciones de compra y entrega</Link>.</p>
    </div>
  </div>;
}
