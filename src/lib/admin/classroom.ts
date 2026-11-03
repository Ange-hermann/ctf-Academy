import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { getDb } from "@/lib/db";
import { hasAdminRole } from "@/lib/admin/session";
import type { StudentContext } from "@/lib/student/session";

/**
 * Périmètre « classe » de l'équipe pédagogique.
 * - admin / pedagogy : toutes les formations et tous les niveaux ;
 * - formateur : UNE classe = une formation + un niveau (ex. EDS niveau 2), ou aucune ;
 * - pastor : les formations du parcours pastoral (EDM et Diacres), tous niveaux.
 * Les étudiants d'une classe sont les admis de la formation dont le niveau en cours est ce niveau.
 */

type Db = NonNullable<ReturnType<typeof getDb>>;

/** Formations placées sous la responsabilité pastorale (cours, évaluations, progression). */
const PASTORAL_FORMATION_SLUGS = ["edm", "diacres"];

export type ClassUnit = { formationId: string; levelId: string | null };
export type ClassScope = { all: true } | { all: false; units: ClassUnit[] };

export async function getClassScope(db: Db, ctx: StudentContext): Promise<ClassScope> {
  if (hasAdminRole(ctx, ["admin", "pedagogy"])) return { all: true };
  const units: ClassUnit[] = [];
  if (hasAdminRole(ctx, ["pastor"])) {
    const formations = await db.formations.findMany({ where: { slug: { in: PASTORAL_FORMATION_SLUGS } }, select: { id: true } });
    units.push(...formations.map((f) => ({ formationId: f.id, levelId: null })));
  }
  const row = await db.trainer_assignments.findUnique({ where: { trainer_id: ctx.userId }, select: { formation_id: true, level_id: true } });
  if (row) units.push({ formationId: row.formation_id, levelId: row.level_id });
  return { all: false, units };
}

/** Aucune classe n'est affectée : toute lecture renvoie vide, toute écriture est refusée. */
export const noClass = (s: ClassScope) => !s.all && !s.units.length;

const NONE = "00000000-0000-0000-0000-000000000000";

/** Filtre par formation (tables sans niveau : candidatures, fils de discussion…). */
export const formationWhere = (s: ClassScope) => (s.all ? {} : { formation_id: { in: s.units.map((u) => u.formationId) } });

/** Modules de la classe : ceux des niveaux couverts par les unités. */
export function moduleWhere(s: ClassScope): Prisma.modulesWhereInput {
  if (s.all) return {};
  if (!s.units.length) return { id: NONE };
  return {
    OR: s.units.map((u) => ({ formation_id: u.formationId, ...(u.levelId ? { level_id: u.levelId } : {}) })),
  };
}

/** Évaluations de la classe : niveau de l'évaluation, ou à défaut niveau de son module. */
export function quizWhere(s: ClassScope): Prisma.quizzesWhereInput {
  if (s.all) return {};
  if (!s.units.length) return { id: NONE };
  return {
    OR: s.units.map((u) => ({
      formation_id: u.formationId,
      ...(u.levelId ? { OR: [{ level_id: u.levelId }, { level_id: null, modules: { level_id: u.levelId } }] } : {}),
    })),
  };
}

/** Planning et annonces de la classe (séances, événements, annonces ciblés sur les niveaux). */
export function plannedWhere(s: ClassScope) {
  if (s.all) return {};
  if (!s.units.length) return { id: NONE };
  return {
    OR: s.units.map((u) => ({ formation_id: u.formationId, ...(u.levelId ? { level_id: u.levelId } : {}) })),
  };
}

/** Un élément (formation + niveau) est-il dans la classe ? */
export function inClass(s: ClassScope, item: { formationId: string; levelId: string | null }) {
  if (s.all) return true;
  return s.units.some((u) => u.formationId === item.formationId && (!u.levelId || u.levelId === item.levelId));
}

/**
 * Niveau en cours de chaque inscription : premier niveau non validé (« granted »), dans l'ordre.
 * Une formation entièrement validée reste rattachée à son dernier niveau.
 */
