"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FilePlus2 } from "lucide-react";
import { UploadField } from "@/components/student/formation/upload-field";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { submitReportAction } from "@/lib/student/actions/formation";

const input =
  "w-full rounded-xl border border-or/15 bg-noir-soft px-3 py-2.5 text-sm text-blanc outline-none transition-colors placeholder:text-blanc/35 focus:border-or";

/** Nouvelle version du rapport de stage : rédigée en ligne ou déposée en fichier — chaque envoi crée une version. */
export function ReportForm({ internshipId }: { internshipId: string }) {
  const toast = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await submitReportAction({ internshipId, body: body.trim() });
      if (!res.ok) {
        toast({ title: "Envoi impossible", description: res.error, tone: "error" });
        return;
      }
      toast({ title: "Rapport déposé", description: `La version ${res.data?.version ?? ""} attend la relecture de votre référent.`, tone: "success" });
      setOpen(false);
      setBody("");
      router.refresh();
    });
  };

  return open ? (
    <div className="space-y-4 rounded-2xl border border-line bg-noir-soft/50 p-4">
      <form onSubmit={submit} className="space-y-3">
        <label htmlFor="report-body" className="block text-sm font-medium text-blanc/75">
          Rédiger le rapport en ligne
        </label>
        <textarea
          id="report-body"
          rows={8}
          maxLength={50_000}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Activités menées, compétences développées, difficultés rencontrées, suite envisagée…"
          className={input}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" size="sm" disabled={pending || body.trim().length < 200}>
            {pending ? "Envoi…" : "Déposer cette version"}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
            Fermer
          </Button>
          <span className="text-xs text-blanc/45">200 caractères minimum</span>
        </div>
      </form>
      <div aria-hidden className="flex items-center gap-3 text-xs text-blanc/40">
        <span className="h-px flex-1 bg-line" /> ou déposez le fichier du rapport <span className="h-px flex-1 bg-line" />
      </div>
      <UploadField scope="rapport" targetId={internshipId} label="Déposez le fichier du rapport ici ou cliquez pour choisir" />
    </div>
  ) : (
    <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
      <FilePlus2 aria-hidden className="mr-1.5 size-4" /> Déposer une nouvelle version
    </Button>
  );
}
