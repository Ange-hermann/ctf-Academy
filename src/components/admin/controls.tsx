"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { useToast } from "@/components/ui/toast";
import { CourseFileField, type CourseFileAccept, type UploadedFile } from "@/components/admin/course-file-field";
import { VoiceRecorder } from "@/components/messages/voice-recorder";
import { StatusBadge } from "@/components/admin/ui";
import {
  grantRoleAction,
  revokeRoleAction,
  setApplicationStatusAction,
  setEvaluationAction,
  setHoursValidatedAction,
  setPaymentStatusAction,
  setReportStatusAction,
  setStepStatusAction,
  setVersionStatusAction,
  createEvaluationAction,
  gradeAttemptAction,
  assignTrainerClassAction,
  revokeTrainerClassAction,
  createAssessmentAction,
  deleteAssessmentAction,
  createResourceAction,
  createLessonAction,
  removeClassStudentAction,
  sendClassMessageAction,
  requestClassVoiceUploadAction,
  sendClassVoiceMessageAction,
  createClassThreadAction,
  markClassThreadReadAction,
  createLiveSessionAction,
  deleteLiveSessionAction,
  createCalendarEventAction,
  deleteCalendarEventAction,
  createAnnouncementAction,
  deleteAnnouncementAction,
  updateSiteSettingsAction,
  sendAdminMessageAction,
  requestAdminVoiceUploadAction,
  sendAdminVoiceMessageAction,
  markAdminThreadReadAction,
  setTicketStatusAction,
  createAccessAction,
  createModuleAction,
  recordPaymentAction,
  assignResponsibilityAction,
  completeResponsibilityAction,
  createPastoralCaseAction,
  decideValidationAction,
  recognizeServiceAction,
  reviewEdmReportAction,
  createInternshipAction,
} from "@/lib/admin/actions";
import type { ActionResult } from "@/lib/validation/auth";
import { cn } from "@/lib/utils";

type Option = { value: string; label: string };

const selectClass =
  "min-h-11 rounded-xl border border-line bg-noir-soft px-3 text-sm text-blanc outline-none transition-colors focus:border-or/60";

const btnClass =
  "min-h-11 rounded-xl border border-or/40 px-4 text-sm font-medium text-or-light transition-colors hover:bg-or/10 disabled:opacity-50";

function useRun() {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const run = (action: Promise<ActionResult>, done = "Modifié.") =>
    start(async () => {
      const r = await action;
      if (r.ok) {
        toast({ title: done, tone: "success" });
        router.refresh();
      } else {
        toast({ title: "Échec", description: r.error, tone: "error" });
      }
    });
  return { pending, run };
}

/** Sélecteur de statut générique : choisir → appliquer → action serveur. */
function StatusPicker({
  value,
  options,
  apply,
  comment,
}: {
  value: string;
  options: Option[];
  apply: (next: string, comment?: string) => Promise<ActionResult>;
  comment?: boolean;
}) {
  const { pending, run } = useRun();
  const [next, setNext] = useState(value);
  const [note, setNote] = useState("");
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select value={next} onChange={(e) => setNext(e.target.value)} className={selectClass} aria-label="Nouveau statut">
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {comment && (
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Commentaire (optionnel)"
          className={cn(selectClass, "min-w-44 flex-1")}
          aria-label="Commentaire"
        />
      )}
      <button type="button" disabled={pending || next === value} onClick={() => run(apply(next, note || undefined))} className={btnClass}>
        {pending ? "…" : "Appliquer"}
      </button>
    </div>
  );
}

// ───────────────────────── Candidatures ─────────────────────────

export function ApplicationStatusPicker({ applicationId, field, value, options }: { applicationId: string; field: "registration_status" | "payment_status" | "admission_status"; value: string; options: Option[] }) {
  return <StatusPicker value={value} options={options} apply={(v) => setApplicationStatusAction({ applicationId, field, value: v })} />;
}

// ───────────────────────── Finances ─────────────────────────

export function PaymentActions({ paymentId, status }: { paymentId: string; status: string }) {
  const { pending, run } = useRun();
  if (status !== "pending") return null;
  return (
    <span className="flex gap-2">
      <button type="button" disabled={pending} onClick={() => run(setPaymentStatusAction({ paymentId, confirm: true }), "Paiement confirmé.")} className={btnClass}>
        Confirmer
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => run(setPaymentStatusAction({ paymentId, confirm: false }), "Paiement marqué en échec.")}
        className="min-h-11 rounded-xl border border-danger/40 px-4 text-sm font-medium text-danger-light transition-colors hover:bg-danger/10 disabled:opacity-50"
      >
        Échec
      </button>
    </span>
  );
}

// ───────────────────────── Corrections ─────────────────────────

export function GradeForm({ attemptId, maxScore, suggestedScore }: { attemptId: string; maxScore: number; suggestedScore?: number }) {
  const { pending, run } = useRun();
  const [score, setScore] = useState(suggestedScore != null ? String(suggestedScore) : "");
  const [feedback, setFeedback] = useState("");
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        run(gradeAttemptAction({ attemptId, score: Number(score), maxScore, feedback: feedback || undefined }), "Copie corrigée.");
      }}
    >
      <div className="flex flex-wrap items-end gap-3">
        {suggestedScore != null && (
          <p className="w-full rounded-lg border border-or/30 bg-or/10 px-3 py-2 text-xs text-or-light">
            Correction automatique (QCM, réponses courtes) : {suggestedScore} / {maxScore} pts — ajustez après lecture des réponses ouvertes.
          </p>
        )}
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-blanc/60">Note / {maxScore}</span>
          <input
            type="number"
            min={0}
            max={maxScore}
            step="0.5"
            required
            value={score}
            onChange={(e) => setScore(e.target.value)}
            className={cn(selectClass, "w-28")}
          />
        </label>
        <label className="block min-w-56 flex-1">
          <span className="mb-1 block text-xs font-medium text-blanc/60">Retour de correction</span>
          <input value={feedback} onChange={(e) => setFeedback(e.target.value)} className={cn(selectClass, "w-full")} placeholder="Appréciation, points à revoir…" />
        </label>
        <button type="submit" disabled={pending || !score} className={btnClass}>
          {pending ? "…" : "Enregistrer la note"}
        </button>
      </div>
    </form>
  );
}

// ───────────────────────── Stages & mémoires ─────────────────────────

export function StepStatusPicker({ stepId, value }: { stepId: string; value: string }) {
  return (
    <StatusPicker
      value={value}
      comment
      options={[
        { value: "pending", label: "À faire" },
        { value: "in_progress", label: "En cours" },
        { value: "validated", label: "Validée" },
        { value: "redo", label: "À reprendre" },
      ]}
      apply={(v, c) => setStepStatusAction({ stepId, status: v as "pending" | "in_progress" | "validated" | "redo", comment: c })}
    />
  );
}

export function HoursToggle({ hourId, validated }: { hourId: string; validated: boolean }) {
  const { pending, run } = useRun();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => run(setHoursValidatedAction({ hourId, validated: !validated }), validated ? "Validation retirée." : "Heures validées.")}
      className={validated ? "min-h-9 rounded-lg border border-line px-3 text-xs text-blanc/60 hover:bg-or/10" : "min-h-9 rounded-lg border border-or/40 px-3 text-xs font-medium text-or-light hover:bg-or/10"}
    >
      {validated ? "Retirer la validation" : "Valider"}
    </button>
  );
}

export function ReportStatusPicker({ reportId, value }: { reportId: string; value: string }) {
  return (
    <StatusPicker
      value={value}
      comment
      options={[
        { value: "submitted", label: "Déposée" },
        { value: "to_fix", label: "À corriger" },
        { value: "validated", label: "Validée" },
      ]}
      apply={(v, c) => setReportStatusAction({ reportId, status: v as "submitted" | "to_fix" | "validated", comment: c })}
    />
  );
}

