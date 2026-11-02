import type { MetadataRoute } from "next";
import { routes } from "@/config/navigation";
import { siteConfig } from "@/config/site";
import { formations } from "@/content/formations";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const urls: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
    { path: "/", priority: 1, changeFrequency: "weekly" },
    { path: routes.academy, priority: 0.95, changeFrequency: "weekly" },
    { path: routes.register, priority: 0.9, changeFrequency: "monthly" },
    { path: "/decouvrir", priority: 0.8, changeFrequency: "monthly" },
    { path: "/decouvrir/qui-sommes-nous", priority: 0.7, changeFrequency: "monthly" },
    { path: "/decouvrir/vision-mission", priority: 0.7, changeFrequency: "monthly" },
    { path: "/decouvrir/objectifs", priority: 0.7, changeFrequency: "monthly" },
    { path: "/decouvrir/valeurs", priority: 0.6, changeFrequency: "monthly" },
    { path: "/decouvrir/notre-eglise", priority: 0.6, changeFrequency: "monthly" },
    { path: "/formations", priority: 0.9, changeFrequency: "monthly" },
    { path: "/formations/durees-objectifs-tarifs", priority: 0.7, changeFrequency: "monthly" },
    { path: "/admissions", priority: 0.8, changeFrequency: "monthly" },
    { path: "/admissions/conditions", priority: 0.7, changeFrequency: "monthly" },
    { path: "/admissions/calendrier", priority: 0.7, changeFrequency: "weekly" },
    { path: "/admissions/frais-paiements", priority: 0.7, changeFrequency: "monthly" },
    { path: routes.faq, priority: 0.6, changeFrequency: "monthly" },
    { path: routes.photos, priority: 0.6, changeFrequency: "weekly" },
    { path: routes.videos, priority: 0.6, changeFrequency: "weekly" },
    { path: routes.events, priority: 0.7, changeFrequency: "weekly" },
  ];
  for (const f of formations) urls.push({ path: `/formations/${f.slug}`, priority: 0.8, changeFrequency: "monthly" });
  return urls.map((u) => ({ url: new URL(u.path, siteConfig.url).toString(), lastModified: now, changeFrequency: u.changeFrequency, priority: u.priority }));
}
