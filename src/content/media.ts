/**
 * Contenus de la médiathèque (Photos, Vidéo, Événements) — VALEURS D'EXEMPLE.
 * Tout est marqué « Exemple » / isExample: true en attendant la gestion depuis
 * l'administration. Visuels de remplacement générés dans public/media/.
 */

export type MediaAlbum = {
  id: string;
  slug: string;
  title: string;
  description: string;
  cover: string;
  year: number;
  isExample: boolean;
};

export type MediaPhoto = {
  id: string;
  albumSlug: string;
  title: string;
  caption: string;
  src: string;
  width: number;
  height: number;
  takenAt: string | null;
  featured: boolean;
  order: number;
  isExample: boolean;
};

export type VideoSource = "upload" | "youtube" | "vimeo";
export type MediaVideo = {
  id: string;
  slug: string;
  title: string;
  description: string;
  source: VideoSource;
  url: string;
  poster: string;
  durationSec: number;
  category: "cultes" | "formations" | "temoignages" | "evenements";
  publishedAt: string;
  featured: boolean;
  isExample: boolean;
};

export type EventStatus = "brouillon" | "publie" | "annule";
export type ChurchEvent = {
  id: string;
  slug: string;
  title: string;
  description: string;
  type: "culte" | "conference" | "formation" | "ceremonie" | "retraite" | "concert";
  startsAt: string; // ISO
  endsAt: string | null;
  place: string;
  address: string;
  cover: string;
  registerUrl: string | null;
  featured: boolean;
  status: EventStatus;
  isExample: boolean;
};

const inDays = (d: number, h = 10) => new Date(Date.now() + d * 86_400_000 + h * 3_600_000 * 0).toISOString();
const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString();

/* ───────── Albums ───────── */
export const demoAlbums: MediaAlbum[] = [
  {
    id: "alb-campus",
    slug: "campus",
    title: "Le campus",
    description: "Le bâtiment et les espaces de l'Académie. (Exemple)",
    cover: "/media/photos/campus-1.png",
    year: new Date().getFullYear(),
    isExample: true,
  },
  {
    id: "alb-cultes",
    slug: "cultes",
    title: "Cultes et célébrations",
    description: "Moments d'adoration et d'enseignement. (Exemple)",
    cover: "/media/photos/culte-1.png",
    year: new Date().getFullYear(),
    isExample: true,
  },
  {
    id: "alb-evenements",
    slug: "evenements",
    title: "Événements",
    description: "Conférences, graduations et temps forts. (Exemple)",
    cover: "/media/photos/event-1.png",
    year: new Date().getFullYear(),
    isExample: true,
  },
];

const photo = (id: string, albumSlug: string, n: number, w: number, h: number, featured = false): MediaPhoto => ({
  id: `${albumSlug}-${n}`,
  albumSlug,
  title: `Photo ${albumSlug} ${n} (Exemple)`,
  caption: "Légende de la photo (Exemple).",
  src: `/media/photos/${albumSlug === "campus" ? "campus" : albumSlug === "cultes" ? "culte" : "event"}-${n}.png`,
  width: w,
  height: h,
  takenAt: null,
  featured,
  order: n,
  isExample: true,
});

/* ───────── Photos ───────── */
export const demoPhotos: MediaPhoto[] = [
  photo("p1", "campus", 1, 1200, 900, true),
  photo("p2", "campus", 2, 1200, 800),
  photo("p3", "campus", 3, 1200, 1000),
  photo("p4", "campus", 4, 1200, 800, true),
  photo("p5", "cultes", 1, 1200, 800, true),
  photo("p6", "cultes", 2, 1200, 1000),
  photo("p7", "cultes", 3, 1200, 800),
  photo("p8", "cultes", 4, 1200, 900, true),
  photo("p9", "evenements", 1, 1200, 800, true),
  photo("p10", "evenements", 2, 1200, 900),
  photo("p11", "evenements", 3, 1200, 800),
  photo("p12", "evenements", 4, 1200, 1000),
];

/* ───────── Vidéos ───────── */
export const demoVideos: MediaVideo[] = [
  {
    id: "v1",
    slug: "culte-dadoration-exemple",
    title: "Culte d'adoration (Exemple)",
    description: "Un moment d'adoration et de louange à l'Église. (Exemple)",
    source: "upload",
    url: "",
    poster: "/media/videos/culte.png",
    durationSec: 5 * 60 + 42,
    category: "cultes",
    publishedAt: daysAgo(7),
    featured: true,
    isExample: true,
  },
  {
    id: "v2",
    slug: "enseignement-vision-exemple",
    title: "Enseignement sur la Vision (Exemple)",
    description: "Comprendre la Vision du Centre de Transformation des Familles. (Exemple)",
    source: "upload",
    url: "",
    poster: "/media/videos/enseignement.png",
    durationSec: 48 * 60,
    category: "formations",
    publishedAt: daysAgo(14),
    featured: false,
    isExample: true,
  },
  {
    id: "v3",
    slug: "temoignage-famille-exemple",
    title: "Témoignage : une famille transformée (Exemple)",
    description: "Le récit d'une famille restaurée par la grâce. (Exemple)",
    source: "upload",
    url: "",
    poster: "/media/videos/temoignage.png",
    durationSec: 7 * 60 + 18,
    category: "temoignages",
    publishedAt: daysAgo(21),
    featured: false,
    isExample: true,
  },
  {
    id: "v4",
    slug: "ceremonie-graduation-exemple",
    title: "Cérémonie de graduation (Exemple)",
    description: "La consécration des STAFs et mentors diplômés. (Exemple)",
    source: "upload",
    url: "",
    poster: "/media/videos/ceremonie.png",
    durationSec: 92 * 60,
    category: "evenements",
    publishedAt: daysAgo(40),
    featured: false,
    isExample: true,
  },
];

