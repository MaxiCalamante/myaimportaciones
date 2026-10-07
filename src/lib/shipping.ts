import {
  getProvinceByCode,
  inferProvinceFromPostalCode,
} from "@/lib/correo-argentino/provinces";

export interface ShippingOption {
  requiresQuote?: boolean;
  id: string;
  name: string;
  carrier: string;
  price: number;
  originalPrice: number;
  isFree: boolean;
  estimatedDays: string;
  badge?: string;
  type: "domicilio" | "sucursal" | "pickup";
}

export interface ShippingCalculation {
  isValid: boolean;
  postalCode: string;
  zoneId: string;
  zoneName: string;
  locationName: string;
  options: ShippingOption[];
  freeShippingQualified: boolean;
  freeShippingThreshold: number;
  remainingForFreeShipping: number;
  hasImmediateStockOnly: boolean;
}

export const FREE_SHIPPING_THRESHOLD = Number.POSITIVE_INFINITY; // No uncosted free shipping campaign.

export function isShippingPaidSeparately() {
  return process.env.NEXT_PUBLIC_SHIPPING_PAYMENT_POLICY === "quote_separately";
}

export function isProductImmediateStock(product?: { stock?: number; stockVerifiedAt?: string | null; fulfillmentMode?: string; supplierAvailable?: boolean; tags?: string[] } | null): boolean {
  return Boolean(product?.fulfillmentMode !== "supplier" && product?.stockVerifiedAt && Number(product.stock) > 0);
}

export function getProductShippingTimeInfo(product?: { stock?: number; stockVerifiedAt?: string | null; fulfillmentMode?: string; supplierAvailable?: boolean; tags?: string[] } | null) {
  const isImmediate = isProductImmediateStock(product);
  if (product?.fulfillmentMode === "supplier") {
    return {
      isImmediate: false,
      badgeText: product.supplierAvailable ? "Disponible" : "Consultar disponibilidad",
      deliveryText: "Envío Correo Argentino a domicilio",
      shippingTimeDescription: isShippingPaidSeparately()
        ? "Envíos a todo el país. El envío se cotiza y abona por separado; coordinamos costo y plazo con vos."
        : "Confirmamos tarifa y plazo de entrega por Correo Argentino antes del pago.",
      badgeClass: "bg-sky-50 text-sky-800 border-sky-200",
      pillClass: "bg-sky-600 text-white",
      estimatedDays: "2 a 5 días hábiles",
    };
  }
  return {
    isImmediate,
    badgeText: isImmediate ? "Stock confirmado" : "Consultar disponibilidad",
    deliveryText: "Entrega a coordinar",
    shippingTimeDescription: isImmediate
      ? "Coordinamos retiro en depósito o despacho desde Tandil."
      : "Consulta disponibilidad y plazo antes de comprar.",
    badgeClass: "bg-sky-50 text-sky-800 border-sky-200",
    pillClass: "bg-sky-600 text-white",
    estimatedDays: "A coordinar",
  };
}

interface ZoneDefinition {
  id: string;
  name: string;
  location: string;
  baseBranchPrice: number;
  baseHomePrice: number;
  branchDays: string;
  homeDays: string;
}

