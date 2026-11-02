import "server-only";
import { getDb } from "@/lib/db";
import { isAutoGraded, parseOptions, type QuestionKind } from "@/lib/student/grading";
import { type EnrolledContext, type Tx, withStudent } from "@/lib/student/session";

export type AssessmentKind = "quiz" | "exercise" | "exam";
export type AssessmentStatus = "todo" | "in_progress" | "submitted" | "graded" | "closed";

export type AssessmentSummary = {
  id: string;
  kind: AssessmentKind;
  title: string;
  instructions: string;
  moduleTitle: string | null;
  moduleSlug: string | null;
  levelNumber: number | null;
  levelId: string | null;
  dueAt: string | null;
  durationMinutes: number | null;
  maxAttempts: number;
  attemptsUsed: number;
  attemptsLeft: number;
  passScore: number;
  questionCount: number;
  status: AssessmentStatus;
  bestPercent: number | null;
  passed: boolean | null;
  lastAttemptId: string | null;
  lastGradedAttemptId: string | null;
  canStart: boolean;
  isExample: boolean;
};

export const assessmentKindLabels: Record<AssessmentKind, string> = {
  quiz: "Quiz",
  exercise: "Exercice",
  exam: "Examen",
};

export const attemptPercent = (score: unknown, max: unknown) => {
  const s = Number(score);
  const m = Number(max);
  return m > 0 ? Math.round((s / m) * 100) : 0;
};

/** Évaluations de la formation et état pour l'étudiant (tentatives lues sous RLS : uniquement les siennes). */
export async function getAssessments(tx: Tx, formationId: string): Promise<AssessmentSummary[]> {
  const quizzes = await tx.quizzes.findMany({
    where: { formation_id: formationId },
    orderBy: [{ due_at: "asc" }, { created_at: "asc" }],
    include: {
      modules: { select: { title: true, slug: true } },
      levels: { select: { number: true } },
      _count: { select: { questions: true } },
    },
  });
  const attempts = await tx.quiz_attempts.findMany({ orderBy: { started_at: "desc" } });
  const now = Date.now();

  return quizzes.map((q) => {
    const mine = attempts.filter((a) => a.quiz_id === q.id);
    const graded = mine.filter((a) => a.status === "graded");
    const best = graded.reduce<number | null>((b, a) => Math.max(b ?? 0, attemptPercent(a.score, a.max_score)), null);
    const passed = best === null ? null : best >= q.pass_score;
    const inProgress = mine.find((a) => a.status === "in_progress");
    const submitted = mine.find((a) => a.status === "submitted");
    const used = mine.filter((a) => a.status !== "in_progress").length;
    const left = Math.max(q.max_attempts - used, 0);
    const overdue = !!q.due_at && q.due_at.getTime() < now;

    let status: AssessmentStatus;
    if (inProgress) status = "in_progress";
    else if (submitted) status = "submitted";
    else if (graded.length && (passed || left === 0)) status = "graded";
    else if (overdue && !graded.length) status = "closed";
    else if (graded.length) status = overdue ? "graded" : "todo";
    else status = "todo";

    return {
      id: q.id,
      kind: q.kind,
      title: q.title,
      instructions: q.instructions,
      moduleTitle: q.modules?.title ?? null,
      moduleSlug: q.modules?.slug ?? null,
      levelNumber: q.levels?.number ?? null,
      levelId: q.level_id,
      dueAt: q.due_at?.toISOString() ?? null,
      durationMinutes: q.duration_minutes,
      maxAttempts: q.max_attempts,
      attemptsUsed: used,
      attemptsLeft: left,
      passScore: q.pass_score,
      questionCount: q._count.questions,
      status,
      bestPercent: best,
      passed,
      lastAttemptId: mine[0]?.id ?? null,
      lastGradedAttemptId: graded[0]?.id ?? null,
      canStart: !!inProgress || (left > 0 && !overdue && !submitted),
      isExample: q.is_example,
    };
  });
}

export type QuizQuestion = {
  id: string;
  kind: QuestionKind;
  prompt: string;
  points: number;
  options: ReturnType<typeof parseOptions>;
  /** Leçon à revoir en cas d'erreur (module + leçon). */
  lessonHref: string | null;
  lessonTitle: string | null;
};

export type AttemptInfo = { id: string; sessionKey: string; startedAt: string; deadline: string | null };

export type AttemptRow = {
  id: string;
  status: "in_progress" | "submitted" | "graded";
  startedAt: string;
  submittedAt: string | null;
  score: number | null;
  maxScore: number | null;
  percent: number | null;
  passed: boolean | null;
  feedback: string | null;
};

