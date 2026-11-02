"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { hasAdminRole, requireStaff, type AdminRole } from "@/lib/admin/session";
import { audit } from "@/lib/student/session";
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
  await getDb()?.notifications.create({ data: { user_id: userId, category, title, body, href } });
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
  await audit(ctx.userId, `application.${field}`, "application", applicationId, { from: previous, to: value });
  revalidatePath(CANDIDATES_PATH);
  revalidatePath(`${CANDIDATES_PATH}/${applicationId}`);
  return { ok: true };
}

// ───────────────────────── Finances ─────────────────────────

const FINANCE_PATH = "/admin/finances";

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
  const schedules = await db.payment_schedules.findMany({ where: { application_id: payment.application_id } });
  if (schedules.length) {
    const allPaid = schedules.every((s) => s.status === "paid");
    const somePaid = schedules.some((s) => s.paid_amount > 0 || s.status === "paid");
    await db.applications.update({
      where: { id: payment.application_id },
      data: { payment_status: allPaid ? "confirmed" : somePaid ? "partial" : "pending", updated_at: new Date() },
    });
  }

  if (confirm) {
    await notify(payment.applications.user_id, "payment", "Paiement confirmé", `Votre paiement de ${payment.amount} F CFA pour la candidature ${payment.applications.reference} est confirmé.`, "/espace-etudiant/paiements");
  }
  await audit(ctx.userId, confirm ? "payment.confirm" : "payment.fail", "payment", paymentId, { applicationId: payment.application_id, amount: payment.amount });
  revalidatePath(FINANCE_PATH);
  revalidatePath(`${CANDIDATES_PATH}/${payment.application_id}`);
  return { ok: true };
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
  const g = await guard(["admin", "trainer", "pedagogy"], CORRECTIONS_PATH);
  if (!g.ok) return { ok: false, error: g.error };
  const { ctx, db } = g;

  const { attemptId, score, maxScore, feedback } = parsed.data;
  if (score > maxScore) return { ok: false, error: "La note dépasse le barème." };
  const attempt = await db.quiz_attempts.findFirst({
    where: { id: attemptId, status: "submitted" },
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
  const g = await guard(["admin", "supervisor"], STAGES_PATH);
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
    await notify(step.internships.user_id, "validation", status === "validated" ? "Étape de stage validée" : "Étape de stage à reprendre", `« ${step.title} »${comment ? ` — ${comment}` : ""}`, "/espace-etudiant/diacres/stage");
  }
  await audit(ctx.userId, "internship_step.status", "internship_step", stepId, { status });
  revalidatePath(STAGES_PATH);
  return { ok: true };
}

const hoursSchema = z.object({ hourId: uuid, validated: z.boolean() });

export async function setHoursValidatedAction(input: unknown): Promise<ActionResult> {
  const parsed = hoursSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Requête invalide." };
  const g = await guard(["admin", "supervisor"], STAGES_PATH);
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
  const g = await guard(["admin", "supervisor"], STAGES_PATH);
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
  const g = await guard(["admin", "supervisor"], STAGES_PATH);
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
