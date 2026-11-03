"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { usePerf } from "@/hooks/use-perf";
import { cn } from "@/lib/utils";

const SWITCH_MS = 3000;

/**
 * Cadre à contenus alternés : l'image et la vidéo se relaient toutes les 3 s
 * en fondu enchaîné (opacity uniquement). Pendant sa phase, la vidéo joue
 * muette en boucle — uniquement tant qu'elle est visible à l'écran ; elle
 * est mise en pause dès que l'image revient ou que le cadre sort du champ.
 * prefers-reduced-motion : l'image seule reste affichée et la vidéo n'est
 * pas chargée.
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
  const { ready, reducedMotion } = usePerf();
  const animate = ready && !reducedMotion;
  const [showVideo, setShowVideo] = useState(false);
  const [visible, setVisible] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!animate) return;
    const id = window.setInterval(() => setShowVideo((v) => !v), SWITCH_MS);
    return () => window.clearInterval(id);
  }, [animate]);

  useEffect(() => {
    if (!animate) return;
    const v = videoRef.current;
    if (!v) return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.2 });
    io.observe(v);
    return () => io.disconnect();
  }, [animate]);

  useEffect(() => {
    onPhaseChange?.(showVideo);
    const v = videoRef.current;
    if (!v) return;
    if (showVideo && visible) void v.play().catch(() => undefined);
    else v.pause();
  }, [showVideo, visible, onPhaseChange]);

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
        <video
          ref={videoRef}
          src={video}
          poster={image}
          aria-hidden
          muted
          loop
          playsInline
          preload="metadata"
          disablePictureInPicture
          className={cn(
            "absolute inset-0 size-full object-cover transition-opacity duration-700",
            showVideo ? "opacity-100" : "opacity-0",
          )}
        />
      )}
    </>
  );
}
