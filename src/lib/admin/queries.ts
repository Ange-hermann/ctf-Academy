import "server-only";
import { getDb } from "@/lib/db";
import { weeklyReportWindow } from "@/lib/edm";
import { STAGE_FORMATIONS } from "@/lib/internships";
import { hasAdminRole, type AdminRole } from "@/lib/admin/session";
import {
  classMembers,
  classStudentIds,
  describeClass,
  describeUnits,
  getClassScope,
  moduleWhere,
  noClass,
  plannedWhere,
  quizWhere,
  type ClassMember,
} from "@/lib/admin/classroom";
import type { StudentContext } from "@/lib/student/session";

/**
 * Lectures d'administration : client privilégié (les policies métier sont « own-only »),
 * chaque requête réaffirme le rôle — la garde de page ne suffit pas comme seule défense.
 */

function assert(ctx: StudentContext, allowed: readonly AdminRole[]) {
  if (!hasAdminRole(ctx, allowed)) throw new Error("Accès non autorisé à cette section.");
}



// ───────────────────────── Vue d'ensemble ─────────────────────────

export type AdminDashboard = {
  applications: { total: number; underReview: number; admitted: number; waitlisted: number; rejected: number; pendingPayment: number };
  corrections: { submittedAttempts: number; submittedWorks: number };
  stages: { internships: number; reportsToReview: number; versionsToReview: number };
  pastorale: { evaluationsPending: number };
  finance: { pendingAmount: number; lateSchedules: number };
  support: { openTickets: number };
  recent: ApplicationRow[];
};

export type ApplicationRow = {
  id: string;
  reference: string;
  studentName: string;
  email: string;
  formationSlug: string;
  formationName: string;
  registrationStatus: string;
  paymentStatus: string;
  admissionStatus: string;
  submittedAt: string | null;
  createdAt: string;
};

const toApplicationRow = (a: {
  id: string;
  reference: string;
  registration_status: string;
  payment_status: string;
  admission_status: string;
  submitted_at: Date | null;
  created_at: Date;
  profiles: { first_name: string; last_name: string; email: string };
  formations: { slug: string; name: string };
}): ApplicationRow => ({
  id: a.id,
  reference: a.reference,
  studentName: `${a.profiles.first_name} ${a.profiles.last_name}`.trim() || a.profiles.email,
  email: a.profiles.email,
  formationSlug: a.formations.slug,
  formationName: a.formations.name,
  registrationStatus: a.registration_status,
  paymentStatus: a.payment_status,
  admissionStatus: a.admission_status,
  submittedAt: a.submitted_at?.toISOString() ?? null,
  createdAt: a.created_at.toISOString(),
});

const applicationInclude = {
  profiles: { select: { first_name: true, last_name: true, email: true } },
  formations: { select: { slug: true, name: true } },
} as const;

export async function getAdminDashboard(ctx: StudentContext): Promise<AdminDashboard> {
  assert(ctx, ["admin", "admissions", "pedagogy", "trainer", "finance", "supervisor", "pastor"]);
  const db = getDb();
  const empty: AdminDashboard = {
    applications: { total: 0, underReview: 0, admitted: 0, waitlisted: 0, rejected: 0, pendingPayment: 0 },
    corrections: { submittedAttempts: 0, submittedWorks: 0 },
    stages: { internships: 0, reportsToReview: 0, versionsToReview: 0 },
    pastorale: { evaluationsPending: 0 },
    finance: { pendingAmount: 0, lateSchedules: 0 },
    support: { openTickets: 0 },
    recent: [],
  };
  if (!db) return empty;

  const [
    total, underReview, admitted, waitlisted, rejected, pendingPayment,
    submittedAttempts, mentoratWorks, leadershipWorks,
    internships, reportsToReview, versionsToReview,
    evaluationsPending, pendingSum, lateSchedules, openTickets, recent,
  ] = await Promise.all([
    db.applications.count(),
    db.applications.count({ where: { admission_status: "under_review" } }),
    db.applications.count({ where: { admission_status: "admitted" } }),
    db.applications.count({ where: { admission_status: "waitlisted" } }),
    db.applications.count({ where: { admission_status: "rejected" } }),
    db.applications.count({ where: { payment_status: { in: ["pending", "partial"] } } }),
    db.quiz_attempts.count({ where: { status: "submitted" } }),
    db.mentoring_exercises.count({ where: { status: "submitted" } }),
    db.leadership_works.count({ where: { status: "submitted" } }),
    db.internships.count(),
    db.internship_reports.count({ where: { status: "submitted" } }),
    db.thesis_versions.count({ where: { status: { in: ["submitted", "in_review"] } } }),
    db.pastoral_evaluations.count({ where: { status: "pending" } }),
    db.payment_schedules.aggregate({ where: { status: { in: ["upcoming", "late", "partial"] } }, _sum: { amount: true, paid_amount: true } }),
    db.payment_schedules.count({ where: { status: "late" } }),
    db.support_tickets.count({ where: { status: "open" } }),
    db.applications.findMany({ orderBy: { created_at: "desc" }, take: 8, include: applicationInclude }),
  ]);

  return {
    applications: { total, underReview, admitted, waitlisted, rejected, pendingPayment },
    corrections: { submittedAttempts, submittedWorks: mentoratWorks + leadershipWorks },
    stages: { internships, reportsToReview, versionsToReview },
    pastorale: { evaluationsPending },
    finance: { pendingAmount: (pendingSum._sum.amount ?? 0) - (pendingSum._sum.paid_amount ?? 0), lateSchedules },
    support: { openTickets },
    recent: recent.map(toApplicationRow),
  };
}

// ───────────────────────── Candidatures (admissions / pastorale) ─────────────────────────

export type ApplicationFilter = { formation?: string; status?: string; q?: string };

const REGISTRATION_VALUES = ["draft", "submitted", "complete"];
const PAYMENT_VALUES = ["pending", "partial", "confirmed", "failed", "refunded"];
const ADMISSION_VALUES = ["under_review", "admitted", "waitlisted", "rejected"];

/** La valeur « statut » du filtre ne s'applique qu'aux colonnes dont l'enum la contient (sinon Prisma la rejette). */
const statusWhere = (status: string) => {
  const or = [
    ...(REGISTRATION_VALUES.includes(status) ? [{ registration_status: status as never }] : []),
    ...(PAYMENT_VALUES.includes(status) ? [{ payment_status: status as never }] : []),
    ...(ADMISSION_VALUES.includes(status) ? [{ admission_status: status as never }] : []),
  ];
  return or.length ? { OR: or } : { id: { in: [] } }; // valeur inconnue : aucune ligne plutôt que tout ignorer
};

export async function getApplications(ctx: StudentContext, filter: ApplicationFilter): Promise<ApplicationRow[]> {
  assert(ctx, ["admin", "admissions", "pastor"]);
  const db = getDb();
  if (!db) return [];
  const rows = await db.applications.findMany({
    where: {
      ...(filter.formation ? { formations: { slug: filter.formation } } : {}),
      // AND explicite : statut et recherche produisent chacun un OR — les deux doivent s'appliquer ensemble.
      AND: [
        ...(filter.status ? [statusWhere(filter.status)] : []),
        ...(filter.q
          ? [
              {
                OR: [
                  { reference: { contains: filter.q, mode: "insensitive" as const } },
                  { profiles: { email: { contains: filter.q, mode: "insensitive" as const } } },
                  { profiles: { first_name: { contains: filter.q, mode: "insensitive" as const } } },
                  { profiles: { last_name: { contains: filter.q, mode: "insensitive" as const } } },
                ],
              },
            ]
          : []),
      ],
    },
    orderBy: { created_at: "desc" },
    take: 200,
    include: applicationInclude,
  });
  return rows.map(toApplicationRow);
}

export type ApplicationDetail = {
  row: ApplicationRow;
  phone: string | null;
  country: string | null;
  sessionLabel: string | null;
  answers: { label: string; value: string }[];
  schedules: { id: string; label: string; dueDate: string; amount: number; paidAmount: number; status: string }[];
  payments: { id: string; amount: number; method: string; provider: string; status: string; createdAt: string; confirmedAt: string | null }[];
};

const flattenAnswers = (raw: unknown): { label: string; value: string }[] => {
  if (typeof raw !== "object" || raw === null) return [];
  return Object.entries(raw as Record<string, unknown>)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([label, v]) => ({
      label,
      value: typeof v === "string" ? v : Array.isArray(v) ? v.join(", ") : typeof v === "object" ? JSON.stringify(v) : String(v),
    }));
};

