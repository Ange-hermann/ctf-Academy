import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CheckCircle2, CircleDashed, Clock, FileText, Lock, PlayCircle, Target, Video } from "lucide-react";
import { ModuleCover, moduleStatusLabels } from "@/components/student/courses/module-card";
import { LiveSessionCard } from "@/components/student/courses/live-session-card";
import { ResourceList } from "@/components/student/courses/resource-list";
import { ProgressRing } from "@/components/student/ui/progress-ring";
import { StudentPageHeader } from "@/components/student/ui/page-header";
import { Button } from "@/components/ui/button";
import { ExampleBadge, KeyWordPill, ObjectivePill } from "@/components/ui/badge";
import { lessonHref, moduleHref, studentRoutes } from "@/config/student-nav";
import { getObjective } from "@/content/identity";
import { formatMinutes } from "@/lib/student/format";
import { lessonKindLabels } from "@/lib/student/labels";
import { getModuleDetail } from "@/lib/student/queries/courses";
import { requireStudent } from "@/lib/student/session";
import { cn } from "@/lib/utils";

export default async function ModulePage({ params }: PageProps<"/espace-etudiant/cours/[moduleSlug]">) {
  const { moduleSlug } = await params;
  const ctx = await requireStudent(moduleHref(moduleSlug));
  const detail = await getModuleDetail(ctx, moduleSlug);
  if (!detail) notFound();
  const { module, resources, lives } = detail;
  const locked = module.status === "locked";
  const next = module.lessons.find((l) => l.state === "in_progress") ?? module.lessons.find((l) => l.state === "todo") ?? module.lessons[0];

  return (
    <>
      <StudentPageHeader
        title={module.title}
        eyebrow={module.levelTitle ?? "Module"}
        crumbs={[
          { label: "Mes cours", href: studentRoutes.courses },
          { label: module.title, href: moduleHref(module.slug) },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <section className="overflow-hidden rounded-3xl border border-line bg-gradient-card">
            <ModuleCover module={module} className="h-36 sm:h-44" />
            <div className="space-y-5 p-6">
              <div className="flex flex-wrap items-center gap-2">
                {module.keyWords.map((k) => (
                  <KeyWordPill key={k} slug={k} />
                ))}
                {module.objectiveNumbers.map((n) => (
                  <ObjectivePill key={n} objective={getObjective(n)} />
                ))}
                {module.isExample && <ExampleBadge />}
              </div>
              <p className="text-blanc/75">{module.description}</p>
              {module.objectives.length > 0 && (
                <div>
                  <h2 className="flex items-center gap-2 font-sans text-sm font-semibold tracking-[0.18em] text-or-light uppercase">
                    <Target aria-hidden className="size-4" /> Objectifs
                  </h2>
                  <ul className="mt-3 space-y-2">
                    {module.objectives.map((o) => (
                      <li key={o} className="flex gap-3 text-blanc/75">
                        <CheckCircle2 aria-hidden className="mt-0.5 size-5 shrink-0 text-or" /> {o}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>

          <section aria-labelledby="lessons-title" className="rounded-3xl border border-line bg-gradient-card p-6">
            <h2 id="lessons-title" className="font-sans text-sm font-semibold tracking-[0.18em] text-or-light uppercase">
              Leçons ({module.completed}/{module.total})
            </h2>
            <ol className="mt-4 space-y-2">
              {module.lessons.map((l, i) => {
                const Icon = l.state === "done" ? CheckCircle2 : locked ? Lock : l.state === "in_progress" ? CircleDashed : l.kind === "video" ? PlayCircle : l.kind === "live" ? Video : FileText;
                const content = (
                  <>
                    <span className={cn("grid size-10 shrink-0 place-items-center rounded-full border", l.state === "done" ? "border-or bg-gradient-or text-noir" : l.state === "in_progress" ? "border-warning/50 text-warning-light" : "border-line text-blanc/50")}>
                      <Icon aria-hidden className="size-4.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium text-blanc">
                        {i + 1}. {l.title}
                      </span>
                      <span className="block text-sm text-blanc/50">
                        {lessonKindLabels[l.kind]} · {formatMinutes(l.durationMinutes)}
                        {l.state === "in_progress" && ` · ${l.progressPercent} %`}
                      </span>
                    </span>
                    <span className={cn("text-sm", l.state === "done" ? "text-success-light" : l.state === "in_progress" ? "text-warning-light" : "text-blanc/45")}>
                      {locked ? "Verrouillée" : l.state === "done" ? "Terminée" : l.state === "in_progress" ? "En cours" : "À faire"}
                    </span>
                  </>
                );
                return (
                  <li key={l.id}>
                    {locked ? (
                      <div className="flex items-center gap-4 rounded-2xl border border-line p-3 opacity-60">{content}</div>
                    ) : (
                      <Link href={lessonHref(module.slug, l.slug)} className="flex items-center gap-4 rounded-2xl border border-line p-3 transition-colors hover:border-or/40 hover:bg-or/5">
                        {content}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>

          <section aria-labelledby="resources-title" className="rounded-3xl border border-line bg-gradient-card p-6">
            <h2 id="resources-title" className="mb-4 font-sans text-sm font-semibold tracking-[0.18em] text-or-light uppercase">
              Ressources du module
            </h2>
            <ResourceList resources={resources} />
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="flex items-center gap-4 rounded-3xl border border-line bg-gradient-card p-5">
            <ProgressRing value={module.percent} size={72} stroke={6}>
              <span className="font-display text-lg text-blanc tabular">{module.percent}%</span>
            </ProgressRing>
            <div>
              <p className="font-semibold text-blanc">{moduleStatusLabels[module.status]}</p>
              <p className="flex items-center gap-1.5 text-sm text-blanc/55">
                <Clock aria-hidden className="size-4 text-or" /> {formatMinutes(module.durationMinutes)} au total
              </p>
            </div>
          </div>
          {locked ? (
            <p className="rounded-2xl border border-line p-4 text-sm text-blanc/60">Ce module s&apos;ouvrira après la validation du niveau précédent.</p>
          ) : (
            next && (
              <Button asChild size="lg" className="w-full">
                <Link href={lessonHref(module.slug, next.slug)}>
                  {module.status === "done" ? "Revoir la première leçon" : module.status === "todo" ? "Commencer le module" : "Reprendre"} <ArrowRight />
                </Link>
              </Button>
            )
          )}
          {lives.length > 0 && (
            <div className="space-y-3">
              <h2 className="font-sans text-sm font-semibold tracking-[0.18em] text-or-light uppercase">Séances Zoom liées</h2>
              {lives.map((l) => (
                <LiveSessionCard key={l.id} live={l} tz={ctx.timezone} />
              ))}
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
