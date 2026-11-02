import Link from "next/link";
import { ArrowRight, BookOpenCheck, ClipboardCheck, Layers } from "lucide-react";
import { CountUp } from "@/components/student/ui/count-up";
import { ProgressRing3D } from "@/components/student/ui/progress-ring-3d";
import { studentRoutes } from "@/config/student-nav";

type Stats = {
  percent: number;
  lessonsDone: number;
  lessonsTotal: number;
  assessmentsPassed: number;
  assessmentsTotal: number;
  levelsValidated: number;
  levelsTotal: number;
};

/** « Ma progression » : anneau 3D doré, pourcentage en Cinzel qui s'incrémente, sous-indicateurs. */
export function ProgressCard({ stats, levelWord }: { stats: Stats; levelWord: string }) {
  const items = [
    { icon: BookOpenCheck, label: "Leçons terminées", value: stats.lessonsDone, total: stats.lessonsTotal },
    {
      icon: ClipboardCheck,
      label: "Évaluations réussies",
      value: stats.assessmentsPassed,
      total: stats.assessmentsTotal,
    },
    {
      icon: Layers,
      label: `${levelWord} validé${stats.levelsValidated > 1 ? "s" : ""}`,
      value: stats.levelsValidated,
      total: stats.levelsTotal,
    },
  ];
  return (
    <section
      aria-labelledby="progress-title"
      className="group relative h-full overflow-hidden rounded-3xl border border-line bg-gradient-card p-6"
    >
      <div className="flex items-center justify-between">
        <h2 id="progress-title" className="font-sans text-sm font-semibold tracking-[0.2em] text-or-light uppercase">
          Ma progression
        </h2>
        <Link
          href={studentRoutes.progress}
          className="flex min-h-11 items-center gap-1 text-sm font-semibold text-blanc/60 hover:text-or-light"
        >
          Détail <ArrowRight aria-hidden className="size-4" />
        </Link>
      </div>
      <div className="mt-2 flex flex-col items-center gap-6 sm:flex-row lg:flex-col xl:flex-row">
        <ProgressRing3D value={stats.percent} size={196}>
          <div className="text-center">
            <p className="text-gradient-or-soft font-display text-5xl">
              <CountUp value={stats.percent} suffix=" %" />
            </p>
            <p className="text-xs tracking-[0.18em] text-blanc/55 uppercase">du parcours</p>
          </div>
        </ProgressRing3D>
        <dl className="grid w-full flex-1 gap-3">
          {items.map(({ icon: Icon, label, value, total }) => (
            <div key={label} className="flex items-center gap-3 rounded-2xl border border-line bg-noir/40 px-4 py-3">
              <Icon aria-hidden className="size-5 shrink-0 text-or" />
              <dt className="flex-1 text-sm text-blanc/70">{label}</dt>
              <dd className="font-display text-lg text-blanc">
                <CountUp value={value} />
                <span className="text-sm text-blanc/45"> / {total}</span>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
