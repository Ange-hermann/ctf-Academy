"use client";

import { Feather, Sparkles } from "lucide-react";
import { setPerfPreference, usePerf } from "@/hooks/use-perf";

/** Permet au visiteur de forcer le mode allégé (téléphone modeste, données mobiles). */
export function PerfToggle() {
  const { ready, tier } = usePerf();
  if (!ready) return null;
  const lite = tier === "lite";
  return (
    <button
      type="button"
      onClick={() => setPerfPreference(lite ? "full" : "lite")}
      aria-pressed={lite}
      className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line px-4 text-sm text-blanc/70 transition-colors hover:border-or/40 hover:text-or-light"
    >
      {lite ? <Feather className="size-4 text-or" /> : <Sparkles className="size-4 text-or" />}
      Mode allégé : {lite ? "activé" : "désactivé"}
    </button>
  );
}
