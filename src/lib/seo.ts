import type { Metadata } from "next";
import type { Category, Product } from "./types";
import { OFFICIAL_ORIGIN } from "./site-origin";
import { isVerifiedStock } from "./commerce-policy";
import { verifiedGtin } from "./product-identifiers";

export function publicUrl(path = "/") { return new URL(path, OFFICIAL_ORIGIN).href; }
export function jsonLd(value: unknown) { return JSON.stringify(value).replace(/</g, "\\u003c"); }
export function concise(value: string, max = 165) {
  const clean = value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const clipped = clean.slice(0, max - 1);
  return clipped.slice(0, clipped.lastIndexOf(" ") > max * .7 ? clipped.lastIndexOf(" ") : max - 1) + "…";
}
export function pageMetadata({ title, description, path, image = "/compartir", index = true }: { title: string; description: string; path: string; image?: string; index?: boolean }): Metadata {
  const fullTitle = title.includes("MYA Importaciones") ? title : `${title} | MYA Importaciones`;
  return { title: { absolute: fullTitle }, description, alternates: { canonical: publicUrl(path) }, robots: { index, follow: true },
    openGraph: { title: fullTitle, description, url: publicUrl(path), type: "website", locale: "es_AR", siteName: "MYA Importaciones", images: [{ url: publicUrl(image), alt: title }] },
    twitter: { card: "summary_large_image", title: fullTitle, description, images: [publicUrl(image)] } };
}
export function productDescription(product: Product) {
  const facts = Object.entries(product.specifications || {}).filter(([key, value]) => value && !/url|proveedor|costo|seo/i.test(key)).slice(0, 3).map(([key, value]) => `${key.replaceAll("_", " ")}: ${value}`).join(". ");
  const raw = product.description && !/^Consultá la presentación/.test(product.description) ? product.description : facts;
  const text = raw.toLocaleLowerCase("es-AR").startsWith(product.title.toLocaleLowerCase("es-AR")) ? raw.slice(product.title.length).replace(/^[\s.,:;]+/, "") : raw;
  return concise(`${product.title}. ${text ? text + " " : ""}Consultá disponibilidad y comprá con envíos a Argentina.`);
}
export function productMetadata(product: Product, canonicalSlug = product.slug): Metadata {
  return { ...pageMetadata({ title: product.specifications?._seo_title || product.title, description: product.specifications?._seo_description || productDescription(product), path: `/producto/${canonicalSlug}`, image: product.imageUrl || "/compartir" }), other: { "product:price:amount": String(product.retailPrice), "product:price:currency": "ARS" } };
}
export function productCondition(product: Product) {
  const condition = product.specifications?.["Condición"] || "";
  if (/CPO|reacondicionado|refurbish/i.test(condition)) return "refurbished";
  if (/activado|usado|used|segunda mano/i.test(condition)) return "used";
  return "new";
}
export function productStructuredData(product: Product) {
  const condition = { new: "NewCondition", used: "UsedCondition", refurbished: "RefurbishedCondition" }[productCondition(product)];
  const mpn = product.specifications?.MPN;
  const gtin = verifiedGtin(product.specifications?.GTIN || product.specifications?.EAN || product.specifications?.UPC);
  const gtinData: Partial<Record<`gtin${8 | 12 | 13 | 14}`, string>> = gtin ? { [`gtin${gtin.length}`]: gtin } : {};

  const activeVariants = product.variants?.filter(v => v.isActive) || [];

  let offers: Record<string, unknown> | undefined = undefined;

  if (product.hasVariants && activeVariants.length > 0) {
    const prices = activeVariants.map(v => v.retailPrice).filter(p => p > 0);
    const lowPrice = prices.length ? Math.min(...prices) : product.retailPrice;
    const highPrice = prices.length ? Math.max(...prices) : product.retailPrice;
    offers = {
      "@type": "AggregateOffer",
      url: publicUrl(`/producto/${product.slug}`),
      priceCurrency: "ARS",
      lowPrice,
      highPrice,
      offerCount: activeVariants.length,
      offers: activeVariants.map(v => ({
        "@type": "Offer",
        name: `${product.title} - ${v.title}`,
        price: v.retailPrice,
        priceCurrency: "ARS",
        availability: `https://schema.org/${isVerifiedStock(v) ? "InStock" : "OutOfStock"}`,
        itemCondition: `https://schema.org/${condition}`,
        ...(v.sku ? { sku: v.sku } : {}),
        url: publicUrl(`/producto/${product.slug}`),
        seller: { "@id": publicUrl("/#organization"), "@type": "Organization", name: "MYA Importaciones" }
      }))
    };
  } else if (product.retailPrice > 0) {
    offers = {
      "@type": "Offer",
      url: publicUrl(`/producto/${product.slug}`),
      price: product.retailPrice,
      priceCurrency: "ARS",
      availability: `https://schema.org/${isVerifiedStock(product) ? "InStock" : "OutOfStock"}`,
      itemCondition: `https://schema.org/${condition}`,
      seller: { "@id": publicUrl("/#organization"), "@type": "Organization", name: "MYA Importaciones" }
    };
  }

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": publicUrl(`/producto/${product.slug}#product`),
    name: product.title,
    description: productDescription(product),
    image: [...new Set([product.imageUrl, ...(product.imageUrls || [])].filter(Boolean))].map(publicUrl),
    ...(product.sku ? { sku: product.sku } : {}),
    ...(mpn ? { mpn } : {}),
    ...gtinData,
    ...(product.brand ? { brand: { "@type": "Brand", name: product.brand } } : {}),
    ...(offers ? { offers } : {})
  };
}
export type CatalogParams = { q?: string; category?: string; page?: string; sort?: string; brand?: string; family?: string; min?: string; max?: string };
export function normalizeCatalogParams(input: Record<string, string | string[] | undefined>): CatalogParams {
  return Object.fromEntries(["q", "category", "page", "sort", "brand", "family", "min", "max"].filter(key => typeof input[key] === "string").map(key => [key, (input[key] as string).trim().slice(0, 200)]));
}
export function catalogSeo(params: CatalogParams, categories: Category[], brands: string[]) {
  const category = categories.find(c => c.slug === params.category), brand = brands.find(b => b === params.brand);
  const page = Math.min(200, Math.max(1, Number.parseInt(params.page || "1") || 1));
  const query = new URLSearchParams();
  for (const key of ["category", "brand", "q", "family", "min", "max"] as const) if (params[key]?.trim()) query.set(key, params[key]!.trim().slice(0, 100));
  if (page > 1) query.set("page", String(page));
  const path = `/catalogo${query.size ? `?${query}` : ""}`;
  const filtered = Boolean(params.q || params.family || params.min || params.max || params.sort || (params.category && params.brand));
  const valid = (!params.category || Boolean(category)) && (!params.brand || Boolean(brand));
  const label = category?.name || (brand ? `Productos ${brand}` : "Catálogo de productos");
  const title = `${params.q ? `Búsqueda: ${concise(params.q, 65)}` : label + " en Argentina"}${page > 1 ? ` · Página ${page}` : ""}`;
  const description = concise(category?.description ? `${category.name}: ${category.description} Precios en pesos y envíos a Argentina.` : brand ? `Explorá ${brand} en MYA Importaciones. Consultá las presentaciones, modelos y disponibilidad del catálogo, con precios en pesos y envíos a toda Argentina.` : "Explorá cosmética, cuidado capilar, tecnología y herramientas. Consultá precios en pesos, disponibilidad y envíos a toda Argentina.");
  return { path, index: valid && !filtered, title, description, category, brand, page };
}
export function breadcrumbData(items: { name: string; path: string }[]) { return { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: items.map((item, i) => ({ "@type": "ListItem", position: i + 1, name: item.name, item: publicUrl(item.path) })) }; }
