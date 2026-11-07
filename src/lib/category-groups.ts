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
    description: "Smartphones, accesorios originales, audio y gadgets.",
    icon: "Smartphone" as const,
    href: "/catalogo?category=electronica",
    keywords: ["electronica", "smartphone", "tecnologia", "audio", "computacion"],
    subgroups: [
      {
        name: "Electrónica y Dispositivos",
        parentSlug: "electronica",
        description: "Equipos Apple, Samsung, audio y accesorios de alta gama.",
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
    keywords: ["herramientas", "equipamiento", "taller", "ferreteria"],
    subgroups: [
      {
        name: "Herramientas y Taller",
        parentSlug: "herramientas-equipamiento",
        description: "Líneas industriales y profesionales para trabajo y hogar.",
      },
    ],
  },
];

/**
 * Builds the populated 3-rubro structure using real categories from the database.
 */
export function buildStoreRubros(allCategories: Category[]): CategoryGroupItem[] {
  const bySlug = new Map(allCategories.map((c) => [c.slug, c]));
  const byId = new Map(allCategories.map((c) => [c.id, c]));

  return RUBROS_DEFINITION.map((rubro) => {
    const subgroups = rubro.subgroups.map((sub) => {
      const parentCat = bySlug.get(sub.parentSlug);
      // Children of this parent category
      const directChildren = parentCat
        ? allCategories.filter((c) => c.parentId === parentCat.id)
        : [];

      // Or categories matching keyword if no strict parentId
      const matchedCategories = directChildren.length > 0
        ? directChildren
        : allCategories.filter((c) => {
            if (c.slug === sub.parentSlug) return true;
            if (c.parentId && byId.get(c.parentId)?.slug === sub.parentSlug) return true;
            return false;
          });

      return {
        name: sub.name,
        parentSlug: sub.parentSlug,
        description: sub.description,
        categories: matchedCategories,
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
