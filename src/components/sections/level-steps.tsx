"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

/** Paliers 3D : chaque niveau est une marche qui s'élève et s'illumine quand elle entre à l'écran. */
export function LevelSteps({ levels, unit = "Niveau" }: { levels: { title: string; description: string }[]; unit?: string }) {
  const [lit, setLit] = useState<number[]>([]);
  return (
    <ol className="relative mx-auto max-w-4xl space-y-5 [perspective:1400px]">
      {levels.map((level, i) => {
        const on = lit.includes(i);
        return (
          <motion.li
            key={level.title}
            initial={{ opacity: 0, rotateX: 28, y: 40, z: -80 }}
            whileInView={{ opacity: 1, rotateX: 10, y: 0, z: 0 }}
            viewport={{ once: true, margin: "-18% 0px" }}
            onViewportEnter={() => setLit((l) => (l.includes(i) ? l : [...l, i]))}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            style={{ marginLeft: `calc(${i} * min(6vw, 4.5rem))`, transformStyle: "preserve-3d" }}
            className="relative"
          >
            <div
              className={cn(
                "relative flex items-center gap-5 rounded-2xl border bg-gradient-card p-5 transition-[border-color,box-shadow] duration-1000 sm:p-6",
                on ? "border-or/50 shadow-gold-lg" : "border-line",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "absolute inset-x-6 -top-px h-px bg-gradient-or transition-opacity duration-1000",
                  on ? "opacity-100" : "opacity-0",
                )}
              />
              <span
                className={cn(
                  "grid size-14 shrink-0 place-items-center rounded-2xl font-display text-2xl transition-all duration-1000",
                  on ? "bg-gradient-or text-noir shadow-gold" : "border border-or/30 text-or-light",
                )}
              >
                {i + 1}
              </span>
              <div>
                <p className="text-xs font-semibold tracking-[0.25em] text-or-light/80 uppercase">
                  {unit} {i + 1}
                </p>
                <h3 className="mt-1 text-xl tracking-wide text-blanc">{level.title}</h3>
                <p className="mt-1 text-blanc/70">{level.description}</p>
              </div>
            </div>
            {/* Épaisseur de la marche */}
            <span aria-hidden className="absolute inset-x-3 -bottom-2 h-2 rounded-b-2xl bg-or-dark/30" />
          </motion.li>
        );
      })}
    </ol>
  );
}
