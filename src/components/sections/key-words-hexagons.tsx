"use client";

import { useRef, useState } from "react";
import { motion, useScroll, useTransform, type MotionValue } from "motion/react";
import { Hexagon3D } from "@/components/ui/hexagon-3d";
import { SectionTitle } from "@/components/ui/section-title";
import { keyWords, tintStyle, type KeyWordSlug } from "@/content/identity";
import { cn } from "@/lib/utils";

/** Centres des hexagones (en %) dans la disposition en nid d'abeille : zigzag 1→2→3→4→5. */
const NODES = [
  { x: 16.67, y: 25 },
  { x: 33.33, y: 75 },
  { x: 50, y: 25 },
  { x: 66.67, y: 75 },
  { x: 83.33, y: 25 },
];
const COL_START = ["lg:col-start-1", "lg:col-start-2", "lg:col-start-3", "lg:col-start-4", "lg:col-start-5"];
const ROW = ["lg:row-start-1", "lg:row-start-2", "lg:row-start-1", "lg:row-start-2", "lg:row-start-1"];

function ThreadNode({ index, progress }: { index: number; progress: MotionValue<number> }) {
  const at = index / (NODES.length - 1);
  const opacity = useTransform(progress, [at - 0.08, at], [0.25, 1]);
  const scale = useTransform(progress, [at - 0.08, at], [0.6, 1.25]);
  const kw = keyWords[index];
  return (
    <motion.span
      style={{ ...tintStyle(kw), left: `${NODES[index].x}%`, top: `${NODES[index].y}%`, opacity, scale }}
      className="absolute size-3 -translate-1/2 rounded-full tint-dot"
    />
  );
}

/** « Les 5 hexagones de lumière » : assemblage au scroll, fil lumineux, tilt + flip ; carrousel 3D sur mobile. */
export function KeyWordsHexagons({ headingLevel = "h2" }: { headingLevel?: "h2" | "h3" }) {
  const [active, setActive] = useState<KeyWordSlug | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 80%", "end 45%"] });
  const pathLength = useTransform(scrollYProgress, [0, 1], [0, 1]);

  const [slide, setSlide] = useState(0);
  const onCarouselScroll = (e: React.UIEvent<HTMLUListElement>) => {
    const el = e.currentTarget;
    const card = el.firstElementChild as HTMLElement | null;
    if (!card) return;
    setSlide(Math.round(el.scrollLeft / (card.offsetWidth + 16)));
  };

  return (
    <section aria-labelledby="key-words-title" className="relative overflow-hidden px-5 py-24 sm:px-8 sm:py-32">
      <SectionTitle
        as={headingLevel}
        eyebrow="Les 5 mots clés"
        title={
          <span id="key-words-title">
            Cinq mots pour une <em>vie transformée</em>
          </span>
        }
        description="Touchez ou survolez un hexagone pour découvrir le sens de chaque mot."
      />

      {/* Desktop : nid d'abeille */}
      <div ref={ref} className="relative mx-auto mt-16 hidden max-w-6xl lg:block">
        <svg aria-hidden className="pointer-events-none absolute inset-0 size-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <polyline
            points={NODES.map((n) => `${n.x},${n.y}`).join(" ")}
            fill="none"
            className="stroke-or/15"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
          <motion.polyline
            points={NODES.map((n) => `${n.x},${n.y}`).join(" ")}
            fill="none"
            className="stroke-or-light"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
            style={{ pathLength }}
          />
        </svg>
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          {NODES.map((_, i) => (
            <ThreadNode key={i} index={i} progress={scrollYProgress} />
          ))}
        </div>
        <ul className="relative grid grid-cols-6 gap-x-6 gap-y-10 py-4">
          {keyWords.map((kw, i) => (
            <motion.li
              key={kw.slug}
              className={cn("col-span-2", COL_START[i], ROW[i])}
              initial={{ opacity: 0, y: -140, rotateX: -55, scale: 0.8 }}
              whileInView={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
              viewport={{ once: true, margin: "-10% 0px" }}
              transition={{ type: "spring", stiffness: 140, damping: 13, delay: i * 0.14 }}
            >
              <Hexagon3D
                keyWord={kw}
                active={active === kw.slug}
                dimmed={active !== null && active !== kw.slug}
                onActivate={setActive}
              />
            </motion.li>
          ))}
        </ul>
      </div>

      {/* Mobile / tablette : carrousel coverflow */}
      <ul
        onScroll={onCarouselScroll}
        aria-label="Les 5 mots clés"
        className="-mx-5 mt-12 flex snap-x snap-mandatory gap-4 overflow-x-auto px-[9vw] pb-6 [perspective:900px] [scrollbar-width:none] sm:-mx-8 lg:hidden"
      >
        {keyWords.map((kw, i) => {
          const offset = i - slide;
          return (
            <li
              key={kw.slug}
              className="w-[82vw] max-w-sm shrink-0 snap-center transition-[transform,opacity] duration-500 ease-out-expo"
              style={{
                transform: `rotateY(${Math.max(-1, Math.min(1, offset)) * -22}deg) scale(${offset === 0 ? 1 : 0.88})`,
                opacity: offset === 0 ? 1 : 0.6,
              }}
            >
              <Hexagon3D keyWord={kw} />
            </li>
          );
        })}
      </ul>
      <div className="mt-2 flex justify-center gap-2 lg:hidden" aria-hidden>
        {keyWords.map((kw, i) => (
          <span
            key={kw.slug}
            style={tintStyle(kw)}
            className={cn("h-1.5 rounded-full transition-all duration-500", i === slide ? "w-6 tint-bg" : "w-1.5 bg-blanc/20")}
          />
        ))}
      </div>
    </section>
  );
}
