"use client";

import { useState } from "react";
import { formatDistanceToNowStrict } from "date-fns";
import { fr } from "date-fns/locale";
import { CircleHelp, MessageCircleReply, Send } from "lucide-react";
import { useOnline } from "@/components/student/layout/offline-banner";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { askQuestionAction } from "@/lib/student/actions/courses";
import type { LessonDetail } from "@/lib/student/queries/courses";
import { cn } from "@/lib/utils";

type Question = LessonDetail["questions"][number];

/** Questions au formateur : poser une question sur la leçon, voir les réponses. */
export function QuestionsPanel({ lessonId, initial }: { lessonId: string; initial: Question[] }) {
  const online = useOnline();
  const toast = useToast();
  const [questions, setQuestions] = useState(initial);
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPending(true);
    const result = await askQuestionAction({ lessonId, body });
    setPending(false);
    if (!result.ok || !result.data) {
      setError(result.ok ? "Réponse inattendue du serveur." : result.error);
      return;
    }
    const created = result.data;
    setQuestions((q) => [{ id: created.id, body, answer: null, answeredBy: null, createdAt: created.createdAt }, ...q]);
    setBody("");
    toast({ tone: "success", title: "Question envoyée", description: "Le formateur vous répondra ici." });
  };

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="space-y-3">
        <label htmlFor="question" className="block font-medium text-blanc">
          Une question sur cette leçon ?
        </label>
        <textarea
          id="question"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="Posez votre question au formateur…"
          className="w-full resize-y rounded-2xl border border-line bg-noir/40 p-4 text-blanc placeholder:text-blanc/35 focus:border-or/50 focus:outline-none"
        />
        {error && (
          <p role="alert" className="text-sm text-danger-light">
            {error}
          </p>
        )}
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-blanc/45">Votre question est visible par vous et l&apos;équipe de formation.</p>
          <Button type="submit" size="sm" disabled={pending || body.trim().length < 3} title={!online ? "Connexion requise" : undefined}>
            <Send /> Envoyer
          </Button>
        </div>
      </form>

      {questions.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line p-5 text-center text-sm text-blanc/55">
          Aucune question pour l&apos;instant. N&apos;hésitez pas, il n&apos;y a pas de mauvaise question.
        </p>
      ) : (
        <ul className="space-y-3">
          {questions.map((q) => (
            <li key={q.id} className="rounded-2xl border border-line bg-noir/40 p-4">
              <div className="flex items-start gap-3">
                <CircleHelp aria-hidden className="mt-0.5 size-5 shrink-0 text-or" />
                <div className="min-w-0 flex-1">
                  <p className="text-blanc/85">{q.body}</p>
                  <p className="mt-1 text-xs text-blanc/45">
                    {formatDistanceToNowStrict(new Date(q.createdAt), { addSuffix: true, locale: fr })}
                  </p>
                </div>
              </div>
              {q.answer ? (
                <div className="mt-3 ml-8 rounded-xl border border-or/25 bg-or/5 p-3">
                  <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wider text-or-light uppercase">
                    <MessageCircleReply aria-hidden className="size-3.5" /> Réponse du formateur
                  </p>
                  <p className="mt-1.5 text-sm text-blanc/80">{q.answer}</p>
                </div>
              ) : (
                <p className={cn("mt-2 ml-8 text-sm text-blanc/45")}>En attente de réponse</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
