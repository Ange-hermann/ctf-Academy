import Link from "next/link";
import { ArrowRight, BookOpen, ClipboardCheck } from "lucide-react";
import { AssessmentCard } from "@/components/student/assessments/assessment-card";
import { WrongFormation } from "@/components/student/formation/wrong-formation";
import { EmptyState } from "@/components/student/ui/empty-state";
import { StudentPageHeader } from "@/components/student/ui/page-header";
import { formationBase, moduleHref, studentRoutes } from "@/config/student-nav";
import { getAssessments } from "@/lib/student/queries/assessments";
import { getLearning } from "@/lib/student/queries/learning";
import { requireStudent, withStudent } from "@/lib/student/session";

export const metadata = { title: "Cours et évaluations — Diacres" };
const HREF = `${formationBase.diacres}/cours`;

export default async function DiacresCoursPage() {
  const ctx = await requireStudent(HREF);
  if (ctx.enrollment.formation !== "diacres") {
    return <WrongFormation expected="l'École des Diacres" current={ctx.enrollment.formationName} />;
  }
  const [learning, assessments] = await withStudent(ctx.userId, async (tx) => [
    await getLearning(tx, ctx.enrollment.formationId),
    await getAssessments(tx, ctx.enrollment.formationId),
  ]);

  return (
    <>
      <StudentPageHeader
        title="Cours et évaluations"
        eyebrow="École des Diacres"
        description="Les modules de votre tronc commun et les évaluations associées. Le stage et le mémoire ont leurs pages dédiées."
        crumbs={[{ label: "Cours et évaluations", href: HREF }]}
      />

      <section aria-labelledby="dc-modules">
        <h2 id="dc-modules" className="mb-4 text-xl tracking-wide text-blanc">
          Modules <span className="font-sans text-sm text-blanc/50">({learning.modules.length})</span>
        </h2>
        {learning.modules.length === 0 ? (
          <EmptyState icon={BookOpen} title="Aucun module publié" description="Vos cours apparaîtront ici." />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {learning.modules.map((m) => (
              <li key={m.id}>
                <Link
                  href={moduleHref(m.slug)}
                  className="group flex h-full flex-col rounded-2xl border border-line bg-gradient-card p-4 transition-colors hover:border-or/40"
                >
                  <p className="font-medium text-blanc group-hover:text-or-light">{m.title}</p>
                  <p className="mt-1 text-sm text-blanc/55">
                    {m.completed}/{m.total} leçons{m.levelNumber != null ? ` · niveau ${m.levelNumber}` : ""}
                  </p>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-or/15">
                    <div className="h-full origin-left rounded-full bg-gradient-or" style={{ transform: `scaleX(${m.percent / 100})` }} />
                  </div>
                  <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-or-light">
                    Ouvrir <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="dc-evals" className="mt-10">
        <h2 id="dc-evals" className="mb-4 text-xl tracking-wide text-blanc">
          Évaluations <span className="font-sans text-sm text-blanc/50">({assessments.length})</span>
        </h2>
        {assessments.length === 0 ? (
          <EmptyState
            icon={ClipboardCheck}
            title="Aucune évaluation publiée"
            description="Les quiz et examens de votre formation apparaîtront ici."
            action={{ label: "Toutes mes évaluations", href: studentRoutes.assessments }}
          />
        ) : (
          <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {assessments.map((a) => (
              <li key={a.id}>
                <AssessmentCard assessment={a} tz={ctx.timezone} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
