import { ThreadCategoryPage } from "@/components/student/messages/category-page";
import { studentRoutes } from "@/config/student-nav";

export const metadata = { title: "Messages — Administratif" };

const route = `${studentRoutes.messages}/administratif`;

export default function AdminMessagesPage({ searchParams }: PageProps<"/espace-etudiant/messages/administratif">) {
  return (
    <ThreadCategoryPage
      category="administrative"
      title="Administratif"
      description="Vos échanges avec l'administration : dossier, paiements, attestations et vie pratique."
      route={route}
      searchParams={searchParams}
    />
  );
}
