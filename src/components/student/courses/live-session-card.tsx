"use client";

import { CalendarPlus, PlayCircle, Video } from "lucide-react";
import { Countdown, JoinZoomButton } from "@/components/student/dashboard/upcoming-list";
import { Button } from "@/components/ui/button";
import { ExampleBadge } from "@/components/ui/badge";
import { useNow } from "@/hooks/student/use-now";
import { formatDateTime, timeZoneLabel } from "@/lib/student/format";
import type { LiveItem } from "@/lib/student/queries/courses";

/** Encart « Cours en direct » : date en heure locale, compte à rebours, Rejoindre, ajout au calendrier, replay. */
export function LiveSessionCard({ live, tz }: { live: LiveItem; tz: string }) {
  const now = useNow();
  const ended = now !== null && now > new Date(live.endsAt).getTime();
  return (
    <div className="rounded-2xl border border-or/30 bg-or/5 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-or text-noir shadow-gold">
          <Video aria-hidden className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold tracking-[0.18em] text-or-light uppercase">
            Cours en direct · <Countdown startsAt={live.startsAt} endsAt={live.endsAt} />
          </p>
          <p className="mt-1 font-semibold text-blanc">{live.title}</p>
          <p className="text-sm text-blanc/60">
            {formatDateTime(live.startsAt, tz)} <span className="text-blanc/40">({timeZoneLabel(tz)})</span>
          </p>
        </div>
        {live.isExample && <ExampleBadge />}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {ended ? (
          live.replayUrl ? (
            <Button asChild size="sm" variant="outline">
              <a href={live.replayUrl} target="_blank" rel="noopener noreferrer">
                <PlayCircle /> Voir le replay
              </a>
            </Button>
          ) : (
            <p className="text-sm text-blanc/55">Séance terminée. Le replay sera publié ici dès qu&apos;il sera disponible.</p>
          )
        ) : (
          <>
            <JoinZoomButton event={live} />
            <Button asChild size="sm" variant="ghost">
              <a href={`/espace-etudiant/calendrier/ics?evenement=live-${live.id}`} download>
                <CalendarPlus /> Ajouter au calendrier
              </a>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
