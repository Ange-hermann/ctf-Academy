"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform, type MotionValue } from "motion/react";
import { KeyWordsHexagons } from "@/components/sections/key-words-hexagons";
import { ObjectivesBeams } from "@/components/sections/objectives-beams";
import { VisionStatement } from "@/components/sections/vision-statement";
import { HEX_NODES, OBJECTIVE_NODES, ORB_CENTER, toPercent } from "@/components/three/cinematic-layout";
import { WebGLBoundary, supportsWebGL } from "@/components/three/webgl-boundary";
import { churchName, churchObjectives, churchVision, keyWords, objectivesTitle, tintStyle } from "@/content/identity";
import { usePerf } from "@/hooks/use-perf";

const Scene = dynamic(() => import("@/components/three/vision-cinematic-scene"), { ssr: false });

/** Version séquentielle (mobile, mode allégé, mouvement réduit) : les 3 scènes empilées. */
function SequentialFallback() {
  return (
    <>
      <VisionStatement eyebrow="1 · La Vision" />
      <KeyWordsHexagons />
      <ObjectivesBeams />
    </>
  );
}

function Fade({
  progress,
  range,
  className,
  style,
  children,
}: {
  progress: MotionValue<number>;
  range: [number, number, number, number];
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const opacity = useTransform(progress, range, [0, 1, 1, 0]);
  const blur = useTransform(progress, range, ["blur(12px)", "blur(0px)", "blur(0px)", "blur(12px)"]);
  const y = useTransform(progress, range, [24, 0, 0, -24]);
  return (
    <motion.div style={{ ...style, opacity, filter: blur, y }} className={className}>
      {children}
    </motion.div>
  );
}

/**
 * Scroll cinématique continu : la Vision se disperse en particules qui forment les 5 hexagones,
 * puis se regroupent en l'orbe d'où naissent les 5 faisceaux des objectifs.
 * Tous les textes restent du HTML réel (lisible, accessible, indexable).
 */
export function VisionCinematic() {
  const { ready, canAnimate3D } = usePerf();
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (!ready) return;
    const id = requestAnimationFrame(() =>
      setEnabled(canAnimate3D && window.innerWidth >= 1024 && supportsWebGL()),
    );
    return () => cancelAnimationFrame(id);
  }, [ready, canAnimate3D]);

  if (!enabled) return <SequentialFallback />;
  return (
    <WebGLBoundary fallback={<SequentialFallback />}>
      <CinematicStage />
    </WebGLBoundary>
  );
}

function CinematicStage() {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section ref={ref} aria-label="Vision, mots clés et objectifs" className="relative h-[520vh]">
        <div className="sticky top-0 h-screen overflow-hidden">
          <div aria-hidden className="absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_40%,color-mix(in_oklab,var(--color-or)_10%,transparent),transparent_70%)]" />
          <div className="absolute inset-0">
            <Scene progress={scrollYProgress} active={visible} />
          </div>

          {/* Scène 1 — la Vision */}
          <Fade progress={scrollYProgress} range={[-0.01, 0.02, 0.12, 0.2]} className="absolute inset-0 grid place-items-center px-[7.5vw]">
            <div className="text-center">
              <p className="text-xs font-semibold tracking-[0.3em] text-or-light uppercase">1 · La Vision</p>
              <blockquote className="mt-6 font-display text-[clamp(1.6rem,3.1vw,3rem)] leading-[1.35] tracking-wide text-blanc">
                « {churchVision.text} »
              </blockquote>
            </div>
          </Fade>

          {/* Scène 2 — les 5 mots clés */}
          <Fade progress={scrollYProgress} range={[0.38, 0.45, 0.56, 0.62]} className="absolute inset-0">
            <p className="absolute top-[12%] w-full text-center text-xs font-semibold tracking-[0.3em] text-or-light uppercase">
              2 · Les 5 mots clés
            </p>
            <ul>
              {keyWords.map((k, i) => (
                <li
                  key={k.slug}
                  style={{ ...toPercent(HEX_NODES[i]), ...tintStyle(k) }}
                  className="absolute -translate-1/2 text-center"
                >
                  <span className="block text-xs text-blanc/60">0{k.order}</span>
                  <span className="font-display text-xl font-semibold tracking-[0.16em] uppercase tint-text tint-text-glow xl:text-2xl">
                    {k.label}
                  </span>
                </li>
              ))}
            </ul>
          </Fade>

          {/* Scène 3 — l'orbe et les 5 objectifs */}
          <Fade progress={scrollYProgress} range={[0.74, 0.8, 1, 1.01]} className="absolute inset-0">
            <p className="absolute top-[7%] w-full text-center text-xs font-semibold tracking-[0.3em] text-or-light uppercase">
              3 · Nos objectifs
            </p>
            <div style={toPercent(ORB_CENTER)} className="absolute -translate-1/2 text-center">
              <p className="font-display text-2xl tracking-wide text-gradient-or">{objectivesTitle}</p>
              <p className="mt-1 text-[0.65rem] tracking-[0.2em] text-blanc/60 uppercase">{churchName}</p>
            </div>
            <ol>
              {churchObjectives.map((o, i) => (
                <li
                  key={o.number}
                  style={{ ...toPercent(OBJECTIVE_NODES[i]), ...tintStyle(o) }}
                  className="absolute w-[17vw] max-w-60 -translate-x-1/2 rounded-2xl border bg-noir/80 p-4 tint-border tint-glow"
                >
                  <span aria-hidden className="font-display text-4xl font-bold tint-text tint-text-glow">
                    {o.number}
                  </span>
                  <p className="mt-1 text-sm leading-snug text-blanc/85">
                    <span className="sr-only">Objectif {o.number} : </span>
                    <strong className="font-display text-base tracking-wide tint-text">{o.verb}</strong> {o.text}
                  </p>
                </li>
              ))}
            </ol>
          </Fade>

          <ScrollHint progress={scrollYProgress} />
        </div>
      </section>
  );
}

function ScrollHint({ progress }: { progress: MotionValue<number> }) {
  const opacity = useTransform(progress, [0, 0.06], [1, 0]);
  return (
    <motion.p
      style={{ opacity }}
      className="absolute bottom-8 w-full text-center text-xs tracking-[0.3em] text-blanc/55 uppercase"
    >
      Faites défiler pour vivre la Vision
    </motion.p>
  );
}
