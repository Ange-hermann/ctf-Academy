/**
 * Contenus « Découvrir CTF » et coordonnées.
 * TODO: texte officiel — tous les textes de ce fichier sont à valider ou compléter par l'Église.
 */

import { churchSidebarNav } from "@/content/navigation";

export const contact = {
  // TODO: coordonnées officielles
  phone: { label: "Téléphone à compléter", href: null as string | null },
  email: { label: "Adresse e-mail à compléter", href: null as string | null },
  address: "Adresse à compléter",
  socials: [
    { name: "Facebook", href: null as string | null },
    { name: "YouTube", href: null as string | null },
    { name: "Instagram", href: null as string | null },
  ],
};

// TODO: texte officiel
export const about = {
  intro:
    "CTF ACADEMY est la plateforme de formation du Centre de Transformation des Familles. Elle accompagne chaque disciple, pas à pas, pour qu'il grandisse dans l'adoration, serve avec excellence et devienne un instrument de transformation et de guérison pour les familles.",
  paragraphs: [
    "Le Centre de Transformation des Familles est une Église qui place la famille au cœur de sa mission. Elle croit que des disciples transformés transforment leurs foyers, leurs Églises et leurs nations.",
    "Pour accomplir cette vision, l'Église a structuré ses parcours de formation au sein de CTF ACADEMY : l'École des STAFs, l'École des Disciples Mentors et la formation des diacres.",
    "Chaque parcours associe enseignement, pratique et accompagnement, pour former des disciples-adorateurs prêts à servir.",
  ],
  mission:
    "Former, accompagner et envoyer des disciples-adorateurs de Jésus qui servent avec excellence pour la transformation et la guérison des familles.",
};

/** Chiffres clés : uniquement des valeurs réelles issues de l'organisation des formations. */
export const keyFigures = [
  { value: 3, label: "parcours de formation" },
  { value: 4, label: "niveaux à l'École des STAFs" },
  { value: 5, label: "mots clés de la Vision" },
  { value: 5, label: "objectifs de l'Église" },
];

// TODO: texte officiel — dates et étapes de l'histoire de l'Église
export const timeline = [
  { date: "Date à confirmer", title: "Naissance de l'Église", text: "Le Centre de Transformation des Familles voit le jour avec une conviction : Dieu veut restaurer les familles." },
  { date: "Date à confirmer", title: "Premières formations", text: "Les premiers parcours de formation des serviteurs sont lancés au sein de l'Église." },
  { date: "Date à confirmer", title: "Structuration des écoles", text: "Naissance de l'École des STAFs, de l'École des Disciples Mentors et de la formation des diacres." },
  { date: "Aujourd'hui", title: "CTF ACADEMY", text: "Les formations deviennent accessibles en ligne, partout, depuis un simple téléphone." },
];

// TODO: texte officiel
export const churchPresentation = {
  intro:
    "Le Centre de Transformation des Familles est une communauté chrétienne qui rassemble des hommes, des femmes et des familles autour de Jésus-Christ, de sa Parole et de l'adoration.",
  pillars: [
    { title: "Une Église de familles", text: "Chaque foyer est accueilli, accompagné et fortifié." },
    { title: "Une Église d'adorateurs", text: "La présence de Dieu est au cœur de chaque rencontre." },
    { title: "Une Église qui forme", text: "Chaque membre est appelé à grandir et à servir." },
  ],
};

export type ChurchHomeSection = {
  heading: string;
  paragraphs?: string[];
  lead?: string;
  items?: { lead: string; text: string }[];
};

