"use client";

import { useEffect, useRef } from "react";

/**
 * Vidéo décorative d'un cadre : lecture automatique muette en boucle.
 * Le play() est relancé au montage pour couvrir les cas où l'attribut
 * `autoplay` seul ne démarre pas (navigation SPA, onglet masqué, etc.).
 */
export function CardVideo({ src, poster, className }: { src: string; poster?: string; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const tryPlay = () => void v.play().catch(() => undefined);
    tryPlay();
    v.addEventListener("canplay", tryPlay);
    return () => v.removeEventListener("canplay", tryPlay);
  }, [src]);

  return (
    <video
      ref={ref}
      src={src}
      poster={poster}
      aria-hidden
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      disablePictureInPicture
      className={className}
    />
  );
}
