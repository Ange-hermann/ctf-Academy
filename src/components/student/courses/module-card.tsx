import Link from "next/link";
import { ViewTransition } from "react";
import { CheckCircle2, Clock, Lock, PlayCircle } from "lucide-react";
import { ProgressRing } from "@/components/student/ui/progress-ring";
import { ExampleBadge, KeyWordPill } from "@/components/ui/badge";
import { moduleHref } from "@/config/student-nav";
import { formatMinutes } from "@/lib/student/format";
import type { ModuleStatus, ModuleSummary } from "@/lib/student/queries/learning";
import { cn } from "@/lib/utils";

export const moduleStatusLabels: Record<ModuleStatus, string> = {
  todo: "À commencer",
  in_progress: "En cours",
  done: "Terminé",
  locked: "Verrouillé",
};

/** Couverture générée (aucune image lourde) : dégradé doré + numéro de niveau. Partagée avec la page du module. */
export function ModuleCover({ module, className }: { module: ModuleSummary; className?: string }) {
  return (
    <ViewTransition name={`module-${module.id}`} share="morph" default="none">
      <div
        aria-hidden
        className={cn(
          "relative overflow-hidden bg-[radial-gradient(120%_90%_at_15%_10%,color-mix(in_oklab,var(--color-or)_30%,transparent),transparent_55%),linear-gradient(140deg,var(--color-noir-soft),var(--color-noir))]",
          className,
        )}
      >
        <span className="absolute -right-2 -bottom-6 font-display text-[7rem] leading-none text-or/10">{String(module.levelNumber ?? 1).padStart(2, "0")}</span>
        <span className="absolute inset-x-0 top-0 h-px bg-gradient-or opacity-50" />
      </div>
    </ViewTransition>
  );
}

export function ModuleCard({ module }: { module: ModuleSummary }) {
  const locked = module.status === "locked";
  const body = (
    <article
      className={cn(
        "group/card flex h-full flex-col overflow-hidden rounded-3xl border bg-gradient-card transition-[transform,box-shadow,border-color] duration-500 ease-out-expo",
        locked ? "border-line opacity-70" : "border-line hover:-translate-y-1 hover:border-or/40 hover:shadow-gold-lg",
      )}
    >
      <div className="relative">
        <ModuleCover module={module} className="h-32" />
        <div className="absolute inset-x-4 top-4 flex items-start justify-between">
          <span className="rounded-full border border-or/30 bg-noir/70 px-2.5 py-1 text-[0.7rem] font-semibold tracking-[0.16em] text-or-light uppercase">
            {module.levelTitle?.replace(/ — .*/, "") ?? "Module"}
          </span>
          {locked ? (
            <span className="grid size-9 place-items-center rounded-full border border-line bg-noir/80 text-blanc/60">
              <Lock aria-label="Verrouillé" className="size-4" />
            </span>
          ) : (
            <ProgressRing value={module.percent} size={44} stroke={4}>
              {module.status === "done" ? (
                <CheckCircle2 aria-hidden className="size-4.5 text-or-light" />
              ) : (
                <span className="text-[0.7rem] font-semibold text-blanc tabular">{module.percent}%</span>
              )}
            </ProgressRing>
          )}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-xl tracking-wide text-blanc group-hover/card:text-or-light">{module.title}</h3>
        <p className="mt-1 line-clamp-2 text-sm text-blanc/60">{module.summary}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {module.keyWords.map((k) => (
            <KeyWordPill key={k} slug={k} className="px-2 py-0.5 text-[0.6rem]" />
          ))}
        </div>
        <div className="mt-auto flex items-center justify-between gap-2 pt-5 text-sm text-blanc/55">
          <span className="flex items-center gap-1.5">
            <PlayCircle aria-hidden className="size-4 text-or" /> {module.total} leçons
          </span>
          <span className="flex items-center gap-1.5">
            <Clock aria-hidden className="size-4 text-or" /> {formatMinutes(module.durationMinutes)}
          </span>
          <span className={cn("font-semibold", module.status === "in_progress" ? "text-warning-light" : module.status === "done" ? "text-success-light" : "")}>
            {moduleStatusLabels[module.status]}
          </span>
        </div>
        {locked && <p className="mt-3 text-xs text-blanc/50">S&apos;ouvre après la validation du niveau précédent.</p>}
        {module.isExample && <ExampleBadge className="mt-3 self-start" />}
      </div>
    </article>
  );
  return locked ? (
    <div aria-disabled className="h-full cursor-not-allowed">
      {body}
    </div>
  ) : (
    <Link href={moduleHref(module.slug)} className="block h-full rounded-3xl" aria-label={`${module.title} — ${moduleStatusLabels[module.status]}, ${module.percent} %`}>
      {body}
    </Link>
  );
}
