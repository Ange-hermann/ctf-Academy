import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarPlus, MapPin } from "lucide-react";
import { EventCard, formatEventDate, formatEventTime } from "@/components/gallery/event-card";
import { ShareButton } from "@/components/gallery/share-button";
import { PageHero } from "@/components/layout/page-hero";
import { Badge, ExampleBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { routes } from "@/config/navigation";
import { eventTypeLabels, isUpcoming } from "@/content/media";
import { getEventBySlug, getEvents } from "@/lib/data/media";
import { pageMetadata } from "@/lib/seo";

export const revalidate = 300;

export async function generateMetadata({ params }: PageProps<"/evenements/[slug]">) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) return {};
  return pageMetadata({ title: event.title, description: event.description || `Événement : ${event.title}`, path: `/evenements/${event.slug}` });
}

/** Lien « Ajouter à Google Calendar » (rendu universel). */
const googleCalUrl = (e: { title: string; startsAt: string; endsAt: string | null; place: string; address: string; description: string }) => {
  const fmt = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const q = new URLSearchParams({
    action: "TEMPLATE",
    text: e.title,
    dates: `${fmt(e.startsAt)}/${fmt(e.endsAt ?? new Date(new Date(e.startsAt).getTime() + 3_600_000).toISOString())}`,
    location: [e.place, e.address].filter(Boolean).join(", "),
    details: e.description,
  });
  return `https://calendar.google.com/calendar/render?${q}`;
};

export default async function EventDetailPage({ params }: PageProps<"/evenements/[slug]">) {
  const { slug } = await params;
  const [event, { data: all }] = await Promise.all([getEventBySlug(slug), getEvents()]);
  if (!event) notFound();

  const related = all.filter((e) => e.slug !== event.slug && e.type === event.type).slice(0, 2);
  const fallbackRelated = related.length ? related : all.filter((e) => e.slug !== event.slug && isUpcoming(e)).slice(0, 2);
  const upcoming = isUpcoming(event);

  return (
    <>
      <PageHero
        eyebrow={`Événement — ${eventTypeLabels[event.type]}`}
        title={
          <>
            <em>{event.title}</em>
          </>
        }
        intro={
          <span className="flex flex-wrap items-center gap-x-5 gap-y-1">
            <span>{formatEventDate(event.startsAt)}</span>
            <span className="tabular">
              {formatEventTime(event.startsAt)}
              {event.endsAt ? ` – ${formatEventTime(event.endsAt)}` : ""}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin aria-hidden className="size-4 text-or" /> {event.place}
            </span>
          </span>
        }
        breadcrumb={[
          { label: "Événements", href: routes.events },
          { label: event.title, href: `/evenements/${event.slug}` },
        ]}
        registerHref={event.registerUrl ?? routes.register}
        registerLabel={event.registerUrl ? "S'inscrire à l'événement" : "S'inscrire"}
      >
        <Button asChild size="lg" variant="outline">
          <Link href={`/evenements/${event.slug}/ics`} download>
            <CalendarPlus /> Ajouter au calendrier
          </Link>
        </Button>
      </PageHero>

      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-14 sm:px-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div>
          <div className="relative aspect-2/1 overflow-hidden rounded-3xl border-gold-strong shadow-gold-lg">
            <Image
              src={event.cover || "/media/events/conference.png"}
              alt=""
              fill
              priority
              sizes="(min-width:1024px) 60vw, 100vw"
              className="object-cover"
            />
            <div aria-hidden className="absolute inset-0 bg-linear-to-t from-noir/70 via-transparent to-transparent" />
            <div className="absolute left-4 top-4 flex gap-2">
              <Badge tone="gold">{eventTypeLabels[event.type]}</Badge>
              {event.status === "annule" && <Badge tone="danger">Annulé</Badge>}
              {event.isExample && <ExampleBadge />}
            </div>
          </div>

          <h2 className="mt-8 font-nav text-sm font-semibold tracking-[0.22em] text-or-light uppercase">À propos</h2>
          <p className="mt-3 whitespace-pre-line text-lg leading-relaxed text-blanc/80">{event.description}</p>
        </div>

        <aside className="space-y-6">
          {/* Lieu + plan stylisé */}
          <div className="overflow-hidden rounded-3xl border border-line bg-gradient-card">
            <div className="p-6">
              <h3 className="flex items-center gap-2 font-nav text-sm font-semibold tracking-[0.22em] text-or-light uppercase">
                <MapPin aria-hidden className="size-4" /> Lieu
              </h3>
              <p className="mt-3 text-blanc">{event.place}</p>
              {event.address && <p className="mt-1 text-sm text-blanc/60">{event.address}</p>}
            </div>
            {/* Plan stylisé sombre (décoratif) */}
            <div aria-hidden className="relative h-40 overflow-hidden border-t border-line bg-noir">
              <svg viewBox="0 0 400 160" className="absolute inset-0 size-full opacity-60">
                <defs>
                  <linearGradient id="mapfade" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#141414" />
                    <stop offset="100%" stopColor="#0A0A0A" />
                  </linearGradient>
                </defs>
                <rect width="400" height="160" fill="url(#mapfade)" />
                <g stroke="#C9A227" strokeOpacity="0.18" strokeWidth="1" fill="none">
                  <path d="M0 60 H400 M0 110 H400 M80 0 V160 M200 0 V160 M320 0 V160" />
                  <path d="M80 110 Q140 80 200 88 T320 60" strokeOpacity="0.5" strokeWidth="2" />
                </g>
                <circle cx="200" cy="88" r="7" fill="#C9A227" />
                <circle cx="200" cy="88" r="14" fill="none" stroke="#E5C158" strokeOpacity="0.6" />
              </svg>
            </div>
          </div>

          {/* Actions */}
          <div className="rounded-3xl border border-line bg-gradient-card p-6">
            <h3 className="font-nav text-sm font-semibold tracking-[0.22em] text-or-light uppercase">Agenda</h3>
            <div className="mt-4 flex flex-col gap-3">
              <Button asChild variant="outline" className="w-full">
                <Link href={`/evenements/${event.slug}/ics`} download>
                  <CalendarPlus /> Fichier .ics
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <a href={googleCalUrl(event)} target="_blank" rel="noopener noreferrer">
                  <CalendarPlus /> Google Calendar
                </a>
              </Button>
              <ShareButton title={event.title} text={event.description} />
            </div>
            {!upcoming && <p className="mt-4 text-sm text-blanc/55">Cet événement est passé.</p>}
            <p className="mt-4">
              <Link href={routes.events} className="inline-flex items-center gap-1.5 text-sm text-or-light hover:underline">
                <ArrowLeft aria-hidden className="size-4" /> Tous les événements
              </Link>
            </p>
          </div>
        </aside>
      </section>

      {fallbackRelated.length > 0 && (
        <section className="mx-auto max-w-7xl px-5 pb-16 sm:px-8" aria-labelledby="related-events">
          <h2 id="related-events" className="font-nav text-sm font-semibold tracking-[0.22em] text-or-light uppercase">
            Événements liés
          </h2>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {fallbackRelated.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
