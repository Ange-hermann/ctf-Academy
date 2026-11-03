import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { AdminIntro, AdminTable, StatCard, StatusBadge } from "@/components/admin/ui";
import { TrainerOverview } from "@/components/admin/trainer-overview";
import { adminRoutes } from "@/config/admin-nav";
import { hasAdminRole, requireStaff } from "@/lib/admin/session";
import { getAdminDashboard, getClassSchedule, getDiacresData, getEdmData, getPedagogyOverview } from "@/lib/admin/queries";
import { formatMoney } from "@/lib/student/format";

const fmtSession = (iso: string) => new Date(iso).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export default async function AdminDashboardPage() {
  const ctx = await requireStaff(adminRoutes.dashboard);
  // Le rôle finance n'a pas de vue d'ensemble : sa seule section est Finances.
  if (!hasAdminRole(ctx, ["admin", "admissions", "pedagogy", "trainer", "supervisor", "pastor"])) redirect(adminRoutes.finance);
  const can = (roles: readonly ("admin" | "admissions" | "pedagogy" | "trainer" | "finance" | "supervisor" | "pastor")[]) => hasAdminRole(ctx, roles);
  const isTrainer = can(["trainer"]);
  const hasGlobalCards = can(["admin", "admissions", "pastor", "finance", "pedagogy", "supervisor"]);
  // Vue dédiée : le pédagogique pur (sans autre rôle) pilote programmes, calendrier et progression.
  const pedagogyOnly = can(["pedagogy"]) && !can(["admin", "admissions", "finance", "supervisor", "pastor", "trainer"]);
  // Vue dédiée : le pasteur pur pilote EDM et Diacres — étudiants, cours, évaluations et parcours des diacres.
  const pastorOnly = can(["pastor"]) && !can(["admin", "admissions", "finance", "supervisor", "pedagogy", "trainer"]);

  const [data, pedagogyRows, pedagogySchedule, diacres, edm] = await Promise.all([
    getAdminDashboard(ctx),
    pedagogyOnly || pastorOnly ? getPedagogyOverview(ctx) : Promise.resolve([]),
    pedagogyOnly || pastorOnly ? getClassSchedule(ctx) : Promise.resolve(null),
    pastorOnly ? getDiacresData(ctx) : Promise.resolve({ rows: [] }),
    pastorOnly ? getEdmData(ctx) : Promise.resolve({ rows: [] }),
  ]);

  if (pastorOnly) {
    const students = pedagogyRows.reduce((s, f) => s + f.students, 0);
    const copies = pedagogyRows.reduce((s, f) => s + f.submittedAttempts, 0);
    const fiches = edm.rows.reduce((s, r) => s + r.toValidate, 0);
    const now = new Date().toISOString();
    const sessions = (pedagogySchedule?.sessions ?? []).filter((s) => s.startsAt >= now);
    return (
      <>
        <AdminIntro
          title={`Bonjour${ctx.firstName ? ` ${ctx.firstName}` : ""}`}
          subtitle="Votre espace pastoral : étudiants EDM et Diacres, cours, évaluations et parcours des diacres."
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard label="Étudiants" value={students} detail={`${pedagogyRows.map((f) => f.slug.toUpperCase()).join(" + ") || "EDM + Diacres"}`} href={adminRoutes.classroom} />
          <StatCard label="Copies à corriger" value={copies} detail="en attente de correction" href={adminRoutes.corrections} />
          <StatCard label="Fiches EDM" value={fiches} detail="en attente de validation" href={adminRoutes.edm} />
          <StatCard label="Évaluations pastorales" value={data.pastorale.evaluationsPending} detail="en attente de réalisation" href={adminRoutes.pastorale} />
          <StatCard label="Étudiants diacres" value={diacres.rows.length} detail="parcours à suivre" href={adminRoutes.diacres} />
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-2">
          <section className="rounded-2xl border border-or/25 bg-noir-card p-5 shadow-card">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="font-display text-base font-semibold text-blanc">Prochaines séances</h2>
              <Link href={adminRoutes.pedagogy} className="inline-flex items-center gap-1 text-sm text-or-light hover:text-or">
                Gérer <ArrowRight aria-hidden className="size-4" />
              </Link>
            </div>
            {sessions.length ? (
              <AdminTable head={["Séance", "Classe", "Date"]}>
                {sessions.slice(0, 6).map((s) => (
                  <tr key={s.id}>
                    <td className="px-2 py-3 font-medium text-blanc">{s.title}</td>
                    <td className="px-2 py-3 text-blanc/70">{s.formationSlug.toUpperCase()}</td>
                    <td className="px-2 py-3 whitespace-nowrap text-blanc/70">{fmtSession(s.startsAt)}</td>
                  </tr>
                ))}
              </AdminTable>
            ) : (
              <p className="text-sm text-blanc/50">Aucune séance programmée — créez-en une dans Pédagogie.</p>
            )}
          </section>

          <section className="rounded-2xl border border-or/25 bg-noir-card p-5 shadow-card">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="font-display text-base font-semibold text-blanc">Parcours des diacres</h2>
              <Link href={adminRoutes.diacres} className="inline-flex items-center gap-1 text-sm text-or-light hover:text-or">
                Tout voir <ArrowRight aria-hidden className="size-4" />
              </Link>
            </div>
            {diacres.rows.length ? (
              <AdminTable head={["Étudiant", "Stage", "Mémoire", "Consécration"]}>
                {diacres.rows.slice(0, 6).map((r) => (
                  <tr key={r.userId}>
                    <td className="px-2 py-3 font-medium text-blanc">{r.name}</td>
                    <td className="px-2 py-3 text-blanc/70">{r.internship ? `${r.internship.doneHours}/${r.internship.targetHours} h` : "—"}</td>
                    <td className="px-2 py-3 text-blanc/70">{r.thesis ? (r.thesis.toReview ? `${r.thesis.toReview} à relire` : "En cours") : "—"}</td>
                    <td className="px-2 py-3">{r.consecration ? <StatusBadge status={r.consecration.decision} /> : <span className="text-xs text-blanc/45">—</span>}</td>
                  </tr>
                ))}
              </AdminTable>
            ) : (
              <p className="text-sm text-blanc/50">Aucun étudiant admis en formation des diacres.</p>
            )}
          </section>
        </div>
      </>
    );
  }

  if (pedagogyOnly) {
    const students = pedagogyRows.reduce((s, f) => s + f.students, 0);
    const copies = pedagogyRows.reduce((s, f) => s + f.submittedAttempts, 0);
    const now = new Date().toISOString();
    const sessions = (pedagogySchedule?.sessions ?? []).filter((s) => s.startsAt >= now);
    return (
      <>
        <AdminIntro
          title={`Bonjour${ctx.firstName ? ` ${ctx.firstName}` : ""}`}
          subtitle="Votre espace pédagogique : programmes, calendrier et progression des étudiants."
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Formations" value={pedagogyRows.length} detail={`${pedagogyRows.reduce((s, f) => s + f.modules, 0)} modules · ${pedagogyRows.reduce((s, f) => s + f.lessons, 0)} leçons`} href={adminRoutes.pedagogy} />
          <StatCard label="Étudiants admis" value={students} detail="toutes formations" href={adminRoutes.classroom} />
          <StatCard label="Copies à corriger" value={copies} detail="en attente de correction" href={adminRoutes.corrections} />
          <StatCard label="Séances à venir" value={sessions.length} detail="cours en direct programmés" href={adminRoutes.pedagogy} />
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-2">
          <section className="rounded-2xl border border-or/25 bg-noir-card p-5 shadow-card">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="font-display text-base font-semibold text-blanc">Prochaines séances</h2>
              <Link href={adminRoutes.pedagogy} className="inline-flex items-center gap-1 text-sm text-or-light hover:text-or">
                Gérer <ArrowRight aria-hidden className="size-4" />
              </Link>
            </div>
            {sessions.length ? (
              <AdminTable head={["Séance", "Classe", "Date"]}>
                {sessions.slice(0, 6).map((s) => (
                  <tr key={s.id}>
                    <td className="px-2 py-3 font-medium text-blanc">{s.title}</td>
                    <td className="px-2 py-3 text-blanc/70">{s.formationSlug.toUpperCase()}</td>
                    <td className="px-2 py-3 whitespace-nowrap text-blanc/70">{fmtSession(s.startsAt)}</td>
                  </tr>
                ))}
              </AdminTable>
            ) : (
              <p className="text-sm text-blanc/50">Aucune séance programmée — créez-en une dans Pédagogie.</p>
            )}
          </section>

          <section className="rounded-2xl border border-or/25 bg-noir-card p-5 shadow-card">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="font-display text-base font-semibold text-blanc">Progression par formation</h2>
              <Link href={adminRoutes.classroom} className="inline-flex items-center gap-1 text-sm text-or-light hover:text-or">
                Étudiants <ArrowRight aria-hidden className="size-4" />
              </Link>
            </div>
            {pedagogyRows.length ? (
              <AdminTable head={["Formation", "Modules", "Étudiants", "Copies en attente"]}>
                {pedagogyRows.map((f) => (
                  <tr key={f.slug}>
                    <td className="px-2 py-3">
                      <p className="font-medium text-blanc">{f.slug.toUpperCase()}</p>
                      <p className="max-w-52 truncate text-xs text-blanc/50">{f.name}</p>
                    </td>
                    <td className="px-2 py-3 text-blanc/70">{f.modules}</td>
                    <td className="px-2 py-3 text-blanc/70">{f.students}</td>
                    <td className="px-2 py-3 text-or-light">{f.submittedAttempts || "—"}</td>
                  </tr>
                ))}
              </AdminTable>
            ) : (
              <p className="text-sm text-blanc/50">Aucune formation pour le moment.</p>
            )}
          </section>
        </div>
      </>
    );
  }

  return (
    <>
      {isTrainer ? (
        <AdminIntro
          title={`Bonjour${ctx.firstName ? ` ${ctx.firstName}` : ""}`}
          subtitle="Votre espace formateur : votre classe, votre agenda, vos copies à corriger et le suivi de vos étudiants."
        />
      ) : (
        <AdminIntro title="Supervision" subtitle="Vue d'ensemble de la plateforme. Chaque section dépend du profil attribué à votre compte." />
      )}

      {isTrainer && (
        <div className={hasGlobalCards ? "mb-10" : undefined}>
          <TrainerOverview ctx={ctx} />
        </div>
      )}

      {hasGlobalCards && isTrainer && <h2 className="font-display mb-4 text-lg font-semibold text-blanc">Supervision de la plateforme</h2>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {can(["admin", "admissions", "pastor"]) && (
          <StatCard label="Candidatures" value={data.applications.total} detail={`${data.applications.underReview} en examen · ${data.applications.admitted} admises`} href={adminRoutes.candidates} />
        )}
        {can(["admin", "admissions", "finance"]) && (
          <StatCard
            label="Paiements à suivre"
            value={data.applications.pendingPayment}
            detail={`${formatMoney(data.finance.pendingAmount)} restants · ${data.finance.lateSchedules} échéances en retard`}
            href={can(["admin", "finance"]) ? adminRoutes.finance : adminRoutes.candidates}
          />
        )}
        {can(["admin", "pedagogy"]) && (
          <StatCard label="Copies à corriger" value={data.corrections.submittedAttempts} detail={`${data.corrections.submittedWorks} travaux EDM déposés`} href={adminRoutes.corrections} />
        )}
        {can(["admin", "supervisor"]) && (
          <StatCard label="Stages en cours" value={data.stages.internships} detail={`${data.stages.reportsToReview} rapports · ${data.stages.versionsToReview} versions de mémoire`} href={adminRoutes.stages} />
        )}
        {can(["admin", "pastor"]) && (
          <StatCard label="Évaluations pastorales" value={data.pastorale.evaluationsPending} detail="en attente de réalisation" href={adminRoutes.pastorale} />
        )}
        {can(["admin"]) && <StatCard label="Tickets d'assistance" value={data.support.openTickets} detail="ouverts" href={adminRoutes.assistance} />}
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
