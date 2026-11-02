"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { updatePreferencesAction } from "@/lib/student/actions/profile";
import type { NotificationPref, StudentProfile } from "@/lib/student/queries/profile";
import { cn } from "@/lib/utils";

export const notifCategoryLabels: Record<NotificationPref["category"], string> = {
  announcement: "Annonces",
  message: "Messages",
  grade: "Notes",
  comment: "Commentaires",
  validation: "Validations",
  live: "Séances en direct",
  payment: "Paiements",
  assessment: "Évaluations",
};

const allCategories = Object.keys(notifCategoryLabels) as NotificationPref["category"][];

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full border transition-colors",
        checked ? "border-or bg-or/25" : "border-line bg-noir-soft",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute top-0.5 size-4.5 rounded-full transition-[left,background-color]",
          checked ? "left-[1.45rem] bg-gradient-or" : "left-0.5 bg-blanc/35",
        )}
      />
    </button>
  );
}

/** Préférences : fuseau horaire, mode allégé et canaux de notification par catégorie. */
export function PreferencesForm({ profile }: { profile: StudentProfile }) {
  const toast = useToast();
  const router = useRouter();
  const [timezone, setTimezone] = useState(profile.timezone);
  const [liteMode, setLiteMode] = useState(profile.liteMode);
  const [prefs, setPrefs] = useState<Record<string, NotificationPref>>(() => {
    const map = new Map(profile.notificationPrefs.map((p) => [p.category, p]));
    return Object.fromEntries(
      allCategories.map((c) => [c, map.get(c) ?? { category: c, inApp: true, email: false }]),
    );
  });
  const [pending, startTransition] = useTransition();

  const timezones = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [profile.timezone];

  const setPref = (category: NotificationPref["category"], patch: Partial<NotificationPref>) =>
    setPrefs((p) => ({ ...p, [category]: { ...p[category], ...patch } }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await updatePreferencesAction({
        timezone,
        liteMode,
        notifications: allCategories.map((c) => prefs[c]),
      });
      if (!res.ok) {
        toast({ title: "Enregistrement impossible", description: res.error, tone: "error" });
        return;
      }
      toast({ title: "Préférences enregistrées", tone: "success" });
      router.refresh();
    });
  };

  const input =
    "w-full rounded-xl border border-or/15 bg-noir-soft px-3 py-2.5 text-sm text-blanc outline-none transition-colors focus:border-or";

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="pf-timezone" className="mb-1 block text-sm font-medium text-blanc/75">
            Fuseau horaire
          </label>
          <select id="pf-timezone" value={timezone} onChange={(e) => setTimezone(e.target.value)} className={input}>
            {timezones.map((tz) => (
              <option key={tz} value={tz}>
                {tz.replace(/_/g, " ")}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-blanc/45">Heures des séances en direct et des échéances.</p>
        </div>
        <div className="flex items-start justify-between gap-4 rounded-2xl border border-line bg-noir-soft/50 p-4">
          <div>
            <p className="text-sm font-medium text-blanc/85">Mode allégé</p>
            <p className="mt-1 text-xs text-blanc/50">
              Moins d&rsquo;animations et d&rsquo;effets — recommandé sur connexion lente ou appareil modeste.
            </p>
          </div>
          <Toggle checked={liteMode} onChange={setLiteMode} label="Activer le mode allégé" />
        </div>
      </div>

      <fieldset>
        <legend className="text-sm font-medium text-blanc/75">Notifications</legend>
        <p className="mt-1 text-xs text-blanc/45">Choisissez comment chaque type d&rsquo;événement vous parvient.</p>
        <div className="mt-3 overflow-hidden rounded-2xl border border-line">
          <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 border-b border-line bg-noir-soft/70 px-4 py-2.5 text-xs font-semibold tracking-wider text-blanc/50 uppercase">
            <span>Catégorie</span>
            <span className="w-14 text-center">Espace</span>
            <span className="w-14 text-center">E-mail</span>
          </div>
          <ul className="divide-y divide-line">
            {allCategories.map((c) => (
              <li key={c} className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 px-4 py-3">
                <span className="text-sm text-blanc/80">{notifCategoryLabels[c]}</span>
                <span className="flex w-14 justify-center">
                  <Toggle
                    checked={prefs[c].inApp}
                    onChange={(v) => setPref(c, { inApp: v })}
                    label={`Notifications « ${notifCategoryLabels[c]} » dans l'espace`}
                  />
                </span>
                <span className="flex w-14 justify-center">
                  <Toggle
                    checked={prefs[c].email}
                    onChange={(v) => setPref(c, { email: v })}
                    label={`E-mails « ${notifCategoryLabels[c]} »`}
                  />
                </span>
              </li>
            ))}
          </ul>
        </div>
      </fieldset>

      <Button type="submit" size="sm" disabled={pending}>
        <Save aria-hidden className="size-4" /> {pending ? "Enregistrement…" : "Enregistrer mes préférences"}
      </Button>
    </form>
  );
}
