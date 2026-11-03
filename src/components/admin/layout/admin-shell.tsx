"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LogOut, Menu, X } from "lucide-react";
import { adminIcons } from "@/components/admin/icons";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { AdminProviders } from "@/components/admin/layout/providers";
import { StaffBell } from "@/components/admin/layout/staff-bell";
import { BrandSidebar, BrandSidebarLink, BrandSidebarList } from "@/components/shell/brand-sidebar";
import { adminRoutes, type AdminNavItem } from "@/config/admin-nav";
import type { StaffNotification } from "@/lib/admin/queries";
import { routes } from "@/config/navigation";
import { signOutAction } from "@/lib/auth/actions";
import { useScrollLock } from "@/hooks/use-scroll-lock";
import { cn } from "@/lib/utils";

export type AdminShellUser = { id: string; name: string; email: string; roleLabels: string[] };

function AdminEntries({ items, pathname, collapsed, onNavigate }: { items: AdminNavItem[]; pathname: string; collapsed: boolean; onNavigate?: () => void }) {
  return (
    <BrandSidebarList>
      {items.map((item) => (
        <BrandSidebarLink
          key={item.href}
          href={item.href}
          label={item.label}
          icon={adminIcons[item.icon]}
          active={item.href === adminRoutes.dashboard ? pathname === item.href : pathname.startsWith(item.href)}
          collapsed={collapsed}
          title={item.description || item.label}
          onNavigate={onNavigate}
        />
      ))}
    </BrandSidebarList>
  );
}

/** Cadre de l'espace d'administration : barre latérale filtrée par rôle, barre supérieure, drawer mobile. */
export function AdminShell({
  children,
  user,
  items,
  notifications,
}: {
  children: React.ReactNode;
  user: AdminShellUser;
  items: AdminNavItem[];
  notifications: StaffNotification[];
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [drawer, setDrawer] = useState(false);
  useScrollLock(drawer);

  return (
    <div className="min-h-dvh bg-noir">
      <a
        href="#contenu"
        className="fixed top-3 left-3 z-[400] -translate-y-24 rounded-xl bg-gradient-or px-4 py-3 font-semibold text-noir focus:translate-y-0"
      >
        Aller au contenu
      </a>

      {/* Barre latérale fixe (≥ lg) — même format que le site principal */}
      <BrandSidebar
        homeHref={adminRoutes.dashboard}
        homeLabel="Administration"
        ribbon="ADMINISTRATION"
        navLabel="Navigation d'administration"
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
      >
        <AdminEntries items={items} pathname={pathname} collapsed={collapsed} />
      </BrandSidebar>

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
        <AdminProviders>
          <StaffBell initial={notifications} userId={user.id} />
        </AdminProviders>
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

      {/* Drawer mobile — même rendu que la barre latérale dépliée */}
      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu d'administration">
          <button type="button" aria-label="Fermer le menu" className="absolute inset-0 bg-noir/80 backdrop-blur-sm" onClick={() => setDrawer(false)} />
          <div className="absolute inset-y-0 left-0 w-[86vw] max-w-sm bg-noir">
            <BrandSidebar
              variant="drawer"
              onClose={() => setDrawer(false)}
              homeHref={adminRoutes.dashboard}
              homeLabel="Administration"
              ribbon="ADMINISTRATION"
              navLabel="Navigation d'administration mobile"
              collapsed={false}
              onToggle={() => setDrawer(false)}
              footer={
                <form action={signOutAction} className="relative z-10 border-t border-line p-2">
                  <button
                    type="submit"
                    className="flex h-9 w-full items-center gap-3 rounded-[9px] px-4 font-nav text-xs tracking-[0.08em] text-blanc/60 uppercase transition-colors hover:bg-or/10 hover:text-or-light"
                  >
                    <LogOut aria-hidden className="size-4.5 text-or" />
                    Déconnexion
                  </button>
                </form>
              }
            >
              <AdminEntries items={items} pathname={pathname} collapsed={false} onNavigate={() => setDrawer(false)} />
            </BrandSidebar>
            <button
              type="button"
              onClick={() => setDrawer(false)}
              className="absolute top-3 right-3 z-20 grid size-10 place-items-center rounded-xl border border-line bg-noir/80 text-blanc/70 backdrop-blur-sm"
              aria-label="Fermer le menu"
            >
              <X aria-hidden className="size-5" />
            </button>
          </div>
        </div>
      )}

      <div className={cn("transition-[padding] duration-300 ease-out-expo", collapsed ? "lg:pl-sidebar-rail" : "lg:pl-sidebar")}>
        <main id="contenu" className="min-h-dvh px-4 py-8 sm:px-6 lg:px-10">
          {children}
        </main>
      </div>
    </div>
  );
}
