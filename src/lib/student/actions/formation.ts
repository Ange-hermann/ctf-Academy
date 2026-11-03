"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { rateLimit, tooManyRequests } from "@/lib/security/rate-limit";
import { audit, requireStudent, withStudent, type EnrolledContext } from "@/lib/student/session";
import { allowedUploadTypes, inspectUpload, maxUploadBytes, safeFileName, signedUploadUrl, STUDENT_BUCKET } from "@/lib/student/storage";
import { weeklyReportWindow } from "@/lib/edm";
import { studentStageHref } from "@/lib/internships";
import { notifyMany } from "@/lib/notifications/notify";
import { zodFieldErrors, type ActionResult } from "@/lib/validation/auth";

const STAGE_PATH = "/espace-etudiant/diacres/stage";
const RAPPORT_PATH = "/espace-etudiant/diacres/rapport";
const MEMOIRE_PATH = "/espace-etudiant/diacres/memoire";
const FICHE_PATH = "/espace-etudiant/edm/fiche";

const hoursSchema = z.object({
  workedOn: z.iso.date("Date invalide."),
  hours: z.number().min(0.5, "Minimum 0,5 h.").max(24, "Une journée ne peut dépasser 24 h."),
  activity: z.string().trim().min(3, "Décrivez l'activité.").max(200, "Description trop longue."),
});

/** Journal d'heures du stage pratique. RLS : insert uniquement sur SON stage, jamais validé à la création. */
export async function logInternshipHoursAction(input: unknown): Promise<ActionResult> {
  const parsed = hoursSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Vérifiez les champs saisis.", fieldErrors: zodFieldErrors(parsed.error) };

  const limit = await rateLimit("internship-hours", { limit: 15, windowMs: 60_000 });
  if (!limit.allowed) return { ok: false, error: tooManyRequests(limit.retryInSec) };

  const ctx = await requireStudent(STAGE_PATH);
  const { workedOn, hours, activity } = parsed.data;
  const day = new Date(`${workedOn}T00:00:00Z`);
  if (Number.isNaN(day.getTime())) return { ok: false, error: "Date invalide." };

  const created = await withStudent(ctx.userId, async (tx) => {
    const stage = await tx.internships.findFirst({ where: { user_id: ctx.userId }, select: { id: true, starts_on: true, ends_on: true } });
    if (!stage) return null;
    if (day < stage.starts_on || day > stage.ends_on) return { error: "outside" as const };
    return tx.internship_hours.create({ data: { internship_id: stage.id, worked_on: day, hours, activity } });
  });
  if (created === null) return { ok: false, error: "Aucun stage ne vous est encore attribué." };
  if ("error" in created) return { ok: false, error: "La date doit être comprise dans la période du stage." };

  await audit(ctx.userId, "internship_hours.log", "internship_hours", created.id, { hours });
  revalidatePath(studentStageHref(ctx.enrollment.formation));
  return { ok: true };
}

const replySchema = z.object({
  commentId: z.uuid(),
  body: z.string().trim().min(1, "Réponse vide.").max(4000, "Réponse trop longue."),
});

/** Réponse à un commentaire du superviseur. RLS : parent obligatoire, auteur = l'étudiant, fil « open ». */
export async function replyThesisCommentAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = replySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Vérifiez votre réponse.", fieldErrors: zodFieldErrors(parsed.error) };

  const limit = await rateLimit("thesis-comment", { limit: 20, windowMs: 60_000 });
  if (!limit.allowed) return { ok: false, error: tooManyRequests(limit.retryInSec) };

  const ctx = await requireStudent(MEMOIRE_PATH);
  const { commentId, body } = parsed.data;
  const created = await withStudent(ctx.userId, async (tx) => {
    const parent = await tx.thesis_comments.findFirst({
      where: { id: commentId },
      select: { id: true, thesis_id: true, version_id: true, status: true, theses: { select: { user_id: true } } },
    });
    if (!parent || parent.theses.user_id !== ctx.userId) return null;
    if (parent.status !== "open") return { error: "closed" as const };
    return tx.thesis_comments.create({
      data: {
        thesis_id: parent.thesis_id,
        version_id: parent.version_id,
        parent_id: parent.id,
        author_id: ctx.userId,
        author_name: `${ctx.firstName} ${ctx.lastName}`.trim() || "Étudiant",
        author_role: "student",
        body,
      },
      select: { id: true },
    });
  });
  if (created === null) return { ok: false, error: "Commentaire introuvable." };
  if ("error" in created) return { ok: false, error: "Ce point est déjà résolu." };

  await audit(ctx.userId, "thesis_comment.reply", "thesis_comment", created.id, { parentId: commentId });
  revalidatePath(MEMOIRE_PATH);
  return { ok: true, data: { id: created.id } };
}

