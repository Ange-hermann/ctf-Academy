"use server";

import { z } from "zod";
import { getDb } from "@/lib/db";
import { currentLevels } from "@/lib/admin/classroom";
import { rateLimit, tooManyRequests } from "@/lib/security/rate-limit";
import { audit, requireStudent, withStudent } from "@/lib/student/session";
import { inspectUpload, removeUpload, signedUploadUrl } from "@/lib/student/storage";
import { VOICE_MAX_BYTES, voiceExtension, voiceLabel } from "@/lib/messages/voice";
import { notifyMany } from "@/lib/notifications/notify";
import { zodFieldErrors, type ActionResult } from "@/lib/validation/auth";

const categorySchema = z.enum(["trainer", "administrative"]);
const uuid = z.uuid();

/**
 * Prévient l'interlocuteur côté équipe : le formateur du fil s'il est connu,
 * sinon les formateurs affectés à la classe de l'étudiant (canal « Formateurs »)
 * ou l'équipe administrative (canal « Administratif » encore sans réponse).
 */
async function notifyStaff(threadId: string, studentName: string) {
  const db = getDb();
  if (!db) return;
  const thread = await db.message_threads.findUnique({ where: { id: threadId }, select: { staff_id: true, category: true, student_id: true, subject: true } });
  if (!thread) return;
  let recipients: string[] = thread.staff_id ? [thread.staff_id] : [];
  if (!recipients.length && thread.category === "trainer") {
    const apps = await db.applications.findMany({ where: { user_id: thread.student_id, admission_status: "admitted" }, select: { user_id: true, formation_id: true } });
    const levels = await currentLevels(db, apps);
    // Formateur de la classe de l'étudiant : même formation, et même niveau en cours (ou classe sans niveau).
    const trainers = await db.trainer_assignments.findMany({
      where: {
        OR: apps.map((a) => {
          const levelId = levels.get(`${a.user_id}:${a.formation_id}`) ?? null;
          return { formation_id: a.formation_id, OR: [{ level_id: null }, ...(levelId ? [{ level_id: levelId }] : [])] };
        }),
      },
      select: { trainer_id: true },
    });
    recipients = [...new Set(trainers.map((t) => t.trainer_id))];
  }
  if (!recipients.length && thread.category === "administrative") {
    // Canal Administratif sans interlocuteur : toute l'équipe d'administration est prévenue.
    const staff = await db.user_roles.findMany({ where: { role: { in: ["admin", "admissions"] } }, select: { user_id: true } });
    recipients = [...new Set(staff.map((s) => s.user_id))];
  }
  if (!recipients.length) return;
  await notifyMany(
    db,
    recipients.map((user_id) => ({
      user_id,
      category: "comment" as const,
      title: `Message de ${studentName}`,
      body: `« ${thread.subject} »`,
      href: thread.category === "administrative" ? `/admin/assistance/${threadId}` : `/admin/ma-classe/messages/${threadId}`,
    })),
  );
}

/** Libellé de l'interlocuteur affiché côté fil (le staff réel répondra ensuite). */
const staffNameFor = { trainer: "Équipe pédagogique", administrative: "Administration CTF ACADEMY" } as const;

/** Réponse dans un fil existant. */
export async function sendMessageAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = z
    .object({ threadId: uuid, body: z.string().trim().min(1, "Message vide.").max(4000, "Message trop long.") })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "Vérifiez votre message.", fieldErrors: zodFieldErrors(parsed.error) };

  const limit = await rateLimit("message", { limit: 20, windowMs: 60_000 });
  if (!limit.allowed) return { ok: false, error: tooManyRequests(limit.retryInSec) };

  const ctx = await requireStudent();
  const { threadId, body } = parsed.data;
  const created = await withStudent(ctx.userId, async (tx) => {
    const thread = await tx.message_threads.findFirst({ where: { id: threadId, student_id: ctx.userId } });
    if (!thread) return null;
    const msg = await tx.messages.create({
      data: {
        thread_id: threadId,
        author_id: ctx.userId,
        author_name: `${ctx.firstName} ${ctx.lastName}`.trim() || "Étudiant",
        body,
      },
      select: { id: true },
    });
    // Le trigger messages_touch_thread (security definer) remonte updated_at — pas d'UPDATE ici,
    // l'étudiant n'a pas de policy UPDATE sur message_threads.
    return msg;
  });
  if (!created) return { ok: false, error: "Fil de discussion introuvable." };
  await notifyStaff(threadId, `${ctx.firstName} ${ctx.lastName}`.trim() || "un étudiant");
  return { ok: true, data: { id: created.id } };
}

