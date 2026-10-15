import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/api/catalog/google-feed", "/api/catalog/meta-feed"],
        disallow: ["/admin", "/login", "/register", "/favoritos", "/auth/", "/checkout", "/cuenta", "/seguimiento", "/mayorista", "/api/"],
      },
    ],
    sitemap: `${siteConfig.appUrl}/sitemap.xml`,
  };
}