/** Texte officiel du grand cadre de `/` — présentation du Centre de Transformation des Familles. */
export const churchHome = {
  eyebrow: "Bienvenue au Centre de Transformation des Familles",
  welcome: [
    "Une Église qui transforme des vies, restaure des familles et équipe une génération pour impacter le monde.",
    "Au Centre de Transformation des Familles (CTF Church), nous croyons que personne n'est trop loin pour être touché par l'amour de Dieu, qu'aucune vie n'est trop brisée pour être restaurée et qu'aucune destinée n'est trop ordinaire pour devenir extraordinaire entre les mains du Seigneur.",
    "Nous sommes bien plus qu'une Église : nous sommes une famille spirituelle, un lieu de restauration, de croissance et de transformation, où chacun peut découvrir son identité en Christ, développer son potentiel et accomplir pleinement sa destinée.",
    "Fondée sur la Parole de Dieu et conduite par le couple pastoral Justin et Aminata Kabasele, CTF Church est une communauté chrétienne dynamique basée à Abidjan, en Côte d'Ivoire, qui place l'adoration, la transformation des vies et l'épanouissement des familles au cœur de sa mission.",
  ],
  sections: [
    {
      heading: "Notre vision",
      paragraphs: [
        "Former une génération de disciples-adorateurs, transformés par la Parole de Dieu, capables de transformer leurs familles, leur environnement et les nations.",
        "Nous croyons que la véritable transformation d'une société commence par celle des individus et des familles. Lorsqu'une vie est transformée par Jésus-Christ, elle devient une source de lumière, d'espérance et de bénédiction pour toute une génération.",
      ],
    },
    {
      heading: "Notre mission",
      lead: "Notre mission repose sur quatre engagements fondamentaux :",
      items: [
        { lead: "Adorer Dieu", text: "développer une relation personnelle, profonde et authentique avec le Seigneur." },
        { lead: "Transformer les vies", text: "accompagner chaque personne vers la guérison intérieure, la restauration et la maturité spirituelle." },
        { lead: "Restaurer les familles", text: "bâtir des couples solides, des familles épanouies et des générations enracinées dans les valeurs bibliques." },
        { lead: "Équiper pour impacter", text: "former des disciples et des serviteurs capables d'exercer une influence positive dans l'Église et dans la société." },
      ],
    },
    {
      heading: "Une Église où chacun a sa place",
      paragraphs: [
        "Que vous soyez à la recherche de Dieu, d'une famille spirituelle, d'un nouveau départ ou d'un accompagnement pour grandir dans votre foi, vous avez votre place parmi nous.",
        "À travers nos cultes, nos temps de prière, nos groupes de communion fraternelle, nos programmes pour les familles et les formations de CTF Academy, nous vous accompagnons dans un parcours de transformation spirituelle, personnelle et familiale.",
      ],
    },
    {
      heading: "Notre invitation",
      paragraphs: [
        "Nous croyons que votre histoire ne s'arrête pas à ce que vous avez vécu jusqu'à aujourd'hui. Avec Dieu, un nouveau chapitre peut commencer.",
        "Venez tel que vous êtes, mais préparez-vous à ne plus repartir comme vous êtes venu !",
        "Rejoignez-nous et découvrez une communauté où la foi grandit, où les familles se reconstruisent et où les destinées prennent un nouveau départ.",
      ],
    },
  ] satisfies ChurchHomeSection[],
  tagline: "Adoration • Transformation • Guérison • Familles • Excellence",
  verse:
    "Lève-toi, sois éclairée, car ta lumière arrive, et la gloire de l'Éternel se lève sur toi. — Ésaïe 60:1",
};

// TODO: lieux et horaires officiels
export const worship = [
  { day: "Dimanche", name: "Culte d'adoration", time: "Horaire à confirmer", place: "Lieu à confirmer" },
  { day: "Mercredi", name: "Enseignement et prière", time: "Horaire à confirmer", place: "Lieu à confirmer" },
  { day: "Vendredi", name: "Veillée de prière", time: "Horaire à confirmer", place: "Lieu à confirmer" },
];

// TODO: ajouter les photos officielles dans public/gallery et renseigner `src`
export const gallery = [
  { caption: "Culte d'adoration", src: null as string | null },
  { caption: "Familles de l'Église", src: null as string | null },
  { caption: "Formation des serviteurs", src: null as string | null },
  { caption: "Graduation STAF", src: null as string | null },
  { caption: "Jeunesse", src: null as string | null },
  { caption: "Moments de prière", src: null as string | null },
];

// TODO: témoignages réels à recueillir — exemples à remplacer
export const testimonials = [
  {
    role: "Étudiant(e) EDS",
    text: "Exemple de témoignage : la formation m'a aidé(e) à servir avec plus de fidélité et de joie dans mon département.",
    isExample: true,
  },
  {
    role: "Étudiant(e) EDM",
    text: "Exemple de témoignage : j'ai appris à accompagner d'autres disciples avec patience et sagesse.",
    isExample: true,
  },
  {
    role: "Diacre consacré(e)",
    text: "Exemple de témoignage : le stage et le mémoire m'ont préparé(e) concrètement au service diaconal.",
    isExample: true,
  },
];

/* ───────── Panneaux des ministères (grand cadre de `/`) ─────────
 * Quand un ministère est choisi dans la barre latérale (`?departement=<slug>`),
 * le grand cadre affiche la présentation correspondante.
 * TODO: texte officiel — descriptions à valider par l'Église. */

const departmentIntro: Record<string, string> = {
  familles:
    "Le département Familles veille à ce que chaque foyer et chaque génération trouve sa place dans la vie de l'Église, de l'enfance jusqu'au couple.",
  expansion:
    "Le département Expansion porte la croissance de l'Église : il accueille, évangélise, suit et intègre chaque personne que Dieu ajoute à la famille.",
  portiers:
    "Les Portiers sont le visage accueillant de l'Église : ils préparent, ordonnent et gardent chaque rencontre pour que tous soient servis dans l'excellence.",
  musiques:
    "Le département des Musiques conduit l'assemblée dans l'adoration et forme des adorateurs qui servent avec cœur et excellence.",
  technique:
    "Le département Technique sert en coulisses pour que le son, l'image et le message de l'Église rayonnent avec excellence, dans la salle comme en ligne.",
};

