"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, type MotionValue } from "motion/react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type Step = { id: string; label: string; description?: string };

function ScrollNode({ index, total, progress }: { index: number; total: number; progress: MotionValue<number> }) {
  const at = total > 1 ? index / (total - 1) : 1;
  const lit = useTransform(progress, [at - 0.12, at], [0, 1]);
  return (
    <motion.span
      aria-hidden
      style={{ opacity: lit }}
      className="absolute inset-0 grid place-items-center rounded-full bg-gradient-or text-noir shadow-gold-lg"
    >
      {index + 1}
    </motion.span>
  );
}

/**
 * « Le chemin doré » : étapes reliées par une ligne lumineuse.
 * - `current` défini : mode assistant (étapes passées validées, étape courante allumée).
 * - sinon : la ligne se remplit et les points s'allument au scroll.
 */
export function StepPath({
  steps,
  current,
  orientation = "auto",
  className,
}: {
  steps: readonly Step[];
  current?: number;
  orientation?: "auto" | "horizontal";
  className?: string;
}) {
  const ref = useRef<HTMLOListElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 80%", "end 55%"] });
  const scrollMode = current === undefined;
  const fill = scrollMode ? scrollYProgress : null;
  const ratio = scrollMode ? 0 : Math.max(0, current) / Math.max(1, steps.length - 1);
  const horizontal = orientation === "horizontal";

  return (
    <ol
      ref={ref}
      className={cn(
        "relative grid gap-6",
        horizontal ? "grid-flow-col auto-cols-fr gap-2" : "md:grid-flow-col md:auto-cols-fr md:gap-4",
        className,
      )}
    >
      {/* Rail */}
      <span
        aria-hidden
        className={cn(
          "absolute bg-or/15",
          horizontal ? "top-5 right-[10%] left-[10%] h-0.5" : "top-5 bottom-5 left-5 w-0.5 md:top-5 md:right-[10%] md:bottom-auto md:left-[10%] md:h-0.5 md:w-auto",
        )}
      >
        {fill ? (
          <>
            <motion.span
              style={{ scaleY: fill }}
              className={cn("absolute inset-0 origin-top bg-gradient-or shadow-gold md:hidden", horizontal && "hidden")}
            />
            <motion.span
              style={{ scaleX: fill }}
              className={cn("absolute inset-0 hidden origin-left bg-gradient-or shadow-gold md:block", horizontal && "block")}
            />
          </>
        ) : (
          <span
            className="absolute inset-0 origin-left bg-gradient-or shadow-gold transition-transform duration-700 ease-out-expo"
            style={{ transform: `scaleX(${ratio})` }}
          />
        )}
      </span>

      {steps.map((step, i) => {
        const done = !scrollMode && i < current;
        const isCurrent = !scrollMode && i === current;
        return (
          <li
            key={step.id}
            aria-current={isCurrent ? "step" : undefined}
            className={cn(
              "relative flex gap-4",
              horizontal ? "flex-col items-center text-center" : "items-start md:flex-col md:items-center md:text-center",
            )}
          >
            <span
              className={cn(
                "relative grid size-10 shrink-0 place-items-center rounded-full border text-sm font-bold transition-all duration-500",
                done || isCurrent ? "border-or text-noir" : "border-or/30 bg-noir-soft text-or-light",
                isCurrent && "animate-halo",
              )}
            >
              {!scrollMode && (done || isCurrent) && (
                <span aria-hidden className="absolute inset-0 rounded-full bg-gradient-or" />
              )}
              <span className="relative">{done ? <Check className="size-4" aria-hidden /> : i + 1}</span>
              {scrollMode && <ScrollNode index={i} total={steps.length} progress={scrollYProgress} />}
            </span>
            {!horizontal ? (
              <span className="pt-1.5 md:pt-0">
                <span className="block font-semibold text-blanc">{step.label}</span>
                {step.description && <span className="mt-1 block text-sm text-blanc/60">{step.description}</span>}
              </span>
            ) : (
              <span className={cn("hidden text-xs sm:block", isCurrent ? "text-or-light" : "text-blanc/55")}>{step.label}</span>
            )}
            <span className="sr-only">{done ? " (terminée)" : isCurrent ? " (étape en cours)" : ""}</span>
          </li>
        );
      })}
    </ol>
  );
}
