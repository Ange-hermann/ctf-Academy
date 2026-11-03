import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { getDb } from "@/lib/db";
import { notifyMany } from "@/lib/notifications/notify";
import { weeklyReportWindow } from "@/lib/edm";

/**
 * Rappels de la fiche de transformation EDM :
 *  - « open »  : 30 min avant l'ouverture (vendredi 5 h 30) → tous les étudiants EDM admis ;
 *  - « close » : 45 min avant la fermeture (samedi 23 h 14) → seulement ceux qui n'ont pas déposé.
 * Appelé au fil des rendus (dispatch paresseux) et via /api/cron/fiches-edm : hors des fenêtres,
 * la fonction ne touche pas la base. La table reminder_dispatches déduplique une fois par
 * étudiant/semaine/type — l'insert + returning rend le marquage atomique même en concurrence.
 */
const OPEN_LEAD_MS = 30 * 60_000;
const CLOSE_LEAD_MS = 45 * 60_000;
const FICHE_HREF = "/espace-etudiant/edm/fiche";

export type ReminderResult = { kind: "open" | "close" | null; sent: number };

export async function dispatchFicheReminders(now: Date = new Date()): Promise<ReminderResult> {
  const win = weeklyReportWindow(now);
  const t = now.getTime();
  const kind: "open" | "close" | null =
    t >= win.opensAt.getTime() - OPEN_LEAD_MS && t < win.opensAt.getTime()
      ? "open"
      : t >= win.closesAt.getTime() - CLOSE_LEAD_MS && t <= win.closesAt.getTime()
        ? "close"
        : null;
  if (!kind) return { kind: null, sent: 0 };

  const db = getDb();
  if (!db) return { kind, sent: 0 };
  try {
    const formation = await db.formations.findFirst({ where: { slug: "edm" }, select: { id: true } });
    if (!formation) return { kind, sent: 0 };
    const apps = await db.applications.findMany({
      where: { formation_id: formation.id, admission_status: "admitted" },
      select: { user_id: true },
    });
    let userIds = apps.map((a) => a.user_id);
    if (!userIds.length) return { kind, sent: 0 };

    const weekStart = new Date(`${win.weekStart}T00:00:00Z`);
    if (kind === "close") {
      const filled = await db.edm_weekly_reports.findMany({
        where: { week_start: weekStart, user_id: { in: userIds } },
        select: { user_id: true },
      });
      const done = new Set(filled.map((f) => f.user_id));
      userIds = userIds.filter((u) => !done.has(u));
      if (!userIds.length) return { kind, sent: 0 };
    }

    // Marqueurs atomiques : seuls les user_id réellement insérés sont notifiés.
    const inserted = await db.$queryRaw<{ user_id: string }[]>`
      insert into reminder_dispatches (kind, week_start, user_id)
      values ${Prisma.join(userIds.map((u) => Prisma.sql`(${kind}, ${win.weekStart}::date, ${u}::uuid)`))}
      on conflict do nothing
      returning user_id`;
    const targets = inserted.map((r) => r.user_id);
    if (!targets.length) return { kind, sent: 0 };

    await notifyMany(
      db,
      targets.map((user_id) => ({
        user_id,
        category: "assessment" as const,
        title: kind === "open" ? "Fiche de transformation — ouverture dans 30 min" : "Fiche non remplie — fermeture dans 45 min",
        body:
          kind === "open"
            ? "La saisie de ta fiche hebdomadaire ouvre dans 30 minutes (jusqu'à samedi 23 h 59). Prépare ton bilan de la semaine."
            : "Tu n'as pas encore rempli ta fiche de transformation ? Dépêche-toi, sinon tu vas avoir ramba avec le vieux !",
        href: FICHE_HREF,
      })),
    );
    return { kind, sent: targets.length };
  } catch {
    return { kind, sent: 0 };
  }
}
