"use server";

import { z } from "zod";
import { getDb } from "@/lib/db";
import { getStudentContext } from "@/lib/student/session";
import type { ActionResult } from "@/lib/validation/auth";

const subscriptionSchema = z.object({
  endpoint: z.url().max(2000),
  keys: z.object({
    p256dh: z.string().min(1).max(512),
    auth: z.string().min(1).max(512),
  }),
  userAgent: z.string().max(300).optional(),
});

const endpointSchema = z.object({ endpoint: z.url().max(2000) });

/** Enregistre la souscription Web Push de l'appareil courant (téléphone, ordinateur…). */
export async function savePushSubscriptionAction(input: unknown): Promise<ActionResult> {
  const ctx = await getStudentContext();
  if (!ctx) return { ok: false, error: "Session expirée — reconnectez-vous." };
  const parsed = subscriptionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Souscription invalide." };
  const db = getDb();
  if (!db) return { ok: false, error: "Base de données indisponible." };
  const d = parsed.data;
  await db.push_subscriptions.upsert({
    where: { endpoint: d.endpoint },
    create: { user_id: ctx.userId, endpoint: d.endpoint, p256dh: d.keys.p256dh, auth: d.keys.auth, user_agent: d.userAgent },
    update: { user_id: ctx.userId, p256dh: d.keys.p256dh, auth: d.keys.auth, user_agent: d.userAgent },
  });
  return { ok: true };
}

/** Retire la souscription de l'appareil courant — l'utilisateur ne reçoit plus de push dessus. */
export async function removePushSubscriptionAction(input: unknown): Promise<ActionResult> {
  const ctx = await getStudentContext();
  if (!ctx) return { ok: false, error: "Session expirée — reconnectez-vous." };
  const parsed = endpointSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Souscription invalide." };
  const db = getDb();
  if (!db) return { ok: false, error: "Base de données indisponible." };
  await db.push_subscriptions.deleteMany({ where: { endpoint: parsed.data.endpoint, user_id: ctx.userId } });
  return { ok: true };
}
