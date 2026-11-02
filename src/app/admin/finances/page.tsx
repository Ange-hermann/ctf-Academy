import { AdminIntro, AdminTable, StatCard, StatusBadge } from "@/components/admin/ui";
import { PaymentActions } from "@/components/admin/controls";
import { adminRoutes } from "@/config/admin-nav";
import { requireAdminRoles } from "@/lib/admin/session";
import { getFinanceOverview } from "@/lib/admin/queries";
import { formatMoney, formatShortDate } from "@/lib/student/format";

export default async function FinancesPage() {
  const ctx = await requireAdminRoles(["admin", "finance"], adminRoutes.finance);
  const data = await getFinanceOverview(ctx);

  return (
    <>
      <AdminIntro title="Finances" subtitle="Paiements, reçus, échéances et rapports financiers — confirmations à la main pour les canaux hors ligne." />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Encaissé (confirmé)" value={formatMoney(data.totals.confirmed)} />
        <StatCard label="Reste à percevoir" value={formatMoney(data.totals.pending)} />
        <StatCard label="Échéances en retard" value={data.totals.lateCount} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-or/25 bg-noir-card p-5 shadow-card">
          <h2 className="font-display mb-4 text-base font-semibold text-blanc">Échéances ouvertes</h2>
          {data.schedules.length ? (
            <AdminTable head={["Étudiant", "Échéance", "Date", "Reste", "Statut"]}>
              {data.schedules.map((s) => (
                <tr key={s.id}>
                  <td className="px-2 py-3">
                    <p className="text-blanc">{s.studentName || "—"}</p>
                    <p className="text-xs text-blanc/50">{s.reference}</p>
                  </td>
                  <td className="px-2 py-3 text-blanc/70">{s.label}</td>
                  <td className="px-2 py-3 whitespace-nowrap text-blanc/70">{formatShortDate(s.dueDate, "UTC")}</td>
                  <td className="px-2 py-3 font-medium whitespace-nowrap text-or-light">{formatMoney(s.amount - s.paidAmount)}</td>
                  <td className="px-2 py-3"><StatusBadge status={s.status} /></td>
                </tr>
              ))}
            </AdminTable>
          ) : (
            <p className="text-sm text-blanc/50">Aucune échéance ouverte.</p>
          )}
        </section>

        <section className="rounded-2xl border border-or/25 bg-noir-card p-5 shadow-card">
          <h2 className="font-display mb-4 text-base font-semibold text-blanc">Paiements récents</h2>
          {data.payments.length ? (
            <AdminTable head={["Étudiant", "Montant", "Canal", "Statut", ""]}>
              {data.payments.map((p) => (
                <tr key={p.id}>
                  <td className="px-2 py-3">
                    <p className="text-blanc">{p.studentName || "—"}</p>
                    <p className="text-xs text-blanc/50">{p.reference} · {formatShortDate(p.createdAt, "UTC")}</p>
                  </td>
                  <td className="px-2 py-3 font-medium whitespace-nowrap text-or-light">{formatMoney(p.amount)}</td>
                  <td className="px-2 py-3 text-xs text-blanc/70">{p.method} · {p.provider}</td>
                  <td className="px-2 py-3"><StatusBadge status={p.status} /></td>
                  <td className="px-2 py-3"><PaymentActions paymentId={p.id} status={p.status} /></td>
                </tr>
              ))}
            </AdminTable>
          ) : (
            <p className="text-sm text-blanc/50">Aucun paiement enregistré.</p>
          )}
        </section>
      </div>
    </>
  );
}
