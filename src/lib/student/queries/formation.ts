import "server-only";
import type { Tx } from "@/lib/student/session";

/** Données des parcours spécifiques (EDS, EDM, Diacres). Toutes les lectures passent par `withStudent` (RLS). */

// ───────────────────────── Travaux à rendre (mentorat / leadership) ─────────────────────────

export type WorkStatus = "todo" | "submitted" | "to_revise" | "validated";
export const workStatusLabels: Record<WorkStatus, string> = {
  todo: "À faire",
  submitted: "Rendu",
  to_revise: "À reprendre",
  validated: "Validé",
};

export type WorkItem = {
  id: string;
  title: string;
  instructions: string;
  dueAt: string | null;
  status: WorkStatus;
  response: string | null;
  fileName: string | null;
  fileHref: string | null;
  submittedAt: string | null;
  feedback: string | null;
  feedbackBy: string | null;
  score: number | null;
  maxScore: number | null;
  isExample: boolean;
};

type WorkRow = {
  id: string;
  title: string;
  instructions: string;
  due_at: Date | null;
  status: WorkStatus;
  response: string | null;
  storage_path: string | null;
  file_name: string | null;
  submitted_at: Date | null;
  feedback: string | null;
  feedback_by: string | null;
  is_example: boolean;
  score?: unknown;
  max_score?: unknown;
};

const toWorkItem =
  (fileKind: string) =>
  (w: WorkRow): WorkItem => ({
    id: w.id,
    title: w.title,
    instructions: w.instructions,
    dueAt: w.due_at?.toISOString() ?? null,
    status: w.status,
    response: w.response,
    fileName: w.file_name,
    fileHref: w.storage_path ? `/espace-etudiant/fichier?${fileKind}=${w.id}` : null,
    submittedAt: w.submitted_at?.toISOString() ?? null,
    feedback: w.feedback,
    feedbackBy: w.feedback_by,
    score: w.score == null ? null : Number(w.score),
    maxScore: w.max_score == null ? null : Number(w.max_score),
    isExample: w.is_example,
  });

/** Exercices de mentorat de l'EDM (rencontres guidées, comptes rendus relus par le formateur). */
export async function getMentoring(tx: Tx): Promise<WorkItem[]> {
  const rows = await tx.mentoring_exercises.findMany({ orderBy: [{ due_at: "asc" }, { title: "asc" }] });
  return rows.map(toWorkItem("mentorat"));
}

/** Travaux de leadership de l'EDM (dossiers notés). */
export async function getLeadershipWorks(tx: Tx): Promise<WorkItem[]> {
  const rows = await tx.leadership_works.findMany({ orderBy: [{ due_at: "asc" }, { title: "asc" }] });
  return rows.map(toWorkItem("leadership"));
}

// ───────────────────────── Reconnaissance du service (EDS) ─────────────────────────

export type ServiceRecord = {
  id: string;
  activity: string;
  department: string;
  servedOn: string;
  hours: number;
  recognized: boolean;
  isExample: boolean;
};

export async function getServiceRecords(tx: Tx) {
  const rows = await tx.service_records.findMany({ orderBy: { served_on: "desc" } });
  const items: ServiceRecord[] = rows.map((r) => ({
    id: r.id,
    activity: r.activity,
    department: r.department,
    servedOn: r.served_on.toISOString(),
    hours: Number(r.hours),
    recognized: r.recognized,
    isExample: r.is_example,
  }));
  return {
    items,
    totalHours: items.reduce((sum, r) => sum + r.hours, 0),
    recognizedHours: items.filter((r) => r.recognized).reduce((sum, r) => sum + r.hours, 0),
  };
}

// ───────────────────────── Responsabilités confiées (EDM) ─────────────────────────

export type ResponsibilityNote = { label: string; text: string };
export type Responsibility = {
  id: string;
  role: string;
  place: string;
  startsOn: string;
  endsOn: string | null;
  supervisorName: string;
  status: string;
  notes: ResponsibilityNote[];
  isExample: boolean;
};

