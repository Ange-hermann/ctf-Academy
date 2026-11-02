import { AdminIntro, AdminTable } from "@/components/admin/ui";
import { adminRoutes } from "@/config/admin-nav";
import { requireAdminRoles } from "@/lib/admin/session";
import { getPedagogyOverview } from "@/lib/admin/queries";

export default async function PedagogiePage() {
  const ctx = await requireAdminRoles(["admin", "pedagogy", "trainer"], adminRoutes.pedagogy);
  const rows = await getPedagogyOverview(ctx);

  return (
    <>
      <AdminIntro title="Pédagogie" subtitle="Programmes, modules, calendrier et progression des étudiants — vue de pilotage par formation." />

      <section className="rounded-2xl border border-or/25 bg-noir-card p-5 shadow-card">
        {rows.length ? (
          <AdminTable head={["Formation", "Niveaux", "Modules", "Leçons", "Évaluations", "Étudiants admis", "Copies en attente"]}>
            {rows.map((f) => (
              <tr key={f.slug}>
                <td className="px-2 py-3">
                  <p className="font-medium text-blanc">{f.slug.toUpperCase()}</p>
                  <p className="max-w-64 truncate text-xs text-blanc/50">{f.name}</p>
                </td>
                <td className="px-2 py-3 text-blanc/70">{f.levels}</td>
                <td className="px-2 py-3 text-blanc/70">{f.modules}</td>
                <td className="px-2 py-3 text-blanc/70">{f.lessons}</td>
                <td className="px-2 py-3 text-blanc/70">{f.quizzes}</td>
                <td className="px-2 py-3 text-blanc/70">{f.students}</td>
                <td className="px-2 py-3 text-or-light">{f.submittedAttempts}</td>
              </tr>
            ))}
          </AdminTable>
        ) : (
          <p className="text-sm text-blanc/50">Aucune formation enregistrée.</p>
        )}
      </section>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-line bg-noir-card p-5">
          <h2 className="font-display text-base font-semibold text-blanc">Progression des étudiants</h2>
          <p className="mt-2 text-sm text-blanc/55">
            Le détail leçon par leçon est suivi dans l&rsquo;espace étudiant (page Progression). La consolidation par cohorte — taux de complétion par module et
            par niveau — sera ajoutée avec les données réelles de la première session.
          </p>
        </div>
        <div className="rounded-2xl border border-line bg-noir-card p-5">
          <h2 className="font-display text-base font-semibold text-blanc">Calendrier pédagogique</h2>
          <p className="mt-2 text-sm text-blanc/55">
            Les cours en direct et échéances visibles par les étudiants proviennent du calendrier de leur formation. L&rsquo;édition des sessions en direct se
            fera dans une étape dédiée (création de séances, liens Zoom, notifications).
          </p>
        </div>
      </div>
    </>
  );
}
