import { ThreadCategoryPage } from "@/components/student/messages/category-page";
import { studentRoutes } from "@/config/student-nav";

export const metadata = { title: "Messages — Formateurs" };

const route = `${studentRoutes.messages}/formateurs`;

export default function TrainerMessagesPage({ searchParams }: PageProps<"/espace-etudiant/messages/formateurs">) {
  return (
    <ThreadCategoryPage
      category="trainer"
      title="Formateurs"
      description="Vos échanges avec l'équipe pédagogique : questions de cours, encadrement et accompagnement."
      route={route}
      searchParams={searchParams}
    />
  );
}
