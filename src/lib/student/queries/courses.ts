import "server-only";
import { getLearning, type LessonSummary, type ModuleSummary } from "@/lib/student/queries/learning";
import { type EnrolledContext, withStudent } from "@/lib/student/session";

export type Chapter = { at: number; label: string };
export type ResourceItem = { id: string; kind: "pdf" | "link" | "document" | "audio" | "video"; title: string; href: string; sizeBytes: number | null; downloadable: boolean };
export type LiveItem = { id: string; title: string; description: string; startsAt: string; endsAt: string; zoomUrl: string | null; replayUrl: string | null; isExample: boolean };

const toResource = (r: { id: string; kind: ResourceItem["kind"]; title: string; url: string | null; storage_path: string | null; size_bytes: number | null }): ResourceItem => ({
  id: r.id,
  kind: r.kind,
  title: r.title,
  href: r.url ?? `/espace-etudiant/fichier?ressource=${r.id}`,
  sizeBytes: r.size_bytes,
  downloadable: r.kind !== "link",
});

const toLive = (l: { id: string; title: string; description: string; starts_at: Date; duration_minutes: number; zoom_url: string | null; replay_url: string | null; is_example: boolean }): LiveItem => ({
  id: l.id,
  title: l.title,
  description: l.description,
  startsAt: l.starts_at.toISOString(),
  endsAt: new Date(l.starts_at.getTime() + l.duration_minutes * 60_000).toISOString(),
  zoomUrl: l.zoom_url,
  replayUrl: l.replay_url,
  isExample: l.is_example,
});

export async function getCourses(ctx: EnrolledContext) {
  return withStudent(ctx.userId, (tx) => getLearning(tx, ctx.enrollment.formationId));
}

export async function getModuleDetail(ctx: EnrolledContext, moduleSlug: string) {
  const formationId = ctx.enrollment.formationId;
  const [learning, extras] = await Promise.all([
    withStudent(ctx.userId, (tx) => getLearning(tx, formationId)),
    withStudent(ctx.userId, async (tx) => {
      const mod = await tx.modules.findFirst({ where: { formation_id: formationId, slug: moduleSlug }, select: { id: true } });
      if (!mod) return null;
      const resources = await tx.resources.findMany({ where: { module_id: mod.id, lesson_id: null }, orderBy: { sort_order: "asc" } });
      const lives = await tx.live_sessions.findMany({
        where: { module_id: mod.id, starts_at: { gte: new Date(Date.now() - 30 * 86400_000) } },
        orderBy: { starts_at: "asc" },
      });
      return { resources: resources.map(toResource), lives: lives.map(toLive) };
    }),
  ]);
  const mod = learning.modules.find((m) => m.slug === moduleSlug);
  if (!mod || !extras) return null;
  return { module: mod, learning, ...extras };
}

export type LessonDetail = {
  module: ModuleSummary;
  lesson: LessonSummary & { content: string; videoUrl: string | null; audioUrl: string | null; captionsUrl: string | null; chapters: Chapter[]; isExample: boolean };
  previous: { href: string; title: string } | null;
  next: { href: string; title: string; locked: boolean } | null;
  resources: ResourceItem[];
  note: string;
  questions: { id: string; body: string; answer: string | null; answeredBy: string | null; createdAt: string }[];
  live: LiveItem | null;
};

export async function getLessonDetail(ctx: EnrolledContext, moduleSlug: string, lessonSlug: string): Promise<LessonDetail | null> {
  const formationId = ctx.enrollment.formationId;
  const [learning, raw] = await Promise.all([
    withStudent(ctx.userId, (tx) => getLearning(tx, formationId)),
    withStudent(ctx.userId, async (tx) => {
      const lesson = await tx.lessons.findFirst({
        where: { slug: lessonSlug, modules: { slug: moduleSlug, formation_id: formationId } },
        include: { resources: { orderBy: { sort_order: "asc" } }, student_notes: true, lesson_questions: { orderBy: { created_at: "desc" } } },
      });
      if (!lesson) return null;
      const moduleResources = await tx.resources.findMany({ where: { module_id: lesson.module_id, lesson_id: null }, orderBy: { sort_order: "asc" } });
      const live = await tx.live_sessions.findFirst({
        where: { module_id: lesson.module_id, starts_at: { gte: new Date(Date.now() - 3 * 3600_000) } },
        orderBy: { starts_at: "asc" },
      });
      return { lesson, moduleResources, live };
    }),
  ]);
  const mod = learning.modules.find((m) => m.slug === moduleSlug);
  if (!raw || !mod || mod.status === "locked") return null;
  const summary = mod.lessons.find((l) => l.id === raw.lesson.id)!;

  // Navigation précédent / suivant dans l'ordre du parcours (modules ouverts uniquement).
  const sequence = learning.modules.flatMap((m) => m.lessons.map((l) => ({ m, l })));
  const index = sequence.findIndex((x) => x.l.id === raw.lesson.id);
  const prev = sequence[index - 1];
  const next = sequence[index + 1];

  // Vidéo déposée par le formateur : servie via la route protégée (relecture RLS puis URL signée longue).
  const uploadedVideo = raw.lesson.resources.find((r) => r.kind === "video" && r.storage_path);
  const audioResource = raw.lesson.resources.find((r) => r.kind === "audio");

  return {
    module: mod,
    lesson: {
      ...summary,
      content: raw.lesson.content,
      videoUrl: raw.lesson.video_url ?? (uploadedVideo ? toResource(uploadedVideo).href : null),
      audioUrl: audioResource ? toResource(audioResource).href : null,
      captionsUrl: raw.lesson.captions_url,
      chapters: Array.isArray(raw.lesson.chapters) ? (raw.lesson.chapters as Chapter[]) : [],
      isExample: raw.lesson.is_example,
    },
    previous: prev ? { href: `/espace-etudiant/cours/${prev.m.slug}/${prev.l.slug}`, title: prev.l.title } : null,
    next: next ? { href: `/espace-etudiant/cours/${next.m.slug}/${next.l.slug}`, title: next.l.title, locked: next.m.status === "locked" } : null,
    resources: [...raw.lesson.resources, ...raw.moduleResources].map(toResource),
    note: raw.lesson.student_notes[0]?.body ?? "",
    questions: raw.lesson.lesson_questions.map((q) => ({
      id: q.id,
      body: q.body,
      answer: q.answer,
      answeredBy: q.answered_by,
      createdAt: q.created_at.toISOString(),
    })),
    live: raw.live ? toLive(raw.live) : null,
  };
}
