"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { submitWeeklyReportAction } from "@/lib/student/actions/formation";
import type { WeeklyReport } from "@/lib/student/queries/formation";

const input =
  "w-full rounded-xl border border-or/15 bg-noir-soft px-3 py-2.5 text-sm text-blanc outline-none transition-colors placeholder:text-blanc/35 focus:border-or";
const label = "mb-1.5 block text-sm font-medium text-blanc/75";
const hint = "mt-1 text-xs text-blanc/40";

type OuiNon = "oui" | "non" | "";
const toOuiNon = (b: boolean, detail: string) => (b ? "oui" : detail ? "oui" : "non");

function OuiNonField({ name, legend, value, onChange }: { name: string; legend: string; value: OuiNon; onChange: (v: OuiNon) => void }) {
  return (
    <fieldset>
      <legend className={label}>{legend}</legend>
      <div className="flex gap-2">
        {(["oui", "non"] as const).map((v) => (
          <label key={v} className={`flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-xl border px-4 text-sm transition-colors ${value === v ? "border-or/60 bg-or/10 text-or-light" : "border-line text-blanc/60 hover:border-or/30"}`}>
            <input type="radio" name={name} value={v} checked={value === v} onChange={() => onChange(v)} className="sr-only" />
            {v === "oui" ? "Oui" : "Non"}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Fiche de transformation hebdomadaire EDM — une seule par semaine, dans la fenêtre de saisie. */
export function WeeklyReportForm({ existing }: { existing: WeeklyReport | null }) {
  const toast = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [prayerDays, setPrayerDays] = useState(existing?.prayerDays ?? 7);
  const [prayerHours, setPrayerHours] = useState(existing?.prayerHours ?? "");
  const [mentoreePrayerTime, setMentoreePrayerTime] = useState(existing?.mentoreePrayerTime ?? "");
  const [methodSimple, setMethodSimple] = useState(existing?.methodSimple ?? 0);
  const [methodOia, setMethodOia] = useState(existing?.methodOia ?? 0);
  const [methodTheme, setMethodTheme] = useState(existing?.methodTheme ?? 0);
  const [sermonsCount, setSermonsCount] = useState(existing?.sermonsCount ?? 0);
  const [characterTrait, setCharacterTrait] = useState(existing?.characterTrait ?? "");
  const [titheGiven, setTitheGiven] = useState<OuiNon>(existing ? toOuiNon(existing.titheGiven, "") : "");
  const [soulWon, setSoulWon] = useState<OuiNon>(existing ? toOuiNon(existing.soulWon, existing.soulWonDetail) : "");
  const [soulWonDetail, setSoulWonDetail] = useState(existing?.soulWonDetail ?? "");
  const [invited, setInvited] = useState<OuiNon>(existing ? toOuiNon(existing.invited, existing.invitedDetail) : "");
  const [invitedDetail, setInvitedDetail] = useState(existing?.invitedDetail ?? "");
  const [departmentsReport, setDepartmentsReport] = useState(existing?.departmentsReport ?? "");
  const [mentoreesReport, setMentoreesReport] = useState(existing?.mentoreesReport ?? "");

  const num = (v: string) => Math.max(0, Math.min(60, Number(v.replace(",", ".")) || 0));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (titheGiven === "" || soulWon === "" || invited === "") {
      toast({ title: "Réponses incomplètes", description: "Répondez par Oui ou Non aux questions 7 à 9.", tone: "error" });
      return;
    }
    startTransition(async () => {
      const res = await submitWeeklyReportAction({
        prayerDays,
        prayerHours: prayerHours.trim(),
        mentoreePrayerTime: mentoreePrayerTime.trim(),
        methodSimple,
        methodOia,
        methodTheme,
        sermonsCount,
        characterTrait: characterTrait.trim(),
        titheGiven: titheGiven === "oui",
        soulWon: soulWon === "oui",
        soulWonDetail: soulWonDetail.trim(),
        invited: invited === "oui",
        invitedDetail: invitedDetail.trim(),
        departmentsReport: departmentsReport.trim(),
        mentoreesReport: mentoreesReport.trim(),
      });
      if (!res.ok) {
        toast({ title: "Envoi impossible", description: res.error, tone: "error" });
        return;
      }
      toast({ title: existing ? "Fiche mise à jour" : "Fiche envoyée", description: "Votre pasteur la relira et la validera.", tone: "success" });
      router.refresh();
    });
  };

  return (
    <form onSubmit={submit} className="mt-4 space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="wr-days" className={label}>
            1. Pendant combien de jours as-tu respecté la prière ?
          </label>
          <select id="wr-days" value={prayerDays} onChange={(e) => setPrayerDays(Number(e.target.value))} className={input}>
            {[0, 1, 2, 3, 4, 5, 6, 7].map((d) => (
              <option key={d} value={d}>{d}/7 jours</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="wr-hours" className={label}>
            2. Combien d&rsquo;heures en moyenne as-tu prié cette semaine ?
          </label>
          <input id="wr-hours" type="text" required maxLength={20} placeholder="ex. 13-15 h" value={prayerHours} onChange={(e) => setPrayerHours(e.target.value)} className={input} />
        </div>
        <div>
          <label htmlFor="wr-mentoree" className={label}>
            3. Combien de temps as-tu prié pour tes mentorés ?
          </label>
          <input id="wr-mentoree" type="text" required maxLength={20} placeholder="ex. 30 min, 1 h…" value={mentoreePrayerTime} onChange={(e) => setMentoreePrayerTime(e.target.value)} className={input} />
        </div>
        <div>
          <label htmlFor="wr-sermons" className={label}>
            5. Combien de prédications as-tu écoutées cette semaine ?
          </label>
          <input id="wr-sermons" type="number" required min={0} max={60} inputMode="numeric" value={sermonsCount} onChange={(e) => setSermonsCount(num(e.target.value))} className={input} />
        </div>
      </div>

      <fieldset>
        <legend className={label}>4. Combien de fois dans la semaine as-tu utilisé la méthode :</legend>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="wr-ms" className={hint}>a. Lecture simple</label>
            <input id="wr-ms" type="number" required min={0} max={60} inputMode="numeric" value={methodSimple} onChange={(e) => setMethodSimple(num(e.target.value))} className={input} />
          </div>
          <div>
            <label htmlFor="wr-mo" className={hint}>b. Étude du texte (OIA)</label>
            <input id="wr-mo" type="number" required min={0} max={60} inputMode="numeric" value={methodOia} onChange={(e) => setMethodOia(num(e.target.value))} className={input} />
          </div>
          <div>
            <label htmlFor="wr-mt" className={hint}>c. Étude par thème</label>
            <input id="wr-mt" type="number" required min={0} max={60} inputMode="numeric" value={methodTheme} onChange={(e) => setMethodTheme(num(e.target.value))} className={input} />
          </div>
        </div>
      </fieldset>

      <div>
        <label htmlFor="wr-trait" className={label}>
          6. Quel trait de caractère es-tu en train de travailler cette semaine ?
        </label>
        <input id="wr-trait" type="text" required maxLength={200} placeholder="ex. la foi, la patience…" value={characterTrait} onChange={(e) => setCharacterTrait(e.target.value)} className={input} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <OuiNonField name="wr-tithe" legend="7. As-tu donné la dîme cette semaine ?" value={titheGiven} onChange={setTitheGiven} />
        <OuiNonField name="wr-soul" legend="8. As-tu gagné une âme à Christ ?" value={soulWon} onChange={setSoulWon} />
        <OuiNonField name="wr-invited" legend="9. As-tu invité une personne à l'église ?" value={invited} onChange={setInvited} />
      </div>
      {soulWon === "oui" && (
        <div>
          <label htmlFor="wr-soul-detail" className={hint}>Précise (facultatif)</label>
          <input id="wr-soul-detail" type="text" maxLength={300} placeholder="ex. une sœur de mon quartier…" value={soulWonDetail} onChange={(e) => setSoulWonDetail(e.target.value)} className={input} />
        </div>
      )}
      {invited === "oui" && (
        <div>
          <label htmlFor="wr-invited-detail" className={hint}>Qui as-tu invité ? (facultatif)</label>
          <input id="wr-invited-detail" type="text" maxLength={300} placeholder="ex. une sœur qui s'appelle Marie…" value={invitedDetail} onChange={(e) => setInvitedDetail(e.target.value)} className={input} />
        </div>
      )}

      <div>
        <label htmlFor="wr-departments" className={label}>
          10. Comment se portent tes départements ?
        </label>
        <textarea id="wr-departments" required rows={6} maxLength={8000} placeholder="Départements, activités de la semaine, points forts, points à améliorer…" value={departmentsReport} onChange={(e) => setDepartmentsReport(e.target.value)} className={input} />
      </div>
      <div>
        <label htmlFor="wr-mentorees" className={label}>
          11. Comment se portent tes mentorés ?
        </label>
        <textarea id="wr-mentorees" required rows={6} maxLength={8000} placeholder="Nouvelles de chacun de tes mentorés…" value={mentoreesReport} onChange={(e) => setMentoreesReport(e.target.value)} className={input} />
      </div>

      <Button type="submit" disabled={pending}>
        <Send aria-hidden className="mr-1.5 size-4" />
        {pending ? "Envoi…" : existing ? "Mettre à jour la fiche" : "Envoyer la fiche"}
      </Button>
      <p className={hint}>La fiche se ferme le samedi à 23 h 59 — après validation par ton pasteur, elle n&rsquo;est plus modifiable.</p>
    </form>
  );
}
