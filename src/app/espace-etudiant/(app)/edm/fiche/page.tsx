import { ClipboardCheck } from "lucide-react";
import { EmptyState } from "@/components/student/ui/empty-state";
import { StudentPageHeader } from "@/components/student/ui/page-header";
import { WeeklyReportForm } from "@/components/student/formation/weekly-report-form";
import { WrongFormation } from "@/components/student/formation/wrong-formation";
import { WeeklyReportView } from "@/components/weekly-report-view";
import { formationBase } from "@/config/student-nav";
import { weeklyReportWindow } from "@/lib/edm";
import { formatShortDate } from "@/lib/student/format";
import { getWeeklyReports, type WeeklyReport } from "@/lib/student/queries/formation";
import { requireStudent, withStudent } from "@/lib/student/session";

export const metadata = { title: "Fiche de transformation — EDM" };
const HREF = `${formationBase.edm}/fiche`;

const statusLabel = (r: WeeklyReport) =>
  r.status === "validated" ? (
    <span className="rounded-full border border-success/40 bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success-light">Validée</span>
  ) : (
    <span className="rounded-full border border-or/40 bg-or/10 px-2.5 py-0.5 text-xs font-medium text-or-light">Déposée — en relecture</span>
  );

export default async function EdmFichePage() {
  const ctx = await requireStudent(HREF);
  if (ctx.enrollment.formation !== "edm") {
    return <WrongFormation expected="l'École des Mentors" current={ctx.enrollment.formationName} />;
  }
  const reports = await withStudent(ctx.userId, (tx) => getWeeklyReports(tx));
  const win = weeklyReportWindow();
  const current = reports.find((r) => r.weekStart === win.weekStart) ?? null;
  const history = reports.filter((r) => r.weekStart !== win.weekStart);
  const weekLabel = formatShortDate(win.weekStart, ctx.timezone);

  return (
    <>
      <StudentPageHeader
        title="Fiche de transformation"
        eyebrow="École des Mentors"
        description="Chaque semaine, fais le point sur ta marche avec le Seigneur, tes départements et tes mentorés. Ton pasteur relit et valide ta fiche."
        crumbs={[{ label: "Fiche de transformation", href: HREF }]}
      />

      <section className="rounded-2xl border border-or/25 bg-noir-card p-5 shadow-card sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-semibold text-blanc">Semaine du {weekLabel}</h2>
          {win.open ? (
            <span className="rounded-full border border-or/40 bg-or/10 px-3 py-1 text-xs font-medium text-or-light">Saisie ouverte — jusqu&rsquo;à samedi 23 h 59</span>
          ) : (
            <span className="rounded-full border border-line px-3 py-1 text-xs font-medium text-blanc/55">Saisie fermée — réouverture vendredi 6 h</span>
          )}
        </div>

        {win.open && current?.status !== "validated" ? (
          <WeeklyReportForm existing={current} />
        ) : current ? (
          <div className="mt-4">
            <div className="mb-3 flex items-center gap-2">{statusLabel(current)}</div>
            <WeeklyReportView r={current} />
            {current.observation && (
              <p className="mt-4 rounded-xl border border-or/25 bg-or/5 px-4 py-3 text-sm text-blanc/80">
                <span className="font-medium text-or-light">Observation de ton pasteur : </span>
                {current.observation}
              </p>
            )}
          </div>
        ) : (
          <EmptyState
            icon={ClipboardCheck}
            title="Fenêtre fermée"
            description="La fiche s'ouvre chaque vendredi à 6 h et se ferme le samedi à 23 h 59. Reviens à ce moment pour remplir ta semaine."
          />
        )}
      </section>

      {history.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-4 text-xl tracking-wide text-blanc">
            Fiches précédentes <span className="font-sans text-sm text-blanc/50">({history.length})</span>
          </h2>
          <ul className="space-y-4">
            {history.map((r) => (
              <li key={r.id} className="rounded-2xl border border-line/60 bg-noir-card/60 p-5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-blanc">Semaine du {formatShortDate(r.weekStart, ctx.timezone)}</p>
                  {statusLabel(r)}
                </div>
                <WeeklyReportView r={r} />
                {r.observation && (
                  <p className="mt-4 rounded-xl border border-or/25 bg-or/5 px-4 py-3 text-sm text-blanc/80">
                    <span className="font-medium text-or-light">Observation de ton pasteur : </span>
                    {r.observation}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
