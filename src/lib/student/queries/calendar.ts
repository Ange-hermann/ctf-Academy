import "server-only";
import { assessmentHref, studentRoutes } from "@/config/student-nav";
import type { Tx } from "@/lib/student/session";

export type EventKind = "live" | "assessment" | "payment" | "milestone";

export type StudentEvent = {
  id: string;
  kind: EventKind;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string | null;
  allDay: boolean;
  zoomUrl: string | null;
  replayUrl: string | null;
  href: string;
  amount: number | null;
  isExample: boolean;
};

/**
 * Agenda unifié : cours en direct, évaluations à rendre, échéances de paiement, jalons de formation.
 * Toutes les sources sont lues sous RLS.
 */
export async function getEvents(tx: Tx, range: { from: Date; to: Date }): Promise<StudentEvent[]> {
  const between = { gte: range.from, lte: range.to };
  const lives = await tx.live_sessions.findMany({ where: { starts_at: between }, orderBy: { starts_at: "asc" } });
  const quizzes = await tx.quizzes.findMany({ where: { due_at: between }, orderBy: { due_at: "asc" } });
  const attempts = await tx.quiz_attempts.findMany({
    where: { status: { in: ["submitted", "graded"] } },
    select: { quiz_id: true },
  });
  const schedules = await tx.payment_schedules.findMany({
    where: { due_date: between, status: { not: "paid" } },
    orderBy: { due_date: "asc" },
  });
  const custom = await tx.calendar_events.findMany({ where: { starts_at: between }, orderBy: { starts_at: "asc" } });
  const done = new Set(attempts.map((a) => a.quiz_id));

  const events: StudentEvent[] = [
    ...lives.map((l) => ({
      id: `live-${l.id}`,
      kind: "live" as const,
      title: l.title,
      description: l.description,
      startsAt: l.starts_at.toISOString(),
      endsAt: new Date(l.starts_at.getTime() + l.duration_minutes * 60_000).toISOString(),
      allDay: false,
      zoomUrl: l.zoom_url,
      replayUrl: l.replay_url,
      href: studentRoutes.calendar,
      amount: null,
      isExample: l.is_example,
    })),
    ...quizzes
      .filter((q) => !done.has(q.id))
      .map((q) => ({
        id: `quiz-${q.id}`,
        kind: "assessment" as const,
        title: q.title,
        description: q.instructions,
        startsAt: q.due_at!.toISOString(),
        endsAt: null,
        allDay: false,
        zoomUrl: null,
        replayUrl: null,
        href: assessmentHref(q.id),
        amount: null,
        isExample: q.is_example,
      })),
    ...schedules.map((s) => ({
      id: `pay-${s.id}`,
      kind: "payment" as const,
      title: `Échéance : ${s.label}`,
      description:
        s.status === "late" ? "Échéance dépassée : régularisez dès que possible." : "Échéance de paiement à venir.",
      startsAt: s.due_date.toISOString(),
      endsAt: null,
      allDay: true,
      zoomUrl: null,
      replayUrl: null,
      href: studentRoutes.payments,
      amount: s.amount - s.paid_amount,
      isExample: s.is_example,
    })),
    ...custom.map((c) => ({
      id: `event-${c.id}`,
      kind: c.kind,
      title: c.title,
      description: c.description,
      startsAt: c.starts_at.toISOString(),
      endsAt: c.ends_at?.toISOString() ?? null,
      allDay: false,
      zoomUrl: c.zoom_url,
      replayUrl: null,
      href: c.href ?? studentRoutes.calendar,
      amount: null,
      isExample: c.is_example,
    })),
  ];
  return events.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

export type ReminderCategory = "live" | "assessment" | "payment" | "announcement" | "message" | "grade" | "comment" | "validation";

/** Préférences de rappel (défaut : dans l'espace activé, e-mail désactivé). */
export async function getReminderPrefs(tx: Tx) {
  const rows = await tx.notification_preferences.findMany();
  const map = new Map<ReminderCategory, { in_app: boolean; email: boolean }>();
  for (const r of rows) map.set(r.category, { in_app: r.in_app, email: r.email });
  return map;
}
