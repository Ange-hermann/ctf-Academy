import Link from "next/link";
import { AdminIntro, AdminSection, AdminTable, StatusBadge } from "@/components/admin/ui";
import { AssessmentForm, DeleteAssessmentButton, LessonForm, ResourceForm } from "@/components/admin/controls";
import { adminRoutes } from "@/config/admin-nav";
import { requireAdminRoles } from "@/lib/admin/session";
import { getClassAssessments, getClassFormations, getClassModules, getClassRoster } from "@/lib/admin/queries";

const kindLabels: Record<string, string> = { quiz: "Quiz", exercise: "Devoir", exam: "Examen" };

export default async function MaClassePage() {
  const ctx = await requireAdminRoles(["admin", "pedagogy", "trainer", "pastor"], adminRoutes.classroom);
  const [roster, assessments, modules, formations] = await Promise.all([
    getClassRoster(ctx),
    getClassAssessments(ctx),
    getClassModules(ctx),
    getClassFormations(ctx),
  ]);

  return (
    <>
      <AdminIntro
        title={formations.length === 1 && formations[0].levelId ? `Ma classe — ${formations[0].label}` : "Ma classe"}
        subtitle="Vos étudiants, vos contenus et vos évaluations. Un formateur gère une seule classe (formation et niveau), attribuée dans Accès & rôles."
      />

      <div className="mb-6">
        <Link
          href={`${adminRoutes.classroom}/messages`}
          className="inline-flex min-h-10 items-center rounded-xl border border-or/40 px-4 text-sm font-medium text-or-light transition-colors hover:bg-or/10"
        >
          Messagerie de la classe
        </Link>
      </div>

      {formations.length === 0 ? (
        <section className="rounded-2xl border border-or/25 bg-noir-card p-6 shadow-card">
          <h2 className="font-display text-base font-semibold text-blanc">Aucune classe attribuée</h2>
          <p className="mt-2 max-w-2xl text-sm text-blanc/55">
            Vous n&rsquo;êtes responsable d&rsquo;aucune classe pour le moment. Demandez à l&rsquo;administrateur de vous affecter une classe dans la
            section « Accès &amp; rôles ».
          </p>
        </section>
      ) : (
        <div className="space-y-6">
          <AdminSection title={`Étudiants admis (${roster.length})`}>
            {roster.length ? (
              <AdminTable head={["Étudiant", "Formation", "Leçons terminées", "Moyenne", "Copies à corriger"]}>
                {roster.map((s) => (
                  <tr key={s.userId}>
                    <td className="px-2 py-3">
                      <Link href={`${adminRoutes.classroom}/${s.userId}`} className="font-medium text-blanc underline-offset-4 hover:text-or-light hover:underline">
                        {s.name}
                      </Link>
                      <p className="text-xs text-blanc/50">{s.email}</p>
                    </td>
                    <td className="px-2 py-3 text-blanc/70">
                      {s.formationSlug.toUpperCase()}
                      {s.levelLabel && <span className="text-blanc/45"> · {s.levelLabel}</span>}
                    </td>
                    <td className="px-2 py-3 text-blanc/70">
                      {s.lessonsDone} / {s.lessonsTotal}
                    </td>
                    <td className="px-2 py-3 text-blanc/70">{s.avgScore != null ? `${s.avgScore} %` : "—"}</td>
                    <td className="px-2 py-3">
                      {s.pendingCopies > 0 ? <StatusBadge status="pending" /> : <span className="text-blanc/40">—</span>}
                      {s.pendingCopies > 0 && <span className="ml-2 text-xs text-or-light">{s.pendingCopies}</span>}
                    </td>
                  </tr>
                ))}
              </AdminTable>
            ) : (
              <p className="text-sm text-blanc/50">Aucun étudiant admis dans vos classes pour le moment.</p>
            )}
          </AdminSection>

          <AdminSection title={`Évaluations — quiz, devoirs, examens (${assessments.length})`}>
            {assessments.length ? (
              <AdminTable head={["Titre", "Type", "Module", "Échéance", "Questions", "Tentatives", "À corriger", ""]}>
                {assessments.map((a) => (
                  <tr key={a.id}>
                    <td className="px-2 py-3">
                      <p className="font-medium text-blanc">{a.title}</p>
                      <p className="text-xs text-blanc/50">{a.formationSlug.toUpperCase()}</p>
                    </td>
                    <td className="px-2 py-3 text-blanc/70">{kindLabels[a.kind] ?? a.kind}</td>
                    <td className="px-2 py-3 text-blanc/70">{a.moduleTitle ?? "—"}</td>
                    <td className="px-2 py-3 text-blanc/70">{a.dueAt ? new Date(a.dueAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : "—"}</td>
                    <td className="px-2 py-3 text-blanc/70">{a.questionsCount}</td>
                    <td className="px-2 py-3 text-blanc/70">{a.attemptsTotal}</td>
                    <td className="px-2 py-3 text-or-light">{a.pendingCopies || "—"}</td>
                    <td className="px-2 py-3">{a.attemptsTotal === 0 && <DeleteAssessmentButton quizId={a.id} title={a.title} />}</td>
                  </tr>
                ))}
              </AdminTable>
            ) : (
              <p className="text-sm text-blanc/50">Aucune évaluation créée. Utilisez le formulaire ci-dessous.</p>
            )}
          </AdminSection>

          <AdminSection title="Créer une évaluation">
            <AssessmentForm formations={formations} modules={modules} />
          </AdminSection>

          <div className="grid gap-6 lg:grid-cols-2">
            <AdminSection title="Ajouter une leçon (vidéo, audio, PDF, texte)">
              <LessonForm modules={modules} />
            </AdminSection>
            <AdminSection title="Ajouter une ressource (fichier ou lien)">
              <ResourceForm modules={modules} />
            </AdminSection>
          </div>
        </div>
      )}
    </>
  );
}
