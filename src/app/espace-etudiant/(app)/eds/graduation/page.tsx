import Link from "next/link";
import { Clock3, GraduationCap, HandHeart, Medal } from "lucide-react";
import { WrongFormation } from "@/components/student/formation/wrong-formation";
import { EmptyState } from "@/components/student/ui/empty-state";
import { StudentPageHeader } from "@/components/student/ui/page-header";
import { ValidationList } from "@/components/student/validations/validation-card";
import { formationBase } from "@/config/student-nav";
import { getValidations } from "@/lib/student/queries/finance";
import { getServiceRecords } from "@/lib/student/queries/formation";
import { requireStudent, withStudent } from "@/lib/student/session";

export const metadata = { title: "Graduation STAF" };
const HREF = `${formationBase.eds}/graduation`;
const fmtHours = (h: number) => `${h.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} h`;

export default async function EdsGraduationPage() {
  const ctx = await requireStudent(HREF);
  if (ctx.enrollment.formation !== "eds") {
    return <WrongFormation expected="l'École des STAFs" current={ctx.enrollment.formationName} />;
  }
  const [validations, service] = await Promise.all([
    getValidations(ctx),
    withStudent(ctx.userId, (tx) => getServiceRecords(tx)),
  ]);
  const graduation = validations.filter((v) => v.kind === "graduation" || v.kind === "service");

  return (
    <>
      <StudentPageHeader
        title="Graduation STAF"
        eyebrow="École des STAFs"
        description="La graduation couronne votre parcours : niveaux validés et service reconnu. Suivez ici les conditions restantes et la décision finale."
        crumbs={[{ label: "Graduation STAF", href: HREF }]}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="rounded-3xl border border-line bg-gradient-card p-5" aria-labelledby="grad-hours">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl border border-or/30 bg-or/10 text-or-light">
              <HandHeart aria-hidden className="size-5" />
            </span>
            <h2 id="grad-hours" className="font-semibold text-blanc">
              Service reconnu
            </h2>
          </div>
          <p className="mt-3 text-2xl font-semibold text-or-light">{fmtHours(service.recognizedHours)}</p>
          <p className="mt-1 text-sm text-blanc/55">
            {fmtHours(service.totalHours)} déclarées au total ·{" "}
            <Link href={`${formationBase.eds}/service`} className="font-medium text-or-light hover:text-or hover:underline">
              voir le détail
            </Link>
          </p>
        </section>

        <section className="rounded-3xl border border-line bg-gradient-card p-5" aria-labelledby="grad-steps">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl border border-or/30 bg-or/10 text-or-light">
              <Clock3 aria-hidden className="size-5" />
            </span>
            <h2 id="grad-steps" className="font-semibold text-blanc">
              Conditions en cours
            </h2>
          </div>
          <p className="mt-3 text-2xl font-semibold text-or-light">
            {graduation.filter((v) => v.decision === "pending").length}
          </p>
          <p className="mt-1 text-sm text-blanc/55">décision(s) en attente sur le dossier de graduation</p>
        </section>
      </div>

      <div className="mt-8">
        {graduation.length === 0 ? (
          <EmptyState
            icon={GraduationCap}
            title="Dossier de graduation pas encore ouvert"
            description="Il s'ouvrira lorsque vos niveaux seront validés et votre service reconnu. Les critères et la décision apparaîtront ici."
            action={{ label: "Voir mes validations", href: `${formationBase.eds}/validation` }}
          />
        ) : (
          <>
            <div className="mb-4 flex items-center gap-3">
              <Medal aria-hidden className="size-5 text-or" />
              <h2 className="text-xl tracking-wide text-blanc">Dossier de graduation</h2>
            </div>
            <ValidationList items={graduation} timezone={ctx.timezone} />
          </>
        )}
      </div>
    </>
  );
}
