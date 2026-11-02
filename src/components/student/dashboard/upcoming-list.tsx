"use client";

import Link from "next/link";
import { CalendarClock, Video } from "lucide-react";
import { eventIcons, eventLabels } from "@/components/student/calendar/event-meta";
import { Button } from "@/components/ui/button";
import { ExampleBadge } from "@/components/ui/badge";
import { studentRoutes } from "@/config/student-nav";
import { countdown, useNow } from "@/hooks/student/use-now";
import { formatDateTime, formatMoney, formatDate } from "@/lib/student/format";
import type { StudentEvent } from "@/lib/student/queries/calendar";
import { cn } from "@/lib/utils";

const JOIN_BEFORE = 10 * 60_000;

/** Bouton « Rejoindre sur Zoom » : actif 10 minutes avant le début et pendant la séance. */
export function JoinZoomButton({
  event,
  className,
}: {
  event: Pick<StudentEvent, "zoomUrl" | "startsAt" | "endsAt">;
  className?: string;
}) {
  const now = useNow();
  if (!event.zoomUrl) return null;
  const start = new Date(event.startsAt).getTime();
  const end = event.endsAt ? new Date(event.endsAt).getTime() : start + 3600_000;
  const open = now !== null && now >= start - JOIN_BEFORE && now <= end;
  return open ? (
    <Button asChild size="sm" halo className={className}>
      <a href={event.zoomUrl} target="_blank" rel="noopener noreferrer">
        <Video /> Rejoindre sur Zoom
      </a>
    </Button>
  ) : (
    <Button
      size="sm"
      variant="outline"
      disabled
      className={className}
      title="Le bouton s'active 10 minutes avant le début"
    >
      <Video /> Rejoindre (10 min avant)
    </Button>
  );
}

export function Countdown({ startsAt, endsAt }: { startsAt: string; endsAt: string | null }) {
  const now = useNow();
  if (now === null) return null;
  const label = countdown(new Date(startsAt).getTime(), now, endsAt ? new Date(endsAt).getTime() : undefined);
  return <span className={cn("tabular", label === "en cours" ? "text-success-light" : "text-or-light")}>{label}</span>;
}

/** « À venir » : 4 éléments maximum, triés par date (cours en direct, évaluations, échéances). */
export function UpcomingList({ events, tz }: { events: StudentEvent[]; tz: string }) {
  return (
    <section aria-labelledby="upcoming-title" className="h-full rounded-3xl border border-line bg-gradient-card p-6">
      <div className="flex items-center justify-between">
        <h2 id="upcoming-title" className="font-sans text-sm font-semibold tracking-[0.2em] text-or-light uppercase">
          À venir
        </h2>
        <Link
          href={studentRoutes.calendar}
          className="flex min-h-11 items-center text-sm font-semibold text-blanc/60 hover:text-or-light"
        >
          Calendrier
        </Link>
      </div>
      {events.length === 0 ? (
        <div className="mt-6 flex flex-col items-center gap-3 py-6 text-center text-blanc/60">
          <CalendarClock aria-hidden className="size-8 text-or/70" />
          Rien de prévu pour le moment : profitez-en pour avancer dans vos cours.
        </div>
      ) : (
        <ol className="mt-4 space-y-3">
          {events.map((e) => {
            const Icon = eventIcons[e.kind];
            return (
              <li key={e.id} className="rounded-2xl border border-line bg-noir/40 p-4">
                <div className="flex items-start gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-or/30 bg-or/10 text-or-light">
                    <Icon aria-hidden className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-blanc/50">
                      {eventLabels[e.kind]} · <Countdown startsAt={e.startsAt} endsAt={e.endsAt} />
                    </p>
                    <Link href={e.href} className="block font-semibold text-blanc hover:text-or-light">
                      {e.title}
                    </Link>
                    <p className="text-sm text-blanc/60">
                      {e.allDay ? formatDate(e.startsAt, tz) : formatDateTime(e.startsAt, tz)}
                      {e.amount ? ` · ${formatMoney(e.amount)}` : ""}
                    </p>
                  </div>
                  {e.isExample && <ExampleBadge />}
                </div>
                {e.kind === "live" && <JoinZoomButton event={e} className="mt-3 w-full sm:w-auto" />}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
