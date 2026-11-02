import Link from "next/link";
import { BookOpen, CheckCircle2, CircleMinus, Hourglass, XCircle } from "lucide-react";
import { ProgressRing } from "@/components/student/ui/progress-ring";
import { Badge } from "@/components/ui/badge";
import { answerLabel, questionKindLabels } from "@/lib/student/grading";
import type { ResultItem } from "@/lib/student/queries/assessments";
import { cn } from "@/lib/utils";

const verdict = (isCorrect: boolean | null) =>
  isCorrect === true
    ? { icon: CheckCircle2, label: "Juste", className: "text-success-light", border: "border-success/30" }
    : isCorrect === false
      ? { icon: XCircle, label: "À revoir", className: "text-danger-light", border: "border-danger/30" }
      : { icon: CircleMinus, label: "Correction par le formateur", className: "text-blanc/50", border: "border-line" };

/** Écran de résultat : score, appréciation du formateur et correction question par question. */
export function ResultView({
  title,
  passScore,
  status,
  percent,
  score,
  maxScore,
  feedback,
  items,
  submissionFile,
}: {
  title: string;
  passScore: number;
  status: "submitted" | "graded";
  percent: number | null;
  score: number | null;
  maxScore: number | null;
  feedback: string | null;
  items: ResultItem[];
  submissionFile: string | null;
}) {
  const graded = status === "graded";
  const passed = graded && percent !== null && percent >= passScore;
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <section className="flex flex-col items-center gap-5 rounded-3xl border border-line bg-gradient-card p-6 text-center sm:flex-row sm:text-left">
        {graded && percent !== null ? (
          <ProgressRing value={percent} size={120} stroke={9}>
            <span className={cn("font-display text-3xl tabular", passed ? "text-gradient-or" : "text-danger-light")}>{percent} %</span>
          </ProgressRing>
        ) : (
          <span className="grid size-24 place-items-center rounded-full border border-warning/30 bg-warning/10">
            <Hourglass aria-hidden className="size-10 text-warning-light" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl tracking-wide text-blanc">{graded ? (passed ? "Évaluation réussie" : "Évaluation non validée") : "Copie en correction"}</h1>
          <p className="mt-1 text-blanc/60">
            {title}
            {graded && score !== null && ` — ${score} / ${maxScore} points (seuil : ${passScore} %)`}
            {!graded && " — le formateur corrige votre copie. Vous serez notifié du résultat."}
          </p>
          {feedback && (
            <blockquote className="mt-3 rounded-xl border-l-2 border-or bg-or/5 px-4 py-2 text-sm text-blanc/75 italic">« {feedback} »</blockquote>
          )}
        </div>
        {graded && percent !== null && <Badge tone={passed ? "success" : "danger"}>{passed ? "Réussie" : `Seuil ${passScore} %`}</Badge>}
      </section>

      {submissionFile && (
        <p className="rounded-2xl border border-line bg-gradient-card px-5 py-4 text-sm text-blanc/70">
          Fichier déposé : <span className="font-medium text-blanc">{submissionFile}</span>
        </p>
      )}

      <ol className="space-y-4">
        {items.map((item, i) => {
          const v = verdict(item.isCorrect);
          const Icon = v.icon;
          return (
            <li key={item.question.id} className={cn("rounded-3xl border bg-gradient-card p-5 sm:p-6", v.border)}>
              <div className="flex items-start gap-3">
                <Icon aria-hidden className={cn("mt-0.5 size-5 shrink-0", v.className)} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-blanc">
                    {i + 1}. {item.question.prompt}
                  </p>
                  <p className="mt-0.5 text-xs text-blanc/45">
                    {questionKindLabels[item.question.kind]} · {item.pointsAwarded ?? "—"}/{item.question.points} pts · {v.label}
                  </p>
                </div>
              </div>
              <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-line bg-noir/40 p-3">
                  <dt className="text-xs font-semibold tracking-wider text-blanc/45 uppercase">Ma réponse</dt>
                  <dd className="mt-1 text-sm break-words whitespace-pre-line text-blanc/85">
                    {answerLabel(item.question.kind, item.myAnswer, item.question.options)}
                  </dd>
                </div>
                {graded && item.correctAnswer !== null && (
                  <div className="rounded-xl border border-success/25 bg-success/5 p-3">
                    <dt className="text-xs font-semibold tracking-wider text-success-light/80 uppercase">Réponse attendue</dt>
                    <dd className="mt-1 text-sm break-words text-blanc/85">
                      {answerLabel(item.question.kind, item.correctAnswer, item.question.options, true)}
                    </dd>
                  </div>
                )}
              </dl>
              {(item.explanation || item.feedback || item.question.lessonHref) && (
                <div className="mt-3 space-y-2">
                  {item.explanation && <p className="text-sm text-blanc/65">{item.explanation}</p>}
                  {item.feedback && <p className="text-sm text-or-light/90">Formateur : {item.feedback}</p>}
                  {item.question.lessonHref && item.isCorrect === false && (
                    <Link href={item.question.lessonHref} className="inline-flex items-center gap-1.5 text-sm font-medium text-or-light hover:underline">
                      <BookOpen aria-hidden className="size-4" /> Revoir « {item.question.lessonTitle} »
                    </Link>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
