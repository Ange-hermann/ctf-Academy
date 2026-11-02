"use server";

import { z } from "zod";
import { rateLimit, tooManyRequests } from "@/lib/security/rate-limit";
import { audit, requireStudent, withStudent } from "@/lib/student/session";
import { zodFieldErrors, type ActionResult } from "@/lib/validation/auth";

const categorySchema = z.enum(["trainer", "administrative"]);
const uuid = z.uuid();

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
    await tx.message_threads.update({ where: { id: threadId }, data: { updated_at: new Date() } });
    return msg;
  });
  if (!created) return { ok: false, error: "Fil de discussion introuvable." };
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
      category: z.enum(["technique", "cours", "paiement", "autre"]),
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
  return { ok: true, data: { id: ticket.id } };
}
