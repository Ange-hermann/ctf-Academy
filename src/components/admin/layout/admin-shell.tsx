"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LogOut, Menu, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { adminIcons } from "@/components/admin/icons";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Emblem } from "@/components/brand/logo";
import { adminRoutes, type AdminNavItem } from "@/config/admin-nav";
import { routes } from "@/config/navigation";
import { signOutAction } from "@/lib/auth/actions";
import { cn } from "@/lib/utils";

export type AdminShellUser = { name: string; email: string; roleLabels: string[] };

function NavList({ items, pathname, collapsed, onNavigate }: { items: AdminNavItem[]; pathname: string; collapsed: boolean; onNavigate?: () => void }) {
  return (
    <ul className="space-y-1">
      {items.map((item) => {
        const Icon = adminIcons[item.icon];
        const active = item.href === adminRoutes.dashboard ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              title={collapsed ? item.label : item.description || item.label}
              className={cn(
                "group relative flex min-h-11 items-center gap-3 rounded-xl px-3 text-[0.95rem] font-medium transition-colors duration-200",
                active ? "text-or-light" : "text-blanc/70 hover:bg-or/5 hover:text-blanc",
                collapsed && "justify-center px-0",
              )}
            >
              {active && <span aria-hidden className="absolute inset-0 rounded-xl border border-or/30 bg-or/10 shadow-gold" />}
              <Icon aria-hidden className={cn("relative size-5 shrink-0", active ? "text-or-light" : "text-or")} />
              {!collapsed && <span className="relative truncate">{item.label}</span>}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** Cadre de l'espace d'administration : barre latérale filtrée par rôle, barre supérieure, drawer mobile. */
export function AdminShell({ children, user, items }: { children: React.ReactNode; user: AdminShellUser; items: AdminNavItem[] }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [drawer, setDrawer] = useState(false);

  return (
    <div className="min-h-dvh bg-noir">
      <a
        href="#contenu"
        className="fixed top-3 left-3 z-[400] -translate-y-24 rounded-xl bg-gradient-or px-4 py-3 font-semibold text-noir focus:translate-y-0"
      >
        Aller au contenu
      </a>

      {/* Barre latérale fixe (≥ lg) */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden flex-col bg-noir transition-[width] duration-300 ease-out-expo lg:flex",
          collapsed ? "w-20" : "w-68",
        )}
      >
        <span aria-hidden className="absolute inset-y-0 right-0 w-px bg-linear-to-b from-transparent via-or-light/70 to-transparent shadow-[0_0_14px_1px_rgb(229_193_88/0.4)]" />
        <div className={cn("flex h-18 items-center gap-3 px-5", collapsed && "justify-center px-0")}>
          <Link href={adminRoutes.dashboard} aria-label="Administration" className="flex items-center gap-3">
            <Emblem size={40} className="size-10" />
            {!collapsed && (
              <span className="min-w-0">
                <span className="text-gradient-or-soft font-display block text-base font-semibold tracking-[0.2em]">CTF ACADEMY</span>
                <span className="block truncate text-xs tracking-wide text-or-light/70 uppercase">Administration</span>
              </span>
            )}
          </Link>
        </div>
        <nav aria-label="Navigation d'administration" className="relative z-10 flex-1 overflow-y-auto px-3 pb-4">
          <NavList items={items} pathname={pathname} collapsed={collapsed} />
        </nav>
        <div className="border-t border-line p-3">
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl text-blanc/60 transition-colors hover:bg-or/5 hover:text-blanc"
            aria-label={collapsed ? "Déployer la barre latérale" : "Replier la barre latérale"}
          >
            {collapsed ? <PanelLeftOpen aria-hidden className="size-5 text-or" /> : <PanelLeftClose aria-hidden className="size-5 text-or" />}
          </button>
        </div>
      </aside>

      {/* Barre supérieure */}
      <header className="sticky top-0 z-30 flex h-18 items-center gap-3 border-b border-line bg-noir/90 px-4 backdrop-blur-md sm:px-6">
        <button
          type="button"
          className="grid size-11 place-items-center rounded-xl border border-line text-or transition-colors hover:bg-or/10 lg:hidden"
          onClick={() => setDrawer(true)}
          aria-label="Ouvrir le menu"
        >
          <Menu aria-hidden className="size-5" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-blanc">{user.name}</p>
          <p className="truncate text-xs text-or-light/80">{user.roleLabels.join(" · ")}</p>
        </div>
        <ThemeToggle />
        <form action={signOutAction}>
          <button
            type="submit"
            className="grid size-11 place-items-center rounded-xl border border-line text-blanc/70 transition-colors hover:bg-or/10 hover:text-or-light"
            aria-label="Se déconnecter"
            title="Se déconnecter"
          >
            <LogOut aria-hidden className="size-5" />
          </button>
        </form>
        <Link
          href={routes.home}
          className="hidden rounded-xl border border-or/40 px-4 py-2.5 text-sm font-medium text-or-light transition-colors hover:bg-or/10 sm:block"
        >
          Voir le site
        </Link>
      </header>

      {/* Drawer mobile */}
      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu d'administration">
          <button type="button" aria-label="Fermer le menu" className="absolute inset-0 bg-noir/80 backdrop-blur-sm" onClick={() => setDrawer(false)} />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col border-r border-or/25 bg-noir p-4">
            <div className="mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Emblem size={36} className="size-9" />
                <span className="text-gradient-or-soft font-display text-sm font-semibold tracking-[0.18em]">ADMINISTRATION</span>
              </span>
              <button type="button" onClick={() => setDrawer(false)} className="grid size-10 place-items-center rounded-xl border border-line text-blanc/70" aria-label="Fermer">
                <X aria-hidden className="size-5" />
              </button>
            </div>
            <nav aria-label="Navigation d'administration mobile" className="flex-1 overflow-y-auto">
              <NavList items={items} pathname={pathname} collapsed={false} onNavigate={() => setDrawer(false)} />
            </nav>
          </div>
        </div>
      )}

      <div className={cn("transition-[padding] duration-300 ease-out-expo", collapsed ? "lg:pl-20" : "lg:pl-68")}>
        <main id="contenu" className="min-h-dvh px-4 py-8 sm:px-6 lg:px-10">
          {children}
        </main>
      </div>
    </div>
  );
}
