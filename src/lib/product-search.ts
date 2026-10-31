/** Shared matching for autocomplete and catalog. No database query syntax comes from input. */
export type SearchProduct = {
  id: string;
  title: string;
  brand?: string | null;
  model?: string | null;
  sku?: string | null;
  tags?: string[] | null;
  product_variants?: { title: string; sku?: string | null; is_active?: boolean | null; options?: Record<string, string> | null }[] | null;
};

export function normalizeProductSearch(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("es")
    .replace(/[^\p{L}\p{N}]+/gu, " ").trim().replace(/\s+/g, " ");
}

function termMatches(term: string, text: string): boolean {
  if (text.includes(term) || text.replace(/ /g, "").includes(term.replace(/ /g, ""))) return true;
  const singular = term.length > 4 && term.endsWith("s") ? term.slice(0, -1) : term;
  return singular !== term && text.includes(singular);
}

export function rankProductSearch<T extends SearchProduct>(products: T[], query: string): T[] {
  const normalized = normalizeProductSearch(query.slice(0, 100));
  if (!normalized) return [];
  const terms = [...new Set(normalized.split(" "))];
  const identifiers = [...query.matchAll(/\b[a-z]+\s*\d+(?:-\d+)+\b/gi)].map(match => normalizeProductSearch(match[0]).replace(/ /g, ""));
  if (/^[a-z]{1,8}\s*\d{3,}(?:[\s-]+\d+)*$/i.test(query.trim())) identifiers.push(normalized.replace(/ /g, ""));
  return products.map(product => {
    const title = normalizeProductSearch(product.title);
    const brand = normalizeProductSearch(product.brand ?? "");
    const identifiersByField = [normalizeProductSearch(product.model ?? ""), normalizeProductSearch(product.sku ?? "")];
    const model = identifiersByField.join(" ");
    const variants = (product.product_variants ?? []).filter(v => v.is_active !== false)
      .map(v => `${v.title} ${v.sku ?? ""} ${Object.values(v.options ?? {}).join(" ")}`).join(" ");
    const text = [title, brand, model, normalizeProductSearch((product.tags ?? []).join(" ")), normalizeProductSearch(variants)].join(" ");
    if (!identifiers.every(identifier => text.replace(/ /g, "").includes(identifier))) return { product, score: 0 };
    if (!terms.every(term => termMatches(term, text))) return { product, score: 0 };
    const score = 1 + (title === normalized ? 120 : title.startsWith(normalized) ? 60 : title.includes(normalized) ? 35 : 0)
      + (identifiersByField.some(field => field.replace(/ /g, "") === normalized.replace(/ /g, "")) ? 100 : 0)
      + terms.reduce((sum, term) => sum + (termMatches(term, model) ? 12 : termMatches(term, brand) ? 10 : termMatches(term, title) ? 6 : 1), 0);
    return { product, score };
  }).filter(match => match.score > 0)
    .sort((a, b) => b.score - a.score || a.product.title.localeCompare(b.product.title, "es") || a.product.id.localeCompare(b.product.id))
    .map(match => match.product);
}
