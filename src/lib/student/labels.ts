import type { LessonKind, LevelStatus } from "@/lib/student/queries/learning";

/** Libellés français des types de leçons (partagés serveur/client). */
export const lessonKindLabels: Record<LessonKind, string> = {
  video: "Vidéo",
  audio: "Audio",
  text: "Lecture",
  pdf: "Document PDF",
  live: "Séance en direct",
};

/** Libellés des statuts de niveau / étape. */
export const levelStatusLabels: Record<LevelStatus, string> = {
  validated: "Validé",
  pending_decision: "En attente de décision",
  current: "En cours",
  upcoming: "À venir",
  locked: "Verrouillé",
};
