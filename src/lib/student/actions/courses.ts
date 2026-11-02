"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { rateLimit, tooManyRequests } from "@/lib/security/rate-limit";
import { requireStudent, withStudent } from "@/lib/student/session";
import type { ActionResult } from "@/lib/validation/auth";

const progressSchema = z.object({
  lessonId: z.uuid(),
  positionSeconds: z.number().int().min(0).max(36_000),
  progressPercent: z.number().int().min(0).max(100),
});

/** Position de lecture et avancement : ne régresse jamais une leçon déjà terminée. */
export async function saveLessonProgressAction(input: unknown): Promise<ActionResult> {
  const parsed = progressSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Données invalides." };
  const ctx = await requireStudent();
  const { lessonId, positionSeconds, progressPercent } = parsed.data;
  await withStudent(ctx.userId, async (tx) => {
    if (!(await tx.lessons.findUnique({ where: { id: lessonId }, select: { id: true } }))) return;
    const current = await tx.lesson_progress.findUnique({ where: { user_id_lesson_id: { user_id: ctx.userId, lesson_id: lessonId } } });
    await tx.lesson_progress.upsert({
      where: { user_id_lesson_id: { user_id: ctx.userId, lesson_id: lessonId } },
      create: { user_id: ctx.userId, lesson_id: lessonId, position_seconds: positionSeconds, progress_percent: progressPercent },
      update: {
        position_seconds: positionSeconds,
        progress_percent: current?.completed_at ? 100 : Math.max(current?.progress_percent ?? 0, progressPercent),
        updated_at: new Date(),
      },
    });
  });
  return { ok: true };
}

const lessonSchema = z.object({ lessonId: z.uuid() });

export type CompletionResult = { firstTime: boolean; moduleCompleted: boolean };

/** « Marquer comme terminée » (ou automatique à 90 % de la vidéo). */
export async function completeLessonAction(input: unknown): Promise<ActionResult<CompletionResult>> {
  const parsed = lessonSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Leçon inconnue." };
  const ctx = await requireStudent();
  const { lessonId } = parsed.data;
  const result = await withStudent(ctx.userId, async (tx) => {
    const lesson = await tx.lessons.findUnique({ where: { id: lessonId }, select: { module_id: true } });
    if (!lesson) return null;
    const key = { user_id_lesson_id: { user_id: ctx.userId, lesson_id: lessonId } };
    const current = await tx.lesson_progress.findUnique({ where: key });
    if (current?.completed_at) return { firstTime: false, moduleCompleted: false };
    const now = new Date();
    await tx.lesson_progress.upsert({
      where: key,
      create: { user_id: ctx.userId, lesson_id: lessonId, progress_percent: 100, completed_at: now, celebrated_at: now },
      update: { progress_percent: 100, completed_at: now, celebrated_at: now, updated_at: now },
    });
    const total = await tx.lessons.count({ where: { module_id: lesson.module_id } });
    const done = await tx.lesson_progress.count({ where: { completed_at: { not: null }, lessons: { module_id: lesson.module_id } } });
    return { firstTime: true, moduleCompleted: total > 0 && done === total };
  });
  if (!result) return { ok: false, error: "Leçon inaccessible." };
  revalidatePath("/espace-etudiant", "layout");
  return { ok: true, data: result };
}

const noteSchema = z.object({ lessonId: z.uuid(), body: z.string().max(20_000) });

export async function saveNoteAction(input: unknown): Promise<ActionResult> {
  const parsed = noteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Note trop longue (20 000 caractères maximum)." };
  const ctx = await requireStudent();
  const { lessonId, body } = parsed.data;
  await withStudent(ctx.userId, async (tx) => {
    if (!(await tx.lessons.findUnique({ where: { id: lessonId }, select: { id: true } }))) return;
    await tx.student_notes.upsert({
      where: { user_id_lesson_id: { user_id: ctx.userId, lesson_id: lessonId } },
      create: { user_id: ctx.userId, lesson_id: lessonId, body },
      update: { body, updated_at: new Date() },
    });
  });
  return { ok: true };
}

const questionSchema = z.object({
  lessonId: z.uuid(),
  body: z.string().trim().min(3, "Votre question est trop courte.").max(2000, "2 000 caractères maximum."),
});

export async function askQuestionAction(input: unknown): Promise<ActionResult<{ id: string; createdAt: string }>> {
  const parsed = questionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Question invalide." };
  const limit = await rateLimit("lesson-question", { limit: 5, windowMs: 10 * 60_000 });
  if (!limit.allowed) return { ok: false, error: tooManyRequests(limit.retryInSec) };
  const ctx = await requireStudent();
  const row = await withStudent(ctx.userId, async (tx) => {
    if (!(await tx.lessons.findUnique({ where: { id: parsed.data.lessonId }, select: { id: true } }))) return null;
    return tx.lesson_questions.create({ data: { user_id: ctx.userId, lesson_id: parsed.data.lessonId, body: parsed.data.body } });
  });
  if (!row) return { ok: false, error: "Leçon inaccessible." };
  return { ok: true, data: { id: row.id, createdAt: row.created_at.toISOString() } };
}
