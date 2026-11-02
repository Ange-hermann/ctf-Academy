import "server-only";
import { getLearning, keyWordScores } from "@/lib/student/queries/learning";
import { type EnrolledContext, withStudent } from "@/lib/student/session";

export type ActivityItem = {
  id: string;
  kind: "lesson" | "assessment" | "grade";
  title: string;
  detail: string;
  at: string;
};

/** Page « Ma progression » : parcours complet, activité récente et notes. */
export async function getProgressDetail(ctx: EnrolledContext) {
  const [learning, extra] = await Promise.all([
    withStudent(ctx.userId, (tx) => getLearning(tx, ctx.enrollment.formationId)),
    withStudent(ctx.userId, async (tx) => {
      const [recentProgress, grades, gradedAttempts] = await Promise.all([
        tx.lesson_progress.findMany({
          orderBy: { updated_at: "desc" },
          take: 8,
          include: { lessons: { select: { title: true, slug: true, modules: { select: { slug: true } } } } },
        }),
        tx.grades.findMany({ orderBy: { graded_at: "desc" }, take: 10 }),
        tx.quiz_attempts.findMany({
          where: { status: "graded" },
          orderBy: { submitted_at: "desc" },
          take: 8,
          include: { quizzes: { select: { title: true } } },
        }),
      ]);
      return { recentProgress, grades, gradedAttempts };
    }),
  ]);

  const activity: ActivityItem[] = [
    ...extra.recentProgress.map((p) => ({
      id: `lp-${p.lesson_id}`,
      kind: "lesson" as const,
      title: p.lessons.title,
      detail: p.completed_at ? "Leçon terminée" : `${p.progress_percent} %`,
      at: (p.completed_at ?? p.updated_at).toISOString(),
    })),
    ...extra.gradedAttempts.map((a) => ({
      id: `qa-${a.id}`,
      kind: "assessment" as const,
      title: a.quizzes.title,
      detail: a.score != null && a.max_score != null ? `${Number(a.score)} / ${Number(a.max_score)} pts` : "Notée",
      at: (a.submitted_at ?? a.started_at).toISOString(),
    })),
    ...extra.grades.map((g) => ({
      id: `g-${g.id}`,
      kind: "grade" as const,
      title: g.label,
      detail: `${Number(g.score)} / ${Number(g.max_score)}${g.grader_name ? ` · ${g.grader_name}` : ""}`,
      at: g.graded_at.toISOString(),
    })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 10);

  const lessonHrefById = new Map<string, string>();
  for (const m of learning.modules) for (const l of m.lessons) lessonHrefById.set(l.id, `/espace-etudiant/cours/${m.slug}/${l.slug}`);

  const scores = keyWordScores(learning.modules);
  return {
    learning,
    activity: activity.map((a) => ({ ...a, href: a.kind === "lesson" ? (lessonHrefById.get(a.id.slice(3)) ?? null) : null })),
    grades: extra.grades.map((g) => ({
      id: g.id,
      label: g.label,
      score: Number(g.score),
      maxScore: Number(g.max_score),
      comment: g.comment,
      graderName: g.grader_name,
      gradedAt: g.graded_at.toISOString(),
      isExample: g.is_example,
    })),
    compass: [...scores.entries()].map(([slug, s]) => ({ slug, done: s.done, total: s.total })),
  };
}
