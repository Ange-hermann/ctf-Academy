"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, ChevronDown, X } from "lucide-react";
import { BrandMedallion } from "@/components/shell/brand-medallion";
import { GoldArcs } from "@/components/shell/gold-arcs";
import { PerfToggle } from "@/components/layout/perf-toggle";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { activeSidebarIndex, churchPanelHref, churchSidebarNav, mainNav, mediaNav, publicSidebarNav, routes } from "@/content/navigation";
import { useSignedIn } from "@/hooks/use-signed-in";
import { cn } from "@/lib/utils";

/**
 * Tiroir mobile (<768 px) : glisse depuis la gauche, reprend le médaillon et les
 * 7 entrées de la barre latérale, puis les rubriques en accordéon et S'inscrire.
 */
export function MobileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState<string | null>(
    () => mainNav.find((s) => pathname.startsWith(s.href))?.label ?? null,
  );
  const closeRef = useRef<HTMLButtonElement>(null);
  const signedIn = useSignedIn();
  const active = activeSidebarIndex(pathname);
  /** Page CTF CHURCH (`/`) : le menu liste les ministères de l'Église. */
  const isChurchHome = pathname === "/";

  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    const prev = root.style.overflow;
    root.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      root.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[95] bg-noir/70 backdrop-blur-sm md:hidden"
          onClick={onClose}
        >
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            className="relative flex h-full w-[86vw] max-w-sm flex-col overflow-hidden border-r border-or/30 bg-noir shadow-[20px_0_60px_rgb(0_0_0/0.6)]"
          >
            <span aria-hidden className="absolute inset-y-0 right-0 w-px bg-linear-to-b from-or/70 via-or/35 to-or/10" />
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <Link href="/" onClick={onClose} aria-label="CTF CHURCH — Accueil" className="rounded-full">
                <BrandMedallion size={64} />
              </Link>
              <button
                ref={closeRef}
                type="button"
                aria-label="Fermer le menu"
                onClick={onClose}
                className="grid size-11 place-items-center rounded-xl border border-line text-or hover:bg-or/10"
              >
                <X aria-hidden className="size-5" />
              </button>
            </div>

            <div data-lenis-prevent className="min-h-0 flex-1 overscroll-contain overflow-y-auto">
              {/* Entrées de la barre latérale (ministères sur CTF CHURCH) */}
              <nav aria-label="Navigation rapide">
                <ul className="divide-y divide-line/50">
                  {isChurchHome && (
                    <Suspense
                      fallback={
                        <ChurchDrawerEntries selected={null} expanded={expanded} setExpanded={setExpanded} onClose={onClose} />
                      }
                    >
                      <ChurchDrawerItems expanded={expanded} setExpanded={setExpanded} onClose={onClose} />
                    </Suspense>
                  )}
                  {!isChurchHome &&
                    publicSidebarNav.map((entry, i) => {
                    const Icon = entry.icon;
                    const isActive = i === active;
                    return (
                      <li key={entry.label}>
                        <Link
                          href={entry.href}
                          onClick={onClose}
                          aria-current={isActive ? "page" : undefined}
                          className={cn(
                            "relative flex min-h-12 items-center gap-3.5 px-5 font-nav text-[1.05rem] font-medium",
                            isActive ? "text-noir" : "text-blanc/85 hover:bg-or/10",
                          )}
                        >
                          {isActive && <span aria-hidden className="absolute inset-x-2.5 inset-y-1 rounded-[10px] bg-gradient-or" />}
                          <Icon aria-hidden strokeWidth={1.7} className={cn("relative size-6", isActive ? "text-noir" : "text-or")} />
                          <span className="relative">{entry.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </nav>

              {/* Rubriques en accordéon */}
              <nav aria-label="Rubriques du site" className="mt-4 border-t border-line">
                <ul>
                  {[...mainNav, { label: "Médiathèque", href: routes.photos, icon: mainNav[0].icon, description: "", children: mediaNav }].map(
                    (section) => {
                      const isOpen = expanded === section.label;
                      return (
                        <li key={section.label} className="border-b border-line">
                          <button
                            type="button"
                            aria-expanded={isOpen}
                            onClick={() => setExpanded(isOpen ? null : section.label)}
                            className="flex min-h-13 w-full items-center justify-between px-5 font-nav text-[1.05rem] font-semibold text-or"
                          >
                            {section.label}
                            <ChevronDown aria-hidden className={cn("size-4 transition-transform", isOpen && "rotate-180")} />
                          </button>
                          <AnimatePresence initial={false}>
                            {isOpen && (
                              <motion.ul
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.28 }}
                                className="overflow-hidden"
                              >
                                {[{ label: "Vue d'ensemble", href: section.href }, ...section.children].map((link) => (
                                  <li key={link.href}>
                                    <Link
                                      href={link.href}
                                      onClick={onClose}
                                      aria-current={pathname === link.href ? "page" : undefined}
                                      className="flex min-h-11 items-center gap-3 px-6 text-blanc/75 aria-[current=page]:text-or-light"
                                    >
                                      <span aria-hidden className="h-px w-4 bg-or/50" />
                                      {link.label}
                                    </Link>
                                  </li>
                                ))}
                                <li className="h-2" />
                              </motion.ul>
                            )}
                          </AnimatePresence>
                        </li>
                      );
                    },
                  )}
                </ul>
              </nav>
            </div>

            <div className="relative px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3">
              <Button asChild size="lg" className="relative z-10 w-full" halo>
                <Link href={signedIn ? routes.studentSpace : routes.register} onClick={onClose}>
                  {signedIn ? "Mon espace" : "S'inscrire"} <ArrowRight />
                </Link>
              </Button>
              <div className="relative z-10 mt-3 flex items-center justify-center gap-2">
                <PerfToggle />
                <ThemeToggle />
              </div>
              <GoldArcs animated={false} className="absolute inset-x-0 bottom-0 -z-0 h-28 opacity-60" />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

type ChurchDrawerProps = {
  selected: string | null;
  expanded: string | null;
  setExpanded: (label: string | null) => void;
  onClose: () => void;
};

/** Ministères de la page CTF CHURCH : lisent le ministère choisi dans l'URL. */
function ChurchDrawerItems(props: Omit<ChurchDrawerProps, "selected">) {
  const selected = useSearchParams()?.get("departement") ?? null;
  return <ChurchDrawerEntries {...props} selected={selected} />;
}

function ChurchDrawerEntries({ selected, expanded, setExpanded, onClose }: ChurchDrawerProps) {
  // Le département d'un sous-ministère sélectionné reste déplié.
  const autoOpen = churchSidebarNav.find((e) => e.children?.some((c) => c.slug === selected))?.label ?? null;
  const effective = autoOpen ?? expanded;

  return (
    <>
      {churchSidebarNav.map((entry) => {
        const Icon = entry.icon;
        const deptSelected = selected === entry.slug || !!entry.children?.some((c) => c.slug === selected);
        const inner = (
          <>
            <Icon aria-hidden strokeWidth={1.7} className={cn("relative size-6", deptSelected ? "text-or-light" : "text-or")} />
            <span className={cn("relative flex-1", deptSelected && "font-semibold text-or-light")}>{entry.label}</span>
          </>
        );
        const isOpen = effective === entry.label;
        return (
          <li key={entry.label}>
            {entry.children && entry.slug ? (
              <>
                <Link
                  href={churchPanelHref(entry.slug)}
                  scroll={false}
                  aria-expanded={isOpen}
                  aria-current={selected === entry.slug ? "true" : undefined}
                  title={entry.label}
                  onClick={() => setExpanded(isOpen ? null : entry.label)}
                  className="relative flex min-h-12 w-full items-center gap-3.5 px-5 text-left font-nav text-[1.05rem] font-medium text-blanc/85 hover:bg-or/10"
                >
                  {inner}
                  <ChevronDown aria-hidden className={cn("relative size-4 text-or transition-transform", isOpen && "rotate-180")} />
                </Link>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.ul
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.28 }}
                      className="overflow-hidden"
                    >
                      {entry.children.map((child) => {
                        const childSelected = selected === child.slug;
                        return (
                          <li key={child.slug}>
                            <Link
                              href={churchPanelHref(child.slug)}
                              scroll={false}
                              title={child.label}
                              aria-current={childSelected ? "true" : undefined}
                              onClick={onClose}
                              className={cn(
                                "flex min-h-11 w-full items-center gap-3 px-6 text-left",
                                childSelected ? "text-or-light" : "text-blanc/75",
                              )}
                            >
                              <span aria-hidden className={cn("h-px w-4", childSelected ? "bg-or" : "bg-or/50")} />
                              {child.label}
                            </Link>
                          </li>
                        );
                      })}
                      <li className="h-2" />
                    </motion.ul>
                  )}
                </AnimatePresence>
              </>
            ) : entry.href ? (
              <Link
                href={entry.href}
                onClick={onClose}
                className="relative flex min-h-12 items-center gap-3.5 px-5 font-nav text-[1.05rem] font-medium text-blanc/85 hover:bg-or/10"
              >
                {inner}
              </Link>
            ) : null}
          </li>
        );
      })}
    </>
  );
}
