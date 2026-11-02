"use client";

import { useState, useTransition } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { setReminderPrefAction } from "@/lib/student/actions/calendar";
import type { ReminderCategory } from "@/lib/student/queries/calendar";
import { cn } from "@/lib/utils";

export const reminderCategoryLabels: Record<ReminderCategory, string> = {
  live: "Cours en direct",
  assessment: "Évaluations",
  payment: "Échéances de paiement",
  announcement: "Annonces",
  message: "Messages",
  grade: "Notes et corrections",
  comment: "Commentaires",
  validation: "Validations",
};

function Toggle({ on, busy, onToggle, label }: { on: boolean; busy: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={busy}
      onClick={onToggle}
      className={cn("relative h-7 w-12 shrink-0 rounded-full border transition-colors", on ? "border-or bg-or/30" : "border-line bg-noir/60")}
    >
      {busy ? (
        <Loader2 aria-hidden className="absolute top-1/2 left-1/2 size-4 -translate-1/2 animate-spin text-or-light" />
      ) : (
        <span className={cn("absolute top-0.5 size-5.5 rounded-full transition-[left] duration-200", on ? "left-6 bg-gradient-or" : "left-0.5 bg-blanc/40")} />
      )}
    </button>
  );
}

/** Interrupteurs de rappels : dans l'espace (notifications) et par e-mail, par catégorie. */
export function ReminderPrefs({ prefs }: { prefs: { category: ReminderCategory; in_app: boolean; email: boolean }[] }) {
  const toast = useToast();
  const [state, setState] = useState(() => Object.fromEntries(prefs.map((p) => [p.category, p])));
  const [pending, startTransition] = useTransition();
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const toggle = (category: ReminderCategory, field: "in_app" | "email") => {
    const current = state[category];
    const value = !current[field];
    const key = `${category}:${field}`;
    setBusyKey(key);
    setState((s) => ({ ...s, [category]: { ...s[category], [field]: value } }));
    startTransition(async () => {
      const r = await setReminderPrefAction({ category, [field]: value });
      setBusyKey(null);
      if (!r.ok) {
        setState((s) => ({ ...s, [category]: { ...s[category], [field]: !value } }));
        toast({ tone: "error", title: "Préférence non enregistrée", description: r.error });
      }
    });
  };

  void pending;
  return (
    <ul className="divide-y divide-line">
      {prefs.map((p) => (
        <li key={p.category} className="flex flex-wrap items-center gap-3 py-3">
          <span className="grid size-9 place-items-center rounded-xl border border-or/25 bg-or/8 text-or-light">
            {(state[p.category]?.in_app ?? p.in_app) || (state[p.category]?.email ?? p.email) ? <Bell className="size-4" /> : <BellOff className="size-4" />}
          </span>
          <span className="min-w-0 flex-1 font-medium text-blanc">{reminderCategoryLabels[p.category]}</span>
          <span className="flex items-center gap-2 text-xs text-blanc/55">
            Notification
            <Toggle
              on={state[p.category]?.in_app ?? p.in_app}
              busy={busyKey === `${p.category}:in_app`}
              onToggle={() => toggle(p.category, "in_app")}
              label={`Notifications ${reminderCategoryLabels[p.category]}`}
            />
          </span>
          <span className="flex items-center gap-2 text-xs text-blanc/55">
            E-mail
            <Toggle
              on={state[p.category]?.email ?? p.email}
              busy={busyKey === `${p.category}:email`}
              onToggle={() => toggle(p.category, "email")}
              label={`E-mails ${reminderCategoryLabels[p.category]}`}
            />
          </span>
        </li>
      ))}
    </ul>
  );
}
