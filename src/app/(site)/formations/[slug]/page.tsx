import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Clock, Coins, Layers, ShieldCheck } from "lucide-react";
import { FormationIcon } from "@/components/brand/formation-icon";
import { CtaBlock } from "@/components/layout/cta-block";
import { PageHero } from "@/components/layout/page-hero";
import { LevelSteps } from "@/components/sections/level-steps";
import { JsonLd } from "@/components/seo/json-ld";
import { ExampleBadge, KeyWordPill, ObjectivePill } from "@/components/ui/badge";
import { CheckList } from "@/components/ui/check-list";
import { GlassCard3D } from "@/components/ui/glass-card-3d";
import { SectionTitle } from "@/components/ui/section-title";
import { registerFor } from "@/config/navigation";
import { siteConfig } from "@/config/site";
import { formatAmount, formations, getFormation, journeyLabel, registerLabels, totalFees, type Formation } from "@/content/formations";
import { getObjective } from "@/content/identity";
import { pageMetadata } from "@/lib/seo";

export const dynamicParams = false;

// TODO: visuels officiels des formations — bandeaux d'exemple générés dans public/media/.
const heroImages: Record<Formation["slug"], string> = {
  eds: "/dip.jpg",
  edm: "/ment.png",
  diacres: "/dic.png",
  pastorale: "/past.png",
};

export function generateStaticParams() {
  return formations.map((f) => ({ slug: f.slug }));
}

export async function generateMetadata({ params }: PageProps<"/formations/[slug]">) {
  const { slug } = await params;
  const f = getFormation(slug);
  if (!f) return {};
  return pageMetadata({
    title: `${f.acronym === "DIACRES" ? "" : `${f.acronym} — `}${f.name}`,
    description: `${f.tagline} ${f.description.slice(0, 110)}…`,
    path: `/formations/${f.slug}`,
  });
}

