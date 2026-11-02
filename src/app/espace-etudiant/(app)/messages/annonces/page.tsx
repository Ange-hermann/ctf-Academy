import { Megaphone } from "lucide-react";
import { AnnouncementList } from "@/components/student/messages/announcement-list";
import { EmptyState } from "@/components/student/ui/empty-state";
import { StudentPageHeader } from "@/components/student/ui/page-header";
import { studentRoutes } from "@/config/student-nav";
import { getAnnouncements } from "@/lib/student/queries/messages";
import { requireStudent } from "@/lib/student/session";

export const metadata = { title: "Annonces" };

const route = `${studentRoutes.messages}/annonces`;

export default async function AnnouncementsPage() {
  const ctx = await requireStudent(route);
  const announcements = await getAnnouncements(ctx);

  return (
    <>
      <StudentPageHeader
        title="Annonces"
        description="Les nouvelles de l'Académie et de votre formation. Touchez une annonce pour la lire en entier."
        crumbs={[
          { label: "Messages et assistance", href: studentRoutes.messages },
          { label: "Annonces", href: route },
        ]}
      />

      {announcements.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="Aucune annonce"
          description="Les annonces de l'Académie et de votre formation apparaîtront ici."
        />
      ) : (
        <AnnouncementList items={announcements} timezone={ctx.timezone} />
      )}
    </>
  );
}
