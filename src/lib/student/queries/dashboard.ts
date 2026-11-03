import "server-only";
import { keyWords, type KeyWordSlug } from "@/content/identity";
import { getAssessments } from "@/lib/student/queries/assessments";
import { getEvents } from "@/lib/student/queries/calendar";
import { getLearning, keyWordScores, percent } from "@/lib/student/queries/learning";
import { forLevels, getStudentLevels } from "@/lib/student/queries/levels";
import { unreadMessagesWhere } from "@/lib/student/queries/shell";
import { type EnrolledContext, withStudent } from "@/lib/student/session";

export async function getDashboard(ctx: EnrolledContext) {
  const { userId } = ctx;
  const formationId = ctx.enrollment.formationId;
  const now = new Date();
  // Transactions RLS indépendantes exécutées en parallèle (une connexion chacune) : moins d'allers-retours cumulés.
  const [learning, assessments, events, { schedules, validations, announcements, unreadMessages }] = await Promise.all([
    withStudent(userId, (tx) => getLearning(tx, formationId)),
    withStudent(userId, (tx) => getAssessments(tx, formationId)),
    withStudent(userId, (tx) =>
      getEvents(tx, { from: new Date(now.getTime() - 2 * 3600_000), to: new Date(now.getTime() + 60 * 86400_000) }),
    ),
    withStudent(userId, async (tx) => ({
      schedules: await tx.payment_schedules.findMany(),
      validations: await tx.validations.findMany({ orderBy: { decided_at: "desc" } }),
      announcements: await (async () => {
        const { current } = await getStudentLevels(tx);
        const rows = await tx.announcements.findMany({
          orderBy: [{ pinned: "desc" }, { published_at: "desc" }],
          take: 20,
          include: { announcement_reads: { where: { user_id: userId }, select: { user_id: true } } },
        });
        return rows.filter((a) => forLevels(a.level_id, current)).slice(0, 2);
      })(),
      unreadMessages: await tx.messages.count({ where: unreadMessagesWhere(userId) }),
    })),
  ]);

  const passed = assessments.filter((a) => a.passed).length;
  const toTake = assessments.filter((a) => a.status === "todo" || a.status === "in_progress").length;
  const due = schedules.reduce((n, s) => n + s.amount, 0);
  const paid = schedules.reduce((n, s) => n + s.paid_amount, 0);
  const scores = keyWordScores(learning.modules);
  const upcoming = events.filter((e) => e.kind !== "milestone").slice(0, 4);

  return {
    learning,
    stats: {
      percent: learning.percent,
      lessonsDone: learning.completedLessons,
      lessonsTotal: learning.totalLessons,
      assessmentsPassed: passed,
      assessmentsTotal: assessments.length,
      levelsValidated: learning.levels.filter((l) => l.status === "validated").length,
      levelsTotal: learning.levels.length,
    },
    upcoming,
    nextLive: events.find((e) => e.kind === "live" && new Date(e.endsAt ?? e.startsAt) > now) ?? null,
    metrics: {
      lessonsLeft: learning.modules.filter((m) => m.status !== "locked").reduce((n, m) => n + m.total - m.completed, 0),
      toTake,
      unreadMessages,
      remaining: Math.max(due - paid, 0),
      lateSchedules: schedules.filter((s) => s.status === "late").length,
      validationsGranted: validations.filter((v) => v.decision === "granted").length,
      validationsPending: validations.filter((v) => v.decision === "pending").length,
      upcomingCount: events.filter((e) => new Date(e.startsAt) > now).length,
    },
    payments: { due, paid, isExample: schedules.some((s) => s.is_example) },
    announcements: announcements.map((a) => ({
      id: a.id,
      title: a.title,
      body: a.body,
      pinned: a.pinned,
      publishedAt: a.published_at.toISOString(),
      read: a.announcement_reads.length > 0,
    })),
    compass: keyWords.map((k) => {
      const s = scores.get(k.slug as KeyWordSlug);
      return { slug: k.slug, value: s ? percent(s.done, s.total) / 100 : 0 };
    }),
  };
}

export type DashboardData = Awaited<ReturnType<typeof getDashboard>>;
