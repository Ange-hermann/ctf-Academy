import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CtaBlock } from "@/components/layout/cta-block";
import { PageHero } from "@/components/layout/page-hero";
import { GlassCard3D } from "@/components/ui/glass-card-3d";
import type { NavSection } from "@/config/navigation";

/** Page d'accueil d'une rubrique (Découvrir, Formations, Admissions, Compte) : liens vers ses pages. */
export function SectionHub({ section, eyebrow, intro }: { section: NavSection; eyebrow: string; intro: string }) {
  return (
    <>
      <PageHero
        eyebrow={eyebrow}
        title={section.label}
        intro={intro}
        breadcrumb={[{ label: section.label, href: section.href }]}
      />
      <section className="px-5 py-20 sm:px-8">
        <ul className="mx-auto grid max-w-6xl gap-5 sm:grid-cols-2">
          {section.children.map((link, i) => (
            <li key={link.href}>
              <GlassCard3D className="p-0">
                <Link href={link.href} className="flex h-full min-h-40 flex-col justify-between gap-6 rounded-2xl p-7">
                  <span className="font-display text-sm text-or/70">0{i + 1}</span>
                  <span>
                    <span className="block font-display text-2xl tracking-wide text-blanc">{link.label}</span>
                    {link.description && <span className="mt-2 block text-blanc/65">{link.description}</span>}
                  </span>
                  <span className="inline-flex items-center gap-2 font-semibold text-or-light">
                    Ouvrir <ArrowRight aria-hidden className="size-4 transition-transform group-hover/card:translate-x-1" />
                  </span>
                </Link>
              </GlassCard3D>
            </li>
          ))}
        </ul>
      </section>
      <CtaBlock />
    </>
  );
}
