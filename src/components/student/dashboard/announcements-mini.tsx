import Link from "next/link";
import { Megaphone, Pin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { studentRoutes } from "@/config/student-nav";
import { formatShortDate } from "@/lib/student/format";

type Item = { id: string; title: string; body: string; pinned: boolean; publishedAt: string; read: boolean };

export function AnnouncementsMini({ items, tz }: { items: Item[]; tz: string }) {
  return (
    <section aria-labelledby="announce-title" className="h-full rounded-3xl border border-line bg-gradient-card p-6">
      <div className="flex items-center justify-between">
        <h2 id="announce-title" className="font-sans text-sm font-semibold tracking-[0.2em] text-or-light uppercase">
          Annonces récentes
        </h2>
        <Link
          href={`${studentRoutes.messages}/annonces`}
          className="flex min-h-11 items-center text-sm font-semibold text-blanc/60 hover:text-or-light"
        >
          Toutes les annonces
        </Link>
      </div>
      {items.length === 0 ? (
        <p className="mt-6 flex items-center gap-3 text-blanc/60">
          <Megaphone aria-hidden className="size-5 text-or/70" /> Aucune annonce pour le moment.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {items.map((a) => (
            <li key={a.id}>
              <Link
                href={`${studentRoutes.messages}/annonces#${a.id}`}
                className="block rounded-2xl border border-line bg-noir/40 p-4 transition-colors hover:border-or/40"
              >
                <div className="flex flex-wrap items-center gap-2">
                  {a.pinned && <Pin aria-label="Épinglée" className="size-4 text-or" />}
                  <p className="font-semibold text-blanc">{a.title}</p>
                  {!a.read && <Badge className="ml-auto">Nouveau</Badge>}
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-blanc/60">{a.body}</p>
                <p className="mt-2 text-xs text-blanc/40">{formatShortDate(a.publishedAt, tz)}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
