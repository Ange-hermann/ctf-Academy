import Link from "next/link";
import { ArrowRight, Clock, Layers } from "lucide-react";
import { FormationIcon } from "@/components/brand/formation-icon";
import { ExampleBadge, KeyWordPill } from "@/components/ui/badge";
import { GlassCard3D } from "@/components/ui/glass-card-3d";
import { formatAmount, journeyLabel, totalFees, type Formation } from "@/content/formations";

/** Carte de formation réutilisable : tilt 3D, reflet doré, médaillon qui pivote, mots clés liés. */
export function FormationCard({ formation, showFees = true }: { formation: Formation; showFees?: boolean }) {
  const total = totalFees(formation);
  return (
    <GlassCard3D className="flex flex-col p-0">
      <Link href={`/formations/${formation.slug}`} className="flex h-full flex-col rounded-2xl p-6 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <FormationIcon icon={formation.icon} />
          {formation.requiresSelection && (
            <span className="rounded-full border border-or/30 px-3 py-1 text-xs text-or-light">Sur sélection</span>
          )}
        </div>
        <p className="mt-6 text-sm font-semibold tracking-[0.25em] text-or-light">{formation.acronym}</p>
        <h3 className="mt-1 text-2xl tracking-wide text-blanc">{formation.name}</h3>
        <p className="mt-3 flex-1 text-blanc/70">{formation.tagline}</p>

        <dl className="mt-6 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl border border-line bg-noir/40 p-3">
            <dt className="flex items-center gap-1.5 text-blanc/55">
              <Clock aria-hidden className="size-4 text-or" /> Durée
            </dt>
            <dd className="mt-1 flex flex-wrap items-center gap-1.5 font-semibold text-blanc">
              {formation.duration.label} {formation.duration.isExample && <ExampleBadge />}
            </dd>
          </div>
          <div className="rounded-xl border border-line bg-noir/40 p-3">
            <dt className="flex items-center gap-1.5 text-blanc/55">
              <Layers aria-hidden className="size-4 text-or" /> Parcours
            </dt>
            <dd className="mt-1 font-semibold text-blanc">{journeyLabel(formation)}</dd>
          </div>
        </dl>
        {showFees && (
          <p className="mt-4 flex flex-wrap items-center gap-2 text-sm text-blanc/70">
            Total des frais : <span className="font-semibold text-or-light">{formatAmount(total)}</span>
            {total.isExample && <ExampleBadge />}
          </p>
        )}

        <ul className="mt-5 flex flex-wrap gap-2" aria-label="Mots clés de la Vision liés">
          {formation.keyWords.map((k) => (
            <li key={k}>
              <KeyWordPill slug={k} />
            </li>
          ))}
        </ul>

        <span className="mt-6 inline-flex items-center gap-2 font-semibold text-or-light">
          Découvrir la formation
          <ArrowRight aria-hidden className="size-4 transition-transform group-hover/card:translate-x-1" />
        </span>
      </Link>
    </GlassCard3D>
  );
}
