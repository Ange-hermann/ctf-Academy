import { BriefcaseBusiness } from "lucide-react";
import { WorkCard } from "@/components/student/formation/work-card";
import { WrongFormation } from "@/components/student/formation/wrong-formation";
import { EmptyState } from "@/components/student/ui/empty-state";
import { StudentPageHeader } from "@/components/student/ui/page-header";
import { formationBase } from "@/config/student-nav";
import { getLeadershipWorks } from "@/lib/student/queries/formation";
import { requireStudent, withStudent } from "@/lib/student/session";

export const metadata = { title: "Travaux de leadership — EDM" };
const HREF = `${formationBase.edm}/leadership`;

export default async function EdmLeadershipPage() {
  const ctx = await requireStudent(HREF);
  if (ctx.enrollment.formation !== "edm") {
    return <WrongFormation expected="l'École des Mentors" current={ctx.enrollment.formationName} />;
  }
  const works = await withStudent(ctx.userId, (tx) => getLeadershipWorks(tx));
  const open = works.filter((w) => w.status === "todo" || w.status === "to_revise");
  const done = works.filter((w) => w.status === "submitted" || w.status === "validated");

  return (
    <>
      <StudentPageHeader
        title="Travaux de leadership"
        eyebrow="École des Mentors"
        description="Dossiers à rendre, notes obtenues et retours de l'équipe pédagogique."
        crumbs={[{ label: "Travaux de leadership", href: HREF }]}
      />
      {works.length === 0 ? (
        <EmptyState
          icon={BriefcaseBusiness}
          title="Aucun travail assigné"
          description="Vos travaux de leadership et leurs évaluations apparaîtront ici."
        />
      ) : (
        <div className="space-y-8">
          {open.length > 0 && (
            <section aria-labelledby="l-open">
              <h2 id="l-open" className="mb-4 text-xl tracking-wide text-blanc">
                À rendre <span className="font-sans text-sm text-blanc/50">({open.length})</span>
              </h2>
              <ul className="space-y-4">
                {open.map((w) => (
                  <WorkCard key={w.id} work={w} timezone={ctx.timezone} kind="leadership" />
                ))}
              </ul>
            </section>
          )}
          {done.length > 0 && (
            <section aria-labelledby="l-done">
              <h2 id="l-done" className="mb-4 text-xl tracking-wide text-blanc">
                Rendus et notés <span className="font-sans text-sm text-blanc/50">({done.length})</span>
              </h2>
              <ul className="space-y-4">
                {done.map((w) => (
                  <WorkCard key={w.id} work={w} timezone={ctx.timezone} kind="leadership" />
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </>
  );
}
