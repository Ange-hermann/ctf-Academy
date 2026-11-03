import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, BookOpenCheck, CalendarDays, ClipboardList, MessageSquare, Plus, TrendingUp, Users } from "lucide-react";
import { StatCard } from "@/components/admin/ui";
import { adminRoutes } from "@/config/admin-nav";
import { getClassAssessments, getClassFormations, getClassRoster, getClassSchedule, getClassThreads, getCorrectionsQueue } from "@/lib/admin/queries";
import type { StudentContext } from "@/lib/student/session";

const kindLabels: Record<string, string> = { live: "Cours en direct", event: "Événement", quiz: "Quiz", exercise: "Devoir", exam: "Examen" };

const fmtDay = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

type AgendaItem = { id: string; kind: string; title: string; at: string; slug: string; href: string };

/** Les 6 prochaines échéances, à partir de maintenant (lecture de l'horloge hors du rendu). */
function upcoming(items: AgendaItem[]): AgendaItem[] {
  const now = Date.now();
  return items
    .filter((i) => new Date(i.at).getTime() >= now)
    .sort((a, b) => a.at.localeCompare(b.at))
    .slice(0, 6);
}

function Panel({ title, href, linkLabel, children }: { title: string; href: string; linkLabel: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-or/25 bg-noir-card p-5 shadow-card">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-display text-base font-semibold text-blanc">{title}</h2>
        <Link href={href} className="inline-flex items-center gap-1 text-sm text-or-light hover:text-or">
          {linkLabel} <ArrowRight aria-hidden className="size-4" />
        </Link>
      </div>
      {children}
    </section>
  );
}