const resolveSchema = z.object({ commentId: z.uuid(), resolved: z.boolean() });

/** Marque un point de relecture résolu / à reprendre. RLS : seule la colonne status est modifiable. */
export async function setThesisCommentResolvedAction(input: unknown): Promise<ActionResult> {
  const parsed = resolveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Requête invalide." };
  const ctx = await requireStudent(MEMOIRE_PATH);
  const { commentId, resolved } = parsed.data;

  const updated = await withStudent(ctx.userId, async (tx) => {
    const comment = await tx.thesis_comments.findFirst({
      where: { id: commentId },
      select: { id: true, status: true, theses: { select: { user_id: true } } },
    });
    if (!comment || comment.theses.user_id !== ctx.userId) return null;
    if (comment.status === (resolved ? "resolved" : "open")) return comment;
    return tx.thesis_comments.update({ where: { id: comment.id }, data: { status: resolved ? "resolved" : "open" } });
  });
  if (!updated) return { ok: false, error: "Commentaire introuvable." };

  await audit(ctx.userId, resolved ? "thesis_comment.resolve" : "thesis_comment.reopen", "thesis_comment", commentId, {});
  revalidatePath(MEMOIRE_PATH);
  return { ok: true };
}

// ───────────────────────── Dépôts (travaux, rapport, mémoire) ─────────────────────────
// Ces tables n'ont pas de policy d'écriture « authenticated » : comme pour les tentatives de quiz,
// l'écriture se fait côté serveur avec le client privilégié, APRÈS vérification explicite de la
// propriété de l'enregistrement — puis audit.

const scopeSchema = z.enum(["mentorat", "leadership", "rapport", "memoire"]);
type UploadScope = z.infer<typeof scopeSchema>;

const scopePath: Record<UploadScope, string> = {
  mentorat: "/espace-etudiant/edm/mentorat",
  leadership: "/espace-etudiant/edm/leadership",
  rapport: RAPPORT_PATH,
  memoire: MEMOIRE_PATH,
};

/** Vérifie que la cible appartient à l'étudiant et accepte un dépôt en l'état actuel. */
async function checkDepositTarget(ctx: EnrolledContext, scope: UploadScope, targetId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const db = getDb();
  if (!db) return { ok: false, error: "Base de données indisponible." };
  switch (scope) {
    case "mentorat": {
      const w = await db.mentoring_exercises.findUnique({ where: { id: targetId }, select: { user_id: true, status: true } });
      if (!w || w.user_id !== ctx.userId) return { ok: false, error: "Travail introuvable." };
      if (w.status === "submitted" || w.status === "validated") return { ok: false, error: "Ce travail est déjà rendu." };
      return { ok: true };
    }
    case "leadership": {
      const w = await db.leadership_works.findUnique({ where: { id: targetId }, select: { user_id: true, status: true } });
      if (!w || w.user_id !== ctx.userId) return { ok: false, error: "Travail introuvable." };
      if (w.status === "submitted" || w.status === "validated") return { ok: false, error: "Ce travail est déjà rendu." };
      return { ok: true };
    }
    case "rapport": {
      const s = await db.internships.findUnique({ where: { id: targetId }, select: { user_id: true } });
      if (!s || s.user_id !== ctx.userId) return { ok: false, error: "Stage introuvable." };
      return { ok: true };
    }
    case "memoire": {
      const t = await db.theses.findUnique({ where: { id: targetId }, select: { user_id: true } });
      if (!t || t.user_id !== ctx.userId) return { ok: false, error: "Mémoire introuvable." };
      return { ok: true };
    }
  }
}

