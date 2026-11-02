import { MediaCard } from "@/components/home/media-card";

export type MediaCardDef = {
  id: "photos" | "videos" | "events";
  label: string;
  image: string;
  /** Vidéo lue en continu dans le cadre (muette). */
  video?: string;
  /** Vidéo qui alterne avec l'image toutes les 3 s — lecture manuelle. */
  alternateVideo?: string;
};

export const MEDIA_CARDS: MediaCardDef[] = [
  { id: "photos", label: "Photos", image: "/elv.jpg" },
  { id: "videos", label: "Vidéo", image: "/media/card-video.png", video: "/video-m.mp4" },
  { id: "events", label: "Événements", image: "/ador.png", alternateVideo: "/ani.mp4" },
];

/**
 * Rangée de la maquette : trois cadres dont le contenu s'affiche en grand
 * dans une modale au clic. Le 3ᵉ alterne image et vidéo toutes les 3 s.
 */
export function MediaCards() {
  return (
    <ul aria-label="Aperçus : photos, vidéo, événements" className="flex flex-col gap-5 sm:grid sm:grid-cols-3">
      {MEDIA_CARDS.map((card) => (
        <MediaCard key={card.id} card={card} />
      ))}
    </ul>
  );
}
