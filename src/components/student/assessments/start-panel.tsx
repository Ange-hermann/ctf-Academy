"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Play, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { startAttemptAction } from "@/lib/student/actions/assessments";

/** Écran de démarrage : l'étudiant confirme, la tentative est créée côté serveur, puis la page se recharge. */
export function StartPanel({ quizId }: { quizId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, setPending] = useState(false);

  const start = async () => {
    setPending(true);
    const r = await startAttemptAction({ quizId });
    setPending(false);
    if (!r.ok) {
      toast({ tone: "error", title: "Impossible de commencer", description: r.error });
      return;
    }
    router.refresh();
  };

  return (
    <Button size="lg" onClick={() => void start()} disabled={pending}>
      {pending ? <Loader2 className="animate-spin" /> : <Play />} Commencer maintenant
    </Button>
  );
}

/** Rappel d'intégrité affiché avant le démarrage. */
export function IntegrityNote({ durationMinutes }: { durationMinutes: number | null }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-warning/25 bg-warning/5 p-4 text-sm text-blanc/70">
      <ShieldAlert aria-hidden className="mt-0.5 size-5 shrink-0 text-warning-light" />
      <p>
        Vos réponses sont enregistrées au fur et à mesure : vous pouvez quitter et reprendre.
        {durationMinutes ? ` Le minuteur de ${durationMinutes} min démarre dès le début et envoie votre copie à zéro.` : ""}{" "}
        Quitter l&apos;onglet pendant l&apos;épreuve est comptabilisé.
      </p>
    </div>
  );
}
