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

export function isProductImmediateStock(product?: { stock?: number; stockVerifiedAt?: string | null; fulfillmentMode?: string; supplierAvailable?: boolean; tags?: string[] } | null): boolean {
  return Boolean(product?.fulfillmentMode !== "supplier" && product?.stockVerifiedAt && Number(product.stock) > 0);
}
export function getProductShippingTimeInfo(product?: { stock?: number; stockVerifiedAt?: string | null; fulfillmentMode?: string; supplierAvailable?: boolean; tags?: string[] } | null) {
  const isImmediate = isProductImmediateStock(product);
  if (product?.fulfillmentMode === "supplier") return { isImmediate: false, badgeText: product.supplierAvailable ? "Disponible" : "Consultar disponibilidad", deliveryText: "Envío a domicilio", shippingTimeDescription: "Confirmamos tarifa y plazo de entrega según tu destino antes del pago.", badgeClass: "bg-sky-50 text-sky-800 border-sky-200", pillClass: "bg-sky-600 text-white", estimatedDays: "Según destino" };
  return { isImmediate, badgeText: isImmediate ? "Stock confirmado" : "Consultar disponibilidad", deliveryText: "Entrega a coordinar", shippingTimeDescription: isImmediate ? "Coordinamos retiro o despacho desde Tandil." : "Consulta disponibilidad y plazo antes de comprar.", badgeClass: "bg-sky-50 text-sky-800 border-sky-200", pillClass: "bg-sky-600 text-white", estimatedDays: "A coordinar" };
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

function resolveZone(cleanCp: string): ZoneDefinition | null {
  const upper = cleanCp.toUpperCase();

  // Fast city name detection
  if (upper.includes("TANDIL")) {
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
  if (upper.includes("CABA") || upper.includes("CAPITAL") || upper.includes("PALERMO") || upper.includes("BELGRANO") || upper.includes("RECOLETA")) {
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
  if (upper.includes("ROSARIO")) {
    return {
      id: "centro_litoral",
      name: "Centro y Litoral",
      location: "Rosario, Santa Fe",
      baseBranchPrice: 6900,
      baseHomePrice: 8600,
      branchDays: "3 a 5 días hábiles",
      homeDays: "2 a 4 días hábiles",
    };
  }
  if (upper.includes("CORDOBA")) {
    return {
      id: "centro_litoral",
      name: "Centro y Litoral",
      location: "Córdoba Capital",
      baseBranchPrice: 6900,
      baseHomePrice: 8600,
      branchDays: "3 a 5 días hábiles",
      homeDays: "2 a 4 días hábiles",
    };
  }
  if (upper.includes("MENDOZA")) {
    return {
      id: "cuyo_noa",
      name: "Cuyo y NOA",
      location: "Mendoza Capital",
      baseBranchPrice: 7800,
      baseHomePrice: 9800,
      branchDays: "3 a 6 días hábiles",
      homeDays: "3 a 5 días hábiles",
    };
  }

  // Extract numerical component
  const numMatch = cleanCp.match(/\d{4}/);
  const letterPrefix = cleanCp.match(/^[A-Z]/)?.[0];

  const cpNum = numMatch ? parseInt(numMatch[0], 10) : null;

  if (cpNum && cpNum >= 5300 && cpNum <= 5799 && (!letterPrefix || ["M", "J", "F", "D"].includes(letterPrefix))) return resolveZone("MENDOZA");
  if (cpNum === 8000 && !letterPrefix) return resolveZone("B8000");

  // 1. Local Tandil (Headquarters of MYA Importaciones)
  if (cpNum === 7000 || (letterPrefix === "B" && cpNum === 7000)) {
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

  // 2. CABA (Capital Federal)
  if ((cpNum && cpNum >= 1000 && cpNum <= 1499) || letterPrefix === "C") {
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

  // 3. GBA / Gran Buenos Aires
  if (cpNum && cpNum >= 1500 && cpNum <= 1999) {
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

  // 4. Interior de la Provincia de Buenos Aires
  if (
    letterPrefix === "B" ||
    (cpNum && ((cpNum >= 2700 && cpNum <= 2999) || (cpNum >= 6000 && cpNum <= 7999)))
  ) {
    let loc = "Interior Provincia de Buenos Aires";
    if (cpNum && cpNum >= 7600 && cpNum <= 7610) loc = "Mar del Plata, Buenos Aires";
    else if (cpNum && cpNum >= 8000 && cpNum <= 8010) loc = "Bahía Blanca, Buenos Aires";
    else if (cpNum && cpNum === 7400) loc = "Olavarría, Buenos Aires";
    else if (cpNum && cpNum === 7300) loc = "Azul, Buenos Aires";
    else if (cpNum && cpNum === 7630) loc = "Necochea, Buenos Aires";

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

  // 5. Centro & Litoral (Santa Fe, CÃ³rdoba, Entre RÃ­os, etc.)
  if (
    ["S", "X", "E", "W", "N", "H", "P"].includes(letterPrefix || "") ||
    (cpNum && ((cpNum >= 2000 && cpNum <= 2699) || (cpNum >= 3000 && cpNum <= 3999) || (cpNum >= 5000 && cpNum <= 5999)))
  ) {
    let loc = "Región Centro y Litoral";
    if (cpNum && cpNum >= 2000 && cpNum <= 2010) loc = "Rosario, Santa Fe";
    else if (cpNum && cpNum >= 3000 && cpNum <= 3010) loc = "Santa Fe Capital";
    else if (cpNum && cpNum >= 5000 && cpNum <= 5010) loc = "Córdoba Capital";
    else if (cpNum && cpNum >= 3100 && cpNum <= 3110) loc = "Paraná, Entre Ríos";

    return {
      id: "centro_litoral",
      name: "Centro y Litoral",
      location: loc,
      baseBranchPrice: 6900,
      baseHomePrice: 8600,
      branchDays: "3 a 5 días hábiles",
      homeDays: "2 a 4 días hábiles",
    };
  }

  // 6. Cuyo & NOA (Mendoza, San Juan, TucumÃ¡n, Salta, etc.)
  if (
    ["M", "J", "D", "T", "A", "Y", "G", "K", "F"].includes(letterPrefix || "") ||
    (cpNum && (cpNum >= 4000 && cpNum <= 4999)) ||
    (cpNum && (cpNum >= 5300 && cpNum <= 5799))
  ) {
    let loc = "Región Cuyo & Noroeste (NOA)";
    if (cpNum && cpNum >= 5500 && cpNum <= 5510) loc = "Mendoza Capital";
    else if (cpNum && cpNum >= 4000 && cpNum <= 4010) loc = "San Miguel de Tucumán";
    else if (cpNum && cpNum >= 4400 && cpNum <= 4410) loc = "Salta Capital";
    else if (cpNum && cpNum >= 5400 && cpNum <= 5410) loc = "San Juan Capital";

    return {
      id: "cuyo_noa",
      name: "Cuyo y NOA",
      location: loc,
      baseBranchPrice: 7800,
      baseHomePrice: 9800,
      branchDays: "3 a 6 días hábiles",
      homeDays: "3 a 5 días hábiles",
    };
  }

  // 7. Patagonia (NeuquÃ©n, RÃ­o Negro, Chubut, Santa Cruz, Tierra del Fuego)
  if (
    ["Q", "R", "U", "Z", "V"].includes(letterPrefix || "") ||
    (cpNum && cpNum >= 8000 && cpNum <= 9999)
  ) {
    let loc = "Región Patagonia";
    if (cpNum && cpNum >= 8300 && cpNum <= 8310) loc = "Neuquén Capital";
    else if (cpNum && cpNum >= 8400 && cpNum <= 8410) loc = "San Carlos de Bariloche";
    else if (cpNum && cpNum >= 9000 && cpNum <= 9010) loc = "Comodoro Rivadavia, Chubut";
    else if (cpNum && cpNum >= 9410 && cpNum <= 9420) loc = "Ushuaia / Río Grande, Tierra del Fuego";

    return {
      id: "patagonia",
      name: "Patagonia",
      location: loc,
      baseBranchPrice: 9400,
      baseHomePrice: 12500,
      branchDays: "4 a 7 días hábiles",
      homeDays: "3 a 6 días hábiles",
    };
  }

  // Generic fallback if 4-digit code provided
  if (cpNum && cpNum >= 1000 && cpNum <= 9999) {
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
  supplierDelivery: boolean = false
): ShippingCalculation {
  const cleanCp = rawPostalCode.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9]/g, "");

  if (!cleanCp || cleanCp.length < 4) {
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

  const zone = resolveZone(cleanCp);
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

  if (supplierDelivery) {
    let amount: unknown;
    try { amount = JSON.parse(process.env.NEXT_PUBLIC_SUPPLIER_SHIPPING_RATES_JSON ?? "{}")[zone.id]; } catch {}
    const confirmed = typeof amount === "number" && Number.isFinite(amount) && amount >= 0 && amount <= 1000000;
    return {
      isValid: true, postalCode: rawPostalCode, zoneId: zone.id, zoneName: zone.name, locationName: zone.location,
      freeShippingQualified: false, freeShippingThreshold: FREE_SHIPPING_THRESHOLD, remainingForFreeShipping: 0, hasImmediateStockOnly: false,
      options: [{ id: "supplier_delivery", name: "Envío a domicilio", carrier: "Transporte a coordinar", type: "domicilio", price: confirmed ? amount as number : 0, originalPrice: confirmed ? amount as number : 0, isFree: confirmed && amount === 0, requiresQuote: !confirmed, estimatedDays: "Plazo según destino, a confirmar antes del pago" }],
    };
  }

  // Special options for Tandil headquarters
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
      carrier: "Correo Argentino Clásico",
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
    // 1. Correo Argentino a Sucursal (opciÃ³n econÃ³mica)
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

    // 2. Correo Argentino a Domicilio
    const homePrice = freeShippingQualified ? 0 : zone.baseHomePrice;
    options.push({
      id: "correo_domicilio",
      name: "Envío Estándar a Domicilio",
      carrier: "Correo Argentino a Domicilio",
      price: homePrice,
      originalPrice: zone.baseHomePrice,
      isFree: freeShippingQualified,
      estimatedDays: isAllImmediateStock
        ? zone.homeDays
        : "3 a 7 días hábiles (a domicilio)",
      badge: freeShippingQualified ? "Envío Gratis 🎉" : "Más elegido",
      type: "domicilio",
    });

    // 3. Andreani ExprÃ©s Prioritario (para mayor velocidad)
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
    options: options.map(option => ({ ...option, estimatedDays: option.type === "pickup" ? "A coordinar" : "Estimado sujeto a confirmacion del transportista", badge: undefined })),
    freeShippingQualified,
    freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
    remainingForFreeShipping: Math.max(0, FREE_SHIPPING_THRESHOLD - cartTotal),
    hasImmediateStockOnly: isAllImmediateStock,
  };
}
