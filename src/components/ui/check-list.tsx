"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

/** Liste à coches dorées qui se dessinent à l'apparition. */
export function CheckList({ items, className }: { items: string[]; className?: string }) {
  return (
    <ul className={cn("space-y-3", className)}>
      {items.map((item, i) => (
        <motion.li
          key={item}
          initial={{ opacity: 0, x: -12 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-8% 0px" }}
          transition={{ duration: 0.5, delay: i * 0.08 }}
          className="flex items-start gap-3 text-blanc/85"
        >
          <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border border-or/50 bg-or/10">
            <svg viewBox="0 0 24 24" aria-hidden className="size-3.5 text-or-light">
              <motion.path
                d="M5 12.5l4.5 4.5L19 7"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 + i * 0.08 }}
              />
            </svg>
          </span>
          <span>{item}</span>
        </motion.li>
      ))}
    </ul>
  );
}