export function VersionStatusPicker({ versionId, value }: { versionId: string; value: string }) {
  return (
    <StatusPicker
      value={value}
      options={[
        { value: "in_review", label: "En relecture" },
        { value: "to_fix", label: "À corriger" },
        { value: "accepted", label: "Acceptée" },
      ]}
      apply={(v) => setVersionStatusAction({ versionId, status: v as "in_review" | "to_fix" | "accepted" })}
    />
  );
}

// ───────────────────────── Équipe pastorale ─────────────────────────

export function EvaluationControl({ evaluationId, value }: { evaluationId: string; value: string }) {
  return (
    <StatusPicker
      value={value}
      comment
      options={[
        { value: "pending", label: "En attente" },
        { value: "done", label: "Réalisée" },
      ]}
      apply={(v, c) => setEvaluationAction({ evaluationId, status: v as "pending" | "done", feedback: c })}
    />
  );
}

export function NewEvaluationForm() {
  const { pending, run } = useRun();
  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        run(
          createEvaluationAction({
            email: String(fd.get("email") ?? ""),
            title: String(fd.get("title") ?? ""),
            scheduledOn: String(fd.get("scheduledOn") ?? "") || undefined,
          }),
          "Évaluation créée.",
        );
      }}
    >
      <input name="email" type="email" required placeholder="E-mail de l'étudiant" className={cn(selectClass, "min-w-0")} aria-label="E-mail de l'étudiant" />
      <input name="title" required placeholder="Intitulé de l'évaluation" className={cn(selectClass, "min-w-0")} aria-label="Intitulé" />
      <input name="scheduledOn" type="date" className={cn(selectClass, "min-w-0")} aria-label="Date prévue" />
      <button type="submit" disabled={pending} className={btnClass}>
        {pending ? "…" : "Créer"}
      </button>
    </form>
  );
}

// ───────────────────────── Accès & rôles ─────────────────────────

const ROLE_OPTIONS: { value: "admin" | "admissions" | "pedagogy" | "trainer" | "finance" | "supervisor" | "pastor"; label: string }[] = [
  { value: "admin", label: "Administrateur" },
  { value: "admissions", label: "Admissions" },
  { value: "pedagogy", label: "Pédagogie" },
  { value: "trainer", label: "Formateur" },
  { value: "finance", label: "Finances" },
  { value: "supervisor", label: "Stages & mémoires" },
  { value: "pastor", label: "Pastorale" },
];

export function RoleButtons({ userId, roles }: { userId: string; roles: string[] }) {
  const { pending, run } = useRun();
  return (
    <div className="flex flex-wrap gap-1.5">
      {ROLE_OPTIONS.map((r) => {
        const has = roles.includes(r.value);
        return (
          <button
            key={r.value}
            type="button"
            disabled={pending}
            onClick={() =>
              run(
                has ? revokeRoleAction({ userId, role: r.value }) : grantRoleAction({ userId, role: r.value }),
                has ? `Rôle « ${r.label} » retiré.` : `Rôle « ${r.label} » attribué.`,
              )
            }
            className={cn(
              "min-h-9 rounded-full border px-3 text-xs font-medium transition-colors disabled:opacity-50",
              has ? "border-or/60 bg-or/15 text-or-light" : "border-line text-blanc/50 hover:border-or/40 hover:text-blanc",
            )}
            aria-pressed={has}
          >
            {r.label}
          </button>
        );
      })}
    </div>
  );
}

type ClassChoice = { formationId: string; levelId: string | null; label: string };
const classKey = (c: { formationId: string; levelId: string | null }) => `${c.formationId}:${c.levelId ?? ""}`;

