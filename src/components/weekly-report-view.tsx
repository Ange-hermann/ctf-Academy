export type WeeklyReportFields = {
  prayerDays: number;
  prayerHours: string;
  mentoreePrayerTime: string;
  methodSimple: number;
  methodOia: number;
  methodTheme: number;
  sermonsCount: number;
  characterTrait: string;
  titheGiven: boolean;
  soulWon: boolean;
  soulWonDetail: string;
  invited: boolean;
  invitedDetail: string;
  departmentsReport: string;
  mentoreesReport: string;
};

const ouiNon = (b: boolean, detail?: string) => (b ? `Oui${detail ? ` — ${detail}` : ""}` : "Non");

/** Réponses de la fiche de transformation EDM — partagé entre l'espace étudiant et la relecture admin. */
export function WeeklyReportView({ r }: { r: WeeklyReportFields }) {
  const rows: { label: string; value: string }[] = [
    { label: "Jours de prière respectés", value: `${r.prayerDays}/7` },
    { label: "Temps de prière (moyenne)", value: r.prayerHours },
    { label: "Prière pour les mentorés", value: r.mentoreePrayerTime },
    { label: "Méthode — lecture simple", value: `${r.methodSimple} fois` },
    { label: "Méthode — étude du texte (OIA)", value: `${r.methodOia} fois` },
    { label: "Méthode — étude par thème", value: `${r.methodTheme} fois` },
    { label: "Prédications écoutées", value: `${r.sermonsCount}` },
    { label: "Trait de caractère travaillé", value: r.characterTrait },
    { label: "Dîme donnée", value: ouiNon(r.titheGiven) },
    { label: "Âme gagnée à Christ", value: ouiNon(r.soulWon, r.soulWonDetail || undefined) },
    { label: "Invitation à l'église", value: ouiNon(r.invited, r.invitedDetail || undefined) },
  ];
  return (
    <div>
      <dl className="grid gap-x-6 sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.label} className="flex items-baseline justify-between gap-3 border-b border-line/40 py-1.5 text-sm">
            <dt className="text-blanc/55">{row.label}</dt>
            <dd className="text-right font-medium text-blanc">{row.value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-4 space-y-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-blanc/45">Comment se portent ses départements ?</p>
          <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-blanc/80">{r.departmentsReport}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-blanc/45">Comment se portent ses mentorés ?</p>
          <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-blanc/80">{r.mentoreesReport}</p>
        </div>
      </div>
    </div>
  );
}