const uploadRequestSchema = z.object({
  scope: scopeSchema,
  targetId: z.uuid(),
  fileName: z.string().min(1).max(200),
  mime: z.string(),
  size: z.number().int().positive(),
});

/** Demande une URL signée de dépôt (le fichier part directement au stockage privé). */
export async function requestFormationUploadAction(input: unknown): Promise<ActionResult<{ url: string; token: string; path: string }>> {
  const parsed = uploadRequestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Requête invalide." };
  const { scope, targetId, fileName, mime, size } = parsed.data;
  const ctx = await requireStudent(scopePath[scope]);
  const check = await checkDepositTarget(ctx, scope, targetId);
  if (!check.ok) return { ok: false, error: check.error };
  if (!(mime in allowedUploadTypes)) return { ok: false, error: "Format accepté : PDF, DOCX ou image." };
  if (size > maxUploadBytes("document")) return { ok: false, error: "Fichier trop lourd (20 Mo maximum)." };

  const path = `${ctx.userId}/depots/${scope}-${crypto.randomUUID()}-${safeFileName(fileName)}`;
  const signed = await signedUploadUrl(path);
  if (!signed) return { ok: false, error: "Stockage indisponible." };
  return { ok: true, data: signed };
}

const confirmSchema = z.object({
  scope: scopeSchema,
  targetId: z.uuid(),
  path: z.string().min(10).max(300),
  fileName: z.string().min(1).max(200),
});

/** Enregistre le dépôt après vérification du fichier réellement stocké (taille et type relus serveur). */
export async function confirmFormationUploadAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = confirmSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Requête invalide." };
  const { scope, targetId, path, fileName } = parsed.data;
  const ctx = await requireStudent(scopePath[scope]);
  if (!path.startsWith(`${ctx.userId}/depots/`)) return { ok: false, error: "Emplacement de fichier refusé." };
  const check = await checkDepositTarget(ctx, scope, targetId);
  if (!check.ok) return { ok: false, error: check.error };

  const stored = await inspectUpload(path);
  if (!stored) return { ok: false, error: "Le fichier n'a pas été reçu." };
  if (!(stored.mime in allowedUploadTypes)) return { ok: false, error: "Type de fichier refusé." };
  if (stored.size > maxUploadBytes("document")) return { ok: false, error: "Fichier trop lourd." };

  const db = getDb()!;
  let id: string;
  if (scope === "mentorat" || scope === "leadership") {
    const data = { storage_path: path, file_name: fileName, submitted_at: new Date(), status: "submitted" as const };
    const row =
      scope === "mentorat"
        ? await db.mentoring_exercises.update({ where: { id: targetId }, data, select: { id: true } })
        : await db.leadership_works.update({ where: { id: targetId }, data, select: { id: true } });
    id = row.id;
  } else if (scope === "rapport") {
    const max = await db.internship_reports.aggregate({ where: { internship_id: targetId }, _max: { version: true } });
    const row = await db.internship_reports.create({
      data: { internship_id: targetId, user_id: ctx.userId, version: (max._max.version ?? 0) + 1, storage_path: path, file_name: fileName, size_bytes: stored.size, status: "submitted" },
      select: { id: true },
    });
    id = row.id;
  } else {
    const max = await db.thesis_versions.aggregate({ where: { thesis_id: targetId }, _max: { version: true } });
    const row = await db.thesis_versions.create({
      data: { thesis_id: targetId, version: (max._max.version ?? 0) + 1, storage_path: path, file_name: fileName, size_bytes: stored.size, mime_type: stored.mime, author_id: ctx.userId, status: "submitted" },
      select: { id: true },
    });
    id = row.id;
  }

  await audit(ctx.userId, `deposit.${scope}`, scope === "memoire" ? "thesis_version" : scope === "rapport" ? "internship_report" : "work", id, { targetId, size: stored.size, bucket: STUDENT_BUCKET });
  revalidatePath(scopePath[scope]);
  if (scope === "rapport") revalidatePath(STAGE_PATH);
  return { ok: true, data: { id } };
}

