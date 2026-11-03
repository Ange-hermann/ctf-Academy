"use client";

import { Suspense } from "react";
import { BrandSidebar, BrandSidebarHeading, BrandSidebarLink, BrandSidebarList } from "@/components/shell/brand-sidebar";
import { studentIcons } from "@/components/student/layout/icons";
import { MessagesBadge } from "@/components/student/layout/shell-data";
import { isActiveHref, studentRoutes, type StudentNavItem } from "@/config/student-nav";

type Props = {
  pathname: string;
  main: StudentNavItem[];
  formationItems: StudentNavItem[];
  formationLabel: string;
  collapsed: boolean;
  onToggle: () => void;
};

/** Barre latérale de l'espace étudiant (≥ 1024 px), repliable — même format que le site principal. */
export function SidebarNav({ pathname, main, formationItems, formationLabel, collapsed, onToggle }: Props) {
  return (
    <BrandSidebar
      homeHref={studentRoutes.dashboard}
      homeLabel="Tableau de bord"
      ribbon="CTF ACADEMY"
      navLabel="Navigation de l'espace étudiant"
      collapsed={collapsed}
      onToggle={onToggle}
    >
      <BrandSidebarList>
        {main.map((item) => (
          <BrandSidebarLink
            key={item.href}
            href={item.href}
            label={item.label}
            icon={studentIcons[item.icon]}
            active={isActiveHref(pathname, item.href)}
            collapsed={collapsed}
            pillId="sidebar-active"
            badge={
              item.href === studentRoutes.messages && (
                <Suspense fallback={null}>
                  <MessagesBadge variant={collapsed ? "compact" : "full"} />
                </Suspense>
              )
            }
          />
        ))}
      </BrandSidebarList>
      <BrandSidebarHeading label={`Ma formation · ${formationLabel}`} short={formationLabel.slice(0, 3)} collapsed={collapsed} />
      <BrandSidebarList>
        {formationItems.map((item) => (
          <BrandSidebarLink
            key={item.href}
            href={item.href}
            label={item.label}
            icon={studentIcons[item.icon]}
            active={isActiveHref(pathname, item.href)}
            collapsed={collapsed}
            pillId="sidebar-active"
          />
        ))}
      </BrandSidebarList>
    </BrandSidebar>
  );
}
