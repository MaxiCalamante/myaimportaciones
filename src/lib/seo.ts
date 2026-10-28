import type { Metadata } from "next";
import type { Category, Product } from "./types";
import { OFFICIAL_ORIGIN } from "./site-origin";
import { isVerifiedStock } from "./commerce-policy";
import { verifiedGtin } from "./product-identifiers";
import { retailContent } from "./retail-content";
import { productVariantHref } from "./variant-preview";

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
  const imgUrl = publicUrl(image);
  return {
    title: { absolute: fullTitle },
    description,
    alternates: { canonical: publicUrl(path) },
    robots: { index, follow: true },
    openGraph: {
      title: fullTitle,
      description,
      url: publicUrl(path),
      type: "website",
      locale: "es_AR",
      siteName: "MYA Importaciones",
      images: [
        {
          url: imgUrl,
          width: 1200,
          height: 630,
          alt: title,
          type: "image/png",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [imgUrl],
    },
  };
}
export function productDescription(product: Product) {
  const facts = Object.entries(product.specifications || {}).filter(([key, value]) => value && !/url|proveedor|costo|seo/i.test(key)).slice(0, 3).map(([key, value]) => `${key.replaceAll("_", " ")}: ${value}`).join(". ");
  const raw = product.description && !/^Consultá la presentación/.test(product.description) ? product.description : facts;
  const text = raw.toLocaleLowerCase("es-AR").startsWith(product.title.toLocaleLowerCase("es-AR")) ? raw.slice(product.title.length).replace(/^[\s.,:;]+/, "") : raw;
  return concise(`${product.title}. ${text ? text + " " : ""}Consultá disponibilidad y comprá con envíos a Argentina.`);
}
export function buildProductShareImageUrl(product: {
  slug?: string;
  title?: string;
  retailPrice?: number;
  brand?: string;
  categoryName?: string;
  imageUrl?: string;
}): string {
  const sp = new URLSearchParams();
  sp.set("tipo", "producto");
  if (product.slug) sp.set("slug", product.slug);
  if (product.title) sp.set("titulo", product.title);
  if (product.retailPrice && product.retailPrice > 0) sp.set("precio", String(product.retailPrice));
  if (product.brand) sp.set("marca", product.brand);
  if (product.categoryName) sp.set("cat", product.categoryName);
  if (product.imageUrl) sp.set("img", product.imageUrl);
  return `/compartir?${sp.toString()}`;
}
export function buildCatalogShareImageUrl(seo: {
  category?: Category;
  brand?: string;
  title?: string;
  description?: string;
}): string {
  const sp = new URLSearchParams();
  if (seo.category) {
    sp.set("tipo", "categoria");
    sp.set("cat", seo.category.name);
    sp.set("slug", seo.category.slug);
    if (seo.category.description) sp.set("desc", concise(seo.category.description, 140));
  } else if (seo.brand) {
    sp.set("tipo", "categoria");
    sp.set("marca", seo.brand);
    sp.set("cat", `Productos ${seo.brand}`);
  } else {
    sp.set("tipo", "catalogo");
    sp.set("cat", "Catálogo Completo");
  }
  return `/compartir?${sp.toString()}`;
}
export function productMetadata(product: Product, canonicalSlug = product.slug): Metadata {
  const shareImage = buildProductShareImageUrl(product);
  const title = product.specifications?._seo_title || product.title;
  const description = product.specifications?._seo_description || productDescription(product);
  const path = `/producto/${canonicalSlug}`;
  const base = pageMetadata({
    title,
    description,
    path,
    image: shareImage,
  });

  return {
    ...base,
    openGraph: {
      ...base.openGraph,
      images: [
        {
          url: publicUrl(shareImage),
          width: 1200,
          height: 630,
          alt: `${product.title} | MYA Importaciones`,
          type: "image/png",
        },
        ...(product.imageUrl
          ? [
              {
                url: publicUrl(product.imageUrl),
                alt: product.title,
              },
            ]
          : []),
      ],
    },
    other: {
      "product:price:amount": String(product.retailPrice),
      "product:price:currency": "ARS",
      ...(product.brand ? { "product:brand": product.brand } : {}),
      ...(product.categoryName ? { "product:category": product.categoryName } : {}),
    },
  };
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

  const activeVariants = product.variants?.filter(v => v.isActive && Number.isFinite(v.retailPrice) && v.retailPrice > 0) || [];

  let offers: Record<string, unknown> | undefined = undefined;

  if (product.hasVariants && activeVariants.length > 0) {
    const prices = activeVariants.map(v => v.retailPrice);
    const lowPrice = Math.min(...prices);
    const highPrice = Math.max(...prices);
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
        url: publicUrl(productVariantHref(product.slug, v.id)),
        seller: { "@id": publicUrl("/#organization"), "@type": "Organization", name: "MYA Importaciones" }
      }))
    };
  } else if (!product.hasVariants && Number.isFinite(product.retailPrice) && product.retailPrice > 0) {
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
  const editorial = !filtered && valid ? retailContent(category?.slug, brand) : undefined;
  const title = `${params.q ? `Búsqueda: ${concise(params.q, 65)}` : editorial?.title || label + " en Argentina"}${page > 1 ? ` · Página ${page}` : ""}`;
  const description = editorial?.description || concise(category?.description ? `${category.name}: ${category.description} Precios en pesos y envíos a toda Argentina.` : brand ? `Explorá ${brand} en MYA Importaciones. Consultá las presentaciones, modelos y disponibilidad del catálogo, con precios en pesos y envíos a toda Argentina.` : "Explorá cosmética, cuidado capilar, tecnología y herramientas. Consultá precios en pesos, disponibilidad y envíos a toda Argentina.");
  const image = buildCatalogShareImageUrl({ category, brand, title, description });
  return { path, index: valid && !filtered, title, description, category, brand, page, image, editorial };
}
export function breadcrumbData(items: { name: string; path: string }[]) { return { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: items.map((item, i) => ({ "@type": "ListItem", position: i + 1, name: item.name, item: publicUrl(item.path) })) }; }
