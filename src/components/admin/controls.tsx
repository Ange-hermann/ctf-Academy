"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useToast } from "@/components/ui/toast";
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

export function GradeForm({ attemptId, maxScore }: { attemptId: string; maxScore: number }) {
  const { pending, run } = useRun();
  const [score, setScore] = useState("");
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
      className="grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto]"
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
      <input name="email" type="email" required placeholder="E-mail de l'étudiant" className={selectClass} aria-label="E-mail de l'étudiant" />
      <input name="title" required placeholder="Intitulé de l'évaluation" className={selectClass} aria-label="Intitulé" />
      <input name="scheduledOn" type="date" className={selectClass} aria-label="Date prévue" />
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
