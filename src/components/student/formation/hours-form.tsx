"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { logInternshipHoursAction } from "@/lib/student/actions/formation";

const input =
  "w-full rounded-xl border border-or/15 bg-noir-soft px-3 py-2.5 text-sm text-blanc outline-none transition-colors placeholder:text-blanc/35 focus:border-or";

/** Journal du stage : l'étudiant consigne ses heures ; le superviseur les valide ensuite. */
export function HoursForm({ min, max }: { min: string; max: string }) {
  const toast = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [workedOn, setWorkedOn] = useState("");
  const [hours, setHours] = useState("");
  const [activity, setActivity] = useState("");
  const [pending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await logInternshipHoursAction({ workedOn, hours: Number(hours.replace(",", ".")), activity: activity.trim() });
      if (!res.ok) {
        toast({ title: "Enregistrement impossible", description: res.error, tone: "error" });
        return;
      }
      toast({ title: "Heures consignées", description: "Elles seront comptées après validation de votre superviseur.", tone: "success" });
      setOpen(false);
      setWorkedOn("");
      setHours("");
      setActivity("");
      router.refresh();
    });
  };

  return open ? (
    <form onSubmit={submit} className="mt-4 space-y-3 rounded-2xl border border-line bg-noir-soft/50 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="ih-date" className="mb-1 block text-sm font-medium text-blanc/75">
            Jour travaillé
          </label>
          <input id="ih-date" type="date" required min={min} max={max} value={workedOn} onChange={(e) => setWorkedOn(e.target.value)} className={input} />
        </div>
        <div>
          <label htmlFor="ih-hours" className="mb-1 block text-sm font-medium text-blanc/75">
            Durée (heures)
          </label>
          <input
            id="ih-hours"
            type="number"
            required
            min={0.5}
            max={24}
            step={0.5}
            inputMode="decimal"
            placeholder="ex. 3,5"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            className={input}
          />
        </div>
      </div>
      <div>
        <label htmlFor="ih-activity" className="mb-1 block text-sm font-medium text-blanc/75">
          Activité réalisée
        </label>
        <input
          id="ih-activity"
          type="text"
          required
          maxLength={200}
          placeholder="Ex. visite aux familles, réunion de préparation…"
          value={activity}
          onChange={(e) => setActivity(e.target.value)}
          className={input}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Enregistrement…" : "Consigner les heures"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
          Annuler
        </Button>
      </div>
      <p className="text-xs text-blanc/45">Les heures saisies sont vérifiées par votre superviseur avant d&rsquo;être comptabilisées.</p>
    </form>
  ) : (
    <Button type="button" size="sm" variant="outline" className="mt-4" onClick={() => setOpen(true)}>
      <Plus aria-hidden className="mr-1.5 size-4" /> Consigner des heures
    </Button>
  );
}
