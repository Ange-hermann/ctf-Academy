import type { AdminRole } from "@/lib/admin/session";

/** Navigation de l'espace d'administration : chaque section est filtrée par les rôles autorisés. */

export const adminRoutes = {
  dashboard: "/admin",
  candidates: "/admin/candidatures",
  pedagogy: "/admin/pedagogie",
  corrections: "/admin/corrections",
  finance: "/admin/finances",
  stages: "/admin/stages",
  pastorale: "/admin/pastorale",
  access: "/admin/acces",
} as const;

export type AdminIcon =
  | "dashboard"
  | "candidates"
  | "pedagogy"
  | "corrections"
  | "finance"
  | "stages"
  | "pastorale"
  | "access";

export type AdminNavItem = {
  label: string;
  href: string;
  icon: AdminIcon;
  description: string;
  roles: readonly AdminRole[];
};

const ALL: readonly AdminRole[] = ["admin", "admissions", "pedagogy", "trainer", "finance", "supervisor", "pastor"];

export const adminNav: AdminNavItem[] = [
  {
    label: "Vue d'ensemble",
    href: adminRoutes.dashboard,
    icon: "dashboard",
    description: "Supervision globale",
    roles: ALL,
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
    roles: ["admin", "pedagogy", "trainer"],
  },
  {
    label: "Corrections",
    href: adminRoutes.corrections,
    icon: "corrections",
    description: "Copies à corriger et retours",
    roles: ["admin", "trainer", "pedagogy"],
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
    roles: ["admin", "supervisor"],
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
];

export const adminNavFor = (roles: string[]) => adminNav.filter((item) => item.roles.some((r) => roles.includes(r)));
