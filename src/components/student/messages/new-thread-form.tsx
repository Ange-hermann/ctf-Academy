"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { createThreadAction } from "@/lib/student/actions/messages";
import type { ThreadCategory } from "@/lib/student/queries/messages";

/** Formulaire d'ouverture d'un fil : sujet + premier message, puis bascule sur `?fil=`. */
export function NewThreadForm({ category, baseHref }: { category: ThreadCategory; baseHref: string }) {
  const toast = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await createThreadAction({ category, subject: subject.trim(), body: body.trim() });
      if (!res.ok) {
        toast({ title: "Envoi impossible", description: res.error, tone: "error" });
        return;
      }
      setOpen(false);
      setSubject("");
      setBody("");
      router.push(`${baseHref}?fil=${res.data?.id}`);
      router.refresh();
    });
  };

  const input =
    "w-full rounded-xl border border-or/15 bg-noir-soft px-3 py-2.5 text-sm text-blanc outline-none transition-colors placeholder:text-blanc/35 focus:border-or";

  return (
    <div>
      {open ? (
        <form onSubmit={submit} className="mt-4 space-y-3 rounded-2xl border border-line bg-noir-soft/50 p-4">
          <div>
            <label htmlFor="nt-subject" className="mb-1 block text-sm font-medium text-blanc/75">
              Sujet
            </label>
            <input
              id="nt-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={140}
              required
              placeholder="Objet de votre demande"
              className={input}
            />
          </div>
          <div>
            <label htmlFor="nt-body" className="mb-1 block text-sm font-medium text-blanc/75">
              Message
            </label>
            <textarea
              id="nt-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              maxLength={4000}
              required
              placeholder="Décrivez votre question…"
              className={input}
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Envoi…" : "Envoyer"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
              Annuler
            </Button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-or/40 px-4 text-sm font-semibold text-or-light transition-colors hover:bg-or/10"
        >
          <PenLine aria-hidden className="size-4" /> Nouveau message
        </button>
      )}
    </div>
  );
}
