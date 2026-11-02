import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { ResultView } from "@/components/student/assessments/result-view";
import { StudentPageHeader } from "@/components/student/ui/page-header";
import { Button } from "@/components/ui/button";
import { assessmentHref, resultHref, studentRoutes } from "@/config/student-nav";
import { getAttemptResult } from "@/lib/student/queries/assessments";
import { requireStudent } from "@/lib/student/session";

export const metadata = { title: "Résultat" };

export default async function ResultPage({ params, searchParams }: PageProps<"/espace-etudiant/evaluations/[id]/resultat">) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const ctx = await requireStudent(studentRoutes.assessments);
  const result = await getAttemptResult(ctx, id, typeof sp.tentative === "string" ? sp.tentative : undefined);
  if (!result) notFound();
  const { assessment: a, attempt, items, submission } = result;
  const canRetry = a.canStart && a.attemptsLeft > 0 && attempt.passed === false;

  return (
    <>
      <StudentPageHeader
        title="Mon résultat"
        crumbs={[
          { label: "Mes évaluations", href: studentRoutes.assessments },
          { label: a.title, href: assessmentHref(a.id) },
          { label: "Résultat", href: resultHref(a.id, attempt.id) },
        ]}
        actions={
          canRetry ? (
            <Button asChild>
              <Link href={assessmentHref(a.id)}>
                Réessayer ({a.attemptsLeft} restante{a.attemptsLeft > 1 ? "s" : ""}) <ArrowRight />
              </Link>
            </Button>
          ) : undefined
        }
      />
      <ResultView
        title={a.title}
        passScore={a.passScore}
        status={attempt.status === "graded" ? "graded" : "submitted"}
        percent={attempt.percent}
        score={attempt.score}
        maxScore={attempt.maxScore}
        feedback={attempt.feedback}
        items={items}
        submissionFile={submission?.fileName ?? null}
      />
    </>
  );
}
