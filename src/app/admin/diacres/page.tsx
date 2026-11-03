import Link from "next/link";
import { AdminIntro, AdminSection, AdminTable, StatusBadge } from "@/components/admin/ui";
import { DecisionControl, RecognizeServiceButton } from "@/components/admin/controls";
import { adminRoutes } from "@/config/admin-nav";
import { hasAdminRole, requireAdminRoles } from "@/lib/admin/session";
import { getDiacreDetail, getDiacresData } from "@/lib/admin/queries";
import { formatShortDate } from "@/lib/student/format";

export default async function DiacresPage({ searchParams }: PageProps<"/admin/diacres">) {
  const ctx = await requireAdminRoles(["admin", "supervisor", "pastor"], adminRoutes.diacres);
  const sp = await searchParams;
  const studentId = typeof sp.etudiant === "string" ? sp.etudiant : null;
  const canDecide = hasAdminRole(ctx, ["admin", "pastor"]);
  const data = await getDiacresData(ctx);
  const detail = studentId ? await getDiacreDetail(ctx, studentId) : null;

  return (
    <>
      <AdminIntro
        title="Étudiants diacres"
        subtitle="Parcours de la formation des diacres : service, stage pratique, rapport, mémoire et consécration."
      />

      <div className="space-y-6">
        <AdminSection title={`Parcours (${data.rows.length})`}>
          {data.rows.length ? (
            <AdminTable head={["Étudiant", "Service", "Stage", "Rapport", "Mémoire", "Évaluation", "Consécration", ""]}>
              {data.rows.map((r) => (
                <tr key={r.userId}>
                  <td className="px-2 py-3 text-blanc">
                    {r.name}
                    <span className="block text-xs text-blanc/45">{r.reference}</span>
                  </td>
                  <td className="px-2 py-3 whitespace-nowrap text-blanc/70">
                    {r.serviceHours} h
                    <span className="block text-xs text-blanc/45">{r.serviceRecognized} reconnue{r.serviceRecognized > 1 ? "s" : ""}</span>
                  </td>
                  <td className="px-2 py-3 whitespace-nowrap text-blanc/70">
                    {r.internship ? (
                      <>
                        {r.internship.doneHours}/{r.internship.targetHours} h
                        {r.internship.openSteps > 0 && <span className="block text-xs text-warning-light">{r.internship.openSteps} étape{r.internship.openSteps > 1 ? "s" : ""} ouverte{r.internship.openSteps > 1 ? "s" : ""}</span>}
                      </>
                    ) : (
                      <span className="text-xs text-blanc/45">—</span>
                    )}
                  </td>
                  <td className="px-2 py-3">{r.internship?.reportStatus ? <StatusBadge status={r.internship.reportStatus} /> : <span className="text-xs text-blanc/45">—</span>}</td>
                  <td className="px-2 py-3 text-blanc/70">
                    {r.thesis ? (
                      <>
                        <span className="block max-w-40 truncate text-xs" title={r.thesis.title}>{r.thesis.title}</span>
                        {r.thesis.toReview > 0 && <span className="text-xs text-or-light">{r.thesis.toReview} version{r.thesis.toReview > 1 ? "s" : ""} à relire</span>}
                      </>
                    ) : (
                      <span className="text-xs text-blanc/45">—</span>
                    )}
                  </td>
                  <td className="px-2 py-3">{r.evaluationStatus ? <StatusBadge status={r.evaluationStatus} /> : <span className="text-xs text-blanc/45">—</span>}</td>
                  <td className="px-2 py-3">{r.consecration ? <StatusBadge status={r.consecration.decision} /> : <span className="text-xs text-blanc/45">—</span>}</td>
                  <td className="px-2 py-3 text-right">
                    <Link href={`${adminRoutes.diacres}?etudiant=${r.userId}`} className="text-sm text-or-light hover:text-or">
                      Suivre
                    </Link>
                  </td>
                </tr>
              ))}
            </AdminTable>
          ) : (
            <p className="text-sm text-blanc/50">Aucun étudiant admis en formation des diacres pour le moment.</p>
          )}
        </AdminSection>

        {detail && (
          <AdminSection title={`Parcours de ${detail.name}`}>
            <div className="grid gap-6 xl:grid-cols-2">
              <div>
                <h3 className="mb-2 text-sm font-semibold text-blanc/80">Activités de service</h3>
                {detail.service.length ? (
                  <ul className="space-y-2">
                    {detail.service.map((s) => (
                      <li key={s.id} className="flex items-center justify-between gap-3 rounded-lg border border-line/60 px-3 py-2 text-sm">
                        <div>
                          <p className="text-blanc/80">{s.activity}</p>
                          <p className="text-xs text-blanc/45">
                            {s.department} · {formatShortDate(s.servedOn, "UTC")} · {s.hours} h
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {s.recognized && <StatusBadge status="granted" />}
                          <RecognizeServiceButton serviceId={s.id} recognized={s.recognized} />
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-blanc/50">Aucune activité de service enregistrée.</p>
                )}
              </div>

              <div className="space-y-5">
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-blanc/80">Étape du parcours</h3>
                  <ul className="space-y-2 text-sm text-blanc/70">
                    <li>
                      Stage pratique —{" "}
                      {detail.internshipId ? (
                        <Link href={`${adminRoutes.stages}?stage=${detail.internshipId}`} className="text-or-light hover:text-or">
                          Suivre le stage (heures, étapes, rapport)
                        </Link>
                      ) : (
                        <span className="text-blanc/45">non commencé</span>
                      )}
                    </li>
                    <li>
                      Mémoire —{" "}
                      {detail.thesisId ? (
                        <Link href={`${adminRoutes.stages}?these=${detail.thesisId}`} className="text-or-light hover:text-or">
                          Relire les versions du mémoire
                        </Link>
                      ) : (
                        <span className="text-blanc/45">non déposé</span>
                      )}
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="mb-2 text-sm font-semibold text-blanc/80">Évaluations pastorales</h3>
                  {detail.evaluations.length ? (
                    <ul className="space-y-2">
                      {detail.evaluations.map((e) => (
                        <li key={e.id} className="flex items-center justify-between gap-3 rounded-lg border border-line/60 px-3 py-2 text-sm">
                          <span className="text-blanc/80">{e.title}</span>
                          <StatusBadge status={e.status} />
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-blanc/50">Aucune évaluation.</p>
                  )}
                </div>

                <div>
                  <h3 className="mb-2 text-sm font-semibold text-blanc/80">Consécration</h3>
                  {detail.consecrations.length ? (
                    <ul className="space-y-2">
                      {detail.consecrations.map((c) => (
                        <li key={c.id} className="flex items-center justify-between gap-3 rounded-lg border border-line/60 px-3 py-2 text-sm">
                          <div>
                            <p className="text-blanc/80">{c.title}</p>
                            {c.decidedAt && <p className="text-xs text-blanc/45">Rendue le {formatShortDate(c.decidedAt, "UTC")}</p>}
                          </div>
                          {canDecide ? <DecisionControl validationId={c.id} decision={c.decision} /> : <StatusBadge status={c.decision} />}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-blanc/50">
                      Aucun dossier de consécration — ouvrez-en un depuis{" "}
                      <Link href={adminRoutes.pastorale} className="text-or-light hover:text-or">
                        Équipe pastorale
                      </Link>
                      .
                    </p>
                  )}
                </div>
              </div>
            </div>
          </AdminSection>
        )}
      </div>
    </>
  );
}