const workSchema = z.object({
  kind: z.enum(["mentorat", "leadership"]),
  workId: z.uuid(),
  response: z.string().trim().min(1, "Réponse vide.").max(8000, "Réponse trop longue."),
});

/** Compte rendu d'un exercice de mentorat ou d'un travail de leadership (texte). */
export async function submitWorkAction(input: unknown): Promise<ActionResult> {
  const parsed = workSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Vérifiez votre réponse.", fieldErrors: zodFieldErrors(parsed.error) };

  const limit = await rateLimit("work-submit", { limit: 15, windowMs: 60_000 });
  if (!limit.allowed) return { ok: false, error: tooManyRequests(limit.retryInSec) };

  const { kind, workId, response } = parsed.data;
  const ctx = await requireStudent(scopePath[kind]);
  const check = await checkDepositTarget(ctx, kind, workId);
  if (!check.ok) return { ok: false, error: check.error };

  const data = { response, submitted_at: new Date(), status: "submitted" as const };
  if (kind === "mentorat") await getDb()!.mentoring_exercises.update({ where: { id: workId }, data });
  else await getDb()!.leadership_works.update({ where: { id: workId }, data });

  await audit(ctx.userId, `work.submit.${kind}`, "work", workId, { length: response.length });
  revalidatePath(scopePath[kind]);
  return { ok: true };
}

const reportSchema = z.object({
  internshipId: z.uuid(),
  body: z.string().trim().min(200, "Le rapport est trop court (200 caractères minimum).").max(50_000, "Rapport trop long."),
});

/** Nouvelle version du rapport de stage rédigée en ligne (équivalent au dépôt de fichier). */
export async function submitReportAction(input: unknown): Promise<ActionResult<{ version: number }>> {
  const parsed = reportSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Vérifiez votre rapport.", fieldErrors: zodFieldErrors(parsed.error) };

  const limit = await rateLimit("report-submit", { limit: 10, windowMs: 60_000 });
  if (!limit.allowed) return { ok: false, error: tooManyRequests(limit.retryInSec) };

  const ctx = await requireStudent(RAPPORT_PATH);
  const { internshipId, body } = parsed.data;
  const stage = await getDb()!.internships.findUnique({ where: { id: internshipId }, select: { user_id: true } });
  if (!stage || stage.user_id !== ctx.userId) return { ok: false, error: "Stage introuvable." };

  const max = await getDb()!.internship_reports.aggregate({ where: { internship_id: internshipId }, _max: { version: true } });
  const version = (max._max.version ?? 0) + 1;
  await getDb()!.internship_reports.create({ data: { internship_id: internshipId, user_id: ctx.userId, version, body, status: "submitted" } });

  await audit(ctx.userId, "report.submit", "internship_report", internshipId, { version, length: body.length });
  revalidatePath(RAPPORT_PATH);
  revalidatePath(STAGE_PATH);
  return { ok: true, data: { version } };
}

// ───────────────────────── Fiche de transformation EDM ─────────────────────────

const weeklyReportSchema = z.object({
  prayerDays: z.number().int().min(0, "Entre 0 et 7 jours.").max(7, "Entre 0 et 7 jours."),
  prayerHours: z.string().trim().min(1, "Indiquez le temps de prière.").max(20, "Valeur trop longue."),
  mentoreePrayerTime: z.string().trim().min(1, "Indiquez le temps de prière.").max(20, "Valeur trop longue."),
  methodSimple: z.number().int().min(0).max(60),
  methodOia: z.number().int().min(0).max(60),
  methodTheme: z.number().int().min(0).max(60),
  sermonsCount: z.number().int().min(0).max(60),
  characterTrait: z.string().trim().min(2, "Indiquez le trait travaillé.").max(200, "Texte trop long."),
  titheGiven: z.boolean(),
  soulWon: z.boolean(),
  soulWonDetail: z.string().trim().max(300, "Texte trop long.").default(""),
  invited: z.boolean(),
  invitedDetail: z.string().trim().max(300, "Texte trop long.").default(""),
  departmentsReport: z.string().trim().min(20, "Dites-en un peu plus (20 caractères minimum).").max(8000, "Texte trop long."),
  mentoreesReport: z.string().trim().min(20, "Dites-en un peu plus (20 caractères minimum).").max(8000, "Texte trop long."),
});

