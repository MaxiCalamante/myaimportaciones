/** Editorial copy for existing canonical catalog pages; never creates product or stock claims. */
export interface RetailContent {
  title: string;
  description: string;
  introduction: string;
  heading: string;
  guide: string;
  wholesalePath: string;
}

const categories: Record<string, RetailContent> = {
  "cosmetica-coreana": {
    title: "Cosmética coreana y skincare en Argentina",
    description: "Comprá cosmética coreana y skincare: Medicube, SKIN1004, Anua y más. Precios minoristas en pesos y envíos a toda Argentina. También venta por mayor.",
    introduction: "Elegí cosmética coreana para tu rutina de skincare, con precios minoristas en pesos y envíos a toda Argentina. Compará las marcas, fórmulas y presentaciones del catálogo antes de comprar.",
    heading: "Cómo elegir tu skincare coreano",
    guide: "Revisá la función del producto, sus ingredientes informados y el tamaño del envase. Para comparar limpiadores, tónicos, sérums, cremas o protectores solares, usá la ficha de cada presentación: dos productos de la misma línea pueden tener fórmulas y volúmenes diferentes. Si tenés dudas sobre cuál estás viendo, compartinos el enlace por WhatsApp. Podés comprar una unidad para uso personal o consultar un pedido por mayor para tu emprendimiento.",
    wholesalePath: "/mayorista/cosmetica-coreana",
  },
  perfumeria: {
    title: "Perfumes árabes y fragancias en Argentina",
    description: "Comprá perfumes, fragancias y body mists con precios minoristas en pesos. Envíos a toda Argentina y atención por WhatsApp. Consultá también por mayor.",
    introduction: "Encontrá perfumes, fragancias y body mists del catálogo MYA para comprar por menor, con precios en pesos y envíos a toda Argentina.",
    heading: "Compará la fragancia y su presentación",
    guide: "Revisá el nombre completo, la concentración y los mililitros de cada fragancia. Un perfume, una bruma corporal y una loción tienen presentaciones diferentes; en un set, verificá el contenido de cada envase. Si buscás reponer un aroma que ya tenés, enviá el enlace de la ficha para confirmar la versión antes de comprar. Para tu perfumería o emprendimiento, también podés combinar aromas y consultar sus precios mayoristas por WhatsApp.",
    wholesalePath: "/mayorista/perfumeria",
  },
  "cuidado-capilar": {
    title: "Productos de cuidado capilar en Argentina",
    description: "Comprá cuidado capilar, mascarillas, shampoos y tratamientos del catálogo MYA. Precios en pesos, envíos a toda Argentina y consultas por mayor.",
    introduction: "Explorá productos de cuidado capilar para comprar por menor o cotizar para tu peluquería. Consultá las líneas y tamaños publicados, con envíos a toda Argentina.",
    heading: "Elegí la línea capilar y el tamaño que necesitás",
    guide: "Compará la función de cada shampoo, acondicionador, mascarilla o aceite con la información de su ficha. Revisá los mililitros o gramos y diferenciá envases, repuestos y kits completos. Podés pedir asesoramiento a Máximo o Agustina para identificar una presentación y conocer las condiciones de entrega. Si comprás para una peluquería o para revender, mandanos las cantidades para recibir una cotización mayorista.",
    wholesalePath: "/mayorista/cuidado-capilar",
  },
  electronica: {
    title: "Electrónica y tecnología en Argentina: Apple, Samsung y más",
    description: "Compará electrónica y tecnología del catálogo MYA. Precios minoristas en pesos, configuraciones por modelo y envíos a toda Argentina. También por mayor.",
    introduction: "Comprá electrónica y tecnología con precios en pesos y envíos a toda Argentina. Revisá el modelo, la configuración y la condición de cada equipo antes de elegir.",
    heading: "Revisá la configuración exacta de tu equipo",
    guide: "En teléfonos y tablets, compará capacidad, color y conectividad; en computadoras, chip, memoria y almacenamiento. La ficha informa los datos disponibles del modelo y sus variantes. Confirmá accesorios incluidos, condición y garantía aplicable antes de comprar. Si necesitás varias unidades para tu comercio, podés consultar electrónica por mayor con la misma configuración o combinar productos de otros rubros.",
    wholesalePath: "/mayorista/electronica",
  },
  "herramientas-equipamiento": {
    title: "Herramientas Total y Wadfow en Argentina",
    description: "Comprá herramientas y equipamiento Total y Wadfow con precios en pesos. Compará modelos, kits y accesorios. Envíos a toda Argentina y venta por mayor.",
    introduction: "Elegí herramientas y equipamiento del catálogo MYA para tu trabajo, taller o comercio. Precios minoristas en pesos y envíos a toda Argentina.",
    heading: "Compará herramientas por modelo y contenido",
    guide: "Revisá el código de modelo, las medidas, la potencia y los accesorios informados en cada ficha. En equipos inalámbricos, distinguí el cuerpo suelto de un kit con batería y cargador; en juegos, verificá las piezas incluidas. Para reponer una ferretería o armar un pedido por cantidad, compartinos los modelos y unidades por WhatsApp y te enviamos la cotización mayorista.",
    wholesalePath: "/mayorista/herramientas",
  },
};

const medicube: RetailContent = {
  title: "Medicube en Argentina: skincare coreano",
  description: "Comprá Medicube en Argentina: compará skincare, fórmulas y presentaciones con precios en pesos. Envíos a todo el país. Precios mayoristas por WhatsApp.",
  introduction: "Comprá Medicube en Argentina para tu rutina de skincare coreano. El catálogo muestra las presentaciones publicadas y sus precios minoristas en pesos, con envíos a toda Argentina.",
  heading: "Medicube para uso personal o para tu emprendimiento",
  guide: "Si buscás un producto Medicube que viste en redes, compará su nombre completo, fórmula y volumen con la ficha. Las cremas, sérums, pads y sets de una misma línea pueden tener presentaciones distintas. Podés comprar por menor desde una unidad. Si querés empezar a revender skincare coreano o reponer tu comercio, consultá los precios por mayor con Máximo o Agustina y combiná Medicube con otras marcas y rubros.",
  wholesalePath: "/mayorista/medicube",
};

export function retailContent(categorySlug?: string, brand?: string): RetailContent | undefined {
  if (brand) return brand === "Medicube" ? medicube : undefined;
  return categorySlug ? categories[categorySlug] : undefined;
}