/** Tableau de bord du formateur : sa classe, son agenda, ses copies et le suivi de ses étudiants. */
export async function TrainerOverview({ ctx }: { ctx: StudentContext }) {
  const [formations, roster, assessments, schedule, corrections, threads] = await Promise.all([
    getClassFormations(ctx),
    getClassRoster(ctx),
    getClassAssessments(ctx),
    getClassSchedule(ctx),
    getCorrectionsQueue(ctx),
    getClassThreads(ctx),
  ]);

  if (!formations.length) {
    return (
      <section className="rounded-2xl border border-or/25 bg-noir-card p-6 shadow-card">
        <h2 className="font-display text-lg font-semibold text-blanc">Aucune classe attribuée</h2>
        <p className="mt-2 max-w-2xl text-sm text-blanc/55">
          Votre espace formateur s&rsquo;activera dès que l&rsquo;administrateur vous aura confié une classe dans « Accès &amp; rôles ».
        </p>
      </section>
    );
  }

  const agenda = upcoming([
    ...schedule.sessions.map((s) => ({ id: `s-${s.id}`, kind: "live", title: s.title, at: s.startsAt, slug: s.formationSlug, href: adminRoutes.pedagogy })),
    ...schedule.events.map((e) => ({ id: `e-${e.id}`, kind: "event", title: e.title, at: e.startsAt, slug: e.formationSlug, href: adminRoutes.pedagogy })),
    ...assessments
      .filter((a) => a.dueAt)
      .map((a) => ({ id: `q-${a.id}`, kind: a.kind, title: a.title, at: a.dueAt!, slug: a.formationSlug, href: adminRoutes.classroom })),
  ]);

  const progressOf = (s: (typeof roster)[number]) => (s.lessonsTotal ? Math.round((s.lessonsDone / s.lessonsTotal) * 100) : 0);
  const avgProgress = roster.length ? Math.round(roster.reduce((sum, s) => sum + progressOf(s), 0) / roster.length) : 0;
  const graded = roster.filter((s) => s.avgScore != null);
  const classAverage = graded.length ? Math.round(graded.reduce((sum, s) => sum + (s.avgScore ?? 0), 0) / graded.length) : null;
  const unread = threads.reduce((n, t) => n + t.unread, 0);
  const watchList = [...roster].sort((a, b) => progressOf(a) - progressOf(b)).slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium tracking-wide text-blanc/50 uppercase">{formations.length > 1 ? "Formations" : "Votre classe"}</span>
        {formations.map((f) => (
          <span key={f.id} className="rounded-full border border-or/40 bg-or/10 px-3 py-1 text-xs font-semibold text-or-light" title={f.name}>
            {f.label}
          </span>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Étudiants" value={roster.length} detail={`progression moyenne : ${avgProgress} %`} href={adminRoutes.classroom} icon={<Users aria-hidden className="size-4" />} />
        <StatCard label="Copies à corriger" value={corrections.length} detail={corrections.length ? "en attente de votre note" : "tout est corrigé"} href={adminRoutes.corrections} icon={<BookOpenCheck aria-hidden className="size-4" />} />
        <StatCard label="Moyenne de la classe" value={classAverage != null ? `${classAverage} %` : "—"} detail={`${assessments.length} évaluation${assessments.length > 1 ? "s" : ""} créée${assessments.length > 1 ? "s" : ""}`} href={adminRoutes.classroom} icon={<TrendingUp aria-hidden className="size-4" />} />
        <StatCard label="Messages non lus" value={unread} detail={`${threads.length} discussion${threads.length > 1 ? "s" : ""}`} href={`${adminRoutes.classroom}/messages`} icon={<MessageSquare aria-hidden className="size-4" />} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Agenda à venir" href={adminRoutes.pedagogy} linkLabel="Planifier">
          {agenda.length ? (
            <ul className="space-y-2">
              {agenda.map((i) => (
                <li key={i.id}>
                  <Link href={i.href} className="flex items-center gap-4 rounded-xl border border-line/60 bg-noir-soft px-4 py-3 transition-colors hover:border-or/40">
                    <span className="w-16 shrink-0 text-center">
                      <span className="block text-xs text-blanc/50 capitalize">{fmtDay(i.at).split(" ")[0]}</span>
                      <span className="font-display block text-lg font-bold text-or-light">{new Date(i.at).getDate()}</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-blanc">{i.title}</span>
                      <span className="block text-xs text-blanc/50">
                        {kindLabels[i.kind] ?? i.kind} · {i.slug.toUpperCase()} · {fmtTime(i.at)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-line p-5">
              <CalendarDays aria-hidden className="size-6 text-or/70" />
              <p className="text-sm text-blanc/55">Rien de programmé. Ajoutez un cours en direct, un événement ou une échéance d&rsquo;évaluation.</p>
            </div>
          )}
        </Panel>

        <Panel title="Copies à corriger" href={adminRoutes.corrections} linkLabel="Tout voir">
          {corrections.length ? (
            <ul className="space-y-2">
              {corrections.slice(0, 6).map((c) => (
                <li key={c.id}>
                  <Link href={`${adminRoutes.corrections}/${c.id}`} className="flex items-center justify-between gap-4 rounded-xl border border-line/60 bg-noir-soft px-4 py-3 transition-colors hover:border-or/40">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-blanc">{c.quizTitle}</span>
                      <span className="block text-xs text-blanc/50">
                        {c.studentName} · {kindLabels[c.kind] ?? c.kind}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs font-medium text-or-light">Corriger</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-line p-5">
              <ClipboardList aria-hidden className="size-6 text-or/70" />
              <p className="text-sm text-blanc/55">Aucune copie en attente. Les QCM sont corrigés automatiquement ; les rédactions et fichiers arriveront ici.</p>
            </div>
          )}
        </Panel>
      </div>

      <Panel title="Suivi des étudiants" href={adminRoutes.classroom} linkLabel="Ma classe">
        {watchList.length ? (
          <ul className="divide-y divide-line/60">
            {watchList.map((s) => {
              const p = progressOf(s);
              return (
                <li key={s.userId}>
                  <Link href={`${adminRoutes.classroom}/${s.userId}`} className="-mx-2 flex items-center gap-4 rounded-lg px-2 py-3 transition-colors hover:bg-or/5">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full border border-or/30 bg-or/10 text-xs font-semibold text-or-light">
                      {s.name
                        .split(" ")
                        .map((w) => w[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-3">
                        <span className="truncate text-sm font-medium text-blanc">{s.name}</span>
                        <span className="shrink-0 text-xs text-blanc/50">
                          {s.lessonsDone}/{s.lessonsTotal} leçons · {s.avgScore != null ? `${s.avgScore} %` : "pas de note"}
                        </span>
                      </span>
                      <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-line" aria-label={`Progression ${p} %`}>
                        <span className="block h-full rounded-full bg-gradient-or" style={{ width: `${p}%` }} />
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-blanc/50">Aucun étudiant admis dans vos classes pour le moment.</p>
        )}
      </Panel>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Créer une évaluation", href: adminRoutes.classroom },
          { label: "Ajouter une leçon", href: adminRoutes.classroom },
          { label: "Programmer un cours", href: adminRoutes.pedagogy },
          { label: "Publier une annonce", href: adminRoutes.pedagogy },
        ].map((a) => (
          <Link
            key={a.label}
            href={a.href}
            className="flex min-h-12 items-center gap-2 rounded-xl border border-or/30 bg-noir-card px-4 text-sm font-medium text-or-light transition-colors hover:border-or/60 hover:bg-or/10"
          >
            <Plus aria-hidden className="size-4" /> {a.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
