"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, CloudOff, Loader2 } from "lucide-react";
import { useOnline } from "@/components/student/layout/offline-banner";
import { runOrQueue } from "@/hooks/student/use-offline-queue";
import { cn } from "@/lib/utils";

type SaveState = "idle" | "saving" | "saved" | "queued";

/** Bloc-notes personnel de la leçon : sauvegarde automatique (800 ms) et file hors-ligne. */
export function NotesEditor({ lessonId, initialBody }: { lessonId: string; initialBody: string }) {
  const online = useOnline();
  const [body, setBody] = useState(initialBody);
  const [state, setState] = useState<SaveState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const dirty = useRef(false);

  useEffect(() => () => clearTimeout(timer.current), []);

  const save = (value: string) => {
    setState("saving");
    void runOrQueue("note", { lessonId, body: value }).then((r) => setState(r.queued ? "queued" : "saved"));
  };

  const onChange = (value: string) => {
    setBody(value);
    dirty.current = true;
    setState("saving");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => save(value), 800);
  };

  const status: Record<SaveState, { icon: React.ReactNode; label: string; className: string }> = {
    idle: { icon: null, label: "", className: "" },
    saving: { icon: <Loader2 aria-hidden className="size-3.5 animate-spin" />, label: "Enregistrement…", className: "text-blanc/50" },
    saved: { icon: <CheckCircle2 aria-hidden className="size-3.5" />, label: "Enregistré", className: "text-success-light" },
    queued: { icon: <CloudOff aria-hidden className="size-3.5" />, label: "Sera enregistré au retour du réseau", className: "text-warning-light" },
  };
  const s = status[state];

  return (
    <div>
      <label htmlFor="notes" className="sr-only">
        Mes notes sur cette leçon
      </label>
      <textarea
        id="notes"
        value={body}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Écrivez ici ce que vous retenez, vos versets clés, vos idées… Elles restent privées et sont enregistrées automatiquement."
        rows={10}
        maxLength={20_000}
        className="min-h-56 w-full resize-y rounded-2xl border border-line bg-noir/40 p-4 text-blanc placeholder:text-blanc/35 focus:border-or/50 focus:outline-none"
      />
      <div className="mt-2 flex items-center justify-between text-sm">
        <p aria-live="polite" className={cn("flex items-center gap-1.5", s.className)}>
          {s.icon} {s.label}
          {!online && state === "saving" && <span className="text-warning-light">Hors-ligne</span>}
        </p>
        <p className="text-blanc/40 tabular">{body.length} / 20 000</p>
      </div>
    </div>
  );
}
