import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, ListChecks, Lock, Repeat, Timer } from "lucide-react";
import { QuizRunner } from "@/components/student/assessments/quiz-runner";
import { IntegrityNote, StartPanel } from "@/components/student/assessments/start-panel";
import { StudentPageHeader } from "@/components/student/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge, ExampleBadge } from "@/components/ui/badge";
import { resultHref, studentRoutes } from "@/config/student-nav";
import { formatDateTime, formatMinutes } from "@/lib/student/format";
import { assessmentKindLabels, getAssessmentDetail } from "@/lib/student/queries/assessments";
import { requireStudent } from "@/lib/student/session";

export default async function AssessmentPage({ params }: PageProps<"/espace-etudiant/evaluations/[id]">) {
  const { id } = await params;
  const ctx = await requireStudent(studentRoutes.assessments);
  const detail = await getAssessmentDetail(ctx, id);
  if (!detail) notFound();
  const { assessment: a, questions, attempt, savedAnswers, submission, history } = detail;

  // Tentative active → salle d'épreuve.
  if (attempt) {
    return (
      <QuizRunner
        quizId={a.id}
        title={a.title}
        kindLabel={assessmentKindLabels[a.kind]}
        passScore={a.passScore}
        attempt={attempt}
        questions={questions}
        savedAnswers={savedAnswers}
      />
    );
  }

  const last = history[0];
  return (
    <div className="mx-auto max-w-3xl">
      <StudentPageHeader
        title={a.title}
        eyebrow={assessmentKindLabels[a.kind]}
        crumbs={[
          { label: "Mes évaluations", href: studentRoutes.assessments },
          { label: a.title, href: `${studentRoutes.assessments}/${a.id}` },
        ]}
        actions={a.isExample ? <ExampleBadge /> : undefined}
      />

      <div className="space-y-5">
        <section className="rounded-3xl border border-line bg-gradient-card p-6">
          <h2 className="font-sans text-sm font-semibold tracking-[0.18em] text-or-light uppercase">Consignes</h2>
          <p className="mt-3 whitespace-pre-line text-blanc/80">{a.instructions || "Lisez attentivement chaque question avant de répondre."}</p>
          <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { icon: ListChecks, label: `${questions.length} question${questions.length > 1 ? "s" : ""}` },
              { icon: Timer, label: a.durationMinutes ? formatMinutes(a.durationMinutes) : "Sans limite de temps" },
              { icon: Repeat, label: a.maxAttempts > 1 ? `${a.attemptsLeft}/${a.maxAttempts} tentatives` : "Une seule tentative" },
              { icon: CalendarDays, label: a.dueAt ? `Avant le ${formatDateTime(a.dueAt, ctx.timezone)}` : "Pas de date limite" },
            ].map((f) => (
              <div key={f.label} className="rounded-xl border border-line bg-noir/40 p-3 text-center">
                <f.icon aria-hidden className="mx-auto size-5 text-or" />
                <dd className="mt-1.5 text-sm text-blanc/75">{f.label}</dd>
              </div>
            ))}
          </dl>
        </section>

        {submission && (
          <p className="rounded-2xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success-light">
            Fichier déjà déposé : <span className="font-medium">{submission.fileName}</span>
          </p>
        )}

        <IntegrityNote durationMinutes={a.durationMinutes} />

        <div className="flex flex-wrap items-center gap-3">
          {a.canStart ? (
            <StartPanel quizId={a.id} />
          ) : (
            <p className="flex items-center gap-2 rounded-2xl border border-line px-4 py-3 text-sm text-blanc/60">
              <Lock aria-hidden className="size-4" />
              {a.status === "submitted"
                ? "Votre copie est en cours de correction."
                : a.status === "closed"
                  ? "La date limite est dépassée."
                  : "Cette évaluation n'est pas disponible pour le moment."}
            </p>
          )}
          {last && (
            <Button asChild variant="outline">
              <Link href={resultHref(a.id, last.id)}>Voir mon dernier résultat</Link>
            </Button>
          )}
        </div>

        {history.length > 0 && (
          <section aria-labelledby="history" className="rounded-3xl border border-line bg-gradient-card p-6">
            <h2 id="history" className="font-sans text-sm font-semibold tracking-[0.18em] text-or-light uppercase">
              Mes tentatives
            </h2>
            <ul className="mt-3 divide-y divide-line">
              {history.map((h) => (
                <li key={h.id} className="flex flex-wrap items-center gap-3 py-3">
                  <span className="text-sm text-blanc/60">{formatDateTime(h.startedAt, ctx.timezone)}</span>
                  <Badge tone={h.status === "graded" ? (h.passed ? "success" : "danger") : "warning"}>
                    {h.status === "graded" ? (h.passed ? `Réussie · ${h.percent} %` : `Non validée · ${h.percent} %`) : "En correction"}
                  </Badge>
                  <Button asChild size="sm" variant="ghost" className="ml-auto">
                    <Link href={resultHref(a.id, h.id)}>Détail</Link>
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
