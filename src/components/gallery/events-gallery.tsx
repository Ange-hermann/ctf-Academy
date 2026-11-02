"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, CalendarDays, ChevronDown, MapPin } from "lucide-react";
import { EventCard, formatEventTime } from "@/components/gallery/event-card";
import { EventCountdown } from "@/components/gallery/event-countdown";
import { Badge, ExampleBadge } from "@/components/ui/badge";
import { eventTypeLabels, isUpcoming, type ChurchEvent } from "@/content/media";
import { cn } from "@/lib/utils";

const monthLabel = (iso: string) =>
  new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(new Date(iso));

/**
 * Rubrique Événements : prochain événement mis en avant avec compte à rebours,
 * filtres par type et par mois, événements à venir groupés par mois et archive
 * repliable des événements passés.
 */
export function EventsGallery({ events }: { events: ChurchEvent[] }) {
  const [type, setType] = useState<ChurchEvent["type"] | null>(null);
  const [month, setMonth] = useState<string | null>(null);
  const [archiveOpen, setArchiveOpen] = useState(false);

  const upcoming = useMemo(() => events.filter((e) => isUpcoming(e) && e.status !== "annule"), [events]);
  const past = useMemo(() => events.filter((e) => !isUpcoming(e) || e.status === "annule"), [events]);
  const featured = useMemo(() => upcoming.find((e) => e.featured) ?? upcoming[0] ?? null, [upcoming]);

  const types = useMemo(() => [...new Set(events.map((e) => e.type))], [events]);
  const months = useMemo(() => [...new Set(upcoming.map((e) => e.startsAt.slice(0, 7)))].sort(), [upcoming]);

  const filtered = useMemo(
    () =>
      upcoming.filter((e) => {
        if (type && e.type !== type) return false;
        if (month && !e.startsAt.startsWith(month)) return false;
        return true;
      }),
    [upcoming, type, month],
  );

  const byMonth = useMemo(() => {
    const map = new Map<string, ChurchEvent[]>();
    for (const e of filtered) {
      const key = e.startsAt.slice(0, 7);
      map.set(key, [...(map.get(key) ?? []), e]);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const chip = (active: boolean) =>
    cn(
      "inline-flex min-h-11 items-center rounded-full border px-4 font-sans text-sm font-medium transition-all",
      active
        ? "border-or bg-gradient-or text-noir shadow-gold-sm"
        : "border-or/25 text-or-light/85 hover:border-or/60 hover:bg-or/10",
    );

  return (
    <>
      {/* Événement mis en avant */}
      {featured && (
        <section
          aria-labelledby="featured-event"
          className="relative overflow-hidden rounded-3xl border-gold-strong shadow-gold-lg"
        >
          <Image
            src={featured.cover || "/media/events/conference.png"}
            alt=""
            fill
            priority
            sizes="(min-width:1024px) 90vw, 100vw"
            className="object-cover"
          />
          <div aria-hidden className="absolute inset-0 bg-linear-to-r from-noir/95 via-noir/70 to-noir/20" />
          <div className="relative flex flex-col gap-5 p-6 sm:p-10 lg:max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="gold">À la une</Badge>
              <Badge tone="gold">{eventTypeLabels[featured.type]}</Badge>
              {featured.isExample && <ExampleBadge />}
            </div>
            <h2 id="featured-event" className="font-display text-3xl font-extrabold text-blanc sm:text-4xl">
              {featured.title}
            </h2>
            <p className="text-blanc/75">{featured.description}</p>
            <p className="flex items-center gap-2 text-sm text-or-light">
              <MapPin aria-hidden className="size-4" />
              {featured.place} · {formatEventTime(featured.startsAt)}
            </p>
            <EventCountdown startsAt={featured.startsAt} />
            <div className="pt-1">
              <Link
                href={`/evenements/${featured.slug}`}
                className="group/btn relative isolate inline-flex min-h-12 items-center gap-2 overflow-hidden rounded-2xl bg-gradient-or px-6 font-nav font-semibold text-noir shadow-gold transition-shadow hover:shadow-gold-lg"
              >
                Voir l&apos;événement
                <ArrowRight aria-hidden className="size-5 transition-transform group-hover/btn:translate-x-1" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Filtres */}
      <div className="mt-10 flex flex-wrap items-center gap-2.5" role="group" aria-label="Filtrer par type d'événement">
        <button type="button" className={chip(type === null)} onClick={() => setType(null)}>
          Tous
        </button>
        {types.map((t) => (
          <button key={t} type="button" className={chip(type === t)} onClick={() => setType(t)}>
            {eventTypeLabels[t]}
          </button>
        ))}
        {months.length > 1 && (
          <label className="relative ml-auto inline-flex items-center">
            <span className="sr-only">Filtrer par mois</span>
            <select
              value={month ?? ""}
              onChange={(e) => setMonth(e.target.value || null)}
              className="min-h-11 appearance-none rounded-full border border-or/25 bg-noir-soft px-4 pr-9 font-sans text-sm text-or-light/85 transition-colors hover:border-or/60 focus-visible:outline-2 focus-visible:outline-or-light"
            >
              <option value="">Tous les mois</option>
              {months.map((m) => (
                <option key={m} value={m}>
                  {monthLabel(`${m}-02`)}
                </option>
              ))}
            </select>
            <ChevronDown aria-hidden className="pointer-events-none absolute right-3 size-4 text-or-light/70" />
          </label>
        )}
      </div>

      {/* À venir, groupés par mois */}
      {byMonth.length === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-3 rounded-3xl border border-line bg-gradient-card px-6 py-16 text-center">
          <CalendarDays aria-hidden className="size-10 text-or/60" />
          <p className="text-blanc/75">Aucun événement à venir pour le moment.</p>
        </div>
      ) : (
        <div className="mt-8 space-y-10">
          {byMonth.map(([m, list]) => (
            <section key={m} aria-labelledby={`month-${m}`}>
              <h3 id={`month-${m}`} className="font-nav text-sm font-semibold tracking-[0.22em] text-or-light uppercase">
                {monthLabel(`${m}-02`)}
              </h3>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                {list.map((e) => (
                  <EventCard key={e.id} event={e} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Archive */}
      {past.length > 0 && (
        <section className="mt-12" aria-labelledby="archive-title">
          <button
            type="button"
            onClick={() => setArchiveOpen((v) => !v)}
            aria-expanded={archiveOpen}
            aria-controls="archive-list"
            className="flex w-full items-center justify-between rounded-2xl border border-line bg-gradient-card px-5 py-4 text-left transition-colors hover:border-or/40"
          >
            <h3 id="archive-title" className="font-nav text-sm font-semibold tracking-[0.22em] text-or-light uppercase">
              Événements passés ({past.length})
            </h3>
            <ChevronDown aria-hidden className={cn("size-5 text-or-light transition-transform", archiveOpen && "rotate-180")} />
          </button>
          <div id="archive-list" className={cn("mt-4 grid gap-4 lg:grid-cols-2", !archiveOpen && "hidden")}>
            {past.map((e) => (
              <div key={e.id} className="opacity-70 transition-opacity hover:opacity-100">
                <EventCard event={e} />
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
