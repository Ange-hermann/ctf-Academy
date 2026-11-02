import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { studentRoutes } from "@/config/student-nav";
import type { EventKind, StudentEvent } from "@/lib/student/queries/calendar";
import { cn } from "@/lib/utils";

export const eventKindMeta: Record<EventKind, { label: string; dot: string; icon: "live" | "assessment" | "payment" | "milestone" }> = {
  live: { label: "Cours en direct", dot: "bg-or-light", icon: "live" },
  assessment: { label: "Évaluation", dot: "bg-warning-light", icon: "assessment" },
  payment: { label: "Échéance de paiement", dot: "bg-danger-light", icon: "payment" },
  milestone: { label: "Étape de formation", dot: "bg-success-light", icon: "milestone" },
};

const dayKey = (d: Date, tz: string) =>
  new Intl.DateTimeFormat("fr-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);

const weekdayIndex = (y: number, m: number, d: number, tz: string) => {
  // Midi UTC limite les dérives de fuseau pour connaître le jour de la semaine affiché.
  const wd = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short" }).format(new Date(Date.UTC(y, m - 1, d, 12)));
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(wd);
};

const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();
const monthKey = (y: number, m: number) => `${y}-${String(m).padStart(2, "0")}`;
const monthLabel = (y: number, m: number) =>
  new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, 1)));

/** Grille mensuelle (lundi → dimanche) avec points colorés par type d'événement. */
export function CalendarMonth({ year, month, events, tz }: { year: number; month: number; events: StudentEvent[]; tz: string }) {
  const byDay = new Map<string, StudentEvent[]>();
  for (const e of events) {
    const k = dayKey(new Date(e.startsAt), tz);
    byDay.set(k, [...(byDay.get(k) ?? []), e]);
  }

  const first = weekdayIndex(year, month, 1, tz); // 0 = dimanche
  const offset = (first + 6) % 7; // 0 = lundi
  const count = daysInMonth(year, month);
  const todayKey = dayKey(new Date(), tz);
  const [py, pm] = month === 1 ? [year - 1, 12] : [year, month - 1];
  const [ny, nm] = month === 12 ? [year + 1, 1] : [year, month + 1];

  return (
    <section aria-label={`Calendrier de ${monthLabel(year, month)}`} className="rounded-3xl border border-line bg-gradient-card p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl tracking-wide text-blanc capitalize">{monthLabel(year, month)}</h2>
        <div className="flex gap-1">
          <Link href={`${studentRoutes.calendar}?mois=${monthKey(py, pm)}`} aria-label="Mois précédent" className="grid size-11 place-items-center rounded-full border border-line text-blanc/70 hover:border-or/40 hover:text-or-light">
            <ChevronLeft className="size-5" />
          </Link>
          <Link href={`${studentRoutes.calendar}?mois=${monthKey(ny, nm)}`} aria-label="Mois suivant" className="grid size-11 place-items-center rounded-full border border-line text-blanc/70 hover:border-or/40 hover:text-or-light">
            <ChevronRight className="size-5" />
          </Link>
        </div>
      </div>

      <div role="grid" className="mt-4">
        <div role="row" className="grid grid-cols-7 text-center text-xs font-semibold tracking-wider text-blanc/45 uppercase">
          {["lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."].map((d) => (
            <span key={d} role="columnheader" className="py-2">
              {d}
            </span>
          ))}
        </div>
        <div role="rowgroup" className="grid grid-cols-7 gap-1">
          {Array.from({ length: offset }, (_, i) => (
            <span key={`pad-${i}`} aria-hidden />
          ))}
          {Array.from({ length: count }, (_, i) => {
            const d = i + 1;
            const key = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
            const dayEvents = byDay.get(key) ?? [];
            const today = key === todayKey;
            return (
              <div
                key={d}
                role="gridcell"
                aria-label={`${d} ${monthLabel(year, month)}${dayEvents.length ? `, ${dayEvents.length} événement${dayEvents.length > 1 ? "s" : ""}` : ""}`}
                className={cn(
                  "flex min-h-12 flex-col items-center gap-1 rounded-xl border p-1.5 sm:min-h-16",
                  today ? "border-or/60 bg-or/10" : dayEvents.length ? "border-or/20 bg-noir/40" : "border-transparent",
                )}
              >
                <span className={cn("text-sm tabular", today ? "font-bold text-or-light" : dayEvents.length ? "text-blanc" : "text-blanc/40")}>
                  {d}
                </span>
                <span className="flex flex-wrap justify-center gap-0.5">
                  {[...new Set(dayEvents.map((e) => e.kind))].map((k) => (
                    <span key={k} title={eventKindMeta[k].label} className={cn("size-1.5 rounded-full", eventKindMeta[k].dot)} />
                  ))}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <ul className="mt-4 flex flex-wrap gap-3 border-t border-line pt-3 text-xs text-blanc/55">
        {Object.entries(eventKindMeta).map(([k, m]) => (
          <li key={k} className="flex items-center gap-1.5">
            <span className={cn("size-2 rounded-full", m.dot)} /> {m.label}
          </li>
        ))}
      </ul>
    </section>
  );
}
