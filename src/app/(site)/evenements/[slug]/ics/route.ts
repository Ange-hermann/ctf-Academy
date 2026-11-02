import { getEventBySlug } from "@/lib/data/media";
import { siteConfig } from "@/config/site";

const stamp = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");

/** Export calendrier (.ics) d'un événement publié. */
export async function GET(_request: Request, { params }: RouteContext<"/evenements/[slug]/ics">) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) return new Response("Événement introuvable", { status: 404 });

  const body = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CTF ACADEMY//Evenements//FR",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${event.id}@${new URL(siteConfig.url).hostname}`,
    `DTSTAMP:${stamp(new Date().toISOString())}`,
    `DTSTART:${stamp(event.startsAt)}`,
    event.endsAt ? `DTEND:${stamp(event.endsAt)}` : null,
    `SUMMARY:${esc(event.title)}`,
    event.description ? `DESCRIPTION:${esc(event.description)}` : null,
    `LOCATION:${esc([event.place, event.address].filter(Boolean).join(", "))}`,
    `URL:${new URL(`/evenements/${event.slug}`, siteConfig.url)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${event.slug}.ics"`,
    },
  });
}
