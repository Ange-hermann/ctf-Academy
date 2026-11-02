"use client";

import Link from "next/link";
import { Suspense } from "react";
import { motion } from "motion/react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Emblem } from "@/components/brand/logo";
import { GoldArcs } from "@/components/shell/gold-arcs";
import { studentIcons } from "@/components/student/layout/icons";
import { MessagesBadge } from "@/components/student/layout/shell-data";
import { isActiveHref, studentRoutes, type StudentNavItem } from "@/config/student-nav";
import { cn } from "@/lib/utils";

type Props = {
  pathname: string;
  main: StudentNavItem[];
  formationItems: StudentNavItem[];
  formationLabel: string;
  collapsed: boolean;
  onToggle: () => void;
};

function NavEntry({
  item,
  active,
  collapsed,
  badge,
}: {
  item: StudentNavItem;
  active: boolean;
  collapsed: boolean;
  badge?: React.ReactNode;
}) {
  const Icon = studentIcons[item.icon];
  return (
    <li>
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        title={collapsed ? item.label : undefined}
        className={cn(
          "group relative flex min-h-11 items-center gap-3 rounded-xl px-3 text-[0.95rem] font-medium transition-colors duration-200",
          active ? "text-or-light" : "text-blanc/70 hover:bg-or/5 hover:text-blanc",
          collapsed && "justify-center px-0",
        )}
      >
        {active && (
          <motion.span
            layoutId="sidebar-active"
            aria-hidden
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
            className="absolute inset-0 rounded-xl border border-or/30 bg-or/10 shadow-gold"
          >
            <span className="absolute top-2 bottom-2 left-0 w-0.5 rounded-full bg-or-light shadow-[0_0_12px_2px_rgb(229_193_88/0.6)]" />
          </motion.span>
        )}
        <Icon aria-hidden className={cn("relative size-5 shrink-0", active ? "text-or-light" : "text-or")} />
        {!collapsed && <span className="relative truncate">{item.label}</span>}
        {badge}
      </Link>
    </li>
  );
}

/** Barre latérale (≥ 1024 px), repliable. L'entrée active est marquée par une barre dorée qui glisse. */
export function SidebarNav({ pathname, main, formationItems, formationLabel, collapsed, onToggle }: Props) {
  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 hidden flex-col bg-noir transition-[width] duration-300 ease-out-expo lg:flex",
        collapsed ? "w-20" : "w-68",
      )}
    >
      {/* Filet vertical doré lumineux (signature du shell) */}
      <span
        aria-hidden
        className="absolute inset-y-0 right-0 w-px bg-linear-to-b from-transparent via-or-light/70 to-transparent shadow-[0_0_14px_1px_rgb(229_193_88/0.4)]"
      />
      <div className={cn("flex h-18 items-center gap-3 px-5", collapsed && "justify-center px-0")}>
        <Link
          href={studentRoutes.dashboard}
          aria-label="Tableau de bord"
          className="flex items-center gap-3 rounded-xl [perspective:400px]"
        >
          <Emblem size={40} className="size-10 animate-coin-turn" />
          {!collapsed && (
            <span className="text-gradient-or-soft font-display text-base font-semibold tracking-[0.2em]">
              CTF ACADEMY
            </span>
          )}
        </Link>
      </div>

      <nav aria-label="Navigation de l'espace étudiant" className="relative z-10 flex-1 overflow-y-auto px-3 pb-4">
        <ul className="space-y-1">
          {main.map((item) => (
            <NavEntry
              key={item.href}
              item={item}
              active={isActiveHref(pathname, item.href)}
              collapsed={collapsed}
              badge={
                item.href === studentRoutes.messages && (
                  <Suspense fallback={null}>
                    <MessagesBadge variant={collapsed ? "compact" : "full"} />
                  </Suspense>
                )
              }
            />
          ))}
        </ul>
        <div className={cn("mt-6 mb-2 px-3", collapsed && "px-0 text-center")}>
          <p className="text-[0.7rem] font-semibold tracking-[0.2em] text-or-light/70 uppercase">
            {collapsed ? formationLabel.slice(0, 3) : `Ma formation · ${formationLabel}`}
          </p>
        </div>
        <ul className="space-y-1">
          {formationItems.map((item) => (
            <NavEntry key={item.href} item={item} active={isActiveHref(pathname, item.href)} collapsed={collapsed} />
          ))}
        </ul>
      </nav>

      {/* Arcs dorés sobres en pied de barre (version statique pour l'espace étudiant) */}
      {!collapsed && <GoldArcs animated={false} className="pointer-events-none absolute inset-x-0 bottom-0 z-0 opacity-35" />}

      <div className="relative z-10 border-t border-line p-3">
        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? "Déplier la barre latérale" : "Replier la barre latérale"}
          aria-expanded={!collapsed}
          className={cn(
            "flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm text-blanc/60 transition-colors hover:bg-or/5 hover:text-or-light",
            collapsed && "justify-center px-0",
          )}
        >
          {collapsed ? (
            <PanelLeftOpen aria-hidden className="size-5" />
          ) : (
            <PanelLeftClose aria-hidden className="size-5" />
          )}
          {!collapsed && "Replier"}
        </button>
      </div>
    </aside>
  );
}
