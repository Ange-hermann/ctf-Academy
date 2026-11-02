"use client";

import { useId, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export type AccordionItem = { id: string; title: string; content: React.ReactNode };

/** Accordéon accessible (boutons natifs, aria-expanded / aria-controls), ouverture fluide. */
export function Accordion({
  items,
  defaultOpen,
  className,
}: {
  items: AccordionItem[];
  defaultOpen?: string;
  className?: string;
}) {
  const [open, setOpen] = useState<string | null>(defaultOpen ?? null);
  const baseId = useId();

  return (
    <ul className={cn("space-y-3", className)}>
      {items.map((item) => {
        const isOpen = open === item.id;
        const panelId = `${baseId}-${item.id}`;
        return (
          <li
            key={item.id}
            className={cn(
              "rounded-2xl border bg-gradient-card transition-[border-color,box-shadow] duration-500",
              isOpen ? "border-or/40 shadow-gold" : "border-line hover:border-or/30",
            )}
          >
            <h3 className="font-sans">
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpen(isOpen ? null : item.id)}
                className="flex min-h-14 w-full items-center justify-between gap-4 px-5 py-4 text-left text-base font-semibold text-blanc"
              >
                <span>{item.title}</span>
                <span
                  aria-hidden
                  className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-full border border-or/30 text-or transition-transform duration-500 ease-out-expo",
                    isOpen && "rotate-45 bg-or/10",
                  )}
                >
                  <Plus className="size-4" />
                </span>
              </button>
            </h3>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  id={panelId}
                  role="region"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-5 text-blanc/75">{item.content}</div>
                </motion.div>
              )}
            </AnimatePresence>
          </li>
        );
      })}
    </ul>
  );
}
