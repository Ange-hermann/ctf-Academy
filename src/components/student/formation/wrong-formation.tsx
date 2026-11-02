import { Compass } from "lucide-react";
import { EmptyState } from "@/components/student/ui/empty-state";
import { studentRoutes } from "@/config/student-nav";

/** Page d'une autre formation que celle de l'étudiant : message clair + retour au tableau de bord. */
export function WrongFormation({ expected, current }: { expected: string; current: string }) {
  return (
    <EmptyState
      icon={Compass}
      title={`Cette section concerne ${expected}`}
      description={`Vous êtes inscrit·e à ${current}. Votre espace regroupe les parcours et suivis de votre propre formation.`}
      action={{ label: "Retour au tableau de bord", href: studentRoutes.dashboard }}
    />
  );
}
