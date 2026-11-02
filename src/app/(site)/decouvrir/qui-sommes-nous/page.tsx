import Link from "next/link";
import { CtaBlock } from "@/components/layout/cta-block";
import { PageHero } from "@/components/layout/page-hero";
import { KeyFigures } from "@/components/sections/counters";
import { Timeline } from "@/components/sections/timeline";
import { Button } from "@/components/ui/button";
import { SectionTitle } from "@/components/ui/section-title";
import { about, keyFigures, timeline } from "@/content/church";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Qui sommes-nous ?",
  description:
    "CTF ACADEMY est la plateforme de formation du Centre de Transformation des Familles : former des disciples-adorateurs qui servent avec excellence.",
  path: "/decouvrir/qui-sommes-nous",
});

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="Découvrir CTF"
        title={
          <>
            Qui <em>sommes-nous</em> ?
          </>
        }
        intro={about.intro}
        breadcrumb={[
          { label: "Découvrir CTF", href: "/decouvrir" },
          { label: "Qui sommes-nous ?", href: "/decouvrir/qui-sommes-nous" },
        ]}
      >
        <Button asChild size="lg" variant="outline">
          <Link href="/decouvrir/vision-mission">Notre vision et mission</Link>
        </Button>
      </PageHero>

      <section className="px-5 py-20 sm:px-8">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1fr_1.2fr]">
          <SectionTitle align="left" eyebrow="Notre identité" title={<>Une Église qui <em>forme</em></>} />
          <div className="space-y-5 text-lg text-blanc/75">
            {about.paragraphs.map((p) => (
              <p key={p}>{p}</p>
            ))}
            <p className="rounded-2xl border border-or/25 bg-or/5 p-5 text-blanc/85">
              <strong className="font-display tracking-wide text-or-light">Notre mission — </strong>
              {about.mission}
            </p>
          </div>
        </div>
      </section>

      <section className="px-5 py-16 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <KeyFigures items={keyFigures} />
        </div>
      </section>

      <section className="px-5 py-20 sm:px-8">
        <SectionTitle eyebrow="Notre histoire" title={<>Un chemin de <em>fidélité</em></>} className="mb-16" />
        <Timeline items={timeline} />
      </section>

      <CtaBlock />
    </>
  );
}
