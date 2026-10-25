import { pageMetadata, publicUrl } from "./seo";
import { WHOLESALE_MINIMUM_LABEL } from "./wholesale-policy";

export interface WholesaleCategory {
  slug: string;
  categorySlug: string;
  brand?: string;
  name: string;
  title: string;
  description: string;
  introduction: string;
  audience: string;
  brands: string[];
  buyingGuide: { title: string; text: string }[];
  checklist: string[];
  faq: { question: string; answer: string }[];
}

export const WHOLESALE_CATEGORIES: WholesaleCategory[] = [
  {
    slug: "cosmetica-coreana", categorySlug: "cosmetica-coreana", name: "Cosmética coreana",
    title: "Cosmética coreana por mayor para revendedores en Argentina",
    description: "Skincare y cosmética coreana por mayor: Medicube, SKIN1004, Anua y más. Desde 5 productos o $100.000. Precios por WhatsApp y envíos a toda Argentina.",
    introduction: "Si vendés skincare, una compra mayorista empieza por elegir fórmulas y presentaciones que tu público pueda reconocer. En MYA recibimos consultas por cantidad de cosmética coreana para tiendas, emprendimientos y revendedores. Revisamos los productos solicitados y te confirmamos disponibilidad, condiciones comerciales y entrega antes de que decidas comprar.",
    audience: "Tiendas de cosmética, perfumerías, emprendimientos de skincare y comercios online.",
    brands: ["SKIN1004", "Medicube", "Anua", "Dr. Althea", "Celimax"],
    buyingGuide: [
      { title: "Armá el surtido por función", text: "Separá limpieza, tónicos, sérums, hidratación y protección solar. Indicar la fórmula y los mililitros evita confundir productos de una misma línea o cotizar tamaños que no necesitás. Podés consultar por productos distintos en un mismo pedido; la composición y las cantidades se confirman en la cotización." },
      { title: "Compará la presentación exacta", text: "Un nombre parecido no garantiza la misma concentración, fórmula o volumen. Compartí el enlace de cada ficha y la cantidad que buscás. Si necesitás datos de empaque, lote o vencimiento para tu comercio, solicitalos al consultar; no se presupone un vencimiento único para toda una marca." },
    ],
    checklist: ["Marca, línea y fórmula", "Volumen o tamaño exacto", "Unidades por presentación", "Ciudad y código postal de entrega"],
    faq: [
      { question: "¿Puedo consultar un pedido con varias marcas de skincare?", answer: "Sí. Enviá la selección con las unidades de cada producto. Revisamos disponibilidad y condiciones del conjunto antes de confirmar la operación." },
      { question: "¿Los precios del catálogo son mayoristas?", answer: "El catálogo público muestra precios minoristas. La propuesta por cantidad se cotiza aparte según la selección y las unidades; no se aplica automáticamente un descuento fijo." },
    ],
  },
  {
    slug: "perfumeria", categorySlug: "perfumeria", name: "Perfumería y fragancias",
    title: "Perfumes árabes y fragancias por mayor en Argentina",
    description: "Perfumes árabes, fragancias y body mists por mayor para revender. Desde 5 productos o $100.000. Precios por WhatsApp y envíos a toda Argentina.",
    introduction: "Para una perfumería o un emprendimiento de fragancias, el nombre de la familia no alcanza para definir una compra. Cotizamos consultas mayoristas de perfumes y body mists del catálogo con la versión, concentración y volumen que necesita tu negocio. Desde Tandil, Máximo y Agustina te ayudan a ordenar la selección y coordinar el destino.",
    audience: "Perfumerías, tiendas de regalos, comercios de belleza y revendedores de fragancias.",
    brands: ["Lattafa", "Victoria's Secret"],
    buyingGuide: [
      { title: "Diferenciá perfume y body mist", text: "Una fragancia Eau de Parfum y un body mist tienen presentaciones y usos distintos. Indicá si buscás EDP, bruma, loción o un set, junto con los mililitros. En familias con varias versiones, como Yara o Khamrah, agregá el nombre completo de la variante para recibir una cotización comparable." },
      { title: "Organizá la reposición por variante", text: "Detallá cuántas unidades querés de cada aroma y qué variantes aceptarías revisar si alguna no está disponible. Las alternativas se consultan con vos: una foto similar o un nombre de línea no autoriza una sustitución. También podés pedir información de empaque y condiciones de transporte antes de confirmar." },
    ],
    checklist: ["Fragancia y versión completa", "Concentración y mililitros", "Unidades por aroma o set", "Destino y necesidad de reposición"],
    faq: [
      { question: "¿Puedo pedir distintos aromas en la misma consulta?", answer: "Sí. Identificá cada aroma y su cantidad. La posibilidad de combinar presentaciones y sus condiciones se confirma para ese pedido." },
      { question: "¿Garantizan un tiempo de duración de cada perfume?", answer: "No damos una duración general para todas las fragancias. Revisá la ficha y consultá la versión concreta; la percepción y duración pueden variar según uso y piel." },
    ],
  },
  {
    slug: "cuidado-capilar", categorySlug: "cuidado-capilar", name: "Cuidado capilar",
    title: "Productos capilares por mayor para comercios y peluquerías",
    description: "Cuidado capilar por mayor para peluquerías y revendedores: Kérastase, Shiseido y más. Desde 5 productos o $100.000. Envíos a toda Argentina.",
    introduction: "Las consultas mayoristas de cuidado capilar requieren distinguir línea, función y tamaño. Te ayudamos a cotizar shampoos, acondicionadores, mascarillas, aceites y kits del catálogo según las necesidades de tu peluquería, tienda o emprendimiento. La propuesta se arma con los productos y cantidades que indiques, sin dar por equivalentes fórmulas distintas.",
    audience: "Peluquerías, tiendas de cuidado personal, perfumerías y emprendimientos capilares.",
    brands: ["Kérastase", "Shiseido", "Fino", "Tsubaki", "Karseell"],
    buyingGuide: [
      { title: "Definí línea y formato", text: "Indicá si necesitás limpieza, acondicionamiento, mascarilla o producto sin enjuague. Dentro de una misma marca pueden convivir líneas para distintos usos, envases de diferente volumen y repuestos. Usá el enlace de la ficha para fijar exactamente qué presentación querés cotizar." },
      { title: "Revisá kits y unidades sueltas", text: "Un kit se compara por su contenido completo y por el tamaño de cada envase. Si tu reposición combina aceites, máscaras y shampoo, detallá las unidades por artículo y si necesitás revisar alguna alternativa. El envío se evalúa según el conjunto y el destino, con costo y plazo informados antes de cerrar la compra." },
    ],
    checklist: ["Marca y línea capilar", "Formato, volumen y versión", "Contenido exacto de cada kit", "Unidades y destino de entrega"],
    faq: [
      { question: "¿Puedo consultar productos para mi peluquería?", answer: "Sí. Indicá las líneas, tamaños y cantidades que necesitás. La cotización se confirma caso por caso con disponibilidad y entrega." },
      { question: "¿Ser revendedor implica ser distribuidor oficial de la marca?", answer: "No. Una compra por cantidad no otorga representación ni condición de distribuidor oficial de las marcas. Consultá cualquier requisito comercial específico antes de comprar." },
    ],
  },
  {
    slug: "herramientas", categorySlug: "herramientas-equipamiento", name: "Herramientas y equipamiento",
    title: "Herramientas Total y Wadfow por mayor para ferreterías",
    description: "Herramientas Total y Wadfow por mayor para ferreterías y revendedores. Desde 5 productos o $100.000. Precios por WhatsApp y envíos a toda Argentina.",
    introduction: "Una cotización para ferretería necesita identificar el modelo exacto de cada herramienta. Recibimos consultas por cantidad de herramientas manuales, equipos eléctricos, herramientas a batería y accesorios del catálogo. Detallamos la selección para que puedas evaluar reposición o surtido sin confundir un equipo suelto con un kit completo.",
    audience: "Ferreterías, comercios de herramientas, talleres y revendedores de equipamiento.",
    brands: ["Total", "Wadfow"],
    buyingGuide: [
      { title: "Usá el modelo como referencia", text: "Mandá el código de modelo o el enlace de la ficha, además del nombre comercial. Revisá potencia, medida, torque, encastre o cantidad de piezas según el tipo de herramienta. Dos taladros o dos juegos de llaves parecidos pueden tener contenido y especificaciones diferentes." },
      { title: "Confirmá baterías y accesorios", text: "En equipos inalámbricos, aclarar si necesitás solo cuerpo o kit evita diferencias importantes de costo. Especificá baterías, capacidad, cargador, maletín y accesorios requeridos; la compatibilidad de una plataforma se verifica por modelo. Para pedidos voluminosos revisamos también peso, bultos y destino al cotizar el transporte." },
    ],
    checklist: ["Modelo o SKU de herramienta", "Solo cuerpo o kit con contenido", "Medidas y cantidades por modelo", "Localidad, código postal y entrega"],
    faq: [
      { question: "¿Puedo pedir una cotización para reponer una ferretería?", answer: "Sí. Enviá un listado por modelo con sus cantidades. Revisamos el conjunto y te informamos disponibilidad y condiciones de compra." },
      { question: "¿Todas las herramientas a batería incluyen cargador?", answer: "No. Hay equipos sueltos y kits con contenidos distintos. Antes de confirmar verificamos la versión solicitada y lo que incluye la ficha." },
    ],
  },
  {
    slug: "electronica", categorySlug: "electronica", name: "Electrónica y tecnología",
    title: "Electrónica por mayor: cotizaciones para comercios en Argentina",
    description: "Electrónica Apple, Samsung y accesorios por mayor para revendedores. Desde 5 productos o $100.000. Cotizá por WhatsApp. Envíos a toda Argentina.",
    introduction: "Si tu comercio necesita cotizar tecnología por cantidad, empezamos por la configuración exacta. Recibimos consultas de equipos y accesorios del catálogo con modelo, capacidad, color y condición definidos. La disponibilidad y las condiciones de la propuesta se confirman antes de cualquier pago; una consulta mayorista no implica stock físico inmediato.",
    audience: "Comercios de tecnología, tiendas online y revendedores de equipos y accesorios.",
    brands: ["Apple", "Samsung", "JBL"],
    buyingGuide: [
      { title: "Especificá cada configuración", text: "En teléfonos y tablets, agregá almacenamiento, color y conectividad; en computadoras, tamaño, chip, memoria y capacidad. Usá el enlace y la variante del catálogo como referencia. Esa precisión permite comparar la misma versión y evita cotizar una capacidad o generación distinta." },
      { title: "Consultá condición y respaldo", text: "Pedí la condición del equipo, el contenido de caja y las condiciones de garantía aplicables a esa propuesta. Un accesorio o cargador no se considera incluido si no está informado para el modelo. El costo de traslado, el destino y el plazo de la operación se revisan junto con la selección, sin promesas generales para todo el rubro." },
    ],
    checklist: ["Modelo y generación", "Capacidad, memoria, color y conectividad", "Condición y accesorios requeridos", "Unidades y destino de entrega"],
    faq: [
      { question: "¿Puedo consultar varias configuraciones de un mismo modelo?", answer: "Sí. Separá las cantidades por configuración y color. Confirmamos disponibilidad y condiciones de cada opción en la cotización." },
      { question: "¿La consulta reserva unidades o fija el precio?", answer: "No. La consulta permite preparar una propuesta. Precio, disponibilidad, forma de pago y plazo se confirman antes de registrar una operación." },
    ],
  },
  {
    slug: "medicube", categorySlug: "cosmetica-coreana", brand: "Medicube", name: "Medicube",
    title: "Medicube por mayor en Argentina para revendedores",
    description: "Medicube por mayor para tu emprendimiento de skincare. Desde 5 productos o $100.000, combinables con otras marcas. Precios por WhatsApp. Envíos a toda Argentina.",
    introduction: "¿Querés empezar a vender Medicube o reponer tu tienda de skincare coreano? Elegí los productos del catálogo y contanos cuántas unidades necesitás. Máximo o Agustina te pasan los precios mayoristas por WhatsApp y coordinan el envío a cualquier provincia de Argentina. Podés combinar Medicube con otras marcas y rubros para alcanzar el mínimo.",
    audience: "Emprendimientos de skincare, tiendas de cosmética, perfumerías y revendedores de K-Beauty.",
    brands: ["Medicube", "SKIN1004", "Anua", "Dr. Althea", "Celimax"],
    buyingGuide: [
      { title: "Tu primer pedido para revender skincare", text: "Podés empezar con 5 productos en total, iguales o combinados, o con $100.000 en productos. Si todavía no definiste el surtido, contanos por WhatsApp qué tipo de tienda tenés y qué productos buscás. Te ayudamos a preparar una selección con sus precios y disponibilidad, sin exigir que completes un pedido para consultar." },
      { title: "Elegí la versión exacta de Medicube", text: "Para cotizar cremas, sérums, pads o sets, enviá el enlace o nombre completo de la ficha y la cantidad. Revisá volumen, fórmula y contenido del pack: las presentaciones de una misma línea pueden ser distintas. Si buscás un producto que viste en redes, mandanos la referencia para identificarlo antes de armar la propuesta." },
    ],
    checklist: ["Nombre o enlace de cada producto Medicube", "Fórmula, volumen o contenido del pack", "Cantidad por producto, con otras marcas si querés", "Ciudad y código postal para el envío"],
    faq: [
      { question: "¿Cómo consigo los precios mayoristas de Medicube?", answer: "Escribile a Máximo o Agustina por WhatsApp con los productos y cantidades que te interesan. Los precios mayoristas se envían de forma personalizada; los precios del catálogo público son minoristas." },
      { question: "¿Puedo empezar a revender Medicube con 5 productos distintos?", answer: "Sí. El mínimo es 5 unidades en total o $100.000 en productos. Podés combinar distintos productos de Medicube, otras marcas de cosmética y otros rubros. Basta con cumplir una de las dos condiciones; el envío se cotiza aparte." },
      { question: "¿Venden solo Medicube por mayor?", answer: "También cotizamos por mayor el resto del catálogo: cosmética coreana, perfumería, cuidado capilar, electrónica, herramientas y equipamiento. Podés reunir tu selección en una misma consulta." },
    ],
  },
];

