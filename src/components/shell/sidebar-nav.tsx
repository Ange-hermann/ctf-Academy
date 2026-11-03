"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown } from "lucide-react";
import { BrandMedallion } from "@/components/shell/brand-medallion";
import { GoldArcs } from "@/components/shell/gold-arcs";
import { activeSidebarIndex, churchPanelHref, churchSidebarNav, publicSidebarNav } from "@/content/navigation";
import { usePerf } from "@/hooks/use-perf";
import { cn } from "@/lib/utils";

/**
 * Barre latérale publique (maquette) : médaillon, 7 entrées à icône dorée,
 * pilule active en dégradé or qui glisse, arcs dorés en bas.
 * ≥1024 px : 280 px fixes. 768–1023 px : rail 84 px qui se déploie au survol/focus
 * en superposition. <768 px : masquée (le tiroir mobile prend le relais).
 */
export function SidebarNav() {
  const pathname = usePathname();
  const { reducedMotion } = usePerf();
  const asideRef = useRef<HTMLElement>(null);
  const arcsRef = useRef<HTMLDivElement>(null);
  const lite = reducedMotion;

  const active = activeSidebarIndex(pathname);
  /** Page CTF CHURCH (`/`) : la barre latérale liste les ministères de l'Église. */
  const isChurchHome = pathname === "/";

  const onPointerMove = (e: React.PointerEvent) => {
    if (lite || e.pointerType !== "mouse" || !asideRef.current || !arcsRef.current) return;
    const r = asideRef.current.getBoundingClientRect();
    const dx = ((e.clientX - r.left) / r.width - 0.5) * 12;
    const dy = ((e.clientY - r.top) / r.height - 0.5) * 12;
    arcsRef.current.style.transform = `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0)`;
  };

  return (
    <aside
      ref={asideRef}
      onPointerMove={onPointerMove}
      className="group/sidebar fixed inset-y-0 left-0 z-50 hidden flex-col overflow-hidden bg-noir transition-[width] duration-300 ease-out-expo md:flex md:w-sidebar-rail md:hover:w-sidebar md:focus-within:w-sidebar lg:w-sidebar"
    >
      {/* Filet doré lumineux sur le bord droit */}
      <span
        aria-hidden
        className="absolute inset-y-0 right-0 w-px bg-linear-to-b from-or/80 via-or/45 to-or/10 shadow-[2px_0_18px_rgb(201_162_39/0.4)]"
      />

      {/* Carré noir du logo (format de la référence) */}
      <div className="px-5 pt-6 pb-5 md:max-lg:px-2 md:max-lg:pt-3">
        <Link
          href="/"
          aria-label="CTF CHURCH — Accueil"
          className="relative mx-auto block aspect-square w-full overflow-hidden rounded-xl border border-or/15 bg-noir shadow-[inset_0_0_40px_rgb(0_0_0/0.55)] lg:w-44 md:max-lg:group-hover/sidebar:w-44 md:max-lg:group-focus-within/sidebar:w-44"
        >
          <BrandMedallion size={280} src="/ctf-card.png" className="size-full object-contain" />
        </Link>
      </div>

      {/* Bande dorée pleine largeur — nom de l'espace (comme la référence) */}
      <div className="bg-gradient-or py-3 text-center">
        <span className="font-nav text-sm font-extrabold tracking-[0.32em] whitespace-nowrap text-noir uppercase md:max-lg:hidden md:max-lg:group-hover/sidebar:inline md:max-lg:group-focus-within/sidebar:inline">
          {isChurchHome ? "Ministères" : "CTF CHURCH"}
        </span>
        <span className="hidden font-nav text-sm font-extrabold tracking-[0.3em] text-noir uppercase md:max-lg:inline md:max-lg:group-hover/sidebar:hidden md:max-lg:group-focus-within/sidebar:hidden">
          CTF
        </span>
      </div>

      {/* Arcs dorés + halo en décor de fond (derrière les entrées) */}
      <div ref={arcsRef} className="pointer-events-none absolute inset-x-0 bottom-0 transition-transform duration-300 ease-out will-change-transform">
        <GoldArcs animated={!lite} className="opacity-60 md:max-lg:scale-x-[0.4] md:max-lg:origin-bottom-left md:group-hover/sidebar:scale-x-100 md:group-focus-within/sidebar:scale-x-100 md:max-lg:transition-transform md:max-lg:duration-300" />
      </div>

      <nav aria-label={isChurchHome ? "Ministères de l'Église" : "Navigation du site"} data-lenis-prevent className="relative z-10 mt-3 flex-1 overflow-y-auto">
        <ul className="flex min-h-full flex-col gap-2 px-3">
          {isChurchHome && (
            <Suspense fallback={<ChurchEntries selected={null} />}>
              <ChurchSidebarEntries />
            </Suspense>
          )}
          {!isChurchHome &&
            publicSidebarNav.map((entry, i) => {
            const Icon = entry.icon;
            const isActive = i === active;
            return (
              <li key={entry.label} className="relative flex shrink-0 items-center">
                <Link
                  href={entry.href}
                  aria-current={isActive ? "page" : undefined}
                  title={entry.label}
                  className={cn(
                    "group/link relative flex h-9 w-full items-center gap-3 rounded-[9px] px-4 transition-[background-color,transform] duration-200",
                    "hover:bg-or/10 md:max-lg:justify-center md:max-lg:px-0",
                    "md:group-hover/sidebar:justify-start md:group-hover/sidebar:px-4 md:group-focus-within/sidebar:justify-start md:group-focus-within/sidebar:px-4",
                    !isActive && "hover:translate-x-1",
                  )}
                >
                  {isActive && (
                    <motion.span
                      layoutId="public-sidebar-pill"
                      aria-hidden
                      transition={{ type: "spring", stiffness: 380, damping: 34 }}
                      className="absolute inset-0 rounded-[10px] border border-or/50 bg-or/15 shadow-[0_0_14px_rgb(201_162_39/0.15)]"
                    />
                  )}
                  <Icon
                    aria-hidden
                    strokeWidth={1.7}
                    className={cn(
                      "relative size-4.5 shrink-0 transition-colors",
                      isActive ? "text-or-light" : "text-blanc/70 group-hover/link:text-or-light",
                    )}
                  />
                  <span
                    className={cn(
                      "relative font-nav text-[13px] font-normal tracking-[0.08em] whitespace-nowrap uppercase transition-opacity duration-200",
                      "md:max-lg:opacity-0 md:group-hover/sidebar:opacity-100 md:group-focus-within/sidebar:opacity-100",
                      isActive ? "font-semibold text-or-light" : "text-blanc/85",
                    )}
                  >
                    {entry.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}

/** Ministères de la page CTF CHURCH : lisent le ministère choisi dans l'URL. */
function ChurchSidebarEntries() {
  const selected = useSearchParams()?.get("departement") ?? null;
  return <ChurchEntries selected={selected} />;
}

function ChurchEntries({ selected }: { selected: string | null }) {
  const [open, setOpen] = useState<string | null>(null);
  // Le département d'un sous-ministère sélectionné reste déplié.
  const autoOpen = churchSidebarNav.find((e) => e.children?.some((c) => c.slug === selected))?.label ?? null;
  const expanded = autoOpen ?? open;

  return (
    <>
      {churchSidebarNav.map((entry) => {
        const Icon = entry.icon;
        const isOpen = expanded === entry.label;
        const deptSelected = selected === entry.slug || !!entry.children?.some((c) => c.slug === selected);
        const itemClass =
          "group/link relative flex h-9 w-full items-center gap-3 rounded-[9px] px-4 text-left transition-[background-color,transform] duration-200 hover:bg-or/10 hover:translate-x-1 md:max-lg:justify-center md:max-lg:px-0 md:group-hover/sidebar:justify-start md:group-hover/sidebar:px-4 md:group-focus-within/sidebar:justify-start md:group-focus-within/sidebar:px-4";
        const label = (
          <span
            className={cn(
              "relative font-nav text-[13px] font-normal tracking-[0.08em] whitespace-nowrap uppercase transition-opacity duration-200 md:max-lg:opacity-0 md:group-hover/sidebar:opacity-100 md:group-focus-within/sidebar:opacity-100",
              deptSelected ? "font-semibold text-or-light" : "text-blanc/85",
            )}
          >
            {entry.label}
          </span>
        );
        return (
          <li key={entry.label} className={cn("relative flex shrink-0", entry.children ? "flex-col" : "items-center")}>
            {entry.children && entry.slug ? (
              <>
                <Link
                  href={churchPanelHref(entry.slug)}
                  scroll={false}
                  title={entry.label}
                  aria-expanded={isOpen}
                  aria-current={selected === entry.slug ? "true" : undefined}
                  onClick={() => setOpen(isOpen ? null : entry.label)}
                  className={itemClass}
                >
                  <Icon
                    aria-hidden
                    strokeWidth={1.7}
                    className={cn(
                      "relative size-4.5 shrink-0 transition-colors",
                      deptSelected ? "text-or-light" : "text-blanc/70 group-hover/link:text-or-light",
                    )}
                  />
                  {label}
                  <ChevronDown
                    aria-hidden
                    className={cn(
                      "relative ml-auto size-3.5 shrink-0 text-or/70 transition-transform duration-300",
                      "md:max-lg:opacity-0 md:group-hover/sidebar:opacity-100 md:group-focus-within/sidebar:opacity-100",
                      isOpen && "rotate-180",
                    )}
                  />
                </Link>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.ul
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden md:max-lg:hidden md:group-hover/sidebar:block md:group-focus-within/sidebar:block"
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
                              className={cn(
                                "flex h-8 w-full items-center gap-2.5 rounded-lg pr-3 pl-9 text-left font-nav text-xs tracking-[0.06em] whitespace-nowrap uppercase transition-colors hover:bg-or/10",
                                childSelected ? "text-or-light" : "text-blanc/75 hover:text-blanc",
                              )}
                            >
                              <span aria-hidden className={cn("h-px w-3.5 shrink-0", childSelected ? "bg-or" : "bg-or/50")} />
                              {child.label}
                            </Link>
                          </li>
                        );
                      })}
                    </motion.ul>
                  )}
                </AnimatePresence>
              </>
            ) : entry.href ? (
              <Link href={entry.href} title={entry.label} className={itemClass}>
                <Icon aria-hidden strokeWidth={1.7} className="relative size-4.5 shrink-0 text-blanc/70 transition-colors group-hover/link:text-or-light" />
                {label}
              </Link>
            ) : null}
          </li>
        );
      })}
    </>
  );
}
