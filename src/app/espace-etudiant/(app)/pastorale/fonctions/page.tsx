import { BookOpen } from "lucide-react";
import { EmptyState } from "@/components/student/ui/empty-state";
import { StudentPageHeader } from "@/components/student/ui/page-header";
import { formationBase } from "@/config/student-nav";
import { requireStudent } from "@/lib/student/session";

export const metadata = { title: "Fonctions de l'École de pastorale" };

/** Fonctions spécifiques à l'École de pastorale — périmètre à définir par l'équipe pédagogique. */
export default async function PastoraleFonctionsPage() {
  await requireStudent(`${formationBase.pastorale}/fonctions`);
  // TODO: fonctions spécifiques à définir (modules communs déjà disponibles :
  // cours, évaluations, progression, calendrier, paiements, validations, messages).
  return (
    <>
      <StudentPageHeader
        title="Fonctions de l'École de pastorale"
        description="Les outils propres à votre formation seront définis par l'équipe pédagogique."
        crumbs={[{ label: "Fonctions de l'École", href: `${formationBase.pastorale}/fonctions` }]}
      />
      <section className="rounded-3xl border border-line bg-gradient-card p-6">
        <EmptyState
          icon={BookOpen}
          title="Fonctions à définir"
          description="Les fonctions spécifiques de l'École de pastorale seront annoncées ici. En attendant, vos cours, évaluations, progression, calendrier, paiements, validations et messages restent accessibles depuis le menu de l'espace étudiant."
        />
      </section>
    </>
  );
}
