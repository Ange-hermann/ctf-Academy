"use server";

import { z } from "zod";
import { rateLimit, tooManyRequests } from "@/lib/security/rate-limit";
import { audit, requireStudent, withStudent } from "@/lib/student/session";
import { zodFieldErrors, type ActionResult } from "@/lib/validation/auth";

const categories = [
  "announcement",
  "message",
  "grade",
  "comment",
  "validation",
  "live",
  "payment",
  "assessment",
] as const;

const prefsSchema = z.object({
  timezone: z.string().trim().min(1).max(64).refine((tz) => {
    try {
      new Intl.DateTimeFormat("fr-FR", { timeZone: tz });
      return true;
    } catch {
      return false;
    }
  }, "Fuseau horaire invalide."),
  liteMode: z.boolean(),
  notifications: z
    .array(z.object({ category: z.enum(categories), inApp: z.boolean(), email: z.boolean() }))
    .max(categories.length),
});

/** Préférences du profil : fuseau horaire, mode allégé et canaux de notification. */
export async function updatePreferencesAction(input: unknown): Promise<ActionResult> {
  const parsed = prefsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Vérifiez les champs indiqués.", fieldErrors: zodFieldErrors(parsed.error) };

  const limit = await rateLimit("profile-prefs", { limit: 10, windowMs: 60_000 });
  if (!limit.allowed) return { ok: false, error: tooManyRequests(limit.retryInSec) };

  const ctx = await requireStudent();
  const { timezone, liteMode, notifications } = parsed.data;
  await withStudent(ctx.userId, async (tx) => {
    await tx.profiles.update({ where: { id: ctx.userId }, data: { timezone, lite_mode: liteMode } });
    for (const p of notifications) {
      await tx.notification_preferences.upsert({
        where: { user_id_category: { user_id: ctx.userId, category: p.category } },
        create: { user_id: ctx.userId, category: p.category, in_app: p.inApp, email: p.email },
        update: { in_app: p.inApp, email: p.email },
      });
    }
  });
  await audit(ctx.userId, "profile.preferences.update", "profiles", ctx.userId, { liteMode });
  return { ok: true, message: "Préférences enregistrées." };
}
