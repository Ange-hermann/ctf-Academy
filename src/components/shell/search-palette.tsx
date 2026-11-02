"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CornerDownLeft, Search } from "lucide-react";
import { faq as fallbackFaq } from "@/content/faq";
import { formations } from "@/content/formations";
import { mainNav, mediaNav, routes } from "@/content/navigation";
import { demoEvents } from "@/content/media";
import { cn } from "@/lib/utils";

type Item = { label: string; href: string; group: string; hint?: string };

const strip = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

function buildIndex(): Item[] {
  const items: Item[] = [
    { label: "Accueil", href: "/", group: "Pages", hint: "CTF CHURCH" },
    { label: "CTF ACADEMY", href: routes.academy, group: "Pages", hint: "Formations et médiathèque" },
    { label: "S'inscrire", href: routes.register, group: "Pages", hint: "Candidature en 5 étapes" },
  ];
  for (const s of mainNav) {
    items.push({ label: s.label, href: s.href, group: "Pages" });
    for (const c of s.children) items.push({ label: c.label, href: c.href, group: s.label, hint: c.description });
  }
  for (const m of mediaNav) items.push({ label: m.label, href: m.href, group: "Médiathèque", hint: m.description });
  for (const f of formations)
    items.push({ label: `${f.acronym} — ${f.name}`, href: `/formations/${f.slug}`, group: "Formations", hint: f.tagline });
  for (const q of fallbackFaq.slice(0, 8))
    items.push({ label: q.question, href: `${routes.faq}#${q.id}`, group: "FAQ" });
  for (const e of demoEvents)
    items.push({ label: e.title, href: `/evenements/${e.slug}`, group: "Événements", hint: e.place });
  return items;
}

/**
 * Palette de recherche (Ctrl/Cmd + K ou icône loupe) : pages, formations, FAQ et
 * événements, résultats instantanés, navigation aux flèches, aucun service externe.
 */
export function SearchPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const items = useMemo(() => buildIndex(), []);

  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setQuery("");
      setIndex(0);
    }
  }
  const [lastQuery, setLastQuery] = useState(query);
  if (query !== lastQuery) {
    setLastQuery(query);
    setIndex(0);
  }

  const results = useMemo(() => {
    const q = strip(query.trim());
    if (!q) return items.slice(0, 12);
    return items.filter((i) => strip(`${i.label} ${i.group} ${i.hint ?? ""}`).includes(q)).slice(0, 12);
  }, [items, query]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 40);
    return () => window.clearTimeout(t);
  }, [open]);

  const go = (href: string) => {
    onClose();
    router.push(href);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Recherche"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[110] bg-noir/80 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: -14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -14, scale: 0.98 }}
            transition={{ duration: 0.28, ease: [0.2, 0.7, 0.2, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="mx-auto mt-[12vh] w-[min(92vw,40rem)] overflow-hidden rounded-2xl border border-gold-soft bg-noir-soft shadow-[0_40px_80px_-20px_rgb(0_0_0/0.9),0_0_40px_rgb(201_162_39/0.12)]"
          >
            <div className="flex items-center gap-3 border-b border-line px-5">
              <Search aria-hidden className="size-5 text-or" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") onClose();
                  else if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setIndex((i) => Math.min(i + 1, results.length - 1));
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setIndex((i) => Math.max(i - 1, 0));
                  } else if (e.key === "Enter" && results[index]) go(results[index].href);
                }}
                placeholder="Rechercher une page, une formation, un événement…"
                aria-label="Rechercher"
                className="h-14 w-full bg-transparent font-nav text-lg text-blanc outline-none placeholder:text-blanc/40"
              />
              <kbd className="hidden shrink-0 rounded-md border border-line px-2 py-1 text-[0.65rem] text-blanc/50 sm:block">Échap</kbd>
            </div>
            <ul role="listbox" aria-label="Résultats" data-lenis-prevent className="max-h-[52vh] overflow-y-auto p-2">
              {results.length === 0 && (
                <li className="px-4 py-8 text-center text-blanc/55">Aucun résultat pour « {query} »</li>
              )}
              {results.map((item, i) => (
                <li key={`${item.href}-${i}`} role="option" aria-selected={i === index}>
                  <button
                    type="button"
                    onClick={() => go(item.href)}
                    onPointerEnter={() => setIndex(i)}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-left transition-colors",
                      i === index ? "bg-or/12" : "hover:bg-or/8",
                    )}
                  >
                    <span className="min-w-0">
                      <span className={cn("block truncate font-nav font-semibold", i === index ? "text-or-light" : "text-blanc")}>
                        {item.label}
                      </span>
                      {item.hint && <span className="block truncate text-sm text-blanc/50">{item.hint}</span>}
                    </span>
                    <span className="flex shrink-0 items-center gap-3">
                      <span className="rounded-full border border-line px-2.5 py-0.5 text-[0.65rem] tracking-wide text-or-light/80 uppercase">
                        {item.group}
                      </span>
                      {i === index && <CornerDownLeft aria-hidden className="size-4 text-or-light" />}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
