import Link from "next/link";
import { AdminIntro, AdminTable, StatusBadge } from "@/components/admin/ui";
import { adminRoutes } from "@/config/admin-nav";
import { requireAdminRoles } from "@/lib/admin/session";
import { getApplications } from "@/lib/admin/queries";
import { cn } from "@/lib/utils";

const inputClass = "min-h-11 rounded-xl border border-line bg-noir-soft px-3 text-sm text-blanc outline-none focus:border-or/60";

export default async function CandidaturesPage({ searchParams }: PageProps<"/admin/candidatures">) {
  const ctx = await requireAdminRoles(["admin", "admissions", "pastor"], adminRoutes.candidates);
  const sp = await searchParams;
  const filter = {
    formation: typeof sp.formation === "string" && sp.formation ? sp.formation : undefined,
    status: typeof sp.statut === "string" && sp.statut ? sp.statut : undefined,
    q: typeof sp.q === "string" && sp.q ? sp.q : undefined,
  };
  const rows = await getApplications(ctx, filter);
  const pastorOnly = !ctx.roles.includes("admin") && !ctx.roles.includes("admissions");

  return (
    <>
      <AdminIntro
        title="Candidatures"
        subtitle={
          pastorOnly
            ? "Consultation des dossiers pour l'évaluation des candidats. Les décisions de statut relèvent du responsable des admissions."
            : "Dossiers, inscriptions, paiements et décisions d'admission — les trois statuts restent indépendants."
        }
      />

      <form method="get" className="mb-6 flex flex-wrap items-center gap-2" role="search" aria-label="Filtrer les candidatures">
        <input name="q" defaultValue={filter.q} placeholder="Nom, e-mail ou référence" className={cn(inputClass, "min-w-56 flex-1")} aria-label="Recherche" />
        <select name="formation" defaultValue={filter.formation ?? ""} className={inputClass} aria-label="Formation">
          <option value="">Toutes les formations</option>
          <option value="eds">EDS</option>
          <option value="edm">EDM</option>
          <option value="diacres">Diacres</option>
        </select>
        <select name="statut" defaultValue={filter.status ?? ""} className={inputClass} aria-label="Statut">
          <option value="">Tous les statuts</option>
          <optgroup label="Admission">
            <option value="under_review">En examen</option>
            <option value="admitted">Admis</option>
            <option value="waitlisted">Liste d&rsquo;attente</option>
            <option value="rejected">Refusé</option>
          </optgroup>
          <optgroup label="Paiement">
            <option value="pending">En attente</option>
            <option value="partial">Partiel</option>
            <option value="confirmed">Confirmé</option>
          </optgroup>
        </select>
        <button type="submit" className="min-h-11 rounded-xl bg-gradient-or px-5 text-sm font-semibold text-noir shadow-gold">
          Filtrer
        </button>
      </form>

      <section className="rounded-2xl border border-or/25 bg-noir-card p-5 shadow-card">
        {rows.length ? (
          <AdminTable head={["Référence", "Candidat", "Formation", "Inscription", "Paiement", "Admission", "Déposée le", ""]}>
            {rows.map((a) => (
              <tr key={a.id}>
                <td className="px-2 py-3 font-medium whitespace-nowrap text-blanc">{a.reference}</td>
                <td className="px-2 py-3">
                  <p className="text-blanc">{a.studentName}</p>
                  <p className="text-xs text-blanc/50">{a.email}</p>
                </td>
                <td className="px-2 py-3 text-blanc/70">{a.formationSlug.toUpperCase()}</td>
                <td className="px-2 py-3"><StatusBadge status={a.registrationStatus} /></td>
                <td className="px-2 py-3"><StatusBadge status={a.paymentStatus} /></td>
                <td className="px-2 py-3"><StatusBadge status={a.admissionStatus} /></td>
                <td className="px-2 py-3 text-xs whitespace-nowrap text-blanc/50">{a.submittedAt ? new Date(a.submittedAt).toLocaleDateString("fr-FR") : "—"}</td>
                <td className="px-2 py-3 text-right">
                  <Link href={`${adminRoutes.candidates}/${a.id}`} className="text-sm text-or-light hover:text-or">
                    Ouvrir
                  </Link>
                </td>
              </tr>
            ))}
          </AdminTable>
        ) : (
          <p className="text-sm text-blanc/50">Aucune candidature ne correspond au filtre.</p>
        )}
      </section>
    </>
  );
}
