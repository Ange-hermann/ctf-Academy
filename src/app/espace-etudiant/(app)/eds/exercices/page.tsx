import { ClipboardCheck } from "lucide-react";
import { AssessmentCard } from "@/components/student/assessments/assessment-card";
import { EmptyState } from "@/components/student/ui/empty-state";
import { StudentPageHeader } from "@/components/student/ui/page-header";
import { WrongFormation } from "@/components/student/formation/wrong-formation";
import { formationBase, studentRoutes } from "@/config/student-nav";
import { getAssessments } from "@/lib/student/queries/assessments";
import { requireStudent, withStudent } from "@/lib/student/session";

export const metadata = { title: "Quiz et exercices — École des STAFs" };
const HREF = `${formationBase.eds}/exercices`;

export default async function EdsExercicesPage() {
  const ctx = await requireStudent(HREF);
  if (ctx.enrollment.formation !== "eds") {
    return <WrongFormation expected="l'École des STAFs" current={ctx.enrollment.formationName} />;
  }
  const assessments = await withStudent(ctx.userId, (tx) => getAssessments(tx, ctx.enrollment.formationId));

  const byLevel = new Map<number | null, typeof assessments>();
  for (const a of assessments) {
    const list = byLevel.get(a.levelNumber) ?? [];
    list.push(a);
    byLevel.set(a.levelNumber, list);
  }
  const groups = [...byLevel.entries()].sort(([a], [b]) => (a ?? 99) - (b ?? 99));

  return (
    <>
      <StudentPageHeader
        title="Quiz et exercices"
        eyebrow="École des STAFs"
        description="La banque d'évaluations de votre formation, classée par niveau. Chaque passage est corrigé puis comptabilisé dans votre progression."
        crumbs={[{ label: "Quiz et exercices", href: HREF }]}
      />
      {assessments.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="Aucune évaluation publiée"
          description="Les quiz et exercices de vos niveaux apparaîtront ici."
          action={{ label: "Voir mes cours", href: studentRoutes.courses }}
        />
      ) : (
        <div className="space-y-10">
          {groups.map(([level, list]) => (
            <section key={level ?? "autres"} aria-labelledby={`lv-${level ?? "autres"}`}>
              <h2 id={`lv-${level ?? "autres"}`} className="mb-4 text-xl tracking-wide text-blanc">
                {level != null ? `Niveau ${level}` : "Évaluations transverses"}{" "}
                <span className="font-sans text-sm text-blanc/50">({list.length})</span>
              </h2>
              <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {list.map((a) => (
                  <li key={a.id}>
                    <AssessmentCard assessment={a} tz={ctx.timezone} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
