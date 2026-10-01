/** Use the primary product's offer, never prices or stock from related cards.
 * Country-specific prices omit/include taxes and may be USD or guaranies.
 * Availability checks therefore leave the reviewed purchase quote untouched.
 */
export function parseTotalAvailability(html: string, sku?: string | null) {
  const products: Record<string, unknown>[] = [];
  const collect = (value: unknown) => {
    if (Array.isArray(value)) { value.forEach(collect); return; }
    if (!value || typeof value !== "object") return;
    const item = value as Record<string, unknown>;
    if (item["@type"] === "Product") products.push(item);
    if (item["@graph"]) collect(item["@graph"]);
  };
  for (const match of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { collect(JSON.parse(match[1])); } catch { /* Ignore unrelated invalid metadata. */ }
  }
  const product = sku
    ? products.find(item => String(item.productID ?? item.sku ?? "") === sku.trim())
    : products.length === 1 ? products[0] : undefined;
  const offer = product?.offers;
  const availability = offer && typeof offer === "object" && !Array.isArray(offer)
    ? String((offer as Record<string, unknown>).availability ?? "").toLowerCase().replace(/[\s_-]/g, "")
    : "";
  if (availability === "instock" || availability.endsWith("/instock")) {
    return { available: true, status: "in_stock" as const, livePrice: null, currency: null,
      message: "Disponible en Total Tools; costo según cotización validada. Cantidad a confirmar." };
  }
  if (availability === "outofstock" || availability.endsWith("/outofstock") || availability.endsWith("/soldout")) {
    return { available: false, status: "out_of_stock" as const, livePrice: null, currency: null,
      message: "Sin existencias en Total Tools" };
  }
  return { available: false, status: "error" as const, livePrice: null, currency: null,
    message: "No se pudo confirmar disponibilidad del producto en Total Tools" };
}
