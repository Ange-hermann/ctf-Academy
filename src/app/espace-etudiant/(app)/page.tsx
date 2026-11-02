import Link from "next/link";
import { GoldParticles } from "@/components/effects/gold-particles";
import { CompassMini } from "@/components/student/compass/compass-mini";
import { AnnouncementsMini } from "@/components/student/dashboard/announcements-mini";
import { JourneyStrip } from "@/components/student/dashboard/journey-strip";
import { ProgressCard } from "@/components/student/dashboard/progress-card";
import { QuickAccess, type QuickItem } from "@/components/student/dashboard/quick-access";
import { ResumeCard } from "@/components/student/dashboard/resume-card";
import { UpcomingList } from "@/components/student/dashboard/upcoming-list";
import { WelcomeBanner } from "@/components/student/dashboard/welcome-banner";
import { formationNav, studentMainNav, studentRoutes } from "@/config/student-nav";
import { getFormation } from "@/content/formations";
import { formatMoney, greeting } from "@/lib/student/format";
import { getDashboard } from "@/lib/student/queries/dashboard";
import { requireStudent } from "@/lib/student/session";

export const metadata = { title: "Tableau de bord" };

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

/** « La salle de lumière » : où j'en suis, quoi faire maintenant, tout à un clic. */
export default async function StudentDashboardPage() {
  const ctx = await requireStudent();
  const data = await getDashboard(ctx);
  const formation = getFormation(ctx.enrollment.formation)!;
  const { metrics, learning } = data;
  const isDeacon = formation.slug === "diacres";

  const metricFor: Record<string, Pick<QuickItem, "metric" | "highlight">> = {
    [studentRoutes.courses]: metrics.lessonsLeft
      ? { metric: `${plural(metrics.lessonsLeft, "leçon", "leçons")} à terminer`, highlight: true }
      : { metric: "Toutes les leçons ouvertes sont terminées" },
    [studentRoutes.assessments]: metrics.toTake
      ? { metric: `${plural(metrics.toTake, "évaluation", "évaluations")} à passer`, highlight: true }
      : { metric: "Aucune évaluation en attente" },
    [studentRoutes.progress]: { metric: `${data.stats.percent} % du parcours` },
    [studentRoutes.calendar]: {
      metric: metrics.upcomingCount
        ? `${plural(metrics.upcomingCount, "événement", "événements")} à venir`
        : "Rien de prévu",
    },
    [studentRoutes.payments]: metrics.remaining
      ? {
          metric: `Reste ${formatMoney(metrics.remaining)}${metrics.lateSchedules ? " · en retard" : ""}`,
          highlight: metrics.lateSchedules > 0,
        }
      : { metric: "Tout est réglé" },
    [studentRoutes.validations]: {
      metric: metrics.validationsGranted
        ? `${plural(metrics.validationsGranted, "validation obtenue", "validations obtenues")}`
        : `${plural(metrics.validationsPending, "décision", "décisions")} en attente`,
    },
    [studentRoutes.messages]: metrics.unreadMessages
      ? { metric: `${plural(metrics.unreadMessages, "message non lu", "messages non lus")}`, highlight: true }
      : { metric: "Aucun message non lu" },
  };
  const quick: QuickItem[] = studentMainNav
    .filter((i) => i.href in metricFor)
    .map((i) => ({ ...i, ...metricFor[i.href] }));

  const started = learning.completedLessons > 0 || learning.modules.some((m) => m.status === "in_progress");

  return (
    <div className="relative">
      <div aria-hidden className="lite-hide pointer-events-none fixed inset-0 z-0">
        <GoldParticles density={26} />
      </div>
      <div className="relative z-10 grid gap-5 lg:grid-cols-12">
        <div className="cascade lg:col-span-12" style={{ "--i": 0 } as React.CSSProperties}>
          <WelcomeBanner
            firstName={ctx.firstName}
            greeting={greeting(ctx.timezone)}
            formation={formation}
            levelTitle={learning.currentLevel?.title ?? null}
            reference={ctx.enrollment.reference}
          />
        </div>
        <div className="cascade lg:col-span-5" style={{ "--i": 1 } as React.CSSProperties}>
          <ProgressCard stats={data.stats} levelWord={isDeacon ? "Étapes" : "Niveaux"} />
        </div>
        <div className="cascade lg:col-span-7" style={{ "--i": 2 } as React.CSSProperties}>
          <ResumeCard resume={learning.resume} started={started} />
        </div>
        <div className="cascade lg:col-span-5" style={{ "--i": 3 } as React.CSSProperties}>
          <UpcomingList events={data.upcoming} tz={ctx.timezone} />
        </div>
        <div className="cascade lg:col-span-7" style={{ "--i": 4 } as React.CSSProperties}>
          <JourneyStrip
            levels={learning.levels}
            title={isDeacon ? "Parcours du diacre" : "Parcours de ma formation"}
            href={isDeacon ? studentRoutes.progress : formationNav[formation.slug][0].href}
          />
        </div>
        <div className="lg:col-span-12">
          <QuickAccess items={quick} />
        </div>
        <div className="cascade lg:col-span-7" style={{ "--i": 6 } as React.CSSProperties}>
          <AnnouncementsMini items={data.announcements} tz={ctx.timezone} />
        </div>
        <div className="cascade lg:col-span-5" style={{ "--i": 7 } as React.CSSProperties}>
          <section
            aria-labelledby="compass-title"
            className="flex h-full flex-col items-center rounded-3xl border border-line bg-gradient-card p-6"
          >
            <div className="flex w-full items-center justify-between">
              <h2
                id="compass-title"
                className="font-sans text-sm font-semibold tracking-[0.2em] text-or-light uppercase"
              >
                Ma boussole
              </h2>
              <Link
                href={studentRoutes.compass}
                className="flex min-h-11 items-center text-sm font-semibold text-blanc/60 hover:text-or-light"
              >
                Explorer
              </Link>
            </div>
            <div className="mt-4">
              <CompassMini values={data.compass} />
            </div>
            <p className="mt-3 text-center text-sm text-blanc/55">
              Les 5 mots clés s&apos;illuminent au fil des leçons suivies.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