export async function getApplicationDetail(ctx: StudentContext, id: string): Promise<ApplicationDetail | null> {
  assert(ctx, ["admin", "admissions", "pastor"]);
  const db = getDb();
  if (!db) return null;
  const a = await db.applications.findUnique({
    where: { id },
    include: {
      ...applicationInclude,
      profiles: { select: { first_name: true, last_name: true, email: true, phone: true, country: true } },
      sessions: { select: { label: true } },
      payment_schedules: { orderBy: { due_date: "asc" } },
      payments: { orderBy: { created_at: "desc" } },
    },
  });
  if (!a) return null;
  const draft = flattenAnswers(a.draft);
  return {
    row: toApplicationRow({ ...a, profiles: { first_name: a.profiles.first_name, last_name: a.profiles.last_name, email: a.profiles.email } }),
    phone: a.profiles.phone,
    country: a.profiles.country,
    sessionLabel: a.sessions?.label ?? null,
    answers: [...flattenAnswers(a.answers), ...draft.filter((d) => !flattenAnswers(a.answers).some((x) => x.label === d.label))],
    schedules: a.payment_schedules.map((s) => ({
      id: s.id,
      label: s.label,
      dueDate: s.due_date.toISOString(),
      amount: s.amount,
      paidAmount: s.paid_amount,
      status: s.status,
    })),
    payments: a.payments.map((p) => ({
      id: p.id,
      amount: p.amount,
      method: p.method,
      provider: p.provider,
      status: p.status,
      createdAt: p.created_at.toISOString(),
      confirmedAt: p.confirmed_at?.toISOString() ?? null,
    })),
  };
}

// ───────────────────────── Finances ─────────────────────────

export type FinanceData = {
  totals: { confirmed: number; pending: number; lateCount: number };
  schedules: { id: string; applicationId: string; studentName: string; reference: string; label: string; dueDate: string; amount: number; paidAmount: number; status: string }[];
  payments: { id: string; studentName: string; reference: string; amount: number; method: string; provider: string; status: string; createdAt: string; confirmedAt: string | null }[];
  report: {
    byFormation: { name: string; total: number; count: number }[];
    byMethod: { method: string; total: number; count: number }[];
    byMonth: { month: string; total: number; count: number }[];
  };
};

export async function getFinanceOverview(ctx: StudentContext): Promise<FinanceData> {
  assert(ctx, ["admin", "finance"]);
  const db = getDb();
  const empty: FinanceData = { totals: { confirmed: 0, pending: 0, lateCount: 0 }, schedules: [], payments: [], report: { byFormation: [], byMethod: [], byMonth: [] } };
  if (!db) return empty;

  const [confirmed, pending, lateCount, schedules, payments, confirmedRows] = await Promise.all([
    db.payments.aggregate({ where: { status: "confirmed" }, _sum: { amount: true } }),
    db.payment_schedules.aggregate({ where: { status: { in: ["upcoming", "late", "partial"] } }, _sum: { amount: true, paid_amount: true } }),
    db.payment_schedules.count({ where: { status: "late" } }),
    db.payment_schedules.findMany({
      where: { status: { not: "paid" } },
      orderBy: { due_date: "asc" },
      take: 100,
      include: { profiles: { select: { first_name: true, last_name: true } }, applications: { select: { id: true, reference: true } } },
    }),
    db.payments.findMany({
      orderBy: { created_at: "desc" },
      take: 100,
      include: { profiles: { select: { first_name: true, last_name: true } }, applications: { select: { reference: true } } },
    }),
    // Rapport : paiements confirmés (formation, méthode, mois).
    db.payments.findMany({
      where: { status: "confirmed" },
      take: 5000,
      select: { amount: true, method: true, confirmed_at: true, applications: { select: { formations: { select: { name: true } } } } },
    }),
  ]);

  const byFormation = new Map<string, { name: string; total: number; count: number }>();
  const byMethod = new Map<string, { method: string; total: number; count: number }>();
  const byMonth = new Map<string, { month: string; total: number; count: number }>();
  for (const p of confirmedRows) {
    const f = byFormation.get(p.applications.formations.name) ?? { name: p.applications.formations.name, total: 0, count: 0 };
    f.total += p.amount;
    f.count += 1;
    byFormation.set(f.name, f);
    const m = byMethod.get(p.method) ?? { method: p.method, total: 0, count: 0 };
    m.total += p.amount;
    m.count += 1;
    byMethod.set(p.method, m);
    const month = (p.confirmed_at ?? new Date()).toISOString().slice(0, 7);
    const mm = byMonth.get(month) ?? { month, total: 0, count: 0 };
    mm.total += p.amount;
    mm.count += 1;
    byMonth.set(month, mm);
  }

  return {
    totals: {
      confirmed: confirmed._sum.amount ?? 0,
      pending: (pending._sum.amount ?? 0) - (pending._sum.paid_amount ?? 0),
      lateCount,
    },
    schedules: schedules.map((s) => ({
      id: s.id,
      applicationId: s.applications.id,
      studentName: `${s.profiles.first_name} ${s.profiles.last_name}`.trim(),
      reference: s.applications.reference,
      label: s.label,
      dueDate: s.due_date.toISOString(),
      amount: s.amount,
      paidAmount: s.paid_amount,
      status: s.status,
    })),
    payments: payments.map((p) => ({
      id: p.id,
      studentName: `${p.profiles.first_name} ${p.profiles.last_name}`.trim(),
      reference: p.applications.reference,
      amount: p.amount,
      method: p.method,
      provider: p.provider,
      status: p.status,
      createdAt: p.created_at.toISOString(),
      confirmedAt: p.confirmed_at?.toISOString() ?? null,
    })),
    report: {
      byFormation: [...byFormation.values()].sort((a, b) => b.total - a.total),
      byMethod: [...byMethod.values()].sort((a, b) => b.total - a.total),
      byMonth: [...byMonth.values()].sort((a, b) => a.month.localeCompare(b.month)).slice(-6),
    },
  };
}

// ───────────────────────── Corrections (formateurs) ─────────────────────────

export type CorrectionItem = {
  id: string;
  studentName: string;
  quizTitle: string;
  kind: string;
  passScore: number;
  submittedAt: string | null;
  openAnswerCount: number;
};

export async function getCorrectionsQueue(ctx: StudentContext): Promise<CorrectionItem[]> {
  assert(ctx, ["admin", "trainer", "pedagogy", "pastor"]);
  const db = getDb();
  if (!db) return [];
  const scope = await getClassScope(db, ctx);
  if (noClass(scope)) return [];
  const attempts = await db.quiz_attempts.findMany({
    where: { status: "submitted", quizzes: quizWhere(scope), ...(scope.all ? {} : { user_id: { in: await classStudentIds(db, scope) } }) },
    orderBy: { submitted_at: "asc" },
    take: 200,
    include: {
      profiles: { select: { first_name: true, last_name: true } },
      quizzes: { select: { title: true, kind: true, pass_score: true } },
      _count: { select: { answers: true } },
    },
  });
  return attempts.map((a) => ({
    id: a.id,
    studentName: `${a.profiles.first_name} ${a.profiles.last_name}`.trim(),
    quizTitle: a.quizzes.title,
    kind: a.quizzes.kind,
    passScore: a.quizzes.pass_score,
    submittedAt: a.submitted_at?.toISOString() ?? null,
    openAnswerCount: a._count.answers,
  }));
}

export type AttemptReview = {
  id: string;
  studentName: string;
  quizTitle: string;
  passScore: number;
  maxScore: number;
  /** Points déjà attribués automatiquement (QCM, vrai/faux, réponses courtes) — base de la note. */
  autoScore: number;
  answers: { questionId: string; prompt: string; kind: string; points: number; value: unknown; fileName: string | null; isCorrect: boolean | null; awarded: number | null }[];
};

/** Détail d'une copie à corriger (réponses de l'étudiant, jamais les corrigés). */
export async function getAttemptReview(ctx: StudentContext, attemptId: string): Promise<AttemptReview | null> {
  assert(ctx, ["admin", "trainer", "pedagogy", "pastor"]);
  const db = getDb();
  if (!db) return null;
  const scope = await getClassScope(db, ctx);
  if (noClass(scope)) return null;
  const attempt = await db.quiz_attempts.findFirst({
    where: { id: attemptId, status: "submitted", quizzes: quizWhere(scope) },
    include: {
      profiles: { select: { first_name: true, last_name: true } },
      quizzes: { select: { title: true, pass_score: true, questions: { orderBy: { sort_order: "asc" }, select: { id: true, prompt: true, kind: true, points: true } } } },
      answers: true,
      submissions: { orderBy: { created_at: "desc" }, take: 1 },
    },
  });
  if (!attempt) return null;
  const byQ = new Map(attempt.answers.map((a) => [a.question_id, a]));
  const fileName = attempt.submissions[0]?.file_name ?? null;
  const autoScore = attempt.answers.reduce((s, a) => s + (a.points_awarded?.toNumber() ?? 0), 0);
  return {
    id: attempt.id,
    studentName: `${attempt.profiles.first_name} ${attempt.profiles.last_name}`.trim(),
    quizTitle: attempt.quizzes.title,
    passScore: attempt.quizzes.pass_score,
    maxScore: attempt.quizzes.questions.reduce((sum, q) => sum + q.points, 0),
    autoScore,
    answers: attempt.quizzes.questions.map((q) => {
      const ans = byQ.get(q.id);
      return {
        questionId: q.id,
        prompt: q.prompt,
        kind: q.kind,
        points: q.points,
        value: ans?.value ?? null,
        fileName: q.kind === "file" ? fileName : null,
        isCorrect: ans?.is_correct ?? null,
        awarded: ans?.points_awarded?.toNumber() ?? null,
      };
    }),
  };
}

