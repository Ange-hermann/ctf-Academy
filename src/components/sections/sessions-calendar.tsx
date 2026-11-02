"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CalendarDays, Clock } from "lucide-react";
import { Badge, ExampleBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { registerFor } from "@/config/navigation";
import { formations, type FormationSlug } from "@/content/formations";
import { sessionStatusLabels, type TrainingSession } from "@/content/sessions";
import { cn } from "@/lib/utils";

const fmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const formatDate = (iso: string) => fmt.format(new Date(`${iso}T00:00:00Z`));
const toneOf = { open: "success", soon: "gold", closed: "neutral" } as const;

/** Calendrier des sessions avec filtre par formation (données Supabase `sessions` ou repli). */
export function SessionsCalendar({ sessions }: { sessions: TrainingSession[] }) {
  const [filter, setFilter] = useState<FormationSlug | "all">("all");
  const list = sessions.filter((s) => filter === "all" || s.formation === filter);
  const nameOf = (slug: FormationSlug) => formations.find((f) => f.slug === slug)?.name ?? slug;

  return (
    <div className="mx-auto max-w-4xl">
      <div role="group" aria-label="Filtrer par formation" className="flex flex-wrap gap-2">
        {[{ slug: "all" as const, label: "Toutes" }, ...formations.map((f) => ({ slug: f.slug, label: f.acronym === "DIACRES" ? "Diacres" : f.acronym }))].map(
          (opt) => (
            <button
              key={opt.slug}
              type="button"
              aria-pressed={filter === opt.slug}
              onClick={() => setFilter(opt.slug)}
              className={cn(
                "min-h-11 rounded-full border px-5 text-sm font-semibold transition-colors",
                filter === opt.slug ? "border-or bg-or/15 text-or-light" : "border-line text-blanc/70 hover:border-or/40",
              )}
            >
              {opt.label}
            </button>
          ),
        )}
      </div>

      <ol className="relative mt-10 space-y-5 border-l border-or/20 pl-8">
        <AnimatePresence mode="popLayout">
          {list.map((s) => (
            <motion.li
              key={s.id}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97 }}
              className={cn("relative rounded-2xl border bg-gradient-card p-6", s.status === "open" ? "border-or/35" : "border-line")}
            >
              <span
                aria-hidden
                className={cn(
                  "absolute top-7 -left-[2.4rem] size-3 rounded-full",
                  s.status === "open" ? "bg-gradient-or shadow-gold-lg" : "bg-or/30",
                )}
              />
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={toneOf[s.status]} dot>
                  {sessionStatusLabels[s.status]}
                </Badge>
                {s.isExample && <ExampleBadge />}
              </div>
              <h2 className="mt-3 text-xl tracking-wide text-blanc">{s.label}</h2>
              <p className="text-sm text-or-light">{nameOf(s.formation)}</p>
              <dl className="mt-4 grid gap-3 text-blanc/75 sm:grid-cols-2">
                <div className="flex items-center gap-2">
                  <CalendarDays aria-hidden className="size-4 text-or" />
                  <dt className="sr-only">Dates</dt>
                  <dd>
                    Du {formatDate(s.startDate)} au {formatDate(s.endDate)}
                  </dd>
                </div>
                {s.registrationDeadline && (
                  <div className="flex items-center gap-2">
                    <Clock aria-hidden className="size-4 text-or" />
                    <dt className="sr-only">Date limite d&apos;inscription</dt>
                    <dd>Inscriptions jusqu&apos;au {formatDate(s.registrationDeadline)}</dd>
                  </div>
                )}
              </dl>
              {s.status === "open" && (
                <Button asChild size="sm" className="mt-5">
                  <Link href={registerFor(s.formation)}>S&apos;inscrire à cette session</Link>
                </Button>
              )}
            </motion.li>
          ))}
        </AnimatePresence>
        {list.length === 0 && (
          <li className="rounded-2xl border border-dashed border-line p-8 text-center text-blanc/60">
            Aucune session annoncée pour le moment. Revenez bientôt ou contactez-nous sur WhatsApp.
          </li>
        )}
      </ol>
    </div>
  );
}
