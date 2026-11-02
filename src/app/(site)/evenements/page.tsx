import { PageHero } from "@/components/layout/page-hero";
import { EventsGallery } from "@/components/gallery/events-gallery";
import { getEvents } from "@/lib/data/media";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Événements",
  description: "L'agenda de CTF ACADEMY et de l'Église : cultes, conférences, cérémonies et temps forts.",
  path: "/evenements",
});

export const revalidate = 300;

export default async function EventsPage() {
  const { data: events } = await getEvents();

  return (
    <>
      <PageHero
        eyebrow="Agenda"
        title={
          <>
            <em>Événements</em>
          </>
        }
        intro="Cultes, conférences, cérémonies : tout l'agenda de l'Église et de l'Académie."
        breadcrumb={[{ label: "Événements", href: "/evenements" }]}
      />
      <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8">
        <EventsGallery events={events} />
      </section>
    </>
  );
}
