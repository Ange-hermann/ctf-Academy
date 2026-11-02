import { Medal } from "lucide-react";
import { WrongFormation } from "@/components/student/formation/wrong-formation";
import { EmptyState } from "@/components/student/ui/empty-state";
import { StudentPageHeader } from "@/components/student/ui/page-header";
import { ValidationList } from "@/components/student/validations/validation-card";
import { formationBase } from "@/config/student-nav";
import { getValidations } from "@/lib/student/queries/finance";
import { requireStudent } from "@/lib/student/session";

export const metadata = { title: "Validation du parcours — EDM" };
const HREF = `${formationBase.edm}/validation`;

export default async function EdmValidationPage() {
  const ctx = await requireStudent(HREF);
  if (ctx.enrollment.formation !== "edm") {
    return <WrongFormation expected="l'École des Mentors" current={ctx.enrollment.formationName} />;
  }
  const validations = (await getValidations(ctx)).filter((v) => v.kind === "level" || v.kind === "path");

  return (
    <>
      <StudentPageHeader
        title="Validation du parcours"
        eyebrow="École des Mentors"
        description="Critères et décisions officielles pour votre parcours de mentor : niveaux et validation finale."
        crumbs={[{ label: "Validation du parcours", href: HREF }]}
      />
      {validations.length === 0 ? (
        <EmptyState
          icon={Medal}
          title="Aucune décision enregistrée"
          description="Les validations de votre parcours seront prononcées ici par l'équipe pédagogique."
        />
      ) : (
        <ValidationList items={validations} timezone={ctx.timezone} />
      )}
    </>
  );
}
