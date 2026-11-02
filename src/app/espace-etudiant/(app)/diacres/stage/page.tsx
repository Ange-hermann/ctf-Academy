import Link from "next/link";
import { ArrowRight, CalendarDays, CheckCircle2, CircleDashed, Clock3, FileText, MapPin, RotateCcw, UserRound } from "lucide-react";
import { HoursForm } from "@/components/student/formation/hours-form";
import { WrongFormation } from "@/components/student/formation/wrong-formation";
import { EmptyState } from "@/components/student/ui/empty-state";
import { StudentPageHeader } from "@/components/student/ui/page-header";
import { Badge, ExampleBadge } from "@/components/ui/badge";
import { formationBase } from "@/config/student-nav";
import { formatDate } from "@/lib/student/format";
import { getInternship, reportStatusLabels, stepStatusLabels, type StepStatus } from "@/lib/student/queries/formation";
import { requireStudent, withStudent } from "@/lib/student/session";

export const metadata = { title: "Suivi du stage pratique — Diacres" };
const HREF = `${formationBase.diacres}/stage`;

const stepTone: Record<StepStatus, "success" | "gold" | "neutral" | "danger"> = {
  pending: "neutral",
  in_progress: "gold",
  validated: "success",
  redo: "danger",
};
const stepIcon = { pending: CircleDashed, in_progress: Clock3, validated: CheckCircle2, redo: RotateCcw } as const;
const reportTone = { draft: "neutral", submitted: "warning", to_fix: "danger", validated: "success" } as const;
const fmtHours = (h: number) => `${h.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} h`;

export default async function DiacresStagePage() {
  const ctx = await requireStudent(HREF);
  if (ctx.enrollment.formation !== "diacres") {
    return <WrongFormation expected="l'École des Diacres" current={ctx.enrollment.formationName} />;
  }
  const stage = await withStudent(ctx.userId, (tx) => getInternship(tx, ctx.userId));

  if (!stage) {
    return (
      <>
        <StudentPageHeader
          title="Suivi du stage pratique"
          eyebrow="École des Diacres"
          description="Lieu d'affectation, étapes, heures et journal de votre stage."
          crumbs={[{ label: "Suivi du stage pratique", href: HREF }]}
        />
        <EmptyState
          icon={MapPin}
          title="Aucun stage attribué"
          description="Votre affectation de stage sera publiée ici par l'équipe pédagogique, avec ses étapes et son référent."
        />
      </>
    );
  }

  const percent = stage.targetHours > 0 ? Math.min(100, Math.round((stage.doneHours / stage.targetHours) * 100)) : 0;

  return (
    <>
      <StudentPageHeader
        title="Suivi du stage pratique"
        eyebrow="École des Diacres"
        description="Lieu d'affectation, étapes validées par votre référent et journal d'heures."
        crumbs={[{ label: "Suivi du stage pratique", href: HREF }]}
      />

      <section className="rounded-3xl border border-line bg-gradient-card p-5 sm:p-6" aria-labelledby="stage-info">
        <div className="flex flex-wrap items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl border border-or/30 bg-or/10 text-or-light">
            <MapPin aria-hidden className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="stage-info" className="font-semibold text-blanc">
              {stage.place}
            </h2>
            <p className="text-sm text-blanc/55">
              <UserRound aria-hidden className="mr-1 inline size-4 text-or" />
              Référent : {stage.supervisorName}
            </p>
          </div>
          {stage.isExample && <ExampleBadge />}
        </div>
        <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-blanc/60">
          <CalendarDays aria-hidden className="size-4 text-or" />
          {formatDate(stage.startsOn, ctx.timezone)} → {formatDate(stage.endsOn, ctx.timezone)}
        </p>

        <div className="mt-5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-blanc/60">
              {fmtHours(stage.doneHours)} consignées · {fmtHours(stage.validatedHours)} validées
            </span>
            <span className="font-semibold text-or-light">
              {fmtHours(stage.doneHours)} / {fmtHours(stage.targetHours)}
            </span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-or/15" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full origin-left rounded-full bg-gradient-or" style={{ transform: `scaleX(${percent / 100})` }} />
          </div>
        </div>

        <HoursForm min={stage.startsOn.slice(0, 10)} max={stage.endsOn.slice(0, 10)} />
      </section>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <section aria-labelledby="stage-steps">
          <h2 id="stage-steps" className="mb-4 text-xl tracking-wide text-blanc">
            Étapes du stage
          </h2>
          {stage.steps.length === 0 ? (
            <p className="text-sm text-blanc/55">Les étapes seront définies par votre référent.</p>
          ) : (
            <ol className="space-y-3">
              {stage.steps.map((s) => {
                const Icon = stepIcon[s.status];
                return (
                  <li key={s.id} className="rounded-2xl border border-line bg-noir-soft/40 px-4 py-3.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Icon aria-hidden className="size-4.5 shrink-0 text-or" />
                      <span className="min-w-0 flex-1 font-medium text-blanc">{s.title}</span>
                      <Badge tone={stepTone[s.status]} dot>
                        {stepStatusLabels[s.status]}
                      </Badge>
                    </div>
                    {s.description && <p className="mt-2 text-sm text-blanc/65">{s.description}</p>}
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-blanc/50">
                      {s.dueOn && <span>Échéance : {formatDate(s.dueOn, ctx.timezone)}</span>}
                      {s.validatedAt && <span>Validée le {formatDate(s.validatedAt, ctx.timezone)}</span>}
                      {s.comment && <span className="text-or-light/90">{s.comment}</span>}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        <section aria-labelledby="stage-hours">
          <h2 id="stage-hours" className="mb-4 text-xl tracking-wide text-blanc">
            Journal d&rsquo;heures
          </h2>
          {stage.hours.length === 0 ? (
            <p className="text-sm text-blanc/55">Aucune heure consignée pour le moment.</p>
          ) : (
            <ul className="space-y-2">
              {stage.hours.map((h) => (
                <li key={h.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-noir-soft/40 px-4 py-3 text-sm">
                  <span className="min-w-0 flex-1">
                    <span className="font-medium text-blanc">{h.activity}</span>
                    <span className="block text-xs text-blanc/50">{formatDate(h.workedOn, ctx.timezone)}</span>
                  </span>
                  <span className="font-semibold text-or-light">{fmtHours(h.hours)}</span>
                  <Badge tone={h.validated ? "success" : "neutral"}>{h.validated ? "Validé" : "À vérifier"}</Badge>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section aria-labelledby="stage-report" className="mt-8 rounded-3xl border border-line bg-gradient-card p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl border border-or/30 bg-or/10 text-or-light">
            <FileText aria-hidden className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="stage-report" className="font-semibold text-blanc">
              Rapport de stage
            </h2>
            <p className="text-sm text-blanc/55">
              {stage.reports.length === 0
                ? "Aucune version déposée pour le moment."
                : `Version ${stage.reports[0].version} · ${reportStatusLabels[stage.reports[0].status]}`}
            </p>
          </div>
          {stage.reports[0] && (
            <Badge tone={reportTone[stage.reports[0].status]} dot>
              {reportStatusLabels[stage.reports[0].status]}
            </Badge>
          )}
          <Link href={`${formationBase.diacres}/rapport`} className="inline-flex items-center gap-1 text-sm font-semibold text-or-light hover:text-or hover:underline">
            Ouvrir le suivi <ArrowRight aria-hidden className="size-4" />
          </Link>
        </div>
      </section>
    </>
  );
}
