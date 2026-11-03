/**
 * Fenêtre de saisie de la fiche de transformation EDM :
 * ouverture le vendredi à 6 h 00, fermeture le samedi à 23 h 59.
 * Heure de l'église : Africa/Abidjan (UTC+0 toute l'année) — le calcul en UTC est donc exact.
 * Une fiche est identifiée par le vendredi (week_start) qui ouvre sa fenêtre.
 */
const DAY_MS = 86_400_000;
const OPEN_HOUR_MS = 6 * 3_600_000;
const CLOSE_MS = DAY_MS + 23 * 3_600_000 + 59 * 60_000 + 59_000 + 999;

export type WeeklyReportWindow = {
  /** Vendredi de la fenêtre au format AAAA-MM-JJ — clé de la fiche. */
  weekStart: string;
  opensAt: Date;
  closesAt: Date;
  open: boolean;
  nextOpensAt: Date;
};

export function weeklyReportWindow(now: Date = new Date()): WeeklyReportWindow {
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const dow = new Date(todayUtc).getUTCDay(); // 0 = dimanche … 5 = vendredi, 6 = samedi
  const friday = todayUtc - ((dow + 2) % 7) * DAY_MS;
  const opensAt = new Date(friday + OPEN_HOUR_MS);
  const closesAt = new Date(friday + CLOSE_MS);
  const t = now.getTime();
  const open = t >= opensAt.getTime() && t <= closesAt.getTime();
  const nextOpensAt = t < opensAt.getTime() ? opensAt : new Date(friday + 7 * DAY_MS + OPEN_HOUR_MS);
  return { weekStart: new Date(friday).toISOString().slice(0, 10), opensAt, closesAt, open, nextOpensAt };
}
