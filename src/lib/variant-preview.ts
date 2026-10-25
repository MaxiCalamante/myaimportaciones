import type { ProductOptionDimension, ProductVariant } from "./types";

/** Published choices come from real active rows, including older option-config formats. */
export function resolveVariantDimensions(raw: unknown, variants: ProductVariant[], includeInactive = false): ProductOptionDimension[] {
  const configured = Array.isArray(raw) ? raw : raw && typeof raw === "object" && "attributes" in raw && Array.isArray(raw.attributes) ? raw.attributes : [];
  const actual = new Map<string, Set<string>>();
  for (const variant of variants) {
    if (!includeInactive && !variant.isActive) continue;
    for (const [name, value] of Object.entries(variant.options)) {
      if (!name.trim() || typeof value !== "string" || !value.trim()) continue;
      if (!actual.has(name)) actual.set(name, new Set());
      actual.get(name)!.add(value);
    }
  }
  const names = [...new Set([...configured.map(item => typeof item?.name === "string" ? item.name : "").filter(name => actual.has(name)), ...actual.keys()])];
  return names.map(name => ({ name, values: [...actual.get(name)!] }));
}

export function variantPreview(variants: ProductVariant[] = [], limit = 2) {
  const active = variants.filter(variant => variant.isActive).sort((a, b) => a.displayOrder - b.displayOrder || a.title.localeCompare(b.title, "es"));
  const unique = [...new Map(active.map(variant => [variant.id, variant])).values()];
  const bounded = Number.isFinite(limit) ? Math.max(0, Math.min(4, Math.floor(limit))) : 2;
  const items: ProductVariant[] = [];
  // Prefer distinct primary choices (e.g. colors) before repeating one with another capacity.
  const primary = Object.keys(unique[0]?.options || {})[0];
  for (const variant of unique) {
    if (items.length >= bounded) break;
    if (!primary || !items.some(item => item.options[primary] === variant.options[primary])) items.push(variant);
  }
  for (const variant of unique) {
    if (items.length >= bounded) break;
    if (!items.some(item => item.id === variant.id)) items.push(variant);
  }
  return { total: unique.length, items, remaining: unique.length - items.length };
}

export function productVariantHref(slug: string, variantId?: string) {
  return `/producto/${encodeURIComponent(slug)}${variantId ? `?${new URLSearchParams({ variant: variantId })}` : ""}`;
}
