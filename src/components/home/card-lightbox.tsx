"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";

/**
 * Agrandissement d'un cadre de l'accueil (clic sur le cadre) : image en grand
 * ou lecteur vidéo natif selon le contenu. Échap / clic extérieur pour
 * fermer, focus rendu au départ.
 */
export function CardLightbox({
  open,
  onClose,
  label,
  image,
  video,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  image: string;
  video?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Lecture avec son à l'ouverture ; si le navigateur refuse l'autoplay sonore,
  // repli en lecture muette (le son se réactive via les contrôles natifs).
  useEffect(() => {
    const v = videoRef.current;
    if (!open || !video || !v) return;
    v.muted = false;
    void v.play().catch(() => {
      v.muted = true;
      void v.play().catch(() => undefined);
    });
  }, [open, video]);

  useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return onClose();
      if (e.key !== "Tab" || !panelRef.current) return;
      const items = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>("button, video"),
      ).filter((el) => el.offsetParent !== null);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      restoreRef.current?.focus?.();
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={label}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[120] grid place-items-center bg-noir/55 p-4"
          onClick={onClose}
        >
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.25, ease: [0.2, 0.7, 0.2, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-[min(92vw,40rem)] overflow-hidden rounded-2xl border border-or/40 bg-noir shadow-[0_24px_60px_-20px_rgb(0_0_0/0.8),0_0_36px_rgb(201_162_39/0.12)]"
          >
            <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-3.5">
              <p className="min-w-0 truncate font-nav font-semibold text-or-light">{label}</p>
              <button
                type="button"
                aria-label="Fermer"
                onClick={onClose}
                className="grid size-10 shrink-0 place-items-center rounded-xl border border-line text-or transition-colors hover:border-or/50 hover:bg-or/10"
              >
                <X aria-hidden className="size-5" />
              </button>
            </div>
            <div className="relative aspect-video bg-noir">
              {video ? (
                <video ref={videoRef} src={video} controls playsInline className="size-full" />
              ) : (
                <Image
                  src={image}
                  alt={label}
                  fill
                  sizes="(max-width: 992px) 94vw, 62rem"
                  className="object-contain"
                />
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
