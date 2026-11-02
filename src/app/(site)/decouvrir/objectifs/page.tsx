import { CtaBlock } from "@/components/layout/cta-block";
import { PageHero } from "@/components/layout/page-hero";
import { ObjectivesBeams } from "@/components/sections/objectives-beams";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Objectif de l'église",
  description:
    "Les cinq objectifs du Centre de Transformation des Familles : cinq rayons d'une même lumière qui guident chacune des formations de CTF ACADEMY.",
  path: "/decouvrir/objectifs",
});

export default function ObjectifsPage() {
  return (
    <>
      <PageHero
        eyebrow="Découvrir CTF"
        title={
          <>
            Objectif de l&apos;<em>église</em>
          </>
        }
        intro="Cinq objectifs, cinq rayons d'une même lumière : ce qui guide chaque formation de CTF ACADEMY."
        breadcrumb={[
          { label: "Découvrir CTF", href: "/decouvrir" },
          { label: "Objectif de l'église", href: "/decouvrir/objectifs" },
        ]}
      />

      <ObjectivesBeams />

      <CtaBlock />
    </>
  );
}
