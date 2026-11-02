import Link from "next/link";
import { ArrowRight, FileText, PlayCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { lessonHref, studentRoutes } from "@/config/student-nav";
import { formatMinutes } from "@/lib/student/format";
import type { Learning } from "@/lib/student/queries/learning";

/** « Continuer là où je me suis arrêté » : grande carte de reprise, ou invitation à commencer. */
export function ResumeCard({ resume, started }: { resume: Learning["resume"]; started: boolean }) {
  if (!resume) {
    return (
      <section className="flex h-full flex-col items-start justify-center gap-4 rounded-3xl border border-or/30 bg-gradient-card p-6 sm:p-8">
        <Sparkles aria-hidden className="size-8 text-or-light" />
        <h2 className="text-2xl tracking-wide">Tout est à jour</h2>
        <p className="text-blanc/65">
          Vous avez terminé toutes les leçons ouvertes. Les prochains modules s&apos;ouvriront après validation de votre
          niveau.
        </p>
        <Button asChild variant="outline">
          <Link href={studentRoutes.validations}>Voir mes validations</Link>
        </Button>
      </section>
    );
  }
  const { module, lesson } = resume;
  const left = Math.max(1, Math.round(lesson.durationMinutes * (1 - lesson.progressPercent / 100)));
  const Icon = lesson.kind === "video" ? PlayCircle : FileText;
  return (
    <section
      aria-labelledby="resume-title"
      className="group relative h-full overflow-hidden rounded-3xl border border-or/30 bg-gradient-card shadow-gold"
    >
      <div className="grid h-full sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div
          aria-hidden
          className="relative min-h-40 overflow-hidden bg-[radial-gradient(circle_at_30%_30%,color-mix(in_oklab,var(--color-or)_35%,transparent),transparent_60%),linear-gradient(135deg,var(--color-noir-soft),var(--color-noir))]"
        >
          <div className="absolute inset-0 grid place-items-center">
            <span className="grid size-18 place-items-center rounded-full border border-or/50 bg-noir/60 shadow-gold-lg transition-transform duration-500 ease-out-expo group-hover:scale-110">
              <Icon className="size-9 text-or-light" strokeWidth={1.5} />
            </span>
          </div>
          <p className="absolute bottom-3 left-4 font-display text-6xl text-or/15">
            {String(module.levelNumber ?? 1).padStart(2, "0")}
          </p>
        </div>
        <div className="flex flex-col justify-between gap-5 p-6">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-or-light/80 uppercase">
              {started ? "Continuer là où je me suis arrêté" : "Commencer le premier module"}
            </p>
            <h2 id="resume-title" className="mt-2 text-2xl tracking-wide text-blanc">
              {lesson.title}
            </h2>
            <p className="mt-1 text-blanc/60">{module.title}</p>
          </div>
          <div>
            <div className="flex items-center justify-between text-sm text-blanc/60">
              <span>
                {lesson.progressPercent} % · encore {formatMinutes(left)}
              </span>
              <span>
                Module : {module.completed}/{module.total}
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-or/10">
              <div
                className="h-full origin-left rounded-full bg-gradient-or"
                style={{ transform: `scaleX(${Math.max(lesson.progressPercent, 2) / 100})` }}
              />
            </div>
            <Button asChild size="lg" className="mt-5 w-full sm:w-auto">
              <Link href={lessonHref(module.slug, lesson.slug)}>
                {started ? "Reprendre" : "Commencer"} <ArrowRight />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
