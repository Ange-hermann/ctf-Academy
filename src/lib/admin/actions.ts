"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { adminRoleLabels, hasAdminRole, requireStaff, type AdminRole } from "@/lib/admin/session";
import { audit } from "@/lib/student/session";
import { isFormationSlug, type FormationSlug } from "@/content/formations";
import { newReference } from "@/lib/registration/store";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { VOICE_MAX_BYTES, voiceExtension, voiceLabel } from "@/lib/messages/voice";
import { classMembers, classStudentIds, getClassScope, inClass, noClass, quizWhere } from "@/lib/admin/classroom";
import { resolveStagePlace, STAGE_FORMATIONS, studentStageHref } from "@/lib/internships";
import { notifyMany, notifyOne } from "@/lib/notifications/notify";
import { courseMediaMaxBytes, courseMediaTypes, inspectUpload, removeUpload, safeFileName, signedUploadUrl, type CourseMediaKind } from "@/lib/student/storage";
import { zodFieldErrors, type ActionResult } from "@/lib/validation/auth";

/** Écritures d'administration : client privilégié + garde de rôle + audit + notification à l'étudiant. */

type GuardResult =
  | { ok: true; ctx: import("@/lib/student/session").StudentContext; db: NonNullable<ReturnType<typeof getDb>> }
  | { ok: false; error: string };

async function guard(allowed: readonly AdminRole[], from: string): Promise<GuardResult> {
  const ctx = await requireStaff(from);
  if (!hasAdminRole(ctx, allowed)) return { ok: false, error: "Section non autorisée pour votre profil." };
  const db = getDb();
  if (!db) return { ok: false, error: "Base de données indisponible." };
  return { ok: true, ctx, db };
}

async function notify(userId: string, category: "validation" | "grade" | "payment" | "assessment" | "comment", title: string, body: string, href?: string) {
  const db = getDb();
  if (!db) return;
  await notifyOne(db, userId, category, title, body, href);
}

const uuid = z.uuid();

// ───────────────────────── Candidatures ─────────────────────────

const CANDIDATES_PATH = "/admin/candidatures";

const statusSchema = z.object({
  applicationId: uuid,
  field: z.enum(["registration_status", "payment_status", "admission_status"]),
  value: z.string(),
});

const allowedValues: Record<string, readonly string[]> = {
  registration_status: ["draft", "submitted", "complete"],
  payment_status: ["pending", "confirmed", "failed", "refunded", "partial"],
  admission_status: ["under_review", "admitted", "rejected", "waitlisted"],
};

const notifyOn = (field: string, value: string, reference: string) => {
  if (field === "admission_status" && value === "admitted")
    return { title: "Admission accordée", body: `Votre candidature ${reference} est admise. Bienvenue à CTF ACADEMY !`, href: "/espace-etudiant" };
  if (field === "admission_status" && value === "rejected")
    return { title: "Décision sur votre candidature", body: `Votre candidature ${reference} n'a pas été retenue. Contactez l'équipe pour en savoir plus.`, href: "/espace-etudiant/candidature" };
  if (field === "admission_status" && value === "waitlisted")
    return { title: "Candidature en liste d'attente", body: `Votre candidature ${reference} est placée en liste d'attente.`, href: "/espace-etudiant/candidature" };
  if (field === "payment_status" && value === "confirmed")
    return { title: "Paiement confirmé", body: `Le règlement lié à votre candidature ${reference} est confirmé.`, href: "/espace-etudiant/paiements" };
  return null;
};

/** Met à jour l'un des trois statuts de candidature (ils restent indépendants). */
export async function setApplicationStatusAction(input: unknown): Promise<ActionResult> {
  const parsed = statusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Requête invalide." };
  const g = await guard(["admin", "admissions"], CANDIDATES_PATH);
  if (!g.ok) return { ok: false, error: g.error };
  const { ctx, db } = g;

  const { applicationId, field, value } = parsed.data;
  if (!allowedValues[field].includes(value)) return { ok: false, error: "Valeur de statut invalide." };

  const app = await db.applications.findUnique({ where: { id: applicationId }, select: { user_id: true, reference: true, registration_status: true, payment_status: true, admission_status: true } });
  if (!app) return { ok: false, error: "Candidature introuvable." };
  const previous = field === "registration_status" ? app.registration_status : field === "payment_status" ? app.payment_status : app.admission_status;
  await db.applications.update({ where: { id: applicationId }, data: { [field]: value, updated_at: new Date() } });

  const note = notifyOn(field, value, app.reference);
  if (note) await notify(app.user_id, field === "payment_status" ? "payment" : "validation", note.title, note.body, note.href);
  // Admission accordée : l'administrateur principal est prévenu pour créer l'accès de l'étudiant.
  if (field === "admission_status" && value === "admitted") {
    const [admins, student] = await Promise.all([
      db.user_roles.findMany({ where: { role: "admin" }, select: { user_id: true } }),
      db.profiles.findUnique({ where: { id: app.user_id }, select: { first_name: true, last_name: true, email: true } }),
    ]);
    const name = `${student?.first_name ?? ""} ${student?.last_name ?? ""}`.trim() || student?.email || app.reference;
    await notifyMany(
      db,
      admins
        .filter((a) => a.user_id !== ctx.userId)
        .map((a) => ({
          user_id: a.user_id,
          category: "validation" as const,
          title: "Accès étudiant à créer",
          body: `${name} est admis (${app.reference}) — créez son accès dans Accès & rôles.`,
          href: "/admin/acces",
        })),
    );
  }
  await audit(ctx.userId, `application.${field}`, "application", applicationId, { from: previous, to: value });
  revalidatePath(CANDIDATES_PATH);
  revalidatePath(`${CANDIDATES_PATH}/${applicationId}`);
  return { ok: true };
}

// ───────────────────────── Finances ─────────────────────────

const FINANCE_PATH = "/admin/finances";

/** Émet le reçu officiel d'un paiement confirmé (n° unique RCT-AAAA-XXXXXX, idempotent). */
async function issueReceipt(db: DbClient, paymentId: string, userId: string) {
  const existing = await db.receipts.findUnique({ where: { payment_id: paymentId } });
  if (existing) return existing;
  const number = `RCT-${new Date().getFullYear()}-${randomBytes(3).toString("hex").toUpperCase()}`;
  return db.receipts.create({ data: { payment_id: paymentId, user_id: userId, number } });
}

/** Recalcule le statut de paiement d'un dossier depuis ses échéances. */
async function syncApplicationPaymentStatus(db: DbClient, applicationId: string) {
  const schedules = await db.payment_schedules.findMany({ where: { application_id: applicationId } });
  if (!schedules.length) return;
  const allPaid = schedules.every((s) => s.status === "paid");
  const somePaid = schedules.some((s) => s.paid_amount > 0 || s.status === "paid");
  await db.applications.update({
    where: { id: applicationId },
    data: { payment_status: allPaid ? "confirmed" : somePaid ? "partial" : "pending", updated_at: new Date() },
  });
}

const paymentSchema = z.object({ paymentId: uuid, confirm: z.boolean() });

/** Confirme ou marque en échec un paiement, puis recalcule l'échéance et le statut de paiement de la candidature. */
export async function setPaymentStatusAction(input: unknown): Promise<ActionResult> {
  const parsed = paymentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Requête invalide." };
  const g = await guard(["admin", "finance"], FINANCE_PATH);
  if (!g.ok) return { ok: false, error: g.error };
  const { ctx, db } = g;

  const { paymentId, confirm } = parsed.data;
  const payment = await db.payments.findUnique({ where: { id: paymentId }, include: { applications: { select: { id: true, reference: true, user_id: true } }, payment_schedules: true } });
  if (!payment) return { ok: false, error: "Paiement introuvable." };

  await db.payments.update({
    where: { id: paymentId },
    data: { status: confirm ? "confirmed" : "failed", confirmed_at: confirm ? new Date() : null, updated_at: new Date() },
  });

  if (confirm && payment.schedule_id) {
    const schedule = payment.payment_schedules!;
    const paid = schedule.paid_amount + payment.amount;
    await db.payment_schedules.update({
      where: { id: schedule.id },
      data: { paid_amount: paid, status: paid >= schedule.amount ? "paid" : "partial" },
    });
  }

  // Statut de paiement de la candidature : confirmé si tout est réglé, partiel sinon.
  await syncApplicationPaymentStatus(db, payment.application_id);

  if (confirm) {
    await issueReceipt(db, paymentId, payment.applications.user_id);
    await notify(payment.applications.user_id, "payment", "Paiement confirmé", `Votre paiement de ${payment.amount} F CFA pour la candidature ${payment.applications.reference} est confirmé — votre reçu est disponible.`, "/espace-etudiant/paiements");
    // Équipe informée : le dossier peut avancer vers la décision.
    const staff = await db.user_roles.findMany({ where: { role: { in: ["admin", "admissions", "finance"] } }, select: { user_id: true } });
    await notifyMany(
      db,
      staff
        .filter((s) => s.user_id !== ctx.userId)
        .map((s) => ({
          user_id: s.user_id,
          category: "payment" as const,
          title: "Paiement confirmé",
          body: `Règlement confirmé sur ${payment.applications.reference} — le dossier peut avancer vers la décision d'admission.`,
          href: `${CANDIDATES_PATH}/${payment.application_id}`,
        })),
    );
  }
  await audit(ctx.userId, confirm ? "payment.confirm" : "payment.fail", "payment", paymentId, { applicationId: payment.application_id, amount: payment.amount });
  revalidatePath(FINANCE_PATH);
  revalidatePath(`${CANDIDATES_PATH}/${payment.application_id}`);
  return { ok: true };
}

const recordSchema = z.object({
  applicationId: uuid,
  scheduleId: z.union([uuid, z.literal("")]).optional(),
  amount: z.coerce.number().int().min(100, "Montant minimal : 100.").max(50_000_000),
  method: z.enum(["cash", "transfer", "orange_money", "mtn_momo", "wave", "moov_money", "card"]),
  providerReference: z.string().trim().max(80).optional(),
});

/** Enregistre un règlement reçu hors ligne (espèces, virement, mobile money) : paiement confirmé + reçu + échéance + notifications. */
export async function recordPaymentAction(input: unknown): Promise<ActionResult<{ receiptNumber: string }>> {
  const parsed = recordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Vérifiez les champs indiqués.", fieldErrors: zodFieldErrors(parsed.error) };
  const g = await guard(["admin", "finance"], FINANCE_PATH);
  if (!g.ok) return { ok: false, error: g.error };
  const { ctx, db } = g;
  const { applicationId, amount, method, providerReference } = parsed.data;
  const scheduleId = parsed.data.scheduleId || null;

  const app = await db.applications.findUnique({ where: { id: applicationId }, select: { id: true, reference: true, user_id: true } });
  if (!app) return { ok: false, error: "Dossier introuvable." };
  if (scheduleId) {
    const schedule = await db.payment_schedules.findFirst({ where: { id: scheduleId, application_id: applicationId } });
    if (!schedule) return { ok: false, error: "Cette échéance n'appartient pas au dossier choisi." };
    if (schedule.status === "paid") return { ok: false, error: "Cette échéance est déjà entièrement réglée." };
  }

  const now = new Date();
  const payment = await db.payments.create({
    data: {
      application_id: applicationId,
      user_id: app.user_id,
      amount,
      method,
      provider: "saisie manuelle",
      provider_reference: providerReference || null,
      status: "confirmed",
      confirmed_at: now,
      schedule_id: scheduleId,
    },
  });

  if (scheduleId) {
    const schedule = await db.payment_schedules.findUniqueOrThrow({ where: { id: scheduleId } });
    const paid = schedule.paid_amount + amount;
    await db.payment_schedules.update({ where: { id: scheduleId }, data: { paid_amount: paid, status: paid >= schedule.amount ? "paid" : "partial" } });
  }
  await syncApplicationPaymentStatus(db, applicationId);
  const receipt = await issueReceipt(db, payment.id, app.user_id);

  await notify(app.user_id, "payment", "Paiement enregistré", `Un règlement de ${amount} F CFA a été enregistré sur votre dossier ${app.reference} — votre reçu ${receipt.number} est disponible.`, "/espace-etudiant/paiements");
  const staff = await db.user_roles.findMany({ where: { role: { in: ["admin", "admissions", "finance"] } }, select: { user_id: true } });
  await notifyMany(
    db,
    staff
      .filter((s) => s.user_id !== ctx.userId)
      .map((s) => ({
        user_id: s.user_id,
        category: "payment" as const,
        title: "Paiement enregistré",
        body: `Règlement de ${amount} F CFA saisi sur ${app.reference} — le dossier peut avancer.`,
        href: `${CANDIDATES_PATH}/${applicationId}`,
      })),
  );
  await audit(ctx.userId, "payment.record", "payment", payment.id, { applicationId, scheduleId, amount, method });
  revalidatePath(FINANCE_PATH);
  revalidatePath(`${CANDIDATES_PATH}/${applicationId}`);
  return { ok: true, data: { receiptNumber: receipt.number } };
}

