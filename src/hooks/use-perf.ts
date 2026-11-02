"use client";

import { useSyncExternalStore } from "react";

export type PerfTier = "full" | "lite";
export const PERF_STORAGE_KEY = "ctf-perf";

const subscribe = (onChange: () => void) => {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-perf", "data-motion"] });
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", onChange);
  return () => {
    observer.disconnect();
    mq.removeEventListener("change", onChange);
  };
};

const snapshot = () => {
  const el = document.documentElement;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  return `${el.dataset.perf === "lite" ? "lite" : "full"}|${reduced ? 1 : 0}`;
};

/**
 * Niveau de performance de l'appareil (fixé avant le premier rendu par le script `perfScript`).
 * Côté serveur : `ready = false` → les composants affichent leur version légère.
 */
export function usePerf() {
  const value = useSyncExternalStore(subscribe, snapshot, () => null);
  if (!value) return { ready: false, tier: "lite" as PerfTier, reducedMotion: false, canAnimate3D: false };
  const [tier, reduced] = value.split("|");
  const reducedMotion = reduced === "1";
  return {
    ready: true,
    tier: tier as PerfTier,
    reducedMotion,
    canAnimate3D: tier === "full" && !reducedMotion,
  };
}

export function setPerfPreference(tier: PerfTier) {
  try {
    localStorage.setItem(PERF_STORAGE_KEY, tier);
  } catch {
    /* stockage indisponible : préférence non mémorisée */
  }
  document.documentElement.dataset.perf = tier;
}
