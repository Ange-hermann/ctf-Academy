import Link from "next/link";
import { CalendarClock, FileText, MessageSquareQuote, Paperclip, Send } from "lucide-react";
import { WorkSubmit } from "@/components/student/formation/work-submit";
import { Badge, ExampleBadge } from "@/components/ui/badge";
import { formatDate } from "@/lib/student/format";
import { workStatusLabels, type WorkItem } from "@/lib/student/queries/formation";

const statusTone = { todo: "neutral", submitted: "warning", to_revise: "danger", validated: "success" } as const;

/** Carte d'un travail à rendre (mentorat ou leadership) : consignes, rendu et retour du formateur. */
export function WorkCard({ work, timezone, kind }: { work: WorkItem; timezone: string; kind: "mentorat" | "leadership" }) {
  return (
    <li className="rounded-3xl border border-line bg-gradient-card p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <span className="grid size-11 place-items-center rounded-2xl border border-or/30 bg-or/10 text-or-light">
          <FileText aria-hidden className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-blanc">{work.title}</h3>
          {work.dueAt && (
            <p className="inline-flex items-center gap-1.5 text-sm text-blanc/55">
              <CalendarClock aria-hidden className="size-4 text-or" /> À rendre avant le {formatDate(work.dueAt, timezone)}
            </p>
          )}
        </div>
        <Badge tone={statusTone[work.status]} dot>
          {workStatusLabels[work.status]}
        </Badge>
        {work.isExample && <ExampleBadge />}
      </div>

      {work.instructions && <p className="mt-4 text-sm whitespace-pre-line text-blanc/70">{work.instructions}</p>}

      {(work.status === "todo" || work.status === "to_revise") && <WorkSubmit kind={kind} workId={work.id} />}

      {(work.response || work.fileHref) && (
        <div className="mt-4 rounded-2xl border border-line bg-noir-soft/50 px-4 py-3">
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide text-or-light uppercase">
            <Send aria-hidden className="size-3.5" /> Votre rendu
            {work.submittedAt ? ` · ${formatDate(work.submittedAt, timezone)}` : ""}
          </p>
          {work.response && <p className="mt-2 text-sm whitespace-pre-line text-blanc/75">{work.response}</p>}
          {work.fileHref && (
            <Link href={work.fileHref} className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-or-light hover:text-or hover:underline">
              <Paperclip aria-hidden className="size-4" /> {work.fileName ?? "Fichier joint"}
            </Link>
          )}
        </div>
      )}

      {work.score != null && (
        <p className="mt-4 text-sm font-semibold text-or-light">
          Note : {work.score}
          {work.maxScore != null ? `/${work.maxScore}` : ""}
        </p>
      )}

      {work.feedback && (
        <div className="mt-4 rounded-2xl border border-or/25 bg-or/5 px-4 py-3">
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide text-or-light uppercase">
            <MessageSquareQuote aria-hidden className="size-3.5" /> Retour du formateur
            {work.feedbackBy ? ` · ${work.feedbackBy}` : ""}
          </p>
          <p className="mt-2 text-sm whitespace-pre-line text-blanc/75">{work.feedback}</p>
        </div>
      )}
    </li>
  );
}
