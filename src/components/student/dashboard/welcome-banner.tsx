import { FormationIcon } from "@/components/brand/formation-icon";
import { ExampleBadge } from "@/components/ui/badge";
import type { Formation } from "@/content/formations";
import { churchVision } from "@/content/identity";

/** « Bonjour, [Prénom] » : le prénom apparaît lettre par lettre, traversé une fois par un éclat doré. */
export function WelcomeBanner({
  firstName,
  greeting,
  formation,
  levelTitle,
  reference,
}: {
  firstName: string;
  greeting: string;
  formation: Formation;
  levelTitle: string | null;
  reference: string;
}) {
  const name = firstName || "à vous";
  return (
    <section
      aria-labelledby="welcome-title"
      className="grain relative overflow-hidden rounded-3xl border border-line bg-gradient-card p-6 sm:p-8"
    >
      <div aria-hidden className="absolute -top-24 -right-16 size-72 rounded-full bg-or/10 blur-3xl" />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold tracking-[0.22em] text-or-light/80 uppercase">{greeting}</p>
          <h1
            id="welcome-title"
            aria-label={`Bonjour, ${name}`}
            className="mt-2 text-4xl tracking-wide text-blanc sm:text-5xl"
          >
            <span aria-hidden>Bonjour, </span>
            <span aria-hidden className="name-shine text-gradient-or">
              {Array.from(name).map((ch, i) => (
                <span key={i} className="inline-block animate-letter" style={{ animationDelay: `${200 + i * 60}ms` }}>
                  {ch === " " ? "\u00a0" : ch}
                </span>
              ))}
            </span>
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-blanc/55 italic">« {churchVision.text} »</p>
        </div>

        <div className="group/card flex items-center gap-4 rounded-2xl border border-or/25 bg-noir/50 p-3 pr-5">
          <FormationIcon icon={formation.icon} className="size-14" />
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-[0.2em] text-or-light uppercase">
              Ma formation · {formation.acronym}
            </p>
            <p className="font-semibold text-blanc">{formation.name}</p>
            <p className="text-sm text-blanc/60">
              {levelTitle ?? "Parcours en cours"} · <span className="font-mono text-xs">{reference}</span>
            </p>
          </div>
          {reference.includes("-EX-") && <ExampleBadge className="ml-1 self-start" />}
        </div>
      </div>
    </section>
  );
}
