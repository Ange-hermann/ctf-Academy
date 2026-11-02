"use client";

import { useEffect, useRef } from "react";
import { animate, useInView, useReducedMotion } from "motion/react";

/** Compteur qui s'incrémente une seule fois à l'apparition (chiffres tabulaires, sans décalage de mise en page). */
export function CountUp({
  value,
  suffix = "",
  decimals = 0,
  duration = 1.1,
  className,
}: {
  value: number;
  suffix?: string;
  decimals?: number;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduced = useReducedMotion();
  const format = (v: number) =>
    `${new Intl.NumberFormat("fr-FR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(v)}${suffix}`;

  useEffect(() => {
    if (!inView || !ref.current || reduced) return;
    const el = ref.current;
    const controls = animate(0, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        el.textContent = format(v);
      },
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `format` dépend uniquement de props déjà listées
  }, [inView, value, reduced, duration]);

  return (
    <span ref={ref} className={`tabular ${className ?? ""}`}>
      {format(value)}
    </span>
  );
}
