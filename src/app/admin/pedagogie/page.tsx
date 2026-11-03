import { AdminIntro, AdminSection, AdminTable } from "@/components/admin/ui";
import { AnnouncementForm, CalendarEventForm, DeleteScheduleButton, LiveSessionForm, ModuleForm } from "@/components/admin/controls";
import { adminRoutes } from "@/config/admin-nav";
import { hasAdminRole, requireAdminRoles } from "@/lib/admin/session";
import { getClassFormations, getClassModules, getClassSchedule, getPedagogyOverview, getProgramLevels } from "@/lib/admin/queries";

const fmt = (iso: string) => new Date(iso).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export default async function PedagogiePage() {
  const ctx = await requireAdminRoles(["admin", "pedagogy", "trainer", "pastor"], adminRoutes.pedagogy);
  const canProgram = hasAdminRole(ctx, ["admin", "pedagogy"]);
  const [rows, formations, modules, schedule, levels] = await Promise.all([
    getPedagogyOverview(ctx),
    getClassFormations(ctx),
    getClassModules(ctx),
    getClassSchedule(ctx),
    getProgramLevels(ctx),
  ]);

  return (
    <>
      <AdminIntro
        title="Pédagogie"
        subtitle="Programmes, calendrier et annonces de vos classes — chaque élément créé ici apparaît immédiatement dans l'espace des étudiants."
      />

      <section className="rounded-2xl border border-or/25 bg-noir-card p-5 shadow-card">
        {rows.length ? (
          <AdminTable head={["Formation", "Niveaux", "Modules", "Leçons", "Évaluations", "Étudiants admis", "Copies en attente"]}>
            {rows.map((f) => (
              <tr key={f.slug}>
                <td className="px-2 py-3">
                  <p className="font-medium text-blanc">{f.slug.toUpperCase()}</p>
                  <p className="max-w-64 truncate text-xs text-blanc/50">{f.name}</p>
                </td>
                <td className="px-2 py-3 text-blanc/70">{f.levels}</td>
                <td className="px-2 py-3 text-blanc/70">{f.modules}</td>
                <td className="px-2 py-3 text-blanc/70">{f.lessons}</td>
                <td className="px-2 py-3 text-blanc/70">{f.quizzes}</td>
                <td className="px-2 py-3 text-blanc/70">{f.students}</td>
                <td className="px-2 py-3 text-or-light">{f.submittedAttempts}</td>
              </tr>
            ))}
          </AdminTable>
        ) : (
          <p className="text-sm text-blanc/50">Aucune formation dans votre périmètre.</p>
        )}
      </section>

      {formations.length > 0 && (
        <div className="mt-6 space-y-6">
          {canProgram && (
            <AdminSection title="Créer un module">
              <ModuleForm formations={formations} levels={levels} />
            </AdminSection>
          )}

          <AdminSection title={`Cours en direct (${schedule.sessions.length})`}>
            {schedule.sessions.length > 0 && (
              <AdminTable head={["Séance", "Classe", "Module", "Date", "Lien", ""]}>
                {schedule.sessions.map((s) => (
                  <tr key={s.id}>
                    <td className="px-2 py-3 font-medium text-blanc">{s.title}</td>
                    <td className="px-2 py-3 text-blanc/70">{s.formationSlug.toUpperCase()}</td>
                    <td className="px-2 py-3 text-blanc/70">{s.moduleTitle ?? "—"}</td>
                    <td className="px-2 py-3 text-blanc/70">{fmt(s.startsAt)}</td>
                    <td className="px-2 py-3 text-blanc/70">{s.zoomUrl ? "Réunion en ligne" : "—"}</td>
                    <td className="px-2 py-3"><DeleteScheduleButton kind="session" id={s.id} /></td>
                  </tr>
                ))}
              </AdminTable>
            )}
            <div className={schedule.sessions.length ? "mt-4 border-t border-line/60 pt-4" : ""}>
              <LiveSessionForm formations={formations} modules={modules} />
            </div>
          </AdminSection>

          <AdminSection title={`Événements du calendrier (${schedule.events.length})`}>
            {schedule.events.length > 0 && (
              <AdminTable head={["Événement", "Classe", "Début", "Fin", ""]}>
                {schedule.events.map((e) => (
                  <tr key={e.id}>
                    <td className="px-2 py-3 font-medium text-blanc">{e.title}</td>
                    <td className="px-2 py-3 text-blanc/70">{e.formationSlug.toUpperCase() || "—"}</td>
                    <td className="px-2 py-3 text-blanc/70">{fmt(e.startsAt)}</td>
                    <td className="px-2 py-3 text-blanc/70">{e.endsAt ? fmt(e.endsAt) : "—"}</td>
                    <td className="px-2 py-3"><DeleteScheduleButton kind="event" id={e.id} /></td>
                  </tr>
                ))}
              </AdminTable>
            )}
            <div className={schedule.events.length ? "mt-4 border-t border-line/60 pt-4" : ""}>
              <CalendarEventForm formations={formations} />
            </div>
          </AdminSection>

          <AdminSection title={`Annonces de la classe (${schedule.announcements.length})`}>
            {schedule.announcements.length > 0 && (
              <ul className="divide-y divide-line/60">
                {schedule.announcements.map((a) => (
                  <li key={a.id} className="flex items-start justify-between gap-4 py-3">
                    <div className="min-w-0">
                      <p className="font-medium text-blanc">
                        {a.pinned && <span className="mr-2 text-or-light">★</span>}
                        {a.title}
                        {a.formationSlug && <span className="ml-2 text-xs font-normal text-blanc/50">{a.formationSlug.toUpperCase()}</span>}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-blanc/50">{a.body}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="text-xs text-blanc/40">{new Date(a.publishedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span>
                      <DeleteScheduleButton kind="announcement" id={a.id} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className={schedule.announcements.length ? "mt-4 border-t border-line/60 pt-4" : ""}>
              <AnnouncementForm formations={formations} />
            </div>
          </AdminSection>
        </div>
      )}
    </>
  );
}
