import { currency } from "@/content/formations";

/** Formats en français, dans le fuseau horaire de l'étudiant (rendu serveur et client identiques). */
export function formatDate(
  iso: string | Date,
  tz: string,
  options: Intl.DateTimeFormatOptions = { dateStyle: "long" },
) {
  return new Intl.DateTimeFormat("fr-FR", { timeZone: tz, ...options }).format(new Date(iso));
}

export const formatDateTime = (iso: string | Date, tz: string) =>
  formatDate(iso, tz, { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

export const formatShortDate = (iso: string | Date, tz: string) =>
  formatDate(iso, tz, { day: "numeric", month: "short" });

export const formatTime = (iso: string | Date, tz: string) =>
  formatDate(iso, tz, { hour: "2-digit", minute: "2-digit" });

export const formatMoney = (value: number) =>
  `${new Intl.NumberFormat("fr-FR").format(value).replace(/\u202f|\u00a0/g, " ")} ${currency.label}`;

export const formatMinutes = (m: number) =>
  m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ""}` : `${m} min`;

/** Salutation selon l'heure locale de l'étudiant. */
export function greeting(tz: string, now = new Date()) {
  const hour = Number(
    new Intl.DateTimeFormat("fr-FR", { timeZone: tz, hour: "numeric", hourCycle: "h23" }).format(now),
  );
  if (hour < 5) return "Bonne nuit";
  if (hour < 12) return "Bonne matinée";
  if (hour < 18) return "Bon après-midi";
  return "Bonne soirée";
}

/** Libellé court du fuseau (ex. « GMT »), affiché à côté des heures. */
export const timeZoneLabel = (tz: string) =>
  new Intl.DateTimeFormat("fr-FR", { timeZone: tz, timeZoneName: "short" })
    .formatToParts(new Date())
    .find((p) => p.type === "timeZoneName")?.value ?? tz;