/** Affectation de LA classe d'un formateur (formation + niveau) — une seule par formateur. */
export function ClassAssigner({ trainerId, classes, current }: { trainerId: string; classes: ClassChoice[]; current: ClassChoice | null }) {
  const { pending, run } = useRun();
  const [next, setNext] = useState(current ? classKey(current) : "");
  const choice = classes.find((c) => classKey(c) === next);
  const unchanged = !!current && next === classKey(current);
  return (
    <div className="space-y-2">
      {current && (
        <p className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-or/50 bg-or/10 px-3 py-1 text-xs font-semibold text-or-light">{current.label}</span>
          <button
            type="button"
            disabled={pending}
            onClick={() => run(revokeTrainerClassAction({ trainerId }), "Classe retirée.")}
            className="text-xs text-blanc/50 underline-offset-2 hover:text-danger-light hover:underline disabled:opacity-50"
          >
            Retirer
          </button>
        </p>
      )}
      <div className="flex gap-2">
        <select value={next} onChange={(e) => setNext(e.target.value)} className={cn(selectClass, "min-h-9 text-xs")} aria-label="Classe du formateur">
          <option value="">{current ? "Changer de classe…" : "Choisir la classe…"}</option>
          {classes.map((c) => (
            <option key={classKey(c)} value={classKey(c)}>
              {c.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={pending || !choice || unchanged}
          onClick={() =>
            choice && run(assignTrainerClassAction({ trainerId, formationId: choice.formationId, levelId: choice.levelId ?? "" }), current ? "Classe modifiée." : "Classe attribuée.")
          }
          className="min-h-9 rounded-lg border border-or/40 px-3 text-xs font-medium text-or-light hover:bg-or/10 disabled:opacity-50"
        >
          {current ? "Changer" : "Affecter"}
        </button>
      </div>
    </div>
  );
}

// ───────────────────────── Ma classe (formateur) ─────────────────────────

const fieldLabel = "mb-1 block text-xs font-medium text-blanc/60";
const inputClass = cn(selectClass, "w-full");

const ASSESSMENT_KINDS = [
  { value: "quiz", label: "Quiz" },
  { value: "exercise", label: "Devoir" },
  { value: "exam", label: "Examen" },
] as const;

const QUESTION_KINDS = [
  { value: "single", label: "Choix unique" },
  { value: "multiple", label: "Choix multiples" },
  { value: "true_false", label: "Vrai / Faux" },
  { value: "short", label: "Réponse courte" },
  { value: "long", label: "Réponse longue" },
  { value: "file", label: "Fichier à déposer" },
] as const;

type DraftQuestion = { prompt: string; kind: string; points: number; options: string; correct: string };

/** Création d'une évaluation (quiz, devoir, examen) avec ses questions. */
export function AssessmentForm({
  formations,
  modules,
}: {
  formations: FormationOpt[];
  modules: { id: string; title: string; formationSlug: string; levelLabel: string | null }[];
}) {
  const { pending, run } = useRun();
  const [formationId, setFormationId] = useState(formations[0]?.id ?? "");
  const [questions, setQuestions] = useState<DraftQuestion[]>([]);
  const slug = formations.find((f) => f.id === formationId)?.slug;
  const moduleOptions = modules.filter((m) => m.formationSlug === slug);
  const setQ = (i: number, patch: Partial<DraftQuestion>) => setQuestions((qs) => qs.map((q, j) => (j === i ? { ...q, ...patch } : q)));

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        run(
          createAssessmentAction({
            formationId,
            moduleId: String(fd.get("moduleId") ?? ""),
            kind: String(fd.get("kind") ?? "quiz"),
            title: String(fd.get("title") ?? ""),
            instructions: String(fd.get("instructions") ?? ""),
            attachmentUrl: String(fd.get("attachmentUrl") ?? ""),
            dueAt: String(fd.get("dueAt") ?? ""),
            durationMinutes: String(fd.get("durationMinutes") ?? ""),
            maxAttempts: String(fd.get("maxAttempts") ?? "1"),
            passScore: String(fd.get("passScore") ?? "60"),
            questions: questions
              .filter((q) => q.prompt.trim())
              .map((q) => ({
                prompt: q.prompt,
                kind: q.kind,
                points: q.points,
                options: q.kind === "true_false" ? [] : q.options.split(",").map((s) => s.trim()).filter(Boolean),
                correct: q.kind === "true_false" ? [q.correct === "Vrai" ? "vrai" : "faux"] : q.correct.split(",").map((s) => s.trim()).filter(Boolean),
              })),
          }),
          "Évaluation créée — visible par les étudiants de la classe.",
        );
        setQuestions([]);
        e.currentTarget.reset();
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block">
          <span className={fieldLabel}>Classe</span>
          <select value={formationId} onChange={(e) => setFormationId(e.target.value)} className={inputClass} required>
            {formations.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={fieldLabel}>Type</span>
          <select name="kind" className={inputClass} required>
            {ASSESSMENT_KINDS.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block sm:col-span-2">
          <span className={fieldLabel}>Titre</span>
          <input name="title" required minLength={3} maxLength={160} placeholder="Ex. Quiz — module 1" className={inputClass} />
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block">
          <span className={fieldLabel}>Module (optionnel)</span>
          <select name="moduleId" className={inputClass}>
            <option value="">—</option>
            {moduleOptions.map((m) => (
              <option key={m.id} value={m.id}>
                {m.levelLabel ? `${m.levelLabel} · ` : ""}
                {m.title}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={fieldLabel}>Échéance</span>
          <input name="dueAt" type="datetime-local" className={inputClass} />
        </label>
        <label className="block">
          <span className={fieldLabel}>Durée (min)</span>
          <input name="durationMinutes" type="number" min={0} max={600} placeholder="—" className={inputClass} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className={fieldLabel}>Seuil %</span>
            <input name="passScore" type="number" min={0} max={100} defaultValue={60} className={inputClass} />
          </label>
          <label className="block">
            <span className={fieldLabel}>Essais</span>
            <input name="maxAttempts" type="number" min={1} max={5} defaultValue={1} className={inputClass} />
          </label>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className={fieldLabel}>Consignes</span>
          <input name="instructions" placeholder="Instructions pour les étudiants (optionnel)" className={inputClass} />
        </label>
        <label className="block">
          <span className={fieldLabel}>Pièce jointe (lien)</span>
          <input name="attachmentUrl" type="url" placeholder="https://…" className={inputClass} />
        </label>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium tracking-wide text-blanc/60 uppercase">Questions ({questions.length})</p>
          <button
            type="button"
            onClick={() => setQuestions((qs) => [...qs, { prompt: "", kind: "single", points: 1, options: "", correct: "" }])}
            className="min-h-9 rounded-lg border border-or/40 px-3 text-xs font-medium text-or-light hover:bg-or/10"
          >
            + Ajouter une question
          </button>
        </div>
        {questions.map((q, i) => (
          <div key={i} className="grid gap-2 rounded-xl border border-line/60 bg-noir-soft p-3 sm:grid-cols-[1fr_auto_auto_auto]">
            <input value={q.prompt} onChange={(e) => setQ(i, { prompt: e.target.value })} placeholder={`Question ${i + 1}`} className={selectClass} aria-label={`Question ${i + 1}`} />
            <select value={q.kind} onChange={(e) => setQ(i, { kind: e.target.value })} className={selectClass} aria-label="Type de question">
              {QUESTION_KINDS.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </select>
            <input type="number" min={1} max={100} value={q.points} onChange={(e) => setQ(i, { points: Number(e.target.value) || 1 })} className={cn(selectClass, "w-20")} aria-label="Points" title="Points" />
            <button type="button" onClick={() => setQuestions((qs) => qs.filter((_, j) => j !== i))} className="min-h-9 rounded-lg border border-danger/40 px-3 text-xs text-danger-light hover:bg-danger/10" aria-label="Retirer la question">
              Retirer
            </button>
            {["single", "multiple"].includes(q.kind) && (
              <>
                <input value={q.options} onChange={(e) => setQ(i, { options: e.target.value })} placeholder="Options séparées par des virgules" className={cn(selectClass, "sm:col-span-2")} aria-label="Options" />
                <input
                  value={q.correct}
                  onChange={(e) => setQ(i, { correct: e.target.value })}
                  placeholder={q.kind === "single" ? "Bonne réponse (recopiez l'option)" : "Bonnes réponses (virgules)"}
                  className={cn(selectClass, "border-or/40 sm:col-span-2")}
                  aria-label="Bonne(s) réponse(s)"
                />
              </>
            )}
            {q.kind === "true_false" && (
              <select value={q.correct || "Vrai"} onChange={(e) => setQ(i, { correct: e.target.value })} className={cn(selectClass, "border-or/40 sm:col-span-2")} aria-label="Bonne réponse">
                <option value="Vrai">Bonne réponse : Vrai</option>
                <option value="Faux">Bonne réponse : Faux</option>
              </select>
            )}
            {q.kind === "short" && (
              <input value={q.correct} onChange={(e) => setQ(i, { correct: e.target.value })} placeholder="Réponses acceptées (virgules) — corrigé automatiquement" className={cn(selectClass, "border-or/40 sm:col-span-2")} aria-label="Réponses acceptées" />
            )}
            {["long", "file"].includes(q.kind) && <p className="self-center text-xs text-blanc/45 sm:col-span-2">Correction manuelle (question ouverte).</p>}
          </div>
        ))}
      </div>

      <button type="submit" disabled={pending || !formationId} className={cn(btnClass, "bg-or/10")}>
        {pending ? "…" : "Créer l'évaluation"}
      </button>
    </form>
  );
}

export function DeleteAssessmentButton({ quizId, title }: { quizId: string; title: string }) {
  const { pending, run } = useRun();
  return (
    <button
      type="button"
      disabled={pending}
      title={`Supprimer « ${title} »`}
      onClick={() => run(deleteAssessmentAction({ quizId }), "Évaluation supprimée.")}
      className="min-h-9 rounded-lg border border-danger/40 px-3 text-xs text-danger-light transition-colors hover:bg-danger/10 disabled:opacity-50"
    >
      Supprimer
    </button>
  );
}

const lessonMediaAccept: Record<string, CourseFileAccept> = { video: "video", audio: "audio", pdf: "pdf", text: "any", live: "any" };

/** Ajout d'une leçon (texte, vidéo, audio, PDF, direct) avec média déposé ou lien externe. */
export function LessonForm({ modules }: { modules: { id: string; title: string; formationSlug: string; levelLabel: string | null }[] }) {
  const { pending, run } = useRun();
  const [kind, setKind] = useState("video");
  const [moduleId, setModuleId] = useState(modules[0]?.id ?? "");
  const [file, setFile] = useState<UploadedFile | null>(null);
  const [source, setSource] = useState<"file" | "link">("file");
  const needsMedia = kind === "video" || kind === "audio" || kind === "pdf";
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const fd = new FormData(form);
        run(
          createLessonAction({
            moduleId,
            title: String(fd.get("title") ?? ""),
            kind,
            content: String(fd.get("content") ?? ""),
            mediaUrl: source === "link" ? String(fd.get("mediaUrl") ?? "") : "",
            durationMinutes: String(fd.get("durationMinutes") ?? ""),
            upload: source === "file" && file ? { path: file.path, fileName: file.fileName } : undefined,
          }),
          "Leçon ajoutée au module.",
        );
        form.reset();
        setFile(null);
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className={fieldLabel}>Module</span>
          <select
            value={moduleId}
            onChange={(e) => {
              setModuleId(e.target.value);
              setFile(null);
            }}
            required
            className={inputClass}
          >
            {modules.map((m) => (
              <option key={m.id} value={m.id}>
                {m.formationSlug.toUpperCase()} · {m.levelLabel ? `${m.levelLabel} · ` : ""}
                {m.title}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={fieldLabel}>Format</span>
          <select
            value={kind}
            onChange={(e) => {
              setKind(e.target.value);
              setFile(null);
            }}
            className={inputClass}
          >
            <option value="video">Vidéo</option>
            <option value="audio">Audio</option>
            <option value="pdf">PDF</option>
            <option value="text">Cours texte</option>
            <option value="live">Session en direct</option>
          </select>
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <label className="block">
          <span className={fieldLabel}>Titre de la leçon</span>
          <input name="title" required minLength={3} maxLength={160} placeholder="Ex. Les fondements de la foi" className={inputClass} />
        </label>
        <label className="block">
          <span className={fieldLabel}>Durée (min)</span>
          <input name="durationMinutes" type="number" min={0} max={600} placeholder="—" className={cn(selectClass, "w-28")} />
        </label>
      </div>
      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="text-xs font-medium text-blanc/60">{needsMedia ? "Média de la leçon" : "Pièce jointe (optionnelle)"}</span>
          <div className="flex rounded-lg border border-line p-0.5 text-xs" role="radiogroup" aria-label="Source du média">
            {(["file", "link"] as const).map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={source === s}
                onClick={() => setSource(s)}
                className={cn("min-h-8 rounded-md px-3 transition-colors", source === s ? "bg-or/15 text-or-light" : "text-blanc/55 hover:text-blanc")}
              >
                {s === "file" ? "Fichier" : "Lien"}
              </button>
            ))}
          </div>
        </div>
        {source === "file" ? (
          <CourseFileField moduleId={moduleId} accept={lessonMediaAccept[kind] ?? "any"} value={file} onChange={setFile} />
        ) : (
          <input
            name="mediaUrl"
            type="url"
            required={needsMedia}
            placeholder={kind === "video" ? "https://… (lien direct .mp4 ou .m3u8)" : kind === "audio" ? "https://… (lien direct .mp3)" : "https://…"}
            className={inputClass}
            aria-label="Lien du média"
          />
        )}
      </div>
      <label className="block">
        <span className={fieldLabel}>{kind === "text" ? "Contenu de la leçon" : "Texte d'accompagnement (optionnel)"}</span>
        <textarea name="content" rows={3} placeholder="Texte de la leçon, résumé, consignes…" className={cn(inputClass, "min-h-20 resize-y")} />
      </label>
      <button type="submit" disabled={pending || (needsMedia && source === "file" && !file)} className={cn(btnClass, "bg-or/10")}>
        {pending ? "…" : "Ajouter la leçon"}
      </button>
    </form>
  );
}

/** Ajout d'une ressource de module : fichier déposé (PDF, document, audio, vidéo) ou lien externe. */
export function ResourceForm({ modules }: { modules: { id: string; title: string; formationSlug: string; levelLabel: string | null }[] }) {
  const { pending, run } = useRun();
  const [moduleId, setModuleId] = useState(modules[0]?.id ?? "");
  const [file, setFile] = useState<UploadedFile | null>(null);
  const [source, setSource] = useState<"file" | "link">("file");
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const fd = new FormData(form);
        run(
          createResourceAction({
            moduleId,
            kind: source === "link" ? String(fd.get("kind") ?? "link") : "document",
            title: String(fd.get("title") ?? ""),
            url: source === "link" ? String(fd.get("url") ?? "") : "",
            upload: source === "file" && file ? { path: file.path, fileName: file.fileName } : undefined,
          }),
          "Ressource ajoutée.",
        );
        form.reset();
        setFile(null);
      }}
    >
      <label className="block">
        <span className={fieldLabel}>Module</span>
        <select
          value={moduleId}
          onChange={(e) => {
            setModuleId(e.target.value);
            setFile(null);
          }}
          required
          className={inputClass}
        >
          {modules.map((m) => (
            <option key={m.id} value={m.id}>
              {m.formationSlug.toUpperCase()} · {m.title}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className={fieldLabel}>Titre de la ressource</span>
        <input name="title" required minLength={2} maxLength={160} placeholder="Ex. Syllabus du module, enseignement audio…" className={inputClass} />
      </label>
      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="text-xs font-medium text-blanc/60">Contenu</span>
          <div className="flex rounded-lg border border-line p-0.5 text-xs" role="radiogroup" aria-label="Source de la ressource">
            {(["file", "link"] as const).map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={source === s}
                onClick={() => setSource(s)}
                className={cn("min-h-8 rounded-md px-3 transition-colors", source === s ? "bg-or/15 text-or-light" : "text-blanc/55 hover:text-blanc")}
              >
                {s === "file" ? "Fichier" : "Lien"}
              </button>
            ))}
          </div>
        </div>
        {source === "file" ? (
          <CourseFileField moduleId={moduleId} accept="any" value={file} onChange={setFile} />
        ) : (
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <input name="url" type="url" required placeholder="https://…" className={inputClass} aria-label="Lien" />
            <select name="kind" className={selectClass} aria-label="Type de lien">
              <option value="link">Lien</option>
              <option value="pdf">PDF</option>
              <option value="document">Document</option>
              <option value="audio">Audio</option>
              <option value="video">Vidéo</option>
            </select>
          </div>
        )}
      </div>
      <button type="submit" disabled={pending || (source === "file" && !file)} className={cn(btnClass, "bg-or/10")}>
        {pending ? "…" : "Ajouter la ressource"}
      </button>
    </form>
  );
}

/** Retire l'étudiant de la classe (il perd l'accès complet et reçoit une notification). */
export function RemoveStudentButton({ userId, name }: { userId: string; name: string }) {
  const { pending, run } = useRun();
  const [confirming, setConfirming] = useState(false);
  if (!confirming)
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="min-h-10 rounded-xl border border-danger/40 px-4 text-sm text-danger-light transition-colors hover:bg-danger/10"
      >
        Retirer {name} de la classe
      </button>
    );
  return (
    <span className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-blanc/60">Confirmer le retrait ?</span>
      <button
        type="button"
        disabled={pending}
        onClick={() => run(removeClassStudentAction({ userId }), "Étudiant retiré de la classe.")}
        className="min-h-9 rounded-lg border border-danger/60 bg-danger/15 px-3 text-xs font-medium text-danger-light disabled:opacity-50"
      >
        {pending ? "…" : "Oui, retirer"}
      </button>
      <button type="button" onClick={() => setConfirming(false)} className="min-h-9 rounded-lg border border-line px-3 text-xs text-blanc/60">
        Annuler
      </button>
    </span>
  );
}

/** Marque le fil comme lu à l'ouverture (messages de l'étudiant). */
export function MarkClassRead({ threadId }: { threadId: string }) {
  useEffect(() => {
    void markClassThreadReadAction(threadId);
  }, [threadId]);
  return null;
}

/** Réponse dans un fil existant. */
export function ClassThreadReply({ threadId }: { threadId: string }) {
  const { pending, run } = useRun();
  const router = useRouter();
  const toast = useToast();
  const [body, setBody] = useState("");

  // Les réponses de l'étudiant apparaissent sans recharger la page (onglet visible uniquement).
  useEffect(() => {
    const id = setInterval(() => document.visibilityState === "visible" && router.refresh(), 15_000);
    return () => clearInterval(id);
  }, [router]);

  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!body.trim()) return;
        run(sendClassMessageAction({ threadId, body }), "Message envoyé.");
        setBody("");
      }}
    >
      <VoiceRecorder
        requestUpload={(mime, size) => requestClassVoiceUploadAction({ threadId, mime, size })}
        send={(path, durationSec) => sendClassVoiceMessageAction({ threadId, path, durationSec })}
        onSent={() => {
          toast({ title: "Message vocal envoyé", tone: "success" });
          router.refresh();
        }}
        onError={(message) => toast({ title: "Message vocal", description: message, tone: "error" })}
        disabled={pending}
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={2}
        placeholder="Votre réponse…"
        className={cn(inputClass, "min-h-12 min-w-40 flex-1 resize-y")}
        aria-label="Votre réponse"
      />
      <button type="submit" disabled={pending || !body.trim()} className={cn(btnClass, "shrink-0")}>
        {pending ? "…" : "Envoyer"}
      </button>
    </form>
  );
}

/** Nouveau fil vers un étudiant de la classe. */
export function NewClassThreadForm({ students }: { students: { userId: string; name: string; formationSlug: string }[] }) {
  const { pending, run } = useRun();
  return (
    <form
      className="grid gap-3 sm:grid-cols-[auto_1fr_1fr_auto]"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        run(
          createClassThreadAction({
            studentId: String(fd.get("studentId") ?? ""),
            subject: String(fd.get("subject") ?? ""),
            body: String(fd.get("body") ?? ""),
          }),
          "Fil créé — l'étudiant a été notifié.",
        );
        e.currentTarget.reset();
      }}
    >
      <select name="studentId" required className={selectClass} aria-label="Étudiant" defaultValue="">
        <option value="" disabled>
          Étudiant…
        </option>
        {students.map((s) => (
          <option key={s.userId} value={s.userId}>
            {s.name} ({s.formationSlug.toUpperCase()})
          </option>
        ))}
      </select>
      <input name="subject" required minLength={3} maxLength={140} placeholder="Sujet" className={selectClass} aria-label="Sujet" />
      <input name="body" required placeholder="Premier message…" className={selectClass} aria-label="Message" />
      <button type="submit" disabled={pending} className={btnClass}>
        {pending ? "…" : "Envoyer"}
      </button>
    </form>
  );
}

