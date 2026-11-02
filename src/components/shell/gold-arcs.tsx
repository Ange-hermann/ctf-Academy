"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * Arcs dorés du bas de la barre latérale (signature de la maquette) :
 * trois courbes balayant le coin inférieur gauche vers le bord droit, traversées
 * par un éclat lumineux en boucle lente, au-dessus d'un halo chaud.
 * `animated={false}` pour la version statique (administration, mode allégé).
 */
export function GoldArcs({ animated = true, className }: { animated?: boolean; className?: string }) {
  const uid = useId().replace(/[:]/g, "");
  const grad = `arc-${uid}`;
  const paths = [
    { d: "M-30 292 Q 96 208 268 128", w: 2.2, o: 1 },
    { d: "M-30 302 Q 118 238 290 172", w: 1.7, o: 0.75 },
    { d: "M-30 312 Q 138 268 312 216", w: 1.3, o: 0.5 },
  ];
  return (
    <div aria-hidden className={cn("pointer-events-none relative h-56 overflow-visible", className)}>
      {/* Halo chaud dans le coin */}
      <span className="absolute -bottom-16 -left-14 size-64 rounded-full bg-or/25 blur-3xl" />
      <svg viewBox="0 0 280 240" preserveAspectRatio="xMidYMax slice" className="absolute bottom-0 left-0 h-full w-full">
        <defs>
          <linearGradient id={grad} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#C9A227" stopOpacity="0" />
            <stop offset="0.35" stopColor="#E5C158" />
            <stop offset="0.65" stopColor="#C9A227" />
            <stop offset="1" stopColor="#C9A227" stopOpacity="0" />
          </linearGradient>
        </defs>
        {paths.map((p, i) => (
          <path
            key={i}
            d={p.d}
            fill="none"
            stroke={`url(#${grad})`}
            strokeWidth={p.w}
            strokeLinecap="round"
            opacity={p.o}
            style={{ filter: "drop-shadow(0 0 6px rgba(229,193,88,0.5))" }}
          />
        ))}
        {animated &&
          paths.map((p, i) => (
            <path
              key={`s${i}`}
              d={p.d}
              fill="none"
              stroke="#F3D982"
              strokeWidth={p.w + 0.6}
              strokeLinecap="round"
              strokeDasharray="70 570"
              className="animate-arc-flow motion-reduce:animate-none"
              style={{ filter: "drop-shadow(0 0 8px rgba(243,217,130,0.9))", animationDelay: `${i * 1.4}s` }}
            />
          ))}
      </svg>
    </div>
  );
}
