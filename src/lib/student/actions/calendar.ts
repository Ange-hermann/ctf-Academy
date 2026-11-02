"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit, requireStudent, withStudent } from "@/lib/student/session";
import type { ActionResult } from "@/lib/validation/auth";

const prefSchema = z.object({
  category: z.enum(["live", "assessment", "payment", "announcement", "message", "grade", "comment", "validation"]),
  in_app: z.boolean().optional(),
  email: z.boolean().optional(),
});

/** Préférence de rappel par catégorie (dans l'espace et/ou par e-mail). */
export async function setReminderPrefAction(input: unknown): Promise<ActionResult> {
  const parsed = prefSchema.safeParse(input);
  if (!parsed.success || (parsed.data.in_app === undefined && parsed.data.email === undefined)) {
    return { ok: false, error: "Préférence invalide." };
  }
  const ctx = await requireStudent();
  const { category, in_app, email } = parsed.data;
  await withStudent(ctx.userId, (tx) =>
    tx.notification_preferences.upsert({
      where: { user_id_category: { user_id: ctx.userId, category } },
      create: { user_id: ctx.userId, category, in_app: in_app ?? true, email: email ?? false },
      update: { ...(in_app !== undefined ? { in_app } : {}), ...(email !== undefined ? { email } : {}) },
    }),
  );
  await audit(ctx.userId, "pref.reminder", "notification_preferences", category, { in_app, email });
  revalidatePath("/espace-etudiant/calendrier");
  return { ok: true };
}


