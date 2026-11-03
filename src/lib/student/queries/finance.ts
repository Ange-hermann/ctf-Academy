import "server-only";
import { type EnrolledContext, withStudent } from "@/lib/student/session";

export type ScheduleStatus = "paid" | "upcoming" | "late" | "partial";
export const scheduleStatusLabels: Record<ScheduleStatus, string> = {
  paid: "Réglée",
  upcoming: "À venir",
  late: "En retard",
  partial: "Partiellement réglée",
};

export type Schedule = {
  id: string;
  label: string;
  dueDate: string;
  amount: number;
  paidAmount: number;
  remaining: number;
  status: ScheduleStatus;
  isExample: boolean;
};

export type PaymentRow = {
  id: string;
  amount: number;
  currency: string;
  method: string;
  providerReference: string | null;
  status: "pending" | "confirmed" | "failed" | "refunded" | "partial";
  confirmedAt: string | null;
  createdAt: string;
  scheduleLabel: string | null;
  receipt: { number: string; issuedAt: string } | null;
};

export const methodLabels: Record<string, string> = {
  orange_money: "Orange Money",
  mtn_momo: "MTN Mobile Money",
  wave: "Wave",
  moov_money: "Moov Money",
  card: "Carte bancaire",
  cash: "Espèces",
  transfer: "Virement",
};

export const paymentStatusLabels: Record<PaymentRow["status"], string> = {
  pending: "En attente",
  confirmed: "Confirmé",
  failed: "Échoué",
  refunded: "Remboursé",
  partial: "Partiel",
};

/** Échéancier + historique des paiements + totaux. */
export async function getPayments(ctx: EnrolledContext) {
  const [schedules, payments] = await Promise.all([
    withStudent(ctx.userId, (tx) => tx.payment_schedules.findMany({ orderBy: { due_date: "asc" } })),
    withStudent(ctx.userId, (tx) =>
      tx.payments.findMany({
        orderBy: { created_at: "desc" },
        include: { receipts: { select: { number: true, issued_at: true } }, payment_schedules: { select: { label: true } } },
      }),
    ),
  ]);

  const list: Schedule[] = schedules.map((s) => ({
    id: s.id,
    label: s.label,
    dueDate: s.due_date.toISOString(),
    amount: s.amount,
    paidAmount: s.paid_amount,
    remaining: Math.max(s.amount - s.paid_amount, 0),
    status: s.status,
    isExample: s.is_example,
  }));
  const rows: PaymentRow[] = payments.map((p) => ({
    id: p.id,
    amount: p.amount,
    currency: p.currency,
    method: p.method,
    providerReference: p.provider_reference,
    status: p.status,
    confirmedAt: p.confirmed_at?.toISOString() ?? null,
    createdAt: p.created_at.toISOString(),
    scheduleLabel: p.payment_schedules?.label ?? null,
    receipt: p.receipts ? { number: p.receipts.number, issuedAt: p.receipts.issued_at.toISOString() } : null,
  }));

  return {
    schedules: list,
    payments: rows,
    totals: {
      due: list.reduce((n, s) => n + s.amount, 0),
      paid: list.reduce((n, s) => n + s.paidAmount, 0),
      remaining: list.reduce((n, s) => n + s.remaining, 0),
      late: list.filter((s) => s.status === "late").length,
      next: list.find((s) => s.status === "upcoming" || s.status === "partial" || s.status === "late") ?? null,
    },
    isExample: list.some((s) => s.isExample) || payments.length === 0,
  };
}

export type Criterion = { label: string; met: boolean };
export type ValidationKind = "level" | "path" | "graduation" | "service" | "defense" | "consecration";
export const validationKindLabels: Record<ValidationKind, string> = {
  level: "Niveau",
  path: "Parcours",
  graduation: "Graduation",
  service: "Service",
  defense: "Soutenance",
  consecration: "Consécration",
};

export type Validation = {
  id: string;
  kind: ValidationKind;
  title: string;
  description: string;
  criteria: Criterion[];
  decision: "pending" | "granted" | "refused";
  decidedAt: string | null;
  signatory: string | null;
  certificateNumber: string | null;
  levelTitle: string | null;
  isExample: boolean;
};

/** Décisions officielles : niveaux, parcours, graduation, service, soutenance, consécration. */
export async function getValidations(ctx: EnrolledContext): Promise<Validation[]> {
  const rows = await withStudent(ctx.userId, (tx) =>
    tx.validations.findMany({
      where: { formation_id: ctx.enrollment.formationId },
      orderBy: [{ created_at: "asc" }],
      include: { levels: { select: { title: true } } },
    }),
  );
  return rows.map((v) => ({
    id: v.id,
    kind: v.kind,
    title: v.title,
    description: v.description,
    criteria: Array.isArray(v.criteria)
      ? (v.criteria as Criterion[]).filter((c) => c && typeof c.label === "string").map((c) => ({ label: c.label, met: !!c.met }))
      : [],
    decision: v.decision,
    decidedAt: v.decided_at?.toISOString() ?? null,
    signatory: v.signatory,
    certificateNumber: v.certificate_number,
    levelTitle: v.levels?.title ?? null,
    isExample: v.is_example,
  }));
}
