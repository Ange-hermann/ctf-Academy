"use server";

import { z } from "zod";
import { getDb } from "@/lib/db";
import { requireStaff } from "@/lib/admin/session";
import { listStaffNotifications, type StaffNotification } from "@/lib/admin/queries";

/** Cloche de l'espace d'administration : notifications du membre d'équipe connecté. */
export async function fetchStaffNotificationsAction(): Promise<StaffNotification[]> {
  const ctx = await requireStaff("/admin");
  return listStaffNotifications(ctx.userId);
}

const idsSchema = z.union([z.literal("all"), z.array(z.uuid()).max(50)]);

export async function markStaffNotificationsReadAction(input: unknown) {
  const ids = idsSchema.parse(input);
  const ctx = await requireStaff("/admin");
  const db = getDb();
  if (!db) return;
  await db.notifications.updateMany({
    where: { user_id: ctx.userId, read_at: null, ...(ids === "all" ? {} : { id: { in: ids } }) },
    data: { read_at: new Date() },
  });
}