// ───────────────────────── Stages & mémoires (superviseur) ─────────────────────────

export type StageRow = {
  id: string;
  studentName: string;
  formationSlug: string | null;
  place: string;
  supervisorName: string;
  startsOn: string;
  endsOn: string;
  targetHours: number;
  doneHours: number;
  unvalidatedHours: number;
  openSteps: number;
  lastReport: { id: string; version: number; status: string } | null;
};

export type ThesisRow = {
  id: string;
  studentName: string;
  title: string;
  supervisorName: string;
  versionsToReview: number;
  openComments: number;
  defenseStatus: string | null;
};

export async function getStagesOverview(ctx: StudentContext): Promise<{ stages: StageRow[]; theses: ThesisRow[]; candidates: { userId: string; name: string; formationSlug: string }[] }> {
  assert(ctx, ["admin", "supervisor", "pastor"]);
  const db = getDb();
  if (!db) return { stages: [], theses: [], candidates: [] };

  const [stages, theses, admitted, taken] = await Promise.all([
    db.internships.findMany({
      orderBy: { starts_on: "desc" },
      take: 100,
      include: {
        profiles_internships_user_idToprofiles: { select: { first_name: true, last_name: true } },
        internship_steps: { select: { status: true } },
        internship_hours: { select: { hours: true, validated: true } },
        internship_reports: { orderBy: { version: "desc" }, take: 1, select: { id: true, version: true, status: true } },
      },
    }),
    db.theses.findMany({
      orderBy: { created_at: "desc" },
      take: 100,
      include: {
        profiles_theses_user_idToprofiles: { select: { first_name: true, last_name: true } },
        thesis_versions: { select: { status: true } },
        thesis_comments: { where: { status: "open", parent_id: null }, select: { id: true } },
        defense_sessions: { select: { status: true } },
      },
    }),
    // Étudiants admis éligibles à un stage (EDS → département, EDM → Vase d'honneur, diacres → lieu libre).
    db.applications.findMany({
      where: { admission_status: "admitted", formations: { slug: { in: [...STAGE_FORMATIONS] } } },
      orderBy: { created_at: "asc" },
      select: { user_id: true, formations: { select: { slug: true } }, profiles: { select: { first_name: true, last_name: true } } },
    }),
    db.internships.findMany({ select: { user_id: true } }),
  ]);

  const withStage = new Set(taken.map((i) => i.user_id));
  const formationByUser = new Map(admitted.map((a) => [a.user_id, a.formations.slug]));

  return {
    stages: stages.map((s) => ({
      id: s.id,
      studentName: `${s.profiles_internships_user_idToprofiles?.first_name ?? ""} ${s.profiles_internships_user_idToprofiles?.last_name ?? ""}`.trim(),
      formationSlug: formationByUser.get(s.user_id) ?? null,
      place: s.place,
      supervisorName: s.supervisor_name,
      startsOn: s.starts_on.toISOString(),
      endsOn: s.ends_on.toISOString(),
      targetHours: s.target_hours,
      doneHours: s.internship_hours.reduce((sum, h) => sum + Number(h.hours), 0),
      unvalidatedHours: s.internship_hours.filter((h) => !h.validated).length,
      openSteps: s.internship_steps.filter((st) => st.status !== "validated").length,
      lastReport: s.internship_reports[0] ?? null,
    })),
    theses: theses.map((t) => ({
      id: t.id,
      studentName: `${t.profiles_theses_user_idToprofiles?.first_name ?? ""} ${t.profiles_theses_user_idToprofiles?.last_name ?? ""}`.trim(),
      title: t.title,
      supervisorName: t.supervisor_name,
      versionsToReview: t.thesis_versions.filter((v) => v.status === "submitted" || v.status === "in_review").length,
      openComments: t.thesis_comments.length,
      defenseStatus: t.defense_sessions?.status ?? null,
    })),
    candidates: admitted
      .filter((a) => !withStage.has(a.user_id))
      .map((a) => ({
        userId: a.user_id,
        name: `${a.profiles.first_name} ${a.profiles.last_name}`.trim(),
        formationSlug: a.formations.slug,
      })),
  };
}

export type StageDetail = {
  id: string;
  studentName: string;
  steps: { id: string; title: string; status: string; dueOn: string | null; comment: string | null }[];
  hours: { id: string; workedOn: string; hours: number; activity: string; validated: boolean }[];
  reports: { id: string; version: number; status: string; fileName: string | null; supervisorComment: string | null; createdAt: string }[];
};

export async function getStageDetail(ctx: StudentContext, id: string): Promise<StageDetail | null> {
  assert(ctx, ["admin", "supervisor", "pastor"]);
  const db = getDb();
  if (!db) return null;
  const s = await db.internships.findUnique({
    where: { id },
    include: {
      profiles_internships_user_idToprofiles: { select: { first_name: true, last_name: true } },
      internship_steps: { orderBy: { sort_order: "asc" } },
      internship_hours: { orderBy: { worked_on: "desc" } },
      internship_reports: { orderBy: { version: "desc" } },
    },
  });
  if (!s) return null;
  return {
    id: s.id,
    studentName: `${s.profiles_internships_user_idToprofiles?.first_name ?? ""} ${s.profiles_internships_user_idToprofiles?.last_name ?? ""}`.trim(),
    steps: s.internship_steps.map((st) => ({ id: st.id, title: st.title, status: st.status, dueOn: st.due_on?.toISOString() ?? null, comment: st.comment })),
    hours: s.internship_hours.map((h) => ({ id: h.id, workedOn: h.worked_on.toISOString(), hours: Number(h.hours), activity: h.activity, validated: h.validated })),
    reports: s.internship_reports.map((r) => ({
      id: r.id,
      version: r.version,
      status: r.status,
      fileName: r.file_name,
      supervisorComment: r.supervisor_comment,
      createdAt: r.created_at.toISOString(),
    })),
  };
}

export type ThesisDetail = {
  id: string;
  studentName: string;
  title: string;
  versions: { id: string; version: number; fileName: string; status: string; createdAt: string }[];
};

export async function getThesisDetail(ctx: StudentContext, id: string): Promise<ThesisDetail | null> {
  assert(ctx, ["admin", "supervisor", "pastor"]);
  const db = getDb();
  if (!db) return null;
  const t = await db.theses.findUnique({
    where: { id },
    include: {
      profiles_theses_user_idToprofiles: { select: { first_name: true, last_name: true } },
      thesis_versions: { orderBy: { version: "desc" } },
    },
  });
  if (!t) return null;
  return {
    id: t.id,
    studentName: `${t.profiles_theses_user_idToprofiles?.first_name ?? ""} ${t.profiles_theses_user_idToprofiles?.last_name ?? ""}`.trim(),
    title: t.title,
    versions: t.thesis_versions.map((v) => ({ id: v.id, version: v.version, fileName: v.file_name, status: v.status, createdAt: v.created_at.toISOString() })),
  };
}

// ───────────────────────── Diacres — suivi du parcours ─────────────────────────

export type DiacreRow = {
  userId: string;
  name: string;
  email: string;
  reference: string;
  serviceHours: number;
  serviceRecognized: number;
  internship: { id: string; doneHours: number; targetHours: number; openSteps: number; reportStatus: string | null } | null;
  thesis: { id: string; title: string; toReview: number } | null;
  consecration: { id: string; decision: string; decidedAt: string | null } | null;
  evaluationStatus: string | null;
};

export type DiacreDetail = {
  userId: string;
  name: string;
  service: { id: string; activity: string; department: string; servedOn: string; hours: number; recognized: boolean }[];
  evaluations: { id: string; title: string; status: string; scheduledOn: string | null }[];
  internshipId: string | null;
  thesisId: string | null;
  consecrations: { id: string; title: string; decision: string; decidedAt: string | null }[];
};

