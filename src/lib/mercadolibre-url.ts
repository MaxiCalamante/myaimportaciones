/** Search is a starting point, never evidence of an exact match. */
export function buildMercadoLibreSearchUrl(title: string, brand?: string, model?: string): string {
  const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  let query = title.replace(/^PERF\s+(TESTER\s+)?(?:FEM|MASC|UNI)\s+/i, (_match, tester) => tester ? "perfume tester " : "perfume ").trim();
  for (const term of [brand, model]) {
    if (term?.trim() && !normalize(query).includes(normalize(term.trim()))) query += ` ${term.trim()}`;
  }
  const slug = normalize(query).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `https://listado.mercadolibre.com.ar/${slug || "productos"}`;
}

/** Accept only concrete Argentine item/catalog URLs, not a search or arbitrary host. */
export function isMercadoLibreProductUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port) return false;
    if (url.hostname === "articulo.mercadolibre.com.ar") return /\/MLA-?\d{6,}/i.test(url.pathname);
    if (url.hostname === "www.mercadolibre.com.ar" || url.hostname === "mercadolibre.com.ar") {
      return /\/(?:p|up)\/MLA(?:U)?\d{6,}(?:\/|$)/i.test(url.pathname);
    }
    return false;
  } catch { return false; }
}
