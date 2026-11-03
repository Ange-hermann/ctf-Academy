import Link from "next/link";
import { AdminIntro, AdminSection, AdminTable, StatusBadge } from "@/components/admin/ui";
import { EdmReportControl } from "@/components/admin/controls";
import { WeeklyReportView } from "@/components/weekly-report-view";
import { adminRoutes } from "@/config/admin-nav";
import { requireAdminRoles } from "@/lib/admin/session";
import { getEdmData, getEdmStudentReports, type EdmRow } from "@/lib/admin/queries";
import { weeklyReportWindow } from "@/lib/edm";
import { formatShortDate } from "@/lib/student/format";

const formatWeek = (iso: string) => iso.slice(0, 10).split("-").reverse().join("/");

export default async function EdmPage({ searchParams }: PageProps<"/admin/edm">) {
  const ctx = await requireAdminRoles(["admin", "pastor"], adminRoutes.edm);
  const sp = await searchParams;
  const studentId = typeof sp.etudiant === "string" ? sp.etudiant : null;
  const data = await getEdmData(ctx);
  const detail = studentId ? await getEdmStudentReports(ctx, studentId) : null;
  const win = weeklyReportWindow();
  const toValidate = data.rows.reduce((s, r) => s + r.toValidate, 0);

  const weekCell = (r: EdmRow) =>
    r.currentWeek ? (
      <StatusBadge status={r.currentWeek.status} />
    ) : win.open ? (
      <span className="text-xs font-medium text-warning-light">À remplir</span>
    ) : (
      <span className="text-xs text-blanc/45">Non remplie</span>
    );

  return (
    <>
      <AdminIntro
        title="Étudiants EDM"
        subtitle={`Fiches de transformation hebdomadaires — saisie ouverte du vendredi 6 h au samedi 23 h 59. Semaine du ${formatWeek(win.weekStart)}.`}
      />

      <div className="space-y-6">
        <AdminSection title={`Fiches de la semaine (${data.rows.length} étudiants · ${toValidate} à valider)`}>
          {data.rows.length ? (
            <AdminTable head={["Étudiant", "Semaine en cours", "Dernière fiche", "Fiches", "À valider", ""]}>
              {data.rows.map((r) => (
                <tr key={r.userId}>
                  <td className="px-2 py-3 text-blanc">
                    {r.name}
                    <span className="block text-xs text-blanc/45">{r.reference}</span>
                  </td>
                  <td className="px-2 py-3">{weekCell(r)}</td>
                  <td className="px-2 py-3 text-blanc/70">
                    {r.lastWeek ? (
                      <>
                        <span className="whitespace-nowrap">{formatWeek(r.lastWeek.weekStart)}</span>{" "}
                        <StatusBadge status={r.lastWeek.status} />
                      </>
                    ) : (
                      <span className="text-xs text-blanc/45">—</span>
                    )}
                  </td>
                  <td className="px-2 py-3 text-blanc/70">{r.reportsCount}</td>
                  <td className="px-2 py-3">{r.toValidate > 0 ? <span className="text-sm font-medium text-or-light">{r.toValidate}</span> : <span className="text-xs text-blanc/45">0</span>}</td>
                  <td className="px-2 py-3 text-right">
                    <Link href={`${adminRoutes.edm}?etudiant=${r.userId}`} className="text-sm text-or-light hover:text-or">
                      Suivre
                    </Link>
                  </td>
                </tr>
              ))}
            </AdminTable>
          ) : (
            <p className="text-sm text-blanc/50">Aucun étudiant admis en École des Mentors pour le moment.</p>
          )}
        </AdminSection>

        {detail && (
          <AdminSection title={`Fiches de ${detail.name}`}>
            {detail.reports.length ? (
              <ul className="space-y-4">
                {detail.reports.map((r) => (
                  <li key={r.id} className="rounded-2xl border border-line/60 p-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium text-blanc">
                        Semaine du {formatWeek(r.weekStart)}
                        <span className="ml-2 text-xs font-normal text-blanc/45">déposée le {formatShortDate(r.submittedAt, "UTC")}</span>
                      </p>
                      <StatusBadge status={r.status} />
                    </div>
                    <WeeklyReportView r={r} />
                    <div className="mt-4 border-t border-line/50 pt-3">
                      {r.observation && <p className="mb-2 text-sm text-blanc/70">Observation : {r.observation}</p>}
                      <EdmReportControl reportId={r.id} validated={r.status === "validated"} observation={r.observation} />
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-blanc/50">Aucune fiche déposée pour le moment.</p>
            )}
          </AdminSection>
        )}
      </div>
    </>
  );
}
