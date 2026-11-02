import { AssessmentCard } from "@/components/student/assessments/assessment-card";
import { StudentPageHeader } from "@/components/student/ui/page-header";
import { EmptyState } from "@/components/student/ui/empty-state";
import { ClipboardCheck } from "lucide-react";
import { studentRoutes } from "@/config/student-nav";
import { getAssessments } from "@/lib/student/queries/assessments";
import { requireStudent, withStudent } from "@/lib/student/session";

export const metadata = { title: "Mes évaluations" };

const groups = [
  { id: "open", title: "À faire et en cours", match: (s: string) => s === "todo" || s === "in_progress" },
  { id: "review", title: "En correction", match: (s: string) => s === "submitted" },
  { id: "done", title: "Résultats et archives", match: (s: string) => s === "graded" || s === "closed" },
] as const;

export default async function AssessmentsPage() {
  const ctx = await requireStudent(studentRoutes.assessments);
  const assessments = await withStudent(ctx.userId, (tx) => getAssessments(tx, ctx.enrollment.formationId));
  const open = assessments.filter((a) => groups[0].match(a.status));
  const pendingCount = open.filter((a) => a.status !== "in_progress").length;

  return (
    <>
      <StudentPageHeader
        title="Mes évaluations"
        eyebrow={pendingCount ? `${pendingCount} à passer` : "Tout est à jour"}
        description="Quiz, exercices et examens de votre formation. Les résultats et corrections apparaissent ici."
        crumbs={[{ label: "Mes évaluations", href: studentRoutes.assessments }]}
      />
      {assessments.length === 0 ? (
        <EmptyState icon={ClipboardCheck} title="Aucune évaluation" description="Les quiz et exercices de votre formation seront publiés ici." />
      ) : (
        <div className="space-y-10">
          {groups.map((g) => {
            const list = assessments.filter((a) => g.match(a.status));
            if (!list.length) return null;
            return (
              <section key={g.id} aria-labelledby={`g-${g.id}`}>
                <h2 id={`g-${g.id}`} className="mb-4 text-xl tracking-wide text-blanc">
                  {g.title} <span className="font-sans text-sm text-blanc/50">({list.length})</span>
                </h2>
                <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {list.map((a, i) => (
                    <li key={a.id} className="cascade" style={{ "--i": i } as React.CSSProperties}>
                      <AssessmentCard assessment={a} tz={ctx.timezone} />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
