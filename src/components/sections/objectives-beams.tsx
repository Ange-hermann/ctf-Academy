"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform, type MotionValue } from "motion/react";
import { ObjectivesOrb } from "@/components/ui/objectives-orb";
import { SectionTitle } from "@/components/ui/section-title";
import { churchObjectives, tintStyle, type ChurchObjective } from "@/content/identity";
import { cn } from "@/lib/utils";

type Beam = { d: string; angle: number };

function BeamPath({
  beam,
  index,
  progress,
  state,
  objective,
}: {
  beam: Beam;
  index: number;
  progress: MotionValue<number>;
  state: "idle" | "active" | "dimmed";
  objective: ChurchObjective;
}) {
  const start = index * 0.1;
  const pathLength = useTransform(progress, [start, start + 0.45], [0, 1]);
  return (
    <g style={tintStyle(objective)}>
      <motion.path
        d={beam.d}
        fill="none"
        stroke="var(--tint)"
        strokeLinecap="round"
        style={{ pathLength }}
        className={cn(
          "transition-[stroke-width,opacity] duration-500",
          state === "active" ? "opacity-100" : state === "dimmed" ? "opacity-20" : "opacity-70",
        )}
        strokeWidth={state === "active" ? 3.5 : 1.6}
        filter="url(#beam-glow)"
      />
    </g>
  );
}

function ObjectiveCard({
  objective,
  state,
  onEnter,
  onLeave,
  cardRef,
}: {
  objective: ChurchObjective;
  state: "idle" | "active" | "dimmed";
  onEnter: () => void;
  onLeave: () => void;
  cardRef?: (el: HTMLLIElement | null) => void;
}) {
  return (
    <li
      ref={cardRef}
      style={tintStyle(objective)}
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
      className={cn(
        "group relative flex items-center gap-5 rounded-2xl border bg-gradient-card p-5 outline-none transition-[box-shadow,border-color,opacity,transform] duration-500 ease-out-expo tint-border [perspective:800px]",
        state === "active" && "-translate-y-0.5 tint-glow-lg tint-border-strong",
        state === "dimmed" && "opacity-55",
      )}
    >
      <span
        aria-hidden
        className="w-14 shrink-0 text-center font-display text-5xl font-bold tint-text tint-text-glow transition-transform duration-500 group-hover:[transform:translateZ(30px)_scale(1.08)]"
      >
        {objective.number}
      </span>
      <p className="text-blanc/85">
        <span className="sr-only">Objectif {objective.number} : </span>
        <strong className="font-display text-lg tracking-wide tint-text">{objective.verb}</strong> {objective.text}
      </p>
    </li>
  );
}

/** « Le soleil et ses 5 rayons » : orbe central et 5 faisceaux colorés qui se tracent au scroll. */
export function ObjectivesBeams({ headingLevel = "h2" }: { headingLevel?: "h2" | "h3" }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const orbRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLLIElement | null)[]>([]);
  const [beams, setBeams] = useState<Beam[]>([]);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [active, setActive] = useState<number | null>(null);
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start 85%", "center 45%"] });
  const mobileFill = useTransform(useScroll({ target: containerRef, offset: ["start 70%", "end 60%"] }).scrollYProgress, [0, 1], [0, 1]);

  const measure = useCallback(() => {
    const c = containerRef.current;
    const o = orbRef.current;
    if (!c || !o || window.innerWidth < 1024) return;
    const cr = c.getBoundingClientRect();
    const or = o.getBoundingClientRect();
    const sx = or.left + or.width / 2 - cr.left;
    const sy = or.top + or.height / 2 - cr.top;
    const radius = or.width * 0.36;
    setSize({ w: cr.width, h: cr.height });
    setBeams(
      cardRefs.current.map((card) => {
        if (!card) return { d: "", angle: 0 };
        const r = card.getBoundingClientRect();
        const ex = r.left - cr.left;
        const ey = r.top + r.height / 2 - cr.top;
        const angle = Math.atan2(ey - sy, ex - sx);
        const x0 = sx + Math.cos(angle) * radius;
        const y0 = sy + Math.sin(angle) * radius;
        const dx = ex - x0;
        return { d: `M${x0},${y0} C${x0 + dx * 0.45},${y0} ${ex - dx * 0.4},${ey} ${ex},${ey}`, angle: (angle * 180) / Math.PI };
      }),
    );
  }, []);

  useLayoutEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [measure]);

  const stateOf = (n: number) => (active === null ? "idle" : active === n ? "active" : "dimmed");

  return (
    <section aria-labelledby="objectives-title" className="relative px-5 py-24 sm:px-8 sm:py-32">
      <SectionTitle
        as={headingLevel}
        eyebrow="Nos objectifs"
        title={
          <span id="objectives-title">
            Cinq rayons d&apos;une <em>même lumière</em>
          </span>
        }
        description="Les objectifs de l'Église guident chacune de nos formations."
      />

      <div ref={containerRef} className="relative mx-auto mt-16 max-w-6xl">
        {size.w > 0 && (
          <svg aria-hidden className="pointer-events-none absolute inset-0 hidden lg:block" width={size.w} height={size.h}>
            <defs>
              <filter id="beam-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            {beams.map((beam, i) =>
              beam.d ? (
                <BeamPath
                  key={i}
                  beam={beam}
                  index={i}
                  progress={scrollYProgress}
                  state={stateOf(i + 1)}
                  objective={churchObjectives[i]}
                />
              ) : null,
            )}
          </svg>
        )}

        <div className="grid items-center gap-12 lg:grid-cols-[5fr_7fr] lg:gap-24">
          <div ref={orbRef} className="mx-auto w-full max-w-[16rem] sm:max-w-xs lg:max-w-sm">
            <ObjectivesOrb facing={active ? (beams[active - 1]?.angle ?? null) : null} />
          </div>

          <div className="relative">
            {/* Fil lumineux vertical (mobile) */}
            <div aria-hidden className="absolute top-4 bottom-4 left-[2.15rem] w-px bg-or/15 lg:hidden">
              <motion.div
                style={{ scaleY: mobileFill }}
                className="h-full origin-top bg-[linear-gradient(var(--color-objectif-1),var(--color-objectif-2),var(--color-objectif-3),var(--color-objectif-4),var(--color-objectif-5))]"
              />
            </div>
            <ol className="relative space-y-4">
              {churchObjectives.map((o, i) => (
                <ObjectiveCard
                  key={o.number}
                  objective={o}
                  state={stateOf(o.number)}
                  onEnter={() => setActive(o.number)}
                  onLeave={() => setActive(null)}
                  cardRef={(el) => {
                    cardRefs.current[i] = el;
                  }}
                />
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
