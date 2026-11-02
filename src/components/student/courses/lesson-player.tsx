"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCheck,
  CheckCircle2,
  ChevronLeft,
  CircleHelp,
  FileText,
  ListVideo,
  Lock,
  Maximize2,
  Minimize2,
  Paperclip,
  PlayCircle,
  StickyNote,
  Video,
} from "lucide-react";
import { CelebrationHost, CompletionSheet } from "@/components/student/celebrations/celebration";
import { LiveSessionCard } from "@/components/student/courses/live-session-card";
import { NotesEditor } from "@/components/student/courses/notes-editor";
import { QuestionsPanel } from "@/components/student/courses/questions-panel";
import { ResourceList } from "@/components/student/courses/resource-list";
import { RichContent } from "@/components/student/courses/rich-content";
import { VideoPlayer } from "@/components/student/courses/video-player";
import { Button } from "@/components/ui/button";
import { Badge, ExampleBadge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { lessonHref, moduleHref } from "@/config/student-nav";
import { useOfflineSync, runOrQueue } from "@/hooks/student/use-offline-queue";
import { formatMinutes } from "@/lib/student/format";
import { lessonKindLabels } from "@/lib/student/labels";
import type { LessonDetail } from "@/lib/student/queries/courses";
import type { LessonKind } from "@/lib/student/queries/learning";
import { useStudentUi } from "@/lib/student/ui-store";
import { cn } from "@/lib/utils";

const lessonIcons: Record<LessonKind, typeof PlayCircle> = { video: PlayCircle, live: Video, text: FileText, pdf: FileText };

const tabs = [
  { id: "contenu", label: "Contenu", icon: BookOpen },
  { id: "ressources", label: "Ressources", icon: Paperclip },
  { id: "notes", label: "Mes notes", icon: StickyNote },
  { id: "questions", label: "Questions", icon: CircleHelp },
] as const;
type TabId = (typeof tabs)[number]["id"];

/**
 * Lecteur de leçon : vidéo (reprise, vitesse, plein écran, chapitres), contenu écrit,
 * ressources PDF, notes personnelles, questions au formateur, séance Zoom liée.
 * Progression et notes synchronisées même hors-ligne.
 */
export function LessonPlayer({ detail, timezone }: { detail: LessonDetail; timezone: string }) {
  const { module, lesson, previous, next, resources, note, questions, live } = detail;
  const toast = useToast();
  useOfflineSync();
  const focusMode = useStudentUi((s) => s.focusMode);
  const setFocusMode = useStudentUi((s) => s.setFocusMode);
  const [tab, setTab] = useState<TabId>("contenu");
  const [done, setDone] = useState(lesson.state === "done");
  const [completing, setCompleting] = useState(false);
  const [celebration, setCelebration] = useState<{ moduleCompleted: boolean } | null>(null);
  const [listOpen, setListOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const index = module.lessons.findIndex((l) => l.id === lesson.id);

  useEffect(() => () => setFocusMode(false), [setFocusMode]);

  const complete = useCallback(
    async (auto = false) => {
      if (done || completing) return;
      setCompleting(true);
      const r = await runOrQueue("complete", { lessonId: lesson.id });
      setCompleting(false);
      if (r.queued) {
        setDone(true);
        toast({ title: "Hors-ligne", description: "La leçon sera marquée terminée au retour du réseau." });
        return;
      }
      const result = r.result as { ok: boolean; data?: { firstTime: boolean; moduleCompleted: boolean }; error?: string };
      if (!result.ok) {
        toast({ tone: "error", title: "Impossible d'enregistrer", description: result.error });
        return;
      }
      setDone(true);
      if (result.data?.firstTime) {
        setCelebration({ moduleCompleted: result.data.moduleCompleted });
      } else if (!auto) {
        toast({ tone: "success", title: "Leçon déjà terminée" });
      }
    },
    [done, completing, lesson.id, toast],
  );

  const onProgress = useCallback(
    (positionSeconds: number, progressPercent: number) => {
      void runOrQueue("progress", { lessonId: lesson.id, positionSeconds, progressPercent });
    },
    [lesson.id],
  );

  // Progression de lecture pour les leçons écrites : l'avancement suit le défilement.
  useEffect(() => {
    if (lesson.kind === "video" || done) return;
    let last = 0;
    const onScroll = () => {
      const el = contentRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const total = rect.height - window.innerHeight * 0.6;
      const pct = Math.max(0, Math.min(100, Math.round((-rect.top / Math.max(total, 1)) * 100)));
      if (pct - last >= 10) {
        last = pct;
        void runOrQueue("progress", { lessonId: lesson.id, positionSeconds: 0, progressPercent: pct });
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [lesson.id, lesson.kind, done]);

  const pdfResource = lesson.kind === "pdf" ? resources.find((r) => r.kind === "pdf") : undefined;
  const LessonIcon = lessonIcons[lesson.kind];

  return (
    <div className={cn("mx-auto", focusMode ? "max-w-4xl" : "max-w-6xl")}>
      {/* Barre supérieure du lecteur */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Button asChild size="sm" variant="ghost">
          <Link href={moduleHref(module.slug)} aria-label={`Retour au module ${module.title}`}>
            <ChevronLeft /> <span className="hidden sm:inline">{module.title}</span><span className="sm:hidden">Module</span>
          </Link>
        </Button>
        <span className="text-sm text-blanc/50">
          Leçon {index + 1} / {module.lessons.length}
        </span>
        {lesson.isExample && <ExampleBadge />}
        <div className="ml-auto flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setListOpen((o) => !o)}
            aria-expanded={listOpen}
            className="lg:hidden"
          >
            <ListVideo /> Leçons
          </Button>
          <Button size="sm" variant="outline" onClick={() => setFocusMode(!focusMode)} aria-pressed={focusMode}>
            {focusMode ? <Minimize2 /> : <Maximize2 />} {focusMode ? "Quitter" : "Concentration"}
          </Button>
          {!done && (
            <Button size="sm" onClick={() => void complete()} disabled={completing}>
              <CheckCheck /> Terminer
            </Button>
          )}
        </div>
      </div>

      <div className={cn("grid gap-8", !focusMode && "lg:grid-cols-[minmax(0,1fr)_19rem]")}>
        <div className="min-w-0">
          <header className="mb-5">
            <p className="flex flex-wrap items-center gap-2 text-sm text-or-light/90">
              <LessonIcon aria-hidden className="size-4" />
              {lessonKindLabels[lesson.kind]} · {formatMinutes(lesson.durationMinutes)}
              {done && <Badge tone="success" dot>Terminée</Badge>}
            </p>
            <h1 className="mt-2 text-3xl tracking-wide text-blanc sm:text-4xl">{lesson.title}</h1>
          </header>

          {live && (
            <div className="mb-6">
              <LiveSessionCard live={live} tz={timezone} />
            </div>
          )}

          {lesson.kind === "video" && lesson.videoUrl && (
            <VideoPlayer
              src={lesson.videoUrl}
              title={lesson.title}
              captionsUrl={lesson.captionsUrl}
              chapters={lesson.chapters}
              initialPosition={lesson.positionSeconds}
              onProgress={onProgress}
              onAlmostDone={() => void complete(true)}
            />
          )}
          {lesson.kind === "video" && !lesson.videoUrl && (
            <p className="mb-6 rounded-2xl border border-line bg-noir/40 p-5 text-blanc/60">
              La vidéo de cette leçon sera publiée prochainement. Le contenu écrit est déjà disponible ci-dessous.
            </p>
          )}
          {pdfResource && (
            <div className="mb-6 overflow-hidden rounded-3xl border border-line">
              <iframe src={`${pdfResource.href}#view=FitH`} title={pdfResource.title} className="h-[70dvh] w-full bg-blanc" loading="lazy" />
            </div>
          )}
          {lesson.kind === "live" && !live && (
            <p className="mb-6 rounded-2xl border border-line bg-noir/40 p-5 text-blanc/60">
              La prochaine séance en direct sera annoncée ici et dans votre calendrier.
            </p>
          )}

          {/* Onglets */}
          <div role="tablist" aria-label="Sections de la leçon" className="mt-6 flex gap-1 overflow-x-auto rounded-2xl border border-line bg-noir-soft/60 p-1">
            {tabs.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={tab === t.id}
                  aria-controls={`panel-${t.id}`}
                  id={`tab-${t.id}`}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-medium transition-colors",
                    tab === t.id ? "bg-or/15 text-or-light" : "text-blanc/60 hover:text-blanc",
                  )}
                >
                  <Icon aria-hidden className="size-4" />
                  {t.label}
                  {t.id === "ressources" && resources.length > 0 && <span className="text-xs text-blanc/45">({resources.length})</span>}
                  {t.id === "questions" && questions.length > 0 && <span className="text-xs text-blanc/45">({questions.length})</span>}
                </button>
              );
            })}
          </div>

          <div className="mt-6 rounded-3xl border border-line bg-gradient-card p-5 sm:p-8">
            {tab === "contenu" && (
              <div id="panel-contenu" role="tabpanel" aria-labelledby="tab-contenu" ref={contentRef}>
                {lesson.content ? (
                  <RichContent source={lesson.content} />
                ) : (
                  <p className="text-blanc/60">Le contenu écrit de cette leçon arrive bientôt.</p>
                )}
              </div>
            )}
            {tab === "ressources" && (
              <div id="panel-ressources" role="tabpanel" aria-labelledby="tab-ressources">
                <ResourceList resources={resources} emptyText="Aucune ressource n'est encore rattachée à cette leçon." />
              </div>
            )}
            {tab === "notes" && (
              <div id="panel-notes" role="tabpanel" aria-labelledby="tab-notes">
                <NotesEditor lessonId={lesson.id} initialBody={note} />
              </div>
            )}
            {tab === "questions" && (
              <div id="panel-questions" role="tabpanel" aria-labelledby="tab-questions">
                <QuestionsPanel lessonId={lesson.id} initial={questions} />
              </div>
            )}
          </div>

          {/* Navigation bas de leçon */}
          <nav aria-label="Navigation entre les leçons" className="mt-8 flex flex-col gap-3 sm:flex-row">
            {previous ? (
              <Button asChild variant="outline" className="flex-1 justify-start">
                <Link href={previous.href} className="min-w-0">
                  <ArrowLeft className="shrink-0" /> <span className="truncate">{previous.title}</span>
                </Link>
              </Button>
            ) : (
              <span className="flex-1" />
            )}
            {!done && (
              <Button onClick={() => void complete()} disabled={completing} className="flex-1">
                <CheckCircle2 /> Marquer comme terminée
              </Button>
            )}
            {next && !next.locked ? (
              <Button asChild variant={done ? "primary" : "outline"} className="flex-1 justify-end">
                <Link href={next.href} className="min-w-0">
                  <span className="truncate">{next.title}</span> <ArrowRight className="shrink-0" />
                </Link>
              </Button>
            ) : next?.locked ? (
              <span title="Ce module s'ouvrira après validation du niveau" className="flex flex-1 items-center justify-end gap-2 text-sm text-blanc/45">
                <Lock className="size-4" /> Niveau suivant verrouillé
              </span>
            ) : (
              <span className="flex-1" />
            )}
          </nav>
        </div>

        {/* Liste des leçons du module */}
        {!focusMode && (
          <aside
            className={cn(
              "lg:sticky lg:top-24 lg:self-start",
              "rounded-3xl border border-line bg-gradient-card p-4",
              !listOpen && "hidden lg:block",
            )}
          >
            <p className="mb-3 px-1 font-sans text-xs font-semibold tracking-[0.18em] text-or-light uppercase">{module.title}</p>
            <ol className="space-y-1">
              {module.lessons.map((l, i) => {
                const Icon = lessonIcons[l.kind];
                const current = l.id === lesson.id;
                return (
                  <li key={l.id}>
                    <Link
                      href={lessonHref(module.slug, l.slug)}
                      aria-current={current ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                        current ? "bg-or/15 font-semibold text-or-light" : "text-blanc/70 hover:bg-or/5 hover:text-blanc",
                      )}
                    >
                      <span className="grid size-6 shrink-0 place-items-center">
                        {l.state === "done" ? (
                          <CheckCircle2 aria-label="Terminée" className="size-4.5 text-success-light" />
                        ) : (
                          <Icon aria-hidden className={cn("size-4", l.state === "in_progress" && "text-warning-light")} />
                        )}
                      </span>
                      <span className="min-w-0 flex-1 truncate">
                        {i + 1}. {l.title}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </aside>
        )}
      </div>

      <CelebrationHost>
        {celebration && (
          <CompletionSheet
            title={celebration.moduleCompleted ? "Module terminé !" : "Leçon terminée !"}
            description={
              celebration.moduleCompleted
                ? `Vous avez terminé toutes les leçons de « ${module.title} ». Bravo !`
                : "Beau travail. Continuez sur votre lancée."
            }
            actionLabel={celebration.moduleCompleted || !next || next.locked ? "Voir le module" : "Leçon suivante"}
            actionHref={celebration.moduleCompleted || !next || next.locked ? moduleHref(module.slug) : next.href}
            onClose={() => setCelebration(null)}
          />
        )}
      </CelebrationHost>
    </div>
  );
}
