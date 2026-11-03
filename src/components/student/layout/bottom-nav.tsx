"use client";

import Link from "next/link";
import { Suspense, useEffect, useRef } from "react";
import { AnimatePresence, motion, type PanInfo } from "motion/react";
import { Ellipsis, MessageCircle, UserRound, X } from "lucide-react";
import { studentIcons } from "@/components/student/layout/icons";
import { MessagesBadge } from "@/components/student/layout/shell-data";
import { bottomNav, isActiveHref, studentRoutes, type StudentNavItem } from "@/config/student-nav";
import { useStudentUi } from "@/lib/student/ui-store";
import { cn } from "@/lib/utils";

type Props = {
  pathname: string;
  more: StudentNavItem[];
  formationItems: StudentNavItem[];
  formationLabel: string;
};

/** Barre de navigation du bas (< 1024 px) : 4 onglets + « Plus » (tiroir avec le reste du menu). */
export function BottomNav({ pathname, more, formationItems, formationLabel }: Props) {
  const { moreOpen, setMore } = useStudentUi();
  const inMore = !bottomNav.some((i) => isActiveHref(pathname, i.href));

  return (
    <>
      <nav
        aria-label="Navigation principale"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line glass pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <ul className="mx-auto grid max-w-lg grid-cols-5">
          {bottomNav.map((item) => {
            const Icon = studentIcons[item.icon];
            const active = isActiveHref(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex min-h-16 flex-col items-center justify-center gap-1 text-[0.7rem] font-medium",
                    active ? "text-or-light" : "text-blanc/60",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="bottom-active"
                      aria-hidden
                      transition={{ type: "spring", stiffness: 460, damping: 32 }}
                      className="absolute top-1.5 h-9 w-14 rounded-full bg-or/15 shadow-[0_0_18px_rgb(201_162_39/0.35)]"
                    />
                  )}
                  <Icon aria-hidden className={cn("relative size-5.5", active ? "text-or-light" : "text-or")} />
                  <span className="relative">{item.label}</span>
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => setMore(true)}
              aria-expanded={moreOpen}
              aria-controls="student-more"
              className={cn(
                "relative flex min-h-16 w-full flex-col items-center justify-center gap-1 text-[0.7rem] font-medium",
                inMore ? "text-or-light" : "text-blanc/60",
              )}
            >
              {inMore && (
                <motion.span
                  layoutId="bottom-active"
                  aria-hidden
                  className="absolute top-1.5 h-9 w-14 rounded-full bg-or/15 shadow-[0_0_18px_rgb(201_162_39/0.35)]"
                />
              )}
              <Ellipsis aria-hidden className="relative size-5.5 text-or" />
              <span className="relative">Plus</span>
              <Suspense fallback={null}>
                <MessagesBadge variant="dot" />
              </Suspense>
            </button>
          </li>
        </ul>
      </nav>

      <MoreSheet
        open={moreOpen}
        onClose={() => setMore(false)}
        pathname={pathname}
        more={more}
        formationItems={formationItems}
        formationLabel={formationLabel}
      />
    </>
  );
}

function SheetEntry({ item, pathname }: { item: StudentNavItem; pathname: string }) {
  const Icon = studentIcons[item.icon];
  const active = isActiveHref(pathname, item.href);
  return (
    <li>
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex min-h-14 items-center gap-3 rounded-2xl border px-4 transition-colors",
          active ? "border-or/40 bg-or/10 text-or-light" : "border-line bg-noir/40 text-blanc/85",
        )}
      >
        <Icon aria-hidden className="size-5 text-or" />
        <span className="flex-1">
          <span className="block font-medium">{item.label}</span>
          <span className="block text-xs text-blanc/50">{item.description}</span>
        </span>
        {item.href === studentRoutes.messages && (
          <Suspense fallback={null}>
            <MessagesBadge />
          </Suspense>
        )}
      </Link>
    </li>
  );
}

function MoreSheet({
  open,
  onClose,
  pathname,
  more,
  formationItems,
  formationLabel,
}: Props & { open: boolean; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const lastPath = useRef(pathname);

  useEffect(() => {
    if (lastPath.current !== pathname) {
      lastPath.current = pathname;
      onClose();
    }
  }, [pathname, onClose]);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 90 || info.velocity.y > 500) onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" id="student-more">
          <motion.button
            type="button"
            aria-label="Fermer le menu"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-noir/70"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Plus de rubriques"
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={onDragEnd}
            initial={{ y: "100%" }}
            animate={{ y: 0, transition: { type: "spring", stiffness: 380, damping: 36 } }}
            exit={{ y: "100%", transition: { duration: 0.25 } }}
            className="absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-3xl border-t border-or/30 bg-noir-card px-4 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-gold-lg"
          >
            <div aria-hidden className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-blanc/20" />
            <div className="mb-4 flex items-center justify-between">
              <p className="font-display text-lg tracking-wide text-blanc">Plus</p>
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                aria-label="Fermer"
                className="grid size-11 place-items-center rounded-full text-blanc/60 hover:text-or-light"
              >
                <X className="size-5" />
              </button>
            </div>
            <ul className="space-y-2">
              {more.map((item) => (
                <SheetEntry key={item.href} item={item} pathname={pathname} />
              ))}
            </ul>
            <p className="mt-6 mb-2 px-1 text-xs font-semibold tracking-[0.2em] text-or-light/70 uppercase">
              Ma formation · {formationLabel}
            </p>
            <ul className="space-y-2">
              {formationItems.map((item) => (
                <SheetEntry key={item.href} item={item} pathname={pathname} />
              ))}
            </ul>
            <ul className="mt-6 grid grid-cols-2 gap-2">
              <li>
                <Link
                  href={studentRoutes.profile}
                  className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-line text-blanc/80"
                >
                  <UserRound aria-hidden className="size-4.5 text-or" /> Mon profil
                </Link>
              </li>
              <li>
                <Link
                  href={studentRoutes.messages}
                  className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-line text-blanc/80"
                >
                  <MessageCircle aria-hidden className="size-4.5 text-or" /> Messages
                </Link>
              </li>
            </ul>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