const noteShape = (entry: unknown): ResponsibilityNote | null => {
  if (typeof entry === "string") return entry ? { label: "", text: entry } : null;
  if (typeof entry !== "object" || entry === null) return null;
  const o = entry as Record<string, unknown>;
  const label = typeof o.label === "string" ? o.label : typeof o.date === "string" ? o.date : "";
  const text = typeof o.text === "string" ? o.text : typeof o.body === "string" ? o.body : "";
  return text ? { label, text } : null;
};

export async function getResponsibilities(tx: Tx): Promise<Responsibility[]> {
  const rows = await tx.responsibilities.findMany({ orderBy: [{ starts_on: "desc" }] });
  return rows.map((r) => ({
    id: r.id,
    role: r.role,
    place: r.place,
    startsOn: r.starts_on.toISOString(),
    endsOn: r.ends_on?.toISOString() ?? null,
    supervisorName: r.supervisor_name,
    status: r.status,
    notes: Array.isArray(r.notes) ? r.notes.map(noteShape).filter((n): n is ResponsibilityNote => n !== null) : [],
    isExample: r.is_example,
  }));
}

// ───────────────────────── Stage pratique (Diacres) ─────────────────────────

export type StepStatus = "pending" | "in_progress" | "validated" | "redo";
export const stepStatusLabels: Record<StepStatus, string> = {
  pending: "À venir",
  in_progress: "En cours",
  validated: "Validée",
  redo: "À reprendre",
};

export type ReportStatus = "draft" | "submitted" | "to_fix" | "validated";
export const reportStatusLabels: Record<ReportStatus, string> = {
  draft: "Brouillon",
  submitted: "Déposé",
  to_fix: "À corriger",
  validated: "Validé",
};

export type InternshipStep = {
  id: string;
  title: string;
  description: string;
  dueOn: string | null;
  status: StepStatus;
  validatedAt: string | null;
  comment: string | null;
};
export type InternshipHour = { id: string; workedOn: string; hours: number; activity: string; validated: boolean };
export type InternshipReport = {
  id: string;
  version: number;
  fileName: string | null;
  fileHref: string | null;
  body: string | null;
  status: ReportStatus;
  supervisorComment: string | null;
  createdAt: string;
};

export type Internship = {
  id: string;
  place: string;
  supervisorName: string;
  startsOn: string;
  endsOn: string;
  targetHours: number;
  isExample: boolean;
  steps: InternshipStep[];
  hours: InternshipHour[];
  reports: InternshipReport[];
  doneHours: number;
  validatedHours: number;
};

export async function getInternship(tx: Tx, userId: string): Promise<Internship | null> {
  const stage = await tx.internships.findFirst({
    where: { user_id: userId },
    include: {
      internship_steps: { orderBy: { sort_order: "asc" } },
      internship_hours: { orderBy: { worked_on: "desc" } },
      internship_reports: { orderBy: { version: "desc" } },
    },
  });
  if (!stage) return null;
  const hours = stage.internship_hours.map((h) => ({
    id: h.id,
    workedOn: h.worked_on.toISOString(),
    hours: Number(h.hours),
    activity: h.activity,
    validated: h.validated,
  }));
  return {
    id: stage.id,
    place: stage.place,
    supervisorName: stage.supervisor_name,
    startsOn: stage.starts_on.toISOString(),
    endsOn: stage.ends_on.toISOString(),
    targetHours: stage.target_hours,
    isExample: stage.is_example,
    steps: stage.internship_steps.map((s) => ({
      id: s.id,
      title: s.title,
      description: s.description,
      dueOn: s.due_on?.toISOString() ?? null,
      status: s.status,
      validatedAt: s.validated_at?.toISOString() ?? null,
      comment: s.comment,
    })),
    hours,
    reports: stage.internship_reports.map((r) => ({
      id: r.id,
      version: r.version,
      fileName: r.file_name,
      fileHref: r.storage_path ? `/espace-etudiant/fichier?rapport=${r.id}` : null,
      body: r.body,
      status: r.status,
      supervisorComment: r.supervisor_comment,
      createdAt: r.created_at.toISOString(),
    })),
    doneHours: hours.reduce((sum, h) => sum + h.hours, 0),
    validatedHours: hours.filter((h) => h.validated).reduce((sum, h) => sum + h.hours, 0),
  };
}

// ───────────────────────── Mémoire et soutenance (Diacres) ─────────────────────────

