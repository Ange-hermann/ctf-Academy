import Link from "next/link";
import { Check, Hourglass, Lock } from "lucide-react";
import { levelStatusLabels } from "@/lib/student/labels";
import type { LevelSummary } from "@/lib/student/queries/learning";
import { cn } from "@/lib/utils";

/** Mini-frise des niveaux / étapes : l'étape actuelle pulse doucement. */
export function JourneyStrip({
  levels,
  title,
  href,
}: {
  levels: Pick<LevelSummary, "id" | "number" | "title" | "status" | "percent">[];
  title: string;
  href: string;
}) {
  return (
    <section aria-labelledby="journey-title" className="h-full rounded-3xl border border-line bg-gradient-card p-6">
      <div className="flex items-center justify-between">
        <h2 id="journey-title" className="font-sans text-sm font-semibold tracking-[0.2em] text-or-light uppercase">
          {title}
        </h2>
        <Link
          href={href}
          className="flex min-h-11 items-center text-sm font-semibold text-blanc/60 hover:text-or-light"
        >
          Tout voir
        </Link>
      </div>
      <ol
        className="relative mt-6 grid gap-4"
        style={{ gridTemplateColumns: `repeat(${Math.max(levels.length, 1)}, minmax(0, 1fr))` }}
      >
        <span aria-hidden className="absolute top-6 right-[12%] left-[12%] h-px bg-or/20" />
        {levels.map((l) => {
          const done = l.status === "validated";
          const current = l.status === "current" || l.status === "pending_decision";
          return (
            <li key={l.id} className="relative flex flex-col items-center text-center">
              <span
                className={cn(
                  "relative z-10 grid size-12 place-items-center rounded-full border font-display text-lg",
                  done && "border-or bg-gradient-or text-noir shadow-gold",
                  current && "animate-halo border-or-light bg-noir-soft text-or-light",
                  !done && !current && "border-or/20 bg-noir-soft text-blanc/40",
                )}
              >
                {done ? (
                  <Check aria-hidden className="size-5" />
                ) : l.status === "locked" ? (
                  <Lock aria-hidden className="size-4" />
                ) : l.status === "pending_decision" ? (
                  <Hourglass aria-hidden className="size-4.5" />
                ) : (
                  l.number
                )}
              </span>
              <p className={cn("mt-3 text-sm leading-tight", current ? "font-semibold text-blanc" : "text-blanc/60")}>
                {l.title.replace(/^Niveau \d+ — /, "")}
              </p>
              <p className="mt-1 text-xs text-blanc/45">
                {levelStatusLabels[l.status]}
                {current && l.percent > 0 ? ` · ${l.percent} %` : ""}
              </p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
