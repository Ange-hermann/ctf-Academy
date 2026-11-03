"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { BookOpen, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { churchHome } from "@/content/church";

/**
 * Bouton « Lire la suite » du grand cadre CTF CHURCH : ouvre une fenêtre
 * modale contenant le texte officiel complet de présentation de l'Église.
 * Échap / clic extérieur pour fermer, focus rendu au départ.
 */
export function ChurchReadMore() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <BookOpen aria-hidden /> Lire la suite
      </Button>
      <ChurchTextDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function ChurchTextDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return onClose();
      if (e.key !== "Tab" || !panelRef.current) return;
      const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>("button")).filter(
        (el) => el.offsetParent !== null,
      );
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
          aria-label="Présentation complète de l'Église"
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
            className="flex max-h-[85vh] w-[min(94vw,44rem)] flex-col overflow-hidden rounded-2xl border border-or/40 bg-noir shadow-[0_24px_60px_-20px_rgb(0_0_0/0.8),0_0_36px_rgb(201_162_39/0.12)]"
          >
            <div className="flex shrink-0 items-center justify-between gap-4 border-b border-line px-5 py-3.5 sm:px-7">
              <p className="min-w-0 truncate font-nav font-semibold text-or-light">
                Centre de Transformation des Familles
              </p>
              <button
                type="button"
                aria-label="Fermer"
                onClick={onClose}
                className="grid size-10 shrink-0 place-items-center rounded-xl border border-line text-or transition-colors hover:border-or/50 hover:bg-or/10"
              >
                <X aria-hidden className="size-5" />
              </button>
            </div>
            <div
              data-lenis-prevent
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-7 sm:py-6"
            >
              <div className="space-y-4 text-[0.95rem] leading-relaxed text-blanc/80">
                <h3 className="font-display text-xl font-extrabold tracking-wide text-gradient-gold-metal sm:text-2xl">
                  Bienvenue au Centre de Transformation des Familles
                </h3>
                {churchHome.welcome.map((t) => (
                  <p key={t.slice(0, 24)}>{t}</p>
                ))}
                {churchHome.sections.map((s) => (
                  <div key={s.heading} className="pt-2">
                    <h4 className="font-nav text-xs font-bold tracking-[0.24em] text-or-light uppercase">
                      {s.heading}
                    </h4>
                    <div className="mt-2 space-y-2.5">
                      {s.paragraphs?.map((t) => <p key={t.slice(0, 24)}>{t}</p>)}
                      {s.lead && <p>{s.lead}</p>}
                      {s.items && (
                        <ul className="list-disc space-y-1.5 pl-5 marker:text-or">
                          {s.items.map((it) => (
                            <li key={it.lead}>
                              <strong className="font-semibold text-blanc">{it.lead}</strong> : {it.text}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                ))}
                <p className="pt-1 font-nav text-[11px] font-semibold tracking-[0.2em] text-or-light/90 uppercase">
                  CTF CHURCH — {churchHome.tagline}
                </p>
                <blockquote className="border-l-2 border-or/60 pl-4 font-display text-[0.95rem] leading-relaxed text-or-light/90 italic">
                  « {churchHome.verse} »
                </blockquote>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
