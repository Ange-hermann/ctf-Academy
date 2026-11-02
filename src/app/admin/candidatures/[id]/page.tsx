import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { AdminIntro, AdminSection, StatusBadge } from "@/components/admin/ui";
import { ApplicationStatusPicker, PaymentActions } from "@/components/admin/controls";
import { adminRoutes } from "@/config/admin-nav";
import { requireAdminRoles } from "@/lib/admin/session";
import { getApplicationDetail } from "@/lib/admin/queries";
import { formatMoney, formatShortDate } from "@/lib/student/format";

export default async function CandidatureDetailPage({ params }: PageProps<"/admin/candidatures/[id]">) {
  const ctx = await requireAdminRoles(["admin", "admissions", "pastor"], adminRoutes.candidates);
  const { id } = await params;
  const d = await getApplicationDetail(ctx, id);
  if (!d) notFound();
  const canDecide = ctx.roles.includes("admin") || ctx.roles.includes("admissions");

  return (
    <>
      <Link href={adminRoutes.candidates} className="mb-4 inline-flex items-center gap-1 text-sm text-or-light hover:text-or">
        <ChevronLeft aria-hidden className="size-4" /> Candidatures
      </Link>
      <AdminIntro title={`${d.row.studentName} — ${d.row.reference}`} subtitle={`${d.row.formationName}${d.sessionLabel ? ` · Session ${d.sessionLabel}` : ""}`} />

      <div className="grid gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          <AdminSection title="Statuts du dossier">
            <dl className="grid gap-4 sm:grid-cols-3">
              <div>
                <dt className="text-xs font-medium text-blanc/55 uppercase">Inscription</dt>
                <dd className="mt-1.5"><StatusBadge status={d.row.registrationStatus} /></dd>
                {canDecide && (
                  <div className="mt-2">
                    <ApplicationStatusPicker
                      applicationId={d.row.id}
                      field="registration_status"
                      value={d.row.registrationStatus}
                      options={[
                        { value: "draft", label: "Brouillon" },
                        { value: "submitted", label: "Déposée" },
                        { value: "complete", label: "Complète" },
                      ]}
                    />
                  </div>
                )}
              </div>
              <div>
                <dt className="text-xs font-medium text-blanc/55 uppercase">Paiement</dt>
                <dd className="mt-1.5"><StatusBadge status={d.row.paymentStatus} /></dd>
                {canDecide && (
                  <div className="mt-2">
                    <ApplicationStatusPicker
                      applicationId={d.row.id}
                      field="payment_status"
                      value={d.row.paymentStatus}
                      options={[
                        { value: "pending", label: "En attente" },
                        { value: "partial", label: "Partiel" },
                        { value: "confirmed", label: "Confirmé" },
                        { value: "failed", label: "Échoué" },
                        { value: "refunded", label: "Remboursé" },
                      ]}
                    />
                  </div>
                )}
              </div>
              <div>
                <dt className="text-xs font-medium text-blanc/55 uppercase">Admission</dt>
                <dd className="mt-1.5"><StatusBadge status={d.row.admissionStatus} /></dd>
                {canDecide && (
                  <div className="mt-2">
                    <ApplicationStatusPicker
                      applicationId={d.row.id}
                      field="admission_status"
                      value={d.row.admissionStatus}
                      options={[
                        { value: "under_review", label: "En examen" },
                        { value: "admitted", label: "Admis" },
                        { value: "waitlisted", label: "Liste d'attente" },
                        { value: "rejected", label: "Refusé" },
                      ]}
                    />
                  </div>
                )}
              </div>
            </dl>
            {!canDecide && <p className="mt-4 text-xs text-blanc/45">Profil en lecture seule : les décisions de statut relèvent du responsable des admissions.</p>}
          </AdminSection>

          <AdminSection title="Réponses au formulaire">
            {d.answers.length ? (
              <dl className="space-y-3">
                {d.answers.map((a) => (
                  <div key={a.label} className="grid gap-1 sm:grid-cols-[14rem_1fr]">
                    <dt className="text-sm text-blanc/55">{a.label}</dt>
                    <dd className="text-sm whitespace-pre-line text-blanc">{a.value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-sm text-blanc/50">Le formulaire n&rsquo;a pas encore été rempli.</p>
            )}
          </AdminSection>

          <AdminSection title="Échéancier">
            {d.schedules.length ? (
              <ul className="divide-y divide-line/60">
                {d.schedules.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
                    <span className="min-w-32 text-blanc">{s.label}</span>
                    <span className="text-blanc/55">{formatShortDate(s.dueDate, "UTC")}</span>
                    <span className="font-medium text-or-light">{formatMoney(s.paidAmount)} / {formatMoney(s.amount)}</span>
                    <StatusBadge status={s.status} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-blanc/50">Aucune échéance générée.</p>
            )}
          </AdminSection>
        </div>

        <div className="space-y-5">
          <AdminSection title="Coordonnées">
            <dl className="space-y-2 text-sm">
              <div><dt className="text-blanc/55">E-mail</dt><dd className="text-blanc">{d.row.email}</dd></div>
              {d.phone && <div><dt className="text-blanc/55">Téléphone</dt><dd className="text-blanc">{d.phone}</dd></div>}
              {d.country && <div><dt className="text-blanc/55">Pays</dt><dd className="text-blanc">{d.country}</dd></div>}
              <div><dt className="text-blanc/55">Déposée le</dt><dd className="text-blanc">{d.row.submittedAt ? formatShortDate(d.row.submittedAt, "UTC") : "—"}</dd></div>
            </dl>
          </AdminSection>

          <AdminSection title="Paiements">
            {d.payments.length ? (
              <ul className="space-y-3">
                {d.payments.map((p) => (
                  <li key={p.id} className="rounded-xl border border-line p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-blanc">{formatMoney(p.amount)}</span>
                      <StatusBadge status={p.status} />
                    </div>
                    <p className="mt-1 text-xs text-blanc/55">
                      {p.method} · {p.provider} · {formatShortDate(p.createdAt, "UTC")}
                    </p>
                    {canDecide && <div className="mt-2"><PaymentActions paymentId={p.id} status={p.status} /></div>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-blanc/50">Aucun paiement enregistré.</p>
            )}
          </AdminSection>
        </div>
      </div>
    </>
  );
}