export const WHOLESALE_PATHS = ["/mayorista", ...WHOLESALE_CATEGORIES.map(category => `/mayorista/${category.slug}`)];
export const findWholesaleCategory = (slug: string) => WHOLESALE_CATEGORIES.find(category => category.slug === slug);
export function wholesaleMetadata(category?: WholesaleCategory) {
  return pageMetadata({
    title: category?.title || "Venta mayorista en Argentina: cosmética, perfumes y electrónica",
    description: category?.description || "Todo el catálogo por mayor: cosmética, perfumes, capilares, electrónica y herramientas. Desde 5 productos o $100.000. WhatsApp y envíos a toda Argentina.",
    path: category ? `/mayorista/${category.slug}` : "/mayorista",
    image: `/compartir?${new URLSearchParams({
      tipo: "categoria",
      cat: category ? `${category.name} por mayor` : "Venta mayorista en Argentina",
      desc: "Desde 5 productos o $100.000, combinando marcas y rubros. Precios con Máximo o Agustina por WhatsApp. Envíos a toda Argentina.",
    })}`,
  });
}

export function wholesaleServiceData(category?: WholesaleCategory) {
  return {
    "@context": "https://schema.org", "@type": "Service",
    name: category?.title || "Cotizaciones mayoristas de MYA Importaciones",
    serviceType: "Venta mayorista por cotización",
    description: category?.description || `Todo el catálogo por mayor para comercios y revendedores. Mínimo: ${WHOLESALE_MINIMUM_LABEL}. Precios por WhatsApp. Envíos a toda Argentina.`,
    url: publicUrl(category ? `/mayorista/${category.slug}` : "/mayorista"),
    provider: { "@id": publicUrl("/#organization") },
    areaServed: { "@type": "Country", name: "Argentina" },
    audience: { "@type": "BusinessAudience", audienceType: "Comercios y revendedores" },
  };
}
