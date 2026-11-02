import { cn } from "@/lib/utils";
import { churchName, objectivesTitle } from "@/content/identity";

/**
 * Orbe « Objectifs de l'église » : verre sombre, anneaux dorés en rotation lente (CSS 3D), noyau qui pulse.
 * `facing` (degrés) oriente le repère doré vers l'objectif survolé.
 */
export function ObjectivesOrb({ className, facing }: { className?: string; facing?: number | null }) {
  return (
    <div className={cn("relative aspect-square [perspective:900px]", className)}>
      <div aria-hidden className="absolute inset-[-18%] rounded-full bg-or/10 blur-3xl" />
      <div aria-hidden className="absolute inset-[8%] animate-pulse-core rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--color-or-light)_35%,transparent),transparent_65%)]" />
      {/* Anneaux */}
      <div aria-hidden className="absolute inset-0 [transform-style:preserve-3d] [transform:rotateX(68deg)]">
        <div className="absolute inset-0 animate-spin-slow rounded-full border border-or/50 shadow-gold" />
        <div className="absolute inset-[6%] animate-[spin_26s_linear_infinite_reverse] rounded-full border border-dashed border-or/30" />
      </div>
      <div aria-hidden className="absolute inset-0 [transform-style:preserve-3d] [transform:rotateY(64deg)]">
        <div className="absolute inset-[3%] animate-[spin_32s_linear_infinite] rounded-full border border-or-light/25" />
      </div>
      {/* Repère orienté vers l'objectif actif */}
      <div
        aria-hidden
        className={cn("absolute inset-[-4%] transition-[rotate,opacity] duration-700 ease-out-expo", facing == null && "opacity-0")}
        style={{ rotate: `${facing ?? 0}deg` }}
      >
        <span className="absolute top-1/2 right-0 size-3 -translate-y-1/2 rounded-full bg-or-light shadow-gold-lg" />
      </div>
      {/* Sphère de verre */}
      <div className="absolute inset-[14%] grid place-items-center overflow-hidden rounded-full border border-or/40 bg-[radial-gradient(circle_at_32%_28%,color-mix(in_oklab,var(--color-blanc)_16%,transparent),transparent_38%),radial-gradient(circle_at_50%_60%,var(--color-noir-card),var(--color-noir)_75%)] shadow-gold-lg">
        <div className="px-[12%] text-center">
          <p className="font-display text-[clamp(1.05rem,2.4vw,1.6rem)] leading-tight tracking-wide text-gradient-or">
            {objectivesTitle}
          </p>
          <p className="mt-2 text-[0.6rem] tracking-[0.2em] text-blanc/55 uppercase sm:text-[0.65rem]">{churchName}</p>
        </div>
      </div>
    </div>
  );
}
