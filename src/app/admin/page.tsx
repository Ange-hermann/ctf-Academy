import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AdminIntro, AdminTable, StatCard, StatusBadge } from "@/components/admin/ui";
import { adminRoutes } from "@/config/admin-nav";
import { hasAdminRole, requireStaff } from "@/lib/admin/session";
import { getAdminDashboard } from "@/lib/admin/queries";
import { formatMoney } from "@/lib/student/format";

export default async function AdminDashboardPage() {
  const ctx = await requireStaff(adminRoutes.dashboard);
  const data = await getAdminDashboard(ctx);
  const can = (roles: readonly ("admin" | "admissions" | "pedagogy" | "trainer" | "finance" | "supervisor" | "pastor")[]) => hasAdminRole(ctx, roles);

  return (
    <>
      <AdminIntro title="Supervision" subtitle="Vue d'ensemble de la plateforme. Chaque section dépend du profil attribué à votre compte." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {can(["admin", "admissions", "pastor"]) && (
          <StatCard label="Candidatures" value={data.applications.total} detail={`${data.applications.underReview} en examen · ${data.applications.admitted} admises`} href={adminRoutes.candidates} />
        )}
        {can(["admin", "admissions", "finance"]) && (
          <StatCard label="Paiements à suivre" value={data.applications.pendingPayment} detail={`${formatMoney(data.finance.pendingAmount)} restants · ${data.finance.lateSchedules} échéances en retard`} href={adminRoutes.finance} />
        )}
        {can(["admin", "trainer", "pedagogy"]) && (
          <StatCard label="Copies à corriger" value={data.corrections.submittedAttempts} detail={`${data.corrections.submittedWorks} travaux EDM déposés`} href={adminRoutes.corrections} />
        )}
        {can(["admin", "supervisor"]) && (
          <StatCard label="Stages en cours" value={data.stages.internships} detail={`${data.stages.reportsToReview} rapports · ${data.stages.versionsToReview} versions de mémoire`} href={adminRoutes.stages} />
        )}
        {can(["admin", "pastor"]) && (
          <StatCard label="Évaluations pastorales" value={data.pastorale.evaluationsPending} detail="en attente de réalisation" href={adminRoutes.pastorale} />
        )}
        {can(["admin"]) && <StatCard label="Tickets d'assistance" value={data.support.openTickets} detail="ouverts" />}
      </div>

      {can(["admin", "admissions", "pastor"]) && (
        <div className="mt-8">
          <section className="rounded-2xl border border-or/25 bg-noir-card p-5 shadow-card">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="font-display text-base font-semibold text-blanc">Dernières candidatures</h2>
              <Link href={adminRoutes.candidates} className="inline-flex items-center gap-1 text-sm text-or-light hover:text-or">
                Tout voir <ArrowRight aria-hidden className="size-4" />
              </Link>
            </div>
            {data.recent.length ? (
              <AdminTable head={["Référence", "Candidat", "Formation", "Inscription", "Paiement", "Admission", ""]}>
                {data.recent.map((a) => (
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
                    <td className="px-2 py-3 text-right">
                      <Link href={`${adminRoutes.candidates}/${a.id}`} className="text-sm text-or-light hover:text-or">
                        Ouvrir
                      </Link>
                    </td>
                  </tr>
                ))}
              </AdminTable>
            ) : (
              <p className="text-sm text-blanc/50">Aucune candidature pour le moment.</p>
            )}
          </section>
        </div>
      )}
    </>
  );
}
