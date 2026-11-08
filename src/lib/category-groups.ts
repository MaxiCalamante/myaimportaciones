import type { Category } from "./types";

export interface CategoryGroupItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: "Sparkles" | "Smartphone" | "Wrench";
  href: string;
  keywords: string[];
  subgroups: {
    name: string;
    parentSlug: string;
    description?: string;
    categories: Category[];
  }[];
}

/**
 * Three primary rubros for MYA Importaciones storefront.
 * Visual grouping layer over existing database categories.
 */
export const RUBROS_DEFINITION = [
  {
    id: "belleza-cuidado",
    name: "Belleza y Cuidado",
    slug: "cosmetica-coreana", // primary fallback route
    groupSlug: "belleza-cuidado",
    description: "Cosmética coreana (K-Beauty), cuidado capilar y fragancias importadas.",
    icon: "Sparkles" as const,
    href: "/catalogo?category=cosmetica-coreana",
    keywords: ["cosmetica", "coreana", "skincare", "capilar", "cabello", "perfume", "fragancia"],
    subgroups: [
      {
        name: "Cosmética Facial y Corporal",
        parentSlug: "cosmetica-coreana",
        description: "Limpieza, sérums, cremas, protección solar y K-Beauty.",
      },
      {
        name: "Cuidado del Cabello",
        parentSlug: "cuidado-capilar",
        description: "Tratamientos reparadores, mascarillas y aceites capilares.",
      },
      {
        name: "Perfumería & Fragancias",
        parentSlug: "perfumeria",
        description: "Perfumes árabes, fragancias importadas y mists.",
      },
    ],
  },
  {
    id: "tecnologia-electronica",
    name: "Tecnología y Electrónica",
    slug: "electronica",
    groupSlug: "tecnologia-electronica",
    description: "Smartphones, consolas, gaming, audio y accesorios de alta gama.",
    icon: "Smartphone" as const,
    href: "/catalogo?category=electronica",
    keywords: ["electronica", "smartphone", "tecnologia", "audio", "computacion", "gaming", "playstation", "apple"],
    subgroups: [
      {
        name: "Smartphones y Tablets",
        parentSlug: "electronica-smartphones",
        description: "iPhones nuevos y sellados, Samsung Galaxy y tablets.",
      },
      {
        name: "Audio y Parlantes",
        parentSlug: "electronica-audio-parlantes",
        description: "Parlantes JBL, auriculares inalámbricos y soundbars.",
      },
      {
        name: "Computación y Gaming",
        parentSlug: "electronica-consolas-gaming",
        description: "Notebooks, consolas PlayStation, Nintendo, monitores y drones.",
      },
      {
        name: "Electrodomésticos y Hogar",
        parentSlug: "electronica-electrodomesticos-hogar",
        description: "Freidoras de aire, licuadoras, afeitadoras y hogar inteligente.",
      },
    ],
  },
  {
    id: "herramientas-equipamiento",
    name: "Herramientas y Equipamiento",
    slug: "herramientas-equipamiento",
    groupSlug: "herramientas-equipamiento",
    description: "Herramientas manuales, eléctricas e inalámbricas Total Tools y Wadfow.",
    icon: "Wrench" as const,
    href: "/catalogo?category=herramientas-equipamiento",
    keywords: ["herramientas", "equipamiento", "taller", "ferreteria", "total", "wadfow"],
    subgroups: [
      {
        name: "Eléctricas e Inalámbricas",
        parentSlug: "herramientas-equipamiento",
        description: "Taladros, rotomartillos, amoladoras, soldadoras y baterías 20V.",
      },
      {
        name: "Equipamiento y Taller",
        parentSlug: "herramientas-equipamiento",
        description: "Compresores, hidrolavadoras, cajas de herramientas y generadores.",
      },
      {
        name: "Manuales y Medición",
        parentSlug: "herramientas-equipamiento",
        description: "Llaves, destornilladores, alicates y niveles láser.",
      },
    ],
  },
];

const POPULATED_TOOLS_PRIORITY = [
  "sierras-corte",
  "taladros-rotomartillos",
  "hidrolavadoras-alta-presion",
  "niveles-laser-medicion",
  "amoladoras-pulidoras",
  "gatos-hidraulicos-criques",
  "llaves-tubos-criques",
  "compresores-neumatica",
  "lijadoras-mezcladoras",
  "pistolas-pintura-calor",
  "destornilladores-puntas",
  "soldadoras-inverter",
  "baterias-cargadores-litio",
  "cepillos-fresadoras",
  "albanileria-pintura",
  "electricidad-iluminacion",
];