const voicePrefix = (userId: string, threadId: string) => `${userId}/messages/${threadId}/`;

/** URL signée pour déposer un message vocal dans un de ses fils (stockage privé). */
export async function requestVoiceUploadAction(input: unknown): Promise<ActionResult<{ url: string; path: string }>> {
  const parsed = z.object({ threadId: uuid, mime: z.string().max(80), size: z.number().int().positive() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Requête invalide." };
  const limit = await rateLimit("voice-message", { limit: 10, windowMs: 60_000 });
  if (!limit.allowed) return { ok: false, error: tooManyRequests(limit.retryInSec) };

  const ctx = await requireStudent();
  const { threadId, mime, size } = parsed.data;
  const ext = voiceExtension(mime);
  if (!ext) return { ok: false, error: "Format audio non pris en charge par ce navigateur." };
  if (size > VOICE_MAX_BYTES) return { ok: false, error: "Message vocal trop long (10 Mo maximum)." };
  const thread = await withStudent(ctx.userId, (tx) => tx.message_threads.findFirst({ where: { id: threadId, student_id: ctx.userId }, select: { id: true } }));
  if (!thread) return { ok: false, error: "Fil de discussion introuvable." };

  const signed = await signedUploadUrl(`${voicePrefix(ctx.userId, threadId)}${crypto.randomUUID()}.${ext}`);
  if (!signed) return { ok: false, error: "Stockage indisponible." };
  return { ok: true, data: { url: signed.url, path: signed.path } };
}

const voiceSchema = z.object({ threadId: uuid, path: z.string().min(10).max(300), durationSec: z.number().int().min(1).max(600) });

/** Enregistre le message vocal après vérification du fichier réellement stocké. */
export async function sendVoiceMessageAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = voiceSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Message vocal invalide." };
  const ctx = await requireStudent();
  const { threadId, path, durationSec } = parsed.data;
  if (!path.startsWith(voicePrefix(ctx.userId, threadId)) || path.includes("..")) return { ok: false, error: "Emplacement de fichier refusé." };

  const stored = await inspectUpload(path);
  if (!stored || !stored.mime.startsWith("audio/") || stored.size > VOICE_MAX_BYTES) {
    if (stored) await removeUpload(path);
    return { ok: false, error: "Le message vocal n'a pas été reçu correctement." };
  }

  const created = await withStudent(ctx.userId, async (tx) => {
    const thread = await tx.message_threads.findFirst({ where: { id: threadId, student_id: ctx.userId } });
    if (!thread) return null;
    const msg = await tx.messages.create({
      data: {
        thread_id: threadId,
        author_id: ctx.userId,
        author_name: `${ctx.firstName} ${ctx.lastName}`.trim() || "Étudiant",
        body: voiceLabel(durationSec),
        attachment_path: path,
        attachment_name: `message-vocal.${path.split(".").pop()}`,
      },
      select: { id: true },
    });
    // Même remarque : updated_at est géré par le trigger messages_touch_thread.
    return msg;
  });
  if (!created) return { ok: false, error: "Fil de discussion introuvable." };
  await notifyStaff(threadId, `${ctx.firstName} ${ctx.lastName}`.trim() || "un étudiant");
  await audit(ctx.userId, "message.voice", "messages", created.id, { durationSec, size: stored.size });
  return { ok: true, data: { id: created.id } };
}

const newThreadSchema = z.object({
  category: categorySchema,
  subject: z.string().trim().min(3, "Indiquez un sujet.").max(140, "Sujet trop long."),
  body: z.string().trim().min(1, "Message vide.").max(4000, "Message trop long."),
});

/** Nouveau fil : l'étudiant ouvre une discussion avec l'équipe pédagogique ou l'administration. */
export async function createThreadAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = newThreadSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Vérifiez les champs indiqués.", fieldErrors: zodFieldErrors(parsed.error) };

  const limit = await rateLimit("message-thread", { limit: 5, windowMs: 10 * 60_000 });
  if (!limit.allowed) return { ok: false, error: tooManyRequests(limit.retryInSec) };

  const ctx = await requireStudent();
  const { category, subject, body } = parsed.data;
  const thread = await withStudent(ctx.userId, (tx) =>
    tx.message_threads.create({
      data: {
        student_id: ctx.userId,
        staff_name: staffNameFor[category],
        category,
        subject,
        messages: {
          create: {
            author_id: ctx.userId,
            author_name: `${ctx.firstName} ${ctx.lastName}`.trim() || "Étudiant",
            body,
          },
        },
      },
      select: { id: true },
    }),
  );
  await audit(ctx.userId, "message_thread.create", "message_threads", thread.id, { category });
  await notifyStaff(thread.id, `${ctx.firstName} ${ctx.lastName}`.trim() || "un étudiant");
  return { ok: true, data: { id: thread.id } };
}

