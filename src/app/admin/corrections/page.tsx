import Link from "next/link";
import { AdminIntro, AdminTable } from "@/components/admin/ui";
import { adminRoutes } from "@/config/admin-nav";
import { requireAdminRoles } from "@/lib/admin/session";
import { getCorrectionsQueue } from "@/lib/admin/queries";
import { formatShortDate } from "@/lib/student/format";

const kindLabels: Record<string, string> = { quiz: "Quiz", exam: "Examen", exercise: "Exercice" };

export default async function CorrectionsPage() {
  const ctx = await requireAdminRoles(["admin", "trainer", "pedagogy", "pastor"], adminRoutes.corrections);
  const rows = await getCorrectionsQueue(ctx);

  return (
    <>
      <AdminIntro title="Corrections" subtitle="Copies déposées en attente de note et de retour. Les QCM se corrigent automatiquement ; cette file concerne les réponses ouvertes et les fichiers." />

      <section className="rounded-2xl border border-or/25 bg-noir-card p-5 shadow-card">
        {rows.length ? (
          <AdminTable head={["Étudiant", "Évaluation", "Type", "Réponses", "Déposée le", ""]}>
            {rows.map((c) => (
              <tr key={c.id}>
                <td className="px-2 py-3 text-blanc">{c.studentName}</td>
                <td className="px-2 py-3 text-blanc/80">{c.quizTitle}</td>
                <td className="px-2 py-3 text-blanc/70">{kindLabels[c.kind] ?? c.kind}</td>
                <td className="px-2 py-3 text-blanc/70">{c.openAnswerCount}</td>
                <td className="px-2 py-3 whitespace-nowrap text-blanc/60">{c.submittedAt ? formatShortDate(c.submittedAt, "UTC") : "—"}</td>
                <td className="px-2 py-3 text-right">
                  <Link href={`${adminRoutes.corrections}/${c.id}`} className="text-sm text-or-light hover:text-or">
                    Corriger
                  </Link>
                </td>
              </tr>
            ))}
          </AdminTable>
        ) : (
          <p className="text-sm text-blanc/50">Aucune copie en attente de correction.</p>
        )}
      </section>
    </>
  );
}
