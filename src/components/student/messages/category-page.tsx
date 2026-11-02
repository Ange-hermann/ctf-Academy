import Link from "next/link";
import { ArrowLeft, Inbox, MessageSquareText } from "lucide-react";
import { NewThreadForm } from "@/components/student/messages/new-thread-form";
import { ThreadView } from "@/components/student/messages/thread-view";
import { EmptyState } from "@/components/student/ui/empty-state";
import { StudentPageHeader } from "@/components/student/ui/page-header";
import { studentRoutes } from "@/config/student-nav";
import { formatShortDate } from "@/lib/student/format";
import { getThread, getThreads, type ThreadCategory } from "@/lib/student/queries/messages";
import { requireStudent } from "@/lib/student/session";
import { cn } from "@/lib/utils";

/**
 * Page d'une catégorie de messages (formateurs / administratif) :
 * liste des fils à gauche, fil ouvert (`?fil=`) à droite. Sur mobile, un seul panneau à la fois.
 */
export async function ThreadCategoryPage({
  category,
  title,
  description,
  route,
  searchParams,
}: {
  category: ThreadCategory;
  title: string;
  description: string;
  route: string;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ctx = await requireStudent(route);
  const [threads, sp] = await Promise.all([getThreads(ctx, category), searchParams]);
  const fil = typeof sp.fil === "string" ? sp.fil : null;
  const thread = fil ? await getThread(ctx, fil) : null;

  return (
    <>
      <StudentPageHeader
        title={title}
        description={description}
        crumbs={[
          { label: "Messages et assistance", href: studentRoutes.messages },
          { label: title, href: route },
        ]}
      />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
        {/* Liste des fils — cachée sur mobile quand un fil est ouvert */}
        <section
          aria-labelledby="threads-title"
          className={cn("rounded-3xl border border-line bg-gradient-card p-4 sm:p-5", thread && "hidden xl:block")}
        >
          <div className="flex items-center justify-between px-1">
            <h2 id="threads-title" className="font-sans text-sm font-semibold tracking-[0.18em] text-or-light uppercase">
              Discussions
            </h2>
            <span className="text-xs text-blanc/45 tabular">{threads.length}</span>
          </div>
          {threads.length === 0 ? (
            <p className="px-1 py-6 text-sm text-blanc/55">Aucune discussion pour le moment. Écrivez votre premier message ci-dessous.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {threads.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`${route}?fil=${t.id}`}
                    aria-current={thread?.id === t.id ? "page" : undefined}
                    className={cn(
                      "block rounded-2xl border px-4 py-3 transition-colors",
                      thread?.id === t.id ? "border-or/50 bg-or/10" : "border-line bg-noir-soft/50 hover:border-or/35 hover:bg-or/5",
                    )}
                  >
                    <span className="flex items-baseline gap-2">
                      <span className={cn("min-w-0 flex-1 truncate text-sm", t.unread ? "font-semibold text-blanc" : "text-blanc/80")}>
                        {t.subject}
                      </span>
                      {t.unread > 0 && (
                        <span aria-label={`${t.unread} non lu${t.unread > 1 ? "s" : ""}`} className="grid min-w-5 place-items-center rounded-full bg-gradient-or px-1.5 text-[0.65rem] leading-5 font-bold text-noir">
                          {t.unread}
                        </span>
                      )}
                      <time className="shrink-0 text-xs text-blanc/40">{formatShortDate(t.updatedAt, ctx.timezone)}</time>
                    </span>
                    <span className="mt-1 block truncate text-xs text-blanc/50">
                      {t.staffName}
                      {t.lastMessage ? ` — ${t.lastMessage}` : ""}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <NewThreadForm category={category} baseHref={route} />
        </section>

        {/* Fil ouvert */}
        {thread ? (
          <div>
            <Link href={route} className="mb-3 inline-flex items-center gap-1.5 text-sm text-or-light hover:underline xl:hidden">
              <ArrowLeft aria-hidden className="size-4" /> Toutes les discussions
            </Link>
            <ThreadView key={thread.id} thread={thread} timezone={ctx.timezone} />
          </div>
        ) : (
          <div className="hidden xl:block">
            <EmptyState
              icon={threads.length ? MessageSquareText : Inbox}
              title={threads.length ? "Sélectionnez une discussion" : "Aucune discussion ouverte"}
              description={
                threads.length
                  ? "Choisissez un fil dans la liste pour lire la conversation et y répondre."
                  : "Ouvrez une première discussion avec « Nouveau message » : l'équipe vous répondra ici."
              }
            />
          </div>
        )}
      </div>
    </>
  );
}
