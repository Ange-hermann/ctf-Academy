"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { PenLine } from "lucide-react";
import { UploadField } from "@/components/student/formation/upload-field";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { submitWorkAction } from "@/lib/student/actions/formation";

const input =
  "w-full rounded-xl border border-or/15 bg-noir-soft px-3 py-2.5 text-sm text-blanc outline-none transition-colors placeholder:text-blanc/35 focus:border-or";

/** Réponse à un travail : compte rendu rédigé en ligne OU fichier déposé (les deux marquent le travail « rendu »). */
export function WorkSubmit({ kind, workId }: { kind: "mentorat" | "leadership"; workId: string }) {
  const toast = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [response, setResponse] = useState("");
  const [pending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await submitWorkAction({ kind, workId, response: response.trim() });
      if (!res.ok) {
        toast({ title: "Envoi impossible", description: res.error, tone: "error" });
        return;
      }
      toast({ title: "Travail rendu", description: "Votre formateur pourra maintenant le corriger.", tone: "success" });
      setOpen(false);
      setResponse("");
      router.refresh();
    });
  };

  return open ? (
    <div className="mt-4 space-y-4 rounded-2xl border border-line bg-noir-soft/50 p-4">
      <form onSubmit={submit} className="space-y-3">
        <label htmlFor={`work-${workId}`} className="block text-sm font-medium text-blanc/75">
          Votre compte rendu ou réponse
        </label>
        <textarea
          id={`work-${workId}`}
          rows={4}
          maxLength={8000}
          value={response}
          onChange={(e) => setResponse(e.target.value)}
          placeholder="Décrivez la rencontre, ce que vous avez mis en pratique, vos questions…"
          className={input}
        />
        <div className="flex flex-wrap gap-2">
          <Button type="submit" size="sm" disabled={pending || !response.trim()}>
            {pending ? "Envoi…" : "Envoyer ma réponse"}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
            Fermer
          </Button>
        </div>
      </form>
      <div aria-hidden className="flex items-center gap-3 text-xs text-blanc/40">
        <span className="h-px flex-1 bg-line" /> ou déposez un fichier <span className="h-px flex-1 bg-line" />
      </div>
      <UploadField scope={kind} targetId={workId} />
    </div>
  ) : (
    <Button type="button" size="sm" variant="outline" className="mt-4" onClick={() => setOpen(true)}>
      <PenLine aria-hidden className="mr-1.5 size-4" /> Répondre à ce travail
    </Button>
  );
}
