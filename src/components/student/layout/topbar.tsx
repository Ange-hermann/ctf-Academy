"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Bell, LogOut, MessageCircle, Search, Settings, UserRound } from "lucide-react";
import { Emblem } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { NotificationBell } from "@/components/student/layout/notification-bell";
import { useShellData } from "@/components/student/layout/shell-data";
import { routes } from "@/config/navigation";
import { studentRoutes } from "@/config/student-nav";
import { signOutAction } from "@/lib/auth/actions";
import { useStudentUi } from "@/lib/student/ui-store";
import { whatsappLink } from "@/lib/whatsapp";

export type ShellUser = {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string | null;
};

export function Avatar({
  user,
  size = 36,
}: {
  user: Pick<ShellUser, "firstName" | "lastName" | "avatarUrl">;
  size?: number;
}) {
  const initials = `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase() || "?";
  return user.avatarUrl ? (
    <Image
      src={user.avatarUrl}
      alt=""
      width={size}
      height={size}
      className="rounded-full border border-or/40 object-cover"
      style={{ width: size, height: size }}
      unoptimized
    />
  ) : (
    <span
      aria-hidden
      style={{ width: size, height: size }}
      className="grid place-items-center rounded-full border border-or/40 bg-gradient-or font-display text-sm font-semibold text-noir"
    >
      {initials}
    </span>
  );
}

function UserMenu({ user }: { user: ShellUser }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const item =
    "flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-blanc/85 transition-colors hover:bg-or/10 hover:text-or-light";
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="user-menu"
        aria-label="Menu du compte"
        className="grid size-11 place-items-center rounded-full transition-shadow hover:shadow-gold"
      >
        <Avatar user={user} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            id="user-menu"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="absolute top-13 right-0 z-50 w-64 origin-top-right rounded-2xl border border-or/30 bg-noir-card/98 p-2 shadow-gold-lg"
          >
            <div className="border-b border-line px-3 pt-2 pb-3">
              <p className="truncate font-semibold text-blanc">
                {user.firstName} {user.lastName}
              </p>
              <p className="truncate text-sm text-blanc/55">{user.email}</p>
            </div>
            <div className="pt-2">
              <Link href={studentRoutes.profile} className={item} onClick={() => setOpen(false)}>
                <UserRound aria-hidden className="size-4.5 text-or" /> Mon profil
              </Link>
              <Link href={`${studentRoutes.profile}#preferences`} className={item} onClick={() => setOpen(false)}>
                <Settings aria-hidden className="size-4.5 text-or" /> Préférences
              </Link>
              <Link href={routes.home} className={item} onClick={() => setOpen(false)}>
                <Emblem size={18} className="size-4.5" /> Site de CTF ACADEMY
              </Link>
              <form action={signOutAction}>
                <button type="submit" className={item}>
                  <LogOut aria-hidden className="size-4.5 text-or" /> Se déconnecter
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function BellLoader() {
  const data = useShellData();
  return <NotificationBell initial={data.notifications} />;
}

/** Barre supérieure : recherche globale (Ctrl/Cmd + K), aide WhatsApp, notifications temps réel, compte. */
export function Topbar({ user, formationAcronym }: { user: ShellUser; formationAcronym: string }) {
  const setPalette = useStudentUi((s) => s.setPalette);
  return (
    <header className="sticky top-0 z-30 bg-noir/85 backdrop-blur-md">
      {/* Ligne dorée lumineuse en bas de barre (signature du shell) */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-or-light/60 to-or-light/10 shadow-[0_0_12px_1px_rgb(229_193_88/0.35)]"
      />
      <div className="flex h-16 items-center gap-2 px-4 sm:px-6 lg:h-18 lg:px-10">
        <Link
          href={studentRoutes.dashboard}
          aria-label="Tableau de bord"
          className="flex items-center gap-2 rounded-xl [perspective:400px] lg:hidden"
        >
          <Emblem size={36} className="size-9 animate-coin-turn" />
          <span className="rounded-full border border-or/30 px-2 py-0.5 text-[0.65rem] font-semibold tracking-[0.18em] text-or-light">
            {formationAcronym}
          </span>
        </Link>
        <button
          type="button"
          onClick={() => setPalette(true)}
          className="ml-auto flex min-h-11 items-center gap-3 rounded-full border border-line bg-noir/40 px-3 text-sm text-blanc/55 transition-colors hover:border-or/40 hover:text-blanc lg:ml-0 lg:w-full lg:max-w-md lg:px-4"
        >
          <Search aria-hidden className="size-4.5 text-or" />
          <span className="sr-only lg:not-sr-only">Rechercher un cours, une leçon, un message…</span>
          <kbd className="ml-auto hidden rounded-md border border-line px-1.5 py-0.5 text-xs lg:block">Ctrl K</kbd>
        </button>
        <div className="flex items-center gap-1 lg:ml-auto">
          <ThemeToggle className="rounded-full text-blanc/75 hover:text-or-light" iconClassName="size-5" />
          <a
            href={whatsappLink("Bonjour CTF ACADEMY, j'ai besoin d'aide dans mon espace étudiant.")}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Aide WhatsApp"
            title="Aide WhatsApp"
            className="hidden size-11 place-items-center rounded-full text-blanc/75 transition-colors hover:bg-or/10 hover:text-or-light sm:grid"
          >
            <MessageCircle aria-hidden className="size-5" />
          </a>
          <Suspense
            fallback={
              <span className="grid size-11 place-items-center text-blanc/40">
                <Bell aria-hidden className="size-5" />
              </span>
            }
          >
            <BellLoader />
          </Suspense>
          <UserMenu user={user} />
        </div>
      </div>
    </header>
  );
}
