import type { MetadataRoute } from "next";
import { publicUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/api/catalog/google-feed", "/api/catalog/meta-feed"],
        disallow: ["/admin", "/auth/", "/api/"],
      },
    ],
    sitemap: publicUrl("/sitemap.xml"),
  };
}
