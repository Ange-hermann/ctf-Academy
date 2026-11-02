import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/compte", "/admin", "/espace-etudiant", "/auth", "/api", "/design-system"],
    },
    sitemap: new URL("/sitemap.xml", siteConfig.url).toString(),
  };
}
