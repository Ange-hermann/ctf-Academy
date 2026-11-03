"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, X } from "lucide-react";
import { BrandMedallion } from "@/components/shell/brand-medallion";
import { Button } from "@/components/ui/button";
import { mainNav, mediaNav, routes } from "@/content/navigation";
import { useScrollLock } from "@/hooks/use-scroll-lock";
import { useSignedIn } from "@/hooks/use-signed-in";

const columns = [...mainNav, { label: "Médiathèque", href: routes.photos, description: "", icon: mainNav[0].icon, children: mediaNav }];

/**
 * Menu plein écran (icône hamburger, bureau) : voile noir en verre, pages de
 * l'organigramme en colonnes, liens en cascade, grand bouton S'inscrire.
 * Fermeture : Échap, clic extérieur, bouton ✕. Le focus reste piégé à l'intérieur.
 */
export function FullMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const signedIn = useSignedIn();

  useScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const prevFocus = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return onClose();
      if (e.key !== "Tab" || !panelRef.current) return;
      const items = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled])"),
      ).filter((el) => el.offsetParent !== null);
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
      prevFocus?.focus?.();
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Menu complet"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          className="fixed inset-0 z-[90] hidden bg-noir/95 backdrop-blur-xl supports-[backdrop-filter]:bg-noir/90 md:block"
          onClick={onClose}
        >
          {/* Balayage doré à l'ouverture */}
          <motion.span
            aria-hidden
            initial={{ x: "-110%" }}
            animate={{ x: "220%" }}
            transition={{ duration: 0.9, ease: [0.2, 0.7, 0.2, 1] }}
            className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-linear-to-r from-transparent via-or/15 to-transparent"
          />
          <div
            ref={panelRef}
            onClick={(e) => e.stopPropagation()}
            data-lenis-prevent
            className="relative flex h-full flex-col overflow-y-auto"
          >
            <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-8 pt-8">
              <BrandMedallion size={76} />
              <button
                ref={closeRef}
                type="button"
                aria-label="Fermer le menu"
                onClick={onClose}
                className="grid size-12 place-items-center rounded-xl border border-line text-or transition-colors hover:border-or/50 hover:bg-or/10"
              >
                <X aria-hidden className="size-6" />
              </button>
            </div>

            <nav aria-label="Toutes les pages" className="mx-auto grid w-full max-w-6xl flex-1 content-center gap-10 px-8 py-10 sm:grid-cols-2 lg:grid-cols-5">
              {columns.map((col, ci) => (
                <motion.div
                  key={col.label}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0, transition: { delay: 0.15 + ci * 0.07 } }}
                >
                  <Link
                    href={col.href}
                    onClick={onClose}
                    className="font-nav text-sm font-semibold tracking-[0.24em] text-or-light uppercase hover:text-or"
                  >
                    {col.label}
                  </Link>
                  <span aria-hidden className="mt-3 block h-px w-10 bg-or/50" />
                  <ul className="mt-4 space-y-1">
                    {[{ label: "Vue d'ensemble", href: col.href }, ...col.children].map((link, i) => (
                      <motion.li
                        key={`${link.href}-${i}`}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0, transition: { delay: 0.25 + ci * 0.07 + i * 0.04 } }}
                      >
                        <Link
                          href={link.href}
                          onClick={onClose}
                          className="group flex min-h-11 items-center gap-2.5 text-blanc/75 transition-colors hover:text-or-light"
                        >
                          <span aria-hidden className="h-px w-3 bg-or/50 transition-all group-hover:w-5 group-hover:bg-or" />
                          {link.label}
                        </Link>
                      </motion.li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </nav>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0, transition: { delay: 0.6 } }}
              className="mx-auto w-full max-w-6xl px-8 pb-12"
            >
              <div className="flex flex-wrap items-center gap-6">
                <Button asChild size="lg" className="w-full sm:w-auto" halo>
                  <Link href={signedIn ? routes.studentSpace : routes.register} onClick={onClose}>
                    {signedIn ? "Mon espace" : "S'inscrire maintenant"} <ArrowRight />
                  </Link>
                </Button>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
