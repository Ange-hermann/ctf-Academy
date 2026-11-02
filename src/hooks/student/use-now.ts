"use client";

import { useSyncExternalStore } from "react";

let now = 0;
const listeners = new Set<() => void>();
let timer: number | undefined;

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  if (!timer) {
    now = Date.now();
    timer = window.setInterval(() => {
      now = Date.now();
      listeners.forEach((l) => l());
    }, 15_000);
  }
  return () => {
    listeners.delete(cb);
    if (!listeners.size) {
      window.clearInterval(timer);
      timer = undefined;
    }
  };
};

/** Heure courante partagée (rafraîchie toutes les 15 s). `null` au rendu serveur : évite tout écart d'hydratation. */
export function useNow(): number | null {
  return useSyncExternalStore(
    subscribe,
    () => (now ||= Date.now()),
    () => null,
  );
}

/** « dans 2 j 4 h », « dans 12 min », « en cours ». */
export function countdown(target: number, current: number, end?: number) {
  const diff = target - current;
  if (diff <= 0) return end && current < end ? "en cours" : "terminé";
  const min = Math.round(diff / 60_000);
  if (min < 60) return `dans ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `dans ${h} h ${String(min % 60).padStart(2, "0")}`;
  const d = Math.floor(h / 24);
  return `dans ${d} j${h % 24 ? ` ${h % 24} h` : ""}`;
}
