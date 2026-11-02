import Link from "next/link";
import { ArrowRight, Award, BookOpen, CircleCheck, Clock3, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { moduleHref, studentRoutes } from "@/config/student-nav";
import type { LevelStatus, LevelSummary } from "@/lib/student/queries/learning";

const statusMeta: Record<LevelStatus, { label: string; tone: "success" | "warning" | "gold" | "neutral" }> = {
  validated: { label: "Validé", tone: "success" },
  pending_decision: { label: "Décision en cours", tone: "warning" },
  current: { label: "Niveau en cours", tone: "gold" },
  upcoming: { label: "Ouvert", tone: "neutral" },
  locked: { label: "Verrouillé", tone: "neutral" },
};

const decisionLabel = { pending: "Décision en attente", granted: "Niveau validé", refused: "Validation refusée" } as const;
const decisionTone = { pending: "warning", granted: "success", refused: "danger" } as const;

/** Grille des niveaux d'une formation (EDS : 4 paliers, EDM : 2), partagée par les pages « niveaux ». */
export function LevelsView({ levels }: { levels: LevelSummary[] }) {
  return (
    <ol className="space-y-6">
      {levels.map((level) => {
        const meta = statusMeta[level.status];
        return (
          <li key={level.id} className="rounded-3xl border border-line bg-gradient-card p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-3">
              <span className="grid size-11 place-items-center rounded-2xl border border-or/30 bg-or/10 font-sans text-lg font-semibold text-or-light">
                {level.number}
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold text-blanc">{level.title}</h2>
                <p className="text-sm text-blanc/55">Seuil de validation : {level.minScore} %</p>
              </div>
              <Badge tone={meta.tone} dot>
                {level.status === "locked" && <Lock aria-hidden className="size-3.5" />}
                {meta.label}
              </Badge>
            </div>

            {level.description && <p className="mt-4 text-sm text-blanc/70">{level.description}</p>}

            <div className="mt-4" aria-label={`Progression : ${level.percent} %`}>
              <div className="flex items-center justify-between text-xs text-blanc/50">
                <span>
                  {level.modules.reduce((n, m) => n + m.completed, 0)} leçon(s) terminée(s) sur{" "}
                  {level.modules.reduce((n, m) => n + m.total, 0)}
                </span>
                <span className="font-semibold text-or-light">{level.percent} %</span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-or/15">
                <div className="h-full origin-left rounded-full bg-gradient-or" style={{ transform: `scaleX(${level.percent / 100})` }} />
              </div>
            </div>

            {level.validation && (
              <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-noir-soft/50 px-4 py-3 text-sm">
                <Award aria-hidden className="size-4 text-or" />
                <Badge tone={decisionTone[level.validation.decision]}>{decisionLabel[level.validation.decision]}</Badge>
                {level.validation.decision === "granted" && level.validation.certificateNumber && (
                  <Link
                    href={`${studentRoutes.validations}/certificat/${level.validation.id}`}
                    className="font-semibold text-or-light hover:text-or hover:underline"
                  >
                    Télécharger le certificat
                  </Link>
                )}
              </div>
            )}

            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {level.modules.map((m) => (
                <li key={m.id}>
                  <Link
                    href={moduleHref(m.slug)}
                    className="group flex items-center gap-3 rounded-2xl border border-line bg-noir-soft/40 px-4 py-3 transition-colors hover:border-or/40"
                  >
                    {m.status === "done" ? (
                      <CircleCheck aria-hidden className="size-4 shrink-0 text-success-light" />
                    ) : m.status === "locked" ? (
                      <Lock aria-hidden className="size-4 shrink-0 text-blanc/30" />
                    ) : m.status === "in_progress" ? (
                      <Clock3 aria-hidden className="size-4 shrink-0 text-or" />
                    ) : (
                      <BookOpen aria-hidden className="size-4 shrink-0 text-blanc/45" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-blanc group-hover:text-or-light">{m.title}</span>
                      <span className="text-xs text-blanc/50">
                        {m.completed}/{m.total} leçons{m.isExample ? " · exemple" : ""}
                      </span>
                    </span>
                    <ArrowRight aria-hidden className="size-4 shrink-0 text-or/60 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </li>
              ))}
            </ul>
          </li>
        );
      })}
    </ol>
  );
}