export async function currentLevels(db: Db, apps: { user_id: string; formation_id: string }[]): Promise<Map<string, string | null>> {
  const result = new Map<string, string | null>();
  if (!apps.length) return result;
  const formationIds = [...new Set(apps.map((a) => a.formation_id))];
  const [levels, granted] = await Promise.all([
    db.levels.findMany({ where: { formation_id: { in: formationIds } }, orderBy: { number: "asc" }, select: { id: true, formation_id: true } }),
    db.validations.findMany({
      where: { kind: "level", decision: "granted", user_id: { in: apps.map((a) => a.user_id) }, level_id: { not: null } },
      select: { user_id: true, level_id: true },
    }),
  ]);
  const grantedSet = new Set(granted.map((g) => `${g.user_id}:${g.level_id}`));
  for (const a of apps) {
    const list = levels.filter((l) => l.formation_id === a.formation_id);
    const current = list.find((l) => !grantedSet.has(`${a.user_id}:${l.id}`)) ?? list[list.length - 1];
    result.set(`${a.user_id}:${a.formation_id}`, current?.id ?? null);
  }
  return result;
}

export type ClassMember = { userId: string; formationId: string; levelId: string | null; applicationId: string };

/** Étudiants admis de la classe (pour admin/pedagogy : tous les admis), avec leur niveau en cours. */
export async function classMembers(db: Db, s: ClassScope): Promise<ClassMember[]> {
  if (noClass(s)) return [];
  const apps = await db.applications.findMany({
    where: { admission_status: "admitted", ...formationWhere(s) },
    orderBy: { created_at: "asc" },
    select: { id: true, user_id: true, formation_id: true },
  });
  const levels = await currentLevels(db, apps);
  return apps
    .map((a) => ({ userId: a.user_id, formationId: a.formation_id, levelId: levels.get(`${a.user_id}:${a.formation_id}`) ?? null, applicationId: a.id }))
    .filter((m) => s.all || inClass(s, { formationId: m.formationId, levelId: m.levelId }));
}

export const classStudentIds = async (db: Db, s: ClassScope) => (await classMembers(db, s)).map((m) => m.userId);

export type ClassInfo = { formationId: string; slug: string; name: string; levelId: string | null; levelNumber: number | null; label: string };

/** Libellés des unités de classe, ex. « EDM », « Diacres », « EDS · Niveau 2 ». */
export async function describeUnits(db: Db, s: ClassScope): Promise<ClassInfo[]> {
  if (s.all || !s.units.length) return [];
  const formationIds = [...new Set(s.units.map((u) => u.formationId))];
  const levelIds = [...new Set(s.units.flatMap((u) => (u.levelId ? [u.levelId] : [])))];
  const [formations, levels] = await Promise.all([
    db.formations.findMany({ where: { id: { in: formationIds } }, select: { id: true, slug: true, name: true } }),
    levelIds.length ? db.levels.findMany({ where: { id: { in: levelIds } }, select: { id: true, number: true } }) : Promise.resolve([]),
  ]);
  const fMap = new Map(formations.map((f) => [f.id, f]));
  const lMap = new Map(levels.map((l) => [l.id, l.number]));
  return s.units.flatMap((u) => {
    const f = fMap.get(u.formationId);
    if (!f) return [];
    const num = u.levelId ? (lMap.get(u.levelId) ?? null) : null;
    return [{ formationId: f.id, slug: f.slug, name: f.name, levelId: u.levelId, levelNumber: num, label: `${f.slug.toUpperCase()}${num ? ` · Niveau ${num}` : ""}` }];
  });
}

/** Libellé de la classe — null pour l'admin (périmètre global) ou multi-unités. */
export async function describeClass(db: Db, s: ClassScope): Promise<ClassInfo | null> {
  if (s.all) return null;
  const infos = await describeUnits(db, s);
  return infos.length === 1 ? infos[0] : null;
}
