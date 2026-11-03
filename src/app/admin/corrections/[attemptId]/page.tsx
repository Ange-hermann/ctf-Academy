import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { AdminIntro, AdminSection } from "@/components/admin/ui";
import { GradeForm } from "@/components/admin/controls";
import { adminRoutes } from "@/config/admin-nav";
import { requireAdminRoles } from "@/lib/admin/session";
import { getAttemptReview } from "@/lib/admin/queries";
import { cn } from "@/lib/utils";

const kindLabels: Record<string, string> = {
  single: "Choix unique",
  multiple: "Choix multiples",
  true_false: "Vrai ou faux",
  short: "Réponse courte",
  long: "Rédaction",
  file: "Fichier",
  match: "Association",
};

const renderValue = (v: unknown): string => {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "string") return v;
  if (typeof v === "boolean") return v ? "Vrai" : "Faux";
  if (Array.isArray(v)) return v.join(", ");
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
};

export default async function CorrectionDetailPage({ params }: PageProps<"/admin/corrections/[attemptId]">) {
  const ctx = await requireAdminRoles(["admin", "trainer", "pedagogy", "pastor"], adminRoutes.corrections);
  const { attemptId } = await params;
  const a = await getAttemptReview(ctx, attemptId);
  if (!a) notFound();

  return (
    <>
      <Link href={adminRoutes.corrections} className="mb-4 inline-flex items-center gap-1 text-sm text-or-light hover:text-or">
        <ChevronLeft aria-hidden className="size-4" /> Corrections
      </Link>
      <AdminIntro title={a.quizTitle} subtitle={`Copie de ${a.studentName} · seuil de réussite : ${a.passScore} % · barème : ${a.maxScore} pts`} />

      <div className="grid gap-5 xl:grid-cols-[1fr_22rem]">
        <AdminSection title="Réponses de l'étudiant">
          <ol className="space-y-4">
            {a.answers.map((ans, i) => (
              <li key={ans.questionId} className="rounded-xl border border-line p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium text-blanc">
                    {i + 1}. {ans.prompt}
                  </p>
                  <span className="shrink-0 text-xs text-blanc/45">{kindLabels[ans.kind] ?? ans.kind} · {ans.points} pt{ans.points > 1 ? "s" : ""}</span>
                </div>
                <p className="mt-2 rounded-lg bg-noir-soft px-3 py-2 text-sm whitespace-pre-line text-blanc/80">{renderValue(ans.value)}</p>
                {ans.awarded != null && (
                  <p className={cn("mt-2 text-xs font-medium", ans.isCorrect ? "text-or-light" : "text-blanc/50")}>
                    Correction automatique : {ans.awarded} / {ans.points} pt{ans.points > 1 ? "s" : ""} — {ans.isCorrect ? "juste" : "faux"}
                  </p>
                )}
                {ans.isCorrect === null && <p className="mt-2 text-xs text-blanc/45">À corriger manuellement</p>}
                {ans.fileName && <p className="mt-2 text-xs text-or-light">Pièce jointe déposée : {ans.fileName} (accessible via l&rsquo;espace étudiant)</p>}
              </li>
            ))}
          </ol>
        </AdminSection>

        <AdminSection title="Notation">
          <GradeForm attemptId={a.id} maxScore={a.maxScore} suggestedScore={a.autoScore} />
          <p className="mt-3 text-xs text-blanc/45">La note est publiée dans l&rsquo;espace étudiant avec votre retour, et une notification est envoyée.</p>
        </AdminSection>
      </div>
    </>
  );
}
