import "server-only";
import type { KeyWordSlug } from "@/content/identity";
import type { Tx } from "@/lib/student/session";

export type LessonKind = "video" | "text" | "pdf" | "live";
export type LessonState = "todo" | "in_progress" | "done";
export type ModuleStatus = "todo" | "in_progress" | "done" | "locked";
export type LevelStatus = "validated" | "pending_decision" | "current" | "upcoming" | "locked";

export type LessonSummary = {
  id: string;
  slug: string;
  title: string;
  kind: LessonKind;
  durationMinutes: number;
  state: LessonState;
  progressPercent: number;
  positionSeconds: number;
  completedAt: string | null;
  updatedAt: string | null;
};

export type ModuleSummary = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  objectives: string[];
  durationMinutes: number;
  levelId: string | null;
  levelNumber: number | null;
  levelTitle: string | null;
  keyWords: KeyWordSlug[];
  objectiveNumbers: number[];
  lessons: LessonSummary[];
  completed: number;
  total: number;
  percent: number;
  status: ModuleStatus;
  isExample: boolean;
};

export type LevelSummary = {
  id: string;
  number: number;
  title: string;
  description: string;
  minScore: number;
  modules: ModuleSummary[];
  percent: number;
  status: LevelStatus;
  validation: {
    id: string;
    decision: "pending" | "granted" | "refused";
    decidedAt: string | null;
    certificateNumber: string | null;
  } | null;
};

export type Learning = {
  levels: LevelSummary[];
  modules: ModuleSummary[];
  totalLessons: number;
  completedLessons: number;
  percent: number;
  /** Leçon à reprendre : en cours la plus récente, sinon la prochaine leçon non terminée d'un module ouvert. */
  resume: { module: ModuleSummary; lesson: LessonSummary } | null;
  currentLevel: LevelSummary | null;
};

export const percent = (done: number, total: number) => (total ? Math.round((done / total) * 100) : 0);

/** Vue pédagogique complète de la formation (sous RLS : uniquement la formation de l'étudiant). */
export async function getLearning(tx: Tx, formationId: string): Promise<Learning> {
  const levels = await tx.levels.findMany({ where: { formation_id: formationId }, orderBy: { number: "asc" } });
  const modules = await tx.modules.findMany({
    where: { formation_id: formationId },
    orderBy: { sort_order: "asc" },
    include: {
      lessons: { orderBy: { sort_order: "asc" } },
      module_key_words: { select: { key_word_slug: true } },
      module_objectives: { select: { objective_number: true } },
    },
  });
  const progress = await tx.lesson_progress.findMany();
  const validations = await tx.validations.findMany({ where: { kind: "level" } });

  const progressByLesson = new Map(progress.map((p) => [p.lesson_id, p]));
  const validationByLevel = new Map(validations.filter((v) => v.level_id).map((v) => [v.level_id!, v]));

  // Un niveau s'ouvre quand le précédent est validé ; le niveau 1 est toujours ouvert.
  const unlocked = new Set<string>();
  for (const [i, level] of levels.entries()) {
    if (i === 0 || validationByLevel.get(levels[i - 1].id)?.decision === "granted") unlocked.add(level.id);
  }
  const levelById = new Map(levels.map((l) => [l.id, l]));

  const moduleSummaries: ModuleSummary[] = modules.map((m) => {
    const lessons: LessonSummary[] = m.lessons.map((l) => {
      const p = progressByLesson.get(l.id);
      return {
        id: l.id,
        slug: l.slug,
        title: l.title,
        kind: l.kind,
        durationMinutes: l.duration_minutes,
        state: p?.completed_at ? "done" : p ? "in_progress" : "todo",
        progressPercent: p?.completed_at ? 100 : (p?.progress_percent ?? 0),
        positionSeconds: p?.position_seconds ?? 0,
        completedAt: p?.completed_at?.toISOString() ?? null,
        updatedAt: p?.updated_at.toISOString() ?? null,
      };
    });
    const completed = lessons.filter((l) => l.state === "done").length;
    const level = m.level_id ? levelById.get(m.level_id) : undefined;
    const locked = !!m.level_id && !unlocked.has(m.level_id);
    return {
      id: m.id,
      slug: m.slug,
      title: m.title,
      summary: m.summary,
      description: m.description,
      objectives: m.objectives,
      durationMinutes: lessons.reduce((n, l) => n + l.durationMinutes, 0) || m.duration_minutes,
      levelId: m.level_id,
      levelNumber: level?.number ?? null,
      levelTitle: level?.title ?? null,
      keyWords: m.module_key_words.map((k) => k.key_word_slug as KeyWordSlug),
      objectiveNumbers: m.module_objectives.map((o) => o.objective_number),
      lessons,
      completed,
      total: lessons.length,
      percent: percent(completed, lessons.length),
      status: locked
        ? "locked"
        : completed === lessons.length && lessons.length
          ? "done"
          : lessons.some((l) => l.state !== "todo")
            ? "in_progress"
            : "todo",
      isExample: m.is_example,
    };
  });

  let currentFound = false;
  const levelSummaries: LevelSummary[] = levels.map((l) => {
    const mods = moduleSummaries.filter((m) => m.levelId === l.id);
    const v = validationByLevel.get(l.id);
    const done = mods.reduce((n, m) => n + m.completed, 0);
    const total = mods.reduce((n, m) => n + m.total, 0);
    let status: LevelStatus;
    if (v?.decision === "granted") status = "validated";
    else if (!unlocked.has(l.id)) status = "locked";
    else if (total > 0 && done === total) status = "pending_decision";
    else status = currentFound ? "upcoming" : "current";
    if (status === "current" || status === "pending_decision") currentFound = true;
    return {
      id: l.id,
      number: l.number,
      title: l.title,
      description: l.description,
      minScore: l.min_score,
      modules: mods,
      percent: v?.decision === "granted" ? 100 : percent(done, total),
      status,
      validation: v
        ? {
            id: v.id,
            decision: v.decision,
            decidedAt: v.decided_at?.toISOString() ?? null,
            certificateNumber: v.certificate_number,
          }
        : null,
    };
  });

  const open = moduleSummaries.filter((m) => m.status !== "locked");
  const allLessons = open.flatMap((m) => m.lessons.map((lesson) => ({ module: m, lesson })));
  const inProgress = allLessons
    .filter((x) => x.lesson.state === "in_progress")
    .sort((a, b) => (b.lesson.updatedAt ?? "").localeCompare(a.lesson.updatedAt ?? ""));
  const resume = inProgress[0] ?? allLessons.find((x) => x.lesson.state === "todo") ?? null;

  const totalLessons = moduleSummaries.reduce((n, m) => n + m.total, 0);
  const completedLessons = moduleSummaries.reduce((n, m) => n + m.completed, 0);
  return {
    levels: levelSummaries,
    modules: moduleSummaries,
    totalLessons,
    completedLessons,
    percent: percent(completedLessons, totalLessons),
    resume,
    currentLevel: levelSummaries.find((l) => l.status === "current" || l.status === "pending_decision") ?? null,
  };
}

/** Rayonnement des 5 mots clés : part des leçons terminées dans les modules liés à chaque mot. */
export function keyWordScores(modules: ModuleSummary[]) {
  const scores = new Map<KeyWordSlug, { done: number; total: number }>();
  for (const m of modules) {
    for (const k of m.keyWords) {
      const s = scores.get(k) ?? { done: 0, total: 0 };
      s.done += m.completed;
      s.total += m.total;
      scores.set(k, s);
    }
  }
  return scores;
}
