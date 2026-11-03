import { churchSidebarNav } from "@/content/navigation";

/**
 * Départements et ministères de l'Église : les stagiaires EDS servent dans
 * l'un d'eux. Liste aplatie : « Familles », « Familles — ECODIM », …
 */
export const churchDepartments: string[] = churchSidebarNav.flatMap((entry) => {
  if (!entry.slug) return []; // entrée de lien (CTF ACADEMY), pas un département
  return [entry.label, ...(entry.children ?? []).map((c) => `${entry.label} — ${c.label}`)];
});

/** Lieu fixe du stage des mentors EDM (décidé par l'équipe pastorale). */
export const EDM_STAGE_PLACE = "Vase d'honneur";

/** Formations dont les étudiants reçoivent un stage suivi par la plateforme. */
export const STAGE_FORMATIONS = ["eds", "edm", "diacres"] as const;

/** Chemin de la page « Mon stage » côté étudiant, selon sa formation. */
export function studentStageHref(formationSlug: string): string {
  if (formationSlug === "eds") return "/espace-etudiant/eds/stage";
  if (formationSlug === "edm") return "/espace-etudiant/edm/stage";
  return "/espace-etudiant/diacres/stage";
}

/**
 * Lieu du stage selon la formation :
 * - EDM → « Vase d'honneur » (imposé, le pasteur n'a rien à saisir)
 * - EDS → un département de l'Église, choisi dans la liste
 * - Diacres → lieu libre (accueil, protocole, etc.)
 */
export function resolveStagePlace(formationSlug: string, place: string): { ok: true; place: string } | { ok: false; error: string } {
  const trimmed = place.trim();
  if (formationSlug === "edm") return { ok: true, place: EDM_STAGE_PLACE };
  if (formationSlug === "eds") {
    if (churchDepartments.includes(trimmed)) return { ok: true, place: trimmed };
    return { ok: false, error: "Pour un étudiant EDS, le stage se fait dans un département de l'Église — choisissez-le dans la liste proposée." };
  }
  if (trimmed.length >= 3) return { ok: true, place: trimmed };
  return { ok: false, error: "Indiquez le lieu du stage." };
}
