"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { GoldParticles } from "@/components/effects/gold-particles";
import { churchVision } from "@/content/identity";
import { cn } from "@/lib/utils";

const normalize = (w: string) => w.toLowerCase().replace(/[.,;:!?«»]/g, "");
const highlights = new Set(churchVision.highlights.map(normalize));

/** « La déclaration » : la Vision révélée mot par mot (masque + flou → net), mots forts en or. */
export function VisionStatement({ className, eyebrow = "Notre Vision" }: { className?: string; eyebrow?: string }) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const quoteY = useTransform(scrollYProgress, [0, 1], [80, -80]);
  const quoteRotate = useTransform(scrollYProgress, [0, 1], [-18, 12]);
  const words = churchVision.text.split(" ");

  return (
    <section
      ref={ref}
      id="vision"
      aria-labelledby="vision-title"
      className={cn("relative overflow-hidden px-5 py-28 sm:px-8 sm:py-40", className)}
    >
      <GoldParticles density={50} />
      <motion.span
        aria-hidden
        style={{ y: quoteY, rotateY: quoteRotate }}
        className="pointer-events-none absolute top-10 left-1/2 -translate-x-[110%] font-display text-[16rem] leading-none text-gradient-or opacity-20 select-none sm:text-[24rem] [transform-style:preserve-3d] drop-shadow-[0_0_40px_color-mix(in_oklab,var(--color-or)_40%,transparent)]"
      >
        “
      </motion.span>

      <div className="relative mx-auto max-w-5xl text-center">
        <p className="text-xs font-semibold tracking-[0.3em] text-or-light uppercase">{eyebrow}</p>
        <h2 id="vision-title" className="sr-only">
          La Vision du Centre de Transformation des Familles
        </h2>
        <blockquote className="mt-8">
          <p className="font-display text-[clamp(1.6rem,4.4vw,3.4rem)] leading-[1.3] tracking-wide text-blanc">
            {words.map((word, i) => {
              const strong = highlights.has(normalize(word));
              return (
                <motion.span
                  key={i}
                  className="inline-block overflow-hidden pr-[0.28em] align-bottom"
                  initial={{ opacity: 0.08, filter: "blur(10px)", y: "0.35em" }}
                  whileInView={{ opacity: 1, filter: "blur(0px)", y: "0em" }}
                  viewport={{ once: true, margin: "-12% 0px" }}
                  transition={{ duration: 0.8, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
                >
                  <span className={cn(strong && "animate-shimmer text-gradient-or")}>{word}</span>
                </motion.span>
              );
            })}
          </p>
          <footer className="mt-10 text-sm tracking-[0.3em] text-blanc/60 uppercase">
            — Centre de Transformation des Familles
          </footer>
        </blockquote>
      </div>
    </section>
  );
}
