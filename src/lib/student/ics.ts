import type { StudentEvent } from "@/lib/student/queries/calendar";

const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const day = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, "");
const escape = (s: string) => s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1");

/** Fichier iCalendar (RFC 5545) : rappels 24 h et 1 h avant pour les cours en direct. */
export function toIcs(events: StudentEvent[], origin: string) {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//CTF ACADEMY//Espace etudiant//FR", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"];
  for (const e of events) {
    const start = new Date(e.startsAt);
    const description = [e.description, e.zoomUrl ? `Zoom : ${e.zoomUrl}` : "", e.isExample ? "(Exemple)" : ""].filter(Boolean).join("\n");
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.id}@ctf-academy`,
      `DTSTAMP:${stamp(new Date())}`,
      ...(e.allDay
        ? [`DTSTART;VALUE=DATE:${day(start)}`]
        : [`DTSTART:${stamp(start)}`, `DTEND:${stamp(e.endsAt ? new Date(e.endsAt) : new Date(start.getTime() + 3600_000))}`]),
      `SUMMARY:${escape(e.title)}`,
      `DESCRIPTION:${escape(description)}`,
      `URL:${new URL(e.href, origin).toString()}`,
      ...(e.zoomUrl ? [`LOCATION:${escape(e.zoomUrl)}`] : []),
    );
    // Rappels natifs du téléphone/agenda : J-1 + H-1 (directs), J-2 + H-2 (évaluations), J-3 (paiements).
    const alarms: Partial<Record<typeof e.kind, string[]>> = {
      live: ["-PT24H", "-PT1H"],
      assessment: ["-P2D", "-PT2H"],
      payment: ["-P3D"],
    };
    for (const trigger of alarms[e.kind] ?? []) {
      lines.push("BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${escape(e.title)}`, `TRIGGER:${trigger}`, "END:VALARM");
    }
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

/** Lien « Ajouter à Google Agenda ». */
export function googleCalendarUrl(e: Pick<StudentEvent, "title" | "description" | "startsAt" | "endsAt" | "zoomUrl">) {
  const start = new Date(e.startsAt);
  const end = e.endsAt ? new Date(e.endsAt) : new Date(start.getTime() + 3600_000);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: e.title,
    dates: `${stamp(start)}/${stamp(end)}`,
    details: [e.description, e.zoomUrl ? `Zoom : ${e.zoomUrl}` : ""].filter(Boolean).join("\n"),
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}