// ───────────────────────── Planning & annonces (Pédagogie) ─────────────────────────

const dangerBtn = "min-h-9 rounded-lg border border-danger/40 px-3 text-xs text-danger-light transition-colors hover:bg-danger/10 disabled:opacity-50";

type FormationOpt = { id: string; slug: string; name: string; label: string };
type ModuleOpt = { id: string; title: string; formationSlug: string; levelLabel: string | null };

/** Programme un cours en direct — apparaît dans le calendrier des étudiants. */
export function LiveSessionForm({ formations, modules }: { formations: FormationOpt[]; modules: ModuleOpt[] }) {
  const { pending, run } = useRun();
  const [formationId, setFormationId] = useState(formations[0]?.id ?? "");
  const slug = formations.find((f) => f.id === formationId)?.slug;
  const moduleOptions = modules.filter((m) => m.formationSlug === slug);
  return (
    <form
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        run(
          createLiveSessionAction({
            formationId,
            moduleId: String(fd.get("moduleId") ?? ""),
            title: String(fd.get("title") ?? ""),
            startsAt: String(fd.get("startsAt") ?? ""),
            durationMinutes: String(fd.get("durationMinutes") ?? "60"),
            zoomUrl: String(fd.get("zoomUrl") ?? ""),
            description: String(fd.get("description") ?? ""),
          }),
          "Séance programmée — visible au calendrier des étudiants.",
        );
        e.currentTarget.reset();
      }}
    >
      <label className="block">
        <span className={fieldLabel}>Classe</span>
        <select value={formationId} onChange={(e) => setFormationId(e.target.value)} className={inputClass} required>
          {formations.map((f) => (
            <option key={f.id} value={f.id}>
              {f.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className={fieldLabel}>Module (optionnel)</span>
        <select name="moduleId" className={inputClass}>
          <option value="">—</option>
          {moduleOptions.map((m) => (
            <option key={m.id} value={m.id}>
              {m.title}
            </option>
          ))}
        </select>
      </label>
      <label className="block sm:col-span-2">
        <span className={fieldLabel}>Titre de la séance</span>
        <input name="title" required minLength={3} maxLength={160} placeholder="Ex. Cours en direct — module 2" className={inputClass} />
      </label>
      <label className="block">
        <span className={fieldLabel}>Date et heure</span>
        <input name="startsAt" type="datetime-local" required className={inputClass} />
      </label>
      <label className="block">
        <span className={fieldLabel}>Durée (min)</span>
        <input name="durationMinutes" type="number" min={5} max={600} defaultValue={60} className={inputClass} />
      </label>
      <label className="block sm:col-span-2">
        <span className={fieldLabel}>Lien de la réunion</span>
        <input name="zoomUrl" type="url" placeholder="https://…" className={inputClass} />
      </label>
      <button type="submit" disabled={pending || !formationId} className={cn(btnClass, "bg-or/10 sm:col-span-4 sm:justify-self-start")}>
        {pending ? "…" : "Programmer la séance"}
      </button>
    </form>
  );
}

/** Ajoute un événement au calendrier de la classe. */
export function CalendarEventForm({ formations }: { formations: FormationOpt[] }) {
  const { pending, run } = useRun();
  return (
    <form
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        run(
          createCalendarEventAction({
            formationId: String(fd.get("formationId") ?? ""),
            title: String(fd.get("title") ?? ""),
            startsAt: String(fd.get("startsAt") ?? ""),
            endsAt: String(fd.get("endsAt") ?? ""),
            zoomUrl: String(fd.get("zoomUrl") ?? ""),
            description: String(fd.get("description") ?? ""),
          }),
          "Événement ajouté au calendrier.",
        );
        e.currentTarget.reset();
      }}
    >
      <label className="block">
        <span className={fieldLabel}>Classe</span>
        <select name="formationId" required className={inputClass}>
          {formations.map((f) => (
            <option key={f.id} value={f.id}>
              {f.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block sm:col-span-3">
        <span className={fieldLabel}>Titre de l&rsquo;événement</span>
        <input name="title" required minLength={3} maxLength={160} placeholder="Ex. Soutenance des mémoires" className={inputClass} />
      </label>
      <label className="block">
        <span className={fieldLabel}>Début</span>
        <input name="startsAt" type="datetime-local" required className={inputClass} />
      </label>
      <label className="block">
        <span className={fieldLabel}>Fin (optionnel)</span>
        <input name="endsAt" type="datetime-local" className={inputClass} />
      </label>
      <label className="block sm:col-span-2">
        <span className={fieldLabel}>Lien (optionnel)</span>
        <input name="zoomUrl" type="url" placeholder="https://…" className={inputClass} />
      </label>
      <button type="submit" disabled={pending} className={cn(btnClass, "bg-or/10 sm:col-span-4 sm:justify-self-start")}>
        {pending ? "…" : "Ajouter l'événement"}
      </button>
    </form>
  );
}

/** Publie une annonce visible par la classe. */
export function AnnouncementForm({ formations }: { formations: FormationOpt[] }) {
  const { pending, run } = useRun();
  return (
    <form
      className="grid gap-3 sm:grid-cols-[auto_1fr_2fr_auto]"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        run(
          createAnnouncementAction({
            formationId: String(fd.get("formationId") ?? ""),
            title: String(fd.get("title") ?? ""),
            body: String(fd.get("body") ?? ""),
            pinned: fd.get("pinned") === "on",
          }),
          "Annonce publiée.",
        );
        e.currentTarget.reset();
      }}
    >
      <select name="formationId" required className={selectClass} aria-label="Classe">
        {formations.map((f) => (
          <option key={f.id} value={f.id}>
            {f.label}
          </option>
        ))}
      </select>
      <input name="title" required minLength={3} maxLength={160} placeholder="Titre de l'annonce" className={selectClass} aria-label="Titre" />
      <input name="body" required minLength={3} placeholder="Contenu de l'annonce…" className={selectClass} aria-label="Contenu" />
      <button type="submit" disabled={pending} className={btnClass}>
        {pending ? "…" : "Publier"}
      </button>
    </form>
  );
}

/** Suppression d'un élément de planning (séance, événement ou annonce). */
export function DeleteScheduleButton({ kind, id }: { kind: "session" | "event" | "announcement"; id: string }) {
  const { pending, run } = useRun();
  const labels = { session: "Séance supprimée.", event: "Événement supprimé.", announcement: "Annonce supprimée." };
  const actions = { session: deleteLiveSessionAction, event: deleteCalendarEventAction, announcement: deleteAnnouncementAction };
  return (
    <button type="button" disabled={pending} onClick={() => run(actions[kind]({ id }), labels[kind])} className={dangerBtn}>
      Supprimer
    </button>
  );
}

// ───────────────────────── Paramétrage du site ─────────────────────────

/** Formulaire des réglages du site — réservé à l'administrateur principal. */
export function SiteSettingsForm({
  settings,
}: {
  settings: { whatsappNumber: string; contactEmail: string; registrationsOpen: boolean; registrationNotice: string };
}) {
  const { pending, run } = useRun();
  const [whatsappNumber, setWhatsappNumber] = useState(settings.whatsappNumber);
  const [contactEmail, setContactEmail] = useState(settings.contactEmail);
  const [registrationsOpen, setRegistrationsOpen] = useState(settings.registrationsOpen);
  const [registrationNotice, setRegistrationNotice] = useState(settings.registrationNotice);

  return (
    <form
      className="grid gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        run(
          updateSiteSettingsAction({ whatsappNumber, contactEmail, registrationsOpen, registrationNotice }),
          "Réglages enregistrés — le site est mis à jour.",
        );
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium text-blanc">Numéro WhatsApp d&rsquo;assistance</span>
          <input
            value={whatsappNumber}
            onChange={(e) => setWhatsappNumber(e.target.value)}
            placeholder="ex. 2250700000000"
            className={selectClass}
            aria-label="Numéro WhatsApp d'assistance"
          />
          <span className="text-xs text-blanc/45">Format international sans « + ». Vide = boutons WhatsApp masqués sur le site.</span>
        </label>
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium text-blanc">E-mail de contact</span>
          <input
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            placeholder="contact@exemple.org"
            className={selectClass}
            aria-label="E-mail de contact"
          />
        </label>
      </div>

      <div className="rounded-xl border border-line bg-noir-soft p-4">
        <label className="flex cursor-pointer items-center justify-between gap-3">
          <span>
            <span className="block text-sm font-medium text-blanc">Inscriptions ouvertes</span>
            <span className="mt-0.5 block text-xs text-blanc/50">
              Fermé = la page d&rsquo;inscription affiche le message ci-dessous et aucune nouvelle candidature n&rsquo;est acceptée.
            </span>
          </span>
          <input
            type="checkbox"
            checked={registrationsOpen}
            onChange={(e) => setRegistrationsOpen(e.target.checked)}
            className="size-5 shrink-0 accent-[#C9A227]"
            aria-label="Inscriptions ouvertes"
          />
        </label>
        {!registrationsOpen && (
          <label className="mt-3 grid gap-1.5 text-sm">
            <span className="font-medium text-blanc">Message affiché aux visiteurs</span>
            <textarea
              value={registrationNotice}
              onChange={(e) => setRegistrationNotice(e.target.value)}
              rows={3}
              maxLength={500}
              className={cn(selectClass, "resize-y py-2")}
              aria-label="Message de fermeture des inscriptions"
            />
          </label>
        )}
      </div>

      <div>
        <button type="submit" disabled={pending} className={btnClass}>
          {pending ? "…" : "Enregistrer les réglages"}
        </button>
      </div>
    </form>
  );
}

// ───────────────────────── Assistance : fils « Administratif » + tickets ─────────────────────────

/** Marque le fil Administratif comme lu à l'ouverture. */
export function MarkAdminRead({ threadId }: { threadId: string }) {
  useEffect(() => {
    void markAdminThreadReadAction(threadId);
  }, [threadId]);
  return null;
}

/** Réponse (texte ou vocal) dans un fil Administratif. */
export function AdminThreadReply({ threadId }: { threadId: string }) {
  const { pending, run } = useRun();
  const router = useRouter();
  const toast = useToast();
  const [body, setBody] = useState("");

  useEffect(() => {
    const id = setInterval(() => document.visibilityState === "visible" && router.refresh(), 15_000);
    return () => clearInterval(id);
  }, [router]);

  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!body.trim()) return;
        run(sendAdminMessageAction({ threadId, body }), "Message envoyé.");
        setBody("");
      }}
    >
      <VoiceRecorder
        requestUpload={(mime, size) => requestAdminVoiceUploadAction({ threadId, mime, size })}
        send={(path, durationSec) => sendAdminVoiceMessageAction({ threadId, path, durationSec })}
        onSent={() => {
          toast({ title: "Message vocal envoyé", tone: "success" });
          router.refresh();
        }}
        onError={(message) => toast({ title: "Message vocal", description: message, tone: "error" })}
        disabled={pending}
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={2}
        placeholder="Votre réponse à l'étudiant…"
        className={cn(inputClass, "min-h-12 min-w-40 flex-1 resize-y")}
        aria-label="Votre réponse"
      />
      <button type="submit" disabled={pending || !body.trim()} className={cn(btnClass, "shrink-0")}>
        {pending ? "…" : "Envoyer"}
      </button>
    </form>
  );
}

