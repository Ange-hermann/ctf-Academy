import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminIntro, AdminSection, AdminTable, StatusBadge } from "@/components/admin/ui";
import { RemoveStudentButton } from "@/components/admin/controls";
import { adminRoutes } from "@/config/admin-nav";
import { requireAdminRoles } from "@/lib/admin/session";
import { getClassStudentDetail } from "@/lib/admin/queries";

const kindLabels: Record<string, string> = { quiz: "Quiz", exercise: "Devoir", exam: "Examen" };

export default async function ClassStudentPage({ params }: PageProps<"/admin/ma-classe/[studentId]">) {
  const { studentId } = await params;
  const ctx = await requireAdminRoles(["admin", "pedagogy", "trainer", "pastor"], `${adminRoutes.classroom}/${studentId}`);
  const student = await getClassStudentDetail(ctx, studentId);
  if (!student) notFound();

  const progress = student.lessonsTotal ? Math.round((student.lessonsDone / student.lessonsTotal) * 100) : 0;

  return (
    <>
      <AdminIntro title={student.name} subtitle={`${student.formationName}${student.levelLabel ? ` · ${student.levelLabel}` : ""} — dossier ${student.reference} · ${student.email}${student.phone ? ` · ${student.phone}` : ""}`} />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link href={adminRoutes.classroom} className="text-sm text-or-light underline-offset-4 hover:underline">
          ← Retour à la classe
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`${adminRoutes.classroom}/messages`}
            className="min-h-10 rounded-xl border border-or/40 px-4 py-2.5 text-sm font-medium text-or-light transition-colors hover:bg-or/10"
          >
            Envoyer un message
          </Link>
          <RemoveStudentButton userId={student.userId} name={student.name.split(" ")[0]} />
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-or/25 bg-noir-card p-5 shadow-card">
          <p className="text-xs font-medium tracking-wide text-blanc/55 uppercase">Progression</p>
          <p className="font-display mt-2 text-2xl font-bold text-or-light">{progress} %</p>
          <p className="mt-1 text-xs text-blanc/50">
            {student.lessonsDone} / {student.lessonsTotal} leçons{student.levelLabel ? ` du ${student.levelLabel.toLowerCase()}` : ""}
          </p>
        </div>
        <div className="rounded-2xl border border-or/25 bg-noir-card p-5 shadow-card">
          <p className="text-xs font-medium tracking-wide text-blanc/55 uppercase">Moyenne</p>
          <p className="font-display mt-2 text-2xl font-bold text-or-light">{student.avgScore != null ? `${student.avgScore} %` : "—"}</p>
          <p className="mt-1 text-xs text-blanc/50">sur les copies corrigées</p>
        </div>
        <div className="rounded-2xl border border-or/25 bg-noir-card p-5 shadow-card">
          <p className="text-xs font-medium tracking-wide text-blanc/55 uppercase">Devoirs déposés</p>
          <p className="font-display mt-2 text-2xl font-bold text-or-light">{student.submissions.length}</p>
          <p className="mt-1 text-xs text-blanc/50">fichiers reçus</p>
        </div>
      </div>

      <div className="space-y-6">
        <AdminSection title={`Évaluations (${student.attempts.length})`}>
          {student.attempts.length ? (
            <AdminTable head={["Évaluation", "Type", "Statut", "Note", "Déposée le"]}>
              {student.attempts.map((a) => (
                <tr key={a.id}>
                  <td className="px-2 py-3 text-blanc">{a.quizTitle}</td>
                  <td className="px-2 py-3 text-blanc/70">{kindLabels[a.kind] ?? a.kind}</td>
                  <td className="px-2 py-3">
                    <StatusBadge status={a.status} />
                  </td>
                  <td className="px-2 py-3 text-blanc/70">{a.score != null && a.maxScore != null ? `${a.score} / ${a.maxScore}` : "—"}</td>
                  <td className="px-2 py-3 text-blanc/70">{a.submittedAt ? new Date(a.submittedAt).toLocaleDateString("fr-FR") : "—"}</td>
                </tr>
              ))}
            </AdminTable>
          ) : (
            <p className="text-sm text-blanc/50">Aucune évaluation passée.</p>
          )}
        </AdminSection>

        <AdminSection title={`Devoirs déposés (${student.submissions.length})`}>
          {student.submissions.length ? (
            <AdminTable head={["Évaluation", "Fichier", "Statut", "Reçu le"]}>
              {student.submissions.map((s) => (
                <tr key={s.id}>
                  <td className="px-2 py-3 text-blanc">{s.quizTitle}</td>
                  <td className="px-2 py-3 text-blanc/70">{s.fileName}</td>
                  <td className="px-2 py-3">
                    <StatusBadge status={s.status} />
                  </td>
                  <td className="px-2 py-3 text-blanc/70">{new Date(s.createdAt).toLocaleDateString("fr-FR")}</td>
                </tr>
              ))}
            </AdminTable>
          ) : (
            <p className="text-sm text-blanc/50">Aucun devoir déposé.</p>
          )}
        </AdminSection>
      </div>
    </>
  );
}
