"use client";

import { useRouter } from "next/navigation";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import {
  BookOpen,
  CornerDownLeft,
  FileText,
  Megaphone,
  MessageSquareText,
  Search,
  type LucideIcon,
} from "lucide-react";
import { studentIcons } from "@/components/student/layout/icons";
import type { StudentNavItem } from "@/config/student-nav";
import { studentKeys } from "@/hooks/student/use-realtime";
import { searchStudentAction } from "@/lib/student/actions/shell";
import type { SearchResult } from "@/lib/student/queries/shell";
import { useStudentUi } from "@/lib/student/ui-store";
import { cn } from "@/lib/utils";

type Item = { id: string; label: string; hint: string; href: string; icon: LucideIcon };

const resultIcons: Record<SearchResult["kind"], LucideIcon> = {
  module: BookOpen,
  lesson: FileText,
  message: MessageSquareText,
  announcement: Megaphone,
};

const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

/** Palette de commandes : navigation instantanée et recherche dans les cours, leçons et messages. */
export function CommandPalette({ items }: { items: StudentNavItem[] }) {
  const router = useRouter();
  const { paletteOpen: open, setPalette } = useStudentUi();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const deferred = useDeferredValue(query.trim());

  const { data: results = [], isFetching } = useQuery({
    queryKey: studentKeys.search(deferred),
    queryFn: () => searchStudentAction(deferred),
    enabled: open && deferred.length >= 2,
    staleTime: 60_000,
  });

  const list = useMemo<Item[]>(() => {
    const q = normalize(deferred);
    const nav = items
      .filter((i) => !q || normalize(`${i.label} ${i.description}`).includes(q))
      .map((i) => ({ id: i.href, label: i.label, hint: i.description, href: i.href, icon: studentIcons[i.icon] }));
    const found = deferred.length >= 2 ? results.map((r) => ({ ...r, icon: resultIcons[r.kind] })) : [];
    return [...found, ...nav].slice(0, 14);
  }, [items, results, deferred]);

  const close = () => {
    setPalette(false);
    setQuery("");
    setActive(0);
  };
  const go = (href: string) => {
    close();
    router.push(href);
  };

  useEffect(() => {
    if (open) requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, list.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter" && list[active]) {
      e.preventDefault();
      go(list[active].href);
    } else if (e.key === "Escape") {
      close();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center px-3 pt-[12dvh]">
          <motion.button
            type="button"
            aria-label="Fermer la recherche"
            onClick={close}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-noir/75 backdrop-blur-sm"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Rechercher"
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 420, damping: 32 } }}
            exit={{ opacity: 0, y: -8, scale: 0.98, transition: { duration: 0.15 } }}
            className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-or/30 bg-noir-card shadow-gold-lg"
            onKeyDown={onKeyDown}
          >
            <div className="flex items-center gap-3 border-b border-line px-4">
              <Search aria-hidden className={cn("size-5 text-or", isFetching && "animate-pulse")} />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                }}
                placeholder="Rechercher un cours, une leçon, un message…"
                aria-label="Rechercher"
                aria-controls="palette-results"
                aria-activedescendant={list[active] ? `palette-${list[active].id}` : undefined}
                role="combobox"
                aria-expanded="true"
                className="min-h-14 flex-1 bg-transparent text-blanc placeholder:text-blanc/40 focus:outline-none"
              />
              <kbd className="hidden rounded-md border border-line px-1.5 py-0.5 text-xs text-blanc/50 sm:block">
                Échap
              </kbd>
            </div>
            <ul id="palette-results" role="listbox" className="max-h-[55dvh] overflow-y-auto p-2">
              {list.length === 0 ? (
                <li className="px-4 py-8 text-center text-blanc/60">
                  {isFetching ? "Recherche…" : "Aucun résultat. Essayez un autre mot."}
                </li>
              ) : (
                list.map((item, i) => (
                  <li key={item.id} id={`palette-${item.id}`} role="option" aria-selected={i === active}>
                    <button
                      type="button"
                      onMouseEnter={() => setActive(i)}
                      onClick={() => go(item.href)}
                      className={cn(
                        "flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left transition-colors",
                        i === active ? "bg-or/10 text-or-light" : "text-blanc/85",
                      )}
                    >
                      <item.icon aria-hidden className="size-4.5 shrink-0 text-or" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{item.label}</span>
                        <span className="block truncate text-xs text-blanc/50">{item.hint}</span>
                      </span>
                      {i === active && <CornerDownLeft aria-hidden className="size-4 text-or/70" />}
                    </button>
                  </li>
                ))
              )}
            </ul>
            <p className="hidden border-t border-line px-4 py-2 text-xs text-blanc/45 sm:block">
              Raccourcis : <kbd>g</kbd> <kbd>d</kbd> tableau de bord · <kbd>g</kbd> <kbd>c</kbd> cours · <kbd>/</kbd>{" "}
              recherche
            </p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