/** Statut d'un ticket d'assistance ; la clôture demande une réponse visible par l'étudiant. */
export function TicketControl({ ticketId, status, resolution }: { ticketId: string; status: string; resolution: string | null }) {
  const { pending, run } = useRun();
  const [next, setNext] = useState(status);
  const [note, setNote] = useState(resolution ?? "");
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <select value={next} onChange={(e) => setNext(e.target.value)} className={selectClass} aria-label="Statut du ticket">
          <option value="open">Ouvert</option>
          <option value="in_progress">En cours</option>
          <option value="resolved">Résolu</option>
        </select>
        <button
          type="button"
          disabled={pending || (next === status && (next !== "resolved" || note === (resolution ?? "")))}
          onClick={() => run(setTicketStatusAction({ ticketId, status: next as "open" | "in_progress" | "resolved", resolution: note || undefined }), "Ticket mis à jour — l'étudiant a été notifié.")}
          className={btnClass}
        >
          {pending ? "…" : "Appliquer"}
        </button>
      </div>
      {(next === "resolved" || note) && (
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          maxLength={1000}
          placeholder="Réponse apportée à l'étudiant (obligatoire pour clôturer)…"
          className={cn(inputClass, "min-h-11 resize-y")}
          aria-label="Réponse apportée"
        />
      )}
    </div>
  );
}

