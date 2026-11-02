"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { registrationGuide } from "@/content/admissions";

/**
 * Bouton « Suite » de /inscription : ouvre le guide d'inscription en fenêtre
 * (6 étapes numérotées). Échap / clic extérieur pour fermer, focus rendu au
 * départ ; « Commencer » ferme puis fait défiler vers les étapes du wizard.
 */
export function InscriptionGuide() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return setOpen(false);
      if (e.key !== "Tab" || !panelRef.current) return;
      const items = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>("button, a[href]"),
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
  }, [open]);

  const closeAndGoToSteps = () => {
    setOpen(false);
    document.getElementById("etapes")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <Button size="sm" className="mt-5 min-h-9 w-fit self-end px-3" onClick={() => setOpen(true)}>
        Suite <ArrowRight />
      </Button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Guide d'inscription"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[120] grid place-items-center bg-noir/55 p-4"
            onClick={() => setOpen(false)}
          >
            <motion.div
              ref={panelRef}
              initial={{ opacity: 0, scale: 0.97, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 8 }}
              transition={{ duration: 0.25, ease: [0.2, 0.7, 0.2, 1] }}
              onClick={(e) => e.stopPropagation()}
              data-lenis-prevent
              className="max-h-[78vh] w-[min(92vw,42rem)] overflow-y-auto rounded-2xl border border-or/40 bg-noir-card shadow-[0_24px_60px_-20px_rgb(0_0_0/0.8),0_0_36px_rgb(201_162_39/0.12)]"
            >
              <div className="border-b border-line px-5 py-4">
                <div className="flex items-center justify-between gap-4">
                  <p className="font-nav text-sm font-bold tracking-[0.14em] text-blanc uppercase">CTF ACADEMY</p>
                  <p className="font-nav text-xs font-semibold tracking-[0.22em] text-or uppercase">
                    Guide d&apos;inscription
                  </p>
                  <button
                    type="button"
                    aria-label="Fermer"
                    onClick={() => setOpen(false)}
                    className="-mr-2 grid size-9 shrink-0 place-items-center rounded-xl border border-line text-or transition-colors hover:border-or/50 hover:bg-or/10"
                  >
                    <X aria-hidden className="size-4.5" />
                  </button>
                </div>
              </div>

              <div className="px-5 py-5">
                <ol className="grid gap-3 sm:grid-cols-2">
                  {registrationGuide.map((s, i) => (
                    <li key={s.title} className="rounded-xl border border-line bg-noir-soft p-4">
                      <div className="flex items-start gap-3">
                        <span
                          aria-hidden
                          className="grid size-8 shrink-0 place-items-center rounded-full bg-gradient-or font-nav text-xs font-bold text-noir shadow-gold-sm"
                        >
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-blanc">{s.title}</p>
                          <p className="mt-1 text-[13px] leading-snug text-blanc/65">{s.text}</p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>

                <div className="mt-5 flex justify-end">
                  <Button size="sm" onClick={closeAndGoToSteps}>
                    Commencer <ArrowRight />
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
