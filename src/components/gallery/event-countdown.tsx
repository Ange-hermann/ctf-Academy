"use client";

import { useEffect, useState } from "react";

const pad = (n: number) => String(Math.max(0, n)).padStart(2, "0");

/** Compte à rebours du prochain événement mis en avant (mis à jour chaque seconde). */
export function EventCountdown({ startsAt }: { startsAt: string }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const diff = Math.max(0, new Date(startsAt).getTime() - now);
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  const seconds = Math.floor((diff % 60_000) / 1000);

  const units = [
    { label: "Jours", value: String(days) },
    { label: "Heures", value: pad(hours) },
    { label: "Min", value: pad(minutes) },
    { label: "Sec", value: pad(seconds) },
  ];

  return (
    <div role="timer" aria-label="Compte à rebours avant l'événement" className="flex gap-2.5 sm:gap-3">
      {units.map((u) => (
        <div
          key={u.label}
          className="grid min-w-14 place-items-center rounded-xl border border-or/30 bg-noir/70 px-2.5 py-2 backdrop-blur-sm sm:min-w-16"
        >
          <span className="font-display text-xl font-extrabold text-gradient-gold-metal tabular sm:text-2xl">{u.value}</span>
          <span className="font-nav text-[0.65rem] font-medium tracking-[0.18em] text-or-light/80 uppercase">{u.label}</span>
        </div>
      ))}
    </div>
  );
}
