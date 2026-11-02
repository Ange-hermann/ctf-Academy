import { CalendarDays, Download } from "lucide-react";
import { CalendarMonth } from "@/components/student/calendar/calendar-month";
import { EventRow } from "@/components/student/calendar/event-row";
import { ReminderPrefs, reminderCategoryLabels } from "@/components/student/calendar/reminder-prefs";
import { EmptyState } from "@/components/student/ui/empty-state";
import { StudentPageHeader } from "@/components/student/ui/page-header";
import { Button } from "@/components/ui/button";
import { studentRoutes } from "@/config/student-nav";
import { formatDate, timeZoneLabel } from "@/lib/student/format";
import { getEvents, getReminderPrefs } from "@/lib/student/queries/calendar";
import { requireStudent, withStudent } from "@/lib/student/session";

export const metadata = { title: "Mon calendrier" };

const dayKey = (d: Date, tz: string) =>
  new Intl.DateTimeFormat("fr-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);

export default async function CalendarPage({ searchParams }: PageProps<"/espace-etudiant/calendrier">) {
  const ctx = await requireStudent(studentRoutes.calendar);
  const sp = await searchParams;

  // Mois affiché (dans le fuseau de l'étudiant).
  const nowParts = new Intl.DateTimeFormat("fr-CA", { timeZone: ctx.timezone, year: "numeric", month: "2-digit" }).format(new Date()).split("-");
  const match = typeof sp.mois === "string" ? /^(\d{4})-(\d{2})$/.exec(sp.mois) : null;
  const year = match ? Number(match[1]) : Number(nowParts[0]);
  const month = match ? Math.min(12, Math.max(1, Number(match[2]))) : Number(nowParts[1]);

  const from = new Date(Date.UTC(year, month - 1, 1) - 7 * 86400_000);
  const to = new Date(Date.UTC(year, month, 0) + 7 * 86400_000);
  const [events, prefs] = await Promise.all([
    withStudent(ctx.userId, (tx) => getEvents(tx, { from, to })),
    withStudent(ctx.userId, getReminderPrefs),
  ]);

  const inMonth = events.filter((e) => dayKey(new Date(e.startsAt), ctx.timezone).startsWith(`${year}-${String(month).padStart(2, "0")}`));
  const byDay = new Map<string, typeof inMonth>();
  for (const e of inMonth) {
    const k = dayKey(new Date(e.startsAt), ctx.timezone);
    byDay.set(k, [...(byDay.get(k) ?? []), e]);
  }
  const days = [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b));

  return (
    <>
      <StudentPageHeader
        title="Mon calendrier"
        eyebrow={`Heures affichées : ${timeZoneLabel(ctx.timezone)}`}
        description="Cours en direct, évaluations à rendre, échéances et grandes étapes de votre formation."
        crumbs={[{ label: "Mon calendrier", href: studentRoutes.calendar }]}
        actions={
          <Button asChild variant="outline">
            <a href="/espace-etudiant/calendrier/ics" download>
              <Download /> Tout exporter (.ics)
            </a>
          </Button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <CalendarMonth year={year} month={month} events={events} tz={ctx.timezone} />

        <div className="space-y-4">
          <section aria-labelledby="events-title" className="rounded-3xl border border-line bg-gradient-card p-5 sm:p-6">
            <h2 id="events-title" className="font-sans text-sm font-semibold tracking-[0.18em] text-or-light uppercase">
              Événements du mois ({inMonth.length})
            </h2>
            {days.length === 0 ? (
              <EmptyState icon={CalendarDays} title="Rien de prévu" description="Aucun événement ce mois-ci. Naviguez vers un autre mois ou exportez votre agenda." className="mt-4" />
            ) : (
              <div className="mt-4 space-y-5">
                {days.map(([key, list]) => (
                  <div key={key}>
                    <h3 className="mb-2 text-sm font-semibold text-or-light capitalize">{formatDate(`${key}T12:00:00Z`, "UTC", { weekday: "long", day: "numeric", month: "long" })}</h3>
                    <ul className="space-y-2">
                      {list.map((e) => (
                        <EventRow key={e.id} event={e} tz={ctx.timezone} />
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section aria-labelledby="reminders-title" className="rounded-3xl border border-line bg-gradient-card p-5 sm:p-6">
            <h2 id="reminders-title" className="font-sans text-sm font-semibold tracking-[0.18em] text-or-light uppercase">
              Mes rappels
            </h2>
            <p className="mt-2 text-sm text-blanc/60">
              L&apos;export .ics inclut des alarmes natives (J-1, H-1…) : importez-le une fois dans votre agenda pour recevoir les rappels de votre téléphone.
              Choisissez aussi les notifications de l&apos;espace.
            </p>
            <div className="mt-3">
              <ReminderPrefs
                prefs={(["live", "assessment", "payment", "message", "grade", "validation"] as const).map((c) => ({
                  category: c,
                  in_app: prefs.get(c)?.in_app ?? true,
                  email: prefs.get(c)?.email ?? false,
                }))}
              />
            </div>
            <p className="sr-only">{Object.values(reminderCategoryLabels).join(", ")}</p>
          </section>
        </div>
      </div>
    </>
  );
}
