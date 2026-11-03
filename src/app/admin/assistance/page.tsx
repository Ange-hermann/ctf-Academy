import Link from "next/link";
import { AdminIntro, AdminSection, AdminTable, StatusBadge } from "@/components/admin/ui";
import { TicketControl } from "@/components/admin/controls";
import { adminRoutes } from "@/config/admin-nav";
import { requireAdminRoles } from "@/lib/admin/session";
import { getAdminThreads, getSupportTickets } from "@/lib/admin/queries";

const ticketCategoryLabels: Record<string, string> = {
  connexion: "Connexion / compte",
  video: "Vidéo / audio",
  paiement: "Paiement",
  evaluation: "Évaluation",
  autre: "Autre",
};

/** Boîte d'assistance : messages « Administratif » des étudiants + tickets, avec réponse et suivi. */
export default async function AssistancePage() {
  const ctx = await requireAdminRoles(["admin", "admissions"], adminRoutes.assistance);
  const [threads, tickets] = await Promise.all([getAdminThreads(ctx), getSupportTickets(ctx)]);

  return (
    <>
      <AdminIntro
        title="Assistance"
        subtitle="Messages « Administratif » des étudiants (réponse écrite ou vocale) et tickets d'assistance à traiter."
      />

      <div className="space-y-8">
        <AdminSection title={`Messages administratifs (${threads.length})`}>
          {threads.length ? (
            <ul className="divide-y divide-line/60">
              {threads.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`${adminRoutes.assistance}/${t.id}`}
                    className="-mx-2 flex items-center justify-between gap-4 rounded-lg px-2 py-3 transition-colors hover:bg-or/5"
                  >
                    <span className="min-w-0">
                      <span className="flex items-center gap-2">
                        <span className="truncate font-medium text-blanc">{t.subject}</span>
                        {t.unread > 0 && <span className="shrink-0 rounded-full bg-or/20 px-2 py-0.5 text-xs font-semibold text-or-light">{t.unread}</span>}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-blanc/50">
                        {t.studentName}
                        {t.formationSlug ? ` · ${t.formationSlug.toUpperCase()}` : ""}
                        {t.lastMessage ? ` — ${t.lastMessage}` : ""}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-blanc/40">
                      {new Date(t.updatedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-blanc/50">Aucun message administratif pour le moment.</p>
          )}
        </AdminSection>

        <AdminSection title={`Tickets d'assistance (${tickets.length})`}>
          {tickets.length ? (
            <AdminTable head={["Étudiant", "Demande", "Statut", "Traitement"]}>
              {tickets.map((t) => (
                <tr key={t.id} className="align-top">
                  <td className="px-2 py-3">
                    <p className="whitespace-nowrap text-blanc">{t.studentName}</p>
                    <p className="text-xs text-blanc/50">{t.email}</p>
                    <p className="mt-1 text-xs whitespace-nowrap text-blanc/40">
                      {new Date(t.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </td>
                  <td className="max-w-sm px-2 py-3">
                    <p className="text-xs font-semibold tracking-wide text-or-light/80 uppercase">{ticketCategoryLabels[t.category] ?? t.category}</p>
                    <p className="mt-0.5 font-medium text-blanc">{t.subject}</p>
                    <p className="mt-1 line-clamp-3 text-sm text-blanc/60">{t.description}</p>
                  </td>
                  <td className="px-2 py-3 whitespace-nowrap">
                    <StatusBadge status={t.status} />
                  </td>
                  <td className="min-w-64 px-2 py-3">
                    <TicketControl ticketId={t.id} status={t.status} resolution={t.resolution} />
                  </td>
                </tr>
              ))}
            </AdminTable>
          ) : (
            <p className="text-sm text-blanc/50">Aucun ticket pour le moment.</p>
          )}
        </AdminSection>
      </div>
    </>
  );
}
