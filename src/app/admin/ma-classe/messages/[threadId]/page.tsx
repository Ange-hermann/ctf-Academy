import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { AdminIntro, AdminSection } from "@/components/admin/ui";
import { ClassThreadReply, MarkClassRead } from "@/components/admin/controls";
import { adminRoutes } from "@/config/admin-nav";
import { requireAdminRoles } from "@/lib/admin/session";
import { getClassThread } from "@/lib/admin/queries";
import { VoiceNote } from "@/components/messages/voice-recorder";
import { isVoiceAttachment } from "@/lib/messages/voice";
import { cn } from "@/lib/utils";

export default async function ClassThreadPage({ params }: PageProps<"/admin/ma-classe/messages/[threadId]">) {
  const { threadId } = await params;
  const ctx = await requireAdminRoles(["admin", "pedagogy", "trainer", "pastor"], `${adminRoutes.classroom}/messages/${threadId}`);
  const thread = await getClassThread(ctx, threadId);
  if (!thread) notFound();

  return (
    <>
      <MarkClassRead threadId={thread.id} />
      <Link href={`${adminRoutes.classroom}/messages`} className="mb-4 inline-flex items-center gap-1 text-sm text-or-light hover:text-or">
        <ChevronLeft aria-hidden className="size-4" /> Messagerie
      </Link>
      <AdminIntro title={thread.subject} subtitle={`Discussion avec ${thread.studentName}`} />

      <AdminSection title="Conversation">
        <ol className="space-y-3">
          {thread.messages.map((m) => (
            <li key={m.id} className={cn("max-w-[85%] rounded-2xl px-4 py-3", m.mine ? "ml-auto border border-or/40 bg-or/10" : "border border-line bg-noir-soft")}>
              <p className="text-xs font-medium text-blanc/50">
                {m.authorName} · {new Date(m.createdAt).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              </p>
              {isVoiceAttachment(m.attachmentName) ? (
                <>
                  <VoiceNote src={`/admin/fichier?message=${m.id}`} label={`Message vocal de ${m.authorName}`} />
                  <p className="mt-0.5 text-xs text-blanc/50">{m.body}</p>
                </>
              ) : (
                <p className="mt-1 text-sm whitespace-pre-line text-blanc">{m.body}</p>
              )}
              {m.attachmentName && !isVoiceAttachment(m.attachmentName) && (
                <a href={`/admin/fichier?message=${m.id}&telecharger=1`} className="mt-1 inline-block text-xs text-or-light underline-offset-2 hover:underline">
                  Pièce jointe : {m.attachmentName}
                </a>
              )}
            </li>
          ))}
        </ol>
        <div className="mt-5 border-t border-line/60 pt-4">
          <ClassThreadReply threadId={thread.id} />
        </div>
      </AdminSection>
    </>
  );
}
