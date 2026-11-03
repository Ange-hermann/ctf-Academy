import { AdminIntro, AdminSection, AdminTable } from "@/components/admin/ui";
import { adminRoutes } from "@/config/admin-nav";
import { requireAdminRoles } from "@/lib/admin/session";
import { getAuditLog } from "@/lib/admin/queries";

/** Journal d'audit : toutes les actions sensibles de l'équipe, horodatées et attribuées. */
export default async function JournalPage({ searchParams }: PageProps<"/admin/journal">) {
  const ctx = await requireAdminRoles(["admin"], adminRoutes.journal);
  const sp = await searchParams;
  const q = typeof sp.q === "string" && sp.q ? sp.q : undefined;
  const rows = await getAuditLog(ctx, q);

  return (
    <>
      <AdminIntro
        title="Journal d'activité"
        subtitle="Traçabilité des actions de l'équipe : décisions sur les candidatures, paiements, notes, rôles, réglages et contenus de classe."
      />

      <form method="get" className="mb-6 flex flex-wrap gap-2" role="search" aria-label="Filtrer le journal">
        <input
          name="q"
          defaultValue={q}
          placeholder="Filtrer par action ou table (ex. payment, role, site_settings)"
          className="min-h-11 min-w-56 flex-1 rounded-xl border border-line bg-noir-soft px-3 text-sm text-blanc outline-none focus:border-or/60"
          aria-label="Filtre"
        />
        <button type="submit" className="min-h-11 rounded-xl bg-gradient-or px-5 text-sm font-semibold text-noir shadow-gold">
          Filtrer
        </button>
      </form>

      <AdminSection title={q ? `Entrées pour « ${q} » (${rows.length})` : `Dernières entrées (${rows.length})`}>
        {rows.length ? (
          <AdminTable head={["Date", "Membre", "Action", "Table", "Référence"]}>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-2 py-3 whitespace-nowrap text-blanc/60">
                  {new Date(r.createdAt).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </td>
                <td className="px-2 py-3 text-blanc">{r.actorName}</td>
                <td className="px-2 py-3">
                  <code className="rounded bg-or/10 px-1.5 py-0.5 text-xs text-or-light">{r.action}</code>
                </td>
                <td className="px-2 py-3 text-blanc/70">{r.entity}</td>
                <td className="max-w-40 truncate px-2 py-3 text-xs text-blanc/40" title={r.entityId ?? undefined}>
                  {r.entityId ?? "—"}
                </td>
              </tr>
            ))}
          </AdminTable>
        ) : (
          <p className="text-sm text-blanc/50">Aucune entrée trouvée.</p>
        )}
      </AdminSection>
    </>
  );
}
