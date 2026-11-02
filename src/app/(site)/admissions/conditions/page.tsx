import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { FormationIcon } from "@/components/brand/formation-icon";
import { CtaBlock } from "@/components/layout/cta-block";
import { PageHero } from "@/components/layout/page-hero";
import { Button } from "@/components/ui/button";
import { CheckList } from "@/components/ui/check-list";
import { SectionTitle } from "@/components/ui/section-title";
import { registerFor } from "@/config/navigation";
import { commonConditions } from "@/content/admissions";
import { formations, registerLabels } from "@/content/formations";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Conditions d'accès",
  description:
    "Les conditions d'accès à l'École des STAFs, à l'École des Disciples Mentors et à la formation des diacres du Centre de Transformation des Familles.",
  path: "/admissions/conditions",
});

export default function ConditionsPage() {
  return (
    <>
      <PageHero
        eyebrow="Admissions"
        title={
          <>
            Conditions <em>d&apos;accès</em>
          </>
        }
        intro="Quelques conditions simples, différentes selon la formation choisie."
        breadcrumb={[
          { label: "Admissions", href: "/admissions" },
          { label: "Conditions d'accès", href: "/admissions/conditions" },
        ]}
      />

      <section className="px-5 py-16 sm:px-8">
        <div className="mx-auto max-w-4xl rounded-3xl border border-or/25 bg-gradient-card p-8">
          <SectionTitle align="left" as="h2" eyebrow="Pour toutes les formations" title="Les bases" />
          <CheckList items={commonConditions} className="mt-6" />
        </div>
      </section>

      <section className="px-5 py-16 sm:px-8">
        <ul className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-3">
          {formations.map((f) => (
            <li key={f.slug} className="group/card flex flex-col rounded-3xl border border-line bg-gradient-card p-7 transition-shadow duration-500 hover:shadow-gold-lg">
              <FormationIcon icon={f.icon} className="size-12" />
              <h2 className="mt-5 text-2xl tracking-wide">{f.name}</h2>
              <p className="mt-2 inline-flex items-center gap-2 text-sm text-or-light">
                <ShieldCheck aria-hidden className="size-4" />
                {f.requiresSelection ? "Admission sur sélection" : "Admission ouverte"}
              </p>
              <CheckList items={f.conditions} className="mt-6 flex-1" />
              <Button asChild className="mt-8">
                <Link href={registerFor(f.slug)}>{registerLabels[f.slug]}</Link>
              </Button>
            </li>
          ))}
        </ul>
        <p className="mx-auto mt-10 max-w-3xl text-center text-blanc/65">
          Rappel : le paiement, l&apos;inscription et l&apos;admission sont trois étapes distinctes. Un paiement confirmé ne
          vaut pas admission lorsqu&apos;une sélection est prévue.
        </p>
      </section>

      <CtaBlock />
    </>
  );
}
