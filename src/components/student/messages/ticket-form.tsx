"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { createTicketAction } from "@/lib/student/actions/messages";

const categories = [
  { value: "technique", label: "Problème technique" },
  { value: "cours", label: "Question sur un cours" },
  { value: "paiement", label: "Paiement" },
  { value: "autre", label: "Autre demande" },
] as const;

/** Nouvelle demande d'assistance : catégorie, sujet et description → ticket de suivi. */
export function TicketForm() {
  const toast = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<(typeof categories)[number]["value"]>("technique");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [pending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await createTicketAction({ category, subject: subject.trim(), description: description.trim() });
      if (!res.ok) {
        toast({ title: "Envoi impossible", description: res.error, tone: "error" });
        return;
      }
      toast({ title: "Demande envoyée", description: "L'équipe vous répondra dans cet espace.", tone: "success" });
      setOpen(false);
      setSubject("");
      setDescription("");
      router.refresh();
    });
  };

  const input =
    "w-full rounded-xl border border-or/15 bg-noir-soft px-3 py-2.5 text-sm text-blanc outline-none transition-colors placeholder:text-blanc/35 focus:border-or";

  return open ? (
    <form onSubmit={submit} className="mt-4 space-y-3 rounded-2xl border border-line bg-noir-soft/50 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="tk-category" className="mb-1 block text-sm font-medium text-blanc/75">
            Catégorie
          </label>
          <select id="tk-category" value={category} onChange={(e) => setCategory(e.target.value as typeof category)} className={input}>
            {categories.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="tk-subject" className="mb-1 block text-sm font-medium text-blanc/75">
            Sujet
          </label>
          <input
            id="tk-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            maxLength={140}
            required
            placeholder="En quelques mots"
            className={input}
          />
        </div>
      </div>
      <div>
        <label htmlFor="tk-description" className="mb-1 block text-sm font-medium text-blanc/75">
          Description
        </label>
        <textarea
          id="tk-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          maxLength={4000}
          required
          placeholder="Décrivez le problème rencontré…"
          className={input}
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Envoi…" : "Envoyer la demande"}
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
      <PenLine aria-hidden className="size-4" /> Nouvelle demande
    </button>
  );
}