/** Fiche de transformation hebdomadaire : une seule par semaine, saisie pendant la fenêtre vendredi 6 h → samedi 23 h 59. */
export async function submitWeeklyReportAction(input: unknown): Promise<ActionResult> {
  const parsed = weeklyReportSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Vérifiez les champs saisis.", fieldErrors: zodFieldErrors(parsed.error) };

  const limit = await rateLimit("weekly-report", { limit: 10, windowMs: 60_000 });
  if (!limit.allowed) return { ok: false, error: tooManyRequests(limit.retryInSec) };

  const ctx = await requireStudent(FICHE_PATH);
  if (ctx.enrollment.formation !== "edm") return { ok: false, error: "Cette fiche est réservée aux étudiants de l'École des Mentors." };

  const window = weeklyReportWindow();
  if (!window.open) return { ok: false, error: "La fiche est fermée : elle s'ouvre le vendredi à 6 h et se ferme le samedi à 23 h 59." };

  const d = parsed.data;
  const weekStart = new Date(`${window.weekStart}T00:00:00Z`);
  const data = {
    prayer_days: d.prayerDays,
    prayer_hours: d.prayerHours,
    mentoree_prayer_time: d.mentoreePrayerTime,
    method_simple: d.methodSimple,
    method_oia: d.methodOia,
    method_theme: d.methodTheme,
    sermons_count: d.sermonsCount,
    character_trait: d.characterTrait,
    tithe_given: d.titheGiven,
    soul_won: d.soulWon,
    soul_won_detail: d.soulWon ? d.soulWonDetail : "",
    invited: d.invited,
    invited_detail: d.invited ? d.invitedDetail : "",
    departments_report: d.departmentsReport,
    mentorees_report: d.mentoreesReport,
    is_example: false,
    updated_at: new Date(),
  };

  const saved = await withStudent(ctx.userId, async (tx) => {
    const existing = await tx.edm_weekly_reports.findUnique({
      where: { user_id_week_start: { user_id: ctx.userId, week_start: weekStart } },
      select: { id: true, status: true },
    });
    if (existing?.status === "validated") return { error: "validated" as const };
    if (existing) return { row: await tx.edm_weekly_reports.update({ where: { id: existing.id }, data }), created: false };
    return { row: await tx.edm_weekly_reports.create({ data: { ...data, user_id: ctx.userId, week_start: weekStart } }), created: true };
  });
  if ("error" in saved) return { ok: false, error: "Cette fiche est déjà validée par votre pasteur — elle n'est plus modifiable." };

  // Première soumission de la semaine : l'équipe pastorale est prévenue.
  if (saved.created) {
    const db = getDb();
    if (db) {
      const staff = await db.user_roles.findMany({ where: { role: { in: ["admin", "pastor"] } }, select: { user_id: true } });
      const name = `${ctx.firstName} ${ctx.lastName}`.trim() || "Un étudiant";
      if (staff.length) {
        await notifyMany(
          db,
          staff.map((s) => ({
            user_id: s.user_id,
            category: "comment" as const,
            title: `Fiche de transformation — ${name}`,
            body: "Nouvelle fiche hebdomadaire EDM à relire.",
            href: `/admin/edm?etudiant=${ctx.userId}`,
          })),
        );
      }
    }
  }

  await audit(ctx.userId, "weekly_report.submit", "edm_weekly_report", saved.row.id, { weekStart: window.weekStart });
  revalidatePath(FICHE_PATH);
  return { ok: true };
}