/** Étudiants admis en formation des diacres : vue consolidée service, stage, mémoire, consécration. */
export async function getDiacresData(ctx: StudentContext): Promise<{ rows: DiacreRow[] }> {
  assert(ctx, ["admin", "supervisor", "pastor"]);
  const db = getDb();
  if (!db) return { rows: [] };

  const apps = await db.applications.findMany({
    where: { admission_status: "admitted", formations: { slug: "diacres" } },
    orderBy: { created_at: "asc" },
    select: { id: true, user_id: true, reference: true, profiles: { select: { first_name: true, last_name: true, email: true } } },
  });
  const userIds = apps.map((a) => a.user_id);
  if (!userIds.length) return { rows: [] };

  const [services, internships, theses, consecrations, evaluations] = await Promise.all([
    db.service_records.findMany({ where: { user_id: { in: userIds } }, select: { user_id: true, hours: true, recognized: true } }),
    db.internships.findMany({
      where: { user_id: { in: userIds } },
      orderBy: { starts_on: "desc" },
      include: {
        internship_steps: { select: { status: true } },
        internship_hours: { select: { hours: true } },
        internship_reports: { orderBy: { version: "desc" }, take: 1, select: { status: true } },
      },
    }),
    db.theses.findMany({
      where: { user_id: { in: userIds } },
      orderBy: { created_at: "desc" },
      include: { thesis_versions: { select: { status: true } } },
    }),
    db.validations.findMany({ where: { user_id: { in: userIds }, kind: "consecration" }, orderBy: { decided_at: "desc" } }),
    db.pastoral_evaluations.findMany({ where: { user_id: { in: userIds } }, orderBy: { scheduled_on: "desc" }, select: { user_id: true, status: true } }),
  ]);

  const latestByUser = <T extends { user_id: string }>(rows: T[]) => {
    const m = new Map<string, T>();
    for (const r of rows) if (!m.has(r.user_id)) m.set(r.user_id, r);
    return m;
  };
  const internshipByUser = latestByUser(internships);
  const thesisByUser = latestByUser(theses);
  const consecrationByUser = latestByUser(consecrations);
  const evalByUser = latestByUser(evaluations);

  return {
    rows: apps.map((a) => {
      const i = internshipByUser.get(a.user_id);
      const t = thesisByUser.get(a.user_id);
      const c = consecrationByUser.get(a.user_id);
      const myService = services.filter((s) => s.user_id === a.user_id);
      return {
        userId: a.user_id,
        name: `${a.profiles.first_name} ${a.profiles.last_name}`.trim() || a.profiles.email,
        email: a.profiles.email,
        reference: a.reference,
        serviceHours: myService.reduce((sum, s) => sum + Number(s.hours), 0),
        serviceRecognized: myService.filter((s) => s.recognized).length,
        internship: i
          ? {
              id: i.id,
              doneHours: i.internship_hours.reduce((sum, h) => sum + Number(h.hours), 0),
              targetHours: i.target_hours,
              openSteps: i.internship_steps.filter((st) => st.status !== "validated").length,
              reportStatus: i.internship_reports[0]?.status ?? null,
            }
          : null,
        thesis: t ? { id: t.id, title: t.title, toReview: t.thesis_versions.filter((v) => v.status === "submitted" || v.status === "in_review").length } : null,
        consecration: c ? { id: c.id, decision: c.decision, decidedAt: c.decided_at?.toISOString() ?? null } : null,
        evaluationStatus: evalByUser.get(a.user_id)?.status ?? null,
      };
    }),
  };
}

/** Fiche consolidée d'un étudiant diacre — refuse si l'étudiant n'est pas admis en diacres. */
export async function getDiacreDetail(ctx: StudentContext, userId: string): Promise<DiacreDetail | null> {
  assert(ctx, ["admin", "supervisor", "pastor"]);
  const db = getDb();
  if (!db) return null;
  const app = await db.applications.findFirst({
    where: { user_id: userId, admission_status: "admitted", formations: { slug: "diacres" } },
    select: { profiles: { select: { first_name: true, last_name: true, email: true } } },
  });
  if (!app) return null;

  const [service, evaluations, internship, thesis, consecrations] = await Promise.all([
    db.service_records.findMany({ where: { user_id: userId }, orderBy: { served_on: "desc" }, take: 50 }),
    db.pastoral_evaluations.findMany({ where: { user_id: userId }, orderBy: { scheduled_on: "desc" }, take: 20 }),
    db.internships.findFirst({ where: { user_id: userId }, orderBy: { starts_on: "desc" }, select: { id: true } }),
    db.theses.findFirst({ where: { user_id: userId }, orderBy: { created_at: "desc" }, select: { id: true } }),
    db.validations.findMany({ where: { user_id: userId, kind: "consecration" }, orderBy: { decided_at: "desc" }, take: 10 }),
  ]);

  return {
    userId,
    name: `${app.profiles.first_name} ${app.profiles.last_name}`.trim() || app.profiles.email,
    service: service.map((s) => ({ id: s.id, activity: s.activity, department: s.department, servedOn: s.served_on.toISOString(), hours: Number(s.hours), recognized: s.recognized })),
    evaluations: evaluations.map((e) => ({ id: e.id, title: e.title, status: e.status, scheduledOn: e.scheduled_on?.toISOString() ?? null })),
    internshipId: internship?.id ?? null,
    thesisId: thesis?.id ?? null,
    consecrations: consecrations.map((v) => ({ id: v.id, title: v.title, decision: v.decision, decidedAt: v.decided_at?.toISOString() ?? null })),
  };
}

// ───────────────────────── Étudiants EDM — fiches hebdomadaires ─────────────────────────

export type EdmReport = {
  id: string;
  weekStart: string;
  prayerDays: number;
  prayerHours: string;
  mentoreePrayerTime: string;
  methodSimple: number;
  methodOia: number;
  methodTheme: number;
  sermonsCount: number;
  characterTrait: string;
  titheGiven: boolean;
  soulWon: boolean;
  soulWonDetail: string;
  invited: boolean;
  invitedDetail: string;
  departmentsReport: string;
  mentoreesReport: string;
  status: string;
  observation: string | null;
  submittedAt: string;
};

export type EdmRow = {
  userId: string;
  name: string;
  reference: string;
  currentWeek: { id: string; status: string } | null;
  lastWeek: { weekStart: string; status: string } | null;
  reportsCount: number;
  toValidate: number;
};

const reportSelect = {
  id: true, user_id: true, week_start: true, prayer_days: true, prayer_hours: true, mentoree_prayer_time: true,
  method_simple: true, method_oia: true, method_theme: true, sermons_count: true, character_trait: true,
  tithe_given: true, soul_won: true, soul_won_detail: true, invited: true, invited_detail: true,
  departments_report: true, mentorees_report: true, status: true, observation: true, created_at: true,
} as const;

const toEdmReport = (r: {
  id: string; week_start: Date; prayer_days: number; prayer_hours: string; mentoree_prayer_time: string;
  method_simple: number; method_oia: number; method_theme: number; sermons_count: number; character_trait: string;
  tithe_given: boolean; soul_won: boolean; soul_won_detail: string; invited: boolean; invited_detail: string;
  departments_report: string; mentorees_report: string; status: string; observation: string | null; created_at: Date;
}): EdmReport => ({
  id: r.id,
  weekStart: r.week_start.toISOString().slice(0, 10),
  prayerDays: r.prayer_days,
  prayerHours: r.prayer_hours,
  mentoreePrayerTime: r.mentoree_prayer_time,
  methodSimple: r.method_simple,
  methodOia: r.method_oia,
  methodTheme: r.method_theme,
  sermonsCount: r.sermons_count,
  characterTrait: r.character_trait,
  titheGiven: r.tithe_given,
  soulWon: r.soul_won,
  soulWonDetail: r.soul_won_detail,
  invited: r.invited,
  invitedDetail: r.invited_detail,
  departmentsReport: r.departments_report,
  mentoreesReport: r.mentorees_report,
  status: r.status,
  observation: r.observation,
  submittedAt: r.created_at.toISOString(),
});

/** Liste des étudiants EDM admis avec l'état de leur fiche de la semaine en cours. */
export async function getEdmData(ctx: StudentContext): Promise<{ rows: EdmRow[] }> {
  assert(ctx, ["admin", "pastor"]);
  const db = getDb();
  if (!db) return { rows: [] };
  const formation = await db.formations.findFirst({ where: { slug: "edm" }, select: { id: true } });
  if (!formation) return { rows: [] };
  const apps = await db.applications.findMany({
    where: { admission_status: "admitted", formation_id: formation.id },
    orderBy: { created_at: "asc" },
    select: { user_id: true, reference: true, profiles: { select: { first_name: true, last_name: true, email: true } } },
  });
  if (!apps.length) return { rows: [] };

  const reports = await db.edm_weekly_reports.findMany({
    where: { user_id: { in: apps.map((a) => a.user_id) } },
    orderBy: { week_start: "desc" },
    select: { id: true, user_id: true, week_start: true, status: true },
  });
  const weekStart = weeklyReportWindow().weekStart;
  const byUser = new Map<string, { id: string; week_start: Date; status: string }[]>();
  for (const r of reports) (byUser.get(r.user_id) ?? byUser.set(r.user_id, []).get(r.user_id)!).push(r);

  return {
    rows: apps.map((a) => {
      const mine = byUser.get(a.user_id) ?? [];
      const current = mine.find((r) => r.week_start.toISOString().slice(0, 10) === weekStart) ?? null;
      return {
        userId: a.user_id,
        name: `${a.profiles.first_name} ${a.profiles.last_name}`.trim() || a.profiles.email,
        reference: a.reference,
        currentWeek: current ? { id: current.id, status: current.status } : null,
        lastWeek: mine[0] ? { weekStart: mine[0].week_start.toISOString().slice(0, 10), status: mine[0].status } : null,
        reportsCount: mine.length,
        toValidate: mine.filter((r) => r.status === "submitted").length,
      };
    }),
  };
}

