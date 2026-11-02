import Link from "next/link";
import { AdminIntro, AdminSection, AdminTable, StatusBadge } from "@/components/admin/ui";
import { EvaluationControl, NewEvaluationForm } from "@/components/admin/controls";
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
      <AdminIntro title="Équipe pastorale" subtitle="Évaluation des candidats, affectations départementales et décisions de consécration." />

      <div className="space-y-6">
        <AdminSection title="Planifier une évaluation">
          <NewEvaluationForm />
        </AdminSection>

        <AdminSection title="Évaluations pastorales">
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

        <AdminSection title="Décisions de consécration & soutenances">
          {data.decisions.length ? (
            <AdminTable head={["Étudiant", "Type", "Intitulé", "Décision", "Rendue le"]}>
              {data.decisions.map((d) => (
                <tr key={d.id}>
                  <td className="px-2 py-3 text-blanc">{d.studentName ?? "—"}</td>
                  <td className="px-2 py-3 text-blanc/70">{decisionLabels[d.kind] ?? d.kind}</td>
                  <td className="px-2 py-3 text-blanc/80">{d.title}</td>
                  <td className="px-2 py-3"><StatusBadge status={d.decision} /></td>
                  <td className="px-2 py-3 whitespace-nowrap text-blanc/60">{d.decidedAt ? formatShortDate(d.decidedAt, "UTC") : "—"}</td>
                </tr>
              ))}
            </AdminTable>
          ) : (
            <p className="text-sm text-blanc/50">Aucune décision enregistrée pour le moment.</p>
          )}
          <p className="mt-3 text-xs text-blanc/45">
            Les affectations départementales s&rsquo;affichent dans l&rsquo;espace étudiant (« Responsabilités » / « Fonctions pastorales ») — la création d&rsquo;affectations
            fera l&rsquo;objet d&rsquo;une étape dédiée avec l&rsquo;équipe pédagogique.
          </p>
          <p className="mt-2 text-xs text-blanc/45">
            Pour évaluer un dossier de candidature, ouvrez la fiche depuis <Link href={adminRoutes.candidates} className="text-or-light hover:text-or">Candidatures</Link>.
          </p>
        </AdminSection>
      </div>
    </>
  );
}
