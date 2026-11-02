import { AdminIntro, AdminSection, AdminTable } from "@/components/admin/ui";
import { RoleButtons } from "@/components/admin/controls";
import { adminRoutes } from "@/config/admin-nav";
import { requireAdminRoles } from "@/lib/admin/session";
import { searchUsers } from "@/lib/admin/queries";

export default async function AccesPage({ searchParams }: PageProps<"/admin/acces">) {
  const ctx = await requireAdminRoles(["admin"], adminRoutes.access);
  const sp = await searchParams;
  const q = typeof sp.q === "string" && sp.q ? sp.q : undefined;
  const users = await searchUsers(ctx, q);

  return (
    <>
      <AdminIntro
        title="Accès & rôles"
        subtitle="Attribution des profils d'administration. Chaque rôle ouvre uniquement les sections de sa mission ; l'attribution et le retrait sont tracés dans le journal d'audit."
      />

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
          <AdminTable head={["Compte", "Profils d'administration"]}>
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-2 py-3">
                  <p className="text-blanc">{u.name}</p>
                  <p className="text-xs text-blanc/50">{u.email}</p>
                </td>
                <td className="px-2 py-3"><RoleButtons userId={u.id} roles={u.roles} /></td>
              </tr>
            ))}
          </AdminTable>
        ) : (
          <p className="text-sm text-blanc/50">{q ? "Aucun compte trouvé." : "Aucun profil administratif attribué pour le moment — recherchez un compte pour commencer."}</p>
        )}
      </AdminSection>

      <p className="mt-4 text-xs text-blanc/45">
        Le rôle « Administrateur » ouvre toutes les sections, y compris cette page. Un membre ne peut pas retirer son propre accès administrateur.
      </p>
    </>
  );
}