/** Fiches hebdomadaires d'un étudiant EDM — refuse si l'étudiant n'est pas admis en EDM. */
export async function getEdmStudentReports(ctx: StudentContext, userId: string): Promise<{ name: string; reports: EdmReport[] } | null> {
  assert(ctx, ["admin", "pastor"]);
  const db = getDb();
  if (!db) return null;
  const app = await db.applications.findFirst({
    where: { user_id: userId, admission_status: "admitted", formations: { slug: "edm" } },
    select: { profiles: { select: { first_name: true, last_name: true, email: true } } },
  });
  if (!app) return null;
  const reports = await db.edm_weekly_reports.findMany({ where: { user_id: userId }, orderBy: { week_start: "desc" }, take: 52, select: reportSelect });
  return {
    name: `${app.profiles.first_name} ${app.profiles.last_name}`.trim() || app.profiles.email,
    reports: reports.map(toEdmReport),
  };
}

// ───────────────────────── Équipe pastorale ─────────────────────────

export type PastoraleData = {
  evaluations: { id: string; studentName: string; title: string; status: string; evaluatorName: string | null; scheduledOn: string | null; feedback: string | null }[];
  decisions: { id: string; studentName: string | null; kind: string; title: string; decision: string; decidedAt: string | null }[];
  assignments: { id: string; studentName: string; role: string; place: string; supervisorName: string; startsOn: string; endsOn: string | null; status: string }[];
  students: { userId: string; name: string; formationSlug: string }[];
  edm: { userId: string; name: string; mentoring: { submitted: number; validated: number }; leadership: { submitted: number; validated: number } }[];
};

export async function getPastoraleData(ctx: StudentContext): Promise<PastoraleData> {
  assert(ctx, ["admin", "pastor"]);
  const db = getDb();
  const empty: PastoraleData = { evaluations: [], decisions: [], assignments: [], students: [], edm: [] };
  if (!db) return empty;
  const [evaluations, decisions, assignments, admitted, edmFormation] = await Promise.all([
    db.pastoral_evaluations.findMany({
      orderBy: [{ scheduled_on: "asc" }],
      take: 200,
      include: { profiles: { select: { first_name: true, last_name: true } } },
    }),
    db.validations.findMany({
      where: { kind: { in: ["consecration", "defense"] } },
      orderBy: { created_at: "desc" },
      take: 100,
      include: { profiles: { select: { first_name: true, last_name: true } } },
    }),
    db.responsibilities.findMany({
      orderBy: { starts_on: "desc" },
      take: 100,
      include: { profiles: { select: { first_name: true, last_name: true } } },
    }),
    db.applications.findMany({
      where: { admission_status: "admitted" },
      orderBy: { created_at: "asc" },
      select: { user_id: true, formation_id: true, profiles: { select: { first_name: true, last_name: true } }, formations: { select: { slug: true } } },
    }),
    db.formations.findFirst({ where: { slug: "edm" }, select: { id: true } }),
  ]);

  const edmUserIds = edmFormation ? admitted.filter((a) => a.formation_id === edmFormation.id).map((a) => a.user_id) : [];
  const [mentoring, leadership] = edmUserIds.length
    ? await Promise.all([
        db.mentoring_exercises.findMany({ where: { user_id: { in: edmUserIds } }, select: { user_id: true, status: true } }),
        db.leadership_works.findMany({ where: { user_id: { in: edmUserIds } }, select: { user_id: true, status: true } }),
      ])
    : [[], []];
  const countBy = (rows: { user_id: string; status: string }[], userId: string, status: string) => rows.filter((r) => r.user_id === userId && r.status === status).length;

  return {
    evaluations: evaluations.map((e) => ({
      id: e.id,
      studentName: `${e.profiles.first_name} ${e.profiles.last_name}`.trim(),
      title: e.title,
      status: e.status,
      evaluatorName: e.evaluator_name,
      scheduledOn: e.scheduled_on?.toISOString() ?? null,
      feedback: e.feedback,
    })),
    decisions: decisions.map((v) => ({
      id: v.id,
      studentName: v.profiles ? `${v.profiles.first_name} ${v.profiles.last_name}`.trim() : null,
      kind: v.kind,
      title: v.title,
      decision: v.decision,
      decidedAt: v.decided_at?.toISOString() ?? null,
    })),
    assignments: assignments.map((r) => ({
      id: r.id,
      studentName: `${r.profiles.first_name} ${r.profiles.last_name}`.trim(),
      role: r.role,
      place: r.place,
      supervisorName: r.supervisor_name,
      startsOn: r.starts_on.toISOString(),
      endsOn: r.ends_on?.toISOString() ?? null,
      status: r.status,
    })),
    students: admitted.map((a) => ({
      userId: a.user_id,
      name: `${a.profiles.first_name} ${a.profiles.last_name}`.trim(),
      formationSlug: a.formations.slug,
    })),
    edm: admitted
      .filter((a) => edmFormation && a.formation_id === edmFormation.id)
      .map((a) => ({
        userId: a.user_id,
        name: `${a.profiles.first_name} ${a.profiles.last_name}`.trim(),
        mentoring: { submitted: countBy(mentoring, a.user_id, "submitted") + countBy(mentoring, a.user_id, "to_revise"), validated: countBy(mentoring, a.user_id, "validated") },
        leadership: { submitted: countBy(leadership, a.user_id, "submitted") + countBy(leadership, a.user_id, "to_revise"), validated: countBy(leadership, a.user_id, "validated") },
      })),
  };
}

// ───────────────────────── Pédagogie ─────────────────────────

export type PedagogyFormation = {
  slug: string;
  name: string;
  levels: number;
  modules: number;
  lessons: number;
  quizzes: number;
  students: number;
  submittedAttempts: number;
};

export async function getPedagogyOverview(ctx: StudentContext): Promise<PedagogyFormation[]> {
  assert(ctx, ["admin", "pedagogy", "trainer", "pastor"]);
  const db = getDb();
  if (!db) return [];
  const scope = await getClassScope(db, ctx);
  if (noClass(scope)) return [];
  const [formations, members, info] = await Promise.all([
    db.formations.findMany({
      where: scope.all ? {} : { id: { in: scope.units.map((u) => u.formationId) } },
      orderBy: { sort_order: "asc" },
      include: {
        levels: { where: scope.all ? {} : { OR: scope.units.map((u) => (u.levelId ? { id: u.levelId } : { formation_id: u.formationId })) }, select: { id: true } },
        modules: { where: moduleWhere(scope), select: { id: true, _count: { select: { lessons: true } } } },
        quizzes: { where: quizWhere(scope), select: { id: true } },
      },
    }),
    classMembers(db, scope),
    describeClass(db, scope),
  ]);
  const submitted = await db.quiz_attempts.groupBy({
    by: ["quiz_id"],
    where: { status: "submitted", ...(scope.all ? {} : { user_id: { in: members.map((m) => m.userId) } }) },
    _count: true,
  });
  const quizFormation = new Map(formations.flatMap((f) => f.quizzes.map((q) => [q.id, f.id])));
  const submittedByFormation = new Map<string, number>();
  for (const row of submitted) {
    const fid = quizFormation.get(row.quiz_id);
    if (fid) submittedByFormation.set(fid, (submittedByFormation.get(fid) ?? 0) + row._count);
  }
  return formations.map((f) => ({
    slug: f.slug,
    name: info ? `${f.name} — ${info.label}` : f.name,
    levels: f.levels.length,
    modules: f.modules.length,
    lessons: f.modules.reduce((sum, m) => sum + m._count.lessons, 0),
    quizzes: f.quizzes.length,
    students: members.filter((m) => m.formationId === f.id).length,
    submittedAttempts: submittedByFormation.get(f.id) ?? 0,
  }));
}

// ───────────────────────── Accès & rôles ─────────────────────────

