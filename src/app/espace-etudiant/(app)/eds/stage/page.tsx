import { InternshipView } from "@/components/student/formation/internship-view";
import { WrongFormation } from "@/components/student/formation/wrong-formation";
import { formationBase } from "@/config/student-nav";
import { getInternship } from "@/lib/student/queries/formation";
import { requireStudent, withStudent } from "@/lib/student/session";

export const metadata = { title: "Suivi du stage pratique — EDS" };
const HREF = `${formationBase.eds}/stage`;

export default async function EdsStagePage() {
  const ctx = await requireStudent(HREF);
  if (ctx.enrollment.formation !== "eds") {
    return <WrongFormation expected="l'École des STAFs" current={ctx.enrollment.formationName} />;
  }
  const stage = await withStudent(ctx.userId, (tx) => getInternship(tx, ctx.userId));
  return (
    <InternshipView
      stage={stage}
      eyebrow="École des STAFs"
      href={HREF}
      timezone={ctx.timezone}
      emptyDescription="Votre stage se déroule dans un département de l'Église — l'affectation du pasteur apparaîtra ici."
    />
  );
}
