import { Layers } from "lucide-react";
import { EmptyState } from "@/components/student/ui/empty-state";
import { StudentPageHeader } from "@/components/student/ui/page-header";
import { LevelsView } from "@/components/student/formation/levels-view";
import { WrongFormation } from "@/components/student/formation/wrong-formation";
import { formationBase } from "@/config/student-nav";
import { getLearning } from "@/lib/student/queries/learning";
import { requireStudent, withStudent } from "@/lib/student/session";

export const metadata = { title: "Les 2 niveaux de l'EDM" };
const HREF = `${formationBase.edm}/niveaux`;

export default async function EdmNiveauxPage() {
  const ctx = await requireStudent(HREF);
  if (ctx.enrollment.formation !== "edm") {
    return <WrongFormation expected="l'École des Mentors" current={ctx.enrollment.formationName} />;
  }
  const learning = await withStudent(ctx.userId, (tx) => getLearning(tx, ctx.enrollment.formationId));

  return (
    <>
      <StudentPageHeader
        title="Cours des 2 niveaux"
        eyebrow="École des Mentors"
        description="Les deux paliers de votre formation de mentor : modules, progression et état des validations."
        crumbs={[{ label: "Cours des 2 niveaux", href: HREF }]}
      />
      {learning.levels.length === 0 ? (
        <EmptyState icon={Layers} title="Niveaux en préparation" description="Les paliers de votre formation seront publiés prochainement." />
      ) : (
        <LevelsView levels={learning.levels} />
      )}
    </>
  );
}
