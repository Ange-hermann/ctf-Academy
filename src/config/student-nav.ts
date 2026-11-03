import type { FormationSlug } from "@/content/formations";

/** Routes de l'espace étudiant. Les routes de formation ne sont accessibles qu'aux étudiants concernés (proxy + RLS). */
export const studentRoutes = {
  dashboard: "/espace-etudiant",
  application: "/espace-etudiant/candidature",
  courses: "/espace-etudiant/cours",
  assessments: "/espace-etudiant/evaluations",
  progress: "/espace-etudiant/progression",
  calendar: "/espace-etudiant/calendrier",
  payments: "/espace-etudiant/paiements",
  validations: "/espace-etudiant/validations",
  messages: "/espace-etudiant/messages",
  compass: "/espace-etudiant/boussole",
  profile: "/espace-etudiant/profil",
} as const;

export const moduleHref = (moduleSlug: string) => `${studentRoutes.courses}/${moduleSlug}`;
export const lessonHref = (moduleSlug: string, lessonSlug: string) => `${moduleHref(moduleSlug)}/${lessonSlug}`;
export const assessmentHref = (id: string) => `${studentRoutes.assessments}/${id}`;
export const resultHref = (id: string, attemptId?: string) =>
  `${assessmentHref(id)}/resultat${attemptId ? `?tentative=${attemptId}` : ""}`;

/** Clés d'icônes (résolues côté client : les composants ne traversent pas la frontière serveur → client). */
export type StudentIcon =
  | "dashboard" | "courses" | "assessments" | "progress" | "calendar" | "payments" | "validations" | "messages"
  | "compass" | "profile" | "levels" | "exercises" | "graduation" | "service" | "mentoring" | "leadership"
  | "responsibilities" | "internship" | "report" | "thesis" | "consecration" | "fiche";

export type StudentNavItem = { label: string; href: string; icon: StudentIcon; description: string };

export const studentMainNav: StudentNavItem[] = [
  { label: "Tableau de bord", href: studentRoutes.dashboard, icon: "dashboard", description: "Où j'en suis, quoi faire maintenant" },
  { label: "Mes cours", href: studentRoutes.courses, icon: "courses", description: "Modules, leçons, vidéos, PDF et Zoom" },
  { label: "Mes évaluations", href: studentRoutes.assessments, icon: "assessments", description: "Quiz, exercices, examens et résultats" },
  { label: "Ma progression", href: studentRoutes.progress, icon: "progress", description: "Leçons, résultats et niveaux validés" },
  { label: "Mon calendrier", href: studentRoutes.calendar, icon: "calendar", description: "Cours en direct, échéances, évaluations" },
  { label: "Mes paiements", href: studentRoutes.payments, icon: "payments", description: "Montants réglés, échéances et reçus" },
  { label: "Mes validations", href: studentRoutes.validations, icon: "validations", description: "Attestations et décisions officielles" },
  { label: "Messages et assistance", href: studentRoutes.messages, icon: "messages", description: "Annonces, formateurs, assistance" },
  { label: "Ma boussole", href: studentRoutes.compass, icon: "compass", description: "La Vision et les 5 mots clés" },
];

export const formationBase: Record<FormationSlug, string> = {
  eds: "/espace-etudiant/eds",
  edm: "/espace-etudiant/edm",
  diacres: "/espace-etudiant/diacres",
  pastorale: "/espace-etudiant/pastorale",
};

export const formationNav: Record<FormationSlug, StudentNavItem[]> = {
  eds: [
    { label: "Cours des 4 niveaux", href: "/espace-etudiant/eds/niveaux", icon: "levels", description: "Les paliers de l'École des STAFs" },
    { label: "Quiz et exercices", href: "/espace-etudiant/eds/exercices", icon: "exercises", description: "Banque d'évaluations par niveau" },
    { label: "Validation des niveaux", href: "/espace-etudiant/eds/validation", icon: "validations", description: "Critères et décisions" },
    { label: "Graduation STAF", href: "/espace-etudiant/eds/graduation", icon: "graduation", description: "Conditions et cérémonie" },
    { label: "Reconnaissance du service", href: "/espace-etudiant/eds/service", icon: "service", description: "Heures et attestation" },
    { label: "Suivi du stage pratique", href: "/espace-etudiant/eds/stage", icon: "internship", description: "Département, étapes, heures" },
  ],
  edm: [
    { label: "Fiche de transformation", href: "/espace-etudiant/edm/fiche", icon: "fiche", description: "Rapport hebdomadaire du mentor" },
    { label: "Cours des 2 niveaux", href: "/espace-etudiant/edm/niveaux", icon: "levels", description: "Les paliers de l'EDM" },
    { label: "Exercices de mentorat", href: "/espace-etudiant/edm/mentorat", icon: "mentoring", description: "Rencontres et comptes rendus" },
    { label: "Travaux de leadership", href: "/espace-etudiant/edm/leadership", icon: "leadership", description: "Travaux à rendre et retours" },
    { label: "Validation du parcours", href: "/espace-etudiant/edm/validation", icon: "validations", description: "Critères et décision" },
    { label: "Suivi des responsabilités", href: "/espace-etudiant/edm/responsabilites", icon: "responsibilities", description: "Rôles confiés et suivi" },
    { label: "Suivi du stage pratique", href: "/espace-etudiant/edm/stage", icon: "internship", description: "Vase d'honneur, étapes, heures" },
  ],
  diacres: [
    { label: "Cours et évaluations", href: "/espace-etudiant/diacres/cours", icon: "courses", description: "Modules et évaluations" },
    { label: "Suivi du stage pratique", href: "/espace-etudiant/diacres/stage", icon: "internship", description: "Étapes, heures, journal" },
    { label: "Rapport de stage", href: "/espace-etudiant/diacres/rapport", icon: "report", description: "Versions et commentaires" },
    { label: "Mémoire et soutenance", href: "/espace-etudiant/diacres/memoire", icon: "thesis", description: "Dépôt, commentaires, soutenance" },
    { label: "Évaluation pastorale", href: "/espace-etudiant/diacres/consecration", icon: "consecration", description: "Évaluations et consécration" },
  ],
  // TODO: fonctions spécifiques de l'École de pastorale à définir par l'équipe pédagogique.
  pastorale: [
    {
      label: "Fonctions de l'École",
      href: "/espace-etudiant/pastorale/fonctions",
      icon: "courses",
      description: "Fonctions spécifiques à définir",
    },
  ],
};

/** Barre du bas (mobile) : 4 entrées + « Plus ». */
export const bottomNav: StudentNavItem[] = [
  { label: "Accueil", href: studentRoutes.dashboard, icon: "dashboard", description: "" },
  { label: "Cours", href: studentRoutes.courses, icon: "courses", description: "" },
  { label: "Évaluations", href: studentRoutes.assessments, icon: "assessments", description: "" },
  { label: "Calendrier", href: studentRoutes.calendar, icon: "calendar", description: "" },
];

/** Préférence « barre latérale repliée » (lue côté serveur : aucun décalage de mise en page). */
export const SIDEBAR_COOKIE = "ctf_sidebar";

export const isActiveHref = (pathname: string, href: string) =>
  href === studentRoutes.dashboard ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
