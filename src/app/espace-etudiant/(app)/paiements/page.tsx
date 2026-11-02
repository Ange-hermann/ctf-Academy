import Link from "next/link";
import { CalendarClock, CircleAlert, CreditCard, FileText, PiggyBank, Wallet } from "lucide-react";
import { EmptyState } from "@/components/student/ui/empty-state";
import { StudentPageHeader } from "@/components/student/ui/page-header";
import { Badge, ExampleBadge } from "@/components/ui/badge";
import { studentRoutes } from "@/config/student-nav";
import { formatDate, formatDateTime, formatMoney } from "@/lib/student/format";
import { getPayments, methodLabels, paymentStatusLabels, scheduleStatusLabels } from "@/lib/student/queries/finance";
import { requireStudent } from "@/lib/student/session";
import { cn } from "@/lib/utils";

export const metadata = { title: "Mes paiements" };

const scheduleTone = { paid: "success", upcoming: "gold", late: "danger", partial: "warning" } as const;
const payTone = { confirmed: "success", pending: "warning", failed: "danger", refunded: "neutral", partial: "warning" } as const;

export default async function PaymentsPage() {
  const ctx = await requireStudent(studentRoutes.payments);
  const { schedules, payments, totals, isExample } = await getPayments(ctx);
  const pct = totals.due > 0 ? Math.round((totals.paid / totals.due) * 100) : 0;

  return (
    <>
      <StudentPageHeader
        title="Mes paiements"
        description="Votre échéancier, l'historique de vos versements et vos reçus téléchargeables."
        crumbs={[{ label: "Mes paiements", href: studentRoutes.payments }]}
        actions={isExample ? <ExampleBadge /> : undefined}
      />

      {/* Synthèse */}
      <section aria-label="Synthèse des paiements" className="grid gap-4 sm:grid-cols-3">
        {[
          { icon: Wallet, label: "Total réglé", value: formatMoney(totals.paid), tone: "text-success-light" },
          { icon: PiggyBank, label: "Reste à régler", value: formatMoney(totals.remaining), tone: "text-or-light" },
          {
            icon: CalendarClock,
            label: totals.late ? `${totals.late} échéance${totals.late > 1 ? "s" : ""} en retard` : "Prochaine échéance",
            value: totals.next ? `${formatDate(totals.next.dueDate, ctx.timezone)} · ${formatMoney(totals.next.remaining)}` : "—",
            tone: totals.late ? "text-danger-light" : "text-blanc",
          },
        ].map((c) => (
          <article key={c.label} className="rounded-3xl border border-line bg-gradient-card p-5">
            <c.icon aria-hidden className={cn("size-6", c.tone === "text-blanc" ? "text-or" : c.tone)} />
            <p className="mt-3 text-sm text-blanc/60">{c.label}</p>
            <p className={cn("mt-1 font-display text-2xl tabular", c.tone)}>{c.value}</p>
          </article>
        ))}
      </section>

      {/* Barre globale */}
      <div className="mt-5 rounded-2xl border border-line bg-gradient-card p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-blanc/60">Progression du règlement</span>
          <span className="font-semibold text-or-light tabular">{pct} %</span>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-or/10" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${pct} % du total réglé`}>
          <div className="h-full origin-left rounded-full bg-gradient-or" style={{ transform: `scaleX(${pct / 100})` }} />
        </div>
      </div>

      {totals.late > 0 && (
        <p role="alert" className="mt-4 flex items-start gap-2.5 rounded-2xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger-light">
          <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
          Une échéance est en retard. Régularisez-la dès que possible ou contactez l&apos;assistance dans « Messages ».
        </p>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Échéancier */}
        <section aria-labelledby="schedule-title" className="rounded-3xl border border-line bg-gradient-card p-5 sm:p-6">
          <h2 id="schedule-title" className="flex items-center gap-2 font-sans text-sm font-semibold tracking-[0.18em] text-or-light uppercase">
            <CalendarClock aria-hidden className="size-4" /> Échéancier
          </h2>
          {schedules.length === 0 ? (
            <p className="mt-3 text-sm text-blanc/55">Votre échéancier sera affiché ici.</p>
          ) : (
            <ul className="mt-4 divide-y divide-line">
              {schedules.map((s) => (
                <li key={s.id} className="py-3.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="min-w-0 flex-1 font-medium text-blanc">{s.label}</p>
                    {s.isExample && <ExampleBadge />}
                    <Badge tone={scheduleTone[s.status]} dot>
                      {scheduleStatusLabels[s.status]}
                    </Badge>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-4 text-sm text-blanc/55">
                    <span>Échéance : {formatDate(s.dueDate, ctx.timezone)}</span>
                    <span className="tabular">
                      {formatMoney(s.paidAmount)} / {formatMoney(s.amount)}
                    </span>
                    {s.remaining > 0 && <span className={cn("tabular", s.status === "late" ? "text-danger-light" : "text-or-light")}>reste {formatMoney(s.remaining)}</span>}
                  </div>
                  {s.status !== "paid" && s.amount > 0 && (
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-or/10" role="progressbar" aria-valuenow={Math.round((s.paidAmount / s.amount) * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={`${s.label} : ${s.paidAmount} sur ${s.amount}`}>
                      <div className={cn("h-full origin-left rounded-full", s.status === "late" ? "bg-danger-light/70" : "bg-or")} style={{ transform: `scaleX(${s.paidAmount / s.amount})` }} />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Historique */}
        <section aria-labelledby="history-title" className="rounded-3xl border border-line bg-gradient-card p-5 sm:p-6">
          <h2 id="history-title" className="flex items-center gap-2 font-sans text-sm font-semibold tracking-[0.18em] text-or-light uppercase">
            <CreditCard aria-hidden className="size-4" /> Historique des versements
          </h2>
          {payments.length === 0 ? (
            <EmptyState icon={CreditCard} title="Aucun versement" description="Vos paiements confirmés apparaîtront ici avec leur reçu." className="mt-4" />
          ) : (
            <ul className="mt-4 divide-y divide-line">
              {payments.map((p) => (
                <li key={p.id} className="flex items-start gap-3 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-blanc">{p.scheduleLabel ?? "Versement"}</p>
                    <p className="mt-0.5 text-sm text-blanc/55">
                      {methodLabels[p.method] ?? p.method} · {formatDateTime(p.confirmedAt ?? p.createdAt, ctx.timezone)}
                      {p.providerReference && ` · Réf. ${p.providerReference}`}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <span className="font-semibold text-blanc tabular">{formatMoney(p.amount)}</span>
                    <Badge tone={payTone[p.status]}>{paymentStatusLabels[p.status]}</Badge>
                    {p.receipt && (
                      <a href={`${studentRoutes.payments}/recu/${p.id}`} target="_blank" rel="noopener" className="inline-flex min-h-9 items-center gap-1.5 text-sm font-medium text-or-light hover:underline">
                        <FileText aria-hidden className="size-4" /> Reçu {p.receipt.number}
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 border-t border-line pt-3 text-xs text-blanc/45">
            Pour régler une échéance, contactez la trésorerie ou utilisez le canal indiqué dans{" "}
            <Link href={studentRoutes.messages} className="text-or-light hover:underline">
              Messages et assistance
            </Link>
            .
          </p>
        </section>
      </div>
    </>
  );
}
