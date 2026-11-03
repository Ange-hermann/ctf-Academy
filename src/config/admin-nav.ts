import type { AdminRole } from "@/lib/admin/session";

/** Navigation de l'espace d'administration : chaque section est filtrée par les rôles autorisés. */

export const adminRoutes = {
  dashboard: "/admin",
  candidates: "/admin/candidatures",
  pedagogy: "/admin/pedagogie",
  classroom: "/admin/ma-classe",
  corrections: "/admin/corrections",
  finance: "/admin/finances",
  stages: "/admin/stages",
  diacres: "/admin/diacres",
  edm: "/admin/edm",
  pastorale: "/admin/pastorale",
  access: "/admin/acces",
  assistance: "/admin/assistance",
  journal: "/admin/journal",
  settings: "/admin/parametres",
} as const;

export type AdminIcon =
  | "dashboard"
  | "candidates"
  | "pedagogy"
  | "classroom"
  | "corrections"
  | "finance"
  | "stages"
  | "diacres"
  | "edm"
  | "pastorale"
  | "access"
  | "assistance"
  | "journal"
  | "settings";

export type AdminNavItem = {
  label: string;
  href: string;
  icon: AdminIcon;
  description: string;
  roles: readonly AdminRole[];
};

export const adminNav: AdminNavItem[] = [
  {
    label: "Vue d'ensemble",
    href: adminRoutes.dashboard,
    icon: "dashboard",
    description: "Supervision globale",
    roles: ["admin", "admissions", "pedagogy", "trainer", "supervisor", "pastor"],
  },
  {
    label: "Candidatures",
    href: adminRoutes.candidates,
    icon: "candidates",
    description: "Dossiers, admissions, inscriptions",
    roles: ["admin", "admissions", "pastor"],
  },
  {
    label: "Pédagogie",
    href: adminRoutes.pedagogy,
    icon: "pedagogy",
    description: "Programmes, modules, progression",
    roles: ["admin", "pedagogy", "trainer", "pastor"],
  },
  {
    label: "Ma classe",
    href: adminRoutes.classroom,
    icon: "classroom",
    description: "Étudiants, contenus et évaluations",
    roles: ["admin", "pedagogy", "trainer", "pastor"],
  },
  {
    label: "Corrections",
    href: adminRoutes.corrections,
    icon: "corrections",
    description: "Copies à corriger et retours",
    roles: ["admin", "trainer", "pedagogy", "pastor"],
  },
  {
    label: "Finances",
    href: adminRoutes.finance,
    icon: "finance",
    description: "Paiements, reçus, échéances",
    roles: ["admin", "finance"],
  },
  {
    label: "Stages & mémoires",
    href: adminRoutes.stages,
    icon: "stages",
    description: "Stages, rapports, versions, soutenances",
    roles: ["admin", "supervisor", "pastor"],
  },
  {
    label: "Diacres",
    href: adminRoutes.diacres,
    icon: "diacres",
    description: "Parcours des étudiants diacres",
    roles: ["admin", "supervisor", "pastor"],
  },
  {
    label: "Étudiants EDM",
    href: adminRoutes.edm,
    icon: "edm",
    description: "Fiches de transformation hebdomadaires",
    roles: ["admin", "pastor"],
  },
  {
    label: "Équipe pastorale",
    href: adminRoutes.pastorale,
    icon: "pastorale",
    description: "Évaluations, affectations, consécration",
    roles: ["admin", "pastor"],
  },
  {
    label: "Accès & rôles",
    href: adminRoutes.access,
    icon: "access",
    description: "Attribution des profils",
    roles: ["admin"],
  },
  {
    label: "Assistance",
    href: adminRoutes.assistance,
    icon: "assistance",
    description: "Messages administratifs et tickets",
    roles: ["admin", "admissions"],
  },
  {
    label: "Journal",
    href: adminRoutes.journal,
    icon: "journal",
    description: "Traçabilité des actions",
    roles: ["admin"],
  },
  {
    label: "Paramètres",
    href: adminRoutes.settings,
    icon: "settings",
    description: "Réglages du site",
    roles: ["admin"],
  },
];

export const adminNavFor = (roles: string[]) => adminNav.filter((item) => item.roles.some((r) => roles.includes(r)));
