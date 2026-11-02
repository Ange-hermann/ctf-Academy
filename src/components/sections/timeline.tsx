"use client";

import { useRef } from "react";
import { motion, useScroll } from "motion/react";
import { cn } from "@/lib/utils";

type Item = { date: string; title: string; text: string };

/** Frise chronologique verticale : la ligne se remplit et les points d'or s'allument au scroll. */
export function Timeline({ items }: { items: Item[] }) {
  const ref = useRef<HTMLOListElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 75%", "end 55%"] });

  return (
    <ol ref={ref} className="relative mx-auto max-w-3xl space-y-12 pl-12 sm:pl-16">
      <span aria-hidden className="absolute top-2 bottom-2 left-[0.9rem] w-px bg-or/15 sm:left-[1.4rem]">
        <motion.span style={{ scaleY: scrollYProgress }} className="absolute inset-0 origin-top bg-gradient-or shadow-gold" />
      </span>
      {items.map((item, i) => (
        <motion.li
          key={`${item.title}-${i}`}
          initial={{ opacity: 0, x: 24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-20% 0px" }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="group relative"
        >
          <motion.span
            aria-hidden
            initial={{ scale: 0.6, opacity: 0.3 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ margin: "-45% 0px -45% 0px" }}
            className={cn(
              "absolute top-1.5 -left-12 grid size-7 place-items-center rounded-full border border-or/60 bg-noir sm:-left-16 sm:size-11",
            )}
          >
            <span className="size-2.5 rounded-full bg-gradient-or shadow-gold-lg sm:size-3.5" />
          </motion.span>
          <p className="text-sm font-semibold tracking-[0.2em] text-or-light uppercase">{item.date}</p>
          <h3 className="mt-2 text-2xl tracking-wide text-blanc">{item.title}</h3>
          <p className="mt-2 text-blanc/70">{item.text}</p>
        </motion.li>
      ))}
    </ol>
  );
}
