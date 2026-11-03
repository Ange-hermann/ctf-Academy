import "server-only";
import type { Prisma, notification_category } from "@/generated/prisma/client";
import { sendPushToUsers, type PushPayload } from "@/lib/push";

export type NotifyRow = {
  user_id: string;
  category: notification_category;
  title: string;
  body?: string;
  href?: string | null;
};

/**
 * Écrit les notifications en base puis pousse une notification système sur tous
 * les appareils souscrits (Web Push). L'envoi est best-effort : il ne fait
 * jamais échouer l'appelant. Respecte la préférence « notifications activées »
 * par catégorie (notification_preferences.in_app = false → pas de push).
 */
export async function notifyMany(db: Prisma.TransactionClient, rows: NotifyRow[]): Promise<void> {
  if (rows.length === 0) return;
  await db.notifications.createMany({ data: rows });
  try {
    const userIds = [...new Set(rows.map((r) => r.user_id))];
    const muted = await db.notification_preferences.findMany({
      where: { user_id: { in: userIds }, in_app: false },
      select: { user_id: true, category: true },
    });
    const blocked = new Set(muted.map((p) => `${p.user_id}:${p.category}`));
    const deliveries = new Map<string, PushPayload[]>();
    for (const row of rows) {
      if (blocked.has(`${row.user_id}:${row.category}`)) continue;
      const payload: PushPayload = { title: row.title, body: row.body ?? "", href: row.href ?? "/" };
      deliveries.set(row.user_id, [...(deliveries.get(row.user_id) ?? []), payload]);
    }
    await Promise.all(
      [...deliveries].flatMap(([userId, payloads]) => payloads.map((p) => sendPushToUsers([userId], p))),
    );
  } catch {
    // Le push est un canal secondaire : échec silencieux.
  }
}

/** Raccourci pour une notification à un seul utilisateur. */
export async function notifyOne(
  db: Prisma.TransactionClient,
  userId: string,
  category: notification_category,
  title: string,
  body: string,
  href?: string,
): Promise<void> {
  await notifyMany(db, [{ user_id: userId, category, title, body, href }]);
}