export type UserRoleRow = { id: string; name: string; email: string; roles: string[] };

export async function searchUsers(ctx: StudentContext, q?: string): Promise<UserRoleRow[]> {
  assert(ctx, ["admin"]);
  const db = getDb();
  if (!db) return [];
  const profiles = await db.profiles.findMany({
    where: q
      ? {
          OR: [
            { email: { contains: q, mode: "insensitive" } },
            { first_name: { contains: q, mode: "insensitive" } },
            { last_name: { contains: q, mode: "insensitive" } },
          ],
        }
      : { users: { is: { user_roles: { some: {} } } } },
    orderBy: { created_at: "desc" },
    take: 50,
    include: { users: { select: { user_roles: { select: { role: true } } } } },
  });
  return profiles.map((p) => ({
    id: p.id,
    name: `${p.first_name} ${p.last_name}`.trim() || p.email,
    email: p.email,
    roles: (p.users?.user_roles ?? []).map((r) => r.role),
  }));
}

/** Une classe possible : formation + niveau (null pour une formation sans niveaux). */
export type ClassOption = { formationId: string; levelId: string | null; label: string };
export type TrainerAssignment = { trainerId: string; formationId: string; levelId: string | null; label: string };

/** Affectations (une classe par formateur) et classes disponibles, pour la page Accès. */
export async function getTrainerAssignments(ctx: StudentContext): Promise<{ assignments: TrainerAssignment[]; classes: ClassOption[] }> {
  assert(ctx, ["admin"]);
  const db = getDb();
  const empty = { assignments: [], classes: [] };
  if (!db) return empty;
  const [rows, formations] = await Promise.all([
    db.trainer_assignments.findMany({ include: { formations: { select: { slug: true } }, levels: { select: { number: true } } } }),
    db.formations.findMany({
      orderBy: { sort_order: "asc" },
      select: { id: true, slug: true, levels: { orderBy: { number: "asc" }, select: { id: true, number: true, title: true } } },
    }),
  ]);
  const classes = formations.flatMap((f): ClassOption[] =>
    f.levels.length
      ? f.levels.map((l) => ({ formationId: f.id, levelId: l.id, label: `${f.slug.toUpperCase()} · ${l.title}` }))
      : [{ formationId: f.id, levelId: null, label: f.slug.toUpperCase() }],
  );
  return {
    assignments: rows.map((r) => ({
      trainerId: r.trainer_id,
      formationId: r.formation_id,
      levelId: r.level_id,
      label: `${r.formations.slug.toUpperCase()}${r.levels ? ` · Niveau ${r.levels.number}` : ""}`,
    })),
    classes,
  };
}

// ───────────────────────── Ma classe (formateur) ─────────────────────────

/** Formations gérables par l'utilisateur, avec le libellé de classe (ex. « EDS · Niveau 2 »). */
export type FormationOption = { id: string; slug: string; name: string; levelId: string | null; label: string };

/** Formations gérables : la classe unique du formateur, toutes les formations pour admin/pedagogy. */
export async function getClassFormations(ctx: StudentContext): Promise<FormationOption[]> {
  assert(ctx, ["admin", "trainer", "pedagogy", "pastor"]);
  const db = getDb();
  if (!db) return [];
  const scope = await getClassScope(db, ctx);
  if (noClass(scope)) return [];
  if (!scope.all) {
    const infos = await describeUnits(db, scope);
    return infos.map((i) => ({ id: i.formationId, slug: i.slug, name: i.name, levelId: i.levelId, label: i.label }));
  }
  const formations = await db.formations.findMany({ orderBy: { sort_order: "asc" }, select: { id: true, slug: true, name: true } });
  return formations.map((f) => ({ ...f, levelId: null, label: f.slug.toUpperCase() }));
}

export type ProgramLevel = { id: string; formationId: string; number: number; title: string };

/** Niveaux de toutes les formations — alimente le formulaire de création de module. */
export async function getProgramLevels(ctx: StudentContext): Promise<ProgramLevel[]> {
  assert(ctx, ["admin", "trainer", "pedagogy", "pastor"]);
  const db = getDb();
  if (!db) return [];
  const rows = await db.levels.findMany({ orderBy: [{ formation_id: "asc" }, { number: "asc" }], select: { id: true, formation_id: true, number: true, title: true } });
  return rows.map((l) => ({ id: l.id, formationId: l.formation_id, number: l.number, title: l.title }));
}

export type ClassStudentRow = {
  userId: string;
  name: string;
  email: string;
  formationSlug: string;
  formationName: string;
  levelLabel: string | null;
  lessonsDone: number;
  lessonsTotal: number;
  avgScore: number | null;
  pendingCopies: number;
};

/** Étudiants de la classe (formation + niveau en cours), avec progression du niveau et copies à corriger. */
export async function getClassRoster(ctx: StudentContext): Promise<ClassStudentRow[]> {
  assert(ctx, ["admin", "trainer", "pedagogy", "pastor"]);
  const db = getDb();
  if (!db) return [];
  const scope = await getClassScope(db, ctx);
  const members = await classMembers(db, scope);
  if (!members.length) return [];
  const userIds = members.map((m) => m.userId);

  const [profiles, formations, levels, modules, progress, attempts] = await Promise.all([
    db.profiles.findMany({ where: { id: { in: userIds } }, select: { id: true, first_name: true, last_name: true, email: true } }),
    db.formations.findMany({ where: { id: { in: [...new Set(members.map((m) => m.formationId))] } }, select: { id: true, slug: true, name: true } }),
    db.levels.findMany({ where: { id: { in: members.flatMap((m) => (m.levelId ? [m.levelId] : [])) } }, select: { id: true, number: true } }),
    db.modules.findMany({ where: { formation_id: { in: members.map((m) => m.formationId) } }, select: { formation_id: true, level_id: true, _count: { select: { lessons: true } } } }),
    db.lesson_progress.findMany({
      where: { user_id: { in: userIds }, completed_at: { not: null } },
      select: { user_id: true, lessons: { select: { modules: { select: { formation_id: true, level_id: true } } } } },
    }),
    db.quiz_attempts.findMany({
      where: { user_id: { in: userIds }, quizzes: quizWhere(scope) },
      select: { user_id: true, status: true, score: true, max_score: true },
    }),
  ]);

  const profileById = new Map(profiles.map((p) => [p.id, p]));
  const formationById = new Map(formations.map((f) => [f.id, f]));
  const levelNumber = new Map(levels.map((l) => [l.id, l.number]));
  // Progression mesurée sur le niveau en cours de l'étudiant (toute la formation si elle n'a pas de niveaux).
  const sameLevel = (m: { formation_id: string; level_id: string | null }, member: ClassMember) =>
    m.formation_id === member.formationId && (!member.levelId || m.level_id === member.levelId);
  const attemptsByUser = new Map<string, { graded: { ratio: number }[]; pending: number }>();
  for (const a of attempts) {
    const entry = attemptsByUser.get(a.user_id) ?? { graded: [], pending: 0 };
    if (a.status === "submitted") entry.pending += 1;
    else if (a.status === "graded" && a.score != null && a.max_score) entry.graded.push({ ratio: a.score.toNumber() / a.max_score.toNumber() });
    attemptsByUser.set(a.user_id, entry);
  }

  return members.flatMap((member) => {
    const p = profileById.get(member.userId);
    const f = formationById.get(member.formationId);
    if (!p || !f) return [];
    const t = attemptsByUser.get(member.userId);
    const avg = t?.graded.length ? Math.round((t.graded.reduce((s, g) => s + g.ratio, 0) / t.graded.length) * 100) : null;
    const n = member.levelId ? levelNumber.get(member.levelId) : undefined;
    return [
      {
        userId: member.userId,
        name: `${p.first_name} ${p.last_name}`.trim() || p.email,
        email: p.email,
        formationSlug: f.slug,
        formationName: f.name,
        levelLabel: n ? `Niveau ${n}` : null,
        lessonsDone: progress.filter((x) => x.user_id === member.userId && sameLevel(x.lessons.modules, member)).length,
        lessonsTotal: modules.filter((m) => sameLevel(m, member)).reduce((s, m) => s + m._count.lessons, 0),
        avgScore: avg,
        pendingCopies: t?.pending ?? 0,
      },
    ];
  });
}

export type ClassAssessmentRow = {
  id: string;
  title: string;
  kind: string;
  formationSlug: string;
  moduleTitle: string | null;
  levelLabel: string | null;
  dueAt: string | null;
  questionsCount: number;
  attemptsTotal: number;
  pendingCopies: number;
};

