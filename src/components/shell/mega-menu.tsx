"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import type { NavSection } from "@/content/navigation";

type Props = {
  section: NavSection | null;
  onClose: () => void;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
};

/**
 * Méga-menu de la barre supérieure : panneau en verre sombre, liens en cascade
 * (40 ms d'écart), navigation aux flèches, fermeture Échap / clic extérieur.
 */
export function MegaMenu({ section, onClose, onPointerEnter, onPointerLeave }: Props) {
  const pathname = usePathname();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!section) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      const items = Array.from(panelRef.current?.querySelectorAll<HTMLElement>("[data-menuitem]") ?? []);
      if (!items.length) return;
      e.preventDefault();
      const idx = items.indexOf(document.activeElement as HTMLElement);
      const next = e.key === "ArrowDown" ? (idx + 1) % items.length : (idx - 1 + items.length) % items.length;
      items[next]?.focus();
    };
    const onPointerDown = (e: PointerEvent) => {
      if (!panelRef.current?.contains(e.target as Node)) onClose();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [section, onClose]);

  return (
    <AnimatePresence>
      {section && (
        <motion.div
          key={section.label}
          ref={panelRef}
          role="menu"
          aria-label={`Sous-menu ${section.label}`}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.28, ease: [0.2, 0.7, 0.2, 1] }}
          onPointerEnter={onPointerEnter}
          onPointerLeave={onPointerLeave}
          className="absolute inset-x-0 top-full hidden justify-center lg:flex"
        >
          <div className="mx-7 w-full max-w-4xl overflow-hidden rounded-b-2xl border border-t-0 border-gold-soft bg-noir/95 shadow-[0_30px_60px_-20px_rgb(0_0_0/0.8),0_0_30px_rgb(201_162_39/0.08)] backdrop-blur-xl supports-[backdrop-filter]:bg-noir/85">
            <div className="grid grid-cols-[1fr_2fr]">
              <div className="border-r border-line p-6">
                <p className="font-nav text-xs font-semibold tracking-[0.28em] text-or-light uppercase">{section.label}</p>
                <p className="mt-3 text-sm leading-relaxed text-blanc/65">{section.description}</p>
                <Link
                  href={section.href}
                  data-menuitem
                  className="mt-5 inline-flex min-h-10 items-center gap-2 font-nav text-sm font-semibold text-or-light hover:text-or"
                >
                  Tout voir <ArrowRight aria-hidden className="size-4" />
                </Link>
              </div>
              <ul className="grid grid-cols-2 gap-1.5 p-4">
                {section.children.map((link, i) => (
                  <motion.li
                    key={link.href}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0, transition: { delay: 0.04 * i, duration: 0.3 } }}
                  >
                    <Link
                      href={link.href}
                      data-menuitem
                      aria-current={pathname === link.href ? "page" : undefined}
                      className="group flex h-full flex-col rounded-xl border border-transparent p-3.5 transition-colors hover:border-line hover:bg-or/[0.07] focus-visible:bg-or/[0.07] aria-[current=page]:border-or/30 aria-[current=page]:bg-or/5"
                    >
                      <span className="flex items-center justify-between font-nav font-semibold text-blanc group-hover:text-or-light">
                        {link.label}
                        <ArrowRight
                          aria-hidden
                          className="size-4 -translate-x-2 text-or opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100"
                        />
                      </span>
                      {link.description && <span className="mt-1 text-[0.83rem] leading-snug text-blanc/55">{link.description}</span>}
                    </Link>
                  </motion.li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
