"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { motion } from "motion/react";
import { BookOpen } from "lucide-react";
import { EmptyState } from "@/components/student/ui/empty-state";
import { cn } from "@/lib/utils";

export const courseFilters = [
  { id: "tous", label: "Tous" },
  { id: "en-cours", label: "En cours" },
  { id: "termines", label: "Terminés" },
  { id: "a-venir", label: "À venir" },
] as const;
export type CourseFilter = (typeof courseFilters)[number]["id"];

/** Onglets de filtre synchronisés avec l'URL (partageables, conservés au retour). */
export function CourseFilters({ current, counts }: { current: CourseFilter; counts: Record<CourseFilter, number> }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();
  const select = (id: CourseFilter) => {
    const next = new URLSearchParams(params);
    if (id === "tous") next.delete("filtre");
    else next.set("filtre", id);
    startTransition(() => router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false }));
  };
  return (
    <div role="tablist" aria-label="Filtrer les modules" className="flex gap-1 overflow-x-auto rounded-2xl border border-line bg-noir-soft/60 p-1">
      {courseFilters.map((f) => (
        <button
          key={f.id}
          type="button"
          role="tab"
          aria-selected={current === f.id}
          onClick={() => select(f.id)}
          className={cn(
            "relative min-h-11 shrink-0 rounded-xl px-4 text-sm font-medium transition-colors",
            current === f.id ? "text-noir" : "text-blanc/70 hover:text-blanc",
          )}
        >
          {current === f.id && (
            <motion.span layoutId="course-filter" className="absolute inset-0 rounded-xl bg-gradient-or" transition={{ type: "spring", stiffness: 460, damping: 34 }} />
          )}
          <span className="relative">
            {f.label} <span className="tabular opacity-70">({counts[f.id]})</span>
          </span>
        </button>
      ))}
    </div>
  );
}

export function NoModules({ filter }: { filter: CourseFilter }) {
  const text: Record<CourseFilter, string> = {
    tous: "Les modules de votre formation seront bientôt publiés.",
    "en-cours": "Aucun module en cours : commencez un module pour le retrouver ici.",
    termines: "Aucun module terminé pour l'instant. Chaque leçon vous en rapproche !",
    "a-venir": "Tous vos modules sont commencés. Bravo pour votre régularité !",
  };
  return <EmptyState icon={BookOpen} title="Rien à afficher ici" description={text[filter]} action={filter === "tous" ? undefined : { label: "Voir tous les modules", href: "/espace-etudiant/cours" }} />;
}