/* ───────── Événements ───────── */
export const demoEvents: ChurchEvent[] = [
  {
    id: "e1",
    slug: "conference-familles-exemple",
    title: "Conférence « Familles transformées » (Exemple)",
    description:
      "Une conférence pour équiper les couples et les familles : enseignements, ateliers et temps d'échange. (Exemple — texte officiel à venir.)",
    type: "conference",
    startsAt: inDays(12, 9),
    endsAt: inDays(12, 17),
    place: "Auditorium CTF (Exemple)",
    address: "Adresse de l'Église (Exemple)",
    cover: "/media/events/conference.png",
    registerUrl: null,
    featured: true,
    status: "publie",
    isExample: true,
  },
  {
    id: "e2",
    slug: "graduation-eds-exemple",
    title: "Graduation de l'École des STAFs (Exemple)",
    description:
      "La cérémonie officielle de fin de parcours : remise des attestations et consécration des STAFs. (Exemple — texte officiel à venir.)",
    type: "ceremonie",
    startsAt: inDays(34, 15),
    endsAt: inDays(34, 18),
    place: "Auditorium CTF (Exemple)",
    address: "Adresse de l'Église (Exemple)",
    cover: "/media/events/graduation.png",
    registerUrl: null,
    featured: true,
    status: "publie",
    isExample: true,
  },
  {
    id: "e3",
    slug: "journee-portes-ouvertes-exemple",
    title: "Journée portes ouvertes (Exemple)",
    description:
      "Venez découvrir les formations de CTF ACADEMY, rencontrer les formateurs et visiter le campus. (Exemple — texte officiel à venir.)",
    type: "formation",
    startsAt: inDays(21, 10),
    endsAt: inDays(21, 13),
    place: "Campus CTF (Exemple)",
    address: "Adresse de l'Église (Exemple)",
    cover: "/media/events/seminaire.png",
    registerUrl: null,
    featured: false,
    status: "publie",
    isExample: true,
  },
  {
    id: "e4",
    slug: "culte-special-exemple",
    title: "Culte spécial d'action de grâce (Exemple)",
    description: "Un culte de célébration ouvert à tous. (Exemple — texte officiel à venir.)",
    type: "culte",
    startsAt: daysAgo(9),
    endsAt: daysAgo(9),
    place: "Auditorium CTF (Exemple)",
    address: "Adresse de l'Église (Exemple)",
    cover: "/media/events/culte.png",
    registerUrl: null,
    featured: false,
    status: "publie",
    isExample: true,
  },
  {
    id: "e5",
    slug: "retraite-leadership-exemple",
    title: "Retraite de leadership (Exemple)",
    description: "Deux journées de retraite pour les responsables et mentors. (Exemple — texte officiel à venir.)",
    type: "retraite",
    startsAt: daysAgo(30),
    endsAt: daysAgo(29),
    place: "Lieu de retraite (Exemple)",
    address: "Adresse à confirmer (Exemple)",
    cover: "/media/events/retraite.png",
    registerUrl: null,
    featured: false,
    status: "publie",
    isExample: true,
  },
  {
    id: "e6",
    slug: "concert-louange-exemple",
    title: "Concert de louange (Exemple)",
    description: "Une soirée de louange et d'adoration avec les équipes de l'Église. (Exemple — texte officiel à venir.)",
    type: "concert",
    startsAt: daysAgo(48),
    endsAt: daysAgo(48),
    place: "Auditorium CTF (Exemple)",
    address: "Adresse de l'Église (Exemple)",
    cover: "/media/events/concert.png",
    registerUrl: null,
    featured: false,
    status: "publie",
    isExample: true,
  },
];

/* ───────── Utilitaires ───────── */
export const formatDuration = (sec: number) => {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
};

export const eventTypeLabels: Record<ChurchEvent["type"], string> = {
  culte: "Culte",
  conference: "Conférence",
  formation: "Formation",
  ceremonie: "Cérémonie",
  retraite: "Retraite",
  concert: "Concert",
};

export const videoCategoryLabels: Record<MediaVideo["category"], string> = {
  cultes: "Cultes",
  formations: "Formations",
  temoignages: "Témoignages",
  evenements: "Événements",
};

export const isUpcoming = (e: ChurchEvent) => new Date(e.startsAt).getTime() > Date.now();
