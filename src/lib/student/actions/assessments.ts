"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { gradeAnswer } from "@/lib/student/grading";
import { allowedUploadTypes, inspectUpload, maxUploadBytes, safeFileName, signedUploadUrl, STUDENT_BUCKET } from "@/lib/student/storage";
import { audit, requireStudent, withStudent, type EnrolledContext } from "@/lib/student/session";
import type { ActionResult } from "@/lib/validation/auth";

const GRACE_MS = 90_000; // tolérance réseau à l'expiration du temps

const quizIdSchema = z.object({ quizId: z.uuid() });

type AttemptGuard = { id: string; quiz_id: string; session_key: string; status: string };

/** Vérifie que la tentative appartient à l'étudiant, est active et correspond à la clé de session. */
async function checkAttempt(ctx: EnrolledContext, attemptId: string, sessionKey: string): Promise<AttemptGuard | null> {
  const db = getDb();
  if (!db) return null;
  const a = await db.quiz_attempts.findUnique({ where: { id: attemptId }, select: { id: true, quiz_id: true, user_id: true, session_key: true, status: true } });
  return a && a.user_id === ctx.userId && a.session_key === sessionKey && a.status === "in_progress" ? a : null;
}

/** Démarre (ou reprend) une tentative. */
export async function startAttemptAction(input: unknown): Promise<ActionResult<AttemptGuard & { startedAt: string; deadline: string | null }>> {
  const parsed = quizIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Évaluation inconnue." };
  const ctx = await requireStudent();
  const { quizId } = parsed.data;

  type Gate =
    | { ok: false; error: string }
    | {
        ok: true;
        quiz: { due_at: Date | null; max_attempts: number; duration_minutes: number | null };
        resume: { id: string; session_key: string; started_at: Date } | null;
      };
  const gate: Gate = await withStudent(ctx.userId, async (tx): Promise<Gate> => {
    const quiz = await tx.quizzes.findUnique({ where: { id: quizId }, select: { due_at: true, max_attempts: true, duration_minutes: true } });
    if (!quiz) return { ok: false, error: "Évaluation introuvable." };
    const mine = await tx.quiz_attempts.findMany({ where: { quiz_id: quizId }, select: { id: true, status: true, session_key: true, started_at: true } });
    const active = mine.find((a) => a.status === "in_progress");
    if (active) return { ok: true, quiz, resume: active };
    if (quiz.due_at && quiz.due_at.getTime() < Date.now()) return { ok: false, error: "La date limite est dépassée." };
    if (mine.some((a) => a.status === "submitted")) return { ok: false, error: "Une copie est déjà en cours de correction." };
    if (mine.length >= quiz.max_attempts) return { ok: false, error: "Nombre de tentatives épuisé." };
    return { ok: true, quiz, resume: null };
  });
  if (!gate.ok) return { ok: false, error: gate.error };

  const attempt = gate.resume ?? (await getDb()!.quiz_attempts.create({ data: { quiz_id: quizId, user_id: ctx.userId } }));
  await audit(ctx.userId, "attempt.start", "quiz_attempt", attempt.id, { quizId, resumed: !!gate.resume });
  revalidatePath("/espace-etudiant/evaluations");
  const started = attempt.started_at;
  const duration = gate.quiz.duration_minutes;
  return {
    ok: true,
    data: {
      id: attempt.id,
      quiz_id: quizId,
      session_key: attempt.session_key,
      status: "in_progress",
      startedAt: started.toISOString(),
      deadline: duration != null ? new Date(started.getTime() + duration * 60_000).toISOString() : null,
    },
  };
}

const answerSchema = z.object({
  attemptId: z.uuid(),
  sessionKey: z.string().min(10).max(100),
  questionId: z.uuid(),
  value: z.unknown(),
});

