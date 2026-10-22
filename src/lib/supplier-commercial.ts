/**
 * Reglas comerciales y benchmarks de márgenes por categoría para MYA Importaciones.
 * Permite evaluar rentabilidad de ofertas de proveedores y sugerir precios comerciales.
 */

export interface CategoryBenchmark {
  slug: string;
  name: string;
  benchmarkMargin: number; // Porcentaje sobre venta (0-100)
  minMargin: number;        // Margen mínimo aceptable
  notes: string;
}

export const CATEGORY_MARGIN_BENCHMARKS: Record<string, CategoryBenchmark> = {
  perfumeria: {
    slug: "perfumeria",
    name: "Perfumería & Fragancias Árabes",
    benchmarkMargin: 50,
    minMargin: 35,
    notes: "Fragancias árabes virales (Lattafa) y body mists. Alto margen comercial sobre costo de origen.",
  },
  "cosmetica-coreana": {
    slug: "cosmetica-coreana",
    name: "Cosmética Coreana (K-Beauty)",
    benchmarkMargin: 45,
    minMargin: 30,
    notes: "Tratamientos faciales, sérums y protectores solares virales con demanda sostenida.",
  },
  "cuidado-capilar": {
    slug: "cuidado-capilar",
    name: "Cuidado Capilar",
    benchmarkMargin: 40,
    minMargin: 25,
    notes: "Tratamientos intensivos y mascarillas importadas (Karseell, Shiseido, Kérastase).",
  },
  "herramientas-equipamiento": {
    slug: "herramientas-equipamiento",
    name: "Herramientas & Equipamiento",
    benchmarkMargin: 30,
    minMargin: 20,
    notes: "Herramientas profesionales Total Tools y Wadfow con rotación constante.",
  },
  electronica: {
    slug: "electronica",
    name: "Electrónica & Smartphones",
    benchmarkMargin: 18,
    minMargin: 12,
    notes: "Smartphones Apple y Samsung, MacBooks e iPads. Márgenes más ajustados por ticket alto y comparabilidad.",
  },
};

/**
 * Resuelve el margen benchmark según categoría o palabras clave del título.
 */
export function getCategoryMarginBenchmark(categorySlugOrName?: string, title?: string): CategoryBenchmark {
  const norm = (categorySlugOrName || "").toLowerCase();
  const normTitle = (title || "").toLowerCase();

  if (norm.includes("perfum") || norm.includes("mist") || /lattafa|asdaf|yara|khamrah|bade'e|asad/i.test(normTitle)) {
    return CATEGORY_MARGIN_BENCHMARKS.perfumeria;
  }
  if (norm.includes("cosmetica") || norm.includes("facial") || norm.includes("k-beauty") || /skin1004|medicube|althea|anua|celimax/i.test(normTitle)) {
    return CATEGORY_MARGIN_BENCHMARKS["cosmetica-coreana"];
  }
  if (norm.includes("capilar") || norm.includes("cabello") || /karseell|shiseido|krastase/i.test(normTitle)) {
    return CATEGORY_MARGIN_BENCHMARKS["cuidado-capilar"];
  }
  if (norm.includes("herramienta") || /total|wadfow|rotomartillo|amoladora|taladro/i.test(normTitle)) {
    return CATEGORY_MARGIN_BENCHMARKS["herramientas-equipamiento"];
  }
  if (norm.includes("electronica") || /iphone|macbook|ipad|galaxy|smartphone/i.test(normTitle)) {
    return CATEGORY_MARGIN_BENCHMARKS.electronica;
  }

  return {
    slug: "general",
    name: "General",
    benchmarkMargin: 25,
    minMargin: 15,
    notes: "Margen general sugerido para artículos sin categoría específica.",
  };
}

/**
 * Calcula margen sobre venta, recargo (markup) y contribución neta en pesos.
 */
export function calculateCommercialMargin(saleArs: number, landedCostArs: number): {
  marginPercent: number;
  markupPercent: number;
  profitArs: number;
} {
  if (!Number.isFinite(saleArs) || !Number.isFinite(landedCostArs) || saleArs <= 0 || landedCostArs <= 0) {
    return { marginPercent: 0, markupPercent: 0, profitArs: 0 };
  }
  const profitArs = saleArs - landedCostArs;
  const marginPercent = Math.round((profitArs / saleArs) * 1000) / 10;
  const markupPercent = Math.round((profitArs / landedCostArs) * 1000) / 10;
  return { marginPercent, markupPercent, profitArs };
}

/**
 * Evalúa si una oferta comercial satisface el benchmark de su categoría.
 */
export function evaluateCommercialMargin(
  saleArs: number,
  landedCostArs: number,
  categorySlugOrName?: string,
  title?: string
): {
  marginPercent: number;
  benchmarkMargin: number;
  minMargin: number;
  isHealthy: boolean;
  status: "excelente" | "adecuado" | "bajo" | "negativo";
  suggestedSalePrice: number;
} {
  const benchmark = getCategoryMarginBenchmark(categorySlugOrName, title);
  const { marginPercent } = calculateCommercialMargin(saleArs, landedCostArs);

  // Precio sugerido en base al benchmark de la categoría
  const suggestedSalePrice = Math.round((landedCostArs / (1 - benchmark.benchmarkMargin / 100)) / 100) * 100;

  let status: "excelente" | "adecuado" | "bajo" | "negativo" = "adecuado";
  if (marginPercent < 0) {
    status = "negativo";
  } else if (marginPercent < benchmark.minMargin) {
    status = "bajo";
  } else if (marginPercent >= benchmark.benchmarkMargin) {
    status = "excelente";
  }

  return {
    marginPercent,
    benchmarkMargin: benchmark.benchmarkMargin,
    minMargin: benchmark.minMargin,
    isHealthy: marginPercent >= benchmark.minMargin,
    status,
    suggestedSalePrice,
  };
}
