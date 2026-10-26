/**
 * Construye una URL de búsqueda directa en Mercado Libre Argentina para un producto dado.
 * Seguro para importar tanto en Server Components como en Client Components.
 */
export function buildMercadoLibreSearchUrl(title: string, brand?: string, model?: string): string {
  let clean = (title || "")
    .replace(/^PERF\s+(?:TESTER\s+)?(?:FEM|MASC|UNI)\s+/i, "")
    .replace(/\b(original|oficial|nuevo|nueva|sellado|sellada)\b/gi, "")
    .replace(/[^\w\s\d.-]/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

  if (brand && !clean.toLowerCase().includes(brand.toLowerCase())) {
    clean = `${brand} ${clean}`;
  }

  const slug = clean
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return `https://listado.mercadolibre.com.ar/${slug || "productos"}_NoIndex_True`;
}
