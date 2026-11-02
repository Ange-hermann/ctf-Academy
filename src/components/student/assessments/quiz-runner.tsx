"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, CheckCircle2, CloudCheck, Loader2, Send, Timer } from "lucide-react";
import { FileUpload } from "@/components/student/assessments/file-upload";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { resultHref } from "@/config/student-nav";
import { recordTabLeaveAction, saveAnswerAction, submitAttemptAction } from "@/lib/student/actions/assessments";
import { questionKindLabels, type MatchOptions } from "@/lib/student/grading";
import type { AttemptInfo, QuizQuestion } from "@/lib/student/queries/assessments";
import { cn } from "@/lib/utils";

type Answers = Record<string, unknown>;
type Props = {
  quizId: string;
  title: string;
  kindLabel: string;
  passScore: number;
  attempt: AttemptInfo;
  questions: QuizQuestion[];
  savedAnswers: Answers;
};

const answered = (v: unknown) =>
  v !== null && v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0) && !(typeof v === "object" && !Array.isArray(v) && !Object.keys(v as object).length);

const clock = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

/** Passation d'une évaluation : saisie par type de question, autosauvegarde, minuteur, rendu. */
export function QuizRunner({ quizId, title, kindLabel, passScore, attempt, questions, savedAnswers }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [answers, setAnswers] = useState<Answers>(savedAnswers);
  const [saving, setSaving] = useState<"idle" | "saving" | "saved">("idle");
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const submitted = useRef(false);

  const answeredCount = questions.filter((q) => answered(answers[q.id])).length;

  const save = useCallback(
    (questionId: string, value: unknown) => {
      setSaving("saving");
      const t = timers.current.get(questionId);
      if (t) clearTimeout(t);
      timers.current.set(
        questionId,
        setTimeout(async () => {
          const r = await saveAnswerAction({ attemptId: attempt.id, sessionKey: attempt.sessionKey, questionId, value });
          setSaving(r.ok ? "saved" : "saving");
          if (!r.ok) toast({ tone: "error", title: "Réponse non enregistrée", description: r.error });
        }, 600),
      );
    },
    [attempt.id, attempt.sessionKey, toast],
  );

  const change = useCallback(
    (questionId: string, value: unknown) => {
      setAnswers((a) => ({ ...a, [questionId]: value }));
      save(questionId, value);
    },
    [save],
  );

  const doSubmit = useCallback(async () => {
    if (submitted.current) return;
    submitted.current = true;
    setSubmitting(true);
    const r = await submitAttemptAction({ attemptId: attempt.id, sessionKey: attempt.sessionKey });
    if (!r.ok) {
      submitted.current = false;
      setSubmitting(false);
      setConfirming(false);
      toast({ tone: "error", title: "Envoi impossible", description: r.error });
      return;
    }
    toast({ tone: "success", title: r.data?.status === "graded" ? "Copie corrigée" : "Copie envoyée" });
    router.push(resultHref(quizId, attempt.id));
    router.refresh();
  }, [attempt.id, attempt.sessionKey, quizId, router, toast]);

  // Minuteur : envoi automatique à zéro.
  useEffect(() => {
    if (!attempt.deadline) return;
    const end = new Date(attempt.deadline).getTime();
    const seed = setTimeout(() => setRemaining(end - Date.now()), 0);
    const t = setInterval(() => {
      const left = end - Date.now();
      setRemaining(left);
      if (left <= 0) {
        clearInterval(t);
        void doSubmit();
      }
    }, 1000);
    return () => {
      clearTimeout(seed);
      clearInterval(t);
    };
  }, [attempt.deadline, doSubmit]);

  // Quitter l'onglet pendant une évaluation est comptabilisé.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden" && !submitted.current) {
        void recordTabLeaveAction({ attemptId: attempt.id, sessionKey: attempt.sessionKey });
      }
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [attempt.id, attempt.sessionKey]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const lowTime = remaining !== null && remaining < 60_000;

  return (
    <div className="mx-auto max-w-3xl">
      {/* Barre fixe : minuteur + progression */}
      <div className="sticky top-16 z-20 -mx-1 mb-6 rounded-2xl border border-line bg-noir-soft/90 p-3 backdrop-blur lg:top-20">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0">
            <p className="truncate font-semibold text-blanc">{title}</p>
            <p className="text-xs text-blanc/55">
              {kindLabel} · réussite à {passScore} % ·{" "}
              <span aria-live="polite">{saving === "saving" ? "Enregistrement…" : saving === "saved" ? "Réponses enregistrées" : `${answeredCount}/${questions.length} répondues`}</span>
            </p>
          </div>
          {remaining !== null && (
            <p
              role="timer"
              aria-label="Temps restant"
              className={cn("ml-auto flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-lg tabular", lowTime ? "animate-pulse border-danger/50 text-danger-light" : "border-or/30 text-or-light")}
            >
              <Timer aria-hidden className="size-4.5" /> {clock(remaining)}
            </p>
          )}
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-or/10">
          <div
            className="h-full origin-left rounded-full bg-gradient-or transition-transform duration-300"
            style={{ transform: `scaleX(${questions.length ? answeredCount / questions.length : 0})` }}
            role="progressbar"
            aria-valuenow={answeredCount}
            aria-valuemax={questions.length}
            aria-label={`${answeredCount} questions répondues sur ${questions.length}`}
          />
        </div>
      </div>

      {lowTime && (
        <p role="alert" className="mb-4 flex items-center gap-2 rounded-2xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger-light">
          <AlertTriangle aria-hidden className="size-4" /> Moins d&apos;une minute : votre copie sera envoyée automatiquement à zéro.
        </p>
      )}

      <ol className="space-y-5">
        {questions.map((q, i) => (
          <li key={q.id} className="rounded-3xl border border-line bg-gradient-card p-5 sm:p-6">
            <fieldset>
              <legend className="sr-only">
                Question {i + 1} : {q.prompt}
              </legend>
              <div className="flex items-baseline gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-full border border-or/40 font-display text-sm text-or-light">{i + 1}</span>
                <div className="min-w-0">
                  <p className="font-medium text-blanc">{q.prompt}</p>
                  <p className="mt-0.5 text-xs text-blanc/45">
                    {questionKindLabels[q.kind]} · {q.points} pt{q.points > 1 ? "s" : ""}
                    {answered(answers[q.id]) && <span className="text-success-light"> · répondue</span>}
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <QuestionField question={q} value={answers[q.id]} onChange={(v) => change(q.id, v)} upload={{ quizId, attemptId: attempt.id, sessionKey: attempt.sessionKey }} onFileDone={(name) => change(q.id, { file: name })} />
              </div>
            </fieldset>
          </li>
        ))}
      </ol>

      <div className="sticky bottom-20 z-20 mt-6 lg:bottom-6">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-or/30 bg-noir-card/95 p-4 shadow-gold backdrop-blur">
          <p className="text-sm text-blanc/60">
            {answeredCount === questions.length ? (
              <span className="flex items-center gap-1.5 text-success-light">
                <CloudCheck aria-hidden className="size-4" /> Toutes les questions ont une réponse
              </span>
            ) : (
              `${questions.length - answeredCount} question${questions.length - answeredCount > 1 ? "s" : ""} sans réponse`
            )}
          </p>
          <Button onClick={() => setConfirming(true)} disabled={submitting || saving === "saving"}>
            {submitting ? <Loader2 className="animate-spin" /> : <Send />} Rendre ma copie
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {confirming && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="submit-title"
            className="fixed inset-0 z-50 grid place-items-center bg-noir/70 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setConfirming(false)}
          >
            <motion.div
              initial={{ scale: 0.94, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 8 }}
              className="w-full max-w-md rounded-3xl border border-or/30 bg-noir-card p-6 shadow-gold-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <CheckCircle2 aria-hidden className="size-10 text-or-light" />
              <h2 id="submit-title" className="mt-3 text-2xl tracking-wide text-blanc">
                Rendre ma copie ?
              </h2>
              <p className="mt-2 text-blanc/70">
                {answeredCount === questions.length
                  ? "Toutes les questions ont une réponse. La copie sera corrigée dès l'envoi."
                  : `Il reste ${questions.length - answeredCount} question(s) sans réponse — elles compteront pour 0.`}
              </p>
              <div className="mt-5 flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setConfirming(false)} disabled={submitting}>
                  Continuer à répondre
                </Button>
                <Button className="flex-1" onClick={() => void doSubmit()} disabled={submitting}>
                  {submitting ? <Loader2 className="animate-spin" /> : <Send />} Envoyer
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Champ de saisie adapté au type de question. */
function QuestionField({
  question,
  value,
  onChange,
  upload,
  onFileDone,
}: {
  question: QuizQuestion;
  value: unknown;
  onChange: (v: unknown) => void;
  upload: { quizId: string; attemptId: string; sessionKey: string };
  onFileDone: (fileName: string) => void;
}) {
  const opts = Array.isArray(question.options) ? question.options : [];
  const match = !Array.isArray(question.options) ? question.options : null;

  switch (question.kind) {
    case "single":
      return (
        <div className="grid gap-2" role="radiogroup">
          {opts.map((o) => (
            <OptionRow key={o.id} active={value === o.id} onSelect={() => onChange(o.id)} label={o.label} mode="radio" />
          ))}
        </div>
      );
    case "multiple": {
      const selected = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div className="grid gap-2">
          {opts.map((o) => (
            <OptionRow
              key={o.id}
              active={selected.includes(o.id)}
              onSelect={() => onChange(selected.includes(o.id) ? selected.filter((s) => s !== o.id) : [...selected, o.id])}
              label={o.label}
              mode="checkbox"
            />
          ))}
        </div>
      );
    }
    case "true_false":
      return (
        <div className="grid grid-cols-2 gap-2" role="radiogroup">
          {[
            { v: true, label: "Vrai" },
            { v: false, label: "Faux" },
          ].map((o) => (
            <OptionRow key={String(o.v)} active={value === o.v} onSelect={() => onChange(o.v)} label={o.label} mode="radio" />
          ))}
        </div>
      );
    case "short":
      return (
        <input
          type="text"
          defaultValue={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Votre réponse courte"
          maxLength={500}
          className="min-h-12 w-full rounded-xl border border-line bg-noir/40 px-4 text-blanc placeholder:text-blanc/35 focus:border-or/50 focus:outline-none"
        />
      );
    case "long":
      return (
        <textarea
          defaultValue={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          rows={5}
          maxLength={20_000}
          placeholder="Rédigez votre réponse…"
          className="w-full resize-y rounded-xl border border-line bg-noir/40 p-4 text-blanc placeholder:text-blanc/35 focus:border-or/50 focus:outline-none"
        />
      );
    case "match": {
      const m = match as MatchOptions | null;
      const pairs = (value as Record<string, string>) ?? {};
      if (!m) return null;
      return (
        <div className="grid gap-3">
          {m.left.map((l) => (
            <div key={l.id} className="flex items-center gap-3">
              <span className="flex-1 rounded-xl border border-line bg-noir/40 px-4 py-3 text-blanc">{l.label}</span>
              <label className="w-44 shrink-0">
                <span className="sr-only">Associer {l.label} à</span>
                <select
                  value={pairs[l.id] ?? ""}
                  onChange={(e) => onChange({ ...pairs, [l.id]: e.target.value })}
                  className="min-h-11 w-full rounded-xl border border-line bg-noir-soft px-3 text-blanc focus:border-or/50 focus:outline-none"
                >
                  <option value="">Choisir…</option>
                  {m.right.map((r) => (
                    <option key={r.id} value={r.id} disabled={Object.entries(pairs).some(([k, v]) => k !== l.id && v === r.id)}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ))}
        </div>
      );
    }
    case "file":
      return (
        <FileUpload
          quizId={upload.quizId}
          attemptId={upload.attemptId}
          sessionKey={upload.sessionKey}
          questionId={question.id}
          currentFile={(value as { file?: string })?.file ?? null}
          onDone={onFileDone}
        />
      );
    default:
      return null;
  }
}

function OptionRow({ active, onSelect, label, mode }: { active: boolean; onSelect: () => void; label: string; mode: "radio" | "checkbox" }) {
  return (
    <button
      type="button"
      role={mode}
      aria-checked={active}
      onClick={onSelect}
      className={cn(
        "flex min-h-12 items-center gap-3 rounded-xl border px-4 text-left transition-colors",
        active ? "border-or/60 bg-or/10 text-blanc" : "border-line bg-noir/40 text-blanc/75 hover:border-or/30",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "grid size-5 shrink-0 place-items-center border transition-colors",
          mode === "radio" ? "rounded-full" : "rounded-md",
          active ? "border-or-light bg-gradient-or text-noir" : "border-blanc/30",
        )}
      >
        {active && (mode === "radio" ? <span className="size-2 rounded-full bg-noir" /> : <CheckCircle2 className="size-3.5" />)}
      </span>
      {label}
    </button>
  );
}