// ───────────────────────── Corrections ─────────────────────────

const CORRECTIONS_PATH = "/admin/corrections";

const gradeSchema = z.object({
  attemptId: uuid,
  score: z.number().min(0),
  maxScore: z.number().positive(),
  feedback: z.string().trim().max(2000).optional(),
});

/** Clôture une copie : note globale + retour de correction (les réponses détaillées restent visibles). */
export async function gradeAttemptAction(input: unknown): Promise<ActionResult> {
  const parsed = gradeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Vérifiez la note saisie.", fieldErrors: zodFieldErrors(parsed.error) };
  const g = await guard(["admin", "trainer", "pedagogy", "pastor"], CORRECTIONS_PATH);
  if (!g.ok) return { ok: false, error: g.error };
  const { ctx, db } = g;

  const { attemptId, score, maxScore, feedback } = parsed.data;
  if (score > maxScore) return { ok: false, error: "La note dépasse le barème." };
  const scope = await getClassScope(db, ctx);
  if (noClass(scope)) return { ok: false, error: "Aucune classe ne vous est affectée." };
  const attempt = await db.quiz_attempts.findFirst({
    where: { id: attemptId, status: "submitted", quizzes: quizWhere(scope) },
    include: { quizzes: { select: { title: true } }, profiles: { select: { id: true } } },
  });
  if (!attempt) return { ok: false, error: "Copie introuvable ou déjà corrigée." };

  const grader = `${ctx.firstName} ${ctx.lastName}`.trim() || "Formateur";
  await db.quiz_attempts.update({
    where: { id: attemptId },
    data: { status: "graded", score, max_score: maxScore, feedback: feedback || `Corrigé par ${grader}.` },
  });
  await db.grades.create({
    data: { user_id: attempt.profiles.id, quiz_id: attempt.quiz_id, label: attempt.quizzes.title, score, max_score: maxScore, comment: feedback || null, grader_name: grader, is_example: false },
  });
  await notify(attempt.profiles.id, "grade", "Copie corrigée", `« ${attempt.quizzes.title} » : ${score}/${maxScore}.`, `/espace-etudiant/evaluations/${attempt.quiz_id}/resultat?tentative=${attemptId}`);
  await audit(ctx.userId, "attempt.grade", "quiz_attempt", attemptId, { score, maxScore });
  revalidatePath(CORRECTIONS_PATH);
  return { ok: true };
}

// ───────────────────────── Stages & mémoires ─────────────────────────

const STAGES_PATH = "/admin/stages";

const stepSchema = z.object({ stepId: uuid, status: z.enum(["pending", "in_progress", "validated", "redo"]), comment: z.string().trim().max(500).optional() });

export async function setStepStatusAction(input: unknown): Promise<ActionResult> {
  const parsed = stepSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Requête invalide." };
  const g = await guard(["admin", "supervisor", "pastor"], STAGES_PATH);
  if (!g.ok) return { ok: false, error: g.error };
  const { ctx, db } = g;

  const { stepId, status, comment } = parsed.data;
  const step = await db.internship_steps.findUnique({ where: { id: stepId }, include: { internships: { select: { user_id: true } } } });
  if (!step) return { ok: false, error: "Étape introuvable." };
  await db.internship_steps.update({
    where: { id: stepId },
    data: { status, validated_at: status === "validated" ? new Date() : null, comment: comment ?? step.comment },
  });
  if (status === "validated" || status === "redo") {
    const stagePath = await studentStagePath(db, step.internships.user_id);
    await notify(step.internships.user_id, "validation", status === "validated" ? "Étape de stage validée" : "Étape de stage à reprendre", `« ${step.title} »${comment ? ` — ${comment}` : ""}`, stagePath);
  }
  await audit(ctx.userId, "internship_step.status", "internship_step", stepId, { status });
  revalidatePath(STAGES_PATH);
  return { ok: true };
}

const hoursSchema = z.object({ hourId: uuid, validated: z.boolean() });

export async function setHoursValidatedAction(input: unknown): Promise<ActionResult> {
  const parsed = hoursSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Requête invalide." };
  const g = await guard(["admin", "supervisor", "pastor"], STAGES_PATH);
  if (!g.ok) return { ok: false, error: g.error };
  const { ctx, db } = g;

  const hour = await db.internship_hours.findUnique({ where: { id: parsed.data.hourId } });
  if (!hour) return { ok: false, error: "Entrée introuvable." };
  await db.internship_hours.update({ where: { id: parsed.data.hourId }, data: { validated: parsed.data.validated } });
  await audit(ctx.userId, parsed.data.validated ? "hours.validate" : "hours.unvalidate", "internship_hours", parsed.data.hourId, {});
  revalidatePath(STAGES_PATH);
  return { ok: true };
}

const reportSchema = z.object({
  reportId: uuid,
  status: z.enum(["submitted", "to_fix", "validated"]),
  comment: z.string().trim().max(2000).optional(),
});

export async function setReportStatusAction(input: unknown): Promise<ActionResult> {
  const parsed = reportSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Requête invalide." };
  const g = await guard(["admin", "supervisor", "pastor"], STAGES_PATH);
  if (!g.ok) return { ok: false, error: g.error };
  const { ctx, db } = g;

  const { reportId, status, comment } = parsed.data;
  const report = await db.internship_reports.findUnique({ where: { id: reportId }, include: { internships: { select: { user_id: true } } } });
  if (!report) return { ok: false, error: "Rapport introuvable." };
  await db.internship_reports.update({ where: { id: reportId }, data: { status, supervisor_comment: comment ?? report.supervisor_comment } });
  await notify(report.internships.user_id, "comment", "Retour sur votre rapport de stage", `Version ${report.version} : ${status === "validated" ? "validée" : status === "to_fix" ? "à corriger" : "déposée"}.${comment ? ` ${comment}` : ""}`, "/espace-etudiant/diacres/rapport");
  await audit(ctx.userId, "report.status", "internship_report", reportId, { status });
  revalidatePath(STAGES_PATH);
  return { ok: true };
}

const versionSchema = z.object({ versionId: uuid, status: z.enum(["in_review", "to_fix", "accepted"]) });

export async function setVersionStatusAction(input: unknown): Promise<ActionResult> {
  const parsed = versionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Requête invalide." };
  const g = await guard(["admin", "supervisor", "pastor"], STAGES_PATH);
  if (!g.ok) return { ok: false, error: g.error };
  const { ctx, db } = g;

  const { versionId, status } = parsed.data;
  const version = await db.thesis_versions.findUnique({ where: { id: versionId }, include: { theses: { select: { user_id: true, title: true } } } });
  if (!version) return { ok: false, error: "Version introuvable." };
  await db.thesis_versions.update({ where: { id: versionId }, data: { status } });
  await notify(version.theses.user_id, "comment", "Relecture de votre mémoire", `Version ${version.version} de « ${version.theses.title} » : ${status === "accepted" ? "acceptée" : status === "to_fix" ? "à corriger" : "en relecture"}.`, "/espace-etudiant/diacres/memoire");
  await audit(ctx.userId, "thesis_version.status", "thesis_version", versionId, { status });
  revalidatePath(STAGES_PATH);
  return { ok: true };
}

/** Chemin de la page « Mon stage » selon la formation de l'étudiant. */
async function studentStagePath(db: Prisma.TransactionClient, userId: string): Promise<string> {
  const app = await db.applications.findFirst({
    where: { user_id: userId, admission_status: "admitted" },
    select: { formations: { select: { slug: true } } },
  });
  return studentStageHref(app?.formations.slug ?? "");
}

const createInternshipSchema = z.object({
  studentId: uuid,
  place: z.string().trim().min(3, "Indiquez le lieu ou le département.").max(200, "Lieu trop long."),
  supervisorName: z.string().trim().max(120).optional(),
  startsOn: z.iso.date("Date de début invalide."),
  endsOn: z.iso.date("Date de fin invalide."),
  targetHours: z.number().int().min(1, "Objectif d'heures requis.").max(2000, "Objectif trop élevé."),
  steps: z.string().trim().max(4000).optional(),
});

/** Crée un stage et l'attribue à un étudiant admis : EDS en département de l'Église, EDM à Vase d'honneur. */
export async function createInternshipAction(input: unknown): Promise<ActionResult> {
  const parsed = createInternshipSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Vérifiez les champs saisis.", fieldErrors: zodFieldErrors(parsed.error) };
  const g = await guard(["admin", "supervisor", "pastor"], STAGES_PATH);
  if (!g.ok) return { ok: false, error: g.error };
  const { ctx, db } = g;

  const d = parsed.data;
  const app = await db.applications.findFirst({
    where: { user_id: d.studentId, admission_status: "admitted", formations: { slug: { in: [...STAGE_FORMATIONS] } } },
    select: { formations: { select: { slug: true } } },
  });
  if (!app) return { ok: false, error: "Étudiant admis introuvable — seuls les étudiants EDS, EDM et diacres reçoivent un stage ici." };
  const existing = await db.internships.findUnique({ where: { user_id: d.studentId }, select: { id: true } });
  if (existing) return { ok: false, error: "Cet étudiant a déjà un stage attribué." };

  const resolved = resolveStagePlace(app.formations.slug, d.place);
  if (!resolved.ok) return { ok: false, error: resolved.error };
  const place = resolved.place;

  const startsOn = new Date(`${d.startsOn}T00:00:00Z`);
  const endsOn = new Date(`${d.endsOn}T00:00:00Z`);
  if (endsOn <= startsOn) return { ok: false, error: "La date de fin doit être après la date de début." };

  const stepTitles = (d.steps ?? "").split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 20);
  const stage = await db.internships.create({
    data: {
      user_id: d.studentId,
      place,
      supervisor_name: d.supervisorName || `${ctx.firstName} ${ctx.lastName}`.trim() || "Équipe pastorale",
      starts_on: startsOn,
      ends_on: endsOn,
      target_hours: d.targetHours,
      is_example: false,
      internship_steps: { create: stepTitles.map((title, i) => ({ title, sort_order: i })) },
    },
  });
  const stagePath = await studentStagePath(db, d.studentId);
  await notify(d.studentId, "validation", "Stage attribué", `Un stage vous est attribué : ${place}, du ${d.startsOn.split("-").reverse().join("/")} au ${d.endsOn.split("-").reverse().join("/")} (${d.targetHours} h).`, stagePath);
  await audit(ctx.userId, "internship.create", "internship", stage.id, { studentId: d.studentId, place, formation: app.formations.slug, steps: stepTitles.length });
  revalidatePath(STAGES_PATH);
  revalidatePath("/admin/diacres");
  return { ok: true };
}

