import "server-only";
import type { Tx } from "@/lib/student/session";

/**
 * Niveaux de l'étudiant (lus sous RLS : ses formations et ses propres validations).
 * - current : niveau en cours par formation (premier niveau non validé ; le dernier si tout est validé) ;
 * - unlocked : niveaux validés + niveau en cours.
 * Sert à cibler le planning et les annonces d'une classe (formation + niveau).
 */
export async function getStudentLevels(tx: Tx): Promise<{ current: Set<string>; unlocked: Set<string> }> {
  const [levels, granted] = await Promise.all([
    tx.levels.findMany({ orderBy: [{ formation_id: "asc" }, { number: "asc" }], select: { id: true, formation_id: true } }),
    tx.validations.findMany({ where: { kind: "level", decision: "granted", level_id: { not: null } }, select: { level_id: true } }),
  ]);
  const done = new Set(granted.map((g) => g.level_id!));
  const current = new Set<string>();
  const unlocked = new Set<string>();
  const byFormation = new Map<string, string[]>();
  for (const l of levels) byFormation.set(l.formation_id, [...(byFormation.get(l.formation_id) ?? []), l.id]);
  for (const ids of byFormation.values()) {
    const cur = ids.find((id) => !done.has(id)) ?? ids[ids.length - 1];
    if (cur) current.add(cur);
    for (const id of ids) {
      if (done.has(id) || id === cur) unlocked.add(id);
      if (id === cur) break;
    }
  }
  return { current, unlocked };
}

/** Élément visible pour l'étudiant : toute la formation (pas de niveau) ou un niveau de la liste. */
export const forLevels = (levelId: string | null, allowed: Set<string>) => !levelId || allowed.has(levelId);
