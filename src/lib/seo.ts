import type { Metadata } from "next";
import { siteConfig } from "@/config/site";

/** Métadonnées complètes d'une page : titre, description, canonique, Open Graph, Twitter. */
export function pageMetadata({
  title,
  description,
  path,
  noIndex = false,
}: {
  title: string;
  description: string;
  path: string;
  noIndex?: boolean;
}): Metadata {
  const fullTitle = `${title} · ${siteConfig.name}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    robots: noIndex ? { index: false, follow: false } : undefined,
    openGraph: {
      type: "website",
      locale: siteConfig.locale,
      siteName: siteConfig.name,
      url: path,
      title: fullTitle,
      description,
    },
    twitter: { card: "summary_large_image", title: fullTitle, description },
  };
}