// ───────────────────────── Équipe pastorale ─────────────────────────

const PASTORALE_PATH = "/admin/pastorale";

const evalSchema = z.object({
  evaluationId: uuid,
  status: z.enum(["pending", "done"]),
  feedback: z.string().trim().max(2000).optional(),
  scheduledOn: z.iso.date().optional(),
});

export async function setEvaluationAction(input: unknown): Promise<ActionResult> {
  const parsed = evalSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Requête invalide." };
  const g = await guard(["admin", "pastor"], PASTORALE_PATH);
  if (!g.ok) return { ok: false, error: g.error };
  const { ctx, db } = g;

  const { evaluationId, status, feedback, scheduledOn } = parsed.data;
  const evaluation = await db.pastoral_evaluations.findUnique({ where: { id: evaluationId } });
  if (!evaluation) return { ok: false, error: "Évaluation introuvable." };
  const evaluator = `${ctx.firstName} ${ctx.lastName}`.trim() || evaluation.evaluator_name;
  await db.pastoral_evaluations.update({
    where: { id: evaluationId },
    data: {
      status,
      feedback: feedback ?? evaluation.feedback,
      evaluator_name: evaluator,
      scheduled_on: scheduledOn ? new Date(`${scheduledOn}T00:00:00Z`) : evaluation.scheduled_on,
      evaluated_at: status === "done" ? new Date() : null,
    },
  });
  if (status === "done") {
    await notify(evaluation.user_id, "validation", "Bilan pastoral publié", `« ${evaluation.title} » est réalisée — le bilan est dans votre espace.`, "/espace-etudiant/diacres/consecration");
  }
  await audit(ctx.userId, "pastoral_eval.update", "pastoral_evaluation", evaluationId, { status });
  revalidatePath(PASTORALE_PATH);
  return { ok: true };
}

const newEvalSchema = z.object({
  email: z.string().trim().email("E-mail invalide."),
  title: z.string().trim().min(3, "Indiquez un intitulé.").max(140),
  scheduledOn: z.iso.date().optional(),
});

/** Crée une évaluation pastorale pour un étudiant (retrouvé par e-mail). */
export async function createEvaluationAction(input: unknown): Promise<ActionResult> {
  const parsed = newEvalSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Vérifiez le formulaire.", fieldErrors: zodFieldErrors(parsed.error) };
  const g = await guard(["admin", "pastor"], PASTORALE_PATH);
  if (!g.ok) return { ok: false, error: g.error };
  const { ctx, db } = g;

  const { email, title, scheduledOn } = parsed.data;
  const profile = await db.profiles.findFirst({ where: { email: { equals: email, mode: "insensitive" } }, select: { id: true } });
  if (!profile) return { ok: false, error: "Aucun compte ne correspond à cet e-mail." };
  await db.pastoral_evaluations.create({
    data: {
      user_id: profile.id,
      title,
      scheduled_on: scheduledOn ? new Date(`${scheduledOn}T00:00:00Z`) : null,
      evaluator_name: `${ctx.firstName} ${ctx.lastName}`.trim() || null,
      is_example: false,
    },
  });
  await audit(ctx.userId, "pastoral_eval.create", "pastoral_evaluation", profile.id, { title });
  revalidatePath(PASTORALE_PATH);
  return { ok: true };
}

const responsibilitySchema = z.object({
  userId: uuid,
  role: z.string().trim().min(3).max(120),
  place: z.string().trim().min(2).max(120),
  supervisorName: z.string().trim().max(120).optional().or(z.literal("")),
  startsOn: z.iso.date("Date de début invalide."),
  endsOn: z.union([z.iso.date(), z.literal("")]).optional(),
});

/** Affecte un étudiant admis à un département de l'église (responsabilité visible dans son espace). */
export async function assignResponsibilityAction(input: unknown): Promise<ActionResult> {
  const parsed = responsibilitySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Vérifiez le formulaire.", fieldErrors: zodFieldErrors(parsed.error) };
  const g = await guard(["admin", "pastor"], PASTORALE_PATH);
  if (!g.ok) return { ok: false, error: g.error };
  const { ctx, db } = g;
  const d = parsed.data;

  const student = await db.profiles.findUnique({ where: { id: d.userId }, select: { id: true, first_name: true, last_name: true } });
  if (!student) return { ok: false, error: "Étudiant introuvable." };
  const row = await db.responsibilities.create({
    data: {
      user_id: d.userId,
      role: d.role,
      place: d.place,
      supervisor_name: d.supervisorName || `${ctx.firstName} ${ctx.lastName}`.trim() || "Équipe pastorale",
      starts_on: new Date(`${d.startsOn}T00:00:00Z`),
      ends_on: d.endsOn ? new Date(`${d.endsOn}T00:00:00Z`) : null,
      status: "active",
      is_example: false,
    },
  });
  await notify(d.userId, "validation", "Nouvelle affectation", `Vous êtes affecté·e au département « ${d.role} » (${d.place}).`, "/espace-etudiant/edm/responsabilites");
  await audit(ctx.userId, "responsibility.assign", "responsibility", row.id, { userId: d.userId, role: d.role, place: d.place });
  revalidatePath(PASTORALE_PATH);
  return { ok: true };
}

