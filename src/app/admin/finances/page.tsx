import { Download, FileText } from "lucide-react";
import { AdminIntro, AdminSection, AdminTable, StatCard, StatusBadge } from "@/components/admin/ui";
import { PaymentActions, RecordPaymentForm, type PaymentTarget } from "@/components/admin/controls";
import { adminRoutes } from "@/config/admin-nav";
import { requireAdminRoles } from "@/lib/admin/session";
import { getFinanceOverview } from "@/lib/admin/queries";
import { formatMoney, formatShortDate } from "@/lib/student/format";
import { methodLabels } from "@/lib/student/queries/finance";

const monthLabel = (key: string) =>
  new Date(`${key}-15T12:00:00Z`).toLocaleDateString("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });

export default async function FinancesPage() {
  const ctx = await requireAdminRoles(["admin", "finance"], adminRoutes.finance);
  const data = await getFinanceOverview(ctx);

  // Dossiers avec échéances ouvertes, regroupés pour la saisie d'un règlement.
  const targets = new Map<string, PaymentTarget>();
  for (const s of data.schedules) {
    const t = targets.get(s.applicationId) ?? { applicationId: s.applicationId, label: `${s.studentName || "—"} · ${s.reference}`, schedules: [] };
    t.schedules.push({ id: s.id, label: s.label, remaining: s.amount - s.paidAmount });
    targets.set(s.applicationId, t);
  }

  return (
    <>
      <AdminIntro title="Finances" subtitle="Paiements, reçus, échéances et rapports financiers — confirmations et saisies manuelles pour les canaux hors ligne." />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Encaissé (confirmé)" value={formatMoney(data.totals.confirmed)} />
        <StatCard label="Reste à percevoir" value={formatMoney(data.totals.pending)} />
        <StatCard label="Échéances en retard" value={data.totals.lateCount} />
      </div>

      <div className="mt-6">
        <AdminSection title="Enregistrer un règlement">
          {targets.size ? (
            <RecordPaymentForm targets={[...targets.values()]} />
          ) : (
            <p className="text-sm text-blanc/50">Aucun dossier avec une échéance ouverte — tous les échéanciers sont réglés.</p>
          )}
        </AdminSection>
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
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-display text-base font-semibold text-blanc">Paiements récents</h2>
            <span className="flex items-center gap-2">
              <a href={`${adminRoutes.finance}/rapport`} target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 rounded-xl border border-or/40 px-3 py-2 text-xs font-medium text-or-light transition-colors hover:bg-or/10">
                <FileText aria-hidden className="size-3.5" /> Export PDF
              </a>
              <a href={`${adminRoutes.finance}/export`} download className="inline-flex items-center gap-1.5 rounded-xl border border-or/40 px-3 py-2 text-xs font-medium text-or-light transition-colors hover:bg-or/10">
                <Download aria-hidden className="size-3.5" /> Export CSV
              </a>
            </span>
          </div>
          {data.payments.length ? (
            <AdminTable head={["Étudiant", "Montant", "Canal", "Statut", ""]}>
              {data.payments.map((p) => (
                <tr key={p.id}>
                  <td className="px-2 py-3">
                    <p className="text-blanc">{p.studentName || "—"}</p>
                    <p className="text-xs text-blanc/50">{p.reference} · {formatShortDate(p.createdAt, "UTC")}</p>
                  </td>
                  <td className="px-2 py-3 font-medium whitespace-nowrap text-or-light">{formatMoney(p.amount)}</td>
                  <td className="px-2 py-3 text-xs text-blanc/70">{methodLabels[p.method] ?? p.method} · {p.provider}</td>
                  <td className="px-2 py-3"><StatusBadge status={p.status} /></td>
                  <td className="px-2 py-3">
                    <span className="flex flex-wrap items-center gap-2">
                      <PaymentActions paymentId={p.id} status={p.status} />
                      {p.status === "confirmed" && (
                        <a href={`${adminRoutes.finance}/recu/${p.id}`} target="_blank" rel="noopener" className="text-sm whitespace-nowrap text-or-light hover:text-or">
                          Reçu
                        </a>
                      )}
                    </span>
                  </td>
                </tr>
              ))}
            </AdminTable>
          ) : (
            <p className="text-sm text-blanc/50">Aucun paiement enregistré.</p>
          )}
        </section>
      </div>

      <div className="mt-6">
        <AdminSection title="Rapport — montants confirmés">
          {data.report.byMonth.length ? (
            <div className="grid gap-6 lg:grid-cols-3">
              <div>
                <h3 className="mb-3 text-xs font-medium uppercase text-blanc/55">Par formation</h3>
                <ul className="space-y-2">
                  {data.report.byFormation.map((r) => (
                    <li key={r.name} className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="text-blanc/75">{r.name}</span>
                      <span className="text-blanc/50">{r.count} pmt{r.count > 1 ? "s" : ""}</span>
                      <span className="font-medium whitespace-nowrap text-or-light">{formatMoney(r.total)}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="mb-3 text-xs font-medium uppercase text-blanc/55">Par canal</h3>
                <ul className="space-y-2">
                  {data.report.byMethod.map((r) => (
                    <li key={r.method} className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="text-blanc/75">{methodLabels[r.method] ?? r.method}</span>
                      <span className="text-blanc/50">{r.count} pmt{r.count > 1 ? "s" : ""}</span>
                      <span className="font-medium whitespace-nowrap text-or-light">{formatMoney(r.total)}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="mb-3 text-xs font-medium uppercase text-blanc/55">Par mois (6 derniers)</h3>
                <ul className="space-y-2">
                  {data.report.byMonth.map((r) => (
                    <li key={r.month} className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="text-blanc/75 capitalize">{monthLabel(r.month)}</span>
                      <span className="text-blanc/50">{r.count} pmt{r.count > 1 ? "s" : ""}</span>
                      <span className="font-medium whitespace-nowrap text-or-light">{formatMoney(r.total)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <p className="text-sm text-blanc/50">Aucun paiement confirmé pour le moment — le rapport se remplira dès le premier encaissement.</p>
          )}
        </AdminSection>
      </div>
    </>
  );
}
