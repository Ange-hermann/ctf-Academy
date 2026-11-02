"use client";

import { useDeferredValue, useState } from "react";
import { Search, X } from "lucide-react";
import { Accordion } from "@/components/ui/accordion";
import { faqCategories, type FaqCategory, type FaqItem } from "@/content/faq";
import { cn } from "@/lib/utils";

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

/** FAQ : recherche instantanée (insensible aux accents) + filtres par catégorie. */
export function FaqExplorer({ items }: { items: FaqItem[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<FaqCategory | "all">("all");
  const q = normalize(useDeferredValue(query).trim());

  const results = items.filter(
    (f) =>
      (category === "all" || f.category === category) &&
      (!q || normalize(`${f.question} ${f.answer}`).includes(q)),
  );

  return (
    <div className="mx-auto max-w-3xl">
      <div className="relative">
        <Search aria-hidden className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-or" />
        <label htmlFor="faq-search" className="sr-only">
          Rechercher une question
        </label>
        <input
          id="faq-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher : paiement, admission, téléphone…"
          className="min-h-14 w-full rounded-2xl border border-line bg-noir-soft pr-12 pl-12 text-base text-blanc outline-none placeholder:text-blanc/40 focus:border-or focus:ring-2 focus:ring-or/30"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Effacer la recherche"
            className="absolute top-1/2 right-2 grid size-10 -translate-y-1/2 place-items-center rounded-xl text-blanc/60 hover:text-or-light"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      <div role="group" aria-label="Catégories" className="mt-5 flex flex-wrap gap-2">
        {[{ id: "all" as const, label: "Toutes" }, ...faqCategories].map((c) => (
          <button
            key={c.id}
            type="button"
            aria-pressed={category === c.id}
            onClick={() => setCategory(c.id)}
            className={cn(
              "min-h-11 rounded-full border px-5 text-sm font-semibold transition-colors",
              category === c.id ? "border-or bg-or/15 text-or-light" : "border-line text-blanc/70 hover:border-or/40",
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      <p aria-live="polite" className="mt-6 text-sm text-blanc/55">
        {results.length} question{results.length > 1 ? "s" : ""}
      </p>
      {results.length ? (
        <Accordion className="mt-3" items={results.map((f) => ({ id: f.id, title: f.question, content: f.answer }))} />
      ) : (
        <p className="mt-3 rounded-2xl border border-dashed border-line p-8 text-center text-blanc/65">
          Aucune réponse trouvée. Posez votre question sur WhatsApp : nous vous répondrons rapidement.
        </p>
      )}
    </div>
  );
}