/** Enregistre une réponse (autosauvegarde). Le corrigé n'est jamais renvoyé. */
export async function saveAnswerAction(input: unknown): Promise<ActionResult> {
  const parsed = answerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Réponse invalide." };
  const ctx = await requireStudent();
  const { attemptId, sessionKey, questionId, value } = parsed.data;
  const attempt = await checkAttempt(ctx, attemptId, sessionKey);
  if (!attempt) return { ok: false, error: "Tentative close ou invalide." };

  const db = getDb()!;
  const question = await db.questions.findUnique({ where: { id: questionId }, select: { quiz_id: true, kind: true } });
  if (!question || question.quiz_id !== attempt.quiz_id) return { ok: false, error: "Question hors de cette évaluation." };
  if (!isValidValue(question.kind, value)) return { ok: false, error: "Format de réponse invalide." };

  const jsonValue = value === undefined || value === null ? Prisma.JsonNull : (value as Prisma.InputJsonValue);
  await db.answers.upsert({
    where: { attempt_id_question_id: { attempt_id: attemptId, question_id: questionId } },
    create: { attempt_id: attemptId, question_id: questionId, value: jsonValue, is_correct: null, points_awarded: null },
    update: { value: jsonValue, is_correct: null, points_awarded: null, updated_at: new Date() },
  });
  return { ok: true };
}

function isValidValue(kind: string, value: unknown): boolean {
  switch (kind) {
    case "single":
      return value === null || typeof value === "string";
    case "multiple":
      return value === null || (Array.isArray(value) && value.every((v) => typeof v === "string"));
    case "true_false":
      return value === null || typeof value === "boolean";
    case "short":
      return value === null || (typeof value === "string" && value.length <= 500);
    case "long":
      return value === null || (typeof value === "string" && value.length <= 20_000);
    case "match":
      return (
        value === null ||
        (typeof value === "object" && !Array.isArray(value) && Object.values(value as object).every((v) => typeof v === "string"))
      );
    case "file":
      return value === null || (typeof value === "object" && value !== null && typeof (value as { file?: unknown }).file === "string");
    default:
      return false;
  }
}

const submitSchema = z.object({ attemptId: z.uuid(), sessionKey: z.string().min(10).max(100) });

/** Corrige et clôture la tentative : score calculé côté serveur, jamais côté client. */
export async function submitAttemptAction(
  input: unknown,
): Promise<ActionResult<{ status: "submitted" | "graded"; percent: number | null; passed: boolean | null }>> {
  const parsed = submitSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Tentative invalide." };
  const ctx = await requireStudent();
  const { attemptId, sessionKey } = parsed.data;
  const attempt = await checkAttempt(ctx, attemptId, sessionKey);
  if (!attempt) return { ok: false, error: "Tentative close ou invalide." };

  const db = getDb()!;
  // Corrigés : aucune politique RLS → lecture serveur uniquement, jamais renvoyée au client.
  const [quiz, questions, answers, keys, start] = await Promise.all([
    db.quizzes.findUnique({ where: { id: attempt.quiz_id }, select: { pass_score: true, duration_minutes: true } }),
    db.questions.findMany({ where: { quiz_id: attempt.quiz_id }, select: { id: true, kind: true, points: true } }),
    db.answers.findMany({ where: { attempt_id: attemptId } }),
    db.question_keys.findMany({ where: { questions: { quiz_id: attempt.quiz_id } } }),
    db.quiz_attempts.findUnique({ where: { id: attemptId }, select: { started_at: true } }),
  ]);
  const keysByQ = new Map(keys.map((k) => [k.question_id, k.answer]));
  const expired = !!(quiz?.duration_minutes && start && start.started_at.getTime() + quiz.duration_minutes * 60_000 + GRACE_MS < Date.now());
  const byQ = new Map(answers.map((a) => [a.question_id, a]));

  let score = 0;
  let maxScore = 0;
  let needsManual = false;
  for (const q of questions) {
    maxScore += q.points;
    const ans = byQ.get(q.id);
    const key = keysByQ.get(q.id);
    const correct = gradeAnswer(q.kind, ans?.value ?? null, key ?? null);
    if (correct === null) needsManual = true;
    else {
      const pts = correct ? q.points : 0;
      score += pts;
      await db.answers.upsert({
        where: { attempt_id_question_id: { attempt_id: attemptId, question_id: q.id } },
        create: { attempt_id: attemptId, question_id: q.id, value: Prisma.JsonNull, is_correct: correct, points_awarded: pts },
        update: { is_correct: correct, points_awarded: pts, updated_at: new Date() },
      });
    }
  }

  const status = needsManual ? ("submitted" as const) : ("graded" as const);
  const pct = needsManual ? null : Math.round((score / Math.max(maxScore, 1)) * 100);
  await db.quiz_attempts.update({
    where: { id: attemptId },
    data: {
      status,
      submitted_at: new Date(),
      score: needsManual ? null : score,
      max_score: needsManual ? null : maxScore,
      feedback: expired ? "Délai dépassé : copie rendue automatiquement." : undefined,
    },
  });
  await audit(ctx.userId, "attempt.submit", "quiz_attempt", attemptId, { quizId: attempt.quiz_id, status, score, maxScore });
  revalidatePath("/espace-etudiant/evaluations");
  return { ok: true, data: { status, percent: pct, passed: pct === null ? null : pct >= (quiz?.pass_score ?? 0) } };
}

