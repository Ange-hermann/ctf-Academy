import Link from "next/link";
import { AdminIntro, AdminSection, AdminTable, StatusBadge } from "@/components/admin/ui";
import { HoursToggle, ReportStatusPicker, StepStatusPicker, VersionStatusPicker } from "@/components/admin/controls";
import { adminRoutes } from "@/config/admin-nav";
import { requireAdminRoles } from "@/lib/admin/session";
import { getStageDetail, getStagesOverview, getThesisDetail } from "@/lib/admin/queries";
import { formatShortDate } from "@/lib/student/format";

export default async function StagesPage({ searchParams }: PageProps<"/admin/stages">) {
  const ctx = await requireAdminRoles(["admin", "supervisor"], adminRoutes.stages);
  const sp = await searchParams;
  const stageId = typeof sp.stage === "string" ? sp.stage : null;
  const thesisId = typeof sp.these === "string" ? sp.these : null;
  const data = await getStagesOverview(ctx);
  const stageDetail = stageId ? await getStageDetail(ctx, stageId) : null;
  const thesisDetail = thesisId ? await getThesisDetail(ctx, thesisId) : null;

  return (
    <>
      <AdminIntro title="Stages & mémoires" subtitle="Suivi des stages pratiques, évaluation des rapports et relecture des mémoires (formation des diacres)." />

      <div className="space-y-6">
        <AdminSection title="Stages en cours">
          {data.stages.length ? (
            <AdminTable head={["Étudiant", "Lieu · Référent", "Période", "Heures", "Étapes", "Rapport", ""]}>
              {data.stages.map((s) => (
                <tr key={s.id}>
                  <td className="px-2 py-3 text-blanc">{s.studentName}</td>
                  <td className="px-2 py-3 text-blanc/70">
                    {s.place}
                    <span className="block text-xs text-blanc/45">{s.supervisorName}</span>
                  </td>
                  <td className="px-2 py-3 text-xs whitespace-nowrap text-blanc/60">
                    {formatShortDate(s.startsOn, "UTC")} → {formatShortDate(s.endsOn, "UTC")}
                  </td>
                  <td className="px-2 py-3 whitespace-nowrap text-blanc/80">
                    {s.doneHours}/{s.targetHours} h
                    {s.unvalidatedHours > 0 && <span className="ml-1 text-xs text-warning-light">({s.unvalidatedHours} à valider)</span>}
                  </td>
                  <td className="px-2 py-3 text-blanc/70">{s.openSteps} ouverte{s.openSteps > 1 ? "s" : ""}</td>
                  <td className="px-2 py-3">{s.lastReport ? <StatusBadge status={s.lastReport.status} /> : <span className="text-xs text-blanc/45">—</span>}</td>
                  <td className="px-2 py-3 text-right">
                    <Link href={`${adminRoutes.stages}?stage=${s.id}`} className="text-sm text-or-light hover:text-or">
                      Suivre
                    </Link>
                  </td>
                </tr>
              ))}
            </AdminTable>
          ) : (
            <p className="text-sm text-blanc/50">Aucun stage enregistré.</p>
          )}
        </AdminSection>

        {stageDetail && (
          <AdminSection title={`Stage de ${stageDetail.studentName}`}>
            <div className="grid gap-6 xl:grid-cols-3">
              <div>
                <h3 className="mb-2 text-sm font-semibold text-blanc/80">Étapes</h3>
                <ul className="space-y-3">
                  {stageDetail.steps.map((st) => (
                    <li key={st.id} className="rounded-xl border border-line p-3">
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <span className="text-blanc">{st.title}</span>
                        <StatusBadge status={st.status} />
                      </div>
                      {st.comment && <p className="mt-1 text-xs text-blanc/55">{st.comment}</p>}
                      <div className="mt-2"><StepStatusPicker stepId={st.id} value={st.status} /></div>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="mb-2 text-sm font-semibold text-blanc/80">Journal d&rsquo;heures</h3>
                <ul className="space-y-2">
                  {stageDetail.hours.map((h) => (
                    <li key={h.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-line p-3 text-sm">
                      <span className="text-blanc/60">{formatShortDate(h.workedOn, "UTC")}</span>
                      <span className="font-medium text-or-light">{h.hours} h</span>
                      <span className="min-w-0 flex-1 truncate text-blanc/70">{h.activity}</span>
                      <HoursToggle hourId={h.id} validated={h.validated} />
                    </li>
                  ))}
                  {!stageDetail.hours.length && <li className="text-sm text-blanc/50">Aucune heure déclarée.</li>}
                </ul>
              </div>
              <div>
                <h3 className="mb-2 text-sm font-semibold text-blanc/80">Rapports</h3>
                <ul className="space-y-3">
                  {stageDetail.reports.map((r) => (
                    <li key={r.id} className="rounded-xl border border-line p-3 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-blanc">Version {r.version}{r.fileName ? ` · ${r.fileName}` : ""}</span>
                        <StatusBadge status={r.status} />
                      </div>
                      {r.supervisorComment && <p className="mt-1 text-xs text-blanc/55">{r.supervisorComment}</p>}
                      <div className="mt-2"><ReportStatusPicker reportId={r.id} value={r.status} /></div>
                    </li>
                  ))}
                  {!stageDetail.reports.length && <li className="text-sm text-blanc/50">Aucun rapport déposé.</li>}
                </ul>
              </div>
            </div>
          </AdminSection>
        )}

        <AdminSection title="Mémoires">
          {data.theses.length ? (
            <AdminTable head={["Étudiant", "Sujet", "Référent", "Versions à relire", "Commentaires ouverts", "Soutenance", ""]}>
              {data.theses.map((t) => (
                <tr key={t.id}>
                  <td className="px-2 py-3 text-blanc">{t.studentName}</td>
                  <td className="px-2 py-3 max-w-56 truncate text-blanc/80">{t.title}</td>
                  <td className="px-2 py-3 text-blanc/70">{t.supervisorName}</td>
                  <td className="px-2 py-3 text-blanc/70">{t.versionsToReview}</td>
                  <td className="px-2 py-3 text-blanc/70">{t.openComments}</td>
                  <td className="px-2 py-3">{t.defenseStatus ? <StatusBadge status={t.defenseStatus} /> : <span className="text-xs text-blanc/45">—</span>}</td>
                  <td className="px-2 py-3 text-right">
                    <Link href={`${adminRoutes.stages}?these=${t.id}`} className="text-sm text-or-light hover:text-or">
                      Relire
                    </Link>
                  </td>
                </tr>
              ))}
            </AdminTable>
          ) : (
            <p className="text-sm text-blanc/50">Aucun mémoire enregistré.</p>
          )}
        </AdminSection>

        {thesisDetail && (
          <AdminSection title={`Mémoire de ${thesisDetail.studentName} — « ${thesisDetail.title} »`}>
            <ul className="space-y-3">
              {thesisDetail.versions.map((v) => (
                <li key={v.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-line p-3 text-sm">
                  <span className="text-blanc">v{v.version} · {v.fileName}</span>
                  <span className="text-xs text-blanc/50">{formatShortDate(v.createdAt, "UTC")}</span>
                  <StatusBadge status={v.status} />
                  <span className="ml-auto"><VersionStatusPicker versionId={v.id} value={v.status} /></span>
                </li>
              ))}
              {!thesisDetail.versions.length && <li className="text-sm text-blanc/50">Aucune version déposée.</li>}
            </ul>
            <p className="mt-3 text-xs text-blanc/45">Les commentaires de relecture se poursuivent depuis l&rsquo;espace étudiant (fil de discussion du mémoire).</p>
          </AdminSection>
        )}
      </div>
    </>
  );
}
