import type { Product } from "./types";
import { isVerifiedStock } from "./commerce-policy";
import { productCondition, productDescription, publicUrl } from "./seo";
import { canonicalProductSlug, PRODUCT_CANONICAL_ALIASES } from "./seo-product-aliases";
import { verifiedGtin } from "./product-identifiers";
export { verifiedGtin } from "./product-identifiers";

export function escapeXml(value: string) { return value.replace(/[<>&'"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!); }
export function merchantFeed(products: Product[], checkoutEnabled: boolean) {
  const field = (key: string, value: string) => `<g:${key}>${escapeXml(value)}</g:${key}>`;
  const publicProducts = products.filter(p => p.active && !p.wholesaleOnly && p.retailPrice > 0 && p.imageUrl);
  const bySlug = new Map(publicProducts.map(p => [p.slug, p]));
  const items = (checkoutEnabled ? publicProducts : []).filter(p => canonicalProductSlug(p, bySlug.get(PRODUCT_CANONICAL_ALIASES[p.slug])) === p.slug).map(p => {
    const gtin = verifiedGtin(p.specifications?.GTIN || p.specifications?.EAN || p.specifications?.UPC);
    const mpn = p.specifications?.MPN;
    return `<item>${field("id", p.id)}${field("title", p.title)}${field("description", p.description || productDescription(p))}${field("link", publicUrl(`/producto/${p.slug}`))}${field("image_link", publicUrl(p.imageUrl))}${field("condition", productCondition(p))}${field("availability", isVerifiedStock(p) ? "in_stock" : "out_of_stock")}${field("price", `${p.retailPrice.toFixed(2)} ARS`)}${p.brand ? field("brand", p.brand) : ""}${field("product_type", p.categoryName)}${gtin ? field("gtin", gtin) : ""}${mpn ? field("mpn", mpn) : ""}</item>`;
  }).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:g="http://base.google.com/ns/1.0"><channel><title>MYA Importaciones — Catálogo</title><link>${publicUrl()}</link><description>Productos y disponibilidad del catálogo de MYA Importaciones.</description>${items}</channel></rss>`;
}
