import { Medal } from "lucide-react";
import { EmptyState } from "@/components/student/ui/empty-state";
import { StudentPageHeader } from "@/components/student/ui/page-header";
import { ValidationList } from "@/components/student/validations/validation-card";
import { studentRoutes } from "@/config/student-nav";
import { getValidations } from "@/lib/student/queries/finance";
import { requireStudent } from "@/lib/student/session";

export const metadata = { title: "Mes validations" };

export default async function ValidationsPage() {
  const ctx = await requireStudent(studentRoutes.validations);
  const validations = await getValidations(ctx);

  return (
    <>
      <StudentPageHeader
        title="Mes validations"
        description="Attestations, certificats et décisions officielles de votre parcours. Les certificats se téléchargent en PDF et sont vérifiables en ligne."
        crumbs={[{ label: "Mes validations", href: studentRoutes.validations }]}
      />

      {validations.length === 0 ? (
        <EmptyState
          icon={Medal}
          title="Aucune validation pour le moment"
          description="Vos validations de niveau, attestations et diplômes apparaîtront ici au fil de votre parcours."
          action={{ label: "Voir mes cours", href: studentRoutes.courses }}
        />
      ) : (
        <ValidationList items={validations} timezone={ctx.timezone} />
      )}
    </>
  );
}
