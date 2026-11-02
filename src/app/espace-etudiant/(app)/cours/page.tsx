import { CourseFilters, NoModules, type CourseFilter } from "@/components/student/courses/courses-grid";
import { ModuleCard } from "@/components/student/courses/module-card";
import { StudentPageHeader } from "@/components/student/ui/page-header";
import { studentRoutes } from "@/config/student-nav";
import { getCourses } from "@/lib/student/queries/courses";
import type { ModuleSummary } from "@/lib/student/queries/learning";
import { requireStudent } from "@/lib/student/session";

export const metadata = { title: "Mes cours" };

const matches: Record<CourseFilter, (m: ModuleSummary) => boolean> = {
  tous: () => true,
  "en-cours": (m) => m.status === "in_progress",
  termines: (m) => m.status === "done",
  "a-venir": (m) => m.status === "todo" || m.status === "locked",
};

export default async function CoursesPage({ searchParams }: PageProps<"/espace-etudiant/cours">) {
  const ctx = await requireStudent(studentRoutes.courses);
  const [learning, params] = await Promise.all([getCourses(ctx), searchParams]);
  const raw = typeof params.filtre === "string" ? params.filtre : "tous";
  const filter: CourseFilter = raw in matches ? (raw as CourseFilter) : "tous";
  const counts = Object.fromEntries(Object.entries(matches).map(([k, fn]) => [k, learning.modules.filter(fn).length])) as Record<CourseFilter, number>;
  const modules = learning.modules.filter(matches[filter]);

  // Groupement par niveau / étape pour garder le fil du parcours.
  const groups = learning.levels
    .map((l) => ({ level: l, modules: modules.filter((m) => m.levelId === l.id) }))
    .filter((g) => g.modules.length);
  const orphans = modules.filter((m) => !m.levelId);

  return (
    <>
      <StudentPageHeader
        title="Mes cours"
        eyebrow={`${learning.completedLessons} / ${learning.totalLessons} leçons terminées`}
        description="Vos modules, leçons, vidéos, supports PDF et séances Zoom, au rythme de votre parcours."
        crumbs={[{ label: "Mes cours", href: studentRoutes.courses }]}
        actions={<CourseFilters current={filter} counts={counts} />}
      />
      {modules.length === 0 ? (
        <NoModules filter={filter} />
      ) : (
        <div className="space-y-10">
          {groups.map(({ level, modules: mods }) => (
            <section key={level.id} aria-labelledby={`level-${level.id}`}>
              <h2 id={`level-${level.id}`} className="mb-4 flex items-baseline gap-3 text-xl tracking-wide text-blanc">
                {level.title}
                <span className="font-sans text-sm text-blanc/50">{level.status === "locked" ? "Verrouillé" : `${level.percent} %`}</span>
              </h2>
              <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {mods.map((m, i) => (
                  <li key={m.id} className="cascade" style={{ "--i": i } as React.CSSProperties}>
                    <ModuleCard module={m} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
          {orphans.length > 0 && (
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {orphans.map((m) => (
                <li key={m.id}>
                  <ModuleCard module={m} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </>
  );
}