/** Quitter l'onglet pendant un quiz est comptabilisé (intégrité). */
export async function recordTabLeaveAction(input: unknown): Promise<ActionResult> {
  const parsed = submitSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Tentative invalide." };
  const ctx = await requireStudent();
  const attempt = await checkAttempt(ctx, parsed.data.attemptId, parsed.data.sessionKey);
  if (!attempt) return { ok: false, error: "Tentative close." };
  await getDb()!.quiz_attempts.update({ where: { id: attempt.id }, data: { tab_leaves: { increment: 1 } } });
  return { ok: true };
}

const uploadRequestSchema = z.object({
  quizId: z.uuid(),
  attemptId: z.uuid(),
  sessionKey: z.string().min(10).max(100),
  fileName: z.string().min(1).max(200),
  mime: z.string(),
  size: z.number().int().positive(),
});

/** Demande une URL signée de dépôt (le fichier part directement au stockage privé). */
export async function requestSubmissionUploadAction(
  input: unknown,
): Promise<ActionResult<{ url: string; token: string; path: string }>> {
  const parsed = uploadRequestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Requête invalide." };
  const ctx = await requireStudent();
  const { quizId, attemptId, sessionKey, fileName, mime, size } = parsed.data;
  const attempt = await checkAttempt(ctx, attemptId, sessionKey);
  if (!attempt || attempt.quiz_id !== quizId) return { ok: false, error: "Tentative invalide." };
  if (!(mime in allowedUploadTypes)) return { ok: false, error: "Format accepté : PDF, DOCX ou image." };
  if (size > maxUploadBytes("document")) return { ok: false, error: "Fichier trop lourd (20 Mo maximum)." };

  const path = `${ctx.userId}/depots/${crypto.randomUUID()}-${safeFileName(fileName)}`;
  const signed = await signedUploadUrl(path);
  if (!signed) return { ok: false, error: "Stockage indisponible." };
  return { ok: true, data: signed };
}

const confirmSchema = z.object({
  quizId: z.uuid(),
  attemptId: z.uuid(),
  sessionKey: z.string().min(10).max(100),
  questionId: z.uuid(),
  path: z.string().min(10).max(300),
  fileName: z.string().min(1).max(200),
});

/** Enregistre le dépôt après vérification du fichier réellement stocké. */
export async function confirmSubmissionAction(input: unknown): Promise<ActionResult<{ submissionId: string }>> {
  const parsed = confirmSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Requête invalide." };
  const ctx = await requireStudent();
  const { quizId, attemptId, sessionKey, questionId, path, fileName } = parsed.data;
  const attempt = await checkAttempt(ctx, attemptId, sessionKey);
  if (!attempt || attempt.quiz_id !== quizId) return { ok: false, error: "Tentative invalide." };
  if (!path.startsWith(`${ctx.userId}/depots/`)) return { ok: false, error: "Emplacement de fichier refusé." };

  const stored = await inspectUpload(path);
  if (!stored) return { ok: false, error: "Le fichier n'a pas été reçu." };
  if (!(stored.mime in allowedUploadTypes)) return { ok: false, error: "Type de fichier refusé." };
  if (stored.size > maxUploadBytes("document")) return { ok: false, error: "Fichier trop lourd." };

  const db = getDb()!;
  const submission = await db.submissions.create({
    data: { quiz_id: quizId, user_id: ctx.userId, attempt_id: attemptId, storage_path: path, file_name: fileName, size_bytes: stored.size, mime_type: stored.mime },
  });
  await db.answers.upsert({
    where: { attempt_id_question_id: { attempt_id: attemptId, question_id: questionId } },
    create: { attempt_id: attemptId, question_id: questionId, value: { file: fileName } },
    update: { value: { file: fileName }, updated_at: new Date() },
  });
  await audit(ctx.userId, "submission.create", "submission", submission.id, { quizId, size: stored.size, bucket: STUDENT_BUCKET });
  revalidatePath("/espace-etudiant/evaluations");
  return { ok: true, data: { submissionId: submission.id } };
}
