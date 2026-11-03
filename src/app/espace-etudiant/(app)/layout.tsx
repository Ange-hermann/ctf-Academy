import { cookies } from "next/headers";
import { StudentShell } from "@/components/student/layout/student-shell";
import { SIDEBAR_COOKIE } from "@/config/student-nav";
import { getFormation } from "@/content/formations";
import { dispatchFicheReminders } from "@/lib/edm-reminders";
import { getShellData } from "@/lib/student/queries/shell";
import { requireStudent } from "@/lib/student/session";

export default async function StudentAppLayout({ children }: LayoutProps<"/espace-etudiant">) {
  const ctx = await requireStudent();
  // Rappels de fiche EDM : n'agit que pendant les fenêtres de rappel (vendredi 5 h 30, samedi 23 h 14).
  await dispatchFicheReminders();
  const store = await cookies();
  const formation = getFormation(ctx.enrollment.formation)!;

  return (
    <StudentShell
      user={{
        userId: ctx.userId,
        firstName: ctx.firstName,
        lastName: ctx.lastName,
        email: ctx.email,
        avatarUrl: ctx.avatarUrl,
      }}
      formation={{ slug: formation.slug, acronym: formation.acronym, name: formation.name }}
      shell={getShellData(ctx.userId)}
      initialCollapsed={store.get(SIDEBAR_COOKIE)?.value === "collapsed"}
    >
      <main id="contenu">{children}</main>
    </StudentShell>
  );
}
