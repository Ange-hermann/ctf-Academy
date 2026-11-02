import Link from "next/link";
import { CalendarPlus, ClipboardCheck, CreditCard, Flag, PlayCircle, Video } from "lucide-react";
import { JoinZoomButton } from "@/components/student/dashboard/upcoming-list";
import { ExampleBadge } from "@/components/ui/badge";
import { googleCalendarUrl } from "@/lib/student/ics";
import { formatMoney, formatTime } from "@/lib/student/format";
import type { EventKind, StudentEvent } from "@/lib/student/queries/calendar";

const icons: Record<EventKind, typeof Video> = { live: Video, assessment: ClipboardCheck, payment: CreditCard, milestone: Flag };

/** Ligne d'agenda : type, heure, titre lié, actions (Zoom, ajout agenda). */
export function EventRow({ event, tz }: { event: StudentEvent; tz: string }) {
  const Icon = icons[event.kind];
  return (
    <li className="rounded-2xl border border-line bg-noir/40 p-4">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-or/25 bg-or/8 text-or-light">
          <Icon aria-hidden className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-blanc">{event.title}</p>
          <p className="mt-0.5 text-sm text-blanc/55">
            {event.allDay ? "Toute la journée" : `${formatTime(event.startsAt, tz)}${event.endsAt ? ` – ${formatTime(event.endsAt, tz)}` : ""}`}
            {event.amount !== null && ` · ${formatMoney(event.amount)}`}
          </p>
          {event.description && <p className="mt-1 line-clamp-2 text-sm text-blanc/50">{event.description}</p>}
        </div>
        {event.isExample && <ExampleBadge />}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {event.kind === "live" && (
          <>
            <JoinZoomButton event={event} />
            {event.replayUrl && (
              <a href={event.replayUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-sm text-or-light hover:underline">
                <PlayCircle className="size-4" /> Replay
              </a>
            )}
          </>
        )}
        {event.href && event.href !== "/espace-etudiant/calendrier" && (
          <Link href={event.href} className="inline-flex min-h-9 items-center rounded-lg px-2 text-sm font-medium text-or-light hover:underline">
            Ouvrir
          </Link>
        )}
        <a href={`/espace-etudiant/calendrier/ics?evenement=${event.id}`} download className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-sm text-blanc/60 hover:text-or-light">
          <CalendarPlus className="size-4" /> Agenda
        </a>
        <a href={googleCalendarUrl(event)} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-sm text-blanc/60 hover:text-or-light">
          Google Agenda
        </a>
      </div>
    </li>
  );
}