// ───────────────────────── Création d'accès ─────────────────────────

/** Crée un accès étudiant (admis hors plateforme) ou un accès équipe ; affiche le lien de première connexion à transmettre. */
export function CreateAccessForm({
  formations,
  staffRoles,
}: {
  formations: { id: string; slug: string; name: string }[];
  staffRoles: { value: string; label: string }[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [link, setLink] = useState<string | null>(null);
  const [createdFor, setCreatedFor] = useState("");
  const [kind, setKind] = useState("student");
  const isStudent = kind === "student";

  return (
    <form
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const email = String(fd.get("email") ?? "");
        start(async () => {
          const r = await createAccessAction({
            firstName: String(fd.get("firstName") ?? ""),
            lastName: String(fd.get("lastName") ?? ""),
            email,
            phone: String(fd.get("phone") ?? "") || undefined,
            kind,
            formationSlug: isStudent ? String(fd.get("formationSlug") ?? "") : undefined,
          });
          if (r.ok) {
            setCreatedFor(email);
            setLink(r.data?.link ?? null);
            toast({ title: "Accès créé", description: "Transmettez le lien de première connexion à la personne.", tone: "success" });
            e.currentTarget.reset();
            setKind("student");
            router.refresh();
          } else {
            toast({ title: "Échec", description: r.error, tone: "error" });
          }
        });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <input name="firstName" required minLength={2} maxLength={60} placeholder="Prénom" className={selectClass} aria-label="Prénom" />
        <input name="lastName" required minLength={2} maxLength={60} placeholder="Nom" className={selectClass} aria-label="Nom" />
        <input name="email" type="email" required placeholder="E-mail" className={selectClass} aria-label="E-mail" />
        <input name="phone" placeholder="Téléphone (optionnel)" className={selectClass} aria-label="Téléphone" />
        <select name="kind" required className={selectClass} aria-label="Type d'accès" value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="student">Étudiant</option>
          {staffRoles.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
        {isStudent ? (
          <select name="formationSlug" required className={selectClass} aria-label="Formation" defaultValue="">
            <option value="" disabled>
              Formation…
            </option>
            {formations.map((f) => (
              <option key={f.id} value={f.slug}>
                {f.name}
              </option>
            ))}
          </select>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={btnClass}>
          {pending ? "…" : "Créer l'accès"}
        </button>
        <span className="text-xs text-blanc/45">
          {isStudent
            ? "Le dossier est créé admis et réglé — accès complet immédiat."
            : "L'accès ouvre l'espace d'administration selon le profil choisi ; pour un formateur, assignez ensuite sa classe ci-dessous."}
        </span>
      </div>
      {createdFor && (
        <div className="rounded-xl border border-or/30 bg-or/5 p-4">
          <p className="text-sm font-medium text-or-light">Accès créé pour {createdFor}</p>
          {link ? (
            <>
              <p className="mt-1 text-xs text-blanc/60">Lien de première connexion (choix du mot de passe) — à transmettre à la personne :</p>
              <p className="mt-2 rounded-lg border border-line bg-noir-soft p-2 font-mono text-xs break-all text-blanc/80 select-all">{link}</p>
            </>
          ) : (
            <p className="mt-1 text-xs text-blanc/60">Aucun lien généré — la personne peut utiliser « Mot de passe oublié » sur la page de connexion.</p>
          )}
        </div>
      )}
    </form>
  );
}

// ───────────────────────── Saisie d'un règlement ─────────────────────────

export type PaymentTarget = { applicationId: string; label: string; schedules: { id: string; label: string; remaining: number }[] };

const METHOD_OPTIONS = [
  { value: "cash", label: "Espèces" },
  { value: "transfer", label: "Virement" },
  { value: "orange_money", label: "Orange Money" },
  { value: "mtn_momo", label: "MTN Mobile Money" },
  { value: "wave", label: "Wave" },
  { value: "moov_money", label: "Moov Money" },
  { value: "card", label: "Carte bancaire" },
];

/** Enregistre un règlement reçu hors ligne : paiement confirmé + reçu émis + échéance mise à jour. */
export function RecordPaymentForm({ targets }: { targets: PaymentTarget[] }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [applicationId, setApplicationId] = useState("");
  const schedules = targets.find((t) => t.applicationId === applicationId)?.schedules ?? [];

  return (
    <form
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          const r = await recordPaymentAction({
            applicationId,
            scheduleId: String(fd.get("scheduleId") ?? "") || undefined,
            amount: String(fd.get("amount") ?? ""),
            method: String(fd.get("method") ?? ""),
            providerReference: String(fd.get("providerReference") ?? "") || undefined,
          });
          if (r.ok) {
            toast({ title: "Paiement enregistré", description: `Reçu ${r.data?.receiptNumber ?? ""} émis — l'étudiant est notifié.`, tone: "success" });
            e.currentTarget.reset();
            setApplicationId("");
            router.refresh();
          } else {
            toast({ title: "Échec", description: r.error, tone: "error" });
          }
        });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <select required className={selectClass} value={applicationId} onChange={(e) => setApplicationId(e.target.value)} aria-label="Dossier">
          <option value="" disabled>
            Dossier…
          </option>
          {targets.map((t) => (
            <option key={t.applicationId} value={t.applicationId}>
              {t.label}
            </option>
          ))}
        </select>
        <select name="scheduleId" className={selectClass} aria-label="Échéance" disabled={!schedules.length} defaultValue="">
          <option value="">{schedules.length ? "Échéance (optionnel)…" : "Aucune échéance ouverte"}</option>
          {schedules.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label} — reste {s.remaining.toLocaleString("fr-FR")} F
            </option>
          ))}
        </select>
        <input name="amount" type="number" required min={100} step={100} placeholder="Montant (F CFA)" className={selectClass} aria-label="Montant" />
        <select name="method" required className={selectClass} aria-label="Moyen de paiement" defaultValue="cash">
          {METHOD_OPTIONS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
        <input name="providerReference" maxLength={80} placeholder="Référence / n° de reçu (optionnel)" className={selectClass} aria-label="Référence" />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending || !applicationId} className={btnClass}>
          {pending ? "…" : "Enregistrer le règlement"}
        </button>
        <span className="text-xs text-blanc/45">Le paiement est enregistré confirmé, le reçu est émis et l&rsquo;étudiant notifié.</span>
      </div>
    </form>
  );
}

