import Link from "next/link";
import { BookOpenCheck, ClipboardCheck, History, Layers, Medal } from "lucide-react";
import { levelStatusLabels } from "@/lib/student/labels";
import { ProgressRing } from "@/components/student/ui/progress-ring";
import { CountUp } from "@/components/student/ui/count-up";
import { EmptyState } from "@/components/student/ui/empty-state";
import { StudentPageHeader } from "@/components/student/ui/page-header";
import { Badge, ExampleBadge, KeyWordPill } from "@/components/ui/badge";
import { getKeyWord, tintStyle } from "@/content/identity";
import { moduleHref, studentRoutes } from "@/config/student-nav";
import { formatDate, formatDateTime } from "@/lib/student/format";
import { percent } from "@/lib/student/queries/learning";
import { getProgressDetail } from "@/lib/student/queries/progress";
import { requireStudent } from "@/lib/student/session";
import { cn } from "@/lib/utils";

export const metadata = { title: "Ma progression" };

const levelBadgeTone = { validated: "success", pending_decision: "warning", current: "gold", upcoming: "neutral", locked: "neutral" } as const;

export default async function ProgressPage() {
  const ctx = await requireStudent(studentRoutes.progress);
  const { learning, activity, grades, compass } = await getProgressDetail(ctx);
  const stats = [
    { icon: BookOpenCheck, label: "Leçons terminées", value: learning.completedLessons, total: learning.totalLessons },
    { icon: Layers, label: "Étapes validées", value: learning.levels.filter((l) => l.status === "validated").length, total: learning.levels.length },
    { icon: ClipboardCheck, label: "Notes reçues", value: grades.length, total: null },
  ];

  return (
    <>
      <StudentPageHeader
        title="Ma progression"
        description="Votre avancement dans le parcours, vos notes et votre activité récente."
        crumbs={[{ label: "Ma progression", href: studentRoutes.progress }]}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="space-y-6">
          {/* Vue d'ensemble */}
          <section aria-labelledby="overview" className="flex flex-col items-center gap-6 rounded-3xl border border-line bg-gradient-card p-6 sm:flex-row">
            <ProgressRing value={learning.percent} size={140} stroke={10}>
              <span className="font-display text-4xl text-gradient-or tabular">
                <CountUp value={learning.percent} suffix="%" />
              </span>
            </ProgressRing>
            <div className="w-full flex-1">
              <h2 id="overview" className="text-2xl tracking-wide text-blanc">
                {learning.percent} % du parcours
              </h2>
              <ul className="mt-4 space-y-2.5">
                {stats.map((s) => (
                  <li key={s.label} className="flex items-center gap-2.5 text-sm">
                    <s.icon aria-hidden className="size-4.5 text-or" />
                    <span className="flex-1 text-blanc/70">{s.label}</span>
                    <span className="font-semibold text-blanc tabular">
                      {s.value}
                      {s.total !== null && ` / ${s.total}`}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Mots clés travaillés */}
          <section aria-labelledby="kw-title" className="rounded-3xl border border-line bg-gradient-card p-6">
            <h2 id="kw-title" className="font-sans text-sm font-semibold tracking-[0.18em] text-or-light uppercase">
              Les 5 mots clés dans mes modules
            </h2>
            {compass.length === 0 ? (
              <p className="mt-3 text-sm text-blanc/55">Vos modules seront reliés aux mots clés de la Vision au fil du parcours.</p>
            ) : (
              <ul className="mt-4 space-y-4">
                {compass.map(({ slug, done, total }) => {
                  const kw = getKeyWord(slug);
                  const pct = percent(done, total);
                  return (
                    <li key={slug} style={tintStyle(kw)}>
                      <div className="flex items-center justify-between gap-3">
                        <KeyWordPill slug={slug} />
                        <span className="text-sm text-blanc/55 tabular">
                          {done}/{total} leçons · {pct} %
                        </span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-blanc/8" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${kw.label} : ${pct} %`}>
                        <div className="h-full origin-left rounded-full tint-bg" style={{ transform: `scaleX(${pct / 100})` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Étapes et modules */}
          <section aria-labelledby="levels-title" className="space-y-4">
            <h2 id="levels-title" className="text-xl tracking-wide text-blanc">
              Mes étapes et modules
            </h2>
            {learning.levels.map((level) => (
              <div key={level.id} className={cn("rounded-3xl border bg-gradient-card p-5", level.status === "locked" ? "border-line opacity-70" : "border-line")}>
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-lg tracking-wide text-blanc">{level.title}</h3>
                  <Badge tone={levelBadgeTone[level.status]}>{levelStatusLabels[level.status]}</Badge>
                  {level.validation?.certificateNumber && (
                    <Link href={studentRoutes.validations} className="inline-flex items-center gap-1 text-sm text-or-light hover:underline">
                      <Medal aria-hidden className="size-4" /> Certificat {level.validation.certificateNumber}
                    </Link>
                  )}
                  <span className="ml-auto font-display text-lg text-or-light tabular">{level.percent} %</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-or/10" role="progressbar" aria-valuenow={level.percent} aria-valuemin={0} aria-valuemax={100} aria-label={`${level.title} : ${level.percent} %`}>
                  <div className="h-full origin-left rounded-full bg-gradient-or" style={{ transform: `scaleX(${level.percent / 100})` }} />
                </div>
                <ul className="mt-4 space-y-2">
                  {level.modules.map((m) => (
                    <li key={m.id}>
                      <Link href={moduleHref(m.slug)} className="flex items-center gap-3 rounded-xl border border-line bg-noir/40 px-4 py-2.5 transition-colors hover:border-or/40">
                        <span className="min-w-0 flex-1 truncate text-sm text-blanc">{m.title}</span>
                        <span className="text-xs text-blanc/50 tabular">
                          {m.completed}/{m.total} · {m.percent} %
                        </span>
                        <span className="h-1.5 w-16 overflow-hidden rounded-full bg-blanc/10 sm:w-24">
                          <span className="block h-full origin-left bg-or" style={{ transform: `scaleX(${m.percent / 100})` }} />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        </div>

        <div className="space-y-6">
          {/* Activité récente */}
          <section aria-labelledby="activity-title" className="rounded-3xl border border-line bg-gradient-card p-5 sm:p-6">
            <h2 id="activity-title" className="flex items-center gap-2 font-sans text-sm font-semibold tracking-[0.18em] text-or-light uppercase">
              <History aria-hidden className="size-4" /> Activité récente
            </h2>
            {activity.length === 0 ? (
              <p className="mt-3 text-sm text-blanc/55">Vos leçons et évaluations apparaîtront ici au fil de votre travail.</p>
            ) : (
              <ol className="mt-4 space-y-1">
                {activity.map((a) => (
                  <li key={a.id}>
                    {a.href ? (
                      <Link href={a.href} className="flex items-baseline gap-3 rounded-lg px-2 py-2 hover:bg-or/5">
                        <span className="min-w-0 flex-1 truncate text-sm text-blanc">{a.title}</span>
                        <span className="shrink-0 text-xs text-blanc/50">{a.detail}</span>
                        <time className="shrink-0 text-xs text-blanc/40">{formatDate(a.at, ctx.timezone, { day: "numeric", month: "short" })}</time>
                      </Link>
                    ) : (
                      <div className="flex items-baseline gap-3 px-2 py-2">
                        <span className="min-w-0 flex-1 truncate text-sm text-blanc">{a.title}</span>
                        <span className="shrink-0 text-xs text-blanc/50">{a.detail}</span>
                        <time className="shrink-0 text-xs text-blanc/40">{formatDate(a.at, ctx.timezone, { day: "numeric", month: "short" })}</time>
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </section>

          {/* Notes */}
          <section aria-labelledby="grades-title" className="rounded-3xl border border-line bg-gradient-card p-5 sm:p-6">
            <h2 id="grades-title" className="flex items-center gap-2 font-sans text-sm font-semibold tracking-[0.18em] text-or-light uppercase">
              <Medal aria-hidden className="size-4" /> Mes notes
            </h2>
            {grades.length === 0 ? (
              <EmptyState icon={Medal} title="Aucune note" description="Vos notes corrigées par les formateurs apparaîtront ici." className="mt-4" />
            ) : (
              <ul className="mt-4 space-y-3">
                {grades.map((g) => {
                  const pct = percent(g.score, g.maxScore);
                  return (
                    <li key={g.id} className="rounded-2xl border border-line bg-noir/40 p-4">
                      <div className="flex items-center gap-3">
                        <p className="min-w-0 flex-1 font-medium text-blanc">{g.label}</p>
                        {g.isExample && <ExampleBadge />}
                        <span className={cn("font-display text-xl tabular", pct >= 60 ? "text-success-light" : "text-warning-light")}>
                          {g.score}<span className="text-sm text-blanc/45">/{g.maxScore}</span>
                        </span>
                      </div>
                      {g.comment && <p className="mt-2 text-sm text-blanc/65">« {g.comment} »</p>}
                      <p className="mt-1.5 text-xs text-blanc/45">
                        {g.graderName ? `Par ${g.graderName} · ` : ""}
                        {formatDateTime(g.gradedAt, ctx.timezone)}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
