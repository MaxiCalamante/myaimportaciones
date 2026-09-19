export interface ShippingOption {
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
}

export const FREE_SHIPPING_THRESHOLD = 120000;

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
  // Extract numerical component
  const numMatch = cleanCp.match(/\d{4}/);
  const letterPrefix = cleanCp.match(/^[A-Z]/)?.[0];

  const cpNum = numMatch ? parseInt(numMatch[0], 10) : null;

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

  // 5. Centro & Litoral (Santa Fe, Córdoba, Entre Ríos, etc.)
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

  // 6. Cuyo & NOA (Mendoza, San Juan, Tucumán, Salta, etc.)
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

  // 7. Patagonia (Neuquén, Río Negro, Chubut, Santa Cruz, Tierra del Fuego)
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
  cartTotal: number = 0
): ShippingCalculation {
  const cleanCp = rawPostalCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");

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
    };
  }

  const freeShippingQualified = cartTotal >= FREE_SHIPPING_THRESHOLD;
  const options: ShippingOption[] = [];

  // Special options for Tandil headquarters
  if (zone.id === "local_tandil") {
    options.push({
      id: "pickup_tandil",
      name: "Retiro en Depósito Central",
      carrier: "MYA Importaciones Tandil",
      price: 0,
      originalPrice: 0,
      isFree: true,
      estimatedDays: "Hoy mismo coordinando por WhatsApp",
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
      estimatedDays: "Entrega en el día",
      badge: "En el día",
      type: "domicilio",
    });

    options.push({
      id: "correo_domicilio",
      name: "Envío a Domicilio",
      carrier: "Correo Argentino Clásico",
      price: freeShippingQualified ? 0 : 5200,
      originalPrice: 5200,
      isFree: freeShippingQualified,
      estimatedDays: "24 a 48 hs hábiles",
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
      estimatedDays: zone.branchDays,
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
      estimatedDays: zone.homeDays,
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
      estimatedDays: zone.id === "caba" || zone.id === "gba" ? "24 hs hábiles" : "24 a 48 hs hábiles",
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
  };
}