// ───────────────────────── Programme — création de module ─────────────────────────

export type ProgramLevelOpt = { id: string; formationId: string; number: number; title: string };

/** Crée un module dans le programme d'une formation (structure pédagogique : admin + pédagogie). */
export function ModuleForm({ formations, levels }: { formations: FormationOpt[]; levels: ProgramLevelOpt[] }) {
  const { pending, run } = useRun();
  const [formationId, setFormationId] = useState(formations[0]?.id ?? "");
  const levelOptions = levels.filter((l) => l.formationId === formationId);

  return (
    <form
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        run(
          createModuleAction({
            formationId,
            levelId: String(fd.get("levelId") ?? ""),
            title: String(fd.get("title") ?? ""),
            summary: String(fd.get("summary") ?? ""),
            durationMinutes: String(fd.get("durationMinutes") ?? ""),
          }),
          "Module créé — il apparaît dans le programme des étudiants.",
        );
        e.currentTarget.reset();
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <select required className={selectClass} value={formationId} onChange={(e) => setFormationId(e.target.value)} aria-label="Formation">
          {formations.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
        <select name="levelId" className={selectClass} aria-label="Niveau" defaultValue="">
          <option value="">Toute la formation (transverse)</option>
          {levelOptions.map((l) => (
            <option key={l.id} value={l.id}>
              Niveau {l.number} — {l.title}
            </option>
          ))}
        </select>
        <input name="title" required minLength={3} maxLength={160} placeholder="Titre du module" className={selectClass} aria-label="Titre du module" />
        <input name="durationMinutes" type="number" min={0} max={2000} step={15} placeholder="Durée (min, optionnel)" className={selectClass} aria-label="Durée en minutes" />
      </div>
      <input name="summary" maxLength={400} placeholder="Résumé affiché aux étudiants (optionnel)" className={selectClass} aria-label="Résumé" />
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending || !formationId} className={btnClass}>
          {pending ? "…" : "Créer le module"}
        </button>
        <span className="text-xs text-blanc/45">Le module est créé vide : ajoutez ensuite ses leçons et ressources depuis « Ma classe ».</span>
      </div>
    </form>
  );
}

// ───────────────────────── Équipe pastorale — affectations & décisions ─────────────────────────

export type PastoralStudentOpt = { userId: string; name: string; formationSlug: string };

/** Affecte un étudiant admis à un département de l'église. */
export function ResponsibilityForm({ students }: { students: PastoralStudentOpt[] }) {
  const { pending, run } = useRun();
  return (
    <form
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        run(
          assignResponsibilityAction({
            userId: String(fd.get("userId") ?? ""),
            role: String(fd.get("role") ?? ""),
            place: String(fd.get("place") ?? ""),
            supervisorName: String(fd.get("supervisorName") ?? ""),
            startsOn: String(fd.get("startsOn") ?? ""),
            endsOn: String(fd.get("endsOn") ?? ""),
          }),
          "Affectation créée — l'étudiant est notifié.",
        );
        e.currentTarget.reset();
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <select name="userId" required className={selectClass} aria-label="Étudiant" defaultValue="">
          <option value="" disabled>
            Étudiant…
          </option>
          {students.map((s) => (
            <option key={s.userId} value={s.userId}>
              {s.name} · {s.formationSlug.toUpperCase()}
            </option>
          ))}
        </select>
        <input name="role" required minLength={3} maxLength={120} placeholder="Département / fonction (ex. Accueil, Intercession)" className={selectClass} aria-label="Département" />
        <input name="place" required minLength={2} maxLength={120} placeholder="Lieu (ex. Campus central)" className={selectClass} aria-label="Lieu" />
        <input name="supervisorName" maxLength={120} placeholder="Responsable (optionnel)" className={selectClass} aria-label="Responsable" />
        <label className="flex items-center gap-2 text-xs text-blanc/55">
          Début
          <input name="startsOn" type="date" required className={selectClass} aria-label="Date de début" />
        </label>
        <label className="flex items-center gap-2 text-xs text-blanc/55">
          Fin (opt.)
          <input name="endsOn" type="date" className={selectClass} aria-label="Date de fin" />
        </label>
      </div>
      <button type="submit" disabled={pending} className={btnClass}>
        {pending ? "…" : "Créer l'affectation"}
      </button>
    </form>
  );
}

