import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { AdminIntro, AdminSection } from "@/components/admin/ui";
import { NewClassThreadForm } from "@/components/admin/controls";
import { adminRoutes } from "@/config/admin-nav";
import { requireAdminRoles } from "@/lib/admin/session";
import { getClassRoster, getClassThreads } from "@/lib/admin/queries";

export default async function ClassMessagesPage() {
  const ctx = await requireAdminRoles(["admin", "pedagogy", "trainer", "pastor"], `${adminRoutes.classroom}/messages`);
  const [threads, roster] = await Promise.all([getClassThreads(ctx), getClassRoster(ctx)]);

  return (
    <>
      <Link href={adminRoutes.classroom} className="mb-4 inline-flex items-center gap-1 text-sm text-or-light hover:text-or">
        <ChevronLeft aria-hidden className="size-4" /> Ma classe
      </Link>
      <AdminIntro
        title="Messagerie"
        subtitle="Échanges avec les étudiants de vos classes — ils vous lisent et répondent dans leur canal « Formateurs »."
      />

      <div className="space-y-6">
        <AdminSection title="Nouveau message">
          {roster.length ? (
            <NewClassThreadForm students={roster.map((s) => ({ userId: s.userId, name: s.name, formationSlug: s.formationSlug }))} />
          ) : (
            <p className="text-sm text-blanc/50">Aucun étudiant admis dans vos classes.</p>
          )}
        </AdminSection>

        <AdminSection title={`Discussions (${threads.length})`}>
          {threads.length ? (
            <ul className="divide-y divide-line/60">
              {threads.map((t) => (
                <li key={t.id}>
                  <Link href={`${adminRoutes.classroom}/messages/${t.id}`} className="-mx-2 flex items-center justify-between gap-4 rounded-lg px-2 py-3 transition-colors hover:bg-or/5">
                    <span className="min-w-0">
                      <span className="flex items-center gap-2">
                        <span className="truncate font-medium text-blanc">{t.subject}</span>
                        {t.unread > 0 && (
                          <span className="shrink-0 rounded-full bg-or/20 px-2 py-0.5 text-xs font-semibold text-or-light">{t.unread}</span>
                        )}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-blanc/50">
                        {t.studentName}
                        {t.lastMessage ? ` — ${t.lastMessage}` : ""}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-blanc/40">
                      {new Date(t.updatedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-blanc/50">Aucune discussion pour le moment. Écrivez à un étudiant ou attendez son premier message.</p>
          )}
        </AdminSection>
      </div>
    </>
  );
}
