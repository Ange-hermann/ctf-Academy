"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { usePerf } from "@/hooks/use-perf";

/**
 * Vidéo décorative d'un cadre : lecture automatique muette en boucle, mais
 * uniquement tant qu'elle est visible à l'écran (IntersectionObserver) et en
 * préchargeant seulement les métadonnées. Mouvement réduit : le poster seul
 * est rendu, la vidéo n'est jamais chargée.
 */
export function CardVideo({ src, poster, className }: { src: string; poster?: string; className?: string }) {
  const { ready, reducedMotion } = usePerf();
  const ref = useRef<HTMLVideoElement>(null);
  const animate = ready && !reducedMotion;

  useEffect(() => {
    if (!animate) return;
    const v = ref.current;
    if (!v) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void v.play().catch(() => undefined);
        else v.pause();
      },
      { threshold: 0.2 },
    );
    io.observe(v);
    return () => io.disconnect();
  }, [animate, src]);

  if (!animate) {
    return poster ? (
      <Image src={poster} alt="" fill sizes="(max-width: 640px) 76vw, 33vw" className="object-cover" />
    ) : null;
  }

  return (
    <video
      ref={ref}
      src={src}
      poster={poster}
      aria-hidden
      muted
      loop
      playsInline
      preload="metadata"
      disablePictureInPicture
      className={className}
    />
  );
}