export type VersionStatus = "submitted" | "in_review" | "to_fix" | "accepted";
export const versionStatusLabels: Record<VersionStatus, string> = {
  submitted: "Déposée",
  in_review: "En relecture",
  to_fix: "À corriger",
  accepted: "Acceptée",
};

export type ThesisVersion = {
  id: string;
  version: number;
  fileName: string;
  fileHref: string;
  sizeBytes: number;
  status: VersionStatus;
  createdAt: string;
};

export type ThesisComment = {
  id: string;
  versionId: string;
  parentId: string | null;
  authorName: string;
  authorRole: string;
  section: string | null;
  body: string;
  status: "open" | "resolved";
  attachmentName: string | null;
  attachmentHref: string | null;
  createdAt: string;
};

export type DefenseStatus = "proposed" | "confirmed" | "done";
export const defenseStatusLabels: Record<DefenseStatus, string> = {
  proposed: "Dates proposées",
  confirmed: "Soutenance confirmée",
  done: "Soutenance passée",
};

export type Thesis = {
  id: string;
  title: string;
  supervisorName: string;
  isExample: boolean;
  versions: ThesisVersion[];
  comments: ThesisComment[];
  defense: {
    status: DefenseStatus;
    proposedDates: string[];
    scheduledAt: string | null;
    place: string | null;
    zoomUrl: string | null;
    jury: string[];
    result: string | null;
  } | null;
};

export async function getThesis(tx: Tx, userId: string): Promise<Thesis | null> {
  const thesis = await tx.theses.findFirst({
    where: { user_id: userId },
    include: {
      thesis_versions: { orderBy: { version: "desc" } },
      thesis_comments: { orderBy: { created_at: "asc" } },
      defense_sessions: true,
    },
  });
  if (!thesis) return null;
  return {
    id: thesis.id,
    title: thesis.title,
    supervisorName: thesis.supervisor_name,
    isExample: thesis.is_example,
    versions: thesis.thesis_versions.map((v) => ({
      id: v.id,
      version: v.version,
      fileName: v.file_name,
      fileHref: `/espace-etudiant/fichier?memoire=${v.id}`,
      sizeBytes: v.size_bytes,
      status: v.status,
      createdAt: v.created_at.toISOString(),
    })),
    comments: thesis.thesis_comments.map((c) => ({
      id: c.id,
      versionId: c.version_id,
      parentId: c.parent_id,
      authorName: c.author_name,
      authorRole: c.author_role,
      section: c.section,
      body: c.body,
      status: c.status,
      attachmentName: c.attachment_name,
      attachmentHref: c.attachment_path ? `/espace-etudiant/fichier?commentaire=${c.id}` : null,
      createdAt: c.created_at.toISOString(),
    })),
    defense: thesis.defense_sessions
      ? {
          status: thesis.defense_sessions.status,
          proposedDates: thesis.defense_sessions.proposed_dates.map((d) => d.toISOString()),
          scheduledAt: thesis.defense_sessions.scheduled_at?.toISOString() ?? null,
          place: thesis.defense_sessions.place,
          zoomUrl: thesis.defense_sessions.zoom_url,
          jury: thesis.defense_sessions.jury,
          result: thesis.defense_sessions.result,
        }
      : null,
  };
}

// ───────────────────────── Évaluation pastorale (Diacres) ─────────────────────────

export type PastoralEvaluation = {
  id: string;
  title: string;
  status: "pending" | "done";
  evaluatorName: string | null;
  scheduledOn: string | null;
  evaluatedAt: string | null;
  feedback: string | null;
  isExample: boolean;
};

export async function getPastoralEvaluations(tx: Tx): Promise<PastoralEvaluation[]> {
  const rows = await tx.pastoral_evaluations.findMany({ orderBy: [{ scheduled_on: "asc" }] });
  return rows.map((e) => ({
    id: e.id,
    title: e.title,
    status: e.status,
    evaluatorName: e.evaluator_name,
    scheduledOn: e.scheduled_on?.toISOString() ?? null,
    evaluatedAt: e.evaluated_at?.toISOString() ?? null,
    feedback: e.feedback,
    isExample: e.is_example,
  }));
}