/** Évaluations (quiz, devoirs, examens) des formations du formateur. */
export async function getClassAssessments(ctx: StudentContext): Promise<ClassAssessmentRow[]> {
  assert(ctx, ["admin", "trainer", "pedagogy", "pastor"]);
  const db = getDb();
  if (!db) return [];
  const scope = await getClassScope(db, ctx);
  if (noClass(scope)) return [];
  const quizzes = await db.quizzes.findMany({
    where: quizWhere(scope),
    orderBy: [{ due_at: "asc" }, { created_at: "desc" }],
    include: {
      formations: { select: { slug: true } },
      modules: { select: { title: true } },
      levels: { select: { number: true } },
      _count: { select: { questions: true, quiz_attempts: true } },
    },
  });
  const pending = await db.quiz_attempts.groupBy({
    by: ["quiz_id"],
    where: { status: "submitted", quiz_id: { in: quizzes.map((q) => q.id) } },
    _count: true,
  });
  const pendingByQuiz = new Map(pending.map((p) => [p.quiz_id, p._count]));
  return quizzes.map((q) => ({
    id: q.id,
    title: q.title,
    kind: q.kind,
    formationSlug: q.formations.slug,
    moduleTitle: q.modules?.title ?? null,
    levelLabel: q.levels ? `Niveau ${q.levels.number}` : null,
    dueAt: q.due_at?.toISOString() ?? null,
    questionsCount: q._count.questions,
    attemptsTotal: q._count.quiz_attempts,
    pendingCopies: pendingByQuiz.get(q.id) ?? 0,
  }));
}

export type ClassModuleOption = { id: string; title: string; formationSlug: string; levelLabel: string | null };

/** Modules dans lesquels le formateur peut ajouter des leçons, vidéos et documents. */
export async function getClassModules(ctx: StudentContext): Promise<ClassModuleOption[]> {
  assert(ctx, ["admin", "trainer", "pedagogy", "pastor"]);
  const db = getDb();
  if (!db) return [];
  const scope = await getClassScope(db, ctx);
  if (noClass(scope)) return [];
  const modules = await db.modules.findMany({
    where: moduleWhere(scope),
    orderBy: [{ formation_id: "asc" }, { sort_order: "asc" }],
    include: { formations: { select: { slug: true } }, levels: { select: { number: true } } },
  });
  return modules.map((m) => ({
    id: m.id,
    title: m.title,
    formationSlug: m.formations.slug,
    levelLabel: m.levels ? `Niveau ${m.levels.number}` : null,
  }));
}

export type ClassStudentDetail = {
  userId: string;
  name: string;
  email: string;
  phone: string | null;
  formationSlug: string;
  formationName: string;
  levelLabel: string | null;
  reference: string;
  lessonsDone: number;
  lessonsTotal: number;
  avgScore: number | null;
  attempts: { id: string; quizTitle: string; kind: string; status: string; score: number | null; maxScore: number | null; submittedAt: string | null }[];
  submissions: { id: string; quizTitle: string; fileName: string; status: string; createdAt: string }[];
};

/** Fiche d'un étudiant de la classe — refusée s'il n'est pas admis dans une formation du formateur. */
export async function getClassStudentDetail(ctx: StudentContext, userId: string): Promise<ClassStudentDetail | null> {
  assert(ctx, ["admin", "trainer", "pedagogy", "pastor"]);
  const db = getDb();
  if (!db) return null;
  const scope = await getClassScope(db, ctx);
  const member = (await classMembers(db, scope)).find((m) => m.userId === userId);
  if (!member) return null;

  const application = await db.applications.findUnique({
    where: { id: member.applicationId },
    include: {
      profiles: { select: { first_name: true, last_name: true, email: true, phone: true } },
      formations: { select: { slug: true, name: true } },
    },
  });
  if (!application) return null;
  const levelScope = { formation_id: application.formation_id, ...(member.levelId ? { level_id: member.levelId } : {}) };

  const [level, modules, lessonsDone, attempts, submissions] = await Promise.all([
    member.levelId ? db.levels.findUnique({ where: { id: member.levelId }, select: { number: true } }) : null,
    db.modules.findMany({ where: levelScope, select: { _count: { select: { lessons: true } } } }),
    db.lesson_progress.count({ where: { user_id: userId, completed_at: { not: null }, lessons: { modules: levelScope } } }),
    db.quiz_attempts.findMany({
      where: { user_id: userId, quizzes: { formation_id: application.formation_id } },
      orderBy: { started_at: "desc" },
      include: { quizzes: { select: { title: true, kind: true } } },
    }),
    db.submissions.findMany({
      where: { user_id: userId, quizzes: { formation_id: application.formation_id } },
      orderBy: { created_at: "desc" },
      include: { quizzes: { select: { title: true } } },
    }),
  ]);

  const graded = attempts.filter((a) => a.status === "graded" && a.score != null && a.max_score);
  const avg = graded.length ? Math.round((graded.reduce((s, a) => s + a.score!.toNumber() / a.max_score!.toNumber(), 0) / graded.length) * 100) : null;

  return {
    userId,
    name: `${application.profiles.first_name} ${application.profiles.last_name}`.trim() || application.profiles.email,
    email: application.profiles.email,
    phone: application.profiles.phone,
    formationSlug: application.formations.slug,
    formationName: application.formations.name,
    levelLabel: level ? `Niveau ${level.number}` : null,
    reference: application.reference,
    lessonsDone: lessonsDone,
    lessonsTotal: modules.reduce((s, m) => s + m._count.lessons, 0),
    avgScore: avg,
    attempts: attempts.map((a) => ({
      id: a.id,
      quizTitle: a.quizzes.title,
      kind: a.quizzes.kind,
      status: a.status,
      score: a.score?.toNumber() ?? null,
      maxScore: a.max_score?.toNumber() ?? null,
      submittedAt: a.submitted_at?.toISOString() ?? null,
    })),
    submissions: submissions.map((s) => ({
      id: s.id,
      quizTitle: s.quizzes.title,
      fileName: s.file_name,
      status: s.status,
      createdAt: s.created_at.toISOString(),
    })),
  };
}

// ───────────────────────── Messagerie formateur ↔ étudiants ─────────────────────────

export type ClassThreadRow = {
  id: string;
  studentId: string;
  studentName: string;
  subject: string;
  lastMessage: string | null;
  updatedAt: string;
  unread: number;
};

/** Fils de discussion des étudiants de la classe (canal « Formateurs » côté étudiant). */
export async function getClassThreads(ctx: StudentContext): Promise<ClassThreadRow[]> {
  assert(ctx, ["admin", "trainer", "pedagogy", "pastor"]);
  const db = getDb();
  if (!db) return [];
  const studentIds = await classStudentIds(db, await getClassScope(db, ctx));
  if (!studentIds.length) return [];

  const threads = await db.message_threads.findMany({
    where: { student_id: { in: studentIds }, category: "trainer" },
    orderBy: { updated_at: "desc" },
    take: 50,
    include: {
      profiles_message_threads_student_idToprofiles: { select: { first_name: true, last_name: true, email: true } },
      messages: { orderBy: { created_at: "desc" }, take: 1, select: { body: true } },
    },
  });
  const unread = await db.messages.groupBy({
    by: ["thread_id"],
    where: { thread_id: { in: threads.map((t) => t.id) }, read_at: null, author_id: { not: ctx.userId } },
    _count: true,
  });
  const unreadByThread = new Map(unread.map((u) => [u.thread_id, u._count]));

  return threads.map((t) => {
    const p = t.profiles_message_threads_student_idToprofiles;
    return {
      id: t.id,
      studentId: t.student_id,
      studentName: `${p.first_name} ${p.last_name}`.trim() || p.email,
      subject: t.subject,
      lastMessage: t.messages[0]?.body ?? null,
      updatedAt: t.updated_at.toISOString(),
      unread: unreadByThread.get(t.id) ?? 0,
    };
  });
}

export type ClassScheduleRow = {
  id: string;
  title: string;
  formationSlug: string;
  moduleTitle: string | null;
  startsAt: string;
  endsAt: string | null;
  zoomUrl: string | null;
};

export type ClassSchedule = {
  sessions: ClassScheduleRow[];
  events: ClassScheduleRow[];
  announcements: { id: string; title: string; body: string; pinned: boolean; formationSlug: string | null; publishedAt: string }[];
};

