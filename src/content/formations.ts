import type { KeyWordSlug } from "@/content/identity";

/**
 * Formations de CTF ACADEMY — miroir de la table Supabase `formations`.
 * ⚠️ Durées et montants : VALEURS D'EXEMPLE (isExample: true) sauf pour l'EDS (durée et frais confirmés).
 * TODO: remplacer les valeurs restantes par les valeurs officielles (ou les gérer depuis l'administration).
 */

export type FormationSlug = "eds" | "edm" | "diacres" | "pastorale";

export type Amount = { value: number; isExample: boolean };

export type FormationQuestion =
  | { name: string; label: string; type: "text"; required: boolean; hint?: string }
  | { name: string; label: string; type: "textarea"; required: boolean; hint?: string }
  | { name: string; label: string; type: "select"; required: boolean; options: string[] }
  | { name: string; label: string; type: "yesno"; required: boolean };

export type Formation = {
  slug: FormationSlug;
  acronym: string;
  name: string;
  tagline: string;
  description: string;
  icon: "shield" | "torch" | "hands" | "book";
  audience: string[];
  goals: string[];
  duration: { label: string; isExample: boolean };
  rhythm: string;
  levels: { title: string; description: string }[];
  fees: { registration: Amount; training: Amount };
  requiresSelection: boolean;
  selectionNote?: string;
  conditions: string[];
  highlights: { title: string; description: string }[];
  keyWords: KeyWordSlug[];
  objectives: number[];
  questions: FormationQuestion[];
};

export const currency = { code: "XOF", label: "FCFA" }; // TODO: confirmer la devise

export const formatAmount = (a: Amount) =>
  `${new Intl.NumberFormat("fr-FR").format(a.value).replace(/\u202f|\u00a0/g, " ")} ${currency.label}`;

export const totalFees = (f: Formation): Amount => ({
  value: f.fees.registration.value + f.fees.training.value,
  isExample: f.fees.registration.isExample || f.fees.training.isExample,
});

