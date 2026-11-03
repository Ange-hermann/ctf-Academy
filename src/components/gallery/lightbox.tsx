"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight, Download, X } from "lucide-react";
import { useScrollLock } from "@/hooks/use-scroll-lock";
import type { MediaPhoto } from "@/content/media";

/**
 * Visionneuse plein écran : navigation clavier (←/→/Échap) et tactile (glisser),
 * compteur, légende, téléchargement. Le focus est piégé tant qu'elle est ouverte
 * et rendu à la fermeture.
 */
export function Lightbox({
  photos,
  index,
  onIndex,
  onClose,
}: {
  photos: MediaPhoto[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const open = index >= 0;
  const photo = open ? photos[index] : null;
  const restoreRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const touchX = useRef<number | null>(null);
  useScrollLock(open);

  const go = useCallback(
    (dir: 1 | -1) => {
      if (!photos.length) return;
      onIndex((index + dir + photos.length) % photos.length);
    },
    [index, onIndex, photos.length],
  );

  useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement as HTMLElement;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
      if (e.key === "Tab") e.preventDefault(); // focus piégé sur les contrôles
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      restoreRef.current?.focus();
    };
  }, [open, go, onClose]);

  // Préchargement de la photo suivante.
  useEffect(() => {
    if (!open || photos.length < 2) return;
    const next = photos[(index + 1) % photos.length];
    const img = new window.Image();
    img.src = next.src;
  }, [open, index, photos]);

  return (
    <AnimatePresence>
      {open && photo && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={`Photo ${index + 1} sur ${photos.length} : ${photo.title}`}
          className="fixed inset-0 z-70 flex flex-col bg-noir/95 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={onClose}
          onTouchStart={(e) => {
            touchX.current = e.touches[0]?.clientX ?? null;
          }}
          onTouchEnd={(e) => {
            if (touchX.current === null) return;
            const dx = (e.changedTouches[0]?.clientX ?? 0) - touchX.current;
            if (Math.abs(dx) > 48) go(dx < 0 ? 1 : -1);
            touchX.current = null;
          }}
        >
          {/* Barre supérieure */}
          <div className="flex items-center justify-between gap-3 p-4 sm:p-6" onClick={(e) => e.stopPropagation()}>
            <p className="font-sans text-sm text-blanc/70 tabular">
              {index + 1} / {photos.length}
            </p>
            <div className="flex items-center gap-2">
              <a
                href={photo.src}
                download
                aria-label="Télécharger la photo"
                className="grid size-11 place-items-center rounded-full border border-or/30 text-or-light transition-colors hover:border-or hover:bg-or/10"
              >
                <Download className="size-5" />
              </a>
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                aria-label="Fermer la visionneuse"
                className="grid size-11 place-items-center rounded-full border border-or/30 text-or-light transition-colors hover:border-or hover:bg-or/10 focus-visible:outline-2 focus-visible:outline-or-light"
              >
                <X className="size-5" />
              </button>
            </div>
          </div>

          {/* Image */}
          <div className="relative flex min-h-0 flex-1 items-center justify-center px-4" onClick={(e) => e.stopPropagation()}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.figure
                key={photo.id}
                className="relative flex max-h-full flex-col items-center"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.25, ease: [0.2, 0.7, 0.2, 1] }}
                drag={photos.length > 1 ? "x" : false}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.6}
                onDragEnd={(_, info) => {
                  if (Math.abs(info.offset.x) > 80) go(info.offset.x < 0 ? 1 : -1);
                }}
              >
                <span className="relative block max-h-[70dvh] overflow-hidden rounded-2xl border-gold-strong shadow-gold-lg">
                  <Image
                    src={photo.src}
                    alt={photo.caption || photo.title}
                    width={photo.width}
                    height={photo.height}
                    className="h-auto max-h-[70dvh] w-auto max-w-[92vw] object-contain"
                    sizes="92vw"
                    priority
                  />
                </span>
                <figcaption className="mt-3 max-w-2xl text-center text-sm text-blanc/75">{photo.caption}</figcaption>
              </motion.figure>
            </AnimatePresence>

            {photos.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    go(-1);
                  }}
                  aria-label="Photo précédente"
                  className="absolute left-3 top-1/2 grid size-12 -translate-y-1/2 place-items-center rounded-full border border-or/40 bg-noir/70 text-or-light transition-all hover:border-or hover:bg-or/15 hover:shadow-gold focus-visible:outline-2 focus-visible:outline-or-light sm:left-6"
                >
                  <ChevronLeft className="size-6" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    go(1);
                  }}
                  aria-label="Photo suivante"
                  className="absolute right-3 top-1/2 grid size-12 -translate-y-1/2 place-items-center rounded-full border border-or/40 bg-noir/70 text-or-light transition-all hover:border-or hover:bg-or/15 hover:shadow-gold focus-visible:outline-2 focus-visible:outline-or-light sm:right-6"
                >
                  <ChevronRight className="size-6" />
                </button>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
