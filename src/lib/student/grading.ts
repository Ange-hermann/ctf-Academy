/** Correction des réponses — fonctions pures, exécutées côté serveur uniquement. */

export type QuestionKind = "single" | "multiple" | "true_false" | "short" | "long" | "file" | "match";
export type OptionItem = { id: string; label: string };
export type MatchOptions = { left: OptionItem[]; right: OptionItem[] };

export type QuestionOptions = OptionItem[] | MatchOptions | null;

export const parseOptions = (raw: unknown, kind: QuestionKind): QuestionOptions => {
  if (kind === "match") {
    const m = raw as MatchOptions | null;
    return m && Array.isArray(m.left) && Array.isArray(m.right) ? m : { left: [], right: [] };
  }
  return Array.isArray(raw) ? (raw as OptionItem[]).filter((o) => o && typeof o.id === "string") : [];
};

export const questionKindLabels: Record<QuestionKind, string> = {
  single: "Choix unique",
  multiple: "Choix multiples",
  true_false: "Vrai ou faux",
  short: "Réponse courte",
  long: "Rédaction",
  file: "Fichier à déposer",
  match: "Association",
};

/** Kinds corrigés automatiquement par le serveur ; long et file attendent le formateur. */
export const isAutoGraded = (kind: QuestionKind) => kind !== "long" && kind !== "file";

const normalize = (s: unknown) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/['’]/g, " ")
    .replace(/[^\p{L}\p{N}:.]+/gu, " ")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const sameSet = (a: unknown, b: unknown) => {
  const x = new Set(Array.isArray(a) ? a.map(String) : []);
  const y = new Set(Array.isArray(b) ? b.map(String) : []);
  return x.size > 0 && x.size === y.size && [...x].every((v) => y.has(v));
};

const sameMap = (a: unknown, b: unknown) => {
  if (!a || typeof a !== "object" || Array.isArray(a) || !b || typeof b !== "object" || Array.isArray(b)) return false;
  const x = a as Record<string, unknown>;
  const y = b as Record<string, unknown>;
  const keys = Object.keys(y);
  return keys.length > 0 && keys.every((k) => String(x[k] ?? "") === String(y[k]));
};

/** true / false / null (null = correction manuelle par le formateur). */
export function gradeAnswer(kind: QuestionKind, value: unknown, key: unknown): boolean | null {
  if (!isAutoGraded(kind)) return null;
  switch (kind) {
    case "single":
      return typeof value === "string" && value === key;
    case "true_false":
      return value === key;
    case "multiple":
      return sameSet(value, key);
    case "short":
      return Array.isArray(key) && typeof value === "string" && key.some((k) => normalize(k) === normalize(value));
    case "match":
      return sameMap(value, key);
    default:
      return null;
  }
}

/** Libellé lisible d'une réponse (pour l'écran de correction). */
export function answerLabel(kind: QuestionKind, value: unknown, options: QuestionOptions, key = false): string {
  if (value === null || value === undefined) return "—";
  const opts = Array.isArray(options) ? options : [];
  const optLabel = (id: string) => opts.find((o) => o.id === id)?.label ?? id;
  switch (kind) {
    case "single":
      return typeof value === "string" ? optLabel(value) : "—";
    case "multiple":
      return Array.isArray(value) && value.length ? value.map((v) => optLabel(String(v))).join(", ") : "—";
    case "true_false":
      return value === true ? "Vrai" : value === false ? "Faux" : "—";
    case "short":
    case "long":
      return String(value);
    case "file":
      return key ? "Fichier attendu" : String((value as { file?: string })?.file ?? "Fichier déposé");
    case "match": {
      const m = options as MatchOptions | null;
      const map = value as Record<string, string>;
      return Object.entries(map)
        .map(([l, r]) => `${m?.left.find((x) => x.id === l)?.label ?? l} → ${m?.right.find((x) => x.id === r)?.label ?? r}`)
        .join(" · ");
    }
  }
}
