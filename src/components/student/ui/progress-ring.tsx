"use client";

import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

/** Anneau de progression 2D (SVG) : version légère et de secours de l'anneau 3D. Se remplit une fois. */
export function ProgressRing({
  value,
  size = 64,
  stroke = 6,
  className,
  children,
  label,
}: {
  value: number;
  size?: number;
  stroke?: number;
  className?: string;
  children?: React.ReactNode;
  label?: string;
}) {
  const reduced = useReducedMotion();
  const r = (size - stroke) / 2;
  const v = Math.max(0, Math.min(100, value)) / 100;
  const id = `ring-${size}-${stroke}`;
  return (
    <div
      role="img"
      aria-label={label ?? `Progression : ${Math.round(v * 100)} %`}
      className={cn("relative inline-grid shrink-0 place-items-center", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--color-or-light)" />
            <stop offset="55%" stopColor="var(--color-or)" />
            <stop offset="100%" stopColor="var(--color-or-dark)" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-or)"
          strokeOpacity={0.14}
          strokeWidth={stroke}
        />
        {v > 0 && (
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={`url(#${id})`}
            strokeWidth={stroke}
            strokeLinecap="round"
            initial={{ pathLength: reduced ? v : 0 }}
            whileInView={{ pathLength: v }}
            viewport={{ once: true }}
            transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
            style={{ filter: "drop-shadow(0 0 4px rgb(201 162 39 / 0.45))" }}
          />
        )}
      </svg>
      {children && <div className="absolute inset-0 grid place-items-center">{children}</div>}
    </div>
  );
}
