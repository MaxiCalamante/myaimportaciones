import type { MetadataRoute } from "next";
import { getStorefrontData } from "@/lib/storefront";
import { siteConfig } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = siteConfig.appUrl;
  const { categories, products } = await getStorefrontData();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/mayorista`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/cuenta`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.5,
    },
  ];

  const categoryRoutes: MetadataRoute.Sitemap = categories.map((category) => ({
    url: `${baseUrl}/?category=${category.slug}`,
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 0.8,
  }));

  const productRoutes: MetadataRoute.Sitemap = products.map((product) => ({
    url: `${baseUrl}/producto/${product.slug}`,
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 0.85,
  }));

  return [...staticRoutes, ...categoryRoutes, ...productRoutes];
}
