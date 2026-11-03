import { InternshipView } from "@/components/student/formation/internship-view";
import { WrongFormation } from "@/components/student/formation/wrong-formation";
import { formationBase } from "@/config/student-nav";
import { EDM_STAGE_PLACE } from "@/lib/internships";
import { getInternship } from "@/lib/student/queries/formation";
import { requireStudent, withStudent } from "@/lib/student/session";

export const metadata = { title: "Suivi du stage pratique — EDM" };
const HREF = `${formationBase.edm}/stage`;

export default async function EdmStagePage() {
  const ctx = await requireStudent(HREF);
  if (ctx.enrollment.formation !== "edm") {
    return <WrongFormation expected="l'École des Mentors" current={ctx.enrollment.formationName} />;
  }
  const stage = await withStudent(ctx.userId, (tx) => getInternship(tx, ctx.userId));
  return (
    <InternshipView
      stage={stage}
      eyebrow="École des Mentors"
      href={HREF}
      timezone={ctx.timezone}
      emptyDescription={`Votre stage se déroule à « ${EDM_STAGE_PLACE} » — l'affectation du pasteur apparaîtra ici.`}
    />
  );
}
