import "server-only";
import { getDb } from "@/lib/db";
import { hasAdminRole, type AdminRole } from "@/lib/admin/session";
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

export async function getApplications(ctx: StudentContext, filter: ApplicationFilter): Promise<ApplicationRow[]> {
  assert(ctx, ["admin", "admissions", "pastor"]);
  const db = getDb();
  if (!db) return [];
  const rows = await db.applications.findMany({
    where: {
      ...(filter.formation ? { formations: { slug: filter.formation } } : {}),
      ...(filter.status
        ? { OR: [{ registration_status: filter.status as never }, { payment_status: filter.status as never }, { admission_status: filter.status as never }] }
        : {}),
      ...(filter.q
        ? {
            OR: [
              { reference: { contains: filter.q, mode: "insensitive" as const } },
              { profiles: { email: { contains: filter.q, mode: "insensitive" as const } } },
              { profiles: { first_name: { contains: filter.q, mode: "insensitive" as const } } },
              { profiles: { last_name: { contains: filter.q, mode: "insensitive" as const } } },
            ],
          }
        : {}),
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
  schedules: { id: string; studentName: string; reference: string; label: string; dueDate: string; amount: number; paidAmount: number; status: string }[];
  payments: { id: string; studentName: string; reference: string; amount: number; method: string; provider: string; status: string; createdAt: string; confirmedAt: string | null }[];
};

export async function getFinanceOverview(ctx: StudentContext): Promise<FinanceData> {
  assert(ctx, ["admin", "finance"]);
  const db = getDb();
  const empty: FinanceData = { totals: { confirmed: 0, pending: 0, lateCount: 0 }, schedules: [], payments: [] };
  if (!db) return empty;

  const [confirmed, pending, lateCount, schedules, payments] = await Promise.all([
    db.payments.aggregate({ where: { status: "confirmed" }, _sum: { amount: true } }),
    db.payment_schedules.aggregate({ where: { status: { in: ["upcoming", "late", "partial"] } }, _sum: { amount: true, paid_amount: true } }),
    db.payment_schedules.count({ where: { status: "late" } }),
    db.payment_schedules.findMany({
      where: { status: { not: "paid" } },
      orderBy: { due_date: "asc" },
      take: 100,
      include: { profiles: { select: { first_name: true, last_name: true } }, applications: { select: { reference: true } } },
    }),
    db.payments.findMany({
      orderBy: { created_at: "desc" },
      take: 100,
      include: { profiles: { select: { first_name: true, last_name: true } }, applications: { select: { reference: true } } },
    }),
  ]);

  return {
    totals: {
      confirmed: confirmed._sum.amount ?? 0,
      pending: (pending._sum.amount ?? 0) - (pending._sum.paid_amount ?? 0),
      lateCount,
    },
    schedules: schedules.map((s) => ({
      id: s.id,
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
  assert(ctx, ["admin", "trainer", "pedagogy"]);
  const db = getDb();
  if (!db) return [];
  const attempts = await db.quiz_attempts.findMany({
    where: { status: "submitted" },
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
  answers: { questionId: string; prompt: string; kind: string; points: number; value: unknown; fileName: string | null }[];
};

/** Détail d'une copie à corriger (réponses de l'étudiant, jamais les corrigés). */
export async function getAttemptReview(ctx: StudentContext, attemptId: string): Promise<AttemptReview | null> {
  assert(ctx, ["admin", "trainer", "pedagogy"]);
  const db = getDb();
  if (!db) return null;
  const attempt = await db.quiz_attempts.findFirst({
    where: { id: attemptId, status: "submitted" },
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
  return {
    id: attempt.id,
    studentName: `${attempt.profiles.first_name} ${attempt.profiles.last_name}`.trim(),
    quizTitle: attempt.quizzes.title,
    passScore: attempt.quizzes.pass_score,
    maxScore: attempt.quizzes.questions.reduce((sum, q) => sum + q.points, 0),
    answers: attempt.quizzes.questions.map((q) => ({
      questionId: q.id,
      prompt: q.prompt,
      kind: q.kind,
      points: q.points,
      value: byQ.get(q.id)?.value ?? null,
      fileName: q.kind === "file" ? fileName : null,
    })),
  };
}

// ───────────────────────── Stages & mémoires (superviseur) ─────────────────────────

export type StageRow = {
  id: string;
  studentName: string;
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

export async function getStagesOverview(ctx: StudentContext): Promise<{ stages: StageRow[]; theses: ThesisRow[] }> {
  assert(ctx, ["admin", "supervisor"]);
  const db = getDb();
  if (!db) return { stages: [], theses: [] };

  const [stages, theses] = await Promise.all([
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
  ]);

  return {
    stages: stages.map((s) => ({
      id: s.id,
      studentName: `${s.profiles_internships_user_idToprofiles?.first_name ?? ""} ${s.profiles_internships_user_idToprofiles?.last_name ?? ""}`.trim(),
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
  assert(ctx, ["admin", "supervisor"]);
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
  assert(ctx, ["admin", "supervisor"]);
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

// ───────────────────────── Équipe pastorale ─────────────────────────

export type PastoraleData = {
  evaluations: { id: string; studentName: string; title: string; status: string; evaluatorName: string | null; scheduledOn: string | null; feedback: string | null }[];
  decisions: { id: string; studentName: string | null; kind: string; title: string; decision: string; decidedAt: string | null }[];
};

export async function getPastoraleData(ctx: StudentContext): Promise<PastoraleData> {
  assert(ctx, ["admin", "pastor"]);
  const db = getDb();
  const empty: PastoraleData = { evaluations: [], decisions: [] };
  if (!db) return empty;
  const [evaluations, decisions] = await Promise.all([
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
  ]);
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
  assert(ctx, ["admin", "pedagogy", "trainer"]);
  const db = getDb();
  if (!db) return [];
  const formations = await db.formations.findMany({
    orderBy: { sort_order: "asc" },
    include: {
      levels: { select: { id: true } },
      modules: { select: { id: true, _count: { select: { lessons: true } } } },
      quizzes: { select: { id: true } },
      applications: { where: { admission_status: "admitted" }, select: { id: true } },
    },
  });
  const submitted = await db.quiz_attempts.groupBy({ by: ["quiz_id"], where: { status: "submitted" }, _count: true });
  const quizFormation = new Map(formations.flatMap((f) => f.quizzes.map((q) => [q.id, f.id])));
  const submittedByFormation = new Map<string, number>();
  for (const row of submitted) {
    const fid = quizFormation.get(row.quiz_id);
    if (fid) submittedByFormation.set(fid, (submittedByFormation.get(fid) ?? 0) + row._count);
  }
  return formations.map((f) => ({
    slug: f.slug,
    name: f.name,
    levels: f.levels.length,
    modules: f.modules.length,
    lessons: f.modules.reduce((sum, m) => sum + m._count.lessons, 0),
    quizzes: f.quizzes.length,
    students: f.applications.length,
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
