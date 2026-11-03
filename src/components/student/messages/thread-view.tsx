"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Paperclip, SendHorizonal } from "lucide-react";
import { VoiceNote, VoiceRecorder } from "@/components/messages/voice-recorder";
import { useToast } from "@/components/ui/toast";
import { isVoiceAttachment, voiceLabel } from "@/lib/messages/voice";
import { markThreadReadAction, requestVoiceUploadAction, sendMessageAction, sendVoiceMessageAction } from "@/lib/student/actions/messages";
import { formatDateTime } from "@/lib/student/format";
import type { MessageItem, ThreadDetail } from "@/lib/student/queries/messages";
import { cn } from "@/lib/utils";

const REFRESH_MS = 15_000;

/** Conversation : messages texte et vocaux, lecture marquée à l'ouverture, réponses de l'équipe rafraîchies automatiquement. */
export function ThreadView({ thread, timezone }: { thread: ThreadDetail; timezone: string }) {
  const toast = useToast();
  const router = useRouter();
  // Messages envoyés localement, affichés tout de suite en attendant le rafraîchissement serveur.
  const [optimistic, setOptimistic] = useState<MessageItem[]>([]);
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();
  const listRef = useRef<HTMLOListElement>(null);
  const messages = [...thread.messages, ...optimistic.filter((o) => !thread.messages.some((m) => m.id === o.id))];

  useEffect(() => {
    void markThreadReadAction(thread.id);
  }, [thread.id, thread.messages.length]);

  // Les réponses du formateur arrivent sans recharger la page (onglet visible uniquement).
  useEffect(() => {
    const id = setInterval(() => document.visibilityState === "visible" && router.refresh(), REFRESH_MS);
    return () => clearInterval(id);
  }, [router]);

  // Défilement interne uniquement : scrollIntoView remonterait aussi la fenêtre
  // et pousserait la zone de réponse hors de l'écran.
  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages.length]);

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    const text = body.trim();
    if (!text || pending) return;
    startTransition(async () => {
      const res = await sendMessageAction({ threadId: thread.id, body: text });
      if (!res.ok) {
        toast({ title: "Envoi impossible", description: res.error, tone: "error" });
        return;
      }
      setOptimistic((m) => [
        ...m,
        { id: res.data?.id ?? `tmp-${Date.now()}`, authorName: "Moi", mine: true, body: text, attachmentName: null, createdAt: new Date().toISOString() },
      ]);
      setBody("");
      router.refresh();
    });
  };

  return (
    <section aria-labelledby="thread-subject" className="flex min-h-0 flex-col rounded-3xl border border-line bg-gradient-card">
      <header className="border-b border-line px-5 py-4">
        <h2 id="thread-subject" className="truncate font-semibold text-blanc">
          {thread.subject}
        </h2>
        <p className="text-sm text-blanc/55">avec {thread.staffName}</p>
      </header>

      <ol ref={listRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-5 sm:px-5" style={{ maxHeight: "min(28rem, 50dvh)" }}>
        {messages.map((m) => (
          <li key={m.id} className={cn("flex", m.mine ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-4 py-2.5 sm:max-w-[75%]",
                m.mine ? "bg-or/15 text-blanc" : "border border-line bg-noir-soft/70 text-blanc/85",
              )}
            >
              <p className="text-xs font-semibold text-or-light/80">{m.mine ? "Moi" : m.authorName}</p>
              {isVoiceAttachment(m.attachmentName) && !m.id.startsWith("tmp-") ? (
                <>
                  <VoiceNote src={`/espace-etudiant/fichier?message=${m.id}`} label={`Message vocal de ${m.mine ? "moi" : m.authorName}`} />
                  <p className="mt-0.5 text-xs text-blanc/50">{m.body}</p>
                </>
              ) : (
                <p className="mt-0.5 text-sm whitespace-pre-wrap">{m.body}</p>
              )}
              {m.attachmentName && !isVoiceAttachment(m.attachmentName) && (
                <p className="mt-1 inline-flex items-center gap-1 text-xs text-or-light">
                  <Paperclip aria-hidden className="size-3" /> {m.attachmentName}
                </p>
              )}
              <p className="mt-1 text-right text-[0.68rem] text-blanc/40">{formatDateTime(m.createdAt, timezone)}</p>
            </div>
          </li>
        ))}
      </ol>

      <form onSubmit={send} className="flex flex-wrap items-end gap-2 border-t border-line p-3">
        <VoiceRecorder
          requestUpload={(mime, size) => requestVoiceUploadAction({ threadId: thread.id, mime, size })}
          send={(path, durationSec) => sendVoiceMessageAction({ threadId: thread.id, path, durationSec })}
          onSent={({ id, durationSec }) => {
            setOptimistic((m) => [
              ...m,
              { id: id ?? `tmp-${Date.now()}`, authorName: "Moi", mine: true, body: voiceLabel(durationSec), attachmentName: "message-vocal.webm", createdAt: new Date().toISOString() },
            ]);
            toast({ title: "Message vocal envoyé", tone: "success" });
            router.refresh();
          }}
          onError={(message) => toast({ title: "Message vocal", description: message, tone: "error" })}
        />
        <label htmlFor="reply" className="sr-only">
          Votre réponse
        </label>
        <textarea
          id="reply"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={2}
          maxLength={4000}
          placeholder="Écrire votre réponse…"
          className="min-h-11 min-w-40 flex-1 resize-none rounded-xl border border-or/15 bg-noir-soft px-3 py-2.5 text-sm text-blanc outline-none transition-colors placeholder:text-blanc/35 focus:border-or"
        />
        <button
          type="submit"
          disabled={pending || !body.trim()}
          aria-label="Envoyer"
          className="grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-or text-noir shadow-gold transition-[transform,box-shadow] hover:shadow-gold-lg active:scale-95 disabled:opacity-50"
        >
          <SendHorizonal aria-hidden className="size-5" />
        </button>
      </form>
    </section>
  );
}