/** Marque lus les messages du fil écrits par l'équipe (à l'ouverture du fil). */
export async function markThreadReadAction(threadId: unknown) {
  const parsed = uuid.safeParse(threadId);
  if (!parsed.success) return;
  const ctx = await requireStudent();
  await withStudent(ctx.userId, (tx) =>
    tx.messages.updateMany({
      where: {
        read_at: null,
        OR: [{ author_id: null }, { author_id: { not: ctx.userId } }],
        message_threads: { id: parsed.data, student_id: ctx.userId },
      },
      data: { read_at: new Date() },
    }),
  );
}

/** Marque une annonce comme lue (upsert : une seule ligne par étudiant et annonce). */
export async function markAnnouncementReadAction(announcementId: unknown) {
  const parsed = uuid.safeParse(announcementId);
  if (!parsed.success) return;
  const ctx = await requireStudent();
  await withStudent(ctx.userId, (tx) =>
    tx.announcement_reads.upsert({
      where: { user_id_announcement_id: { user_id: ctx.userId, announcement_id: parsed.data } },
      create: { user_id: ctx.userId, announcement_id: parsed.data },
      update: {},
    }),
  );
}

/** Nouvelle demande d'assistance (ticket). */
export async function createTicketAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = z
    .object({
      category: z.enum(["connexion", "video", "paiement", "evaluation", "autre"]),
      subject: z.string().trim().min(3, "Indiquez un sujet.").max(140, "Sujet trop long."),
      description: z.string().trim().min(10, "Décrivez votre problème.").max(4000, "Description trop longue."),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "Vérifiez les champs indiqués.", fieldErrors: zodFieldErrors(parsed.error) };

  const limit = await rateLimit("ticket", { limit: 3, windowMs: 10 * 60_000 });
  if (!limit.allowed) return { ok: false, error: tooManyRequests(limit.retryInSec) };

  const ctx = await requireStudent();
  const ticket = await withStudent(ctx.userId, (tx) =>
    tx.support_tickets.create({ data: { user_id: ctx.userId, ...parsed.data }, select: { id: true } }),
  );
  await audit(ctx.userId, "support_ticket.create", "support_tickets", ticket.id, { category: parsed.data.category });
  // L'équipe d'administration est prévenue de la nouvelle demande.
  const db = getDb();
  if (db) {
    const staff = await db.user_roles.findMany({ where: { role: { in: ["admin", "admissions"] } }, select: { user_id: true } });
    if (staff.length) {
      const studentName = `${ctx.firstName} ${ctx.lastName}`.trim() || "Un étudiant";
      await notifyMany(
        db,
        staff.map((s) => ({
          user_id: s.user_id,
          category: "comment" as const,
          title: `Ticket de ${studentName}`,
          body: `« ${parsed.data.subject} »`,
          href: "/admin/assistance",
        })),
      );
    }
  }
  return { ok: true, data: { id: ticket.id } };
}
