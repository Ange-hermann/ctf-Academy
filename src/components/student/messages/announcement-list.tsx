"use client";

import { useState } from "react";
import { ChevronDown, Megaphone, Pin } from "lucide-react";
import { ExampleBadge } from "@/components/ui/badge";
import { markAnnouncementReadAction } from "@/lib/student/actions/messages";
import { formatDate } from "@/lib/student/format";
import type { AnnouncementItem } from "@/lib/student/queries/messages";
import { cn } from "@/lib/utils";

/** Annonces dépliables : l'ouverture marque l'annonce comme lue côté serveur. */
export function AnnouncementList({ items, timezone }: { items: AnnouncementItem[]; timezone: string }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set(items.filter((a) => a.read).map((a) => a.id)));

  const toggle = (a: AnnouncementItem) => {
    const next = openId === a.id ? null : a.id;
    setOpenId(next);
    if (next && !readIds.has(a.id)) {
      setReadIds((s) => new Set(s).add(a.id));
      void markAnnouncementReadAction(a.id);
    }
  };

  return (
    <ul className="space-y-3">
      {items.map((a) => {
        const open = openId === a.id;
        const read = readIds.has(a.id);
        return (
          <li key={a.id} className="overflow-hidden rounded-2xl border border-line bg-gradient-card">
            <button
              type="button"
              onClick={() => toggle(a)}
              aria-expanded={open}
              className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-or/5"
            >
              <span
                aria-hidden
                className={cn(
                  "grid size-10 shrink-0 place-items-center rounded-full border",
                  read ? "border-line text-blanc/45" : "border-or/40 bg-or/10 text-or-light",
                )}
              >
                {a.pinned ? <Pin className="size-4.5" /> : <Megaphone className="size-4.5" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className={cn("block truncate", read ? "text-blanc/75" : "font-semibold text-blanc")}>
                  {a.title}
                </span>
                <span className="mt-0.5 block text-xs text-blanc/45">
                  {a.authorName} · {formatDate(a.publishedAt, timezone)}
                  {a.pinned ? " · Épinglée" : ""}
                </span>
              </span>
              {a.isExample && <ExampleBadge className="hidden sm:inline-flex" />}
              {!read && <span aria-label="Non lue" className="size-2 shrink-0 rounded-full bg-or-light" />}
              <ChevronDown aria-hidden className={cn("size-4 shrink-0 text-blanc/40 transition-transform", open && "rotate-180")} />
            </button>
            {open && <p className="border-t border-line px-5 py-4 text-sm whitespace-pre-wrap text-blanc/75">{a.body}</p>}
          </li>
        );
      })}
    </ul>
  );
}
