"use client";

import { useSyncExternalStore } from "react";

const subscribe = (onChange: () => void) => {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
};

const snapshot = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Préférence système « réduire les animations » (accessibilité). Le site
 * affiche toujours l'expérience complète ; seule cette préférence de l'OS
 * peut couper les animations.
 */
export function usePerf() {
  const reduced = useSyncExternalStore<boolean | null>(subscribe, snapshot, () => null);
  if (reduced === null) {
    return { ready: false, tier: "full", reducedMotion: false, canAnimate3D: false };
  }
  return { ready: true, tier: "full", reducedMotion: reduced, canAnimate3D: !reduced };
}
