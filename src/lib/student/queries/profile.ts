import "server-only";
import { type EnrolledContext, withStudent } from "@/lib/student/session";
import type { NotificationCategory } from "@/lib/student/queries/shell";

export type NotificationPref = { category: NotificationCategory; inApp: boolean; email: boolean };

export type StudentProfile = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  country: string | null;
  timezone: string;
  liteMode: boolean;
  avatarUrl: string | null;
  memberSince: string;
  notificationPrefs: NotificationPref[];
};

/** Profil complet (identité, fuseau, mode allégé) + préférences de notification. */
export async function getProfile(ctx: EnrolledContext): Promise<StudentProfile | null> {
  const row = await withStudent(ctx.userId, (tx) =>
    tx.profiles.findUnique({
      where: { id: ctx.userId },
      include: { notification_preferences: { select: { category: true, in_app: true, email: true } } },
    }),
  );
  if (!row) return null;
  return {
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone,
    country: row.country,
    timezone: row.timezone,
    liteMode: row.lite_mode,
    avatarUrl: row.avatar_url,
    memberSince: row.created_at.toISOString(),
    notificationPrefs: row.notification_preferences.map((p) => ({
      category: p.category,
      inApp: p.in_app,
      email: p.email,
    })),
  };
}
