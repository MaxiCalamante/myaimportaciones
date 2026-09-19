import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { demoCategories, demoProducts } from "@/lib/demo-data";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = siteConfig.appUrl;

  let categories: Array<{ slug: string }> = [];
  let products: Array<{ slug: string; updated_at?: string }> = [];

  if (hasSupabaseConfig()) {
    try {
      const supabase = await createServerSupabaseClient();
      const [{ data: cats }, { data: prods }] = await Promise.all([
        supabase.from("categories").select("slug"),
        supabase
          .from("products")
          .select("slug, updated_at")
          .eq("is_active", true)
          .range(0, 5000),
      ]);
      categories = cats || [];
      products = prods || [];
    } catch {
      categories = demoCategories.map((c) => ({ slug: c.slug }));
      products = demoProducts.map((p) => ({ slug: p.slug }));
    }
  } else {
    categories = demoCategories.map((c) => ({ slug: c.slug }));
    products = demoProducts.map((p) => ({ slug: p.slug }));
  }

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
      url: `${baseUrl}/seguimiento`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
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
    lastModified: product.updated_at ? new Date(product.updated_at) : new Date(),
    changeFrequency: "daily",
    priority: 0.85,
  }));

  return [...staticRoutes, ...categoryRoutes, ...productRoutes];
}
