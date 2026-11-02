"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Play, X } from "lucide-react";
import type { MediaVideo } from "@/content/media";
import { formatDuration } from "@/content/media";

/** URL d'intégration : l'iframe n'est construite qu'au moment de la lecture (façade). */
const embedUrl = (video: MediaVideo) => {
  if (video.source === "youtube") {
    const m = video.url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/);
    const id = m?.[1] ?? video.url;
    return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
  }
  if (video.source === "vimeo") {
    const m = video.url.match(/vimeo\.com\/(\d+)/);
    const id = m?.[1] ?? video.url;
    return `https://player.vimeo.com/video/${id}?autoplay=1`;
  }
  return video.url; // upload : fichier hébergé
};

/**
 * Lecteur vidéo en fenêtre modale (contrôlé par le parent) : affiche + bouton
 * lecture doré — l'iframe n'est chargée qu'au clic (façade, aucune requête tierce
 * avant), Échap / clic extérieur pour fermer, focus rendu au départ.
 */
export function VideoModal({
  video,
  open,
  onClose,
  emptyHint,
}: {
  video: MediaVideo | null;
  open: boolean;
  onClose: () => void;
  emptyHint?: string;
}) {
  const [playing, setPlaying] = useState(false);
  const [wasOpen, setWasOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);

  if (open !== wasOpen) {
    setWasOpen(open);
    if (open && video) setPlaying(!!video.url && video.source === "upload");
    if (!open) setPlaying(false);
  }

  useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key !== "Tab" || !panelRef.current) return;
      const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>("button, a[href], video, iframe")).filter(
        (el) => el.offsetParent !== null,
      );
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
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
      {open && video && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={video.title}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[120] grid place-items-center bg-noir/90 p-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, scale: 0.96, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 14 }}
            transition={{ duration: 0.3, ease: [0.2, 0.7, 0.2, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-[min(94vw,62rem)] overflow-hidden rounded-2xl border border-gold-strong bg-noir shadow-[0_40px_90px_-20px_rgb(0_0_0/0.9),0_0_50px_rgb(201_162_39/0.15)]"
          >
            <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-3.5">
              <p className="min-w-0 truncate font-nav font-semibold text-or-light">{video.title}</p>
              <div className="flex shrink-0 items-center gap-3">
                <span className="tabular text-sm text-blanc/55">{formatDuration(video.durationSec)}</span>
                <button
                  type="button"
                  aria-label="Fermer le lecteur"
                  onClick={onClose}
                  className="grid size-10 place-items-center rounded-xl border border-line text-or transition-colors hover:border-or/50 hover:bg-or/10"
                >
                  <X aria-hidden className="size-5" />
                </button>
              </div>
            </div>

            <div className="relative aspect-video bg-noir">
              {playing && video.url ? (
                video.source === "upload" ? (
                  <video src={embedUrl(video)} controls autoPlay className="size-full" />
                ) : (
                  <iframe
                    src={embedUrl(video)}
                    title={video.title}
                    allow="accelerometer; autoplay; encrypted-media; picture-in-picture"
                    allowFullScreen
                    className="size-full border-0"
                  />
                )
              ) : (
                <>
                  <Image src={video.poster} alt="" fill sizes="(max-width: 992px) 94vw, 62rem" className="object-cover" />
                  <span aria-hidden className="absolute inset-0 bg-noir/45" />
                  <div className="absolute inset-0 grid place-items-center">
                    {video.url ? (
                      <button
                        type="button"
                        onClick={() => setPlaying(true)}
                        aria-label={`Lire : ${video.title}`}
                        className="group grid size-20 place-items-center rounded-full border-2 border-or-light bg-noir/60 text-or-light transition-all animate-ring-pulse hover:bg-or hover:text-noir"
                      >
                        <Play aria-hidden className="size-9 fill-current" />
                      </button>
                    ) : (
                      <p className="mx-4 rounded-xl border border-line bg-noir/80 px-5 py-3 text-center font-nav text-or-light">
                        Vidéo d&apos;exemple — lecteur à venir
                        {emptyHint ? <span className="mt-1 block text-sm text-blanc/60">{emptyHint}</span> : null}
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>

            {video.description && (
              <p className="border-t border-line px-5 py-4 text-sm leading-relaxed text-blanc/70">{video.description}</p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
