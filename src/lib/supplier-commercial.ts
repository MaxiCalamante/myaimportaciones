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

/**
 * Calcula el costo real puesto en mano (landed cost) en ARS a partir del valor en USD del proveedor,
 * considerando la cotización de adquisición y la comisión del pasero (por defecto 20%).
 * Fórmula oficial MYA: (Costo USD * FX) + (Costo USD * FX * % Pasero) = Costo USD * FX * (1 + % Pasero)
 */
export function calculateLandedCostArs(
  costUsd: number,
  fx = 1600,
  paseroPercent = 20
): {
  costUsd: number;
  exchangeRate: number;
  paseroPercent: number;
  baseArs: number;
  paseroFeeArs: number;
  paseroArs: number;
  totalLandedArs: number;
} {
  if (!Number.isFinite(costUsd) || costUsd <= 0) {
    return {
      costUsd: 0,
      exchangeRate: fx,
      paseroPercent,
      baseArs: 0,
      paseroFeeArs: 0,
      paseroArs: 0,
      totalLandedArs: 0,
    };
  }
  const baseArs = Math.round(costUsd * fx * 100) / 100;
  const paseroFeeArs = Math.round(baseArs * (paseroPercent / 100) * 100) / 100;
  const totalLandedArs = Math.round((baseArs + paseroFeeArs) * 100) / 100;
  return {
    costUsd,
    exchangeRate: fx,
    paseroPercent,
    baseArs,
    paseroFeeArs,
    paseroArs: paseroFeeArs,
    totalLandedArs,
  };
}

/**
 * Sugiere el precio de venta minorista en base al costo landed y el benchmark de la categoría,
 * redondeando a centena o terminación psicológica ($.900 o $.000).
 */
export function calculateSuggestedRetailPrice(
  landedCostArs: number,
  categorySlugOrName?: string,
  title?: string,
  options?: { psychologicalEnding?: boolean }
): {
  suggestedPrice: number;
  benchmark: CategoryBenchmark;
  estimatedMarginPercent: number;
  estimatedProfitArs: number;
} {
  const benchmark = getCategoryMarginBenchmark(categorySlugOrName, title);
  if (!Number.isFinite(landedCostArs) || landedCostArs <= 0) {
    return {
      suggestedPrice: 0,
      benchmark,
      estimatedMarginPercent: benchmark.benchmarkMargin,
      estimatedProfitArs: 0,
    };
  }

  // Precio base según benchmark: Costo / (1 - Margen)
  const exactPrice = landedCostArs / (1 - benchmark.benchmarkMargin / 100);
  let suggestedPrice = Math.round(exactPrice / 100) * 100;

  if (options?.psychologicalEnding && suggestedPrice > 1000) {
    // Si la centena termina en 00, aplicar terminación .900 para atractivo comercial
    const remainder = suggestedPrice % 1000;
    if (remainder === 0) {
      suggestedPrice -= 100; // e.g. 30000 -> 29900
    }
  }

  const { marginPercent, profitArs } = calculateCommercialMargin(suggestedPrice, landedCostArs);

  return {
    suggestedPrice,
    benchmark,
    estimatedMarginPercent: marginPercent,
    estimatedProfitArs: profitArs,
  };
}

/**
 * Evalúa un precio de venta considerando simultáneamente el costo del mayorista
 * y la referencia de mercado de Mercado Libre (si está disponible).
 */
export function evaluateWithMarketBenchmark(
  landedCostArs: number,
  currentPrice: number,
  mlPrice: number | null,
  categorySlugOrName?: string,
  title?: string
): {
  suggestedPrice: number;
  strategy: "market_competitive" | "cost_plus" | "margin_protected";
  mlPrice: number | null;
  notes: string;
} {
  const benchmark = getCategoryMarginBenchmark(categorySlugOrName, title);
  const costBased = calculateSuggestedRetailPrice(landedCostArs, categorySlugOrName, title, { psychologicalEnding: true });

  if (!mlPrice || mlPrice <= 0) {
    return {
      suggestedPrice: costBased.suggestedPrice,
      strategy: "cost_plus",
      mlPrice: null,
      notes: "Sugerido según costo landed y benchmark de categoría.",
    };
  }

  // Objetivo: ~8% por debajo de Mercado Libre
  let mlSuggested = Math.round((mlPrice * 0.92) / 100) * 100;
  if (mlSuggested > 1000 && mlSuggested % 1000 === 0) {
    mlSuggested -= 100;
  }

  const floorPrice = landedCostArs > 0 ? landedCostArs / (1 - benchmark.minMargin / 100) : 0;

  if (mlSuggested >= floorPrice) {
    return {
      suggestedPrice: mlSuggested,
      strategy: "market_competitive",
      mlPrice,
      notes: `8% por debajo de Mercado Libre ($${mlPrice.toLocaleString("es-AR")}) manteniendo margen sano.`,
    };
  }

  return {
    suggestedPrice: costBased.suggestedPrice,
    strategy: "margin_protected",
    mlPrice,
    notes: `Precio protegido por margen mínimo; el precio de ML es inferior al costo seguro.`,
  };
}
