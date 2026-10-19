import { AdminFormError } from "./admin-action-result";
import type { ProductOptionDimension } from "./types";

export interface VariantFormInput {
  id?: string;
  title: string;
  sku?: string;
  retailPrice: number;
  wholesalePrice?: number;
  stock: number;
  fulfillmentMode: "own_stock" | "supplier";
  supplierAvailable: boolean;
  imageUrl?: string;
  isActive: boolean;
  options: Record<string, string>;
  displayOrder: number;
}

export function parseOptionsConfig(raw: unknown): ProductOptionDimension[] {
  if (!raw) return [];
  let parsed: unknown;
  if (typeof raw === "string") {
    if (!raw.trim()) return [];
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new AdminFormError("La configuración de opciones no es un JSON válido.");
    }
  } else {
    parsed = raw;
  }

  if (!Array.isArray(parsed)) {
    throw new AdminFormError("Las dimensiones de opciones deben ser una lista.");
  }

  if (parsed.length > 3) {
    throw new AdminFormError("Podés configurar hasta 3 dimensiones de opciones por producto.");
  }

  const dimensions: ProductOptionDimension[] = [];
  const seenNames = new Set<string>();

  for (const item of parsed) {
    if (!item || typeof item !== "object") continue;
    const name = String(item.name ?? "").trim();
    if (!name || name.length > 50) {
      throw new AdminFormError("El nombre de cada dimensión (ej. Fragancia, Potencia) debe tener entre 1 y 50 caracteres.");
    }
    const nameLower = name.toLowerCase();
    if (seenNames.has(nameLower)) {
      throw new AdminFormError(`La dimensión "${name}" está repetida.`);
    }
    seenNames.add(nameLower);

    const rawValues = Array.isArray((item as Record<string, unknown>).values)
      ? ((item as Record<string, unknown>).values as unknown[])
      : [];
    const values: string[] = [...new Set(rawValues.map((v: unknown) => String(v ?? "").trim()).filter((v): v is string => Boolean(v)))];

    if (!values.length) {
      throw new AdminFormError(`La opción "${name}" necesita al menos un valor.`);
    }

    for (const val of values) {
      if (val.length > 80) {
        throw new AdminFormError(`El valor "${val}" supera el límite de 80 caracteres.`);
      }
    }

    dimensions.push({ name, values });
  }

  return dimensions;
}

export function generateCombinations(dimensions: ProductOptionDimension[]): { title: string; options: Record<string, string> }[] {
  if (!dimensions.length) return [];

  let combinations: Record<string, string>[] = [{}];

  for (const dim of dimensions) {
    const next: Record<string, string>[] = [];
    for (const comb of combinations) {
      for (const val of dim.values) {
        next.push({ ...comb, [dim.name]: val });
      }
    }
    combinations = next;
  }

  return combinations.map(options => ({
    title: dimensions.map(d => options[d.name]).filter(Boolean).join(" / "),
    options,
  }));
}

export function parseVariantsJson(raw: unknown): VariantFormInput[] {
  if (!raw) return [];
  let parsed: unknown;
  if (typeof raw === "string") {
    if (!raw.trim()) return [];
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new AdminFormError("El formato de variantes no es un JSON válido.");
    }
  } else {
    parsed = raw;
  }

  if (!Array.isArray(parsed)) {
    throw new AdminFormError("Las variantes deben ser una lista.");
  }

  const variants: VariantFormInput[] = [];
  const seenOptions = new Set<string>();

  parsed.forEach((rawItem, index) => {
    if (!rawItem || typeof rawItem !== "object") return;
    const v = rawItem as Record<string, unknown>;
    const title = String(v.title ?? "").trim();
    if (!title || title.length > 250) {
      throw new AdminFormError(`La variante en la fila ${index + 1} necesita un título válido.`);
    }

    const retailPrice = Number(v.retailPrice ?? 0);
    if (!Number.isFinite(retailPrice) || retailPrice < 0 || retailPrice > 9999999999.99) {
      throw new AdminFormError(`El precio de "${title}" no es válido.`);
    }

    const wholesalePrice = v.wholesalePrice !== undefined && v.wholesalePrice !== null ? Number(v.wholesalePrice) : 0;
    const stock = Number(v.stock ?? 0);
    if (!Number.isInteger(stock) || stock < 0 || stock > 1000000) {
      throw new AdminFormError(`El stock de "${title}" debe ser un número entero entre 0 y 1.000.000.`);
    }

    const fulfillmentMode = v.fulfillmentMode === "own_stock" ? "own_stock" : "supplier";
    const supplierAvailable = Boolean(v.supplierAvailable);
    const isActive = v.isActive !== false;
    const sku = v.sku ? String(v.sku).trim().slice(0, 100) : undefined;
    const imageUrl = v.imageUrl ? String(v.imageUrl).trim() : undefined;
    const rawOptions = v.options && typeof v.options === "object" ? (v.options as Record<string, unknown>) : {};
    const options: Record<string, string> = {};
    for (const [k, val] of Object.entries(rawOptions)) {
      if (val !== undefined && val !== null) options[k] = String(val).trim();
    }

    // Canonical key for uniqueness
    const optionKeys = Object.keys(options).sort();
    const canonicalKey = optionKeys.map(k => `${k}:${options[k]}`).join("|");
    if (canonicalKey) {
      if (seenOptions.has(canonicalKey)) {
        throw new AdminFormError(`Existe más de una variante con la misma combinación: ${title}.`);
      }
      seenOptions.add(canonicalKey);
    }

    variants.push({
      id: v.id ? String(v.id) : undefined,
      title,
      sku,
      retailPrice,
      wholesalePrice,
      stock,
      fulfillmentMode,
      supplierAvailable,
      imageUrl,
      isActive,
      options,
      displayOrder: typeof v.displayOrder === "number" ? v.displayOrder : index,
    });
  });

  return variants;
}
