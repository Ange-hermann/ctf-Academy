"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";
import { usePerf } from "@/hooks/use-perf";
import { cn } from "@/lib/utils";

const SWITCH_MS = 3000;

/**
 * Cadre à contenus alternés : l'image et la vidéo se relaient toutes les 3 s
 * en fondu enchaîné (opacity uniquement). La vidéo ne démarre jamais seule :
 * le bouton lecture la lance à la demande et elle est mise en pause dès que
 * l'image revient. Mode allégé ou prefers-reduced-motion : l'image seule
 * reste affichée et la vidéo n'est pas chargée.
 */
export function CardSwitcher({
  image,
  video,
  alt,
  onPhaseChange,
}: {
  image: string;
  video: string;
  alt: string;
  onPhaseChange?: (showVideo: boolean) => void;
}) {
  const { tier, reducedMotion } = usePerf();
  const animate = tier === "full" && !reducedMotion;
  const [showVideo, setShowVideo] = useState(false);
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!animate) return;
    const id = window.setInterval(() => setShowVideo((v) => !v), SWITCH_MS);
    return () => window.clearInterval(id);
  }, [animate]);

  useEffect(() => {
    onPhaseChange?.(showVideo);
    if (!showVideo) videoRef.current?.pause();
  }, [showVideo, onPhaseChange]);

  const play = () => void videoRef.current?.play().catch(() => undefined);

  return (
    <>
      <Image
        src={image}
        alt={alt}
        fill
        sizes="(max-width: 640px) 82vw, 33vw"
        className="object-cover"
      />
      {animate && (
        <>
          <video
            ref={videoRef}
            src={video}
            poster={image}
            aria-hidden
            loop
            playsInline
            preload="metadata"
            disablePictureInPicture
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            className={cn(
              "absolute inset-0 size-full object-cover transition-opacity duration-700",
              showVideo ? "opacity-100" : "opacity-0",
            )}
          />
          {showVideo && !playing && (
            <button
              type="button"
              onClick={play}
              aria-label={`Lire la vidéo : ${alt}`}
              className="absolute left-1/2 top-1/2 z-20 grid size-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-or-light bg-noir/60 text-or-light transition-colors hover:bg-or hover:text-noir"
            >
              <Play aria-hidden className="size-5 fill-current" />
            </button>
          )}
        </>
      )}
    </>
  );
}
