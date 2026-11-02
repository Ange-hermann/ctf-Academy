"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { usePerf } from "@/hooks/use-perf";

/** Scroll fluide (Lenis) — désactivé en mode allégé et si le mouvement est réduit. */
export function SmoothScroll() {
  const { ready, tier, reducedMotion } = usePerf();

  useEffect(() => {
    if (!ready || tier === "lite" || reducedMotion) return;
    const lenis = new Lenis({ lerp: 0.11, wheelMultiplier: 1, anchors: true });
    let frame = requestAnimationFrame(function raf(time) {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    });
    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, [ready, tier, reducedMotion]);

  return null;
}
