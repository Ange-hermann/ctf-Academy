import Link from "next/link";
import { CtaBlock } from "@/components/layout/cta-block";
import { PageHero } from "@/components/layout/page-hero";
import { FormationCard } from "@/components/sections/formation-card";
import { Button } from "@/components/ui/button";
import { routes } from "@/config/navigation";
import { formations } from "@/content/formations";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Nos formations",
  description:
    "École des STAFs (EDS), École des Disciples Mentors (EDM), formation des diacres et École de pastorale : les formations de CTF ACADEMY, Centre de Transformation des Familles.",
  path: "/formations",
});

export default function FormationsPage() {
  return (
    <>
      <PageHero
        eyebrow="Nos formations"
        title={
          <>
            Quatre parcours pour <em>grandir et servir</em>
          </>
        }
        intro="Chaque formation associe enseignement, pratique et accompagnement, au service de la Vision de l'Église."
        breadcrumb={[{ label: "Nos formations", href: "/formations" }]}
      >
        <Button asChild size="lg" variant="outline">
          <Link href={routes.pricing}>Comparer les formations</Link>
        </Button>
      </PageHero>
      <section className="px-5 py-20 sm:px-8">
        <ul className="mx-auto grid max-w-6xl gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {formations.map((f) => (
            <li key={f.slug}>
              <FormationCard formation={f} />
            </li>
          ))}
        </ul>
      </section>
      <CtaBlock />
    </>
  );
}
