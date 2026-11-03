import { InternshipView } from "@/components/student/formation/internship-view";
import { WrongFormation } from "@/components/student/formation/wrong-formation";
import { formationBase } from "@/config/student-nav";
import { getInternship } from "@/lib/student/queries/formation";
import { requireStudent, withStudent } from "@/lib/student/session";

export const metadata = { title: "Suivi du stage pratique — Diacres" };
const HREF = `${formationBase.diacres}/stage`;

export default async function DiacresStagePage() {
  const ctx = await requireStudent(HREF);
  if (ctx.enrollment.formation !== "diacres") {
    return <WrongFormation expected="l'École des Diacres" current={ctx.enrollment.formationName} />;
  }
  const stage = await withStudent(ctx.userId, (tx) => getInternship(tx, ctx.userId));
  return (
    <InternshipView
      stage={stage}
      eyebrow="École des Diacres"
      href={HREF}
      timezone={ctx.timezone}
      reportHref={`${formationBase.diacres}/rapport`}
      emptyDescription="Votre affectation de stage sera publiée ici par le pasteur, avec ses étapes et son référent."
    />
  );
}
