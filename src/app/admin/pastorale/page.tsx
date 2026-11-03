import Link from "next/link";
import { AdminIntro, AdminSection, AdminTable, StatusBadge } from "@/components/admin/ui";
import { CompleteResponsibilityButton, DecisionControl, EvaluationControl, NewEvaluationForm, NewPastoralCaseForm, ResponsibilityForm } from "@/components/admin/controls";
import { adminRoutes } from "@/config/admin-nav";
import { requireAdminRoles } from "@/lib/admin/session";
import { getPastoraleData } from "@/lib/admin/queries";
import { formatShortDate } from "@/lib/student/format";

const decisionLabels: Record<string, string> = { consecration: "Consécration", defense: "Soutenance" };

export default async function PastoralePage() {
  const ctx = await requireAdminRoles(["admin", "pastor"], adminRoutes.pastorale);
  const data = await getPastoraleData(ctx);

  return (
    <>
      <AdminIntro
        title="Équipe pastorale"
        subtitle="Évaluation des candidats, supervision des étudiants EDM, affectations départementales et décisions de consécration."
      />

      <div className="space-y-6">
        <AdminSection title="Attribution des stages">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <p className="min-w-56 flex-1 text-blanc/65">
              Le pasteur crée et attribue les stages aux étudiants admis : EDS dans les départements de l&rsquo;Église, mentors EDM à «&nbsp;Vase d&rsquo;honneur&nbsp;», diacres en service.
            </p>
            <Link href={adminRoutes.stages} className="inline-flex items-center gap-1.5 rounded-xl border border-or/40 px-4 py-2 font-semibold text-or-light transition-colors hover:bg-or/10">
              Créer et suivre les stages →
            </Link>
          </div>
        </AdminSection>

        <div className="grid gap-6 xl:grid-cols-2">
          <AdminSection title="Planifier une évaluation">
            <NewEvaluationForm />
          </AdminSection>

          <AdminSection title="Ouvrir un dossier (consécration, soutenance)">
            <NewPastoralCaseForm students={data.students} />
          </AdminSection>
        </div>

        <AdminSection title={`Évaluations pastorales (${data.evaluations.length})`}>
          {data.evaluations.length ? (
            <AdminTable head={["Étudiant", "Évaluation", "Évaluateur", "Date", "Statut", "Décision"]}>
              {data.evaluations.map((e) => (
                <tr key={e.id}>
                  <td className="px-2 py-3 text-blanc">{e.studentName}</td>
                  <td className="px-2 py-3 text-blanc/80">{e.title}</td>
                  <td className="px-2 py-3 text-blanc/70">{e.evaluatorName ?? "—"}</td>
                  <td className="px-2 py-3 whitespace-nowrap text-blanc/60">{e.scheduledOn ? formatShortDate(e.scheduledOn, "UTC") : "—"}</td>
                  <td className="px-2 py-3"><StatusBadge status={e.status} /></td>
                  <td className="px-2 py-3"><EvaluationControl evaluationId={e.id} value={e.status} /></td>
                </tr>
              ))}
            </AdminTable>
          ) : (
            <p className="text-sm text-blanc/50">Aucune évaluation planifiée.</p>
          )}
        </AdminSection>

        <AdminSection title={`Affectations départementales (${data.assignments.length})`}>
          {data.assignments.length ? (
            <AdminTable head={["Étudiant", "Département", "Lieu", "Responsable", "Depuis", "Statut", ""]}>
              {data.assignments.map((a) => (
                <tr key={a.id}>
                  <td className="px-2 py-3 text-blanc">{a.studentName}</td>
                  <td className="px-2 py-3 text-blanc/80">{a.role}</td>
                  <td className="px-2 py-3 text-blanc/70">{a.place}</td>
                  <td className="px-2 py-3 text-blanc/70">{a.supervisorName}</td>
                  <td className="px-2 py-3 whitespace-nowrap text-blanc/60">{formatShortDate(a.startsOn, "UTC")}</td>
                  <td className="px-2 py-3"><StatusBadge status={a.status} /></td>
                  <td className="px-2 py-3">{a.status === "active" && <CompleteResponsibilityButton responsibilityId={a.id} />}</td>
                </tr>
              ))}
            </AdminTable>
          ) : (
            <p className="text-sm text-blanc/50">Aucune affectation pour le moment.</p>
          )}
          <div className={data.assignments.length ? "mt-4 border-t border-line/60 pt-4" : ""}>
            <ResponsibilityForm students={data.students} />
          </div>
        </AdminSection>

        <AdminSection title={`Supervision des étudiants EDM (${data.edm.length})`}>
          {data.edm.length ? (
            <AdminTable head={["Étudiant", "Exercices de mentorat", "Travaux de leadership"]}>
              {data.edm.map((s) => (
                <tr key={s.userId}>
                  <td className="px-2 py-3 text-blanc">{s.name}</td>
                  <td className="px-2 py-3 text-blanc/70">
                    {s.mentoring.submitted ? <span className="text-or-light">{s.mentoring.submitted} à relire</span> : <span>{s.mentoring.validated} validé{s.mentoring.validated > 1 ? "s" : ""}</span>}
                  </td>
                  <td className="px-2 py-3 text-blanc/70">
                    {s.leadership.submitted ? <span className="text-or-light">{s.leadership.submitted} à relire</span> : <span>{s.leadership.validated} validé{s.leadership.validated > 1 ? "s" : ""}</span>}
                  </td>
                </tr>
              ))}
            </AdminTable>
          ) : (
            <p className="text-sm text-blanc/50">Aucun étudiant admis en EDM pour le moment.</p>
          )}
          <p className="mt-3 text-xs text-blanc/45">
            La correction des travaux déposés se fait depuis <Link href={adminRoutes.corrections} className="text-or-light hover:text-or">Corrections</Link> — l&rsquo;évaluation des dossiers de candidature depuis <Link href={adminRoutes.candidates} className="text-or-light hover:text-or">Candidatures</Link>.
          </p>
        </AdminSection>

        <AdminSection title={`Décisions de consécration & soutenances (${data.decisions.length})`}>
          {data.decisions.length ? (
            <AdminTable head={["Étudiant", "Type", "Intitulé", "Rendue le", "Décision"]}>
              {data.decisions.map((d) => (
                <tr key={d.id}>
                  <td className="px-2 py-3 text-blanc">{d.studentName ?? "—"}</td>
                  <td className="px-2 py-3 text-blanc/70">{decisionLabels[d.kind] ?? d.kind}</td>
                  <td className="px-2 py-3 text-blanc/80">{d.title}</td>
                  <td className="px-2 py-3 whitespace-nowrap text-blanc/60">{d.decidedAt ? formatShortDate(d.decidedAt, "UTC") : "—"}</td>
                  <td className="px-2 py-3"><DecisionControl validationId={d.id} decision={d.decision} /></td>
                </tr>
              ))}
            </AdminTable>
          ) : (
            <p className="text-sm text-blanc/50">Aucun dossier ouvert pour le moment.</p>
          )}
        </AdminSection>
      </div>
    </>
  );
}
