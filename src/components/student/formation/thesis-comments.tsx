"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check, MessageSquareReply, Paperclip, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { replyThesisCommentAction, setThesisCommentResolvedAction } from "@/lib/student/actions/formation";
import { formatDateTime } from "@/lib/student/format";
import type { ThesisComment } from "@/lib/student/queries/formation";
import { cn } from "@/lib/utils";

type CommentNode = ThesisComment & { replies: ThesisComment[] };

function buildTree(comments: ThesisComment[]): CommentNode[] {
  const roots = comments.filter((c) => !c.parentId);
  return roots.map((r) => ({ ...r, replies: comments.filter((c) => c.parentId === r.id) }));
}

const roleLabel = (role: string) => (role === "student" ? "Vous" : role === "supervisor" ? "Superviseur" : "Équipe");

/** Relecture du mémoire : fils de commentaires du superviseur, réponses de l'étudiant, résolution par point. */
export function ThesisComments({ comments, versionNumbers, timezone }: { comments: ThesisComment[]; versionNumbers: Record<string, number>; timezone: string }) {
  const toast = useToast();
  const router = useRouter();
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();

  const reply = (e: React.FormEvent, commentId: string) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await replyThesisCommentAction({ commentId, body: body.trim() });
      if (!res.ok) {
        toast({ title: "Réponse impossible", description: res.error, tone: "error" });
        return;
      }
      toast({ title: "Réponse envoyée", tone: "success" });
      setReplyTo(null);
      setBody("");
      router.refresh();
    });
  };

  const toggle = (commentId: string, resolved: boolean) => {
    startTransition(async () => {
      const res = await setThesisCommentResolvedAction({ commentId, resolved });
      if (!res.ok) {
        toast({ title: "Action impossible", description: res.error, tone: "error" });
        return;
      }
      toast({ title: resolved ? "Point marqué résolu" : "Point rouvert", tone: "success" });
      router.refresh();
    });
  };

  const roots = buildTree(comments);

  return (
    <ul className="space-y-4">
      {roots.map((c) => (
        <li key={c.id} className="rounded-2xl border border-line bg-noir-soft/50 p-4">
          <div className="flex flex-wrap items-center gap-2 text-xs text-blanc/50">
            <span className="font-semibold text-or-light">{c.authorName}</span>
            <span>· {roleLabel(c.authorRole)}</span>
            {versionNumbers[c.versionId] != null && <span>· version {versionNumbers[c.versionId]}</span>}
            {c.section && <span className="rounded-full border border-or/25 bg-or/5 px-2 py-0.5 text-or-light">{c.section}</span>}
            <span className="ml-auto">{formatDateTime(c.createdAt, timezone)}</span>
            <Badge tone={c.status === "resolved" ? "success" : "warning"} dot>
              {c.status === "resolved" ? "Résolu" : "Ouvert"}
            </Badge>
          </div>
          <p className="mt-2 text-sm whitespace-pre-line text-blanc/80">{c.body}</p>
          {c.attachmentHref && (
            <a href={c.attachmentHref} className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-or-light hover:text-or hover:underline">
              <Paperclip aria-hidden className="size-4" /> {c.attachmentName ?? "Pièce jointe"}
            </a>
          )}

          {c.replies.length > 0 && (
            <ul className="mt-3 space-y-2 border-l-2 border-or/20 pl-4">
              {c.replies.map((r) => (
                <li key={r.id} className="rounded-xl bg-noir/40 px-3 py-2">
                  <p className="text-xs text-blanc/50">
                    <span className="font-semibold text-or-light">{r.authorName}</span> · {roleLabel(r.authorRole)} ·{" "}
                    {formatDateTime(r.createdAt, timezone)}
                  </p>
                  <p className="mt-1 text-sm whitespace-pre-line text-blanc/75">{r.body}</p>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            {c.status === "open" && (
              <Button type="button" size="sm" variant="outline" onClick={() => setReplyTo(replyTo === c.id ? null : c.id)} disabled={pending}>
                <MessageSquareReply aria-hidden className="mr-1.5 size-4" /> Répondre
              </Button>
            )}
            <Button type="button" size="sm" variant="ghost" onClick={() => toggle(c.id, c.status !== "resolved")} disabled={pending}>
              {c.status === "resolved" ? (
                <>
                  <RotateCcw aria-hidden className="mr-1.5 size-4" /> Rouvrir
                </>
              ) : (
                <>
                  <Check aria-hidden className="mr-1.5 size-4" /> Marquer résolu
                </>
              )}
            </Button>
          </div>

          {replyTo === c.id && (
            <form onSubmit={(e) => reply(e, c.id)} className={cn("mt-3 space-y-2")}>
              <label htmlFor={`reply-${c.id}`} className="sr-only">
                Votre réponse
              </label>
              <textarea
                id={`reply-${c.id}`}
                rows={3}
                maxLength={4000}
                required
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Votre réponse au superviseur…"
                className="w-full rounded-xl border border-or/15 bg-noir-soft px-3 py-2.5 text-sm text-blanc outline-none transition-colors placeholder:text-blanc/35 focus:border-or"
              />
              <Button type="submit" size="sm" disabled={pending || !body.trim()}>
                {pending ? "Envoi…" : "Envoyer la réponse"}
              </Button>
            </form>
          )}
        </li>
      ))}
    </ul>
  );
}
