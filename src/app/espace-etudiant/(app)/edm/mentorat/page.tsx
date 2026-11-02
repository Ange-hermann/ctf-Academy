import { UserRoundCheck } from "lucide-react";
import { WorkCard } from "@/components/student/formation/work-card";
import { WrongFormation } from "@/components/student/formation/wrong-formation";
import { EmptyState } from "@/components/student/ui/empty-state";
import { StudentPageHeader } from "@/components/student/ui/page-header";
import { formationBase } from "@/config/student-nav";
import { getMentoring } from "@/lib/student/queries/formation";
import { requireStudent, withStudent } from "@/lib/student/session";

export const metadata = { title: "Exercices de mentorat — EDM" };
const HREF = `${formationBase.edm}/mentorat`;

export default async function EdmMentoratPage() {
  const ctx = await requireStudent(HREF);
  if (ctx.enrollment.formation !== "edm") {
    return <WrongFormation expected="l'École des Mentors" current={ctx.enrollment.formationName} />;
  }
  const works = await withStudent(ctx.userId, (tx) => getMentoring(tx));
  const open = works.filter((w) => w.status === "todo" || w.status === "to_revise");
  const done = works.filter((w) => w.status === "submitted" || w.status === "validated");

  return (
    <>
      <StudentPageHeader
        title="Exercices de mentorat"
        eyebrow="École des Mentors"
        description="Rencontres guidées et comptes rendus de votre pratique de mentorat, avec les retours de votre formateur."
        crumbs={[{ label: "Exercices de mentorat", href: HREF }]}
      />
      {works.length === 0 ? (
        <EmptyState
          icon={UserRoundCheck}
          title="Aucun exercice de mentorat"
          description="Vos exercices pratiques et comptes rendus apparaîtront ici au fil de la formation."
        />
      ) : (
        <div className="space-y-8">
          {open.length > 0 && (
            <section aria-labelledby="m-open">
              <h2 id="m-open" className="mb-4 text-xl tracking-wide text-blanc">
                À réaliser <span className="font-sans text-sm text-blanc/50">({open.length})</span>
              </h2>
              <ul className="space-y-4">
                {open.map((w) => (
                  <WorkCard key={w.id} work={w} timezone={ctx.timezone} kind="mentorat" />
                ))}
              </ul>
            </section>
          )}
          {done.length > 0 && (
            <section aria-labelledby="m-done">
              <h2 id="m-done" className="mb-4 text-xl tracking-wide text-blanc">
                Rendus et validés <span className="font-sans text-sm text-blanc/50">({done.length})</span>
              </h2>
              <ul className="space-y-4">
                {done.map((w) => (
                  <WorkCard key={w.id} work={w} timezone={ctx.timezone} kind="mentorat" />
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </>
  );
}
