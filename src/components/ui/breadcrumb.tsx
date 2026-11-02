import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { siteConfig } from "@/config/site";
import { JsonLd } from "@/components/seo/json-ld";

export type Crumb = { label: string; href: string };

/** Fil d'Ariane + données structurées BreadcrumbList. Le dernier élément est la page courante. */
export function Breadcrumb({ items }: { items: Crumb[] }) {
  const all = [{ label: "Accueil", href: "/" }, ...items];
  return (
    <nav aria-label="Fil d'Ariane">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-blanc/60">
        {all.map((c, i) => {
          const last = i === all.length - 1;
          return (
            <li key={c.href} className="flex items-center gap-1.5">
              {last ? (
                <span aria-current="page" className="text-or-light">
                  {c.label}
                </span>
              ) : (
                <>
                  <Link href={c.href} className="rounded py-2 hover:text-or-light">
                    {c.label}
                  </Link>
                  <ChevronRight aria-hidden className="size-3.5 text-or/60" />
                </>
              )}
            </li>
          );
        })}
      </ol>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: all.map((c, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: c.label,
            item: new URL(c.href, siteConfig.url).toString(),
          })),
        }}
      />
    </nav>
  );
}
