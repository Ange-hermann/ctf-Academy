import { AdminIntro, AdminSection, AdminTable } from "@/components/admin/ui";
import { ClassAssigner, CreateAccessForm, RoleButtons } from "@/components/admin/controls";
import { adminRoutes } from "@/config/admin-nav";
import { ADMIN_ROLES, adminRoleLabels, requireAdminRoles } from "@/lib/admin/session";
import { getClassFormations, getTrainerAssignments, searchUsers } from "@/lib/admin/queries";

export default async function AccesPage({ searchParams }: PageProps<"/admin/acces">) {
  const ctx = await requireAdminRoles(["admin"], adminRoutes.access);
  const sp = await searchParams;
  const q = typeof sp.q === "string" && sp.q ? sp.q : undefined;
  const [users, { assignments, classes }, formations] = await Promise.all([searchUsers(ctx, q), getTrainerAssignments(ctx), getClassFormations(ctx)]);
  const formationChoices = formations.filter((f, i, all) => all.findIndex((o) => o.id === f.id) === i);

  return (
    <>
      <AdminIntro
        title="Accès & rôles"
        subtitle="Création des accès et attribution des profils. Chaque rôle ouvre uniquement les sections de sa mission ; toutes les opérations sont tracées dans le journal d'audit."
      />

      <AdminSection title="Créer un accès">
        <p className="mb-4 text-sm text-blanc/60">
          Étudiant admis hors de la plateforme ou nouveau membre de l&rsquo;équipe : son compte, son profil et sa notification de bienvenue sont
          créés. Transmettez-lui ensuite le lien de première connexion.
        </p>
        <CreateAccessForm formations={formationChoices} staffRoles={ADMIN_ROLES.map((r) => ({ value: r, label: adminRoleLabels[r] }))} />
      </AdminSection>

      <form method="get" className="mb-6 flex flex-wrap gap-2" role="search" aria-label="Rechercher un compte">
        <input
          name="q"
          defaultValue={q}
          placeholder="Nom ou e-mail du compte"
          className="min-h-11 min-w-56 flex-1 rounded-xl border border-line bg-noir-soft px-3 text-sm text-blanc outline-none focus:border-or/60"
          aria-label="Recherche"
        />
        <button type="submit" className="min-h-11 rounded-xl bg-gradient-or px-5 text-sm font-semibold text-noir shadow-gold">
          Rechercher
        </button>
      </form>

      <AdminSection title={q ? `Résultats pour « ${q} »` : "Comptes avec accès"}>
        {users.length ? (
          <AdminTable head={["Compte", "Profils d'administration", "Classe (formateur)"]}>
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-2 py-3">
                  <p className="text-blanc">{u.name}</p>
                  <p className="text-xs text-blanc/50">{u.email}</p>
                </td>
                <td className="px-2 py-3"><RoleButtons userId={u.id} roles={u.roles} /></td>
                <td className="px-2 py-3">
                  {u.roles.includes("trainer") && !u.roles.includes("admin") ? (
                    <ClassAssigner trainerId={u.id} classes={classes} current={assignments.find((a) => a.trainerId === u.id) ?? null} />
                  ) : (
                    <span className="text-xs text-blanc/40">—</span>
                  )}
                </td>
              </tr>
            ))}
          </AdminTable>
        ) : (
          <p className="text-sm text-blanc/50">{q ? "Aucun compte trouvé." : "Aucun profil administratif attribué pour le moment — recherchez un compte pour commencer."}</p>
        )}
      </AdminSection>

      <p className="mt-4 text-xs text-blanc/45">
        Le rôle « Administrateur » ouvre toutes les sections, y compris cette page — il n&rsquo;a pas de classe : il crée les accès et gère l&rsquo;équipe. Un
        membre ne peut pas retirer son propre accès administrateur. Chaque formateur a une seule classe — une formation et un niveau (ex. EDS · Niveau 2) : il
        gère les étudiants dont c&rsquo;est le niveau en cours.
      </p>
    </>
  );
}
