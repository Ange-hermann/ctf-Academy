"use client";

import { useEffect, useRef } from "react";
import { animate, useInView } from "motion/react";

function Counter({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  useEffect(() => {
    if (!inView || !ref.current) return;
    const el = ref.current;
    const controls = animate(0, value, {
      duration: 1.6,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        el.textContent = String(Math.round(v));
      },
    });
    return () => controls.stop();
  }, [inView, value]);
  return <span ref={ref}>{value}</span>;
}

/** Chiffres clés animés (compteurs qui démarrent à l'apparition). */
export function KeyFigures({ items }: { items: { value: number; label: string }[] }) {
  return (
    <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="flex flex-col-reverse rounded-2xl border border-line bg-gradient-card p-6 text-center">
          <dt className="mt-2 text-blanc/70">{item.label}</dt>
          <dd className="font-display text-5xl text-gradient-or sm:text-6xl">
            <Counter value={item.value} />
          </dd>
        </div>
      ))}
    </dl>
  );
}
