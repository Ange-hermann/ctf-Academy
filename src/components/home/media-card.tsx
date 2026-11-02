"use client";

import Image from "next/image";
import { useState } from "react";
import { Maximize2 } from "lucide-react";
import { CardLightbox } from "@/components/home/card-lightbox";
import { CardSwitcher } from "@/components/home/card-switcher";
import { CardVideo } from "@/components/home/card-video";
import type { MediaCardDef } from "@/components/home/media-cards";

/**
 * Un cadre de la rangée : aperçu décoratif (image, vidéo en boucle ou contenus
 * alternés) + clic pour afficher le contenu en grand dans une modale. Pour le
 * cadre alterné, c'est le contenu visible au moment du clic qui est agrandi.
 */
export function MediaCard({ card }: { card: MediaCardDef }) {
  const [open, setOpen] = useState(false);
  const [videoPhase, setVideoPhase] = useState(false);
  const [enlargedVideo, setEnlargedVideo] = useState<string | undefined>(undefined);

  const enlarge = () => {
    setEnlargedVideo(card.video ?? (videoPhase ? card.alternateVideo : undefined));
    setOpen(true);
  };

  return (
    <li className="relative h-40 w-[76vw] max-w-80 shrink-0 snap-start overflow-hidden rounded-[14px] border border-or/25 sm:h-40 sm:w-auto sm:max-w-none sm:snap-align-none">
      {card.alternateVideo ? (
        <CardSwitcher image={card.image} video={card.alternateVideo} alt={card.label} onPhaseChange={setVideoPhase} />
      ) : card.video ? (
        <CardVideo src={card.video} poster={card.image} className="absolute inset-0 size-full object-cover" />
      ) : (
        <Image
          src={card.image}
          alt={card.label}
          fill
          sizes="(max-width: 640px) 82vw, 33vw"
          className="object-cover"
        />
      )}
      <button
        type="button"
        aria-label={`Agrandir : ${card.label}`}
        onClick={enlarge}
        className="group absolute inset-0 z-10 cursor-zoom-in"
      >
        <span className="absolute right-2 top-2 grid size-8 place-items-center rounded-lg border border-or/50 bg-noir/70 text-or-light opacity-100 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100 sm:opacity-0">
          <Maximize2 aria-hidden className="size-3.5" />
        </span>
      </button>
      <CardLightbox
        open={open}
        onClose={() => setOpen(false)}
        label={card.label}
        image={card.image}
        video={enlargedVideo}
      />
    </li>
  );
}
