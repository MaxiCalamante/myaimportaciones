export interface CorreoArgentinoProvince {
  code: string; // ISO 3166-2 letter code (A-Z)
  name: string;
  zone: "caba" | "buenos_aires_interior" | "centro_litoral" | "cuyo_noa" | "patagonia";
}

/**
 * Tabla oficial de Provincias de la República Argentina y sus códigos
 * según la especificación de Correo Argentino - API 2.0 (ISO 3166-2).
 */
export const CORREO_ARGENTINO_PROVINCES: readonly CorreoArgentinoProvince[] = [
  { code: "C", name: "Ciudad Autónoma de Buenos Aires (CABA)", zone: "caba" },
  { code: "B", name: "Provincia de Buenos Aires", zone: "buenos_aires_interior" },
  { code: "X", name: "Córdoba", zone: "centro_litoral" },
  { code: "S", name: "Santa Fe", zone: "centro_litoral" },
  { code: "E", name: "Entre Ríos", zone: "centro_litoral" },
  { code: "L", name: "La Pampa", zone: "centro_litoral" },
  { code: "M", name: "Mendoza", zone: "cuyo_noa" },
  { code: "J", name: "San Juan", zone: "cuyo_noa" },
  { code: "D", name: "San Luis", zone: "cuyo_noa" },
  { code: "T", name: "Tucumán", zone: "cuyo_noa" },
  { code: "A", name: "Salta", zone: "cuyo_noa" },
  { code: "Y", name: "Jujuy", zone: "cuyo_noa" },
  { code: "K", name: "Catamarca", zone: "cuyo_noa" },
  { code: "F", name: "La Rioja", zone: "cuyo_noa" },
  { code: "G", name: "Santiago del Estero", zone: "cuyo_noa" },
  { code: "H", name: "Chaco", zone: "cuyo_noa" },
  { code: "P", name: "Formosa", zone: "cuyo_noa" },
  { code: "W", name: "Corrientes", zone: "cuyo_noa" },
  { code: "N", name: "Misiones", zone: "cuyo_noa" },
  { code: "Q", name: "Neuquén", zone: "patagonia" },
  { code: "R", name: "Río Negro", zone: "patagonia" },
  { code: "U", name: "Chubut", zone: "patagonia" },
  { code: "Z", name: "Santa Cruz", zone: "patagonia" },
  { code: "V", name: "Tierra del Fuego", zone: "patagonia" },
] as const;

export function getProvinceByCode(code: string): CorreoArgentinoProvince | undefined {
  const upper = code.trim().toUpperCase();
  return CORREO_ARGENTINO_PROVINCES.find((p) => p.code === upper);
}

/**
 * Infiere la provincia según el Código Postal argentino (CPA o numérico de 4 dígitos).
 */
export function inferProvinceFromPostalCode(rawCp: string): CorreoArgentinoProvince | undefined {
  const clean = rawCp.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!clean) return undefined;

  // Si tiene formato CPA con letra al inicio (ej: B7000ABC, C1425EFG, X5000)
  const letterMatch = clean.match(/^[A-Z]/);
  if (letterMatch) {
    const province = getProvinceByCode(letterMatch[0]);
    if (province) return province;
  }

  // Si es numérico tradicional (4 dígitos)
  const numMatch = clean.match(/\d{4}/);
  if (!numMatch) return undefined;
  const num = parseInt(numMatch[0], 10);

  if (num >= 1000 && num <= 1499) return getProvinceByCode("C"); // CABA
  if (num >= 1500 && num <= 1999) return getProvinceByCode("B"); // GBA
  if (num >= 2000 && num <= 2999) {
    if (num >= 2700 && num <= 2999) return getProvinceByCode("B"); // San Nicolás / Pergamino
    return getProvinceByCode("S"); // Santa Fe / Rosario
  }
  if (num >= 3000 && num <= 3999) {
    if (num >= 3100 && num <= 3299) return getProvinceByCode("E"); // Entre Ríos
    if (num >= 3300 && num <= 3399) return getProvinceByCode("N"); // Misiones
    if (num >= 3400 && num <= 3499) return getProvinceByCode("W"); // Corrientes
    if (num >= 3500 && num <= 3599) return getProvinceByCode("H"); // Chaco
    if (num >= 3600 && num <= 3699) return getProvinceByCode("P"); // Formosa
    return getProvinceByCode("S"); // Santa Fe
  }
  if (num >= 4000 && num <= 4999) {
    if (num >= 4000 && num <= 4199) return getProvinceByCode("T"); // Tucumán
    if (num >= 4200 && num <= 4399) return getProvinceByCode("G"); // Santiago del Estero
    if (num >= 4400 && num <= 4599) return getProvinceByCode("A"); // Salta
    if (num >= 4600 && num <= 4799) return getProvinceByCode("Y"); // Jujuy
    return getProvinceByCode("K"); // Catamarca
  }
  if (num >= 5000 && num <= 5999) {
    if (num >= 5000 && num <= 5299) return getProvinceByCode("X"); // Córdoba
    if (num >= 5300 && num <= 5399) return getProvinceByCode("F"); // La Rioja
    if (num >= 5400 && num <= 5499) return getProvinceByCode("J"); // San Juan
    if (num >= 5500 && num <= 5699) return getProvinceByCode("M"); // Mendoza
    if (num >= 5700 && num <= 5899) return getProvinceByCode("D"); // San Luis
    return getProvinceByCode("X"); // Córdoba
  }
  if (num >= 6000 && num <= 7999) return getProvinceByCode("B"); // Interior Bs As (7000 = Tandil)
  if (num >= 8000 && num <= 8999) {
    if (num >= 8000 && num <= 8299) return getProvinceByCode("B"); // Bahía Blanca / Sudoeste Bs As
    if (num >= 8300 && num <= 8399) return getProvinceByCode("Q"); // Neuquén
    if (num >= 8400 && num <= 8599) return getProvinceByCode("R"); // Río Negro
    return getProvinceByCode("U"); // Chubut
  }
  if (num >= 9000 && num <= 9999) {
    if (num >= 9000 && num <= 9299) return getProvinceByCode("U"); // Chubut
    if (num >= 9300 && num <= 9399) return getProvinceByCode("Z"); // Santa Cruz
    return getProvinceByCode("V"); // Tierra del Fuego
  }

  return undefined;
}
