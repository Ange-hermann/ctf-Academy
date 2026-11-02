"use server";

import { z } from "zod";
import { listNotifications, searchStudentContent } from "@/lib/student/queries/shell";
import { requireStudent, withStudent } from "@/lib/student/session";

export async function fetchNotificationsAction() {
  const ctx = await requireStudent();
  return withStudent(ctx.userId, listNotifications);
}

const idsSchema = z.union([z.literal("all"), z.array(z.uuid()).max(50)]);

export async function markNotificationsReadAction(input: unknown) {
  const ids = idsSchema.parse(input);
  const ctx = await requireStudent();
  await withStudent(ctx.userId, (tx) =>
    tx.notifications.updateMany({
      where: { read_at: null, ...(ids === "all" ? {} : { id: { in: ids } }) },
      data: { read_at: new Date() },
    }),
  );
}

export async function searchStudentAction(input: unknown) {
  const q = z.string().trim().min(2).max(80).safeParse(input);
  if (!q.success) return [];
  const ctx = await requireStudent();
  return searchStudentContent(ctx.userId, q.data);
}