function resolveZone(cleanCp: string, provinceCode?: string, city?: string, address?: string): ZoneDefinition | null {
  const upperCp = cleanCp.toUpperCase();
  const upperCity = (city || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
  const upperAddress = (address || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
  const fullText = `${upperCp} ${upperCity} ${upperAddress}`;

  // 1. Detección de Tandil (Sede Central de MYA Importaciones)
  // Aplica si el CP es 7000/B7000 O si la ciudad/dirección menciona Tandil,
  // salvo que se haya seleccionado explícitamente una provincia distinta de Buenos Aires.
  const isTandilMentioned = upperCity.includes("TANDIL") || upperAddress.includes("TANDIL") || upperCp.includes("TANDIL");
  const isCp7000 = upperCp === "7000" || upperCp === "B7000";
  if ((isTandilMentioned || isCp7000) && (!provinceCode || provinceCode === "B")) {
    return {
      id: "local_tandil",
      name: "Tandil (Local)",
      location: "Tandil, Buenos Aires (Sede Central)",
      baseBranchPrice: 0,
      baseHomePrice: 2500,
      branchDays: "Hoy mismo",
      homeDays: "En el día / 24 hs",
    };
  }

  // 2. Extracción numérica y prefijo del Código Postal
  const numMatch = cleanCp.match(/\d{4}/);
  const cpNum = numMatch ? parseInt(numMatch[0], 10) : null;

  // 3. Inferencia de provincia por Código Postal (si tiene al menos 4 dígitos)
  const inferredFromCp = cleanCp.length >= 4 ? inferProvinceFromPostalCode(cleanCp) : null;

  // Si el CP indica claramente una provincia (ej. 5000 es Córdoba, 1425 es CABA, 8300 es Neuquén),
  // tiene prioridad para no quedar atrapado en una provincia desactualizada.
  const activeProv = inferredFromCp || (provinceCode ? getProvinceByCode(provinceCode) : null);

  // 4. Si identificamos provincia (por CP o por selector)
  if (activeProv) {
    if (activeProv.code === "C") {
      return {
        id: "caba",
        name: "CABA",
        location: "Ciudad Autónoma de Buenos Aires",
        baseBranchPrice: 5400,
        baseHomePrice: 6800,
        branchDays: "2 a 3 días hábiles",
        homeDays: "24 a 48 hs hábiles",
      };
    }

    if (activeProv.code === "B") {
      const isGbaText = /AVELLANEDA|QUILMES|LANUS|LOMAS DE ZAMORA|BANFIELD|TEMPERLEY|MORON|CASTELAR|HAEDO|RAMOS MEJIA|SAN JUSTO|LA MATANZA|SAN ISIDRO|VICENTE LOPEZ|OLIVOS|FLORIDA|MARTINEZ|SAN FERNANDO|TIGRE|SAN MARTIN|TRES DE FEBRERO|CASEROS|HURLINGHAM|ITUZAINGO|MORENO|MERLO|BERAZATEGUI|FLORENCIO VARELA|ESTEBAN ECHEVERRIA|EZEIZA|ALMIRANTE BROWN|ADROGUE|BURZACO|GBA|CONURBANO/i.test(fullText);
      const isGbaCp = cpNum !== null && cpNum >= 1500 && cpNum <= 1999;

      if (isGbaCp || isGbaText) {
        return {
          id: "gba",
          name: "Gran Buenos Aires (GBA)",
          location: "Conurbano Bonaerense / GBA",
          baseBranchPrice: 5800,
          baseHomePrice: 7200,
          branchDays: "2 a 4 días hábiles",
          homeDays: "48 a 72 hs hábiles",
        };
      }

      let loc = "Interior Provincia de Buenos Aires";
      if ((cpNum && cpNum >= 7600 && cpNum <= 7610) || fullText.includes("MAR DEL PLATA")) loc = "Mar del Plata, Buenos Aires";
      else if ((cpNum && cpNum >= 8000 && cpNum <= 8010) || fullText.includes("BAHIA BLANCA")) loc = "Bahía Blanca, Buenos Aires";
      else if (cpNum === 7400 || fullText.includes("OLAVARRIA")) loc = "Olavarría, Buenos Aires";
      else if (cpNum === 7300 || fullText.includes("AZUL")) loc = "Azul, Buenos Aires";
      else if (cpNum === 7630 || fullText.includes("NECOCHEA")) loc = "Necochea, Buenos Aires";
      else if (fullText.includes("LA PLATA")) loc = "La Plata, Buenos Aires";

      return {
        id: "buenos_aires_interior",
        name: "Interior de Buenos Aires",
        location: loc,
        baseBranchPrice: 6200,
        baseHomePrice: 7800,
        branchDays: "2 a 4 días hábiles",
        homeDays: "48 a 72 hs hábiles",
      };
    }

    if (activeProv.zone === "centro_litoral") {
      return {
        id: "centro_litoral",
        name: `Centro y Litoral (${activeProv.name})`,
        location: activeProv.name,
        baseBranchPrice: 6900,
        baseHomePrice: 8600,
        branchDays: "3 a 5 días hábiles",
        homeDays: "2 a 4 días hábiles",
      };
    }

    if (activeProv.zone === "cuyo_noa") {
      return {
        id: "cuyo_noa",
        name: `Cuyo y NOA (${activeProv.name})`,
        location: activeProv.name,
        baseBranchPrice: 7800,
        baseHomePrice: 9800,
        branchDays: "3 a 6 días hábiles",
        homeDays: "3 a 5 días hábiles",
      };
    }

    if (activeProv.zone === "patagonia") {
      return {
        id: "patagonia",
        name: `Patagonia (${activeProv.name})`,
        location: activeProv.name,
        baseBranchPrice: 9400,
        baseHomePrice: 12500,
        branchDays: "4 a 7 días hábiles",
        homeDays: "3 a 6 días hábiles",
      };
    }
  }

  // 5. Fallback por detección de texto en dirección / localidad
  if (/CABA|CAPITAL FEDERAL|BUENOS AIRES CAPITAL|PALERMO|BELGRANO|RECOLETA|CABALLITO|ALMAGRO|FLORES|VILLA URQUIZA/i.test(fullText)) {
    return {
      id: "caba",
      name: "CABA",
      location: "Ciudad Autónoma de Buenos Aires",
      baseBranchPrice: 5400,
      baseHomePrice: 6800,
      branchDays: "2 a 3 días hábiles",
      homeDays: "24 a 48 hs hábiles",
    };
  }

  if (/ROSARIO|SANTA FE|CORDOBA|PARANA|CONCORDIA|CORRIENTES|POSADAS|RESISTENCIA|FORMOSA/i.test(fullText)) {
    return {
      id: "centro_litoral",
      name: "Centro y Litoral",
      location: "Región Centro y Litoral",
      baseBranchPrice: 6900,
      baseHomePrice: 8600,
      branchDays: "3 a 5 días hábiles",
      homeDays: "2 a 4 días hábiles",
    };
  }

  if (/MENDOZA|SAN JUAN|SAN LUIS|SALTA|TUCUMAN|SAN MIGUEL DE TUCUMAN|JUJUY|CATAMARCA|LA RIOJA|SANTIAGO DEL ESTERO/i.test(fullText)) {
    return {
      id: "cuyo_noa",
      name: "Cuyo y NOA",
      location: "Región Cuyo y NOA",
      baseBranchPrice: 7800,
      baseHomePrice: 9800,
      branchDays: "3 a 6 días hábiles",
      homeDays: "3 a 5 días hábiles",
    };
  }

  if (/NEUQUEN|BARILOCHE|SAN CARLOS DE BARILOCHE|COMODORO|TRELEW|MADRYN|RIO GALLEGOS|USHUAIA|RIO GRANDE|SANTA ROSA|VIEDMA/i.test(fullText)) {
    return {
      id: "patagonia",
      name: "Patagonia",
      location: "Región Patagonia",
      baseBranchPrice: 9400,
      baseHomePrice: 12500,
      branchDays: "4 a 7 días hábiles",
      homeDays: "3 a 6 días hábiles",
    };
  }

  // 6. Fallback numérico por CP
  if (cpNum && cpNum >= 1000 && cpNum <= 9999) {
    if (cpNum >= 1000 && cpNum <= 1499) {
      return { id: "caba", name: "CABA", location: "CABA", baseBranchPrice: 5400, baseHomePrice: 6800, branchDays: "2 a 3 días hábiles", homeDays: "24 a 48 hs hábiles" };
    }
    if (cpNum >= 1500 && cpNum <= 1999) {
      return { id: "gba", name: "Gran Buenos Aires (GBA)", location: "GBA", baseBranchPrice: 5800, baseHomePrice: 7200, branchDays: "2 a 4 días hábiles", homeDays: "48 a 72 hs hábiles" };
    }
    if ((cpNum >= 2700 && cpNum <= 2999) || (cpNum >= 6000 && cpNum <= 7999) || (cpNum >= 8000 && cpNum <= 8199)) {
      return { id: "buenos_aires_interior", name: "Interior de Buenos Aires", location: "Provincia de Buenos Aires", baseBranchPrice: 6200, baseHomePrice: 7800, branchDays: "2 a 4 días hábiles", homeDays: "48 a 72 hs hábiles" };
    }
    if ((cpNum >= 2000 && cpNum <= 2699) || (cpNum >= 3000 && cpNum <= 3999) || (cpNum >= 5000 && cpNum <= 5299) || (cpNum >= 5800 && cpNum <= 5999)) {
      return { id: "centro_litoral", name: "Centro y Litoral", location: "Centro y Litoral", baseBranchPrice: 6900, baseHomePrice: 8600, branchDays: "3 a 5 días hábiles", homeDays: "2 a 4 días hábiles" };
    }
    if ((cpNum >= 4000 && cpNum <= 4999) || (cpNum >= 5300 && cpNum <= 5799)) {
      return { id: "cuyo_noa", name: "Cuyo y NOA", location: "Cuyo y NOA", baseBranchPrice: 7800, baseHomePrice: 9800, branchDays: "3 a 6 días hábiles", homeDays: "3 a 5 días hábiles" };
    }
    if (cpNum >= 8200 && cpNum <= 9999) {
      return { id: "patagonia", name: "Patagonia", location: "Patagonia", baseBranchPrice: 9400, baseHomePrice: 12500, branchDays: "4 a 7 días hábiles", homeDays: "3 a 6 días hábiles" };
    }
    return {
      id: "argentina_general",
      name: "Interior de Argentina",
      location: `Zona Postal ${cpNum}, Argentina`,
      baseBranchPrice: 6900,
      baseHomePrice: 8900,
      branchDays: "3 a 5 días hábiles",
      homeDays: "3 a 5 días hábiles",
    };
  }

  return null;
}

export function calculateShipping(
  rawPostalCode: string,
  cartTotal: number = 0,
  isAllImmediateStock: boolean = false,
  supplierDelivery: boolean = false,
  provinceCode?: string,
  city?: string,
  address?: string
): ShippingCalculation {
  const cleanCp = (rawPostalCode || "").trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9]/g, "");

  if ((!cleanCp || cleanCp.length < 4) && !provinceCode && !city?.trim() && !address?.trim()) {
    return {
      isValid: false,
      postalCode: rawPostalCode,
      zoneId: "",
      zoneName: "",
      locationName: "",
      options: [],
      freeShippingQualified: false,
      freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
      remainingForFreeShipping: Math.max(0, FREE_SHIPPING_THRESHOLD - cartTotal),
      hasImmediateStockOnly: isAllImmediateStock,
    };
  }

  const zone = resolveZone(cleanCp, provinceCode, city, address);
  if (!zone) {
    return {
      isValid: false,
      postalCode: rawPostalCode,
      zoneId: "",
      zoneName: "",
      locationName: "",
      options: [],
      freeShippingQualified: false,
      freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
      remainingForFreeShipping: Math.max(0, FREE_SHIPPING_THRESHOLD - cartTotal),
      hasImmediateStockOnly: isAllImmediateStock,
    };
  }

  const freeShippingQualified = false;
  const options: ShippingOption[] = [];

  if (isShippingPaidSeparately()) return {
    isValid: true, postalCode: rawPostalCode, zoneId: zone.id, zoneName: zone.name, locationName: zone.location,
    freeShippingQualified: false, freeShippingThreshold: FREE_SHIPPING_THRESHOLD, remainingForFreeShipping: 0, hasImmediateStockOnly: isAllImmediateStock,
    options: [{ id: "delivery_quote_separately", name: "Envío a domicilio a todo el país", carrier: "Transporte a coordinar con MYA", type: "domicilio", price: 0, originalPrice: 0, isFree: false, requiresQuote: true, estimatedDays: "Costo y plazo a coordinar; envío abonado por separado" }],
  };

  if (supplierDelivery) {
    let amount: unknown;
    try { amount = JSON.parse(process.env.NEXT_PUBLIC_SUPPLIER_SHIPPING_RATES_JSON ?? "{}")[zone.id]; } catch {}
    const confirmed = typeof amount === "number" && Number.isFinite(amount) && amount >= 0 && amount <= 1000000;

    if (confirmed) {
      options.push({
        id: "correo_domicilio",
        name: "Envío Estándar a Domicilio",
        carrier: "Correo Argentino Paq.ar",
        type: "domicilio",
        price: amount as number,
        originalPrice: amount as number,
        isFree: amount === 0,
        requiresQuote: false,
        estimatedDays: zone.homeDays || "2 a 5 días hábiles",
        badge: "Correo Argentino",
      });
      options.push({
        id: "correo_sucursal",
        name: "Retiro en Sucursal más cercana",
        carrier: "Correo Argentino Sucursal",
        type: "sucursal",
        price: 0,
        originalPrice: 0,
        isFree: false,
        requiresQuote: true,
        estimatedDays: zone.branchDays || "3 a 5 días hábiles",
        badge: "A cotizar",
      });
      return {
        isValid: true, postalCode: rawPostalCode, zoneId: zone.id, zoneName: zone.name, locationName: zone.location,
        freeShippingQualified: false, freeShippingThreshold: FREE_SHIPPING_THRESHOLD, remainingForFreeShipping: 0, hasImmediateStockOnly: false,
        options,
      };
    }

    if (process.env.NEXT_PUBLIC_SUPPLIER_SHIPPING_RATES_JSON !== undefined) {
      return {
        isValid: true, postalCode: rawPostalCode, zoneId: zone.id, zoneName: zone.name, locationName: zone.location,
        freeShippingQualified: false, freeShippingThreshold: FREE_SHIPPING_THRESHOLD, remainingForFreeShipping: 0, hasImmediateStockOnly: false,
        options: [{ id: "supplier_delivery", name: "Envío a domicilio", carrier: "Transporte a coordinar", type: "domicilio", price: 0, originalPrice: 0, isFree: false, requiresQuote: true, estimatedDays: "Plazo según destino, a confirmar antes del pago" }],
      };
    }
  }

  // Opciones de Correo Argentino y entregas locales
  if (zone.id === "local_tandil") {
    options.push({
      id: "pickup_tandil",
      name: "Retiro en Depósito Central",
      carrier: "MYA Importaciones Tandil",
      price: 0,
      originalPrice: 0,
      isFree: true,
      estimatedDays: isAllImmediateStock
        ? "Hoy mismo coordinando por WhatsApp"
        : "3 a 7 días hábiles (coordinación al arribo)",
      badge: "Gratis",
      type: "pickup",
    });

    options.push({
      id: "local_delivery",
      name: "Cadetería / Mensajería Local",
      carrier: "Moto Express Tandil",
      price: zone.baseHomePrice,
      originalPrice: zone.baseHomePrice,
      isFree: false,
      estimatedDays: isAllImmediateStock
        ? "Entrega en el día"
        : "3 a 7 días hábiles (entrega al arribar)",
      badge: isAllImmediateStock ? "En el día" : "Importación",
      type: "domicilio",
    });

    options.push({
      id: "correo_domicilio",
      name: "Envío a Domicilio",
      carrier: "Correo Argentino Paq.ar",
      price: freeShippingQualified ? 0 : 5200,
      originalPrice: 5200,
      isFree: freeShippingQualified,
      estimatedDays: isAllImmediateStock
        ? "24 a 48 hs hábiles"
        : "3 a 7 días hábiles (importación directa)",
      badge: freeShippingQualified ? "Envío Gratis 🎉" : undefined,
      type: "domicilio",
    });
  } else {
    // 1. Correo Argentino a Sucursal (opción económica)
    const branchPrice = freeShippingQualified ? 0 : zone.baseBranchPrice;
    options.push({
      id: "correo_sucursal",
      name: "Retiro en Sucursal más cercana",
      carrier: "Correo Argentino Sucursal",
      price: branchPrice,
      originalPrice: zone.baseBranchPrice,
      isFree: freeShippingQualified,
      estimatedDays: isAllImmediateStock
        ? zone.branchDays
        : "3 a 7 días hábiles (sucursal)",
      badge: freeShippingQualified ? "Envío Gratis 🎉" : "Económico",
      type: "sucursal",
    });

    // 2. Correo Argentino a Domicilio (opción principal)
    const homePrice = freeShippingQualified ? 0 : zone.baseHomePrice;
    options.push({
      id: "correo_domicilio",
      name: "Envío Estándar a Domicilio",
      carrier: "Correo Argentino Paq.ar",
      price: homePrice,
      originalPrice: zone.baseHomePrice,
      isFree: freeShippingQualified,
      estimatedDays: isAllImmediateStock
        ? zone.homeDays
        : "3 a 7 días hábiles (a domicilio)",
      badge: freeShippingQualified ? "Envío Gratis 🎉" : "Más elegido",
      type: "domicilio",
    });

    // 3. Andreani Exprés Prioritario (para mayor velocidad)
    const expressPrice = Math.round((zone.baseHomePrice * 1.25) / 100) * 100;
    options.push({
      id: "andreani_express",
      name: "Envío Prioritario / Rápido",
      carrier: "Andreani Express",
      price: expressPrice,
      originalPrice: expressPrice,
      isFree: false,
      estimatedDays: isAllImmediateStock
        ? zone.id === "caba" || zone.id === "gba"
          ? "24 hs hábiles"
          : "24 a 48 hs hábiles"
        : "3 a 5 días hábiles (prioritario)",
      badge: "Rápido",
      type: "domicilio",
    });
  }

  return {
    isValid: true,
    postalCode: rawPostalCode,
    zoneId: zone.id,
    zoneName: zone.name,
    locationName: zone.location,
    options,
    freeShippingQualified,
    freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
    remainingForFreeShipping: Math.max(0, FREE_SHIPPING_THRESHOLD - cartTotal),
    hasImmediateStockOnly: isAllImmediateStock,
  };
}