/** Clôture une affectation départementale active. */
export function CompleteResponsibilityButton({ responsibilityId }: { responsibilityId: string }) {
  const { pending, run } = useRun();
  return (
    <button type="button" disabled={pending} onClick={() => run(completeResponsibilityAction({ responsibilityId }), "Affectation clôturée.")} className={btnClass}>
      {pending ? "…" : "Clôturer"}
    </button>
  );
}

/** Ouvre un dossier de consécration ou de soutenance pour un étudiant admis. */
export function NewPastoralCaseForm({ students }: { students: PastoralStudentOpt[] }) {
  const { pending, run } = useRun();
  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        run(
          createPastoralCaseAction({
            userId: String(fd.get("userId") ?? ""),
            kind: String(fd.get("kind") ?? "consecration"),
            title: String(fd.get("title") ?? ""),
          }),
          "Dossier ouvert — la décision se rend dans le tableau ci-dessous.",
        );
        e.currentTarget.reset();
      }}
    >
      <select name="userId" required className={cn(selectClass, "min-w-0")} aria-label="Étudiant" defaultValue="">
        <option value="" disabled>
          Étudiant…
        </option>
        {students.map((s) => (
          <option key={s.userId} value={s.userId}>
            {s.name} · {s.formationSlug.toUpperCase()}
          </option>
        ))}
      </select>
      <select name="kind" className={cn(selectClass, "min-w-0")} aria-label="Type de dossier" defaultValue="consecration">
        <option value="consecration">Consécration</option>
        <option value="defense">Soutenance</option>
      </select>
      <input name="title" required minLength={3} maxLength={160} placeholder="Intitulé (ex. Consécration au diaconat)" className={cn(selectClass, "min-w-0")} aria-label="Intitulé" />
      <button type="submit" disabled={pending} className={cn(btnClass, "justify-self-start")}>
        {pending ? "…" : "Ouvrir le dossier"}
      </button>
    </form>
  );
}

/** Rend la décision d'un dossier de consécration/soutenance : accordée (certificat émis) ou refusée. */
export function DecisionControl({ validationId, decision }: { validationId: string; decision: string }) {
  const { pending, run } = useRun();
  if (decision !== "pending") return <StatusBadge status={decision} />;
  return (
    <span className="flex gap-2">
      <button type="button" disabled={pending} onClick={() => run(decideValidationAction({ validationId, decision: "granted" }), "Décision accordée — certificat émis.")} className={btnClass}>
        {pending ? "…" : "Accorder"}
      </button>
      <button type="button" disabled={pending} onClick={() => run(decideValidationAction({ validationId, decision: "refused" }), "Décision refusée enregistrée.")} className="min-h-11 rounded-xl border border-line px-4 text-sm text-blanc/60 transition-colors hover:border-or/40 hover:text-or-light disabled:opacity-50">
        Refuser
      </button>
    </span>
  );
}

/** Reconnaît (ou retire) une activité de service d'un étudiant diacre. */
export function RecognizeServiceButton({ serviceId, recognized }: { serviceId: string; recognized: boolean }) {
  const { pending, run } = useRun();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => run(recognizeServiceAction({ serviceId, recognized: !recognized }), recognized ? "Reconnaissance retirée." : "Service reconnu — l'étudiant est notifié.")}
      className={btnClass}
    >
      {pending ? "…" : recognized ? "Retirer" : "Reconnaître"}
    </button>
  );
}

/** Relecture d'une fiche de transformation EDM : observation + validation (ou retrait de la validation). */
export function EdmReportControl({ reportId, validated, observation }: { reportId: string; validated: boolean; observation: string | null }) {
  const { pending, run } = useRun();
  const [note, setNote] = useState(observation ?? "");
  return (
    <div className="space-y-2">
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={3}
        maxLength={4000}
        placeholder="Observation pour l'étudiant (facultative)…"
        className="w-full rounded-xl border border-line bg-noir-soft px-3 py-2 text-sm text-blanc outline-none transition-colors placeholder:text-blanc/35 focus:border-or/60"
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => run(reviewEdmReportAction({ reportId, validated: true, observation: note.trim() || undefined }), "Fiche validée — l'étudiant est notifié.")}
          className={btnClass}
        >
          {pending ? "…" : validated ? "Mettre à jour" : "Valider la fiche"}
        </button>
        {validated && (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(reviewEdmReportAction({ reportId, validated: false, observation: note.trim() || undefined }), "Validation retirée.")}
            className={btnClass}
          >
            Retirer la validation
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Création et attribution d'un stage par le pasteur (ou admin/superviseur).
 * Le lieu dépend de la formation : EDS → département de l'Église (liste),
 * EDM → « Vase d'honneur » (imposé), diacres → lieu libre.
 */
export function InternshipForm({ students, departments, edmPlace }: { students: { userId: string; name: string; formationSlug: string }[]; departments: string[]; edmPlace: string }) {
  const { pending, run } = useRun();
  const [studentId, setStudentId] = useState("");
  const formation = students.find((s) => s.userId === studentId)?.formationSlug ?? null;
  return (
    <form
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        run(
          createInternshipAction({
            studentId: String(fd.get("studentId") ?? ""),
            place: String(fd.get("place") ?? ""),
            supervisorName: String(fd.get("supervisorName") ?? "") || undefined,
            startsOn: String(fd.get("startsOn") ?? ""),
            endsOn: String(fd.get("endsOn") ?? ""),
            targetHours: Number(fd.get("targetHours") ?? 0),
            steps: String(fd.get("steps") ?? "") || undefined,
          }),
          "Stage créé — l'étudiant est notifié.",
        );
        e.currentTarget.reset();
        setStudentId("");
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <select name="studentId" required className={selectClass} aria-label="Étudiant" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
          <option value="" disabled>
            Étudiant admis…
          </option>
          {students.map((s) => (
            <option key={s.userId} value={s.userId}>
              {s.name} · {s.formationSlug.toUpperCase()}
            </option>
          ))}
        </select>
        {formation === "edm" ? (
          <div className={cn(selectClass, "flex items-center justify-between gap-2")}>
            <span className="text-blanc">{edmPlace}</span>
            <span className="text-xs text-or-light">lieu imposé</span>
            <input type="hidden" name="place" value={edmPlace} />
          </div>
        ) : formation === "eds" ? (
          <select name="place" required className={selectClass} aria-label="Département de l'Église" defaultValue="">
            <option value="" disabled>
              Département de l&rsquo;Église…
            </option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        ) : (
          <input name="place" required minLength={3} maxLength={200} placeholder="Lieu / service (ex. Accueil, Protocole)" className={selectClass} aria-label="Lieu du stage" />
        )}
        <input name="supervisorName" maxLength={120} placeholder="Référent (vous-même par défaut)" className={selectClass} aria-label="Référent" />
        <label className="flex items-center gap-2 text-xs text-blanc/55">
          Début
          <input name="startsOn" type="date" required className={selectClass} aria-label="Date de début" />
        </label>
        <label className="flex items-center gap-2 text-xs text-blanc/55">
          Fin
          <input name="endsOn" type="date" required className={selectClass} aria-label="Date de fin" />
        </label>
        <input name="targetHours" type="number" required min={1} max={2000} inputMode="numeric" placeholder="Objectif d'heures (ex. 120)" className={selectClass} aria-label="Objectif d'heures" />
      </div>
      <textarea name="steps" rows={3} maxLength={4000} placeholder="Étapes du stage (une par ligne, facultatif)" className={selectClass} aria-label="Étapes" />
      <p className="text-xs text-blanc/45">
        Les stages EDS se font dans les départements de l&rsquo;Église ; ceux des mentors EDM se déroulent à « {edmPlace} ».
      </p>
      <button type="submit" disabled={pending || !studentId} className={btnClass}>
        {pending ? "…" : "Créer et attribuer le stage"}
      </button>
    </form>
  );
}
