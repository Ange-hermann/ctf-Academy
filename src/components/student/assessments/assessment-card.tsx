import Link from "next/link";
import { ArrowRight, CalendarDays, CircleCheck, FileUp, Hourglass, ListChecks, Lock, Repeat, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, ExampleBadge } from "@/components/ui/badge";
import { assessmentHref, resultHref, studentRoutes } from "@/config/student-nav";
import { formatDateTime, formatMinutes } from "@/lib/student/format";
import { assessmentKindLabels, type AssessmentStatus, type AssessmentSummary } from "@/lib/student/queries/assessments";
import { cn } from "@/lib/utils";

const statusLabels: Record<AssessmentStatus, string> = {
  todo: "À faire",
  in_progress: "En cours",
  submitted: "En correction",
  graded: "Notée",
  closed: "Clôturée",
};

const statusTone: Record<AssessmentStatus, "gold" | "warning" | "success" | "neutral" | "danger"> = {
  todo: "gold",
  in_progress: "warning",
  submitted: "warning",
  graded: "success",
  closed: "neutral",
};

/** Carte d'évaluation : statut, échéance, tentatives, meilleure note et action principale. */
export function AssessmentCard({ assessment, tz }: { assessment: AssessmentSummary; tz: string }) {
  const a = assessment;
  const cta = a.status === "in_progress" && a.canStart
    ? { label: "Reprendre", href: assessmentHref(a.id), primary: true }
    : a.status === "graded"
      ? { label: "Voir le résultat", href: resultHref(a.id, a.lastGradedAttemptId ?? undefined), primary: false }
      : a.canStart
        ? { label: "Commencer", href: assessmentHref(a.id), primary: true }
        : null;

  return (
    <article className={cn("flex h-full flex-col rounded-3xl border border-line bg-gradient-card p-5", a.status === "closed" && "opacity-70")}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={a.kind === "exam" ? "danger" : a.kind === "exercise" ? "warning" : "gold"}>{assessmentKindLabels[a.kind]}</Badge>
        <Badge tone={statusTone[a.status]} dot>
          {statusLabels[a.status]}
        </Badge>
        {a.isExample && <ExampleBadge />}
        {a.levelNumber != null && <span className="ml-auto text-xs text-blanc/45">Niveau {a.levelNumber}</span>}
      </div>

      <h3 className="mt-3 text-xl tracking-wide text-blanc">{a.title}</h3>
      {a.moduleTitle && (
        <Link href={`${studentRoutes.courses}/${a.moduleSlug}`} className="mt-0.5 text-sm text-blanc/55 hover:text-or-light">
          Module : {a.moduleTitle}
        </Link>
      )}

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-blanc/60">
        {a.dueAt && (
          <div className="flex items-center gap-1.5">
            <CalendarDays aria-hidden className={cn("size-4", a.status === "closed" ? "text-blanc/40" : "text-or")} />
            <dd>{formatDateTime(a.dueAt, tz)}</dd>
          </div>
        )}
        {a.durationMinutes && (
          <div className="flex items-center gap-1.5">
            <Timer aria-hidden className="size-4 text-or" />
            <dd>{formatMinutes(a.durationMinutes)}</dd>
          </div>
        )}
        {a.questionCount > 0 && (
          <div className="flex items-center gap-1.5">
            <ListChecks aria-hidden className="size-4 text-or" />
            <dd>{a.questionCount} question{a.questionCount > 1 ? "s" : ""}</dd>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <Repeat aria-hidden className="size-4 text-or" />
          <dd>
            {a.maxAttempts > 1 ? `${a.attemptsLeft} tentative${a.attemptsLeft > 1 ? "s" : ""} restante${a.attemptsLeft > 1 ? "s" : ""}` : "1 tentative"}
          </dd>
        </div>
      </dl>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-4">
        <p className="text-sm">
          {a.status === "graded" && a.bestPercent !== null ? (
            <span className={cn("font-semibold", a.passed ? "text-success-light" : "text-danger-light")}>
              <CircleCheck aria-hidden className="mr-1 inline size-4" />
              Meilleure note : {a.bestPercent} %{a.passed ? " · réussie" : ` · seuil ${a.passScore} %`}
            </span>
          ) : a.status === "submitted" ? (
            <span className="flex items-center gap-1.5 text-warning-light">
              <Hourglass aria-hidden className="size-4" /> Correction en cours par le formateur
            </span>
          ) : a.status === "closed" ? (
            <span className="flex items-center gap-1.5 text-blanc/45">
              <Lock aria-hidden className="size-4" /> Date limite dépassée
            </span>
          ) : (
            <span className="text-blanc/50">Réussite à partir de {a.passScore} %</span>
          )}
        </p>
        {cta && (
          <Button asChild size="sm" variant={cta.primary ? "primary" : "outline"}>
            <Link href={cta.href}>
              {cta.label} {cta.primary ? <ArrowRight /> : null}
            </Link>
          </Button>
        )}
      </div>
      {a.kind === "exercise" && a.status === "todo" && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-blanc/50">
          <FileUp aria-hidden className="size-3.5 text-or" /> Dépôt de fichier (PDF, DOCX ou image)
        </p>
      )}
    </article>
  );
}
