"use client";

import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import { motion } from "motion/react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { BrandMedallion } from "@/components/shell/brand-medallion";
import { GoldArcs } from "@/components/shell/gold-arcs";
import { cn } from "@/lib/utils";

/**
 * Barre latérale au format du site principal (maquette) : carte logo carrée, bande dorée
 * pleine largeur au nom de l'espace, entrées compactes en majuscules, pilule dorée active,
 * arcs dorés en fond. Partagée par l'espace étudiant et l'administration (≥ 1024 px), repliable.
 * `variant="drawer"` : même rendu déplié à l'intérieur du tiroir mobile — toujours dépliée,
 * bouton « Fermer » en bas au lieu de « Replier », pied libre (Déconnexion…).
 */
export function BrandSidebar({
  homeHref,
  homeLabel,
  ribbon,
  navLabel,
  collapsed,
  onToggle,
  children,
  variant = "fixed",
  onClose,
  footer,
}: {
  homeHref: string;
  homeLabel: string;
  ribbon: string;
  navLabel: string;
  collapsed: boolean;
  onToggle: () => void;
  children: ReactNode;
  /** `drawer` : rendu déplié pour le tiroir mobile (hauteur 100 %, non fixe). */
  variant?: "fixed" | "drawer";
  /** Drawer : ferme le tiroir (bouton « Fermer le menu » en pied). */
  onClose?: () => void;
  /** Drawer : contenu supplémentaire en pied (ex. bouton Déconnexion). */
  footer?: ReactNode;
}) {
  const drawer = variant === "drawer";
  const folded = collapsed && !drawer;
  return (
    <aside
      className={cn(
        drawer
          ? "relative flex h-full w-full flex-col overflow-hidden bg-noir"
          : "fixed inset-y-0 left-0 z-40 hidden flex-col overflow-hidden bg-noir transition-[width] duration-300 ease-out-expo lg:flex",
        !drawer && (collapsed ? "w-sidebar-rail" : "w-sidebar"),
      )}
    >
      {/* Filet doré lumineux sur le bord droit */}
      <span
        aria-hidden
        className="absolute inset-y-0 right-0 w-px bg-linear-to-b from-or/80 via-or/45 to-or/10 shadow-[2px_0_18px_rgb(201_162_39/0.4)]"
      />

      {/* Carte logo carrée (format du site principal) */}
      <div className={cn("pt-6 pb-5", folded ? "px-2 pt-3" : "px-5")}>
        <Link
          href={homeHref}
          aria-label={homeLabel}
          onClick={drawer ? onClose : undefined}
          className="relative block aspect-square w-full overflow-hidden rounded-xl border border-or/15 bg-noir shadow-[inset_0_0_40px_rgb(0_0_0/0.55)]"
        >
          <BrandMedallion size={280} src="/ctf-card.png" className="size-full object-contain" />
        </Link>
      </div>

      {/* Bande dorée pleine largeur — nom de l'espace */}
      <div className="bg-gradient-or py-3 text-center">
        <span className="font-nav text-sm font-extrabold tracking-[0.32em] whitespace-nowrap text-noir uppercase">{folded ? "CTF" : ribbon}</span>
      </div>

      {/* Arcs dorés en décor de fond (statiques) */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0">
        <GoldArcs animated={false} className={cn("opacity-50", folded && "origin-bottom-left scale-x-[0.4]")} />
      </div>

      <nav aria-label={navLabel} className="relative z-10 mt-3 flex-1 overflow-y-auto px-3 pb-3">
        {children}
      </nav>

      {footer}
      <div className="relative z-10 border-t border-line p-2">
        <button
          type="button"
          onClick={drawer ? onClose : onToggle}
          aria-label={drawer ? "Fermer le menu" : folded ? "Déplier la barre latérale" : "Replier la barre latérale"}
          aria-expanded={drawer ? undefined : !folded}
          className={cn(
            "flex h-9 w-full items-center gap-3 rounded-[9px] px-4 font-nav text-xs tracking-[0.08em] text-blanc/60 uppercase transition-colors hover:bg-or/10 hover:text-or-light",
            folded && "justify-center px-0",
          )}
        >
          {folded ? <PanelLeftOpen aria-hidden className="size-4.5 text-or" /> : <PanelLeftClose aria-hidden className="size-4.5 text-or" />}
          {!folded && (drawer ? "Fermer le menu" : "Replier")}
        </button>
      </div>
    </aside>
  );
}

/** Liste d'entrées (espacement compact du site principal). */
export function BrandSidebarList({ children }: { children: ReactNode }) {
  return <ul className="flex flex-col gap-2">{children}</ul>;
}

/** Intertitre de section (ex. « Ma formation · EDS »). */
export function BrandSidebarHeading({ label, short, collapsed }: { label: string; short: string; collapsed: boolean }) {
  return (
    <p
      className={cn(
        "mt-5 mb-2 font-nav text-[0.68rem] font-semibold tracking-[0.22em] whitespace-nowrap text-or-light/70 uppercase",
        collapsed ? "text-center" : "px-4",
      )}
    >
      {collapsed ? short : label}
    </p>
  );
}

/**
 * Entrée de la barre : icône dorée + libellé en majuscules ; l'entrée active porte la pilule dorée.
 * `pillId` anime la pilule d'une entrée à l'autre ; sans lui (administration), la pilule est statique.
 */
export function BrandSidebarLink({
  href,
  label,
  icon: Icon,
  active,
  collapsed,
  title,
  badge,
  pillId,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number; "aria-hidden"?: boolean }>;
  active: boolean;
  collapsed: boolean;
  title?: string;
  badge?: ReactNode;
  pillId?: string;
  onNavigate?: () => void;
}) {
  const pillClass = "absolute inset-0 rounded-[10px] border border-or/50 bg-or/15 shadow-[0_0_14px_rgb(201_162_39/0.15)]";
  return (
    <li className="relative flex shrink-0 items-center">
      <Link
        href={href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        title={collapsed ? label : title}
        className={cn(
          "group/link relative flex h-9 w-full items-center gap-3 rounded-[9px] px-4 transition-colors duration-200 hover:bg-or/10",
          collapsed && "justify-center px-0",
        )}
      >
        {active &&
          (pillId ? (
            <motion.span layoutId={pillId} aria-hidden transition={{ type: "spring", stiffness: 380, damping: 34 }} className={pillClass} />
          ) : (
            <span aria-hidden className={pillClass} />
          ))}
        <Icon
          aria-hidden
          strokeWidth={1.7}
          className={cn("relative size-4.5 shrink-0 transition-colors", active ? "text-or-light" : "text-blanc/70 group-hover/link:text-or-light")}
        />
        {!collapsed && (
          <span
            className={cn(
              "relative min-w-0 truncate font-nav text-[13px] tracking-[0.08em] uppercase",
              active ? "font-semibold text-or-light" : "font-normal text-blanc/85",
            )}
          >
            {label}
          </span>
        )}
        {badge}
      </Link>
    </li>
  );
}
