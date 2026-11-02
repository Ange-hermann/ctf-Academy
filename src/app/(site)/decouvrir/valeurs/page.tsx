import { KeyWordIcon } from "@/components/brand/key-word-icon";
import { Signature } from "@/components/brand/signature";
import { CtaBlock } from "@/components/layout/cta-block";
import { PageHero } from "@/components/layout/page-hero";
import { Reveal } from "@/components/ui/reveal";
import { keyWords, tintStyle } from "@/content/identity";
import { cn } from "@/lib/utils";

import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Nos valeurs",
  description:
    "Adoration, Transformation, Guérison, Famille, Excellence : les 5 mots clés de la Vision du Centre de Transformation des Familles.",
  path: "/decouvrir/valeurs",
});

export default function ValuesPage() {
  return (
    <>
      <PageHero
        eyebrow="Découvrir CTF"
        title={
          <>
            Nos <em>valeurs</em>
          </>
        }
        intro="Cinq mots clés résument la Vision de l'Église. Chacun inspire la manière dont nous formons et servons."
        breadcrumb={[
          { label: "Découvrir CTF", href: "/decouvrir" },
          { label: "Nos valeurs", href: "/decouvrir/valeurs" },
        ]}
      />

      <section className="px-5 py-16 sm:px-8">
        <ol className="mx-auto max-w-5xl space-y-8">
          {keyWords.map((k, i) => (
            <Reveal as="li" key={k.slug}>
              <article
                style={tintStyle(k)}
                className={cn(
                  "group grid items-center gap-8 rounded-3xl border bg-gradient-card p-8 transition-shadow duration-700 tint-border hover:tint-glow-lg sm:p-12 md:grid-cols-[auto_1fr]",
                  i % 2 === 1 && "md:grid-cols-[1fr_auto]",
                )}
              >
                <div className={cn("relative mx-auto grid size-36 place-items-center", i % 2 === 1 && "md:order-2")}>
                  <span aria-hidden className="absolute inset-0 rounded-full blur-2xl tint-soft" />
                  <span aria-hidden className="absolute inset-0 rounded-full border tint-border" />
                  <Signature kind={k.signature} className="size-24" />
                </div>
                <div>
                  <p className="flex items-center gap-3 text-sm font-semibold tracking-[0.3em] text-blanc/55 uppercase">
                    0{k.order}
                    <KeyWordIcon icon={k.icon} className="size-5 tint-text" />
                  </p>
                  <h2 className="mt-2 text-3xl tracking-[0.14em] uppercase tint-text tint-text-glow sm:text-4xl">{k.label}</h2>
                  <p className="mt-4 text-lg text-blanc/80">{k.definition}</p>
                  <blockquote className="mt-6 border-l-2 pl-5 tint-border-strong">
                    <p className="font-display text-lg text-blanc/85 italic">« {k.inspiration.text} »</p>
                    <footer className="mt-2 text-sm tint-text">{k.inspiration.reference}</footer>
                  </blockquote>
                </div>
              </article>
            </Reveal>
          ))}
        </ol>
      </section>

      <CtaBlock />
    </>
  );
}