/** Détail pour la passation : consignes, questions (sans corrigé), tentative active et réponses enregistrées. */
export async function getAssessmentDetail(ctx: EnrolledContext, quizId: string) {
  const assessments = await withStudent(ctx.userId, (tx) => getAssessments(tx, ctx.enrollment.formationId));
  const assessment = assessments.find((a) => a.id === quizId);
  if (!assessment) return null;

  const data = await withStudent(ctx.userId, async (tx) => {
    const questions = await tx.questions.findMany({
      where: { quiz_id: quizId },
      orderBy: { sort_order: "asc" },
      include: { lessons: { select: { slug: true, title: true, modules: { select: { slug: true } } } } },
    });
    const active = await tx.quiz_attempts.findFirst({ where: { quiz_id: quizId, status: "in_progress" } });
    const savedAnswers = active ? await tx.answers.findMany({ where: { attempt_id: active.id } }) : [];
    const submission = await tx.submissions.findFirst({ where: { quiz_id: quizId }, orderBy: { created_at: "desc" } });
    const history = await tx.quiz_attempts.findMany({ where: { quiz_id: quizId, status: { not: "in_progress" } }, orderBy: { started_at: "desc" } });
    return { questions, active, savedAnswers, submission, history };
  });

  return {
    assessment,
    questions: data.questions.map((q) => ({
      id: q.id,
      kind: q.kind,
      prompt: q.prompt,
      points: q.points,
      options: parseOptions(q.options, q.kind),
      lessonHref: q.lessons?.modules ? `/espace-etudiant/cours/${q.lessons.modules.slug}/${q.lessons.slug}` : null,
      lessonTitle: q.lessons?.title ?? null,
    })),
    attempt: data.active
      ? {
          id: data.active.id,
          sessionKey: data.active.session_key,
          startedAt: data.active.started_at.toISOString(),
          deadline:
            assessment.durationMinutes != null
              ? new Date(data.active.started_at.getTime() + assessment.durationMinutes * 60_000).toISOString()
              : null,
        }
      : null,
    savedAnswers: Object.fromEntries(data.savedAnswers.map((a) => [a.question_id, a.value])),
    submission: data.submission
      ? { id: data.submission.id, fileName: data.submission.file_name, createdAt: data.submission.created_at.toISOString() }
      : null,
    history: data.history.map(toAttemptRow(assessment.passScore)),
  };
}

const toAttemptRow =
  (passScore: number) =>
  (a: { id: string; status: string; started_at: Date; submitted_at: Date | null; score: unknown; max_score: unknown; feedback: string | null }): AttemptRow => {
    const pct = a.score == null ? null : attemptPercent(a.score, a.max_score);
    return {
      id: a.id,
      status: a.status as AttemptRow["status"],
      startedAt: a.started_at.toISOString(),
      submittedAt: a.submitted_at?.toISOString() ?? null,
      score: a.score == null ? null : Number(a.score),
      maxScore: a.max_score == null ? null : Number(a.max_score),
      percent: pct,
      passed: a.status === "graded" && pct !== null ? pct >= passScore : null,
      feedback: a.feedback,
    };
  };

export type ResultItem = {
  question: QuizQuestion;
  myAnswer: unknown;
  correctAnswer: unknown;
  explanation: string;
  isCorrect: boolean | null;
  pointsAwarded: number | null;
  feedback: string | null;
};

/** Résultat d'une tentative : correction complète uniquement si la tentative est « graded ». */
export async function getAttemptResult(ctx: EnrolledContext, quizId: string, attemptId?: string) {
  const assessments = await withStudent(ctx.userId, (tx) => getAssessments(tx, ctx.enrollment.formationId));
  const assessment = assessments.find((a) => a.id === quizId);
  if (!assessment) return null;

  const base = await withStudent(ctx.userId, async (tx) => {
    const attempt = attemptId
      ? await tx.quiz_attempts.findFirst({ where: { id: attemptId, quiz_id: quizId, status: { not: "in_progress" } } })
      : await tx.quiz_attempts.findFirst({ where: { quiz_id: quizId, status: { not: "in_progress" } }, orderBy: { started_at: "desc" } });
    if (!attempt) return null;
    const questions = await tx.questions.findMany({
      where: { quiz_id: quizId },
      orderBy: { sort_order: "asc" },
      include: { lessons: { select: { slug: true, title: true, modules: { select: { slug: true } } } } },
    });
    const answers = await tx.answers.findMany({ where: { attempt_id: attempt.id } });
    const submission = await tx.submissions.findFirst({ where: { attempt_id: attempt.id } });
    return { attempt, questions, answers, submission };
  });
  if (!base) return null;
  const { attempt } = base;

  // Les corrigés ne sont pas lisibles sous RLS : relecture côté serveur uniquement si la copie est notée.
  const graded = attempt.status === "graded";
  const keys = new Map<string, { answer: unknown; explanation: string }>();
  if (graded) {
    const rows = await getDb()?.question_keys.findMany({ where: { questions: { quiz_id: quizId } } });
    for (const k of rows ?? []) keys.set(k.question_id, { answer: k.answer, explanation: k.explanation });
  }

  const byQuestion = new Map(base.answers.map((a) => [a.question_id, a]));
  return {
    assessment,
    attempt: toAttemptRow(assessment.passScore)(attempt),
    items: base.questions.map((q) => {
      const a = byQuestion.get(q.id);
      const key = keys.get(q.id);
      return {
        question: {
          id: q.id,
          kind: q.kind,
          prompt: q.prompt,
          points: q.points,
          options: parseOptions(q.options, q.kind),
          lessonHref: q.lessons?.modules ? `/espace-etudiant/cours/${q.lessons.modules.slug}/${q.lessons.slug}` : null,
          lessonTitle: q.lessons?.title ?? null,
        },
        myAnswer: a?.value ?? null,
        correctAnswer: graded && isAutoGraded(q.kind) ? (key?.answer ?? null) : null,
        explanation: graded ? (key?.explanation ?? "") : "",
        isCorrect: graded ? (a?.is_correct ?? null) : null,
        pointsAwarded: graded && a?.points_awarded != null ? Number(a.points_awarded) : null,
        feedback: graded ? (a?.feedback ?? null) : null,
      } satisfies ResultItem;
    }),
    submission: base.submission
      ? { id: base.submission.id, fileName: base.submission.file_name, createdAt: base.submission.created_at.toISOString() }
      : null,
  };
}