/** Planning pédagogique de la classe : séances en direct, événements du calendrier, annonces — tout remonte côté étudiant. */
export async function getClassSchedule(ctx: StudentContext): Promise<ClassSchedule> {
  assert(ctx, ["admin", "trainer", "pedagogy", "pastor"]);
  const empty: ClassSchedule = { sessions: [], events: [], announcements: [] };
  const db = getDb();
  if (!db) return empty;
  const classScope = await getClassScope(db, ctx);
  if (noClass(classScope)) return empty;
  const scope = plannedWhere(classScope);
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000);

  const [sessions, events, announcements] = await Promise.all([
    db.live_sessions.findMany({
      where: { ...scope, starts_at: { gte: since } },
      orderBy: { starts_at: "asc" },
      take: 30,
      include: { formations: { select: { slug: true } }, modules: { select: { title: true } } },
    }),
    db.calendar_events.findMany({
      where: { ...scope, starts_at: { gte: since } },
      orderBy: { starts_at: "asc" },
      take: 30,
      include: { formations: { select: { slug: true } } },
    }),
    db.announcements.findMany({
      where: scope,
      orderBy: { published_at: "desc" },
      take: 20,
      include: { formations: { select: { slug: true } } },
    }),
  ]);

  return {
    sessions: sessions.map((s) => ({
      id: s.id,
      title: s.title,
      formationSlug: s.formations.slug,
      moduleTitle: s.modules?.title ?? null,
      startsAt: s.starts_at.toISOString(),
      endsAt: new Date(s.starts_at.getTime() + s.duration_minutes * 60_000).toISOString(),
      zoomUrl: s.zoom_url,
    })),
    events: events.map((e) => ({
      id: e.id,
      title: e.title,
      formationSlug: e.formations?.slug ?? "",
      moduleTitle: null,
      startsAt: e.starts_at.toISOString(),
      endsAt: e.ends_at?.toISOString() ?? null,
      zoomUrl: e.zoom_url,
    })),
    announcements: announcements.map((a) => ({
      id: a.id,
      title: a.title,
      body: a.body,
      pinned: a.pinned,
      formationSlug: a.formations?.slug ?? null,
      publishedAt: a.published_at.toISOString(),
    })),
  };
}

export type ClassThreadDetail = {
  id: string;
  subject: string;
  studentName: string;
  messages: { id: string; mine: boolean; authorName: string; body: string; attachmentName: string | null; createdAt: string }[];
};

/** Fil complet — réservé aux étudiants de la classe du formateur. */
export async function getClassThread(ctx: StudentContext, threadId: string): Promise<ClassThreadDetail | null> {
  assert(ctx, ["admin", "trainer", "pedagogy", "pastor"]);
  const db = getDb();
  if (!db) return null;
  const studentIds = await classStudentIds(db, await getClassScope(db, ctx));

  const t = await db.message_threads.findFirst({
    where: { id: threadId, student_id: { in: studentIds }, category: "trainer" },
    include: {
      profiles_message_threads_student_idToprofiles: { select: { first_name: true, last_name: true, email: true } },
      messages: { orderBy: { created_at: "asc" } },
    },
  });
  if (!t) return null;
  const p = t.profiles_message_threads_student_idToprofiles;
  return {
    id: t.id,
    subject: t.subject,
    studentName: `${p.first_name} ${p.last_name}`.trim() || p.email,
    messages: t.messages.map((m) => ({
      id: m.id,
      mine: m.author_id === ctx.userId,
      authorName: m.author_name,
      body: m.body,
      attachmentName: m.attachment_name,
      createdAt: m.created_at.toISOString(),
    })),
  };
}

// ───────────────────────── Assistance (messages Administratif + tickets) ─────────────────────────

export type AdminThreadSummary = {
  id: string;
  subject: string;
  studentName: string;
  formationSlug: string;
  updatedAt: string;
  lastMessage: string | null;
  unread: number;
};

/** Fils « Administratif » des étudiants — canal géré par l'administration et les admissions. */
export async function getAdminThreads(ctx: StudentContext): Promise<AdminThreadSummary[]> {
  assert(ctx, ["admin", "admissions"]);
  const db = getDb();
  if (!db) return [];
  const rows = await db.message_threads.findMany({
    where: { category: "administrative" },
    orderBy: { updated_at: "desc" },
    take: 50,
    include: {
      profiles_message_threads_student_idToprofiles: {
        select: {
          first_name: true,
          last_name: true,
          email: true,
          applications: { select: { formations: { select: { slug: true } } }, take: 1, orderBy: { created_at: "desc" } },
        },
      },
      messages: { orderBy: { created_at: "desc" }, select: { body: true, read_at: true, author_id: true } },
    },
  });
  return rows.map((t) => {
    const p = t.profiles_message_threads_student_idToprofiles;
    return {
      id: t.id,
      subject: t.subject,
      studentName: `${p.first_name} ${p.last_name}`.trim() || p.email,
      formationSlug: p.applications[0]?.formations.slug ?? "",
      updatedAt: t.updated_at.toISOString(),
      lastMessage: t.messages[0]?.body ?? null,
      unread: t.messages.filter((m) => m.read_at === null && m.author_id === t.student_id).length,
    };
  });
}

/** Fil Administratif complet — réservé à l'administration et aux admissions. */
export async function getAdminThread(ctx: StudentContext, threadId: string): Promise<ClassThreadDetail | null> {
  assert(ctx, ["admin", "admissions"]);
  const db = getDb();
  if (!db) return null;
  const t = await db.message_threads.findFirst({
    where: { id: threadId, category: "administrative" },
    include: {
      profiles_message_threads_student_idToprofiles: { select: { first_name: true, last_name: true, email: true } },
      messages: { orderBy: { created_at: "asc" } },
    },
  });
  if (!t) return null;
  const p = t.profiles_message_threads_student_idToprofiles;
  return {
    id: t.id,
    subject: t.subject,
    studentName: `${p.first_name} ${p.last_name}`.trim() || p.email,
    messages: t.messages.map((m) => ({
      id: m.id,
      mine: m.author_id === ctx.userId,
      authorName: m.author_name,
      body: m.body,
      attachmentName: m.attachment_name,
      createdAt: m.created_at.toISOString(),
    })),
  };
}

export type SupportTicketRow = {
  id: string;
  studentName: string;
  email: string;
  category: string;
  subject: string;
  description: string;
  status: string;
  resolution: string | null;
  createdAt: string;
};

/** Tickets d'assistance des étudiants, les plus récents d'abord. */
export async function getSupportTickets(ctx: StudentContext): Promise<SupportTicketRow[]> {
  assert(ctx, ["admin", "admissions"]);
  const db = getDb();
  if (!db) return [];
  const rows = await db.support_tickets.findMany({
    orderBy: { created_at: "desc" },
    take: 50,
    include: { profiles: { select: { first_name: true, last_name: true, email: true } } },
  });
  return rows.map((t) => ({
    id: t.id,
    studentName: `${t.profiles.first_name} ${t.profiles.last_name}`.trim() || t.profiles.email,
    email: t.profiles.email,
    category: t.category,
    subject: t.subject,
    description: t.description,
    status: t.status,
    resolution: t.resolution,
    createdAt: t.created_at.toISOString(),
  }));
}

// ───────────────────────── Journal d'audit (supervision globale) ─────────────────────────

export type AuditRow = {
  id: string;
  actorName: string;
  action: string;
  entity: string;
  entityId: string | null;
  createdAt: string;
};

/** Dernières actions de l'équipe, filtrables par action ou table (réservé à l'administrateur). */
export async function getAuditLog(ctx: StudentContext, q?: string): Promise<AuditRow[]> {
  assert(ctx, ["admin"]);
  const db = getDb();
  if (!db) return [];
  const rows = await db.audit_log.findMany({
    where: q ? { OR: [{ action: { contains: q, mode: "insensitive" } }, { entity: { contains: q, mode: "insensitive" } }] } : {},
    orderBy: { created_at: "desc" },
    take: 100,
  });
  const users = await db.profiles.findMany({
    where: { id: { in: [...new Set(rows.map((r) => r.user_id).filter((u): u is string => !!u))] } },
    select: { id: true, first_name: true, last_name: true, email: true },
  });
  const nameOf = new Map(users.map((u) => [u.id, `${u.first_name} ${u.last_name}`.trim() || u.email]));
  return rows.map((r) => ({
    id: r.id.toString(),
    actorName: (r.user_id && nameOf.get(r.user_id)) || "Système",
    action: r.action,
    entity: r.entity,
    entityId: r.entity_id,
    createdAt: r.created_at.toISOString(),
  }));
}

// ───────────────────────── Notifications de l'équipe ─────────────────────────

export type StaffNotification = {
  id: string;
  category: "announcement" | "message" | "grade" | "comment" | "validation" | "live" | "payment" | "assessment";
  title: string;
  body: string;
  href: string | null;
  createdAt: string;
  read: boolean;
};

/** Notifications du membre d'équipe connecté (cloche de la barre supérieure admin). */
export async function listStaffNotifications(userId: string): Promise<StaffNotification[]> {
  const db = getDb();
  if (!db) return [];
  const rows = await db.notifications.findMany({ where: { user_id: userId }, orderBy: { created_at: "desc" }, take: 20 });
  return rows.map((n) => ({
    id: n.id,
    category: n.category,
    title: n.title,
    body: n.body,
    href: n.href,
    createdAt: n.created_at.toISOString(),
    read: n.read_at !== null,
  }));
}
