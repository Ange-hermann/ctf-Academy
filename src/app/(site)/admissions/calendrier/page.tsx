import { CtaBlock } from "@/components/layout/cta-block";
import { PageHero } from "@/components/layout/page-hero";
import { SessionsCalendar } from "@/components/sections/sessions-calendar";
import { getSessions } from "@/lib/data/public";
import { pageMetadata } from "@/lib/seo";

export const revalidate = 300;

export const metadata = pageMetadata({
  title: "Calendrier des sessions",
  description: "Les prochaines sessions de formation de CTF ACADEMY et les dates limites d'inscription.",
  path: "/admissions/calendrier",
});

export default async function CalendarPage() {
  const { sessions } = await getSessions();
  const hasExamples = sessions.some((s) => s.isExample);
  return (
    <>
      <PageHero
        eyebrow="Admissions"
        title={
          <>
            Calendrier des <em>sessions</em>
          </>
        }
        intro={
          hasExamples
            ? "Les dates affichées sont des exemples, en attendant le calendrier officiel de l'Église."
            : "Les prochaines sessions et leurs dates limites d'inscription."
        }
        breadcrumb={[
          { label: "Admissions", href: "/admissions" },
          { label: "Calendrier des sessions", href: "/admissions/calendrier" },
        ]}
      />
      <section className="px-5 py-16 sm:px-8">
        <SessionsCalendar sessions={sessions} />
      </section>
      <CtaBlock />
    </>
  );
}
