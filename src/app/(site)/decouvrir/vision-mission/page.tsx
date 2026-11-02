import Link from "next/link";
import { CtaBlock } from "@/components/layout/cta-block";
import { PageHero } from "@/components/layout/page-hero";
import { VisionCinematic } from "@/components/sections/vision-cinematic";
import { Button } from "@/components/ui/button";
import { SectionTitle } from "@/components/ui/section-title";
import { about } from "@/content/church";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Notre vision et mission",
  description:
    "La Vision du Centre de Transformation des Familles : former une armée de disciples-adorateurs de Jésus. Découvrez nos 5 mots clés et nos 5 objectifs.",
  path: "/decouvrir/vision-mission",
});

export default function VisionMissionPage() {
  return (
    <>
      <PageHero
        eyebrow="Découvrir CTF"
        title={
          <>
            Notre vision et <em>mission</em>
          </>
        }
        intro="Une Vision, cinq mots clés et cinq objectifs : la boussole de chaque formation de CTF ACADEMY."
        breadcrumb={[
          { label: "Découvrir CTF", href: "/decouvrir" },
          { label: "Notre vision et mission", href: "/decouvrir/vision-mission" },
        ]}
      >
        <Button asChild size="lg" variant="outline">
          <Link href="/decouvrir/valeurs">Nos valeurs</Link>
        </Button>
      </PageHero>

      <VisionCinematic />

      <section className="px-5 py-24 sm:px-8">
        <div className="mx-auto max-w-4xl rounded-3xl border border-or/25 bg-gradient-card p-8 text-center shadow-gold sm:p-14">
          <SectionTitle eyebrow="Notre mission" title={<>Former, accompagner, <em>envoyer</em></>} />
          <p className="mx-auto mt-6 max-w-2xl text-lg text-blanc/75">{about.mission}</p>
        </div>
      </section>

      <CtaBlock emblem={false} />
    </>
  );
}