const ministryIntro: Record<string, string> = {
  ecodim:
    "ECODIM est le ministère dédié aux enfants de l'Église : ils y découvrent la Parole de Dieu à leur niveau, dans la joie et la sécurité.",
  teens:
    "Teens accompagne les adolescents dans leur foi et leur identité en Christ, à travers des temps pensés pour eux.",
  jeunesse:
    "Le ministère Jeunesse rassemble les jeunes de l'Église autour de la Parole, de l'adoration et de la fraternité.",
  malkia:
    "Les Malkia est le ministère des femmes de l'Église : un lieu de croissance, de prière et de communion entre sœurs.",
  couples:
    "Le ministère Couples accompagne les foyers pour bâtir des mariages solides, selon le cœur de Dieu pour la famille.",
  tribus:
    "Les Tribus organisent la vie de l'Église en groupes de proximité pour que chacun soit connu, suivi et accompagné.",
  "time-for-change":
    "Time for Change est un temps fort du département Expansion, dédié à la transformation des vies.",
  evangelisation:
    "L'équipe d'évangélisation porte la Bonne Nouvelle de Jésus au-dehors, vers ceux qui ne connaissent pas encore l'Église.",
  adn:
    "ADN accueille les nouveaux venus et les accompagne dans leurs premiers pas au sein de la famille de l'Église.",
  denombrement:
    "Le dénombrement recense et suit les présences afin que chaque personne compte et que personne ne soit oublié.",
  "cellule-de-famille":
    "Les cellules de famille sont les petits groupes de proximité où l'on grandit ensemble dans la Parole et la fraternité.",
  finance:
    "Le service finances veille à la bonne gestion des ressources de l'Église, dans la transparence et l'ordre.",
  "harmonie-visuelle":
    "L'équipe Harmonie visuelle soigne l'agencement et l'esthétique des lieux pour une atmosphère qui honore Dieu.",
  protocole:
    "Le Protocole ordonne le déroulement des services et accompagne les autorités et les invités avec excellence.",
  accueil:
    "L'équipe Accueil reçoit chaque personne dès les portes de l'Église, avec chaleur et attention.",
  securite:
    "L'équipe Sécurité veille discrètement à la protection des personnes et des lieux pendant les rencontres.",
  commandos:
    "Les Commandos sont l'équipe d'intervention et de logistique des Portiers, disponible pour les besoins terrain.",
  "ctf-choir":
    "CTF Choir est la chorale de l'Église : elle conduit l'assemblée dans l'adoration lors des cultes et des temps forts.",
  eam:
    "L'EAM — École d'Adoration par la Musique — forme les musiciens et les voix qui servent l'adoration de l'Église.",
  sonorisation:
    "L'équipe Sonorisation assure un son clair et équilibré pour que chaque parole et chaque chant porte.",
  branding:
    "Le Branding veille à l'identité visuelle de l'Église, pour une image cohérente qui reflète sa Vision.",
  audiovisuel:
    "L'équipe Audiovisuel capte, produit et diffuse les images et les vidéos des rencontres de l'Église.",
  communication:
    "La Communication porte le message de l'Église sur tous les canaux : annonces, réseaux et supports.",
};

/** Panneau du grand cadre de `/` pour un ministère ou un département. */
export type ChurchPanel = {
  eyebrow: string;
  title: string;
  intro: string;
  /** Ministères proposés en accès rapide dans le panneau. */
  links: ChurchSidebarLink[];
};

type ChurchSidebarLink = { label: string; slug: string };

/**
 * Résout le panneau à afficher pour `?departement=<slug>`.
 * `null` = panneau par défaut (présentation de l'Église).
 */
export function getChurchPanel(slug: string | null | undefined): ChurchPanel | null {
  if (!slug) return null;
  for (const dept of churchSidebarNav) {
    if (dept.slug === slug && dept.children) {
      return {
        eyebrow: "Département de l'Église",
        title: dept.label,
        intro: departmentIntro[slug] ?? "",
        links: dept.children,
      };
    }
    const child = dept.children?.find((c) => c.slug === slug);
    if (child && dept.slug) {
      return {
        eyebrow: `Département ${dept.label}`,
        title: child.label,
        intro: ministryIntro[slug] ?? "",
        links: [
          { label: dept.label, slug: dept.slug },
          ...(dept.children ?? []).filter((c) => c.slug !== slug),
        ],
      };
    }
  }
  return null;
}
