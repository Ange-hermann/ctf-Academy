import type { FormationSlug } from "@/content/formations";

export type SessionStatus = "open" | "soon" | "closed";

export type TrainingSession = {
  id: string;
  formation: FormationSlug;
  label: string;
  startDate: string;
  endDate: string;
  registrationDeadline: string | null;
  status: SessionStatus;
  isExample: boolean;
};

export const sessionStatusLabels: Record<SessionStatus, string> = {
  open: "Inscriptions ouvertes",
  soon: "Bientôt",
  closed: "Terminées",
};

/**
 * Sessions de repli quand Supabase n'est pas configuré (table `sessions`).
 * ⚠️ DATES D'EXEMPLE — TODO: remplacer par le calendrier officiel.
 */
export const fallbackSessions: TrainingSession[] = [
  { id: "ex-eds-1", formation: "eds", label: "Session EDS (exemple)", startDate: "2027-01-11", endDate: "2027-12-17", registrationDeadline: "2026-12-20", status: "open", isExample: true },
  { id: "ex-edm-1", formation: "edm", label: "Session EDM (exemple)", startDate: "2027-02-01", endDate: "2027-09-30", registrationDeadline: "2027-01-15", status: "open", isExample: true },
  { id: "ex-dia-1", formation: "diacres", label: "Formation des diacres (exemple)", startDate: "2027-03-01", endDate: "2028-02-28", registrationDeadline: "2027-02-01", status: "soon", isExample: true },
  { id: "ex-eds-0", formation: "eds", label: "Session EDS précédente (exemple)", startDate: "2026-01-12", endDate: "2026-12-18", registrationDeadline: null, status: "closed", isExample: true },
];
