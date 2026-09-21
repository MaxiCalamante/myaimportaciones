import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/auth/", "/checkout", "/cuenta", "/seguimiento", "/mayorista", "/api/"],
      },
    ],
    sitemap: `${siteConfig.appUrl}/sitemap.xml`,
  };
}
