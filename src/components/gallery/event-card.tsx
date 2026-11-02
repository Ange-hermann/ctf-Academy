import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { Badge, ExampleBadge } from "@/components/ui/badge";
import { eventTypeLabels, type ChurchEvent } from "@/content/media";

export const formatEventDate = (iso: string, opts: Intl.DateTimeFormatOptions = {}) =>
  new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", ...opts }).format(new Date(iso));

export const formatEventTime = (iso: string) =>
  new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

/** Carte événement : pastille de date dorée, visuel, titre, lieu, heure, lien détail. */
export function EventCard({ event }: { event: ChurchEvent }) {
  const d = new Date(event.startsAt);
  const day = new Intl.DateTimeFormat("fr-FR", { day: "2-digit" }).format(d);
  const month = new Intl.DateTimeFormat("fr-FR", { month: "short" }).format(d).replace(".", "");
  const cancelled = event.status === "annule";

  return (
    <Link
      href={`/evenements/${event.slug}`}
      aria-label={`Voir l'événement : ${event.title}`}
      className="group flex gap-4 overflow-hidden rounded-2xl border border-or/15 bg-gradient-card transition-all duration-300 hover:-translate-y-1 hover:border-or hover:shadow-gold focus-visible:outline-2 focus-visible:outline-or-light sm:gap-5"
    >
      {/* Pastille de date */}
      <span
        aria-hidden
        className="relative grid w-20 shrink-0 place-items-center overflow-hidden rounded-l-2xl bg-gradient-or text-noir sm:w-24"
      >
        <span className="absolute inset-0 opacity-80">
          <Image src={event.cover || "/media/events/conference.png"} alt="" fill sizes="96px" className="object-cover mix-blend-multiply opacity-30" />
        </span>
        <span className="relative flex flex-col items-center py-5">
          <span className="font-display text-3xl font-extrabold leading-none tabular">{day}</span>
          <span className="mt-1 font-nav text-sm font-semibold tracking-[0.16em] uppercase">{month}</span>
        </span>
      </span>

      <span className="min-w-0 flex-1 py-4 pr-4 sm:py-5 sm:pr-5">
        <span className="flex flex-wrap items-center gap-2">
          <Badge tone="gold">{eventTypeLabels[event.type]}</Badge>
          {cancelled && <Badge tone="danger">Annulé</Badge>}
          {event.isExample && <ExampleBadge />}
        </span>
        <span className="mt-2 block truncate font-sans text-lg font-semibold text-blanc group-hover:text-or-light">
          {event.title}
        </span>
        <span className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-blanc/60">
          <span className="inline-flex items-center gap-1.5">
            <MapPin aria-hidden className="size-4 text-or/80" />
            {event.place}
          </span>
          <span className="tabular">
            {formatEventTime(event.startsAt)}
            {event.endsAt ? ` – ${formatEventTime(event.endsAt)}` : ""}
          </span>
        </span>
        <span className="mt-3 inline-flex items-center gap-1.5 font-nav text-sm font-semibold text-or-light">
          Détails
          <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-1" />
        </span>
      </span>
    </Link>
  );
}
