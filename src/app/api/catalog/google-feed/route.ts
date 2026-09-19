import { NextResponse } from "next/server";
import { getStorefrontData } from "@/lib/storefront";
import { siteConfig } from "@/lib/site";

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      case "'":
        return "&apos;";
      case '"':
        return "&quot;";
      default:
        return c;
    }
  });
}

function extractBrand(title: string, categoryName: string, tags: string[] = []): string {
  const t = `${title} ${tags.join(" ")}`.toLowerCase();
  if (t.includes("total") || t.includes("total tools")) return "Total Tools";
  if (t.includes("wadfow")) return "Wadfow";
  if (t.includes("apple") || t.includes("iphone")) return "Apple";
  if (t.includes("skin1004") || t.includes("centella")) return "SKIN1004";
  if (t.includes("medicube")) return "Medicube";
  if (t.includes("dr althea") || t.includes("dr. althea")) return "Dr. Althea";
  if (t.includes("celimax")) return "Celimax";
  if (t.includes("karseell")) return "Karseell";
  if (t.includes("anua")) return "Anua";
  if (t.includes("torriden")) return "Torriden";
  if (t.includes("beauty of joseon")) return "Beauty of Joseon";
  if (t.includes("cosrx")) return "COSRX";
  if (categoryName.toLowerCase().includes("herramientas")) return "Total Tools";
  if (categoryName.toLowerCase().includes("tecnología")) return "Apple";
  return "MYA Importaciones";
}

export async function GET() {
  const { products } = await getStorefrontData();
  const baseUrl = siteConfig.appUrl.replace(/\/$/, "");

  const itemsXml = products
    .map((p) => {
      const link = `${baseUrl}/producto/${p.slug}`;
      const imgLink = p.imageUrl?.startsWith("http") ? p.imageUrl : `${baseUrl}${p.imageUrl}`;
      const availability = p.stock > 0 ? "in_stock" : "out_of_stock";
      const brand = extractBrand(p.title, p.categoryName, p.tags);
      const cleanDesc = p.description
        ? escapeXml(p.description.substring(0, 5000))
        : escapeXml(`${p.title} - Importación directa en Argentina por MYA Importaciones.`);

      return `    <item>
      <g:id>${escapeXml(p.id)}</g:id>
      <g:title>${escapeXml(p.title)}</g:title>
      <g:description>${cleanDesc}</g:description>
      <g:link>${escapeXml(link)}</g:link>
      <g:image_link>${escapeXml(imgLink)}</g:image_link>
      <g:condition>new</g:condition>
      <g:availability>${availability}</g:availability>
      <g:price>${p.retailPrice.toFixed(2)} ARS</g:price>
      <g:brand>${escapeXml(brand)}</g:brand>
      <g:google_product_category>${escapeXml(p.categoryName)}</g:google_product_category>
      <g:identifier_exists>no</g:identifier_exists>
      <g:shipping>
        <g:country>AR</g:country>
        <g:service>Correo Argentino / Andreani</g:service>
        <g:price>5900.00 ARS</g:price>
      </g:shipping>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>MYA Importaciones - Google Merchant Center Feed</title>
    <link>${escapeXml(baseUrl)}</link>
    <description>Catálogo de productos oficial para Google Shopping y Google Ads de MYA Importaciones.</description>
${itemsXml}
  </channel>
</rss>`;

  return new NextResponse(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
