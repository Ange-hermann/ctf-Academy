import { CtaBlock } from "@/components/layout/cta-block";
import { PageHero } from "@/components/layout/page-hero";
import { ComparisonTable } from "@/components/sections/comparison-table";
import { routes } from "@/config/navigation";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Durées, objectifs et tarifs",
  description:
    "Comparez les formations de CTF ACADEMY : École des STAFs, École des Disciples Mentors et formation des diacres. Durée, niveaux, objectifs et frais.",
  path: routes.pricing,
});

export default function PricingPage() {
  return (
    <>
      <PageHero
        eyebrow="Nos formations"
        title={
          <>
            Durées, objectifs et <em>tarifs</em>
          </>
        }
        intro={
          <>
            Comparez les quatre formations en un coup d&apos;œil. Les montants et durées marqués « Exemple » sont
            provisoires et seront confirmés par l&apos;Église.
          </>
        }
        breadcrumb={[
          { label: "Nos formations", href: "/formations" },
          { label: "Durées, objectifs et tarifs", href: routes.pricing },
        ]}
      />
      <section className="px-5 py-16 sm:px-8">
        <ComparisonTable />
      </section>
      <CtaBlock />
    </>
  );
}
