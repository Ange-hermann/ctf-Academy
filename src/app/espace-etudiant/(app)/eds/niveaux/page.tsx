import { Layers } from "lucide-react";
import { EmptyState } from "@/components/student/ui/empty-state";
import { StudentPageHeader } from "@/components/student/ui/page-header";
import { LevelsView } from "@/components/student/formation/levels-view";
import { WrongFormation } from "@/components/student/formation/wrong-formation";
import { formationBase } from "@/config/student-nav";
import { getLearning } from "@/lib/student/queries/learning";
import { requireStudent, withStudent } from "@/lib/student/session";

export const metadata = { title: "Les 4 niveaux de l'École des STAFs" };
const HREF = `${formationBase.eds}/niveaux`;

export default async function EdsNiveauxPage() {
  const ctx = await requireStudent(HREF);
  if (ctx.enrollment.formation !== "eds") {
    return <WrongFormation expected="l'École des STAFs" current={ctx.enrollment.formationName} />;
  }
  const learning = await withStudent(ctx.userId, (tx) => getLearning(tx, ctx.enrollment.formationId));

  return (
    <>
      <StudentPageHeader
        title="Cours des 4 niveaux"
        eyebrow="École des STAFs"
        description="Chaque niveau se valide par décision de l'équipe pédagogique et ouvre le suivant. Retrouvez vos modules, votre progression et l'état des validations."
        crumbs={[{ label: "Cours des 4 niveaux", href: HREF }]}
      />
      {learning.levels.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="Niveaux en préparation"
          description="Les paliers de votre formation seront publiés prochainement."
        />
      ) : (
        <LevelsView levels={learning.levels} />
      )}
    </>
  );
}
