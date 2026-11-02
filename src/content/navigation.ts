import {
  BookOpen,
  Church,
  ClipboardList,
  Compass,
  Cross,
  DoorOpen,
  Eye,
  GraduationCap,
  Music,
  SlidersVertical,
  Sprout,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";

/**
 * Navigation de CTF ACADEMY — SOURCE UNIQUE.
 * Barre latérale publique (7 entrées de la maquette), barre supérieure (5 entrées),
 * méga-menus, menu plein écran et pied de page lisent tous ce fichier.
 * Ne jamais dupliquer ces listes dans les composants.
 */

export type NavLink = { label: string; href: string; description?: string; icon?: LucideIcon };
export type NavSection = {
  label: string;
  /** Libellé affiché dans la barre supérieure s'il diffère du libellé de section. */
  topbarLabel?: string;
  href: string;
  description: string;
  icon: LucideIcon;
  children: NavLink[];
};

export const routes = {
  home: "/",
  academy: "/ctf-academy",
  register: "/inscription",
  login: "/compte/connexion",
  signup: "/compte/creer",
  application: "/compte/candidature",
  forgotPassword: "/compte/mot-de-passe-oublie",
  resetPassword: "/compte/reinitialiser",
  studentSpace: "/espace-etudiant",
  admin: "/admin",
  pricing: "/formations/durees-objectifs-tarifs",
  faq: "/admissions/faq",
  photos: "/galerie/photos",
  videos: "/galerie/videos",
  events: "/evenements",
} as const;

export const registerFor = (formation?: string) =>
  formation ? `${routes.register}?formation=${formation}` : routes.register;

/** Barre supérieure — libellés exacts de la maquette. */
export const mainNav: NavSection[] = [
  {
    label: "Découvrir CTF",
    topbarLabel: "Accueil",
    href: "/decouvrir",
    description: "Notre identité, notre vision et notre Église.",
    icon: Compass,
    children: [
      { label: "Qui sommes-nous ?", href: "/decouvrir/qui-sommes-nous", description: "Histoire et identité de CTF ACADEMY" },
      { label: "Notre vision et mission", href: "/decouvrir/vision-mission", description: "La Vision et les 5 mots clés" },
      { label: "Objectif de l'église", href: "/decouvrir/objectifs", description: "Les 5 objectifs de l'Église" },
      { label: "Nos valeurs", href: "/decouvrir/valeurs", description: "Adoration, Transformation, Guérison, Famille, Excellence" },
      { label: "Notre Église", href: "/decouvrir/notre-eglise", description: "Lieux, cultes et vie de l'Église" },
    ],
  },
  {
    label: "Formation",
    href: "/formations",
    description: "Quatre parcours pour grandir et servir.",
    icon: GraduationCap,
    children: [
      { label: "EDS — École des STAFs", href: "/formations/eds", description: "4 niveaux pour servir avec excellence" },
      { label: "EDM — École des Disciples Mentors", href: "/formations/edm", description: "2 niveaux de mentorat et de leadership" },
      { label: "Formation des diacres", href: "/formations/diacres", description: "Cours, stage, mémoire et consécration" },
      { label: "École de pastorale", href: "/formations/pastorale", description: "Former les pasteurs de demain" },
      { label: "Durées, objectifs et tarifs", href: routes.pricing, description: "Comparer les 4 formations" },
    ],
  },
  {
    label: "Admission",
    href: "/admissions",
    description: "Tout pour préparer votre candidature.",
    icon: ClipboardList,
    children: [
      { label: "Conditions d'accès", href: "/admissions/conditions", description: "Les critères par formation" },
      { label: "Calendrier des sessions", href: "/admissions/calendrier", description: "Prochaines sessions et dates limites" },
      { label: "Frais et paiements", href: "/admissions/frais-paiements", description: "Montants et moyens de paiement" },
      { label: "Questions fréquentes", href: routes.faq, description: "Les réponses à vos questions" },
    ],
  },
  {
    label: "Mon compte",
    href: "/compte",
    description: "Connexion et suivi de candidature.",
    icon: UserRound,
    children: [
      { label: "Se connecter", href: routes.login, description: "Accéder à mon espace" },
      { label: "Créer un compte", href: routes.signup, description: "En moins d'une minute" },
      { label: "Suivre ma candidature", href: routes.application, description: "Inscription, paiement, admission" },
      { label: "Mot de passe oublié", href: routes.forgotPassword, description: "Recevoir un lien de réinitialisation" },
    ],
  },
];

/** Médiathèque : rubriques ajoutées par la refonte (menu plein écran, tiroir mobile). */
export const mediaNav: NavLink[] = [
  { label: "Photos", href: routes.photos, description: "Albums et moments forts" },
  { label: "Vidéo", href: routes.videos, description: "Cultes, enseignements, témoignages" },
  { label: "Événements", href: routes.events, description: "Agenda de l'Église et de l'Académie" },
];

export const findSection = (href: string) => mainNav.find((s) => s.href === href)!;

/* ───────── Barre latérale publique (maquette : 6 entrées) ───────── */

export type SidebarEntry = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** « vision » : la page Vision active l'entrée sans préfixe exact. */
  match: "exact" | "vision";
};