export default async function FormationPage({ params }: PageProps<"/formations/[slug]">) {
  const { slug } = await params;
  const f = getFormation(slug);
  if (!f) notFound();
  const total = totalFees(f);
  const rawTitle = f.acronym === "DIACRES" ? f.name : `${f.acronym} — ${f.name}`;
  const title = f.slug === "eds" ? rawTitle.toUpperCase() : rawTitle;

  const facts = [
    { icon: Clock, label: "Durée", value: f.duration.label, example: f.duration.isExample },
    { icon: Layers, label: "Parcours", value: journeyLabel(f), example: false },
    { icon: Coins, label: "Frais d'inscription", value: formatAmount(f.fees.registration), example: f.fees.registration.isExample },
    { icon: Coins, label: "Frais de formation", value: formatAmount(f.fees.training), example: f.fees.training.isExample },
    { icon: ShieldCheck, label: "Admission", value: f.requiresSelection ? "Sur sélection" : "Ouverte", example: false },
    { icon: CalendarDays, label: "Rythme", value: f.rhythm, example: false },
  ];

  return (
    <>
      <PageHero
        eyebrow={f.acronym === "DIACRES" ? "Formation" : f.acronym}
        title={title}
        intro={f.description}
        breadcrumb={[
          { label: "Nos formations", href: "/formations" },
          { label: f.name, href: `/formations/${f.slug}` },
        ]}
        registerHref={f.slug === "eds" ? registerFor(f.slug) : null}
        registerLabel={registerLabels[f.slug]}
        image={heroImages[f.slug]}
      />

      <section className="px-5 py-16 sm:px-8">
        <dl className="mx-auto grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {facts.map(({ icon: Icon, label, value, example }) => (
            <div key={label} className="flex gap-4 rounded-2xl border border-line bg-gradient-card p-5">
              <Icon aria-hidden className="mt-1 size-5 shrink-0 text-or" />
              <div>
                <dt className="text-sm text-blanc/55">{label}</dt>
                <dd className="mt-1 flex flex-wrap items-center gap-2 font-semibold text-blanc">
                  {value} {example && <ExampleBadge />}
                </dd>
              </div>
            </div>
          ))}
        </dl>
        <p className="mx-auto mt-4 flex max-w-6xl flex-wrap items-center gap-2 text-blanc/70">
          Total : <strong className="text-or-light">{formatAmount(total)}</strong> {total.isExample && <ExampleBadge />}
        </p>
      </section>

      <section className="px-5 py-16 sm:px-8">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2">
          <div>
            <SectionTitle align="left" eyebrow="Objectifs" title={<>Ce que vous allez <em>vivre</em></>} />
            <CheckList items={f.goals} className="mt-8" />
          </div>
          <div>
            <SectionTitle align="left" eyebrow="Public visé" title={<>Pour <em>qui</em> ?</>} />
            <CheckList items={f.audience} className="mt-8" />
          </div>
        </div>
      </section>

      <section className="px-5 py-20 sm:px-8">
        <SectionTitle
          eyebrow={f.slug === "diacres" ? "Le parcours" : "Les niveaux"}
          title={
            f.slug === "eds" ? (
              <>
                Quatre paliers vers la <em>graduation STAF</em>
              </>
            ) : f.slug === "edm" ? (
              <>
                Deux niveaux pour devenir <em>mentor</em>
              </>
            ) : f.slug === "diacres" ? (
              <>
                De la formation à la <em>consécration</em>
              </>
            ) : (
              <>
                Le parcours de la <em>formation</em>
              </>
            )
          }
          className="mb-14"
        />
        <LevelSteps levels={f.levels} unit={f.slug === "diacres" ? "Étape" : "Niveau"} />
      </section>

      <section className="px-5 py-16 sm:px-8">
        <ul className="mx-auto grid max-w-6xl gap-5 md:grid-cols-3">
          {f.highlights.map((h) => (
            <li key={h.title}>
              <GlassCard3D>
                <FormationIcon icon={f.icon} className="size-12" />
                <h3 className="mt-5 text-xl tracking-wide">{h.title}</h3>
                <p className="mt-2 text-blanc/70">{h.description}</p>
              </GlassCard3D>
            </li>
          ))}
        </ul>
      </section>

      {f.selectionNote && (
        <section className="px-5 py-8 sm:px-8">
          <div className="mx-auto flex max-w-4xl gap-4 rounded-2xl border border-or/30 bg-or/5 p-6">
            <ShieldCheck aria-hidden className="size-6 shrink-0 text-or" />
            <div>
              <h2 className="font-sans text-lg font-semibold text-blanc">Conditions de sélection</h2>
              <p className="mt-1 text-blanc/75">{f.selectionNote}</p>
              <CheckList items={f.conditions} className="mt-4" />
            </div>
          </div>
        </section>
      )}

      <section className="px-5 py-16 sm:px-8">
        <div className="mx-auto max-w-4xl rounded-3xl border border-line bg-gradient-card p-8 text-center">
          <h2 className="text-2xl tracking-wide">Au service de la Vision</h2>
          <p className="mt-2 text-blanc/65">Cette formation contribue aux mots clés et aux objectifs suivants.</p>
          <ul className="mt-6 flex flex-wrap justify-center gap-2" aria-label="Mots clés">
            {f.keyWords.map((k) => (
              <li key={k}>
                <KeyWordPill slug={k} />
              </li>
            ))}
          </ul>
          <ul className="mt-3 flex flex-wrap justify-center gap-2" aria-label="Objectifs de l'Église">
            {f.objectives.map((n) => (
              <li key={n}>
                <ObjectivePill objective={getObjective(n)} />
              </li>
            ))}
          </ul>
          {!f.selectionNote && (
            <p className="mt-6 text-sm text-blanc/60">
              Conditions d&apos;accès détaillées :{" "}
              <Link href="/admissions/conditions" className="text-or-light underline-offset-4 hover:underline">
                voir les conditions
              </Link>
            </p>
          )}
        </div>
      </section>

      {f.slug === "eds" && (
        <CtaBlock title={`Prêt à rejoindre l'${f.acronym} ?`} href={registerFor(f.slug)} label={registerLabels[f.slug]} />
      )}

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Course",
          name: f.name,
          description: f.description,
          url: new URL(`/formations/${f.slug}`, siteConfig.url).toString(),
          inLanguage: "fr",
          provider: { "@type": "Organization", name: siteConfig.church, url: siteConfig.url },
        }}
      />
    </>
  );
}
