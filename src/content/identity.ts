/**
 * Identité de l'Église — Vision, 5 mots clés, 5 objectifs.
 * Textes de la Vision et des objectifs : officiels (brochure de l'Église).
 * Miroir des tables Supabase `church_vision`, `key_words`, `church_objectives` (édition future par l'administration).
 *
 * `tint` / `tintText` : variables CSS des tokens (globals.css). `hex` : uniquement pour les scènes WebGL.
 */

import type { CSSProperties } from "react";

export type KeyWordSlug = "adoration" | "transformation" | "guerison" | "famille" | "excellence";

export type Tinted = { tint: string; tintText: string; hex: string };

export type KeyWord = Tinted & {
  slug: KeyWordSlug;
  order: 1 | 2 | 3 | 4 | 5;
  label: string;
  definition: string;
  icon: "sunrise" | "sparkles" | "heart-pulse" | "users" | "star";
  signature: "rays" | "morph" | "wave" | "circles" | "twinkle";
  inspiration: { text: string; reference: string };
};

export type ChurchObjective = Tinted & {
  number: 1 | 2 | 3 | 4 | 5;
  verb: string;
  text: string;
};

export const churchName = "Centre de Transformation des Familles";

export const churchVision = {
  text: "Former une armée de disciples-adorateurs de Jésus travaillant dans l'excellence pour la transformation et la guérison des familles.",
  highlights: ["disciples-adorateurs", "excellence", "transformation", "guérison", "familles"],
} as const;

// TODO: texte officiel — définitions et versets des mots clés à valider par l'Église.
export const keyWords: KeyWord[] = [
  {
    slug: "adoration",
    order: 1,
    label: "Adoration",
    definition:
      "Placer Dieu au centre de toute chose et lui rendre un culte en esprit et en vérité, dans la prière comme dans la vie de chaque jour.",
    tint: "var(--color-vision-adoration)",
    tintText: "var(--color-vision-adoration)",
    hex: "#F2C230",
    icon: "sunrise",
    signature: "rays",
    inspiration: {
      text: "Dieu est Esprit, et il faut que ceux qui l'adorent l'adorent en esprit et en vérité.",
      reference: "Jean 4:24",
    },
  },
  {
    slug: "transformation",
    order: 2,
    label: "Transformation",
    definition:
      "Être renouvelé de l'intérieur par la Parole pour devenir chaque jour davantage à l'image de Christ.",
    tint: "var(--color-vision-transformation)",
    tintText: "var(--color-vision-transformation)",
    hex: "#EF7D2D",
    icon: "sparkles",
    signature: "morph",
    inspiration: {
      text: "Ne vous conformez pas au siècle présent, mais soyez transformés par le renouvellement de l'intelligence.",
      reference: "Romains 12:2",
    },
  },
  {
    slug: "guerison",
    order: 3,
    label: "Guérison",
    definition:
      "Accueillir la restauration que Dieu apporte aux cœurs, aux âmes et aux corps, et devenir à son tour un canal de guérison.",
    tint: "var(--color-vision-guerison)",
    tintText: "var(--color-vision-guerison-text)",
    hex: "#A93BB0",
    icon: "heart-pulse",
    signature: "wave",
    inspiration: {
      text: "Il guérit ceux qui ont le cœur brisé, et il panse leurs blessures.",
      reference: "Psaume 147:3",
    },
  },
  {
    slug: "famille",
    order: 4,
    label: "Famille",
    definition:
      "Bâtir des foyers solides, unis et fondés sur Dieu, première cellule de l'Église et de la société.",
    tint: "var(--color-vision-famille)",
    tintText: "var(--color-vision-famille)",
    hex: "#2BB3C0",
    icon: "users",
    signature: "circles",
    inspiration: { text: "Moi et ma maison, nous servirons l'Éternel.", reference: "Josué 24:15" },
  },
  {
    slug: "excellence",
    order: 5,
    label: "Excellence",
    definition:
      "Servir Dieu avec le meilleur de soi-même : rigueur, fidélité et qualité dans chaque mission confiée.",
    tint: "var(--color-vision-excellence)",
    tintText: "var(--color-vision-excellence)",
    hex: "#7BC043",
    icon: "star",
    signature: "twinkle",
    inspiration: {
      text: "Tout ce que vous faites, faites-le de bon cœur, comme pour le Seigneur et non pour des hommes.",
      reference: "Colossiens 3:23",
    },
  },
];

export const objectivesTitle = "Objectifs de l'église";

export const churchObjectives: ChurchObjective[] = [
  {
    number: 1,
    verb: "Gagner",
    text: "le maximum de personnes à Jésus-Christ.",
    tint: "var(--color-objectif-1)",
    tintText: "var(--color-objectif-1)",
    hex: "#F2C230",
  },
  {
    number: 2,
    verb: "Conduire",
    text: "les familles à vivre une croissance spirituelle, émotionnelle et matérielle, selon les priorités de Dieu.",
    tint: "var(--color-objectif-2)",
    tintText: "var(--color-objectif-2)",
    hex: "#E83E8C",
  },
  {
    number: 3,
    verb: "Préparer",
    text: "l'église au retour du Seigneur Jésus-Christ.",
    tint: "var(--color-objectif-3)",
    tintText: "var(--color-objectif-3-text)",
    hex: "#A93BB0",
  },
  {
    number: 4,
    verb: "Amener",
    text: "les chrétiens à ressembler à Christ.",
    tint: "var(--color-objectif-4)",
    tintText: "var(--color-objectif-4-text)",
    hex: "#3F6FE0",
  },
  {
    number: 5,
    verb: "Aider",
    text: "le disciple-adorateur de Jésus à accomplir pleinement sa mission sur la terre.",
    tint: "var(--color-objectif-5)",
    tintText: "var(--color-objectif-5)",
    hex: "#4CCB6C",
  },
];

export const getKeyWord = (slug: KeyWordSlug) => keyWords.find((k) => k.slug === slug)!;
export const getObjective = (n: number) => churchObjectives.find((o) => o.number === n)!;

/** Style inline qui expose la couleur à teinter aux utilitaires `tint-*`. */
export const tintStyle = (t: Pick<Tinted, "tint" | "tintText">) =>
  ({ "--tint": t.tint, "--tint-text": t.tintText }) as CSSProperties;