/** Clôture une affectation départementale (statut « completed »). */
export async function completeResponsibilityAction(input: unknown): Promise<ActionResult> {
  const parsed = z.object({ responsibilityId: uuid }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Requête invalide." };
  const g = await guard(["admin", "pastor"], PASTORALE_PATH);
  if (!g.ok) return { ok: false, error: g.error };
  const { ctx, db } = g;

  const row = await db.responsibilities.findUnique({ where: { id: parsed.data.responsibilityId } });
  if (!row) return { ok: false, error: "Affectation introuvable." };
  if (row.status === "completed") return { ok: true };
  await db.responsibilities.update({ where: { id: row.id }, data: { status: "completed", ends_on: new Date() } });
  await notify(row.user_id, "validation", "Affectation clôturée", `Votre mission « ${row.role} » (${row.place}) est terminée — merci pour votre service.`, "/espace-etudiant/edm/responsabilites");
  await audit(ctx.userId, "responsibility.complete", "responsibility", row.id, { userId: row.user_id });
  revalidatePath(PASTORALE_PATH);
  return { ok: true };
}

const caseSchema = z.object({
  userId: uuid,
  kind: z.enum(["consecration", "defense"]),
  title: z.string().trim().min(3).max(160),
});

/** Ouvre un dossier de consécration ou de soutenance pour un étudiant admis (décision rendue ensuite). */
export async function createPastoralCaseAction(input: unknown): Promise<ActionResult> {
  const parsed = caseSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Vérifiez le formulaire.", fieldErrors: zodFieldErrors(parsed.error) };
  const g = await guard(["admin", "pastor"], PASTORALE_PATH);
  if (!g.ok) return { ok: false, error: g.error };
  const { ctx, db } = g;
  const d = parsed.data;

  const app = await db.applications.findFirst({
    where: { user_id: d.userId, admission_status: "admitted" },
    select: { formation_id: true },
  });
  if (!app) return { ok: false, error: "Cet étudiant n'a pas de dossier admis." };
  const v = await db.validations.create({
    data: { user_id: d.userId, formation_id: app.formation_id, kind: d.kind, title: d.title, decision: "pending", is_example: false },
  });
  await audit(ctx.userId, "pastoral_case.create", "validation", v.id, { userId: d.userId, kind: d.kind, title: d.title });
  revalidatePath(PASTORALE_PATH);
  return { ok: true };
}

const decideSchema = z.object({ validationId: uuid, decision: z.enum(["granted", "refused"]) });

/** Rend la décision d'un dossier de consécration ou de soutenance — accordée : certificat vérifiable émis. */
export async function decideValidationAction(input: unknown): Promise<ActionResult> {
  const parsed = decideSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Requête invalide." };
  const g = await guard(["admin", "pastor"], PASTORALE_PATH);
  if (!g.ok) return { ok: false, error: g.error };
  const { ctx, db } = g;

  const v = await db.validations.findUnique({ where: { id: parsed.data.validationId } });
  if (!v || !["consecration", "defense"].includes(v.kind)) return { ok: false, error: "Dossier introuvable." };
  if (v.decision !== "pending") return { ok: false, error: "La décision est déjà rendue." };

  const granted = parsed.data.decision === "granted";
  const certificate = granted ? `CTF-${v.kind.toUpperCase()}-${new Date().getFullYear()}-${randomBytes(3).toString("hex").toUpperCase()}` : null;
  await db.validations.update({
    where: { id: v.id },
    data: {
      decision: parsed.data.decision,
      decided_at: new Date(),
      signatory: `${ctx.firstName} ${ctx.lastName}`.trim() || "Équipe pastorale",
      certificate_number: certificate,
    },
  });
  const kindLabel = v.kind === "consecration" ? "consécration" : "soutenance";
  await notify(
    v.user_id,
    "validation",
    granted ? "Décision favorable" : "Décision rendue",
    granted ? `Votre ${kindLabel} « ${v.title} » est accordée — votre certificat est disponible dans Validations.` : `La décision concernant « ${v.title} » (${kindLabel}) est rendue — consultez votre espace.`,
    "/espace-etudiant/validations",
  );
  await audit(ctx.userId, `validation.${parsed.data.decision}`, "validation", v.id, { kind: v.kind, certificate });
  revalidatePath(PASTORALE_PATH);
  return { ok: true };
}

/** Marque (ou retire) la reconnaissance d'une activité de service d'un étudiant diacre. */
export async function recognizeServiceAction(input: unknown): Promise<ActionResult> {
  const parsed = z.object({ serviceId: uuid, recognized: z.boolean() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Requête invalide." };
  const g = await guard(["admin", "supervisor", "pastor"], "/admin/diacres");
  if (!g.ok) return { ok: false, error: g.error };
  const { ctx, db } = g;

  const row = await db.service_records.findUnique({ where: { id: parsed.data.serviceId } });
  if (!row) return { ok: false, error: "Service introuvable." };
  await db.service_records.update({ where: { id: row.id }, data: { recognized: parsed.data.recognized } });
  if (parsed.data.recognized) {
    await notify(row.user_id, "validation", "Service reconnu", `Votre service « ${row.activity} » (${row.department}) est reconnu par l'équipe pastorale.`, "/espace-etudiant/diacres/consecration");
  }
  await audit(ctx.userId, parsed.data.recognized ? "service.recognize" : "service.unrecognize", "service_record", row.id, { userId: row.user_id, activity: row.activity });
  revalidatePath("/admin/diacres");
  return { ok: true };
}

const EDM_PATH = "/admin/edm";

/** Valide (ou dévalide) une fiche de transformation EDM et enregistre l'observation du relecteur. */
export async function reviewEdmReportAction(input: unknown): Promise<ActionResult> {
  const parsed = z
    .object({
      reportId: uuid,
      validated: z.boolean(),
      observation: z.string().trim().max(4000, "Observation trop longue.").optional(),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "Requête invalide." };
  const g = await guard(["admin", "pastor"], EDM_PATH);
  if (!g.ok) return { ok: false, error: g.error };
  const { ctx, db } = g;

  const report = await db.edm_weekly_reports.findUnique({ where: { id: parsed.data.reportId } });
  if (!report) return { ok: false, error: "Fiche introuvable." };
  const app = await db.applications.findFirst({
    where: { user_id: report.user_id, admission_status: "admitted", formations: { slug: "edm" } },
    select: { id: true },
  });
  if (!app) return { ok: false, error: "Cette fiche n'appartient pas à un étudiant EDM admis." };

  const { validated, observation } = parsed.data;
  await db.edm_weekly_reports.update({
    where: { id: report.id },
    data: {
      status: validated ? "validated" : "submitted",
      observation: observation ?? report.observation,
      validated_by: validated ? ctx.userId : null,
      validated_at: validated ? new Date() : null,
      updated_at: new Date(),
    },
  });
  if (validated) {
    const week = report.week_start.toISOString().slice(0, 10).split("-").reverse().join("/");
    await notify(
      report.user_id,
      "validation",
      "Fiche de transformation validée",
      `Votre fiche de la semaine du ${week} est validée par l'équipe pastorale${observation ? " — une observation vous attend." : "."}`,
      "/espace-etudiant/edm/fiche",
    );
  }
  await audit(ctx.userId, validated ? "weekly_report.validate" : "weekly_report.unvalidate", "edm_weekly_report", report.id, { userId: report.user_id, hasObservation: Boolean(observation) });
  revalidatePath(EDM_PATH);
  revalidatePath("/espace-etudiant/edm/fiche");
  return { ok: true };
}

// ───────────────────────── Accès & rôles ─────────────────────────

const ACCESS_PATH = "/admin/acces";

const roleSchema = z.object({
  userId: uuid,
  role: z.enum(["admin", "admissions", "pedagogy", "trainer", "finance", "supervisor", "pastor"]),
});

export async function grantRoleAction(input: unknown): Promise<ActionResult> {
  const parsed = roleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Requête invalide." };
  const g = await guard(["admin"], ACCESS_PATH);
  if (!g.ok) return { ok: false, error: g.error };
  const { ctx, db } = g;

  const { userId, role } = parsed.data;
  await db.user_roles.upsert({
    where: { user_id_role: { user_id: userId, role } },
    create: { user_id: userId, role },
    update: {},
  });
  await notify(userId, "validation", "Nouvel accès administratif", "Un accès à l'espace d'administration vous a été attribué.", "/admin");
  await audit(ctx.userId, "role.grant", "user_role", userId, { role });
  revalidatePath(ACCESS_PATH);
  return { ok: true };
}

export async function revokeRoleAction(input: unknown): Promise<ActionResult> {
  const parsed = roleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Requête invalide." };
  const g = await guard(["admin"], ACCESS_PATH);
  if (!g.ok) return { ok: false, error: g.error };
  const { ctx, db } = g;
  const { userId, role } = parsed.data;
  if (userId === ctx.userId && role === "admin") return { ok: false, error: "Vous ne pouvez pas retirer votre propre accès administrateur." };

  await db.user_roles.deleteMany({ where: { user_id: userId, role } });
  await audit(ctx.userId, "role.revoke", "user_role", userId, { role });
  revalidatePath(ACCESS_PATH);
  return { ok: true };
}

// ───────────────────────── Ma classe (formateur) ─────────────────────────

const CLASS_PATH = "/admin/ma-classe";

type DbClient = NonNullable<ReturnType<typeof getDb>>;
type Ctx = import("@/lib/student/session").StudentContext;

const scopeError = { ok: false as const, error: "Cet élément ne fait pas partie de votre classe." };

/** Étudiants concernés par un contenu : admis de la formation, au niveau visé (tous si pas de niveau). */
const audience = (db: DbClient, formationId: string, levelId: string | null) =>
  classStudentIds(db, { all: false, units: [{ formationId, levelId }] });

const trainerClassSchema = z.object({ trainerId: uuid, formationId: uuid, levelId: z.union([uuid, z.literal("")]).optional() });

/**
 * Affecte LA classe d'un formateur (formation + niveau) — réservé à l'administration.
 * Un formateur n'a qu'une classe : une nouvelle affectation remplace la précédente.
 */
export async function assignTrainerClassAction(input: unknown): Promise<ActionResult> {
  const parsed = trainerClassSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Requête invalide." };
  const g = await guard(["admin"], ACCESS_PATH);
  if (!g.ok) return { ok: false, error: g.error };
  const { ctx, db } = g;
  const { trainerId, formationId } = parsed.data;
  const levelId = parsed.data.levelId || null;

  const [isTrainer, isAdmin, formation] = await Promise.all([
    db.user_roles.findFirst({ where: { user_id: trainerId, role: "trainer" } }),
    db.user_roles.findFirst({ where: { user_id: trainerId, role: "admin" } }),
    db.formations.findUnique({ where: { id: formationId }, select: { name: true, slug: true, levels: { select: { id: true, number: true } } } }),
  ]);
  if (!isTrainer) return { ok: false, error: "Attribuez d'abord le profil « Formateur » à ce compte." };
  if (isAdmin) return { ok: false, error: "Un administrateur n'a pas de classe : il gère les accès de toute l'équipe." };
  if (!formation) return { ok: false, error: "Formation introuvable." };
  if (formation.levels.length && !levelId) return { ok: false, error: "Choisissez le niveau de la classe." };
  const level = formation.levels.find((l) => l.id === levelId);
  if (levelId && !level) return { ok: false, error: "Ce niveau n'appartient pas à la formation." };

  await db.trainer_assignments.upsert({
    where: { trainer_id: trainerId },
    create: { trainer_id: trainerId, formation_id: formationId, level_id: levelId },
    update: { formation_id: formationId, level_id: levelId, created_at: new Date() },
  });
  const label = `${formation.slug.toUpperCase()}${level ? ` niveau ${level.number}` : ""}`;
  await notify(trainerId, "validation", "Classe attribuée", `La classe ${label} vous est confiée : vous gérez ses étudiants, ses contenus et ses évaluations.`, CLASS_PATH);
  await audit(ctx.userId, "trainer.assign", "trainer_assignment", trainerId, { formationId, levelId });
  revalidatePath(ACCESS_PATH);
  revalidatePath(CLASS_PATH);
  return { ok: true };
}

/** Retire sa classe à un formateur. */
export async function revokeTrainerClassAction(input: unknown): Promise<ActionResult> {
  const parsed = z.object({ trainerId: uuid }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Requête invalide." };
  const g = await guard(["admin"], ACCESS_PATH);
  if (!g.ok) return { ok: false, error: g.error };
  const { ctx, db } = g;
  const { trainerId } = parsed.data;

  await db.trainer_assignments.deleteMany({ where: { trainer_id: trainerId } });
  await audit(ctx.userId, "trainer.unassign", "trainer_assignment", trainerId, {});
  revalidatePath(ACCESS_PATH);
  revalidatePath(CLASS_PATH);
  return { ok: true };
}

const questionSchema = z.object({
  prompt: z.string().trim().min(2).max(500),
  kind: z.enum(["single", "multiple", "true_false", "short", "long", "file"]),
  points: z.coerce.number().int().min(1).max(100),
  options: z.array(z.string().trim().min(1).max(200)).max(8).default([]),
  /** Bonnes réponses : libellés d'options (single/multiple), « vrai »/« faux », ou réponses acceptées (short). */
  correct: z.array(z.string().trim().min(1).max(200)).max(8).default([]),
});

const assessmentSchema = z.object({
  formationId: uuid,
  moduleId: z.union([uuid, z.literal("")]).optional(),
  levelId: z.union([uuid, z.literal("")]).optional(),
  kind: z.enum(["quiz", "exercise", "exam"]),
  title: z.string().trim().min(3).max(160),
  instructions: z.string().trim().max(4000).optional().or(z.literal("")),
  attachmentUrl: z.union([z.url(), z.literal("")]).optional(),
  dueAt: z.union([z.string().datetime({ local: true }), z.literal("")]).optional(),
  durationMinutes: z.coerce.number().int().min(0).max(600).optional(),
  maxAttempts: z.coerce.number().int().min(1).max(5).default(1),
  passScore: z.coerce.number().int().min(0).max(100).default(60),
  questions: z.array(questionSchema).max(50).default([]),
});

const kindLabel: Record<string, string> = { quiz: "Quiz", exercise: "Devoir", exam: "Examen" };

/** Crée une évaluation (quiz, devoir ou examen) pour une formation de la classe du formateur. */
export async function createAssessmentAction(input: unknown): Promise<ActionResult> {
  const parsed = assessmentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Données invalides.", fieldErrors: zodFieldErrors(parsed.error) };
  const g = await guard(["admin", "trainer", "pedagogy", "pastor"], CLASS_PATH);
  if (!g.ok) return { ok: false, error: g.error };
  const { ctx, db } = g;
  const d = parsed.data;

  const scope = await getClassScope(db, ctx);
  if (noClass(scope)) return { ok: false, error: "Aucune classe ne vous est affectée." };
  // Le formateur crée toujours pour le niveau de SA classe ; l'administration peut cibler un niveau précis.
  const unitLevel = scope.all ? null : (scope.units.find((u) => u.formationId === d.formationId)?.levelId ?? null);
  let levelId = scope.all ? d.levelId || null : (unitLevel ?? d.levelId ?? null);
  if (d.moduleId) {
    const mod = await db.modules.findUnique({ where: { id: d.moduleId }, select: { formation_id: true, level_id: true } });
    if (!mod || mod.formation_id !== d.formationId) return { ok: false, error: "Ce module n'appartient pas à la formation choisie." };
    if (!inClass(scope, { formationId: mod.formation_id, levelId: mod.level_id })) return scopeError;
    levelId ??= mod.level_id;
  }
  if (!inClass(scope, { formationId: d.formationId, levelId })) return scopeError;
  if (levelId) {
    const lvl = await db.levels.findUnique({ where: { id: levelId }, select: { formation_id: true } });
    if (!lvl || lvl.formation_id !== d.formationId) return { ok: false, error: "Ce niveau n'appartient pas à la formation choisie." };
  }
  for (const q of d.questions) {
    if (["single", "multiple"].includes(q.kind)) {
      if (q.options.length < 2) return { ok: false, error: "Ajoutez au moins deux options aux questions à choix." };
      if (!q.correct.length) return { ok: false, error: "Indiquez la ou les bonnes réponses (QCM corrigé automatiquement)." };
      if (!q.correct.every((c) => q.options.includes(c))) return { ok: false, error: "Les bonnes réponses doivent correspondre aux options proposées." };
    }
    if (q.kind === "true_false" && !["vrai", "faux"].includes(q.correct[0] ?? ""))
      return { ok: false, error: "Choisissez la bonne réponse (Vrai ou Faux)." };
    if (q.kind === "short" && !q.correct.length) return { ok: false, error: "Indiquez au moins une réponse acceptée." };
  }

  const quiz = await db.quizzes.create({
    data: {
      formation_id: d.formationId,
      module_id: d.moduleId || null,
      level_id: levelId,
      kind: d.kind,
      title: d.title,
      instructions: d.instructions || "",
      attachment_url: d.attachmentUrl || null,
      due_at: d.dueAt ? new Date(d.dueAt) : null,
      duration_minutes: d.durationMinutes || null,
      max_attempts: d.maxAttempts,
      pass_score: d.passScore,
      is_example: false,
      questions: {
        create: d.questions.map((q, i) => {
          // Options au format {id,label} attendu par le lecteur de quiz ; corrigé en question_keys pour l'auto-correction.
          const opts = q.options.map((label, j) => ({ id: `opt${j + 1}`, label }));
          let key: Prisma.InputJsonValue | undefined;
          if (q.kind === "single") key = opts.find((o) => o.label === q.correct[0])?.id;
          else if (q.kind === "multiple") key = opts.filter((o) => q.correct.includes(o.label)).map((o) => o.id);
          else if (q.kind === "true_false") key = q.correct[0] === "vrai";
          else if (q.kind === "short") key = q.correct;
          return {
            prompt: q.prompt,
            kind: q.kind,
            points: q.points,
            options: opts,
            sort_order: i,
            ...(key !== undefined ? { question_keys: { create: { answer: key } } } : {}),
          };
        }),
      },
    },
  });
  const students = await audience(db, d.formationId, levelId);
  if (students.length) {
    const label = kindLabel[d.kind] ?? "Évaluation";
    await notifyMany(
      db,
      students.map((user_id) => ({
        user_id,
        category: "assessment" as const,
        title: `${label} — ${d.title}`,
        body: d.dueAt
          ? `Nouveau ${label.toLowerCase()} à rendre pour le ${new Date(d.dueAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}.`
          : `Un nouveau ${label.toLowerCase()} est disponible dans votre espace.`,
        href: "/espace-etudiant/evaluations",
      })),
    );
  }
  await audit(ctx.userId, "assessment.create", "quiz", quiz.id, { title: d.title, kind: d.kind, formationId: d.formationId });
  revalidatePath(CLASS_PATH);
  revalidatePath("/admin/pedagogie");
  revalidatePath("/admin/corrections");
  return { ok: true };
}

/** Supprime une évaluation encore jamais passée (protection des copies existantes). */
export async function deleteAssessmentAction(input: unknown): Promise<ActionResult> {
  const parsed = z.object({ quizId: uuid }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Requête invalide." };
  const g = await guard(["admin", "trainer", "pedagogy", "pastor"], CLASS_PATH);
  if (!g.ok) return { ok: false, error: g.error };
  const { ctx, db } = g;
  const { quizId } = parsed.data;

  const scope = await getClassScope(db, ctx);
  const quiz = await db.quizzes.findFirst({ where: { id: quizId, AND: [quizWhere(scope)] }, select: { title: true, _count: { select: { quiz_attempts: true } } } });
  if (!quiz) return scopeError;
  if (quiz._count.quiz_attempts) return { ok: false, error: "Impossible de supprimer une évaluation déjà passée par des étudiants." };

  await db.quizzes.delete({ where: { id: quizId } });
  await audit(ctx.userId, "assessment.delete", "quiz", quizId, { title: quiz.title });
  revalidatePath(CLASS_PATH);
  revalidatePath("/admin/pedagogie");
  return { ok: true };
}

const uploadRef = z.object({ path: z.string().min(10).max(300), fileName: z.string().min(1).max(200) });

const resourceSchema = z.object({
  moduleId: uuid,
  kind: z.enum(["pdf", "link", "document", "audio", "video"]),
  title: z.string().trim().min(2).max(160),
  url: z.union([z.url("Lien invalide."), z.literal("")]).optional(),
  upload: uploadRef.optional(),
});

const KINDS_ROLES = ["admin", "trainer", "pedagogy", "pastor"] as const;

const coursePrefix = (moduleId: string) => `cours/${moduleId}/`;

const uploadRequestSchema = z.object({
  moduleId: uuid,
  fileName: z.string().min(1).max(200),
  mime: z.string().max(150),
  size: z.number().int().positive(),
});

/** URL signée de dépôt d'un média de cours (audio, vidéo, PDF, document) — limitée aux modules de la classe. */
export async function requestCourseUploadAction(input: unknown): Promise<ActionResult<{ url: string; path: string }>> {
  const parsed = uploadRequestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Requête invalide." };
  const g = await guard(KINDS_ROLES, CLASS_PATH);
  if (!g.ok) return { ok: false, error: g.error };
  const { ctx, db } = g;
  const { moduleId, fileName, mime, size } = parsed.data;

  const check = await scopedModule(db, ctx, moduleId);
  if (!check.ok) return { ok: false, error: check.error };
  const kind = courseMediaTypes[mime as keyof typeof courseMediaTypes];
  if (!kind) return { ok: false, error: "Format non accepté : audio (MP3, M4A, WAV, OGG), vidéo (MP4, WEBM, MOV), PDF, Word, PowerPoint, Excel ou image." };
  if (size > courseMediaMaxBytes[kind]) return { ok: false, error: `Fichier trop lourd (${Math.round(courseMediaMaxBytes[kind] / 1024 / 1024)} Mo maximum pour ce type).` };

  const signed = await signedUploadUrl(`${coursePrefix(moduleId)}${crypto.randomUUID()}-${safeFileName(fileName)}`);
  if (!signed) return { ok: false, error: "Stockage indisponible." };
  return { ok: true, data: { url: signed.url, path: signed.path } };
}

/** Relit le fichier réellement stocké (emplacement, type, taille) avant de l'enregistrer en base. */
async function verifyCourseUpload(moduleId: string, path: string): Promise<{ ok: false; error: string } | { ok: true; kind: CourseMediaKind; size: number }> {
  if (!path.startsWith(coursePrefix(moduleId)) || path.includes("..")) return { ok: false, error: "Emplacement de fichier refusé." };
  const stored = await inspectUpload(path);
  if (!stored) return { ok: false, error: "Le fichier n'a pas été reçu." };
  const kind = courseMediaTypes[stored.mime as keyof typeof courseMediaTypes];
  if (!kind || stored.size > courseMediaMaxBytes[kind]) {
    await removeUpload(path);
    return { ok: false, error: "Fichier refusé (type ou taille)." };
  }
  return { ok: true, kind, size: stored.size };
}

async function scopedModule(db: DbClient, ctx: Ctx, moduleId: string): Promise<{ ok: false; error: string } | { ok: true }> {
  const scope = await getClassScope(db, ctx);
  if (noClass(scope)) return { ok: false, error: "Aucune classe ne vous est affectée." };
  const mod = await db.modules.findUnique({ where: { id: moduleId }, select: { formation_id: true, level_id: true } });
  if (!mod) return { ok: false, error: "Module introuvable." };
  if (!inClass(scope, { formationId: mod.formation_id, levelId: mod.level_id })) return { ok: false, error: "Ce module ne fait pas partie de votre classe." };
  return { ok: true };
}

/** Ajoute un document ou un lien pédagogique à un module de la classe. */
export async function createResourceAction(input: unknown): Promise<ActionResult> {
  const parsed = resourceSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Données invalides.", fieldErrors: zodFieldErrors(parsed.error) };
  const g = await guard(KINDS_ROLES, CLASS_PATH);
  if (!g.ok) return { ok: false, error: g.error };
  const { ctx, db } = g;
  const d = parsed.data;

  const check = await scopedModule(db, ctx, d.moduleId);
  if (!check.ok) return { ok: false, error: check.error };

  if (d.upload) {
    const file = await verifyCourseUpload(d.moduleId, d.upload.path);
    if (!file.ok) return { ok: false, error: file.error };
    await db.resources.create({ data: { module_id: d.moduleId, kind: file.kind, title: d.title, storage_path: d.upload.path, size_bytes: file.size } });
  } else {
    if (!d.url) return { ok: false, error: "Ajoutez un fichier ou un lien." };
    await db.resources.create({ data: { module_id: d.moduleId, kind: d.kind, title: d.title, url: d.url } });
  }
  await audit(ctx.userId, "resource.create", "module", d.moduleId, { title: d.title, kind: d.kind, uploaded: !!d.upload });
  revalidatePath(CLASS_PATH);
  revalidatePath("/espace-etudiant/cours");
  return { ok: true };
}

const slugify = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

const lessonSchema = z.object({
  moduleId: uuid,
  title: z.string().trim().min(3).max(160),
  kind: z.enum(["video", "audio", "text", "pdf", "live"]),
  content: z.string().trim().max(20000).optional().or(z.literal("")),
  /** Lien externe (vidéo hébergée, audio, PDF en ligne) — alternative au fichier déposé. */
  mediaUrl: z.union([z.url(), z.literal("")]).optional(),
  durationMinutes: z.coerce.number().int().min(0).max(600).optional(),
  upload: uploadRef.optional(),
});

/** Type de fichier attendu par format de leçon (texte et direct : pièce jointe libre). */
const expectedMedia: Partial<Record<string, CourseMediaKind>> = { video: "video", audio: "audio", pdf: "pdf" };
const mediaLabels: Record<CourseMediaKind, string> = { video: "une vidéo", audio: "un fichier audio", pdf: "un PDF", document: "un document" };

/** Ajoute une leçon (cours, vidéo, document) à un module de la classe. */
export async function createLessonAction(input: unknown): Promise<ActionResult> {
  const parsed = lessonSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Données invalides.", fieldErrors: zodFieldErrors(parsed.error) };
  const g = await guard(KINDS_ROLES, CLASS_PATH);
  if (!g.ok) return { ok: false, error: g.error };
  const { ctx, db } = g;
  const d = parsed.data;

  const check = await scopedModule(db, ctx, d.moduleId);
  if (!check.ok) return { ok: false, error: check.error };

  const expected = expectedMedia[d.kind];
  if (expected && !d.upload && !d.mediaUrl) return { ok: false, error: `Déposez ${mediaLabels[expected]} ou indiquez un lien.` };
  let file: { kind: CourseMediaKind; size: number } | null = null;
  if (d.upload) {
    const verified = await verifyCourseUpload(d.moduleId, d.upload.path);
    if (!verified.ok) return { ok: false, error: verified.error };
    if (expected && verified.kind !== expected) {
      await removeUpload(d.upload.path);
      return { ok: false, error: `Le fichier doit être ${mediaLabels[expected]} pour ce format de leçon.` };
    }
    file = { kind: verified.kind, size: verified.size };
  }

  const base = slugify(d.title) || "lecon";
  let slug = base;
  for (let i = 2; await db.lessons.findFirst({ where: { module_id: d.moduleId, slug } }); i += 1) slug = `${base}-${i}`;

  const last = await db.lessons.findFirst({ where: { module_id: d.moduleId }, orderBy: { sort_order: "desc" }, select: { sort_order: true } });
  const lesson = await db.lessons.create({
    data: {
      module_id: d.moduleId,
      slug,
      title: d.title,
      kind: d.kind,
      content: d.content || "",
      video_url: d.kind === "video" && !file ? d.mediaUrl || null : null,
      duration_minutes: d.durationMinutes || 0,
      sort_order: (last?.sort_order ?? 0) + 1,
      is_example: false,
    },
  });
  // Le média (déposé ou lien audio/PDF) devient une ressource rattachée à la leçon : le lecteur l'affiche en tête.
  if (file && d.upload) {
    await db.resources.create({
      data: { module_id: d.moduleId, lesson_id: lesson.id, kind: file.kind, title: d.upload.fileName, storage_path: d.upload.path, size_bytes: file.size },
    });
  } else if (d.mediaUrl && (d.kind === "audio" || d.kind === "pdf")) {
    await db.resources.create({ data: { module_id: d.moduleId, lesson_id: lesson.id, kind: d.kind, title: d.title, url: d.mediaUrl } });
  }
  await audit(ctx.userId, "lesson.create", "lesson", lesson.id, { title: d.title, moduleId: d.moduleId, uploaded: !!file });
  revalidatePath(CLASS_PATH);
  revalidatePath("/espace-etudiant/cours");
  return { ok: true };
}

/** Retire un étudiant admis de la classe : il perd l'accès complet et retombe sur le suivi de candidature. */
export async function removeClassStudentAction(input: unknown): Promise<ActionResult> {
  const parsed = z.object({ userId: uuid }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Requête invalide." };
  const g = await guard(KINDS_ROLES, CLASS_PATH);
  if (!g.ok) return { ok: false, error: g.error };
  const { ctx, db } = g;
  const { userId } = parsed.data;

  const scope = await getClassScope(db, ctx);
  const member = (await classMembers(db, scope)).find((m) => m.userId === userId);
  const application = member
    ? await db.applications.findUnique({ where: { id: member.applicationId }, include: { formations: { select: { name: true } } } })
    : null;
  if (!application) return { ok: false, error: "Étudiant introuvable dans votre classe." };

  await db.applications.update({ where: { id: application.id }, data: { admission_status: "rejected", updated_at: new Date() } });
  await notify(
    userId,
    "validation",
    "Retrait de la formation",
    `Vous avez été retiré de la formation ${application.formations.name}. Contactez l'administration pour plus d'informations.`,
    "/espace-etudiant/candidature",
  );
  await audit(ctx.userId, "class.student_remove", "application", application.id, { userId });
  revalidatePath(CLASS_PATH);
  revalidatePath(`${CLASS_PATH}/${userId}`);
  return { ok: true };
}

// ───────────────────────── Messagerie formateur ↔ étudiants ─────────────────────────

const MESSAGES_PATH = `${CLASS_PATH}/messages`;

/** Étudiants de la classe (formation + niveau en cours) — limite la messagerie au périmètre du formateur. */
const myStudentIds = async (db: DbClient, ctx: Ctx) => classStudentIds(db, await getClassScope(db, ctx));

const replySchema = z.object({ threadId: uuid, body: z.string().trim().min(1, "Message vide.").max(4000, "Message trop long.") });

/** Répond dans un fil avec un étudiant de la classe — le formateur devient l'interlocuteur du fil. */
export async function sendClassMessageAction(input: unknown): Promise<ActionResult> {
  const parsed = replySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Vérifiez votre message.", fieldErrors: zodFieldErrors(parsed.error) };
  const g = await guard(KINDS_ROLES, MESSAGES_PATH);
  if (!g.ok) return { ok: false, error: g.error };
  const { ctx, db } = g;
  const { threadId, body } = parsed.data;

  const studentIds = await myStudentIds(db, ctx);
  const thread = await db.message_threads.findFirst({ where: { id: threadId, student_id: { in: studentIds } }, select: { id: true, student_id: true } });
  if (!thread) return { ok: false, error: "Fil de discussion introuvable dans votre classe." };

  const staffName = `${ctx.firstName} ${ctx.lastName}`.trim() || "Formateur";
  await db.messages.create({ data: { thread_id: threadId, author_id: ctx.userId, author_name: staffName, body } });
  await db.message_threads.update({ where: { id: threadId }, data: { updated_at: new Date(), staff_id: ctx.userId, staff_name: staffName } });
  await notify(thread.student_id, "comment", "Message de votre formateur", `${staffName} vous a répondu.`, `/espace-etudiant/messages/formateurs?fil=${threadId}`);
  await audit(ctx.userId, "class_message.send", "message_threads", threadId, {});
  revalidatePath(MESSAGES_PATH);
  revalidatePath(`${MESSAGES_PATH}/${threadId}`);
  return { ok: true };
}

const classThreadSchema = z.object({
  studentId: uuid,
  subject: z.string().trim().min(3, "Indiquez un sujet.").max(140, "Sujet trop long."),
  body: z.string().trim().min(1, "Message vide.").max(4000, "Message trop long."),
});

/** Ouvre un fil avec un étudiant de la classe — visible dans son canal « Formateurs ». */
export async function createClassThreadAction(input: unknown): Promise<ActionResult> {
  const parsed = classThreadSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Vérifiez les champs.", fieldErrors: zodFieldErrors(parsed.error) };
  const g = await guard(KINDS_ROLES, MESSAGES_PATH);
  if (!g.ok) return { ok: false, error: g.error };
  const { ctx, db } = g;
  const { studentId, subject, body } = parsed.data;

  const studentIds = await myStudentIds(db, ctx);
  if (!studentIds.includes(studentId)) return { ok: false, error: "Cet étudiant ne fait pas partie de votre classe." };

  const staffName = `${ctx.firstName} ${ctx.lastName}`.trim() || "Formateur";
  const thread = await db.message_threads.create({
    data: {
      student_id: studentId,
      staff_id: ctx.userId,
      staff_name: staffName,
      category: "trainer",
      subject,
      messages: { create: { author_id: ctx.userId, author_name: staffName, body } },
    },
    select: { id: true },
  });
  await notify(studentId, "comment", "Message de votre formateur", `${staffName} : « ${subject} »`, `/espace-etudiant/messages/formateurs?fil=${thread.id}`);
  await audit(ctx.userId, "class_thread.create", "message_threads", thread.id, { studentId });
  revalidatePath(MESSAGES_PATH);
  return { ok: true };
}

const staffVoicePrefix = (threadId: string) => `messages/${threadId}/`;

/** Fil appartenant à un étudiant de la classe, ou null. */
async function classThread(db: DbClient, ctx: Ctx, threadId: string) {
  const studentIds = await myStudentIds(db, ctx);
  return db.message_threads.findFirst({ where: { id: threadId, student_id: { in: studentIds } }, select: { id: true, student_id: true } });
}

/** URL signée pour déposer un message vocal du formateur dans un fil de sa classe. */
export async function requestClassVoiceUploadAction(input: unknown): Promise<ActionResult<{ url: string; path: string }>> {
  const parsed = z.object({ threadId: uuid, mime: z.string().max(80), size: z.number().int().positive() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Requête invalide." };
  const g = await guard(KINDS_ROLES, MESSAGES_PATH);
  if (!g.ok) return { ok: false, error: g.error };
  const { ctx, db } = g;
  const { threadId, mime, size } = parsed.data;

  const ext = voiceExtension(mime);
  if (!ext) return { ok: false, error: "Format audio non pris en charge par ce navigateur." };
  if (size > VOICE_MAX_BYTES) return { ok: false, error: "Message vocal trop long (10 Mo maximum)." };
  if (!(await classThread(db, ctx, threadId))) return { ok: false, error: "Fil de discussion introuvable dans votre classe." };

  const signed = await signedUploadUrl(`${staffVoicePrefix(threadId)}${crypto.randomUUID()}.${ext}`);
  if (!signed) return { ok: false, error: "Stockage indisponible." };
  return { ok: true, data: { url: signed.url, path: signed.path } };
}

/** Enregistre le message vocal du formateur et prévient l'étudiant. */
export async function sendClassVoiceMessageAction(input: unknown): Promise<ActionResult> {
  const parsed = z.object({ threadId: uuid, path: z.string().min(10).max(300), durationSec: z.number().int().min(1).max(600) }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Message vocal invalide." };
  const g = await guard(KINDS_ROLES, MESSAGES_PATH);
  if (!g.ok) return { ok: false, error: g.error };
  const { ctx, db } = g;
  const { threadId, path, durationSec } = parsed.data;

  const thread = await classThread(db, ctx, threadId);
  if (!thread) return { ok: false, error: "Fil de discussion introuvable dans votre classe." };
  if (!path.startsWith(staffVoicePrefix(threadId)) || path.includes("..")) return { ok: false, error: "Emplacement de fichier refusé." };
  const stored = await inspectUpload(path);
  if (!stored || !stored.mime.startsWith("audio/") || stored.size > VOICE_MAX_BYTES) {
    if (stored) await removeUpload(path);
    return { ok: false, error: "Le message vocal n'a pas été reçu correctement." };
  }

  const staffName = `${ctx.firstName} ${ctx.lastName}`.trim() || "Formateur";
  const msg = await db.messages.create({
    data: {
      thread_id: threadId,
      author_id: ctx.userId,
      author_name: staffName,
      body: voiceLabel(durationSec),
      attachment_path: path,
      attachment_name: `message-vocal.${path.split(".").pop()}`,
    },
    select: { id: true },
  });
  await db.message_threads.update({ where: { id: threadId }, data: { updated_at: new Date(), staff_id: ctx.userId, staff_name: staffName } });
  await notify(thread.student_id, "comment", "Message vocal de votre formateur", `${staffName} vous a envoyé un message vocal.`, `/espace-etudiant/messages/formateurs?fil=${threadId}`);
  await audit(ctx.userId, "class_message.voice", "messages", msg.id, { durationSec, size: stored.size });
  revalidatePath(`${MESSAGES_PATH}/${threadId}`);
  return { ok: true };
}

/** Marque lus les messages de l'étudiant quand le formateur ouvre le fil. */
export async function markClassThreadReadAction(threadId: unknown) {
  const parsed = uuid.safeParse(threadId);
  if (!parsed.success) return;
  const g = await guard(KINDS_ROLES, MESSAGES_PATH);
  if (!g.ok) return;
  const { ctx, db } = g;
  const studentIds = await myStudentIds(db, ctx);
  await db.messages.updateMany({
    where: { read_at: null, author_id: { not: ctx.userId }, message_threads: { id: parsed.data, student_id: { in: studentIds } } },
    data: { read_at: new Date() },
  });
}

// ───────────────────────── Planning & annonces (Pédagogie) ─────────────────────────

const PEDAGOGY_PATH = "/admin/pedagogie";

/**
 * Cible d'une écriture de planning : la formation doit être celle de la classe ; le niveau est
 * celui de la classe du formateur (null pour l'administration = toute la formation).
 */
async function scopedFormation(db: DbClient, ctx: Ctx, formationId: string): Promise<{ ok: false; error: string } | { ok: true; levelId: string | null }> {
  const scope = await getClassScope(db, ctx);
  if (noClass(scope)) return { ok: false, error: "Aucune classe ne vous est affectée." };
  const unit = scope.all ? null : scope.units.find((u) => u.formationId === formationId);
  const levelId = scope.all ? null : (unit?.levelId ?? null);
  if (!inClass(scope, { formationId, levelId })) return { ok: false, error: "Cette formation ne fait pas partie de votre classe." };
  return { ok: true, levelId };
}

/** Un élément de planning existant peut-il être modifié par l'utilisateur ? */
async function canEditPlanned(db: DbClient, ctx: Ctx, item: { formation_id: string | null; level_id: string | null }) {
  const scope = await getClassScope(db, ctx);
  if (scope.all) return true;
  return !!item.formation_id && inClass(scope, { formationId: item.formation_id, levelId: item.level_id });
}

/** Notifie les étudiants concernés : la classe (formation + niveau), ou toute la formation. */
async function notifyClass(db: DbClient, formationId: string, levelId: string | null, title: string, body: string, href: string) {
  const students = await audience(db, formationId, levelId);
  if (!students.length) return;
  await notifyMany(
    db,
    students.map((user_id) => ({ user_id, category: "announcement" as const, title, body, href })),
  );
}

const moduleSchema = z.object({
  formationId: uuid,
  levelId: z.union([uuid, z.literal("")]).optional(),
  title: z.string().trim().min(3).max(160),
  summary: z.string().trim().max(400).optional().or(z.literal("")),
  durationMinutes: z.coerce.number().int().min(0).max(2000).optional(),
});

/** Crée un module dans le programme d'une formation — structure pédagogique, réservée à l'admin et au responsable pédagogique. */
export async function createModuleAction(input: unknown): Promise<ActionResult> {
  const parsed = moduleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Données invalides.", fieldErrors: zodFieldErrors(parsed.error) };
  const g = await guard(["admin", "pedagogy"], PEDAGOGY_PATH);
  if (!g.ok) return { ok: false, error: g.error };
  const { ctx, db } = g;
  const d = parsed.data;
  const levelId = d.levelId || null;

  const formation = await db.formations.findUnique({ where: { id: d.formationId }, select: { id: true } });
  if (!formation) return { ok: false, error: "Formation introuvable." };
  if (levelId) {
    const level = await db.levels.findFirst({ where: { id: levelId, formation_id: d.formationId }, select: { id: true } });
    if (!level) return { ok: false, error: "Ce niveau n'appartient pas à la formation choisie." };
  }

  const base = slugify(d.title) || "module";
  let slug = base;
  for (let i = 2; await db.modules.findFirst({ where: { formation_id: d.formationId, slug } }); i += 1) slug = `${base}-${i}`;
  const last = await db.modules.findFirst({ where: { formation_id: d.formationId, level_id: levelId }, orderBy: { sort_order: "desc" }, select: { sort_order: true } });
  const mod = await db.modules.create({
    data: {
      formation_id: d.formationId,
      level_id: levelId,
      slug,
      title: d.title,
      summary: d.summary || "",
      duration_minutes: d.durationMinutes || 0,
      sort_order: (last?.sort_order ?? 0) + 1,
      is_example: false,
    },
  });
  await audit(ctx.userId, "module.create", "module", mod.id, { title: d.title, formationId: d.formationId, levelId });
  revalidatePath(PEDAGOGY_PATH);
  revalidatePath(CLASS_PATH);
  revalidatePath("/espace-etudiant/cours");
  return { ok: true };
}

const sessionSchema = z.object({
  formationId: uuid,
  moduleId: z.union([uuid, z.literal("")]).optional(),
  title: z.string().trim().min(3).max(160),
  startsAt: z.string().datetime({ local: true }),
  durationMinutes: z.coerce.number().int().min(5).max(600),
  zoomUrl: z.union([z.url(), z.literal("")]).optional(),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
});

/** Programme un cours en direct : il apparaît dans le calendrier des étudiants de la formation. */
export async function createLiveSessionAction(input: unknown): Promise<ActionResult> {
  const parsed = sessionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Données invalides.", fieldErrors: zodFieldErrors(parsed.error) };
  const g = await guard(KINDS_ROLES, PEDAGOGY_PATH);
  if (!g.ok) return { ok: false, error: g.error };
  const { ctx, db } = g;
  const d = parsed.data;

  const scope = await scopedFormation(db, ctx, d.formationId);
  if (!scope.ok) return { ok: false, error: scope.error };
  let levelId = scope.levelId;
  if (d.moduleId) {
    const mod = await db.modules.findUnique({ where: { id: d.moduleId }, select: { formation_id: true, level_id: true } });
    if (!mod || mod.formation_id !== d.formationId) return { ok: false, error: "Ce module n'appartient pas à la formation choisie." };
    if (levelId && mod.level_id !== levelId) return { ok: false, error: "Ce module ne fait pas partie de votre classe." };
    levelId ??= mod.level_id;
  }

  const session = await db.live_sessions.create({
    data: {
      formation_id: d.formationId,
      level_id: levelId,
      module_id: d.moduleId || null,
      title: d.title,
      description: d.description || "",
      starts_at: new Date(d.startsAt),
      duration_minutes: d.durationMinutes,
      zoom_url: d.zoomUrl || null,
      is_example: false,
    },
  });
  await notifyClass(
    db,
    d.formationId,
    levelId,
    "Cours en direct programmé",
    `« ${d.title} » — ${new Date(d.startsAt).toLocaleString("fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}.`,
    "/espace-etudiant/calendrier",
  );
  await audit(ctx.userId, "live_session.create", "live_sessions", session.id, { title: d.title, formationId: d.formationId });
  revalidatePath(PEDAGOGY_PATH);
  revalidatePath("/espace-etudiant/calendrier");
  return { ok: true };
}

const idSchema = z.object({ id: uuid });

/** Supprime une séance en direct. */
export async function deleteLiveSessionAction(input: unknown): Promise<ActionResult> {
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Requête invalide." };
  const g = await guard(KINDS_ROLES, PEDAGOGY_PATH);
  if (!g.ok) return { ok: false, error: g.error };
  const { ctx, db } = g;
  const { id } = parsed.data;

  const session = await db.live_sessions.findUnique({ where: { id }, select: { formation_id: true, level_id: true, title: true } });
  if (!session) return { ok: false, error: "Séance introuvable." };
  if (!(await canEditPlanned(db, ctx, session))) return scopeError;

  await db.live_sessions.delete({ where: { id } });
  await audit(ctx.userId, "live_session.delete", "live_sessions", id, { title: session.title });
  revalidatePath(PEDAGOGY_PATH);
  revalidatePath("/espace-etudiant/calendrier");
  return { ok: true };
}

const eventSchema = z.object({
  formationId: uuid,
  title: z.string().trim().min(3).max(160),
  startsAt: z.string().datetime({ local: true }),
  endsAt: z.union([z.string().datetime({ local: true }), z.literal("")]).optional(),
  zoomUrl: z.union([z.url(), z.literal("")]).optional(),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
});

/** Ajoute un événement au calendrier de la formation (jalon : rentrée, réunion, remise…). */
export async function createCalendarEventAction(input: unknown): Promise<ActionResult> {
  const parsed = eventSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Données invalides.", fieldErrors: zodFieldErrors(parsed.error) };
  const g = await guard(KINDS_ROLES, PEDAGOGY_PATH);
  if (!g.ok) return { ok: false, error: g.error };
  const { ctx, db } = g;
  const d = parsed.data;

  const scope = await scopedFormation(db, ctx, d.formationId);
  if (!scope.ok) return { ok: false, error: scope.error };

  const event = await db.calendar_events.create({
    data: {
      formation_id: d.formationId,
      level_id: scope.levelId,
      kind: "milestone",
      title: d.title,
      description: d.description || "",
      starts_at: new Date(d.startsAt),
      ends_at: d.endsAt ? new Date(d.endsAt) : null,
      zoom_url: d.zoomUrl || null,
      is_example: false,
    },
  });
  await notifyClass(db, d.formationId, scope.levelId, "Nouvel événement", `« ${d.title} » — ${new Date(d.startsAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}.`, "/espace-etudiant/calendrier");
  await audit(ctx.userId, "calendar_event.create", "calendar_events", event.id, { title: d.title, formationId: d.formationId });
  revalidatePath(PEDAGOGY_PATH);
  revalidatePath("/espace-etudiant/calendrier");
  return { ok: true };
}

/** Supprime un événement du calendrier. */
export async function deleteCalendarEventAction(input: unknown): Promise<ActionResult> {
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Requête invalide." };
  const g = await guard(KINDS_ROLES, PEDAGOGY_PATH);
  if (!g.ok) return { ok: false, error: g.error };
  const { ctx, db } = g;
  const { id } = parsed.data;

  const event = await db.calendar_events.findUnique({ where: { id }, select: { formation_id: true, level_id: true, title: true } });
  if (!event) return { ok: false, error: "Événement introuvable." };
  if (!(await canEditPlanned(db, ctx, event))) return scopeError;

  await db.calendar_events.delete({ where: { id } });
  await audit(ctx.userId, "calendar_event.delete", "calendar_events", id, { title: event.title });
  revalidatePath(PEDAGOGY_PATH);
  revalidatePath("/espace-etudiant/calendrier");
  return { ok: true };
}

const announcementSchema = z.object({
  formationId: uuid,
  title: z.string().trim().min(3).max(160),
  body: z.string().trim().min(3).max(4000),
  pinned: z.boolean().optional(),
});

/** Publie une annonce pour la classe — visible dans le canal « Annonces » des étudiants. */
export async function createAnnouncementAction(input: unknown): Promise<ActionResult> {
  const parsed = announcementSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Données invalides.", fieldErrors: zodFieldErrors(parsed.error) };
  const g = await guard(KINDS_ROLES, PEDAGOGY_PATH);
  if (!g.ok) return { ok: false, error: g.error };
  const { ctx, db } = g;
  const d = parsed.data;

  const scope = await scopedFormation(db, ctx, d.formationId);
  if (!scope.ok) return { ok: false, error: scope.error };

  const authorName = `${ctx.firstName} ${ctx.lastName}`.trim() || "Formateur";
  const ann = await db.announcements.create({
    data: { formation_id: d.formationId, level_id: scope.levelId, title: d.title, body: d.body, pinned: d.pinned ?? false, author_name: authorName, is_example: false },
  });
  await notifyClass(db, d.formationId, scope.levelId, "Annonce de la classe", `« ${d.title} »`, "/espace-etudiant/messages/annonces");
  await audit(ctx.userId, "announcement.create", "announcements", ann.id, { title: d.title, formationId: d.formationId });
  revalidatePath(PEDAGOGY_PATH);
  revalidatePath("/espace-etudiant/messages/annonces");
  return { ok: true };
}

/** Supprime une annonce de la classe. */
export async function deleteAnnouncementAction(input: unknown): Promise<ActionResult> {
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Requête invalide." };
  const g = await guard(KINDS_ROLES, PEDAGOGY_PATH);
  if (!g.ok) return { ok: false, error: g.error };
  const { ctx, db } = g;
  const { id } = parsed.data;

  const ann = await db.announcements.findUnique({ where: { id }, select: { formation_id: true, level_id: true, title: true } });
  if (!ann) return { ok: false, error: "Annonce introuvable." };
  if (!(await canEditPlanned(db, ctx, ann))) return scopeError;

  await db.announcements.delete({ where: { id } });
  await audit(ctx.userId, "announcement.delete", "announcements", id, { title: ann.title });
  revalidatePath(PEDAGOGY_PATH);
  revalidatePath("/espace-etudiant/messages/annonces");
  return { ok: true };
}

// ───────────────────────── Paramétrage du site ─────────────────────────

const SETTINGS_PATH = "/admin/parametres";

const settingsSchema = z.object({
  whatsappNumber: z.string().trim().regex(/^$|^\+?[0-9 ().-]{8,20}$/, "Numéro invalide (format international, ex. 2250700000000)."),
  contactEmail: z.union([z.literal(""), z.email("Adresse e-mail invalide.")]),
  registrationsOpen: z.boolean(),
  registrationNotice: z.string().trim().max(500, "Message trop long."),
});

/** Enregistre les réglages du site — chaque clé est auditée avec son ancienne valeur. */
export async function updateSiteSettingsAction(input: unknown): Promise<ActionResult> {
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Vérifiez les champs indiqués.", fieldErrors: zodFieldErrors(parsed.error) };
  const g = await guard(["admin"], SETTINGS_PATH);
  if (!g.ok) return { ok: false, error: g.error };
  const { ctx, db } = g;
  const { whatsappNumber, contactEmail, registrationsOpen, registrationNotice } = parsed.data;

  const values: Record<string, string> = {
    whatsapp_number: whatsappNumber.replace(/\D/g, ""),
    contact_email: contactEmail,
    registrations_open: registrationsOpen ? "true" : "false",
    registration_notice: registrationNotice,
  };
  const previous = await db.site_settings.findMany({ where: { key: { in: Object.keys(values) } }, select: { key: true, value: true } });
  const before = new Map(previous.map((r) => [r.key, r.value]));
  for (const [key, value] of Object.entries(values)) {
    if (before.get(key) === value) continue;
    await db.site_settings.upsert({
      where: { key },
      create: { key, value, updated_by: ctx.userId },
      update: { value, updated_at: new Date(), updated_by: ctx.userId },
    });
    await audit(ctx.userId, "site_settings.update", "site_settings", key, { from: before.get(key) ?? "", to: value });
  }
  // Toutes les pages publiques relisent les réglages (numéro d'assistance, ouverture des inscriptions).
  revalidatePath("/", "layout");
  revalidatePath(SETTINGS_PATH);
  return { ok: true };
}

// ───────────────────────── Assistance : fils « Administratif » + tickets ─────────────────────────

const ASSISTANCE_PATH = "/admin/assistance";
const SUPPORT_ROLES = ["admin", "admissions"] as const;

/** Fil Administratif existant, ou null — aucun périmètre de classe : ce canal est géré par l'administration. */
const adminThread = (db: DbClient, threadId: string) =>
  db.message_threads.findFirst({ where: { id: threadId, category: "administrative" }, select: { id: true, student_id: true } });

/** Répond dans un fil Administratif — le staff devient l'interlocuteur du fil. */
export async function sendAdminMessageAction(input: unknown): Promise<ActionResult> {
  const parsed = replySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Vérifiez votre message.", fieldErrors: zodFieldErrors(parsed.error) };
  const g = await guard(SUPPORT_ROLES, ASSISTANCE_PATH);
  if (!g.ok) return { ok: false, error: g.error };
  const { ctx, db } = g;
  const { threadId, body } = parsed.data;

  const thread = await adminThread(db, threadId);
  if (!thread) return { ok: false, error: "Fil de discussion introuvable." };

  const staffName = `${ctx.firstName} ${ctx.lastName}`.trim() || "Administration";
  await db.messages.create({ data: { thread_id: threadId, author_id: ctx.userId, author_name: staffName, body } });
  await db.message_threads.update({ where: { id: threadId }, data: { updated_at: new Date(), staff_id: ctx.userId, staff_name: staffName } });
  await notify(thread.student_id, "comment", "Réponse de l'administration", `${staffName} vous a répondu.`, `/espace-etudiant/messages/administratif?fil=${threadId}`);
  await audit(ctx.userId, "admin_message.send", "message_threads", threadId, {});
  revalidatePath(ASSISTANCE_PATH);
  revalidatePath(`${ASSISTANCE_PATH}/${threadId}`);
  return { ok: true };
}

/** URL signée pour déposer un message vocal de l'administration dans un fil Administratif. */
export async function requestAdminVoiceUploadAction(input: unknown): Promise<ActionResult<{ url: string; path: string }>> {
  const parsed = z.object({ threadId: uuid, mime: z.string().max(80), size: z.number().int().positive() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Requête invalide." };
  const g = await guard(SUPPORT_ROLES, ASSISTANCE_PATH);
  if (!g.ok) return { ok: false, error: g.error };
  const { db } = g;
  const { threadId, mime, size } = parsed.data;

  const ext = voiceExtension(mime);
  if (!ext) return { ok: false, error: "Format audio non pris en charge par ce navigateur." };
  if (size > VOICE_MAX_BYTES) return { ok: false, error: "Message vocal trop long (10 Mo maximum)." };
  if (!(await adminThread(db, threadId))) return { ok: false, error: "Fil de discussion introuvable." };

  const signed = await signedUploadUrl(`${staffVoicePrefix(threadId)}${crypto.randomUUID()}.${ext}`);
  if (!signed) return { ok: false, error: "Stockage indisponible." };
  return { ok: true, data: { url: signed.url, path: signed.path } };
}

/** Enregistre le message vocal de l'administration et prévient l'étudiant. */
export async function sendAdminVoiceMessageAction(input: unknown): Promise<ActionResult> {
  const parsed = z.object({ threadId: uuid, path: z.string().min(10).max(300), durationSec: z.number().int().min(1).max(600) }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Message vocal invalide." };
  const g = await guard(SUPPORT_ROLES, ASSISTANCE_PATH);
  if (!g.ok) return { ok: false, error: g.error };
  const { ctx, db } = g;
  const { threadId, path, durationSec } = parsed.data;

  const thread = await adminThread(db, threadId);
  if (!thread) return { ok: false, error: "Fil de discussion introuvable." };
  if (!path.startsWith(staffVoicePrefix(threadId)) || path.includes("..")) return { ok: false, error: "Emplacement de fichier refusé." };
  const stored = await inspectUpload(path);
  if (!stored || !stored.mime.startsWith("audio/") || stored.size > VOICE_MAX_BYTES) {
    if (stored) await removeUpload(path);
    return { ok: false, error: "Le message vocal n'a pas été reçu correctement." };
  }

  const staffName = `${ctx.firstName} ${ctx.lastName}`.trim() || "Administration";
  const msg = await db.messages.create({
    data: {
      thread_id: threadId,
      author_id: ctx.userId,
      author_name: staffName,
      body: voiceLabel(durationSec),
      attachment_path: path,
      attachment_name: `message-vocal.${path.split(".").pop()}`,
    },
    select: { id: true },
  });
  await db.message_threads.update({ where: { id: threadId }, data: { updated_at: new Date(), staff_id: ctx.userId, staff_name: staffName } });
  await notify(thread.student_id, "comment", "Message vocal de l'administration", `${staffName} vous a envoyé un message vocal.`, `/espace-etudiant/messages/administratif?fil=${threadId}`);
  await audit(ctx.userId, "admin_message.voice", "messages", msg.id, { durationSec, size: stored.size });
  revalidatePath(`${ASSISTANCE_PATH}/${threadId}`);
  return { ok: true };
}

/** Marque lus les messages de l'étudiant quand le staff ouvre le fil Administratif. */
export async function markAdminThreadReadAction(threadId: unknown) {
  const parsed = uuid.safeParse(threadId);
  if (!parsed.success) return;
  const g = await guard(SUPPORT_ROLES, ASSISTANCE_PATH);
  if (!g.ok) return;
  const { ctx, db } = g;
  await db.messages.updateMany({
    where: { read_at: null, author_id: { not: ctx.userId }, message_threads: { id: parsed.data, category: "administrative" } },
    data: { read_at: new Date() },
  });
}

// ───────────────────────── Tickets d'assistance ─────────────────────────

const ticketSchema = z.object({
  ticketId: uuid,
  status: z.enum(["open", "in_progress", "resolved"]),
  resolution: z.string().trim().max(1000, "Résolution trop longue.").optional(),
});

/** Met à jour le statut d'un ticket (avec une résolution quand il est clos) et prévient l'étudiant. */
export async function setTicketStatusAction(input: unknown): Promise<ActionResult> {
  const parsed = ticketSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Requête invalide." };
  const g = await guard(SUPPORT_ROLES, ASSISTANCE_PATH);
  if (!g.ok) return { ok: false, error: g.error };
  const { ctx, db } = g;
  const { ticketId, status, resolution } = parsed.data;

  const ticket = await db.support_tickets.findUnique({ where: { id: ticketId }, select: { user_id: true, subject: true, status: true } });
  if (!ticket) return { ok: false, error: "Ticket introuvable." };
  if (status === "resolved" && !resolution?.trim()) return { ok: false, error: "Indiquez la réponse apportée à l'étudiant." };

  await db.support_tickets.update({
    where: { id: ticketId },
    data: { status, resolution: status === "resolved" ? resolution!.trim() : null, updated_at: new Date() },
  });
  if (status === "resolved") {
    await notify(ticket.user_id, "validation", "Votre demande a été traitée", `« ${ticket.subject} » : ${resolution!.trim()}`, "/espace-etudiant/messages");
  } else if (ticket.status === "resolved") {
    await notify(ticket.user_id, "comment", "Votre demande a été rouverte", `« ${ticket.subject} » repasse en traitement.`, "/espace-etudiant/messages");
  }
  await audit(ctx.userId, "support_ticket.status", "support_tickets", ticketId, { from: ticket.status, to: status });
  revalidatePath(ASSISTANCE_PATH);
  revalidatePath("/admin");
  return { ok: true };
}

// ───────────────────────── Création d'accès ─────────────────────────

const createAccessSchema = z.object({
  firstName: z.string().trim().min(2, "Prénom requis.").max(60),
  lastName: z.string().trim().min(2, "Nom requis.").max(60),
  email: z.email("Adresse e-mail invalide."),
  phone: z.string().trim().max(20).optional(),
  kind: z.enum(["student", "admin", "admissions", "pedagogy", "trainer", "finance", "supervisor", "pastor"]),
  formationSlug: z.string().trim().max(30).optional(),
});

/**
 * Crée un accès complet, réservé à l'administrateur principal :
 * — « student » : compte + profil + dossier admis et réglé (accès complet immédiat) ;
 * — rôle d'équipe : compte + profil + rôle d'administration (formateur sans classe à ce stade).
 * Dans les deux cas : notification de bienvenue à la personne, notification à l'équipe
 * et lien de première connexion à transmettre pour le choix du mot de passe.
 */
export async function createAccessAction(input: unknown): Promise<ActionResult<{ link: string | null }>> {
  const parsed = createAccessSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Vérifiez les champs indiqués.", fieldErrors: zodFieldErrors(parsed.error) };
  const g = await guard(["admin"], ACCESS_PATH);
  if (!g.ok) return { ok: false, error: g.error };
  const { ctx, db } = g;
  const { firstName, lastName, email, phone, kind, formationSlug } = parsed.data;

  let formation: { id: string; name: string; slug: string } | null = null;
  let validSlug: FormationSlug | null = null;
  if (kind === "student") {
    formation = await db.formations.findUnique({ where: { slug: formationSlug ?? "" }, select: { id: true, name: true, slug: true } });
    if (!formation) return { ok: false, error: "Choisissez la formation de l'étudiant." };
    if (!isFormationSlug(formation.slug)) return { ok: false, error: "Cette formation n'accepte pas les inscriptions en ligne." };
    validSlug = formation.slug;
  }
  if (await db.profiles.findFirst({ where: { email: { equals: email.trim(), mode: "insensitive" } } })) return { ok: false, error: "Un compte existe déjà avec cet e-mail." };

  const admin = createSupabaseAdminClient();
  if (!admin) return { ok: false, error: "Service d'authentification indisponible (clé de service manquante)." };
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password: randomBytes(18).toString("base64url") + "Aa1!",
    email_confirm: true,
    user_metadata: { first_name: firstName, last_name: lastName, ...(phone ? { phone } : {}) },
  });
  if (createError || !created.user) return { ok: false, error: "La création du compte a échoué — cet e-mail est peut-être déjà utilisé." };
  const userId = created.user.id;

  try {
    await db.user_roles.upsert({ where: { user_id_role: { user_id: userId, role: kind } }, create: { user_id: userId, role: kind }, update: {} });
    if (kind === "student" && formation && validSlug) {
      // Dossier « admis » créé par l'administration : inscription complète et réglée → accès complet immédiat.
      await db.applications.create({
        data: {
          reference: newReference(validSlug),
          user_id: userId,
          formation_id: formation.id,
          registration_status: "complete",
          payment_status: "confirmed",
          admission_status: "admitted",
          submitted_at: new Date(),
          completed_at: new Date(),
          answers: { source: "created_by_admin", created_by: ctx.userId },
        },
      });
    }
  } catch {
    // Évite un compte orphelin si l'écriture du dossier échoue.
    await admin.auth.admin.deleteUser(userId);
    return { ok: false, error: "La création de l'accès a échoué — aucun compte n'a été créé." };
  }

  // Lien de première connexion : la personne choisit son mot de passe — à lui transmettre.
  const { data: linkData } = await admin.auth.admin.generateLink({ type: "recovery", email });
  const link = linkData?.properties?.action_link ?? null;

  const isStudent = kind === "student";
  const kindLabel = isStudent ? `étudiant en ${formation?.name}` : adminRoleLabels[kind].toLowerCase();
  await notify(
    userId,
    "validation",
    isStudent ? "Bienvenue à CTF ACADEMY" : "Bienvenue dans l'équipe CTF ACADEMY",
    isStudent
      ? `Vous êtes admis en ${formation?.name}. Connectez-vous avec le lien transmis par l'équipe pour choisir votre mot de passe.`
      : `Le profil « ${adminRoleLabels[kind]} » vous a été attribué. Connectez-vous avec le lien transmis pour choisir votre mot de passe et ouvrir votre espace d'administration.`,
    isStudent ? "/espace-etudiant" : "/admin",
  );
  const admins = await db.user_roles.findMany({ where: { role: "admin" }, select: { user_id: true } });
  await notifyMany(
    db,
    admins
      .filter((a) => a.user_id !== ctx.userId)
      .map((a) => ({
        user_id: a.user_id,
        category: "validation" as const,
        title: "Accès créé",
        body: `${firstName} ${lastName} (${email}) — accès ${kindLabel} créé.`,
        href: "/admin/acces",
      })),
  );
  await audit(ctx.userId, "access.create", "profiles", userId, { email, kind, formation: formation?.slug ?? null });
  revalidatePath(ACCESS_PATH);
  if (isStudent) revalidatePath("/admin/candidatures");
  return { ok: true, data: { link } };
}