export const formations: Formation[] = [
  {
    slug: "eds",
    acronym: "EDS",
    name: "École des STAFs",
    tagline: "Former des serviteurs fidèles, engagés et excellents au cœur de l'Église.",
    // TODO: texte officiel
    description:
      "L'École des STAFs prépare les membres engagés à servir l'Église avec excellence. En quatre niveaux progressifs, l'étudiant affermit sa vie d'adorateur, découvre les fondements du service et apprend à porter fidèlement une responsabilité au sein d'un département.",
    icon: "shield",
    audience: [
      "Membres de l'Église désireux de servir dans un département",
      "Serviteurs déjà engagés qui souhaitent se former",
      "Toute personne appelée à grandir dans le service",
    ],
    goals: [
      "Affermir sa vie de prière et d'adoration",
      "Comprendre les fondements du service dans l'Église",
      "Servir avec rigueur, fidélité et excellence",
      "Être reconnu officiellement comme STAF à la graduation",
    ],
    duration: { label: "3 mois", isExample: false },
    rhythm: "Cours en ligne et en présentiel, sessions en direct sur Zoom", // TODO: texte officiel
    // TODO: texte officiel — intitulé du niveau 2
    levels: [
      { title: "Niveau 1 — L'entrée dans la famille", description: "Dieu, l'homme, le péché, Jésus et le baptême." },
      { title: "Niveau 2 — Croissance", description: "Caractère, discipline spirituelle et vie de l'Église." },
      {
        title: "Niveau 3 — Développer le caractère du Christ",
        description:
          "L'amour, la joie, la paix, la patience, la bonté, la bienveillance, la fidélité, la douceur, la maîtrise de soi et l'humilité.",
      },
      { title: "Niveau 4 — L'expansion sociale du disciple", description: "La gestion financière, le travail, l'entrepreneuriat, l'épargne et l'excellence." },
    ],
    fees: { registration: { value: 10000, isExample: false }, training: { value: 30000, isExample: false } },
    requiresSelection: false,
    conditions: [
      "Être membre de l'Église ou en cours d'intégration",
      "Avoir le désir sincère de servir",
      "S'engager à suivre les 4 niveaux avec assiduité",
      "Disposer d'un téléphone ou d'un ordinateur pour les cours en ligne",
    ],
    highlights: [
      { title: "4 niveaux validés", description: "Chaque niveau se valide par des quiz et des exercices." },
      { title: "Graduation STAF", description: "Une cérémonie officielle couronne le parcours." },
      { title: "Reconnaissance du service", description: "Votre engagement est reconnu par l'Église." },
    ],
    keyWords: ["adoration", "excellence", "transformation"],
    objectives: [1, 4],
    questions: [
      {
        name: "membership",
        label: "Depuis combien de temps fréquentez-vous l'Église ?",
        type: "select",
        required: true,
        options: ["Moins d'un an", "1 à 3 ans", "Plus de 3 ans"],
      },
      { name: "department", label: "Département où vous servez (ou souhaitez servir)", type: "text", required: false },
      { name: "baptized", label: "Êtes-vous baptisé(e) ?", type: "yesno", required: true },
    ],
  },
  {
    slug: "edm",
    acronym: "EDM",
    name: "École des Disciples Mentors",
    tagline: "Devenir un disciple qui forme, accompagne et fait grandir d'autres disciples.",
    // TODO: texte officiel
    description:
      "L'École des Disciples Mentors forme des leaders capables d'accompagner d'autres croyants. En deux niveaux, l'étudiant développe sa maturité spirituelle, apprend l'art du mentorat et met en pratique un leadership serviteur, au service des familles.",
    icon: "torch",
    audience: [
      "Serviteurs expérimentés appelés à accompagner d'autres disciples",
      "Responsables de groupes, de cellules ou de départements",
      "Diplômés de l'EDS souhaitant aller plus loin",
    ],
    goals: [
      "Développer une maturité spirituelle solide",
      "Maîtriser les principes du mentorat biblique",
      "Exercer un leadership serviteur et exemplaire",
      "Accompagner des familles dans leur croissance",
    ],
    duration: { label: "8 mois", isExample: true },
    rhythm: "Cours, exercices de mentorat et travaux de leadership encadrés", // TODO: texte officiel
    // TODO: texte officiel — intitulés des niveaux
    levels: [
      { title: "Niveau 1 — Disciple affermi", description: "Maturité, caractère et vie de disciple." },
      { title: "Niveau 2 — Disciple mentor", description: "Mentorat, leadership et suivi de responsabilités." },
    ],
    fees: { registration: { value: 15000, isExample: true }, training: { value: 60000, isExample: true } },
    requiresSelection: true,
    selectionNote:
      "L'admission à l'EDM se fait sur sélection : votre dossier est étudié par l'équipe pédagogique et pastorale.",
    conditions: [
      "Être membre actif de l'Église",
      "Exercer ou avoir exercé une responsabilité de service",
      "Être recommandé(e) par un responsable",
      "Être retenu(e) après étude du dossier",
    ],
    highlights: [
      { title: "Exercices de mentorat", description: "Une pratique encadrée auprès de disciples réels." },
      { title: "Travaux de leadership", description: "Des projets concrets évalués par vos formateurs." },
      { title: "Suivi des responsabilités", description: "Un accompagnement dans votre mission sur le terrain." },
    ],
    keyWords: ["transformation", "famille", "excellence"],
    objectives: [2, 4, 5],
    questions: [
      { name: "edsGraduate", label: "Avez-vous suivi l'École des STAFs (EDS) ?", type: "yesno", required: true },
      { name: "responsibility", label: "Responsabilité actuelle dans l'Église", type: "text", required: true },
      {
        name: "recommendedBy",
        label: "Responsable qui vous recommande",
        type: "text",
        required: true,
        hint: "Nom et fonction",
      },
    ],
  },
  {
    slug: "diacres",
    acronym: "DIACRES",
    name: "Formation des diacres",
    tagline: "Se préparer au service diaconal, de la formation jusqu'à la consécration.",
    // TODO: texte officiel
    description:
      "La formation des diacres prépare les serviteurs appelés au ministère diaconal. Elle associe cours et évaluations, un stage pratique encadré, la rédaction et la soutenance d'un mémoire, puis une évaluation pastorale qui précède la décision de consécration.",
    icon: "hands",
    audience: [
      "Serviteurs fidèles pressentis pour le diaconat",
      "Membres engagés recommandés par l'équipe pastorale",
    ],
    goals: [
      "Comprendre le fondement biblique du diaconat",
      "Servir l'Église et les familles avec intégrité",
      "Mettre en pratique le service lors d'un stage encadré",
      "Se préparer à la consécration",
    ],
    duration: { label: "12 mois", isExample: true },
    rhythm: "Cours, stage pratique, mémoire et soutenance", // TODO: texte officiel
    levels: [
      { title: "Cours et évaluations", description: "Enseignements fondamentaux et évaluations écrites." },
      { title: "Stage pratique", description: "Un stage encadré, suivi par un superviseur, avec rapport." },
      { title: "Mémoire et soutenance", description: "Rédaction d'un mémoire et soutenance devant un jury." },
      { title: "Évaluation pastorale", description: "Évaluation par l'équipe pastorale et décision de consécration." },
    ],
    fees: { registration: { value: 15000, isExample: true }, training: { value: 50000, isExample: true } },
    requiresSelection: true,
    selectionNote:
      "L'admission se fait sur sélection : le dossier est examiné par l'équipe pastorale avant toute décision.",
    conditions: [
      "Être membre fidèle de l'Église",
      "Servir activement dans un département",
      "Être recommandé(e) par l'équipe pastorale",
      "Accepter les étapes du stage, du mémoire et de l'évaluation pastorale",
    ],
    highlights: [
      { title: "Stage pratique suivi", description: "Un superviseur vous accompagne et valide votre stage." },
      { title: "Mémoire et soutenance", description: "Un travail de fond présenté devant un jury." },
      { title: "Consécration", description: "L'aboutissement du parcours, après décision pastorale." },
    ],
    keyWords: ["adoration", "guerison", "famille"],
    objectives: [3, 5],
    questions: [
      { name: "yearsServing", label: "Depuis combien d'années servez-vous dans l'Église ?", type: "select", required: true, options: ["Moins de 2 ans", "2 à 5 ans", "Plus de 5 ans"] },
      { name: "ministry", label: "Département ou ministère actuel", type: "text", required: true },
      { name: "pastoralRecommendation", label: "Avez-vous une recommandation de l'équipe pastorale ?", type: "yesno", required: true },
    ],
  },
  {
    slug: "pastorale",
    acronym: "EP",
    name: "École de pastorale",
    // TODO: texte officiel
    tagline: "Former les pasteurs et responsables appelés à servir les familles de l'Église.",
    // TODO: texte officiel
    description:
      "L'École de pastorale prépare les serviteurs appelés au ministère pastoral : approfondissement biblique, prédication, accompagnement des familles et gouvernance d'Église, sous la conduite de l'équipe pastorale. (Exemple)",
    icon: "book",
    // TODO: texte officiel
    audience: [
      "Serviteurs expérimentés pressentis pour le ministère pastoral (Exemple)",
      "Mentors et responsables recommandés par l'équipe pastorale (Exemple)",
    ],
    // TODO: texte officiel
    goals: [
      "Approfondir la connaissance des Écritures et de la doctrine (Exemple)",
      "Se former à la prédication et à l'enseignement (Exemple)",
      "Accompagner les familles avec sagesse et compassion (Exemple)",
      "Se préparer aux responsabilités pastorales (Exemple)",
    ],
    duration: { label: "À définir", isExample: true },
    rhythm: "Rythme à définir (Exemple)", // TODO: texte officiel
    // TODO: texte officiel — programme
    levels: [
      { title: "Socle doctrinal (Exemple)", description: "Programme officiel à définir par l'équipe pastorale. (Exemple)" },
      { title: "Pratique ministérielle (Exemple)", description: "Programme officiel à définir par l'équipe pastorale. (Exemple)" },
      { title: "Mission et gouvernance (Exemple)", description: "Programme officiel à définir par l'équipe pastorale. (Exemple)" },
    ],
    fees: { registration: { value: 20000, isExample: true }, training: { value: 80000, isExample: true } },
    requiresSelection: true,
    selectionNote:
      "L'admission à l'École de pastorale se fait sur sélection : le dossier est étudié par l'équipe pastorale avant toute décision. (Exemple)",
    // TODO: texte officiel
    conditions: [
      "Être membre actif de l'Église (Exemple)",
      "Être recommandé(e) par l'équipe pastorale (Exemple)",
      "Avoir accompli un parcours de formation reconnu (Exemple)",
      "Être retenu(e) après étude du dossier (Exemple)",
    ],
    // TODO: texte officiel
    highlights: [
      { title: "Encadrement pastoral", description: "Un accompagnement direct par l'équipe pastorale. (Exemple)" },
      { title: "Pratique supervisée", description: "Des missions confiées et évaluées sur le terrain. (Exemple)" },
      { title: "Consécration ministérielle", description: "L'aboutissement du parcours, après décision pastorale. (Exemple)" },
    ],
    keyWords: ["adoration", "famille", "excellence"],
    objectives: [2, 4],
    // TODO: texte officiel — questions du dossier
    questions: [
      { name: "calling", label: "Décrivez votre appel au ministère pastoral", type: "textarea", required: true },
      { name: "mentored", label: "Avez-vous exercé une responsabilité de mentorat ou de leadership ?", type: "yesno", required: true },
      {
        name: "pastoralRecommendation",
        label: "Responsable pastoral qui vous recommande",
        type: "text",
        required: true,
        hint: "Nom et fonction",
      },
    ],
  },
];

export const registerLabels: Record<FormationSlug, string> = {
  eds: "S'inscrire à l'EDS",
  edm: "S'inscrire à l'EDM",
  diacres: "S'inscrire à la formation des diacres",
  pastorale: "S'inscrire à l'École de pastorale",
};

export const journeyLabel = (f: Formation) =>
  f.slug === "diacres" ? `${f.levels.length} étapes` : `${f.levels.length} niveaux`;

export const getFormation = (slug: string) => formations.find((f) => f.slug === slug);
export const isFormationSlug = (s: string | null | undefined): s is FormationSlug =>
  !!s && formations.some((f) => f.slug === s);
