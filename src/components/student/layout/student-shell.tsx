"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { GoldCursor } from "@/components/effects/gold-cursor";
import { BottomNav } from "@/components/student/layout/bottom-nav";
import { CommandPalette } from "@/components/student/layout/command-palette";
import { OfflineBanner } from "@/components/student/layout/offline-banner";
import { ShellDataProvider, type ShellData } from "@/components/student/layout/shell-data";
import { SidebarNav } from "@/components/student/layout/sidebar-nav";
import { Topbar, type ShellUser } from "@/components/student/layout/topbar";
import { SIDEBAR_COOKIE, bottomNav, formationNav, studentMainNav, studentRoutes } from "@/config/student-nav";
import type { FormationSlug } from "@/content/formations";
import { useStudentRealtime } from "@/hooks/student/use-realtime";
import { useStudentUi } from "@/lib/student/ui-store";
import { cn } from "@/lib/utils";

type Props = {
  children: React.ReactNode;
  user: ShellUser;
  formation: { slug: FormationSlug; acronym: string; name: string };
  /** Notifications et compteurs : diffusés en streaming, ils ne retardent jamais l'affichage de la page. */
  shell: Promise<ShellData>;
  initialCollapsed: boolean;
};

const LESSON_PATH = /^\/espace-etudiant\/cours\/[^/]+\/[^/]+/;
const isTyping = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));

export function StudentShell({ children, user, formation, shell, initialCollapsed }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const { focusMode, setPalette, setFocusMode } = useStudentUi();
  const pendingG = useRef(0);
  const inLesson = LESSON_PATH.test(pathname);

  const onRealtime = useCallback(
    (table: string) => {
      if (table === "messages" || table === "announcements") router.refresh();
    },
    [router],
  );
  useStudentRealtime(user.userId, onRealtime);

  useEffect(() => {
    if (!inLesson && focusMode) setFocusMode(false);
  }, [inLesson, focusMode, setFocusMode]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette(true);
        return;
      }
      if (isTyping(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "/") {
        e.preventDefault();
        setPalette(true);
      } else if (e.key === "g") {
        pendingG.current = Date.now();
      } else if (Date.now() - pendingG.current < 900) {
        const target = {
          d: studentRoutes.dashboard,
          c: studentRoutes.courses,
          e: studentRoutes.assessments,
          m: studentRoutes.messages,
        }[e.key];
        pendingG.current = 0;
        if (target) router.push(target);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, setPalette]);

  const toggle = () => {
    document.cookie = `${SIDEBAR_COOKIE}=${collapsed ? "open" : "collapsed"}; path=/; max-age=31536000; samesite=lax`;
    setCollapsed(!collapsed);
  };

  const formationItems = formationNav[formation.slug];
  const more = studentMainNav.filter((i) => !bottomNav.some((b) => b.href === i.href));

  return (
    <ShellDataProvider value={shell}>
      <div className="min-h-dvh bg-noir">
        <a
          href="#contenu"
          className="fixed top-3 left-3 z-[400] -translate-y-24 rounded-xl bg-gradient-or px-4 py-3 font-semibold text-noir focus:translate-y-0"
        >
          Aller au contenu
        </a>
        {!focusMode && (
          <SidebarNav
            pathname={pathname}
            main={studentMainNav}
            formationItems={formationItems}
            formationLabel={formation.acronym}
            collapsed={collapsed}
            onToggle={toggle}
          />
        )}
        <div
          className={cn(
            "transition-[padding] duration-300 ease-out-expo",
            !focusMode && (collapsed ? "lg:pl-20" : "lg:pl-68"),
          )}
        >
          {!focusMode && <Topbar user={user} formationAcronym={formation.acronym} />}
          <OfflineBanner />
          <div
            className={cn(
              "mx-auto w-full max-w-7xl px-4 pt-6 sm:px-6 lg:px-10 lg:pt-8",
              focusMode ? "pb-10" : "pb-32 lg:pb-16",
            )}
          >
            {children}
          </div>
        </div>
        {!focusMode && (
          <BottomNav
            pathname={pathname}
            more={more}
            formationItems={formationItems}
            formationLabel={formation.acronym}
          />
        )}
        <CommandPalette
          items={[
            ...studentMainNav,
            ...formationItems,
            {
              label: "Mon profil",
              href: studentRoutes.profile,
              icon: "profile",
              description: "Informations et préférences",
            },
          ]}
        />
        {!inLesson && <GoldCursor />}
      </div>
    </ShellDataProvider>
  );
}