export const publicSidebarNav: SidebarEntry[] = [
  { label: "CTF CHURCH", href: "/", icon: Church, match: "exact" },
  { label: "CTF ACADEMY", href: routes.academy, icon: GraduationCap, match: "exact" },
  { label: "École des STAFs", href: "/formations/eds", icon: Users, match: "exact" },
  { label: "École des Mentors", href: "/formations/edm", icon: UserRound, match: "exact" },
  { label: "École des Diacres", href: "/formations/diacres", icon: Cross, match: "exact" },
  { label: "École de pastorale", href: "/formations/pastorale", icon: BookOpen, match: "exact" },
  { label: "La vision de CTF", href: "/decouvrir/vision-mission", icon: Eye, match: "vision" },
];

/* ───────── Barre latérale de la page CTF CHURCH (`/`) ─────────
 * Ministères de l'Église : chaque entrée ouvre le panneau du grand cadre
 * (`/?departement=<slug>`) — pas de page dédiée pour l'instant (// TODO). */

export type ChurchSidebarChild = { label: string; slug: string };
export type ChurchSidebarEntry = {
  label: string;
  icon: LucideIcon;
  /** Identifiant du panneau affiché dans le grand cadre de `/`. */
  slug?: string;
  /** Présent uniquement si la page existe (vrai lien de navigation). */
  href?: string;
  /** Sous-ministères affichés en accordéon. */
  children?: ChurchSidebarChild[];
};

/** URL qui affiche le panneau d'un ministère dans le grand cadre de `/`. */
export const churchPanelHref = (slug: string) => `/?departement=${slug}`;

export const churchSidebarNav: ChurchSidebarEntry[] = [
  {
    label: "Familles",
    slug: "familles",
    icon: Users,
    children: [
      { label: "ECODIM", slug: "ecodim" },
      { label: "Teens", slug: "teens" },
      { label: "Jeunesse", slug: "jeunesse" },
      { label: "Les Malkia (femmes)", slug: "malkia" },
      { label: "Les Couples", slug: "couples" },
    ],
  },
  {
    label: "Expansion",
    slug: "expansion",
    icon: Sprout,
    children: [
      { label: "Les Tribus", slug: "tribus" },
      { label: "Time for Change", slug: "time-for-change" },
      { label: "Évangélisation", slug: "evangelisation" },
      { label: "ADN (accueil des nouveaux)", slug: "adn" },
      { label: "Dénombrement", slug: "denombrement" },
      { label: "Cellule de famille", slug: "cellule-de-famille" },
      { label: "Finance", slug: "finance" },
    ],
  },
  {
    label: "Les Portiers",
    slug: "portiers",
    icon: DoorOpen,
    children: [
      { label: "Harmonie visuelle", slug: "harmonie-visuelle" },
      { label: "Protocole", slug: "protocole" },
      { label: "Accueil", slug: "accueil" },
      { label: "Sécurité", slug: "securite" },
      { label: "Commandos", slug: "commandos" },
    ],
  },
  {
    label: "Les Musiques",
    slug: "musiques",
    icon: Music,
    children: [
      { label: "CTF Choir", slug: "ctf-choir" },
      { label: "EAM (École d'Adoration par la Musique)", slug: "eam" },
    ],
  },
  {
    label: "Technique",
    slug: "technique",
    icon: SlidersVertical,
    children: [
      { label: "Sonorisation", slug: "sonorisation" },
      { label: "Branding", slug: "branding" },
      { label: "Audiovisuel", slug: "audiovisuel" },
      { label: "La Communication", slug: "communication" },
    ],
  },
  { label: "CTF ACADEMY", href: routes.academy, icon: GraduationCap },
];

/**
 * Entrée active de la barre latérale publique.
 * Les pages sans correspondance n'activent rien (-1).
 */
export function activeSidebarIndex(pathname: string): number {
  if (pathname === "/") return 0;
  const i = publicSidebarNav.findIndex((e) => e.match === "exact" && (pathname === e.href || pathname.startsWith(`${e.href}/`)));
  if (i > 0) return i;
  if (pathname === "/decouvrir/vision-mission" || pathname.startsWith("/decouvrir/vision-mission")) return 6;
  return -1;
}
