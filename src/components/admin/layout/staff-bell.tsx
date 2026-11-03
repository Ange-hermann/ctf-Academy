"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNowStrict } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Award,
  Bell,
  BellOff,
  CalendarClock,
  ClipboardCheck,
  Megaphone,
  MessageSquareText,
  ScrollText,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { fetchStaffNotificationsAction, markStaffNotificationsReadAction } from "@/lib/admin/shell-actions";
import type { StaffNotification } from "@/lib/admin/queries";
import { NotificationSettings } from "@/components/notifications/notification-settings";
import { playChime } from "@/lib/notifications/chime";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

const QUERY_KEY = ["admin-notifications"];

const categoryIcons: Record<StaffNotification["category"], LucideIcon> = {
  announcement: Megaphone,
  message: MessageSquareText,
  grade: ClipboardCheck,
  comment: ScrollText,
  validation: Award,
  live: CalendarClock,
  payment: Wallet,
  assessment: ClipboardCheck,
};

/** Cloche de la barre supérieure admin : notifications de l'équipe (admissions, accès, assistance…), temps réel. */
export function StaffBell({ initial, userId }: { initial: StaffNotification[]; userId: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { data = initial } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => fetchStaffNotificationsAction(),
    initialData: initial,
    staleTime: 30_000,
  });
  const unread = data.filter((n) => !n.read).length;

  // Carillon quand une nouvelle notification arrive pendant que l'app est ouverte.
  const previousUnread = useRef(unread);
  useEffect(() => {
    if (unread > previousUnread.current) void playChime();
    previousUnread.current = unread;
  }, [unread]);

  // Temps réel (Supabase Realtime, filtré par la RLS) : nouvelle notification → rafraîchissement immédiat + son.
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    const channel = supabase
      .channel(`staff-bell-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, () =>
        queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  const markRead = useMutation({
    mutationFn: (ids: string[] | "all") => markStaffNotificationsReadAction(ids),
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });
      const previous = queryClient.getQueryData<StaffNotification[]>(QUERY_KEY);
      queryClient.setQueryData<StaffNotification[]>(QUERY_KEY, (all = []) =>
        all.map((n) => (ids === "all" || ids.includes(n.id) ? { ...n, read: true } : n)),
      );
      return { previous };
    },
    onError: (_e, _ids, context) => queryClient.setQueryData(QUERY_KEY, context?.previous),
  });

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

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="staff-notifications-panel"
        aria-label={unread ? `Notifications : ${unread} non lue${unread > 1 ? "s" : ""}` : "Notifications"}
        className="relative grid size-11 place-items-center rounded-xl border border-line text-blanc/70 transition-colors hover:bg-or/10 hover:text-or-light"
      >
        <Bell aria-hidden className="size-5" />
        {unread > 0 && (
          <span className="absolute top-1.5 right-1.5 grid min-w-4.5 place-items-center rounded-full bg-gradient-or px-1 text-[0.65rem] leading-4.5 font-bold text-noir shadow-gold">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      <span aria-live="polite" className="sr-only">
        {unread ? `${unread} notification${unread > 1 ? "s" : ""} non lue${unread > 1 ? "s" : ""}` : ""}
      </span>

      {open && (
        <div
          id="staff-notifications-panel"
          role="dialog"
          aria-label="Notifications"
          className="fixed inset-x-3 top-18 z-50 overflow-hidden rounded-2xl border border-or/30 bg-noir-card/98 shadow-gold-lg sm:absolute sm:inset-x-auto sm:top-13 sm:right-0 sm:w-96"
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="font-semibold text-blanc">Notifications</p>
            {unread > 0 && (
              <button type="button" onClick={() => markRead.mutate("all")} className="min-h-9 rounded-lg px-2 text-sm font-semibold text-or-light hover:text-or">
                Tout marquer comme lu
              </button>
            )}
          </div>
          {data.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <BellOff aria-hidden className="mx-auto size-8 text-or/70" />
              <p className="mt-3 text-blanc/70">Aucune notification pour le moment.</p>
            </div>
          ) : (
            <ul className="max-h-[60dvh] divide-y divide-line overflow-y-auto">
              {data.map((n) => {
                const Icon = categoryIcons[n.category];
                const content = (
                  <>
                    <span
                      className={cn(
                        "mt-0.5 grid size-9 shrink-0 place-items-center rounded-full border",
                        n.read ? "border-line text-blanc/50" : "border-or/40 bg-or/10 text-or-light",
                      )}
                    >
                      <Icon aria-hidden className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={cn("block text-sm", n.read ? "text-blanc/70" : "font-semibold text-blanc")}>{n.title}</span>
                      {n.body && <span className="block truncate text-sm text-blanc/55">{n.body}</span>}
                      <span className="mt-0.5 block text-xs text-blanc/40">
                        {formatDistanceToNowStrict(new Date(n.createdAt), { addSuffix: true, locale: fr })}
                      </span>
                    </span>
                    {!n.read && <span aria-label="Non lue" className="mt-2 size-2 shrink-0 rounded-full bg-or-light" />}
                  </>
                );
                const className = "flex gap-3 px-4 py-3 text-left transition-colors hover:bg-or/5";
                return (
                  <li key={n.id}>
                    {n.href ? (
                      <Link
                        href={n.href}
                        className={className}
                        onClick={() => {
                          if (!n.read) markRead.mutate([n.id]);
                          setOpen(false);
                        }}
                      >
                        {content}
                      </Link>
                    ) : (
                      <button type="button" className={cn(className, "w-full")} onClick={() => !n.read && markRead.mutate([n.id])}>
                        {content}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          <NotificationSettings />
        </div>
      )}
    </div>
  );
}
