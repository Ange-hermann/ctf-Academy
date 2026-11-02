import { Medal } from "lucide-react";
import { WrongFormation } from "@/components/student/formation/wrong-formation";
import { EmptyState } from "@/components/student/ui/empty-state";
import { StudentPageHeader } from "@/components/student/ui/page-header";
import { ValidationList } from "@/components/student/validations/validation-card";
import { formationBase } from "@/config/student-nav";
import { getValidations } from "@/lib/student/queries/finance";
import { requireStudent } from "@/lib/student/session";

export const metadata = { title: "Validation des niveaux — École des STAFs" };
const HREF = `${formationBase.eds}/validation`;

export default async function EdsValidationPage() {
  const ctx = await requireStudent(HREF);
  if (ctx.enrollment.formation !== "eds") {
    return <WrongFormation expected="l'École des STAFs" current={ctx.enrollment.formationName} />;
  }
  const validations = (await getValidations(ctx)).filter((v) => v.kind === "level" || v.kind === "path");

  return (
    <>
      <StudentPageHeader
        title="Validation des niveaux"
        eyebrow="École des STAFs"
        description="Critères de validation et décisions de l'équipe pédagogique pour chaque palier. Les certificats se téléchargent depuis « Mes validations »."
        crumbs={[{ label: "Validation des niveaux", href: HREF }]}
      />
      {validations.length === 0 ? (
        <EmptyState
          icon={Medal}
          title="Aucune décision enregistrée"
          description="La validation d'un niveau est prononcée par l'équipe pédagogique lorsque les critères sont remplis."
        />
      ) : (
        <ValidationList items={validations} timezone={ctx.timezone} />
      )}
    </>
  );
}