/**
 * Builds the populated 3-rubro structure using real categories from the database.
 */
export function buildStoreRubros(allCategories: Category[]): CategoryGroupItem[] {
  const bySlug = new Map(allCategories.map((c) => [c.slug, c]));
  const byId = new Map(allCategories.map((c) => [c.id, c]));

  return RUBROS_DEFINITION.map((rubro) => {
    const subgroups = rubro.subgroups.map((sub) => {
      let matchedCategories: Category[] = [];

      if (rubro.id === "herramientas-equipamiento") {
        const toolsParent = bySlug.get("herramientas-equipamiento");
        const allTools = toolsParent ? allCategories.filter((c) => c.parentId === toolsParent.id) : [];

        if (sub.name.includes("Eléctricas")) {
          matchedCategories = allTools.filter((c) =>
            /taladro|rotomartillo|amolador|soldador|bateria|sierra|atornillador|lijador|cepillo|calador|fresador|pistola/i.test(
              c.slug + " " + c.name
            )
          );
        } else if (sub.name.includes("Equipamiento")) {
          matchedCategories = allTools.filter((c) =>
            /compresor|hidrolavadora|caja|bolso|gato|generador|limpieza|jardin|agro|aspirador|soplador|bomba|cofre|crique/i.test(
              c.slug + " " + c.name
            )
          );
        } else {
          matchedCategories = allTools.filter((c) =>
            /llave|tubo|manual|destornillador|alicate|pinza|nivel|medicion|cincel|martillo|corte|cuter|consumible|disco|broca|punta/i.test(
              c.slug + " " + c.name
            )
          );
        }

        matchedCategories.sort((a, b) => {
          const indexA = POPULATED_TOOLS_PRIORITY.indexOf(a.slug);
          const indexB = POPULATED_TOOLS_PRIORITY.indexOf(b.slug);
          if (indexA !== -1 && indexB !== -1) return indexA - indexB;
          if (indexA !== -1) return -1;
          if (indexB !== -1) return 1;
          return a.name.localeCompare(b.name);
        });
      } else if (rubro.id === "tecnologia-electronica") {
        const techParent = bySlug.get("electronica");
        const allTech = techParent ? allCategories.filter((c) => c.parentId === techParent.id) : [];

        if (sub.name.includes("Smartphones")) {
          matchedCategories = allTech.filter((c) => /smartphone|celular|tablet|telefono/i.test(c.slug + " " + c.name));
        } else if (sub.name.includes("Audio")) {
          matchedCategories = allTech.filter((c) => /audio|parlante|auricular|soundbar|fone|som/i.test(c.slug + " " + c.name));
        } else if (sub.name.includes("Electrodomésticos")) {
          matchedCategories = allTech.filter((c) => /electro|hogar|freidora|aspirador|pava|licuador|afeitador|cortador|secador/i.test(c.slug + " " + c.name));
        } else {
          matchedCategories = allTech.filter((c) => /notebook|computador|desktop|pc|game|console|playstation|nintendo|xbox|tv|monitor|drone|camara|componente|accesorio/i.test(c.slug + " " + c.name));
        }

        // If tech subcategories in DB are still few, fallback to matching direct
        if (matchedCategories.length === 0 && sub.parentSlug) {
          const direct = bySlug.get(sub.parentSlug);
          if (direct) matchedCategories = [direct];
        }
      } else {
        const parentCat = bySlug.get(sub.parentSlug);
        const directChildren = parentCat ? allCategories.filter((c) => c.parentId === parentCat.id) : [];
        matchedCategories = directChildren.length > 0
          ? directChildren
          : allCategories.filter((c) => {
              if (c.slug === sub.parentSlug) return true;
              if (c.parentId && byId.get(c.parentId)?.slug === sub.parentSlug) return true;
              return false;
            });
      }

      return {
        name: sub.name,
        parentSlug: sub.parentSlug,
        description: sub.description,
        categories: matchedCategories.slice(0, 7), // Cap to 7 items so menu never overflows
      };
    });

    return {
      id: rubro.id,
      name: rubro.name,
      slug: rubro.slug,
      description: rubro.description,
      icon: rubro.icon,
      href: rubro.href,
      keywords: rubro.keywords,
      subgroups,
    };
  });
}
